/**
 * Sync command
 * cops sync [--dry-run] [--force] [--backup]
 * Unified sync: skills, hooks, and CLAUDE.md to Claude Code
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { loadConfig } from '../core/config/loader.js';
import { createSkillManager } from '../domain/skill/index.js';
import { createHookManager } from '../domain/hook/index.js';
import { getClaudeDir, getGlobalConfigDir } from '../utils/paths.js';
import { exists, readFile, writeFile, ensureDir } from '../utils/fs.js';
import { join } from 'node:path';

// =============================================================================
// Types
// =============================================================================

interface SyncResult {
  skills: {
    added: string[];
    updated: string[];
    removed: string[];
    errors: string[];
  };
  hooks: {
    added: string[];
    updated: string[];
    removed: string[];
    errors: string[];
  };
  claudeMd: {
    updated: boolean;
    path: string;
  };
  warnings: string[];
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

// =============================================================================
// Main Sync Logic
// =============================================================================

async function executeUnifiedSync(options: {
  backup: boolean;
  verbose: boolean;
}): Promise<SyncResult> {
  const config = await loadConfig();
  const claudeDir = getClaudeDir();
  const warnings: string[] = [];

  // Ensure Claude directory exists
  await ensureDir(claudeDir);

  // Backup settings.json if requested
  if (options.backup) {
    const settingsPath = join(claudeDir, 'settings.json');
    if (await exists(settingsPath)) {
      const backupPath = await createBackup(settingsPath);
      if (backupPath && options.verbose) {
        output.dim(`  Backed up settings.json to: ${backupPath}`);
      }
    }
  }

  // 1. Sync Skills
  const skillManager = createSkillManager({
    disabledSkills: config.skills.disabled,
  });
  await skillManager.loadSkills();
  const skillResult = await skillManager.syncToClaudeCode();

  // 2. Sync Hooks
  const hookManager = createHookManager({
    disabledHooks: config.hooks.disabled,
  });
  await hookManager.loadHooks();
  const hookResult = await hookManager.syncToClaudeSettings();

  // 3. Generate CLAUDE.md (global)
  const globalClaudeMdPath = join(claudeDir, 'CLAUDE.md');
  let claudeMdUpdated = false;

  try {
    // Generate CLAUDE.md content
    const claudeMdContent = generateClaudeMdContent(config);

    // Check if content has changed
    let existingContent = '';
    if (await exists(globalClaudeMdPath)) {
      existingContent = await readFile(globalClaudeMdPath);
    }

    if (existingContent !== claudeMdContent) {
      if (options.backup && existingContent) {
        await createBackup(globalClaudeMdPath);
      }
      await writeFile(globalClaudeMdPath, claudeMdContent);
      claudeMdUpdated = true;
    }
  } catch (err) {
    warnings.push(`Failed to update CLAUDE.md: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    skills: skillResult,
    hooks: hookResult,
    claudeMd: {
      updated: claudeMdUpdated,
      path: globalClaudeMdPath,
    },
    warnings,
  };
}

/**
 * Generate CLAUDE.md content from config
 */
