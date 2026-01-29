/**
 * Hook Manager
 * Loads, manages, and syncs hooks for Claude Code integration
 */

import { readdir, readFile, mkdir, writeFile } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';
import type { HookEvent, SettingsHooks, SettingsHookEntry, SettingsHookCommand } from '../../types/hook.js';
import type {
  Hook,
  HookMetadata,
  HookSourceType,
  HookManagerOptions,
  HookSyncResult,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_BUILTIN_HOOKS_DIR = join(dirname(dirname(dirname(__dirname))), 'hooks');
const DEFAULT_GLOBAL_HOOKS_DIR = join(homedir(), '.claudeops', 'hooks');
const DEFAULT_PROJECT_HOOKS_DIR = '.claude/hooks';
const CLAUDE_SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');

// =============================================================================
// Hook Metadata Parser
// =============================================================================

interface ParsedHookFile {
  metadata: HookMetadata;
  handlerPath: string;
}

/**
 * Parse hook metadata from script header comment
 */
function parseHookFile(fileContent: string, filePath: string): ParsedHookFile | null {
  // Look for JSDoc-style header comment
  const headerMatch = fileContent.match(/\/\*\*[\s\S]*?\*\//);

  const metadata: HookMetadata = {
    name: basename(filePath, '.mjs').replace(/\.js$/, ''),
    description: '',
    event: 'PreToolUse',
    matcher: '*',
    priority: 0,
    enabled: true,
  };

  if (headerMatch) {
    const header = headerMatch[0];

    // Parse Hook: line
    const nameMatch = header.match(/\*\s*Hook:\s*(.+)/);
    if (nameMatch?.[1]) metadata.name = nameMatch[1].trim();

    // Parse Event: line
    const eventMatch = header.match(/\*\s*Event:\s*(.+)/);
    if (eventMatch?.[1]) metadata.event = eventMatch[1].trim() as HookEvent;

    // Parse Description: line
    const descMatch = header.match(/\*\s*Description:\s*(.+)/);
    if (descMatch?.[1]) metadata.description = descMatch[1].trim();

    // Parse Matcher: line
    const matcherMatch = header.match(/\*\s*Matcher:\s*(.+)/);
    if (matcherMatch?.[1]) metadata.matcher = matcherMatch[1].trim();

    // Parse Priority: line
    const priorityMatch = header.match(/\*\s*Priority:\s*(\d+)/);
    if (priorityMatch?.[1]) metadata.priority = parseInt(priorityMatch[1], 10);

    // Parse Enabled: line
    const enabledMatch = header.match(/\*\s*Enabled:\s*(true|false)/i);
    if (enabledMatch?.[1]) metadata.enabled = enabledMatch[1].toLowerCase() === 'true';

    // Parse Timeout: line
    const timeoutMatch = header.match(/\*\s*Timeout:\s*(\d+)/);
    if (timeoutMatch?.[1]) metadata.timeout = parseInt(timeoutMatch[1], 10);

    // Parse Async: line
    const asyncMatch = header.match(/\*\s*Async:\s*(true|false)/i);
    if (asyncMatch?.[1]) metadata.async = asyncMatch[1].toLowerCase() === 'true';
  }

  return {
    metadata,
    handlerPath: filePath,
  };
}

// =============================================================================
// Hook Manager Class
// =============================================================================

export class HookManager {
  private hooks: Map<string, Hook> = new Map();
  private options: HookManagerOptions;
  private loaded = false;

  constructor(options: HookManagerOptions = {}) {
    this.options = {
      builtinHooksDir: options.builtinHooksDir || DEFAULT_BUILTIN_HOOKS_DIR,
      globalHooksDir: options.globalHooksDir || DEFAULT_GLOBAL_HOOKS_DIR,
      projectHooksDir: options.projectHooksDir || DEFAULT_PROJECT_HOOKS_DIR,
      disabledHooks: options.disabledHooks || [],
    };
  }

  /**
   * Load all hooks from configured directories
   */
  async loadHooks(): Promise<Hook[]> {
    this.hooks.clear();

    // Load in priority order (lower priority first, higher overwrites)
    await this.loadHooksFromDir(this.options.builtinHooksDir!, 'builtin');
    await this.loadHooksFromDir(this.options.globalHooksDir!, 'global');
    await this.loadHooksFromDir(this.options.projectHooksDir!, 'project');

    this.loaded = true;
    return Array.from(this.hooks.values());
  }

  /**
   * Load hooks from a directory
   */
  private async loadHooksFromDir(dir: string, sourceType: HookSourceType): Promise<void> {
    if (!existsSync(dir)) return;

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isFile() && (entry.name.endsWith('.mjs') || entry.name.endsWith('.js'))) {
          await this.loadHookFile(fullPath, sourceType);
        } else if (entry.isDirectory()) {
          // Look for hook.mjs or index.mjs in directory
          const hookPath = join(fullPath, 'hook.mjs');
          const indexPath = join(fullPath, 'index.mjs');

          if (existsSync(hookPath)) {
            await this.loadHookFile(hookPath, sourceType);
          } else if (existsSync(indexPath)) {
            await this.loadHookFile(indexPath, sourceType);
          }
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  /**
   * Load a single hook file
   */
  private async loadHookFile(filePath: string, sourceType: HookSourceType): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf8');
      const parsed = parseHookFile(content, filePath);

      if (!parsed) return;

      // Skip disabled hooks
      if (this.options.disabledHooks?.includes(parsed.metadata.name)) {
        return;
      }

      const hook: Hook = {
        metadata: parsed.metadata,
        handlerPath: parsed.handlerPath,
        sourcePath: filePath,
        sourceType,
      };

      this.hooks.set(parsed.metadata.name, hook);
    } catch {
      // Skip files that can't be read
    }
  }

  /**
   * Get all loaded hooks
   */
  getHooks(): Hook[] {
    return Array.from(this.hooks.values());
  }

  /**
   * Get a hook by name
   */
  getHook(name: string): Hook | undefined {
    return this.hooks.get(name);
  }

  /**
   * Get hooks for a specific event type
   */
  getHooksForEvent(event: HookEvent): Hook[] {
    return Array.from(this.hooks.values())
      .filter(hook => hook.metadata.event === event && hook.metadata.enabled)
      .sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  /**
   * Sync hooks to Claude Code's settings.json
   */
  async syncToClaudeSettings(): Promise<HookSyncResult> {
    const added: string[] = [];
    const updated: string[] = [];
    const removed: string[] = [];
    const errors: string[] = [];

    try {
      // Ensure .claude directory exists
      const claudeDir = dirname(CLAUDE_SETTINGS_PATH);
      await mkdir(claudeDir, { recursive: true });

      // Read existing settings
      let settings: { hooks?: SettingsHooks; [key: string]: unknown } = {};
      if (existsSync(CLAUDE_SETTINGS_PATH)) {
        try {
          const content = await readFile(CLAUDE_SETTINGS_PATH, 'utf8');
          settings = JSON.parse(content);
        } catch {
          // Invalid JSON, start fresh
        }
      }

      // Initialize hooks object
      if (!settings.hooks) {
        settings.hooks = {};
      }

      // Track expected hooks by event
      const expectedByEvent = new Map<HookEvent, Set<string>>();

      // Group hooks by event
      const hooksByEvent = new Map<HookEvent, Hook[]>();
      for (const hook of this.hooks.values()) {
        if (!hook.metadata.enabled) continue;

        if (!hooksByEvent.has(hook.metadata.event)) {
          hooksByEvent.set(hook.metadata.event, []);
        }
        hooksByEvent.get(hook.metadata.event)!.push(hook);

        if (!expectedByEvent.has(hook.metadata.event)) {
          expectedByEvent.set(hook.metadata.event, new Set());
        }
        expectedByEvent.get(hook.metadata.event)!.add(hook.metadata.name);
      }

      // Update settings for each event
      const events: HookEvent[] = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop', 'UserPromptSubmit'];

      for (const event of events) {
        const eventHooks = hooksByEvent.get(event) || [];
        const existingHooks = settings.hooks[event] || [];

        // Build new hooks array
        const newHooks: SettingsHookEntry[] = [];

        for (const hook of eventHooks) {
          // Build the command object
          const commandObj: SettingsHookCommand = {
            type: 'command',
            command: `node "${hook.handlerPath}"`,
          };

          if (hook.metadata.timeout) {
            commandObj.timeout = hook.metadata.timeout;
          }

          if (hook.metadata.async) {
            commandObj.async = true;
          }

          // Build the entry with string matcher
          const entry: SettingsHookEntry = {
            hooks: [commandObj],
          };

          // Add matcher if not wildcard (use string format per Claude Code docs)
          if (hook.metadata.matcher && hook.metadata.matcher !== '*') {
            entry.matcher = hook.metadata.matcher;
          }

          // Check if this hook already exists (compare by handler path in hooks array)
          const existing = existingHooks.find((h: SettingsHookEntry) =>
            h.hooks?.some(cmd => cmd.command?.includes(hook.handlerPath))
          );

          if (existing) {
            updated.push(hook.metadata.name);
          } else {
            added.push(hook.metadata.name);
          }

          newHooks.push(entry);
        }

        // Check for removed hooks
        for (const existing of existingHooks) {
          const handlerPath = existing.hooks?.[0]?.command || '';
          const stillExists = eventHooks.some(h => handlerPath.includes(h.handlerPath));
          if (!stillExists) {
            // Only track as removed if it was a claudeops-managed hook
            if (handlerPath.includes('.claudeops') || handlerPath.includes('claudeops')) {
              // Extract hook name from path
              const match = handlerPath.match(/([^/]+)\.mjs/);
              if (match?.[1]) {
                removed.push(match[1]);
              }
            }
          }
        }

        if (newHooks.length > 0) {
          settings.hooks[event] = newHooks;
        } else {
          delete settings.hooks[event];
        }
      }

      // Write updated settings
      await writeFile(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');

    } catch (err) {
      errors.push(`Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    return { added, updated, removed, errors };
  }

  /**
   * Install a hook to the global hooks directory
   */
  async installHook(name: string, content: string): Promise<string> {
    await mkdir(this.options.globalHooksDir!, { recursive: true });

    const fileName = `${name}.mjs`;
    const destPath = join(this.options.globalHooksDir!, fileName);

    await writeFile(destPath, content, 'utf8');

    return destPath;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a hook manager instance
 */
export function createHookManager(options?: HookManagerOptions): HookManager {
  return new HookManager(options);
}
