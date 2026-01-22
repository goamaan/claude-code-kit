/**
 * Sync Engine - Main synchronization engine for claude-code-kit
 * Orchestrates sync between claude-code-kit config and Claude Code settings
 */

import { join } from 'node:path';
import type {
  MergedConfig,
  MergedSetup,
  InstalledAddon,
  ComposedHooks,
  AddonHooksInput,
} from '@/types';
import {
  readFileSafe,
  writeFile,
  exists,
} from '@/utils/fs.js';
import {
  getClaudeDir,
  getGlobalConfigDir,
} from '@/utils/paths.js';
import {
  composeHooks,
  createEmptyHooks,
  type HookSource,
} from '@/domain/hook/composer.js';
import {
  generateSettings,
  serializeSettings,
  type GeneratedSettings,
} from './settings-generator.js';
import {
  generateClaudeMd,
  type GeneratedClaudeMd,
} from './claudemd-generator.js';
import { createBackup } from './backup.js';

// =============================================================================
// Constants
// =============================================================================

const SETTINGS_FILE = 'settings.json';
const CLAUDE_MD_FILE = 'CLAUDE.md';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for sync operations
 */
export interface SyncOptions {
  /** Dry run - show changes without applying */
  dryRun?: boolean;

  /** Force sync even if validation fails */
  force?: boolean;

  /** Create backup before sync */
  backup?: boolean;

  /** Only sync settings.json */
  settingsOnly?: boolean;

  /** Only sync CLAUDE.md */
  claudeMdOnly?: boolean;

  /** Preserve user modifications in unmarked sections */
  preserveUserContent?: boolean;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Whether sync was successful */
  success: boolean;

  /** Files that were modified */
  modifiedFiles: string[];

  /** Errors encountered */
  errors: string[];

  /** Warnings */
  warnings: string[];

  /** Backup path if created */
  backupPath?: string;

  /** Whether this was a dry run */
  dryRun: boolean;

  /** Diff entries for changes */
  changes: DiffEntry[];
}

/**
 * Entry describing a difference between current and generated state
 */
export interface DiffEntry {
  /** File path */
  file: string;

  /** Type of change */
  type: 'create' | 'modify' | 'delete' | 'unchanged';

  /** Description of change */
  description: string;

  /** Previous content (for modify) */
  previous?: string;

  /** New content */
  current?: string;
}

/**
 * Result of validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors */
  errors: Array<{
    code: string;
    message: string;
    path?: string;
  }>;

  /** Validation warnings */
  warnings: Array<{
    code: string;
    message: string;
    path?: string;
  }>;
}

/**
 * Sync engine interface
 */
export interface SyncEngine {
  /** Perform sync */
  sync(options?: SyncOptions): Promise<SyncResult>;

  /** Get diff of pending changes */
  diff(): Promise<DiffEntry[]>;

  /** Validate current configuration */
  validate(): Promise<ValidationResult>;

  /** Load current state */
  loadState(): Promise<SyncState>;
}

/**
 * Current sync state
 */
export interface SyncState {
  /** Merged config */
  config: MergedConfig;

  /** Merged setup */
  setup: MergedSetup;

  /** Installed addons */
  addons: InstalledAddon[];

  /** Composed hooks */
  hooks: ComposedHooks;

  /** Generated settings */
  settings: GeneratedSettings;

  /** Generated CLAUDE.md */
  claudeMd: GeneratedClaudeMd;
}

/**
 * Options for creating sync engine
 */
export interface SyncEngineOptions {
  /** Config loader function */
  loadConfig: () => Promise<MergedConfig>;

  /** Setup loader function */
  loadSetup: (name?: string) => Promise<MergedSetup>;

  /** Addon loader function */
  loadAddons: () => Promise<InstalledAddon[]>;

  /** Claude directory override */
  claudeDir?: string;

  /** Global config directory override */
  globalConfigDir?: string;
}

// =============================================================================
// Implementation
// =============================================================================

