/**
 * Reset command - Remove claudeops-generated artifacts
 * cops reset [--global] [--all] [--force] [--dry-run]
 */

import { defineCommand } from 'citty';
import { join } from 'node:path';
import { readdir, unlink } from 'node:fs/promises';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { getClaudeDir } from '../utils/paths.js';
import { exists, readFile, writeFile } from '../utils/fs.js';

// =============================================================================
// Constants
// =============================================================================

const MANAGED_START = '<!-- claudeops:managed:start -->';
const MANAGED_END = '<!-- claudeops:managed:end -->';
const CLAUDE_MD = 'CLAUDE.md';
const SETTINGS_JSON = 'settings.json';
const SKILLS_DIR = 'skills';

// =============================================================================
// Types
// =============================================================================

interface ResetAction {
  type: 'remove-managed-section' | 'remove-skill' | 'clean-settings';
  path: string;
  description: string;
}

// =============================================================================
// Detection Functions
// =============================================================================

/**
 * Find claudeops artifacts in a Claude directory
 */
async function findArtifacts(claudeDir: string): Promise<ResetAction[]> {
  const actions: ResetAction[] = [];

  // 1. Check CLAUDE.md for managed sections
  const claudeMdPath = join(claudeDir, CLAUDE_MD);
  if (await exists(claudeMdPath)) {
    const content = await readFile(claudeMdPath);
    if (content.includes(MANAGED_START) && content.includes(MANAGED_END)) {
      actions.push({
        type: 'remove-managed-section',
        path: claudeMdPath,
        description: `Remove managed section from ${CLAUDE_MD}`,
      });
    }
  }

  // 2. Check skills directory for claudeops-generated skills
  const skillsDir = join(claudeDir, SKILLS_DIR);
  if (await exists(skillsDir)) {
    try {
      const files = await readdir(skillsDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = join(skillsDir, file);
        const content = await readFile(filePath);
        if (content.includes('claudeops') && content.startsWith('---')) {
          actions.push({
            type: 'remove-skill',
            path: filePath,
            description: `Remove skill: ${file}`,
          });
        }
      }
    } catch {
      // Skills directory might not be readable
    }
  }

  // 3. Check settings.json for claudeops metadata
  const settingsPath = join(claudeDir, SETTINGS_JSON);
  if (await exists(settingsPath)) {
    try {
      const content = await readFile(settingsPath);
      const settings = JSON.parse(content);
      if (settings?.metadata?.claudeops) {
        actions.push({
          type: 'clean-settings',
          path: settingsPath,
          description: `Remove claudeops hooks and metadata from ${SETTINGS_JSON}`,
        });
      }
    } catch {
      // Settings might not be valid JSON
    }
  }

  return actions;
}

// =============================================================================
// Reset Functions
// =============================================================================

/**
 * Remove managed section from CLAUDE.md, preserving user content
 */
async function removeManagedSection(filePath: string): Promise<void> {
  const content = await readFile(filePath);

  const startIdx = content.indexOf(MANAGED_START);
  const endIdx = content.indexOf(MANAGED_END);

  if (startIdx === -1 || endIdx === -1) return;

  const before = content.substring(0, startIdx).trim();
  const after = content.substring(endIdx + MANAGED_END.length).trim();

  const result = [before, after].filter(Boolean).join('\n\n');

  if (result.trim()) {
    await writeFile(filePath, result.trim() + '\n');
  } else {
    await unlink(filePath);
  }
}

/**
 * Remove a skill file
 */
async function removeSkill(filePath: string): Promise<void> {
  await unlink(filePath);
}

/**
 * Clean claudeops entries from settings.json
 */
