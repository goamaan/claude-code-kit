/**
 * Pack management commands
 * ck pack add|list|info|remove|enable|disable|update
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import {
  createPackManager,
  PackManagerError,
} from '../domain/pack/manager.js';
import type { PackComponent } from '../domain/pack/types.js';

const packManager = createPackManager();

// =============================================================================
// Add Pack
// =============================================================================

const addCommand = defineCommand({
  meta: {
    name: 'add',
    description: 'Analyze and install a pack from GitHub or local path',
  },
  args: {
    source: {
      type: 'positional',
      description: 'GitHub URL or local path',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const installer = packManager.getInstaller();
      await installer.install(args.source);
    } catch (err) {
      if (err instanceof PackManagerError) {
        output.error(err.message);
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// List Packs
// =============================================================================

const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List installed packs',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
    all: {
      type: 'boolean',
      alias: 'a',
      description: 'Include disabled packs',
      default: true,
    },
  },
  async run({ args }) {
    const packs = await packManager.listPacks();

    if (args.json) {
      output.json(packs);
      return;
    }

    if (packs.length === 0) {
      output.info('No packs installed.');
      output.info('Install a pack with: ck pack add <repo-url>');
      return;
    }

    output.header('Installed Packs');

    const filtered = args.all ? packs : packs.filter(p => p.enabled);

    output.table(
      filtered.map(p => ({
        name: p.name,
        source: output.truncate(p.source, 40),
        components: p.components.length,
        enabled: p.enabled ? 'yes' : 'no',
        installed: output.formatRelativeTime(new Date(p.installedAt)),
      })),
      [
        { key: 'name', header: 'Name', width: 25 },
        { key: 'source', header: 'Source', width: 40 },
        { key: 'components', header: 'Components', width: 12, align: 'right' },
        { key: 'enabled', header: 'Enabled', width: 8 },
        { key: 'installed', header: 'Installed', width: 12 },
      ]
    );
  },
});

// =============================================================================
// Pack Info
// =============================================================================

const infoCommand = defineCommand({
  meta: {
    name: 'info',
    description: 'Show pack details',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Pack name',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const pack = await packManager.getPack(args.name);

    if (!pack) {
      output.error(`Pack not found: ${args.name}`);
      process.exit(1);
    }

    if (args.json) {
      output.json(pack);
      return;
    }

    output.header(`Pack: ${pack.name}`);
    output.kv('Source', pack.source);
    output.kv('Enabled', pack.enabled ? 'yes' : 'no');
    output.kv('Installed', new Date(pack.installedAt).toLocaleString());

    if (pack.components.length > 0) {
      console.log();
      output.header('Components');

      // Group components by type
      const byType = pack.components.reduce((acc, c) => {
        if (!acc[c.type]) acc[c.type] = [];
        acc[c.type]!.push(c);
        return acc;
      }, {} as Record<string, PackComponent[]>);

      for (const [type, components] of Object.entries(byType)) {
        console.log();
        output.label(`${type}:`, `${components.length} component(s)`);
        for (const component of components) {
          console.log(`  ${output.truncate(component.name, 25).padEnd(27)} ${component.description}`);
        }
      }
    }
  },
});

// =============================================================================
// Remove Pack
// =============================================================================

const removeCommand = defineCommand({
  meta: {
    name: 'remove',
    description: 'Uninstall a pack',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Pack name to remove',
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
    // Check if pack exists
    const pack = await packManager.getPack(args.name);
    if (!pack) {
      output.error(`Pack not found: ${args.name}`);
      process.exit(1);
    }

    if (!args.force) {
      const confirmed = await prompts.promptConfirm(
        `Remove pack "${args.name}" and all its components? This cannot be undone.`
      );
      prompts.handleCancel(confirmed);
      if (!confirmed) {
        output.info('Removal cancelled');
        return;
      }
    }

    const s = prompts.spinner();
    s.start('Removing pack...');

    try {
      await packManager.removePack(args.name);
      s.stop('Pack removed');
      output.success(`Removed pack: ${args.name}`);
    } catch (err) {
      s.stop('Removal failed');
      if (err instanceof PackManagerError) {
        output.error(err.message);
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Enable Pack
// =============================================================================

const enableCommand = defineCommand({
  meta: {
    name: 'enable',
    description: 'Enable an installed pack',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Pack name to enable',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await packManager.enablePack(args.name);
      output.success(`Enabled pack: ${args.name}`);
    } catch (err) {
      if (err instanceof PackManagerError) {
        output.error(err.message);
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Disable Pack
// =============================================================================

const disableCommand = defineCommand({
  meta: {
    name: 'disable',
    description: 'Disable an installed pack',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Pack name to disable',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await packManager.disablePack(args.name);
      output.success(`Disabled pack: ${args.name}`);
    } catch (err) {
      if (err instanceof PackManagerError) {
        output.error(err.message);
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Update Pack(s)
// =============================================================================

const updateCommand = defineCommand({
  meta: {
    name: 'update',
    description: 'Update pack(s)',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Pack name (or omit to update all)',
    },
    all: {
      type: 'boolean',
      alias: 'a',
      description: 'Update all packs',
      default: false,
    },
  },
  async run({ args }) {
    const s = prompts.spinner();

    try {
      if (args.name) {
        // Update specific pack
        const pack = await packManager.getPack(args.name);
        if (!pack) {
          output.error(`Pack not found: ${args.name}`);
          process.exit(1);
        }

        s.start(`Updating ${args.name}...`);

        // Remove old version and reinstall from source
        await packManager.removePack(args.name);
        const installer = packManager.getInstaller();
        await installer.install(pack.source);

        s.stop('Pack updated');
        output.success(`Updated pack: ${args.name}`);
      } else if (args.all) {
        // Update all packs
        const packs = await packManager.listPacks();

        if (packs.length === 0) {
          output.info('No packs installed.');
          return;
        }

        s.start('Updating all packs...');
        let updated = 0;
        let failed = 0;

        for (const pack of packs) {
          try {
            await packManager.removePack(pack.name);
            const installer = packManager.getInstaller();
            await installer.install(pack.source);
            updated++;
          } catch (err) {
            failed++;
            console.error(`Failed to update ${pack.name}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        s.stop('Update complete');
        output.success(`Updated ${updated} pack(s)${failed > 0 ? `, ${failed} failed` : ''}`);
      } else {
        output.error('Please specify a pack name or use --all to update all packs');
        output.info('Usage: ck pack update <name> or ck pack update --all');
        process.exit(1);
      }
    } catch (err) {
      s.stop('Update failed');
      if (err instanceof PackManagerError) {
        output.error(err.message);
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
    name: 'pack',
    description: 'Manage packs',
  },
  subCommands: {
    add: addCommand,
    list: listCommand,
    info: infoCommand,
    remove: removeCommand,
    enable: enableCommand,
    disable: disableCommand,
    update: updateCommand,
  },
});
