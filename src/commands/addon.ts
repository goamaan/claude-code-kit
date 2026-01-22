/**
 * Add-on management commands
 * ck addon list|search|info|install|update|remove|create
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import {
  createAddonManager,
  AddonManagerError,
  type AddonInstallSource,
} from '../domain/addon/manager.js';

const addonManager = createAddonManager();

// =============================================================================
// List Installed Addons
// =============================================================================

const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List installed addons',
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
      description: 'Include disabled addons',
      default: true,
    },
  },
  async run({ args }) {
    const addons = await addonManager.list();

    if (args.json) {
      output.json(addons);
      return;
    }

    if (addons.length === 0) {
      output.info('No addons installed.');
      output.info('Search for addons with: ck addon search <query>');
      output.info('Install an addon with: ck addon install <name>');
      return;
    }

    output.header('Installed Addons');

    const filtered = args.all ? addons : addons.filter(a => a.enabled);

    output.table(
      filtered.map(a => ({
        name: a.manifest.name,
        version: a.manifest.version,
        description: output.truncate(a.manifest.description ?? '-', 35),
        enabled: a.enabled ? 'yes' : 'no',
        source: a.source.type,
        updated: output.formatRelativeTime(a.updatedAt),
      })),
      [
        { key: 'name', header: 'Name', width: 20 },
        { key: 'version', header: 'Version', width: 10 },
        { key: 'description', header: 'Description', width: 35 },
        { key: 'enabled', header: 'Enabled', width: 8 },
        { key: 'source', header: 'Source', width: 10 },
        { key: 'updated', header: 'Updated', width: 12 },
      ]
    );
  },
});

// =============================================================================
// Search Registry
// =============================================================================

const searchCommand = defineCommand({
  meta: {
    name: 'search',
    description: 'Search addon registry',
  },
  args: {
    query: {
      type: 'positional',
      description: 'Search query',
      default: '',
    },
    limit: {
      type: 'string',
      alias: 'l',
      description: 'Maximum results',
      default: '20',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const s = prompts.spinner();
    s.start('Searching registry...');

    try {
      const registry = addonManager.getRegistry();
      const results = await registry.search(args.query, parseInt(args.limit));

      s.stop(`Found ${results.total} addon(s)`);

      if (args.json) {
        output.json(results);
        return;
      }

      if (results.results.length === 0) {
        output.info('No addons found matching your query.');
        return;
      }

      output.table(
        results.results.map(r => ({
          name: r.name,
          version: r.version,
          description: output.truncate(r.description ?? '-', 40),
          downloads: r.downloads,
        })),
        [
          { key: 'name', header: 'Name', width: 25 },
          { key: 'version', header: 'Version', width: 10 },
          { key: 'description', header: 'Description', width: 40 },
          { key: 'downloads', header: 'Downloads', width: 10, align: 'right' },
        ]
      );

      if (results.total > results.results.length) {
        console.log();
        output.dim(`Showing ${results.results.length} of ${results.total} results`);
      }
    } catch (err) {
      s.stop('Search failed');
      throw err;
    }
  },
});

// =============================================================================
// Show Addon Info
// =============================================================================

const infoCommand = defineCommand({
  meta: {
    name: 'info',
    description: 'Show addon details',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Addon name',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    // Check if installed first
    const installed = await addonManager.get(args.name);

    if (installed) {
      if (args.json) {
        output.json(installed);
        return;
      }

      output.header(`Addon: ${installed.manifest.name}`);
      output.kv('Version', installed.manifest.version);
      if (installed.manifest.description) {
        output.kv('Description', installed.manifest.description);
      }
      if (installed.manifest.author) {
        output.kv('Author', installed.manifest.author);
      }
      if (installed.manifest.license) {
        output.kv('License', installed.manifest.license);
      }
      output.kv('Enabled', installed.enabled ? 'yes' : 'no');
      output.kv('Path', installed.path);
      output.kv('Source', `${installed.source.type}${installed.source.url ? ` (${installed.source.url})` : ''}`);
      output.kv('Installed', installed.installedAt.toLocaleString());
      output.kv('Updated', installed.updatedAt.toLocaleString());

      // Show hooks
      if (installed.manifest.hooks) {
        console.log();
        output.header('Hooks');
        for (const [event, handlers] of Object.entries(installed.manifest.hooks)) {
          if (handlers && Array.isArray(handlers) && handlers.length > 0) {
            output.kv(event, `${handlers.length} handler(s)`);
          }
        }
      }

      // Show config options
      if (installed.manifest.config && Object.keys(installed.manifest.config).length > 0) {
        console.log();
        output.header('Configuration Options');
        for (const [key, option] of Object.entries(installed.manifest.config)) {
          const desc = option.description ?? '';
          const defaultVal = option.default !== undefined ? ` (default: ${option.default})` : '';
          output.kv(key, `${desc}${defaultVal}`);
        }
      }

      return;
    }

    // Not installed, check registry
    const registry = addonManager.getRegistry();
    const entry = await registry.get(args.name);

    if (!entry) {
      output.error(`Addon not found: ${args.name}`);
      process.exit(1);
    }

    if (args.json) {
      output.json(entry);
      return;
    }

    output.header(`Addon: ${entry.name} (not installed)`);
    output.kv('Version', entry.version);
    if (entry.description) {
      output.kv('Description', entry.description);
    }
    if (entry.author) {
      output.kv('Author', entry.author);
    }
    if (entry.license) {
      output.kv('License', entry.license);
    }
    if (entry.repository) {
      output.kv('Repository', entry.repository);
    }
    output.kv('Downloads', entry.downloads.toString());

    if (entry.keywords.length > 0) {
      output.kv('Keywords', entry.keywords.join(', '));
    }

    console.log();
    output.info(`Install with: ck addon install ${args.name}`);
  },
});

// =============================================================================
// Install Addon
// =============================================================================

const installCommand = defineCommand({
  meta: {
    name: 'install',
    description: 'Install an addon',
  },
  args: {
    source: {
      type: 'positional',
      description: 'Addon name, GitHub repo (user/repo), or local path',
      required: true,
    },
    version: {
      type: 'string',
      alias: 'v',
      description: 'Specific version to install',
    },
  },
  async run({ args }) {
    const s = prompts.spinner();
    s.start('Installing addon...');

    try {
      // Determine source type
      let installSource: AddonInstallSource;

      if (args.source.startsWith('./') || args.source.startsWith('/') || args.source.startsWith('~')) {
        // Local path
        installSource = { type: 'path', path: args.source };
      } else if (args.source.includes('/') && !args.source.includes(':')) {
        // GitHub repo (user/repo format)
        installSource = { type: 'github', repo: args.source };
      } else {
        // Registry name
        installSource = { type: 'registry', name: args.source, version: args.version };
      }

      await addonManager.install(installSource);

      s.stop('Addon installed');
      output.success(`Installed addon: ${args.source}`);
    } catch (err) {
      s.stop('Installation failed');
      if (err instanceof AddonManagerError) {
        output.error(err.message);
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Update Addon(s)
// =============================================================================

const updateCommand = defineCommand({
  meta: {
    name: 'update',
    description: 'Update addon(s)',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Addon name (or omit to update all)',
    },
  },
  async run({ args }) {
    const s = prompts.spinner();

    try {
      if (args.name) {
        s.start(`Updating ${args.name}...`);
        await addonManager.update(args.name);
        s.stop('Addon updated');
        output.success(`Updated addon: ${args.name}`);
      } else {
        s.start('Updating all addons...');
        await addonManager.updateAll();
        s.stop('All addons updated');
        output.success('All addons updated successfully');
      }
    } catch (err) {
      s.stop('Update failed');
      if (err instanceof AddonManagerError) {
        output.error(err.message);
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Remove Addon
// =============================================================================

const removeCommand = defineCommand({
  meta: {
    name: 'remove',
    description: 'Remove an installed addon',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Addon name to remove',
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
        `Remove addon "${args.name}"?`
      );
      prompts.handleCancel(confirmed);
      if (!confirmed) {
        output.info('Removal cancelled');
        return;
      }
    }

    const s = prompts.spinner();
    s.start('Removing addon...');

    try {
      await addonManager.remove(args.name);
      s.stop('Addon removed');
      output.success(`Removed addon: ${args.name}`);
    } catch (err) {
      s.stop('Removal failed');
      if (err instanceof AddonManagerError) {
        output.error(err.message);
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Create Addon
// =============================================================================

const createCommand = defineCommand({
  meta: {
    name: 'create',
    description: 'Scaffold a new addon',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Addon name',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const addonDir = await addonManager.create(args.name);
      output.success(`Created addon scaffold: ${args.name}`);
      output.info(`Edit your addon in: ${addonDir}/`);
      console.log();
      output.header('Files created:');
      output.list([
        'addon.toml - Addon manifest',
        'hook.ts - Hook handler',
        'README.md - Documentation',
      ]);
      console.log();
      output.info(`Install locally with: ck addon install ./${args.name}`);
    } catch (err) {
      if (err instanceof AddonManagerError) {
        output.error(err.message);
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Enable Addon
// =============================================================================

const enableCommand = defineCommand({
  meta: {
    name: 'enable',
    description: 'Enable an installed addon',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Addon name to enable',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await addonManager.enable(args.name);
      output.success(`Enabled addon: ${args.name}`);
    } catch (err) {
      if (err instanceof AddonManagerError) {
        output.error(err.message);
        process.exit(1);
      }
      throw err;
    }
  },
});

// =============================================================================
// Disable Addon
// =============================================================================

const disableCommand = defineCommand({
  meta: {
    name: 'disable',
    description: 'Disable an installed addon',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Addon name to disable',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await addonManager.disable(args.name);
      output.success(`Disabled addon: ${args.name}`);
    } catch (err) {
      if (err instanceof AddonManagerError) {
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
    name: 'addon',
    description: 'Manage addons',
  },
  subCommands: {
    list: listCommand,
    search: searchCommand,
    info: infoCommand,
    install: installCommand,
    update: updateCommand,
    remove: removeCommand,
    create: createCommand,
    enable: enableCommand,
    disable: disableCommand,
  },
});