function generateClaudeMdContent(config: Awaited<ReturnType<typeof loadConfig>>): string {
  const lines: string[] = [];

  lines.push('# claudeops Configuration');
  lines.push('');
  lines.push('<!-- This file is managed by claudeops. Manual edits may be overwritten. -->');
  lines.push('');

  // Profile info
  lines.push(`## Active Profile: ${config.profile.name}`);
  if (config.profile.description) {
    lines.push('');
    lines.push(config.profile.description);
  }
  lines.push('');

  // Model configuration
  lines.push('## Model Configuration');
  lines.push('');
  lines.push(`- **Default**: ${config.model.default}`);
  lines.push(`- **Simple tasks**: ${config.model.routing.simple}`);
  lines.push(`- **Standard tasks**: ${config.model.routing.standard}`);
  lines.push(`- **Complex tasks**: ${config.model.routing.complex}`);
  lines.push('');

  // Agent configurations
  if (Object.keys(config.agents).length > 0) {
    lines.push('## Agent Configuration');
    lines.push('');
    lines.push('| Agent | Model | Priority |');
    lines.push('|-------|-------|----------|');
    for (const [name, agentConfig] of Object.entries(config.agents)) {
      lines.push(`| ${name} | ${agentConfig.model} | ${agentConfig.priority} |`);
    }
    lines.push('');
  }

  // Disabled skills
  if (config.skills.disabled.length > 0) {
    lines.push('## Disabled Skills');
    lines.push('');
    for (const skill of config.skills.disabled) {
      lines.push(`- ${skill}`);
    }
    lines.push('');
  }

  // Disabled hooks
  if (config.hooks.disabled.length > 0) {
    lines.push('## Disabled Hooks');
    lines.push('');
    for (const hook of config.hooks.disabled) {
      lines.push(`- ${hook}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'sync',
    description: 'Sync skills, hooks, and configuration to Claude Code',
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
    verbose: {
      type: 'boolean',
      alias: 'v',
      description: 'Show detailed sync information',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output sync result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const s = prompts.spinner();

    // Dry run - just show what would happen
    if (args.dryRun) {
      const config = await loadConfig();

      output.header('Dry Run - Sync Plan');
      console.log();

      output.kv('Profile', config.profile.name);
      output.kv('Model', config.model.default);
      console.log();

      // Show what would be synced
      const skillManager = createSkillManager({
        disabledSkills: config.skills.disabled,
      });
      const skills = await skillManager.loadSkills();

      const hookManager = createHookManager({
        disabledHooks: config.hooks.disabled,
      });
      const hooks = await hookManager.loadHooks();

      output.kv('Skills to sync', skills.length.toString());
      output.kv('Hooks to sync', hooks.length.toString());

      if (config.skills.disabled.length > 0) {
        output.kv('Disabled skills', config.skills.disabled.join(', '));
      }
      if (config.hooks.disabled.length > 0) {
        output.kv('Disabled hooks', config.hooks.disabled.join(', '));
      }

      console.log();
      output.info('Dry run - no changes made');
      return;
    }

    // Confirm unless forced
    if (!args.force) {
      const confirmed = await prompts.promptConfirm('Sync skills, hooks, and CLAUDE.md to Claude Code?');
      prompts.handleCancel(confirmed);
      if (!confirmed) {
        output.info('Sync cancelled');
        return;
      }
    }

    // Execute sync
    s.start('Syncing to Claude Code...');

    try {
      const result = await executeUnifiedSync({
        backup: args.backup,
        verbose: args.verbose,
      });

      s.stop('Sync complete');

      if (args.json) {
        output.json(result);
        return;
      }

      // Show results
      const skillChanges = result.skills.added.length + result.skills.updated.length + result.skills.removed.length;
      const hookChanges = result.hooks.added.length + result.hooks.updated.length + result.hooks.removed.length;

      console.log();
      output.header('Sync Results');
      console.log();

      // Skills
      if (skillChanges > 0) {
        output.success(`Skills: ${result.skills.added.length} added, ${result.skills.updated.length} updated, ${result.skills.removed.length} removed`);
        if (args.verbose) {
          for (const name of result.skills.added) console.log(`  + ${name}`);
          for (const name of result.skills.updated) console.log(`  ~ ${name}`);
          for (const name of result.skills.removed) console.log(`  - ${name}`);
        }
      } else {
        output.dim('Skills: No changes');
      }

      // Hooks
      if (hookChanges > 0) {
        output.success(`Hooks: ${result.hooks.added.length} added, ${result.hooks.updated.length} updated, ${result.hooks.removed.length} removed`);
        if (args.verbose) {
          for (const name of result.hooks.added) console.log(`  + ${name}`);
          for (const name of result.hooks.updated) console.log(`  ~ ${name}`);
          for (const name of result.hooks.removed) console.log(`  - ${name}`);
        }
      } else {
        output.dim('Hooks: No changes');
      }

      // CLAUDE.md
      if (result.claudeMd.updated) {
        output.success(`CLAUDE.md: Updated`);
        if (args.verbose) {
          output.dim(`  ${result.claudeMd.path}`);
        }
      } else {
        output.dim('CLAUDE.md: No changes');
      }

      // Warnings
      if (result.warnings.length > 0) {
        console.log();
        for (const warning of result.warnings) {
          output.warn(warning);
        }
      }

      // Errors
      const allErrors = [...result.skills.errors, ...result.hooks.errors];
      if (allErrors.length > 0) {
        console.log();
        output.error(`${allErrors.length} error(s) during sync:`);
        for (const error of allErrors) {
          console.log(`  ${error}`);
        }
        process.exit(1);
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

/**
 * Execute sync programmatically (for use by profile switch)
 */
export async function syncAll(options?: { verbose?: boolean; backup?: boolean }): Promise<SyncResult> {
  return executeUnifiedSync({
    backup: options?.backup ?? true,
    verbose: options?.verbose ?? false,
  });
}