class SyncEngineImpl implements SyncEngine {
  private readonly loadConfig: () => Promise<MergedConfig>;
  private readonly loadSetup: (name?: string) => Promise<MergedSetup>;
  private readonly loadAddons: () => Promise<InstalledAddon[]>;
  private readonly claudeDir: string;
  private readonly globalConfigDir: string;

  constructor(options: SyncEngineOptions) {
    this.loadConfig = options.loadConfig;
    this.loadSetup = options.loadSetup;
    this.loadAddons = options.loadAddons;
    this.claudeDir = options.claudeDir ?? getClaudeDir();
    this.globalConfigDir = options.globalConfigDir ?? getGlobalConfigDir();
  }

  async loadState(): Promise<SyncState> {
    // 1. Load current profile config
    const config = await this.loadConfig();

    // 2. Load and merge setup(s)
    const setup = await this.loadSetup();

    // 3. Load installed addons
    const addons = await this.loadAddons();

    // 4. Compose hooks from all sources
    const hooks = this.composeAllHooks(setup, addons, config);

    // 5. Generate settings
    const settings = generateSettings(config, setup, addons, hooks);

    // 6. Load existing CLAUDE.md for preservation
    const existingClaudeMd = await this.loadExistingClaudeMd();

    // 7. Generate CLAUDE.md
    const claudeMd = generateClaudeMd(setup, config, {
      existingContent: existingClaudeMd ?? undefined,
      preserveUserContent: true,
    });

    return {
      config,
      setup,
      addons,
      hooks,
      settings,
      claudeMd,
    };
  }

  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const {
      dryRun = false,
      force = false,
      backup = true,
      settingsOnly = false,
      claudeMdOnly = false,
      preserveUserContent = true,
    } = options;

    const result: SyncResult = {
      success: false,
      modifiedFiles: [],
      errors: [],
      warnings: [],
      dryRun,
      changes: [],
    };