async function cleanSettings(filePath: string): Promise<void> {
  const content = await readFile(filePath);
  const settings = JSON.parse(content);

  // Remove claudeops metadata
  if (settings.metadata?.claudeops) {
    delete settings.metadata.claudeops;
    if (Object.keys(settings.metadata).length === 0) {
      delete settings.metadata;
    }
  }

  // Remove hooks that were added by claudeops
  // (claudeops-generated hooks have handler paths containing 'claudeops')
  if (settings.hooks) {
    for (const event of Object.keys(settings.hooks)) {
      const entries = settings.hooks[event];
      if (Array.isArray(entries)) {
        settings.hooks[event] = entries.filter((entry: Record<string, unknown>) => {
          const hooks = entry['hooks'] as Array<{ command?: string }> | undefined;
          if (!hooks) return true;
          return !hooks.some(h => h.command?.includes('claudeops'));
        });
        if (settings.hooks[event].length === 0) {
          delete settings.hooks[event];
        }
      }
    }
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }
  }

  await writeFile(filePath, JSON.stringify(settings, null, 2) + '\n');
}

/**
 * Execute a reset action
 */
async function executeAction(action: ResetAction): Promise<void> {
  switch (action.type) {
    case 'remove-managed-section':
      await removeManagedSection(action.path);
      break;
    case 'remove-skill':
      await removeSkill(action.path);
      break;
    case 'clean-settings':
      await cleanSettings(action.path);
      break;
  }
}

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'reset',
    description: 'Remove claudeops-generated artifacts',
  },
  args: {
    global: {
      type: 'boolean',
      alias: 'g',
      description: 'Reset global (~/.claude) artifacts',
      default: false,
    },
    all: {
      type: 'boolean',
      alias: 'a',
      description: 'Reset both project and global artifacts',
      default: false,
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Skip confirmation prompt',
      default: false,
    },
    dryRun: {
      type: 'boolean',
      alias: 'd',
      description: 'Show what would be removed without making changes',
      default: false,
    },
  },
  async run({ args }) {
    const scopes: Array<{ label: string; dir: string }> = [];

    if (args.all) {
      scopes.push({ label: 'project', dir: join(process.cwd(), '.claude') });
      scopes.push({ label: 'global', dir: getClaudeDir() });
    } else if (args.global) {
      scopes.push({ label: 'global', dir: getClaudeDir() });
    } else {
      scopes.push({ label: 'project', dir: join(process.cwd(), '.claude') });
    }

    // Collect all actions
    const allActions: Array<{ scope: string; action: ResetAction }> = [];

    for (const scope of scopes) {
      if (!(await exists(scope.dir))) {
        output.dim(`No ${scope.label} Claude directory found at ${scope.dir}`);
        continue;
      }

      const actions = await findArtifacts(scope.dir);
      for (const action of actions) {
        allActions.push({ scope: scope.label, action });
      }
    }

    if (allActions.length === 0) {
      output.info('No claudeops artifacts found to remove.');
      return;
    }

    // Show what will be done
    output.header('Artifacts to Remove');
    console.log();

    for (const { scope, action } of allActions) {
      console.log(`  [${scope}] ${action.description}`);
      output.dim(`         ${action.path}`);
    }

    console.log();
    output.info(`${allActions.length} artifact(s) found`);

    // Dry run - stop here
    if (args.dryRun) {
      console.log();
      output.info('Dry run - no changes made');
      return;
    }

    // Confirm
    if (!args.force) {
      console.log();
      const confirmed = await prompts.confirm({
        message: `Remove ${allActions.length} claudeops artifact(s)?`,
        initialValue: false,
      });
      prompts.handleCancel(confirmed);
      if (!confirmed) {
        output.info('Reset cancelled');
        return;
      }
    }

    // Execute
    const s = prompts.spinner();
    s.start('Removing artifacts...');

    let removed = 0;
    const errors: string[] = [];

    for (const { action } of allActions) {
      try {
        await executeAction(action);
        removed++;
      } catch (err) {
        errors.push(`${action.description}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    s.stop('Reset complete');

    console.log();
    output.success(`Removed ${removed} artifact(s)`);

    if (errors.length > 0) {
      console.log();
      output.error(`${errors.length} error(s):`);
      for (const err of errors) {
        console.log(`  ${err}`);
      }
    }
  },
});
