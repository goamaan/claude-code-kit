/**
 * Sync command
 * ck sync [--dry-run] [--force] [--backup]
 * Syncs configuration to Claude Code settings
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { loadConfig } from '../core/config/loader.js';
import { listEnabledAddons } from '../domain/addon/manager.js';
import { getClaudeDir, getGlobalConfigDir } from '../utils/paths.js';
import { exists, readFile, writeFile, ensureDir } from '../utils/fs.js';
import { join } from 'node:path';
import type { SettingsHooks, HookEvent } from '../types/hook.js';
import type { McpSettings } from '../types/mcp.js';

// =============================================================================
// Types
// =============================================================================

interface SyncPlan {
  actions: SyncAction[];
  warnings: string[];
}

interface SyncAction {
  type: 'create' | 'update' | 'delete' | 'backup';
  target: string;
  description: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// Helper Functions
// =============================================================================

async function createBackup(filePath: string): Promise<string | null> {
  if (!(await exists(filePath))) {
    return null;
  }

  const backupDir = join(getGlobalConfigDir(), 'backups');
  await ensureDir(backupDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = filePath.split('/').pop() ?? 'file';
  const backupPath = join(backupDir, `${fileName}.${timestamp}.bak`);

  const content = await readFile(filePath);
  await writeFile(backupPath, content);

  return backupPath;
}

async function planSync(_dryRun: boolean): Promise<SyncPlan> {
  const plan: SyncPlan = {
    actions: [],
    warnings: [],
  };

  const config = await loadConfig();
  const claudeDir = getClaudeDir();

  // 1. Sync settings.json (hooks)
  const settingsPath = join(claudeDir, 'settings.json');
  const currentSettings: { hooks?: SettingsHooks; [key: string]: unknown } = {};

  if (await exists(settingsPath)) {
    try {
      const content = await readFile(settingsPath);
      Object.assign(currentSettings, JSON.parse(content));
    } catch {
      plan.warnings.push('Could not parse existing settings.json');
    }
  }

  // Build new hooks from addons
  const addons = await listEnabledAddons();
  const newHooks: SettingsHooks = {};

  for (const addon of addons) {
    if (!addon.manifest.hooks) continue;

    const hookEvents: HookEvent[] = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop'];
    for (const event of hookEvents) {
      const eventHooks = addon.manifest.hooks[event];
      if (!eventHooks || !Array.isArray(eventHooks)) continue;

      if (!newHooks[event]) {
        newHooks[event] = [];
      }

      for (const hook of eventHooks) {
        // Convert addon hook format to settings.json format
        newHooks[event]!.push({
          matcher: hook.matcher,
          handler: hook.handler.startsWith('/') || hook.handler.startsWith('~')
            ? hook.handler
            : join(addon.path, hook.handler),
        });
      }
    }
  }

  // Check if hooks have changed
  const hooksChanged = JSON.stringify(currentSettings.hooks) !== JSON.stringify(newHooks);

  if (hooksChanged) {
    plan.actions.push({
      type: currentSettings.hooks ? 'update' : 'create',
      target: settingsPath,
      description: 'Sync hooks from enabled addons',
      details: {
        before: Object.keys(currentSettings.hooks ?? {}).length + ' events',
        after: Object.keys(newHooks).length + ' events',
      },
    });
  }

  // 2. Sync MCP server states (enable/disable based on config)
  const mcpSettingsPath = join(claudeDir, 'claude_desktop_config.json');
  let mcpSettings: McpSettings = { mcpServers: {} };

  if (await exists(mcpSettingsPath)) {
    try {
      const content = await readFile(mcpSettingsPath);
      mcpSettings = JSON.parse(content) as McpSettings;
    } catch {
      plan.warnings.push('Could not parse existing claude_desktop_config.json');
    }
  }

  // Check if any MCP server states need to change
  const enabledSet = new Set(config.mcp.enabled);
  const disabledSet = new Set(config.mcp.disabled);

  for (const [serverName] of Object.entries(mcpSettings.mcpServers ?? {})) {
    if (enabledSet.has(serverName)) {
      // Should be enabled - check if it's currently disabled
      // Note: Claude Desktop doesn't have a direct enable/disable, this is tracked in config
    }
    if (disabledSet.has(serverName)) {
      plan.warnings.push(`MCP server "${serverName}" is disabled in config. Consider removing from claude_desktop_config.json.`);
    }
  }

  // 3. Generate/update CLAUDE.md if auto-sync is enabled
  if (config.sync.auto) {
    const claudeMdPath = join(process.cwd(), 'CLAUDE.md');
    // Note: globalClaudeMdPath would be used for global CLAUDE.md sync in the future
    // const globalClaudeMdPath = join(claudeDir, 'CLAUDE.md');

    // Check if we should update CLAUDE.md based on profile/setup changes
    // This is a simplified check - in practice, you'd track content hashes
    if (!(await exists(claudeMdPath))) {
      plan.actions.push({
        type: 'create',
        target: claudeMdPath,
        description: 'Create project CLAUDE.md',
      });
    }
  }

  return plan;
}

async function executeSync(plan: SyncPlan, options: { backup: boolean }): Promise<void> {
  const claudeDir = getClaudeDir();

  // Ensure Claude directory exists
  await ensureDir(claudeDir);

  // Execute each action
  for (const action of plan.actions) {
    if (options.backup && (action.type === 'update' || action.type === 'delete')) {
      const backupPath = await createBackup(action.target);
      if (backupPath) {
        output.dim(`  Backed up to: ${backupPath}`);
      }
    }

    switch (action.type) {
      case 'create':
      case 'update':
        if (action.target.endsWith('settings.json')) {
          // Update settings.json with hooks
          const settingsPath = action.target;
          let settings: { hooks?: SettingsHooks; [key: string]: unknown } = {};

          if (await exists(settingsPath)) {
            try {
              const content = await readFile(settingsPath);
              settings = JSON.parse(content);
            } catch {
              // Start fresh
            }
          }

          // Build hooks from enabled addons
          const addons = await listEnabledAddons();
          const hooks: SettingsHooks = {};

          for (const addon of addons) {
            if (!addon.manifest.hooks) continue;

            const hookEvents: HookEvent[] = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop'];
            for (const event of hookEvents) {
              const eventHooks = addon.manifest.hooks[event];
              if (!eventHooks || !Array.isArray(eventHooks)) continue;

              if (!hooks[event]) {
                hooks[event] = [];
              }

              for (const hook of eventHooks) {
                hooks[event]!.push({
                  matcher: hook.matcher,
                  handler: hook.handler.startsWith('/') || hook.handler.startsWith('~')
                    ? hook.handler
                    : join(addon.path, hook.handler),
                });
              }
            }
          }

          settings.hooks = hooks;
          await writeFile(settingsPath, JSON.stringify(settings, null, 2));
        }
        break;

      case 'delete':
        // Not implemented - we don't delete files during sync
        break;
    }
  }
}

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'sync',
    description: 'Sync configuration to Claude Code',
  },
  args: {
    dryRun: {
      type: 'boolean',
      alias: 'd',
      description: 'Show what would be synced without making changes',
      default: false,
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Force sync without confirmation',
      default: false,
    },
    backup: {
      type: 'boolean',
      alias: 'b',
      description: 'Backup files before modifying',
      default: true,
    },
    json: {
      type: 'boolean',
      description: 'Output sync plan as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const s = prompts.spinner();
    s.start('Planning sync...');

    const plan = await planSync(args.dryRun);

    s.stop('Sync plan ready');

    if (args.json) {
      output.json(plan);
      return;
    }

    // Show warnings
    if (plan.warnings.length > 0) {
      output.header('Warnings');
      for (const warning of plan.warnings) {
        output.warn(warning);
      }
      console.log();
    }

    // Show planned actions
    if (plan.actions.length === 0) {
      output.success('Everything is in sync!');
      return;
    }

    output.header('Sync Plan');

    for (const action of plan.actions) {
      const icon = action.type === 'create' ? '+' :
                   action.type === 'update' ? '~' :
                   action.type === 'delete' ? '-' : '*';

      console.log(`  ${icon} ${action.description}`);
      output.dim(`    ${action.target}`);

      if (action.details) {
        for (const [key, value] of Object.entries(action.details)) {
          output.dim(`    ${key}: ${value}`);
        }
      }
    }

    console.log();

    // Dry run - stop here
    if (args.dryRun) {
      output.info('Dry run - no changes made');
      return;
    }

    // Confirm unless forced
    if (!args.force) {
      const confirmed = await prompts.promptConfirm(
        `Apply ${plan.actions.length} change(s)?`
      );
      prompts.handleCancel(confirmed);
      if (!confirmed) {
        output.info('Sync cancelled');
        return;
      }
    }

    // Execute sync
    s.start('Syncing...');

    try {
      await executeSync(plan, { backup: args.backup });
      s.stop('Sync complete');

      output.success(`Applied ${plan.actions.length} change(s)`);

      if (args.backup) {
        output.dim('Backups saved to ~/.claudeops/backups/');
      }

      console.log();
      output.info('Restart Claude Code for changes to take effect');
    } catch (err) {
      s.stop('Sync failed');
      output.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});
