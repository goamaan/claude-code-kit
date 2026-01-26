/**
 * Profile management commands
 * cops profile list|use|create|delete|export|import
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { createProfileManager, ProfileNotFoundError, ProfileExistsError, ActiveProfileDeleteError } from '../domain/profile/manager.js';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { syncAll } from './sync.js';

const profileManager = createProfileManager();

// =============================================================================
// List Profiles
// =============================================================================

const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List all profiles',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const profiles = await profileManager.list();

    if (args.json) {
      output.json(profiles);
      return;
    }

    if (profiles.length === 0) {
      output.info('No profiles found. Create one with: cops profile create <name>');
      return;
    }

    output.header('Profiles');

    output.table(
      profiles.map(p => ({
        name: p.active ? `* ${p.name}` : `  ${p.name}`,
        description: p.description ?? '-',
        extends: p.extends ?? '-',
        skills: p.skillCount,
        agents: p.agentCount,
        modified: output.formatRelativeTime(p.modifiedAt),
      })),
      [
        { key: 'name', header: 'Name', width: 20 },
        { key: 'description', header: 'Description', width: 30 },
        { key: 'extends', header: 'Extends', width: 15 },
        { key: 'skills', header: 'Skills', width: 8, align: 'right' },
        { key: 'agents', header: 'Agents', width: 8, align: 'right' },
        { key: 'modified', header: 'Modified', width: 12 },
      ]
    );

    console.log();
    output.dim(`  * = active profile`);
  },
});

// =============================================================================
// Use Profile
// =============================================================================

const useCommand = defineCommand({
  meta: {
    name: 'use',
    description: 'Switch to a profile',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Profile name to activate',
      required: true,
    },
    noSync: {
      type: 'boolean',
      description: 'Skip auto-sync after switching',
      default: false,
    },
  },
  async run({ args }) {
    try {
      await profileManager.use(args.name);
      output.success(`Switched to profile: ${args.name}`);

      // Auto-sync to Claude Code unless --no-sync
      if (!args.noSync) {
        output.info('Syncing to Claude Code...');
        try {
          const result = await syncAll({ verbose: false });
          const skillChanges = result.skills.added.length + result.skills.updated.length + result.skills.removed.length;
          const hookChanges = result.hooks.added.length + result.hooks.updated.length + result.hooks.removed.length;

          if (skillChanges > 0 || hookChanges > 0 || result.claudeMd.updated) {
            output.success('Sync complete');
          } else {
            output.dim('No changes to sync');
          }
        } catch (syncErr) {
          output.warn(`Sync failed: ${syncErr instanceof Error ? syncErr.message : String(syncErr)}`);
          output.info('Run "cops sync" manually to sync');
        }
      }
    } catch (err) {
      if (err instanceof ProfileNotFoundError) {
        output.error(`Profile not found: ${args.name}`);
        output.info('List available profiles with: ck profile list');
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Create Profile
// =============================================================================

const createCommand = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new profile',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Profile name',
      required: true,
    },
    from: {
      type: 'string',
      alias: 'f',
      description: 'Base profile to extend',
    },
    setup: {
      type: 'string',
      alias: 's',
      description: 'Setup to use as template',
    },
    description: {
      type: 'string',
      alias: 'd',
      description: 'Profile description',
    },
    activate: {
      type: 'boolean',
      alias: 'a',
      description: 'Activate after creation',
      default: false,
    },
  },
  async run({ args }) {
    try {
      await profileManager.create(args.name, {
        description: args.description,
        extends: args.from,
        activate: args.activate,
      });

      output.success(`Created profile: ${args.name}`);

      if (args.activate) {
        output.info(`Profile ${args.name} is now active`);
      } else {
        output.info(`Activate with: ck profile use ${args.name}`);
      }
    } catch (err) {
      if (err instanceof ProfileExistsError) {
        output.error(`Profile already exists: ${args.name}`);
        process.exit(1);
      }
      if (err instanceof ProfileNotFoundError) {
        output.error(`Base profile not found: ${args.from}`);
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Delete Profile
// =============================================================================

const deleteCommand = defineCommand({
  meta: {
    name: 'delete',
    description: 'Delete a profile',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Profile name to delete',
      required: true,
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Skip confirmation',
      default: false,
    },
  },
  async run({ args }) {
    // Confirm deletion
    if (!args.force) {
      const confirmed = await prompts.promptConfirm(
        `Delete profile "${args.name}"? This cannot be undone.`
      );
      prompts.handleCancel(confirmed);
      if (!confirmed) {
        output.info('Deletion cancelled');
        return;
      }
    }

    try {
      await profileManager.delete(args.name);
      output.success(`Deleted profile: ${args.name}`);
    } catch (err) {
      if (err instanceof ProfileNotFoundError) {
        output.error(`Profile not found: ${args.name}`);
        process.exit(1);
      }
      if (err instanceof ActiveProfileDeleteError) {
        output.error(`Cannot delete active profile: ${args.name}`);
        output.info('Switch to another profile first with: ck profile use <name>');
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Export Profile
// =============================================================================

const exportCommand = defineCommand({
  meta: {
    name: 'export',
    description: 'Export a profile',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Profile name to export',
      required: true,
    },
    format: {
      type: 'string',
      alias: 'f',
      description: 'Output format (toml, json)',
      default: 'toml',
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'Output file path (defaults to stdout)',
    },
    resolved: {
      type: 'boolean',
      alias: 'r',
      description: 'Export resolved (merged) configuration',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const format = args.format === 'json' ? 'json' : 'yaml';
      const content = await profileManager.export(args.name, {
        format,
        resolved: args.resolved,
      });

      if (args.output) {
        const outputPath = resolve(args.output);
        await writeFile(outputPath, content);
        output.success(`Exported to: ${outputPath}`);
      } else {
        console.log(content);
      }
    } catch (err) {
      if (err instanceof ProfileNotFoundError) {
        output.error(`Profile not found: ${args.name}`);
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Import Profile
// =============================================================================

const importCommand = defineCommand({
  meta: {
    name: 'import',
    description: 'Import a profile from file or URL',
  },
  args: {
    source: {
      type: 'positional',
      description: 'File path or URL to import from',
      required: true,
    },
    name: {
      type: 'string',
      alias: 'n',
      description: 'Name for the imported profile',
    },
    merge: {
      type: 'boolean',
      alias: 'm',
      description: 'Merge with existing profile if it exists',
      default: false,
    },
    activate: {
      type: 'boolean',
      alias: 'a',
      description: 'Activate after import',
      default: false,
    },
  },
  async run({ args }) {
    const s = prompts.spinner();
    s.start('Importing profile...');

    try {
      await profileManager.import(args.source, {
        name: args.name,
        overwrite: args.merge,
        activate: args.activate,
      });

      s.stop('Profile imported');
      output.success(`Imported profile${args.name ? `: ${args.name}` : ''}`);

      if (args.activate) {
        output.info('Profile is now active');
      }
    } catch (err) {
      s.stop('Import failed');
      if (err instanceof ProfileExistsError) {
        output.error('Profile already exists. Use --merge to overwrite.');
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Show Profile Details
// =============================================================================

const showCommand = defineCommand({
  meta: {
    name: 'show',
    description: 'Show profile details',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Profile name (defaults to active)',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const name = args.name ?? await profileManager.active();

    try {
      const profile = await profileManager.get(name);

      if (args.json) {
        output.json(profile);
        return;
      }

      output.header(`Profile: ${profile.name}`);

      if (profile.description) {
        output.dim(profile.description);
        console.log();
      }

      output.kv('Path', profile.path);
      output.kv('Active', profile.active ? 'yes' : 'no');
      output.kv('Created', profile.createdAt.toLocaleString());
      output.kv('Modified', profile.modifiedAt.toLocaleString());

      if (profile.inheritanceChain.length > 1) {
        console.log();
        output.label('Inheritance chain:', profile.inheritanceChain.join(' -> '));
      }

      // Skills
      if (profile.resolved.skills.enabled.length > 0 || profile.resolved.skills.disabled.length > 0) {
        console.log();
        output.header('Skills');
        if (profile.resolved.skills.enabled.length > 0) {
          output.kv('Enabled', profile.resolved.skills.enabled.join(', '));
        }
        if (profile.resolved.skills.disabled.length > 0) {
          output.kv('Disabled', profile.resolved.skills.disabled.join(', '));
        }
      }

      // Agents
      const agentNames = Object.keys(profile.resolved.agents);
      if (agentNames.length > 0) {
        console.log();
        output.header('Agents');
        output.table(
          agentNames.map(name => ({
            name,
            model: profile.resolved.agents[name]?.model ?? '-',
            priority: profile.resolved.agents[name]?.priority ?? 50,
          })),
          [
            { key: 'name', header: 'Name', width: 20 },
            { key: 'model', header: 'Model', width: 10 },
            { key: 'priority', header: 'Priority', width: 10, align: 'right' },
          ]
        );
      }

      // Model Configuration
      console.log();
      output.header('Model Configuration');
      output.kv('Default', profile.resolved.model.default);
      output.kv('Simple tasks', profile.resolved.model.routing.simple);
      output.kv('Standard tasks', profile.resolved.model.routing.standard);
      output.kv('Complex tasks', profile.resolved.model.routing.complex);

      // MCP
      if (profile.resolved.mcp.enabled.length > 0 || profile.resolved.mcp.disabled.length > 0) {
        console.log();
        output.header('MCP Servers');
        if (profile.resolved.mcp.enabled.length > 0) {
          output.kv('Enabled', profile.resolved.mcp.enabled.join(', '));
        }
        if (profile.resolved.mcp.disabled.length > 0) {
          output.kv('Disabled', profile.resolved.mcp.disabled.join(', '));
        }
      }
    } catch (err) {
      if (err instanceof ProfileNotFoundError) {
        output.error(`Profile not found: ${name}`);
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'profile',
    description: 'Manage profiles',
  },
  subCommands: {
    list: listCommand,
    use: useCommand,
    create: createCommand,
    delete: deleteCommand,
    export: exportCommand,
    import: importCommand,
    show: showCommand,
  },
});
