/**
 * Setup management commands
 * ck setup list|info|use|create|export|import
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { createSetupManager, SetupManagerError } from '../domain/setup/manager.js';
import { writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const setupManager = createSetupManager();

// =============================================================================
// List Setups
// =============================================================================

const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List available setups',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const setups = await setupManager.list();

    if (args.json) {
      output.json(setups);
      return;
    }

    if (setups.length === 0) {
      output.info('No setups found.');
      return;
    }

    output.header('Available Setups');

    output.table(
      setups.map(s => ({
        name: s.name,
        version: s.version,
        description: output.truncate(s.description ?? '-', 40),
        author: s.author ?? '-',
        // @ts-expect-error - source is added by list()
        source: s.source ?? 'unknown',
      })),
      [
        { key: 'name', header: 'Name', width: 20 },
        { key: 'version', header: 'Version', width: 10 },
        { key: 'description', header: 'Description', width: 40 },
        { key: 'author', header: 'Author', width: 15 },
        { key: 'source', header: 'Source', width: 10 },
      ]
    );
  },
});

// =============================================================================
// Show Setup Info
// =============================================================================

const infoCommand = defineCommand({
  meta: {
    name: 'info',
    description: 'Show setup details',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Setup name',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const setup = await setupManager.get(args.name);

      if (args.json) {
        output.json(setup);
        return;
      }

      output.header(`Setup: ${setup.manifest.name}`);

      output.kv('Version', setup.manifest.version);
      if (setup.manifest.description) {
        output.kv('Description', setup.manifest.description);
      }
      if (setup.manifest.author) {
        output.kv('Author', setup.manifest.author);
      }
      output.kv('Path', setup.sourcePath);

      // Skills
      if (setup.manifest.skills) {
        console.log();
        output.header('Skills');
        if (setup.manifest.skills.enabled && setup.manifest.skills.enabled.length > 0) {
          output.kv('Enabled', setup.manifest.skills.enabled.join(', '));
        }
        if (setup.manifest.skills.disabled && setup.manifest.skills.disabled.length > 0) {
          output.kv('Disabled', setup.manifest.skills.disabled.join(', '));
        }
      }

      // Hooks
      if (setup.manifest.hooks?.templates && setup.manifest.hooks.templates.length > 0) {
        console.log();
        output.header('Hook Templates');
        output.table(
          setup.manifest.hooks.templates.map(h => ({
            name: h.name,
            matcher: h.matcher,
            priority: h.priority ?? 0,
          })),
          [
            { key: 'name', header: 'Name', width: 20 },
            { key: 'matcher', header: 'Matcher', width: 30 },
            { key: 'priority', header: 'Priority', width: 10, align: 'right' },
          ]
        );
      }

      // CLAUDE.md content preview
      if (setup.content) {
        console.log();
        output.header('CLAUDE.md Preview');
        const lines = setup.content.split('\n').slice(0, 10);
        for (const line of lines) {
          output.dim(output.truncate(line, 80));
        }
        if (setup.content.split('\n').length > 10) {
          output.dim('...');
        }
      }
    } catch (err) {
      if (err instanceof SetupManagerError && err.code === 'SETUP_NOT_FOUND') {
        output.error(`Setup not found: ${args.name}`);
        output.info('List available setups with: ck setup list');
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Use Setup
// =============================================================================

const useCommand = defineCommand({
  meta: {
    name: 'use',
    description: 'Apply a setup (generates CLAUDE.md)',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Setup name to apply',
      required: true,
    },
    extend: {
      type: 'string',
      alias: 'e',
      description: 'Additional setup(s) to extend from (comma-separated)',
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'Output path (defaults to CLAUDE.md in current directory)',
      default: 'CLAUDE.md',
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Overwrite existing file without prompt',
      default: false,
    },
    dryRun: {
      type: 'boolean',
      description: 'Show what would be generated without writing',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const extends_ = args.extend?.split(',').map(s => s.trim()) ?? [];
      const merged = await setupManager.apply(args.name, extends_);

      const outputPath = resolve(args.output);

      if (args.dryRun) {
        output.header('Dry Run - Would Generate:');
        console.log(merged.content);
        console.log();
        output.info(`Would write to: ${outputPath}`);
        return;
      }

      // Check if file exists
      try {
        await readFile(outputPath);
        if (!args.force) {
          const confirmed = await prompts.promptConfirm(
            `File ${args.output} already exists. Overwrite?`
          );
          prompts.handleCancel(confirmed);
          if (!confirmed) {
            output.info('Operation cancelled');
            return;
          }
        }
      } catch {
        // File doesn't exist, proceed
      }

      await writeFile(outputPath, merged.content ?? '');
      output.success(`Generated: ${outputPath}`);

      if (extends_.length > 0) {
        output.info(`Extended from: ${extends_.join(', ')}`);
      }
    } catch (err) {
      if (err instanceof SetupManagerError && err.code === 'SETUP_NOT_FOUND') {
        output.error(`Setup not found: ${args.name}`);
        output.info('List available setups with: ck setup list');
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Create Setup
// =============================================================================

const createCommand = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new custom setup',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Setup name',
      required: true,
    },
    from: {
      type: 'string',
      alias: 'f',
      description: 'Base setup(s) to extend from (comma-separated)',
    },
    description: {
      type: 'string',
      alias: 'd',
      description: 'Setup description',
    },
  },
  async run({ args }) {
    const s = prompts.spinner();
    s.start('Creating setup...');

    try {
      const from = args.from?.split(',').map(s => s.trim());
      await setupManager.create(args.name, from);

      s.stop('Setup created');
      output.success(`Created setup: ${args.name}`);
      output.info(`Edit your setup in: ~/.claudeops/setups/${args.name}/`);
    } catch (err) {
      s.stop('Creation failed');
      if (err instanceof SetupManagerError) {
        if (err.code === 'SETUP_EXISTS') {
          output.error(`Setup already exists: ${args.name}`);
          process.exit(1);
        }
        if (err.code === 'INVALID_NAME') {
          output.error(err.message);
          process.exit(1);
        }
      }
      throw err;
    }
  },
});

// =============================================================================
// Export Setup
// =============================================================================

const exportCommand = defineCommand({
  meta: {
    name: 'export',
    description: 'Export a setup as tar.gz archive',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Setup name to export',
      required: true,
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'Output file path',
    },
  },
  async run({ args }) {
    const s = prompts.spinner();
    s.start('Exporting setup...');

    try {
      const archive = await setupManager.export(args.name);
      const outputPath = args.output ?? `${args.name}.tar.gz`;

      await writeFile(resolve(outputPath), archive);

      s.stop('Setup exported');
      output.success(`Exported to: ${outputPath}`);
      output.kv('Size', output.formatBytes(archive.length));
    } catch (err) {
      s.stop('Export failed');
      if (err instanceof SetupManagerError && err.code === 'SETUP_NOT_FOUND') {
        output.error(`Setup not found: ${args.name}`);
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Import Setup
// =============================================================================

const importCommand = defineCommand({
  meta: {
    name: 'import',
    description: 'Import a setup from file, URL, or archive',
  },
  args: {
    source: {
      type: 'positional',
      description: 'File path, URL, or archive to import',
      required: true,
    },
    name: {
      type: 'string',
      alias: 'n',
      description: 'Name for the imported setup (auto-detected if not provided)',
    },
  },
  async run({ args }) {
    const s = prompts.spinner();
    s.start('Importing setup...');

    try {
      await setupManager.import(args.source);

      s.stop('Setup imported');
      output.success('Setup imported successfully');
      output.info('Use it with: ck setup use <name>');
    } catch (err) {
      s.stop('Import failed');
      if (err instanceof SetupManagerError) {
        if (err.code === 'SETUP_EXISTS') {
          output.error('Setup already exists with this name');
          process.exit(1);
        }
      }
      throw err;
    }
  },
});

// =============================================================================
// Delete Setup
// =============================================================================

const deleteCommand = defineCommand({
  meta: {
    name: 'delete',
    description: 'Delete a user setup',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Setup name to delete',
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
    if (!args.force) {
      const confirmed = await prompts.promptConfirm(
        `Delete setup "${args.name}"? This cannot be undone.`
      );
      prompts.handleCancel(confirmed);
      if (!confirmed) {
        output.info('Deletion cancelled');
        return;
      }
    }

    try {
      await setupManager.delete(args.name);
      output.success(`Deleted setup: ${args.name}`);
    } catch (err) {
      if (err instanceof SetupManagerError) {
        if (err.code === 'SETUP_NOT_FOUND') {
          output.error(`User setup not found: ${args.name}`);
          process.exit(1);
        }
        if (err.code === 'CANNOT_DELETE_BUILTIN') {
          output.error('Cannot delete builtin setups');
          process.exit(1);
        }
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
    name: 'setup',
    description: 'Manage setups',
  },
  subCommands: {
    list: listCommand,
    info: infoCommand,
    use: useCommand,
    create: createCommand,
    export: exportCommand,
    import: importCommand,
    delete: deleteCommand,
  },
});
