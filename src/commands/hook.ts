/**
 * Hook management commands
 * cops hook add|remove|list|enable|disable
 */

import { defineCommand } from 'citty';
import { readFile, rm, mkdir } from 'fs/promises';
import { join, resolve, basename } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { createHookManager } from '../domain/hook/hook-manager.js';
import { syncAll } from './sync.js';

// =============================================================================
// Constants
// =============================================================================

const GLOBAL_HOOKS_DIR = join(homedir(), '.claudeops', 'hooks');

// =============================================================================
// Hook Discovery Helpers
// =============================================================================

/**
 * Discover hook files (.mjs) in a directory
 */
async function discoverHooks(dir: string): Promise<{ name: string; path: string }[]> {
  const { readdir } = await import('fs/promises');
  const hooks: { name: string; path: string }[] = [];

  const searchDirs = [
    join(dir, 'hooks'),
    join(dir, '.claude', 'hooks'),
    dir,
  ];

  for (const searchDir of searchDirs) {
    if (!existsSync(searchDir)) continue;

    const entries = await readdir(searchDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.mjs') || entry.name.endsWith('.js'))) {
        hooks.push({
          name: basename(entry.name, entry.name.endsWith('.mjs') ? '.mjs' : '.js'),
          path: join(searchDir, entry.name),
        });
      }
    }
  }

  // Dedupe by name
  const seen = new Set<string>();
  return hooks.filter(h => {
    if (seen.has(h.name)) return false;
    seen.add(h.name);
    return true;
  });
}

// =============================================================================
// Add Hook
// =============================================================================