    try {
      // Validate first (unless force)
      if (!force) {
        const validation = await this.validate();
        if (!validation.valid) {
          result.errors = validation.errors.map(e => e.message);
          result.warnings = validation.warnings.map(w => w.message);
          return result;
        }
        result.warnings = validation.warnings.map(w => w.message);
      }

      // Get current state
      const state = await this.loadState();

      // Get diff
      const diff = await this.diff();
      result.changes = diff;

      // Check if any changes needed
      const hasChanges = diff.some(d => d.type !== 'unchanged');
      if (!hasChanges) {
        result.success = true;
        return result;
      }

      // Create backup if requested (and not dry run)
      if (backup && !dryRun) {
        const backupResult = await createBackup(this.claudeDir);
        if (backupResult.success) {
          result.backupPath = backupResult.path;
        } else {
          result.warnings.push(`Backup failed: ${backupResult.error}`);
        }
      }

      // Apply changes (if not dry run)
      if (!dryRun) {
        // Sync settings.json
        if (!claudeMdOnly) {
          const settingsPath = join(this.claudeDir, SETTINGS_FILE);
          const settingsJson = serializeSettings(state.settings);

          const existsResult = await exists(settingsPath);
          if (!existsResult || diff.find(d => d.file === SETTINGS_FILE)?.type !== 'unchanged') {
            await writeFile(settingsPath, settingsJson);
            result.modifiedFiles.push(settingsPath);
          }
        }

        // Sync CLAUDE.md
        if (!settingsOnly) {
          const claudeMdPath = join(this.claudeDir, CLAUDE_MD_FILE);

          // Regenerate with preserved content if needed
          let finalContent = state.claudeMd.content;

          if (preserveUserContent) {
            const existing = await this.loadExistingClaudeMd();
            if (existing) {
              const regenerated = generateClaudeMd(state.setup, state.config, {
                existingContent: existing,
                preserveUserContent: true,
              });
              finalContent = regenerated.content;
            }
          }

          const existsResult = await exists(claudeMdPath);
          if (!existsResult || diff.find(d => d.file === CLAUDE_MD_FILE)?.type !== 'unchanged') {
            await writeFile(claudeMdPath, finalContent);
            result.modifiedFiles.push(claudeMdPath);
          }
        }
      }

      result.success = true;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : String(error)
      );
    }

    return result;
  }

  async diff(): Promise<DiffEntry[]> {
    const entries: DiffEntry[] = [];
    const state = await this.loadState();

    // Check settings.json
    const settingsPath = join(this.claudeDir, SETTINGS_FILE);
    const existingSettings = await readFileSafe(settingsPath);
    const newSettings = serializeSettings(state.settings);

    if (existingSettings === undefined) {
      entries.push({
        file: SETTINGS_FILE,
        type: 'create',
        description: 'Create settings.json',
        current: newSettings,
      });
    } else if (!this.settingsAreEqual(existingSettings, newSettings)) {
      entries.push({
        file: SETTINGS_FILE,
        type: 'modify',
        description: 'Update settings.json',
        previous: existingSettings,
        current: newSettings,
      });
    } else {
      entries.push({
        file: SETTINGS_FILE,
        type: 'unchanged',
        description: 'No changes to settings.json',
      });
    }

    // Check CLAUDE.md
    const claudeMdPath = join(this.claudeDir, CLAUDE_MD_FILE);
    const existingClaudeMd = await readFileSafe(claudeMdPath);
    const newClaudeMd = state.claudeMd.content;

    if (existingClaudeMd === undefined) {
      entries.push({
        file: CLAUDE_MD_FILE,
        type: 'create',
        description: 'Create CLAUDE.md',
        current: newClaudeMd,
      });
    } else if (existingClaudeMd.trim() !== newClaudeMd.trim()) {
      entries.push({
        file: CLAUDE_MD_FILE,
        type: 'modify',
        description: 'Update CLAUDE.md',
        previous: existingClaudeMd,
        current: newClaudeMd,
      });
    } else {
      entries.push({
        file: CLAUDE_MD_FILE,
        type: 'unchanged',
        description: 'No changes to CLAUDE.md',
      });
    }

    return entries;
  }

  async validate(): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    try {
      // Load state to trigger validation
      const state = await this.loadState();

      // Check config
      if (!state.config.profile.name) {
        errors.push({
          code: 'MISSING_PROFILE',
          message: 'No profile name configured',
        });
      }

      // Check setup
      if (!state.setup.name) {
        errors.push({
          code: 'MISSING_SETUP',
          message: 'No setup name found',
        });
      }

      // Check for required addons
      for (const required of state.setup.requires.addons) {
        const found = state.addons.find(a => a.manifest.name === required);
        if (!found) {
          errors.push({
            code: 'MISSING_ADDON',
            message: `Required addon not installed: ${required}`,
          });
        } else if (!found.enabled) {
          warnings.push({
            code: 'DISABLED_ADDON',
            message: `Required addon is disabled: ${required}`,
          });
        }
      }

      // Check Claude directory exists
      const claudeDirExists = await exists(this.claudeDir);
      if (!claudeDirExists) {
        warnings.push({
          code: 'CLAUDE_DIR_MISSING',
          message: `Claude directory does not exist: ${this.claudeDir}`,
        });
      }

      // Check for conflicts in skills
      const enabledSkills = new Set([
        ...state.setup.skills.enabled,
        ...state.config.skills.enabled,
      ]);
      const disabledSkills = new Set([
        ...state.setup.skills.disabled,
        ...state.config.skills.disabled,
      ]);

      for (const skill of enabledSkills) {
        if (disabledSkills.has(skill)) {
          warnings.push({
            code: 'SKILL_CONFLICT',
            message: `Skill "${skill}" is both enabled and disabled`,
          });
        }
      }

    } catch (error) {
      errors.push({
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private composeAllHooks(
    setup: MergedSetup,
    addons: InstalledAddon[],
    _config: MergedConfig,
  ): ComposedHooks {
    const sources: HookSource[] = [];

    // Add setup hook templates
    if (setup.hooks.templates.length > 0) {
      const setupHooks: AddonHooksInput = {
        PreToolUse: setup.hooks.templates
          .filter(t => t.matcher.startsWith('PreToolUse:') || !t.matcher.includes(':'))
          .map(t => ({
            matcher: t.matcher.replace(/^PreToolUse:/, ''),
            handler: t.handler,
            priority: t.priority,
            enabled: true,
          })),
        PostToolUse: setup.hooks.templates
          .filter(t => t.matcher.startsWith('PostToolUse:'))
          .map(t => ({
            matcher: t.matcher.replace(/^PostToolUse:/, ''),
            handler: t.handler,
            priority: t.priority,
            enabled: true,
          })),
        Stop: setup.hooks.templates
          .filter(t => t.matcher.startsWith('Stop:'))
          .map(t => ({
            matcher: t.matcher.replace(/^Stop:/, ''),
            handler: t.handler,
            priority: t.priority,
            enabled: true,
          })),
        SubagentStop: setup.hooks.templates
          .filter(t => t.matcher.startsWith('SubagentStop:'))
          .map(t => ({
            matcher: t.matcher.replace(/^SubagentStop:/, ''),
            handler: t.handler,
            priority: t.priority,
            enabled: true,
          })),
      };

      sources.push({
        type: 'setup',
        name: setup.name,
        hooks: setupHooks,
        basePath: this.globalConfigDir,
      });
    }

    // Add addon hooks
    for (const addon of addons) {
      if (!addon.enabled) continue;
      if (!addon.manifest.hooks) continue;

      sources.push({
        type: 'addon',
        name: addon.manifest.name,
        hooks: addon.manifest.hooks,
        basePath: addon.path,
      });
    }

    // Compose all hooks
    return sources.length > 0 ? composeHooks(sources) : createEmptyHooks();
  }

  private async loadExistingClaudeMd(): Promise<string | null> {
    const claudeMdPath = join(this.claudeDir, CLAUDE_MD_FILE);
    const content = await readFileSafe(claudeMdPath);
    return content ?? null;
  }

  /**
   * Compare settings ignoring volatile fields like generatedAt
   */
  private settingsAreEqual(existingJson: string, newJson: string): boolean {
    try {
      const existing = JSON.parse(existingJson);
      const newer = JSON.parse(newJson);

      // Remove volatile fields for comparison
      const stripVolatile = (obj: Record<string, unknown>): Record<string, unknown> => {
        const copy = { ...obj };
        const metadata = copy['metadata'];
        if (metadata && typeof metadata === 'object') {
          const metadataCopy = { ...(metadata as Record<string, unknown>) };
          const claudeKit = metadataCopy['claude-code-kit'];
          if (claudeKit && typeof claudeKit === 'object') {
            const claudeKitCopy = { ...(claudeKit as Record<string, unknown>) };
            delete claudeKitCopy['generatedAt'];
            metadataCopy['claude-code-kit'] = claudeKitCopy;
          }
          copy['metadata'] = metadataCopy;
        }
        return copy;
      };

      const strippedExisting = stripVolatile(existing);
      const strippedNew = stripVolatile(newer);

      return JSON.stringify(strippedExisting) === JSON.stringify(strippedNew);
    } catch {
      // If JSON parsing fails, fall back to string comparison
      return existingJson.trim() === newJson.trim();
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new SyncEngine instance
 *
 * @param options - Engine options with loaders
 * @returns SyncEngine instance
 */
export function createSyncEngine(options: SyncEngineOptions): SyncEngine {
  return new SyncEngineImpl(options);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if sync is needed by comparing current vs generated state
 */
export async function isSyncNeeded(engine: SyncEngine): Promise<boolean> {
  const diff = await engine.diff();
  return diff.some(d => d.type !== 'unchanged');
}

/**
 * Get summary of pending changes
 */
export async function getSyncSummary(engine: SyncEngine): Promise<{
  needsSync: boolean;
  creates: number;
  modifies: number;
  deletes: number;
  files: string[];
}> {
  const diff = await engine.diff();

  return {
    needsSync: diff.some(d => d.type !== 'unchanged'),
    creates: diff.filter(d => d.type === 'create').length,
    modifies: diff.filter(d => d.type === 'modify').length,
    deletes: diff.filter(d => d.type === 'delete').length,
    files: diff.filter(d => d.type !== 'unchanged').map(d => d.file),
  };
}
