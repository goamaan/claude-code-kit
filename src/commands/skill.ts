/**
 * Skill management commands
 * cops skill add|remove|list|enable|disable
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import {
  parseSource,
  installFromSource,
  removeSkill,
  listInstalledSkills,
} from '../domain/skill/installer.js';
import { createSkillManager } from '../domain/skill/skill-manager.js';
import { syncAll } from './sync.js';

// =============================================================================
// Add Skill
// =============================================================================

const addCommand = defineCommand({
  meta: {
    name: 'add',
    description: 'Install skill(s) from a git repo or local path',
  },
  args: {
    source: {
      type: 'positional',
      description: 'Source: owner/repo, owner/repo@skill-name, URL, or local path',
      required: true,
    },
    all: {
      type: 'boolean',
      description: 'Install all skills from source (when multiple found)',
      default: false,
    },
    noSync: {
      type: 'boolean',
      description: 'Skip auto-sync after install',
      default: false,
    },
  },
  async run({ args }) {
    const s = prompts.spinner();

    try {
      const source = parseSource(args.source);
      s.start(`Installing from ${args.source}...`);

      const installed = await installFromSource(source, { all: args.all });

      s.stop('Installation complete');

      for (const skill of installed) {
        output.success(`Installed skill: ${skill.name}`);
      }

      // Auto-sync
      if (!args.noSync) {
        output.info('Syncing to Claude Code...');
        try {
          await syncAll({ verbose: false });
          output.success('Sync complete');
        } catch (syncErr) {
          output.warn(`Sync failed: ${syncErr instanceof Error ? syncErr.message : String(syncErr)}`);
          output.info('Run "cops sync" manually to sync');
        }
      }
    } catch (err) {
      s.stop('Installation failed');
      output.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});

// =============================================================================
// Remove Skill
// =============================================================================

const removeCommand = defineCommand({
  meta: {
    name: 'remove',
    description: 'Remove an installed skill',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Skill name to remove',
      required: true,
    },
    noSync: {
      type: 'boolean',
      description: 'Skip auto-sync after removal',
      default: false,
    },
  },
  async run({ args }) {
    try {
      await removeSkill(args.name);
      output.success(`Removed skill: ${args.name}`);

      if (!args.noSync) {
        output.info('Syncing to Claude Code...');
        try {
          await syncAll({ verbose: false });
          output.success('Sync complete');
        } catch (syncErr) {
          output.warn(`Sync failed: ${syncErr instanceof Error ? syncErr.message : String(syncErr)}`);
        }
      }
    } catch (err) {
      output.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});

// =============================================================================
// List Skills
// =============================================================================

const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List all skills (installed + builtin + status)',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    // Load all skills from the manager
    const manager = createSkillManager();
    await manager.loadSkills();
    const allSkills = manager.getSkills();

    // Get installed skills
    const installed = listInstalledSkills();
    const installedNames = new Set(installed.map(s => s.name));

    if (args.json) {
      output.json({
        skills: allSkills.map(s => ({
          name: s.metadata.name,
          description: s.metadata.description,
          source: s.sourceType,
          installed: installedNames.has(s.metadata.name),
        })),
      });
      return;
    }

    if (allSkills.length === 0) {
      output.info('No skills found. Install one with: cops skill add <source>');
      return;
    }

    output.header('Skills');

    output.table(
      allSkills.map(s => ({
        name: s.metadata.name,
        description: output.truncate(s.metadata.description || '-', 40),
        source: s.sourceType,
        installed: installedNames.has(s.metadata.name) ? 'yes' : '-',
      })),
      [
        { key: 'name', header: 'Name', width: 20 },
        { key: 'description', header: 'Description', width: 42 },
        { key: 'source', header: 'Source', width: 10 },
        { key: 'installed', header: 'Installed', width: 10 },
      ]
    );

    console.log();
    output.dim(`  ${allSkills.length} skills total`);
  },
});

// =============================================================================
// Enable Skill
// =============================================================================

const enableCommand = defineCommand({
  meta: {
    name: 'enable',
    description: 'Enable a skill in active profile',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Skill name to enable',
      required: true,
    },
  },
  async run({ args }) {
    // For now, enabling/disabling modifies the profile's skills config
    // This requires profile manager integration
    output.info(`To enable skill "${args.name}", edit your profile:`);
    output.dim('  cops profile show');
    output.dim(`  Remove "${args.name}" from disabled_skills in your profile TOML`);
    output.dim('  cops sync');
  },
});

// =============================================================================
// Disable Skill
// =============================================================================

const disableCommand = defineCommand({
  meta: {
    name: 'disable',
    description: 'Disable a skill in active profile',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Skill name to disable',
      required: true,
    },
  },
  async run({ args }) {
    output.info(`To disable skill "${args.name}", edit your profile:`);
    output.dim('  cops profile show');
    output.dim(`  Add "${args.name}" to disabled_skills in your profile TOML`);
    output.dim('  cops sync');
  },
});

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'skill',
    description: 'Manage skills (install, remove, list)',
  },
  subCommands: {
    add: addCommand,
    remove: removeCommand,
    list: listCommand,
    enable: enableCommand,
    disable: disableCommand,
  },
});