const addCommand = defineCommand({
  meta: {
    name: 'add',
    description: 'Install hook(s) from a git repo, URL, or local path',
  },
  args: {
    source: {
      type: 'positional',
      description: 'Source: owner/repo, URL, or local file/directory path',
      required: true,
    },
    all: {
      type: 'boolean',
      description: 'Install all hooks from source (when multiple found)',
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
      let hooksToInstall: { name: string; content: string }[] = [];

      // Determine source type
      const source = args.source;

      if (source.startsWith('.') || source.startsWith('/') || source.startsWith('~')) {
        // Local file or directory
        const localPath = source.startsWith('~') ? join(homedir(), source.slice(2)) : resolve(source);

        if (!existsSync(localPath)) {
          throw new Error(`Path not found: ${localPath}`);
        }

        const { stat } = await import('fs/promises');
        const pathStat = await stat(localPath);

        if (pathStat.isFile()) {
          const content = await readFile(localPath, 'utf8');
          const name = basename(localPath, localPath.endsWith('.mjs') ? '.mjs' : '.js');
          hooksToInstall.push({ name, content });
        } else {
          const discovered = await discoverHooks(localPath);
          for (const hook of discovered) {
            const content = await readFile(hook.path, 'utf8');
            hooksToInstall.push({ name: hook.name, content });
          }
        }
      } else {
        // Git repo (owner/repo or URL)
        s.start(`Cloning from ${source}...`);

        let url: string;
        if (source.startsWith('http://') || source.startsWith('https://')) {
          url = source;
        } else {
          // owner/repo shorthand
          const parts = source.split('/');
          if (parts.length === 2) {
            url = `https://github.com/${parts[0]}/${parts[1]}.git`;
          } else {
            throw new Error(`Invalid source format: ${source}`);
          }
        }

        const tempDir = join(tmpdir(), `claudeops-hook-${Date.now()}`);
        execSync(`git clone --depth 1 "${url}" "${tempDir}"`, {
          stdio: 'pipe',
          timeout: 30000,
        });

        try {
          const discovered = await discoverHooks(tempDir);
          for (const hook of discovered) {
            const content = await readFile(hook.path, 'utf8');
            hooksToInstall.push({ name: hook.name, content });
          }
        } finally {
          await rm(tempDir, { recursive: true, force: true });
        }
      }

      if (hooksToInstall.length === 0) {
        s.stop('No hooks found');
        output.error('No hook files (.mjs) found in source');
        process.exit(1);
      }

      if (!args.all && hooksToInstall.length > 1) {
        s.stop('Multiple hooks found');
        output.info('Multiple hooks found. Use --all to install all, or specify a single file:');
        for (const hook of hooksToInstall) {
          output.dim(`  - ${hook.name}`);
        }
        process.exit(1);
      }

      s.start('Installing hooks...');

      // Install hooks
      const hookManager = createHookManager();
      await mkdir(GLOBAL_HOOKS_DIR, { recursive: true });

      for (const hook of hooksToInstall) {
        await hookManager.installHook(hook.name, hook.content);
      }

      s.stop('Installation complete');

      for (const hook of hooksToInstall) {
        output.success(`Installed hook: ${hook.name}`);
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
// Remove Hook
// =============================================================================

const removeCommand = defineCommand({
  meta: {
    name: 'remove',
    description: 'Remove an installed hook',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Hook name to remove',
      required: true,
    },
    noSync: {
      type: 'boolean',
      description: 'Skip auto-sync after removal',
      default: false,
    },
  },
  async run({ args }) {
    const hookPath = join(GLOBAL_HOOKS_DIR, `${args.name}.mjs`);

    if (!existsSync(hookPath)) {
      output.error(`Hook not found: ${args.name}`);
      output.info(`No hook file at: ${hookPath}`);
      process.exit(1);
    }

    try {
      await rm(hookPath);
      output.success(`Removed hook: ${args.name}`);

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
// List Hooks
// =============================================================================

const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List all hooks with enabled/disabled status',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const hookManager = createHookManager();
    await hookManager.loadHooks();
    const allHooks = hookManager.getHooks();

    if (args.json) {
      output.json({
        hooks: allHooks.map(h => ({
          name: h.metadata.name,
          event: h.metadata.event,
          matcher: h.metadata.matcher,
          enabled: h.metadata.enabled,
          source: h.sourceType,
        })),
      });
      return;
    }

    if (allHooks.length === 0) {
      output.info('No hooks found. Install one with: cops hook add <source>');
      return;
    }

    output.header('Hooks');

    output.table(
      allHooks.map(h => ({
        name: h.metadata.name,
        event: h.metadata.event,
        matcher: h.metadata.matcher === '*' ? '(all)' : h.metadata.matcher,
        enabled: h.metadata.enabled ? 'yes' : 'no',
        source: h.sourceType,
      })),
      [
        { key: 'name', header: 'Name', width: 25 },
        { key: 'event', header: 'Event', width: 18 },
        { key: 'matcher', header: 'Matcher', width: 15 },
        { key: 'enabled', header: 'Enabled', width: 8 },
        { key: 'source', header: 'Source', width: 10 },
      ]
    );

    console.log();
    output.dim(`  ${allHooks.length} hooks total`);
  },
});

// =============================================================================
// Enable Hook
// =============================================================================

const enableCommand = defineCommand({
  meta: {
    name: 'enable',
    description: 'Enable a hook in active profile',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Hook name to enable',
      required: true,
    },
  },
  async run({ args }) {
    output.info(`To enable hook "${args.name}", edit your profile:`);
    output.dim('  cops profile show');
    output.dim(`  Remove "${args.name}" from disabled_hooks in your profile TOML`);
    output.dim('  cops sync');
  },
});

// =============================================================================
// Disable Hook
// =============================================================================

const disableCommand = defineCommand({
  meta: {
    name: 'disable',
    description: 'Disable a hook in active profile',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Hook name to disable',
      required: true,
    },
  },
  async run({ args }) {
    output.info(`To disable hook "${args.name}", edit your profile:`);
    output.dim('  cops profile show');
    output.dim(`  Add "${args.name}" to disabled_hooks in your profile TOML`);
    output.dim('  cops sync');
  },
});

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'hook',
    description: 'Manage hooks (install, remove, list)',
  },
  subCommands: {
    add: addCommand,
    remove: removeCommand,
    list: listCommand,
    enable: enableCommand,
    disable: disableCommand,
  },
});
