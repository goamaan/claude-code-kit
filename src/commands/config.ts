/**
 * Config management commands
 * cops config init|edit|show|validate|export
 */

import { defineCommand } from 'citty';
import { spawn } from 'node:child_process';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import {
  loadConfig,
  getConfigPaths,
  getConfigLayers,
  getActiveProfileName,
  loadGlobalConfig,
  saveGlobalConfig,
  loadProjectConfig,
  saveProjectConfig,
} from '../core/config/loader.js';
import {
  resolvePackageManager,
  detectFromLockfile,
  getSupportedPackageManagers,
  isValidPackageManager,
} from '../utils/package-manager.js';
import { stringify } from '../core/config/parser.js';
import { getGlobalConfigDir, getProjectConfigDir } from '../utils/paths.js';
import { exists, writeFile, ensureDir } from '../utils/fs.js';
import { join } from 'node:path';

// =============================================================================
// Init Command (Interactive Setup Wizard)
// =============================================================================

const initCommand = defineCommand({
  meta: {
    name: 'init',
    description: 'Initialize configuration (interactive wizard)',
  },
  args: {
    global: {
      type: 'boolean',
      alias: 'g',
      description: 'Initialize global config',
      default: false,
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Overwrite existing config',
      default: false,
    },
  },
  async run({ args }) {
    prompts.intro('claudeops configuration wizard');

    const isGlobal = args.global;
    const configDir = isGlobal ? getGlobalConfigDir() : getProjectConfigDir();
    const configPath = join(configDir, 'config.toml');

    // Check if config exists
    if (await exists(configPath) && !args.force) {
      const overwrite = await prompts.promptConfirm(
        'Configuration already exists. Overwrite?'
      );
      prompts.handleCancel(overwrite);
      if (!overwrite) {
        prompts.outro('Configuration unchanged');
        return;
      }
    }

    // Interactive prompts
    const defaultModel = await prompts.promptSelect(
      'Default model for AI tasks:',
      [
        { value: 'haiku', label: 'Haiku', hint: 'Fast, cost-effective' },
        { value: 'sonnet', label: 'Sonnet', hint: 'Balanced performance' },
        { value: 'opus', label: 'Opus', hint: 'Most capable' },
      ]
    );
    prompts.handleCancel(defaultModel);

    const enableCostTracking = await prompts.confirm({
      message: 'Enable cost tracking?',
      initialValue: true,
    });
    prompts.handleCancel(enableCostTracking);

    let dailyBudget: number | undefined;
    if (enableCostTracking) {
      const budgetStr = await prompts.text({
        message: 'Daily budget limit in USD (leave empty for no limit):',
        placeholder: '10.00',
        validate: (val) => {
          if (!val) return undefined;
          const num = parseFloat(val);
          if (isNaN(num) || num <= 0) return 'Must be a positive number';
          return undefined;
        },
      });
      prompts.handleCancel(budgetStr);
      if (budgetStr) {
        dailyBudget = parseFloat(budgetStr as string);
      }
    }

    // Build config
    const config: Record<string, unknown> = {
      model: {
        default: defaultModel,
        routing: {
          simple: 'haiku',
          standard: 'sonnet',
          complex: 'opus',
        },
      },
      cost: {
        tracking: enableCostTracking,
        ...(dailyBudget ? { budget_daily: dailyBudget } : {}),
      },
    };

    // Write config
    await ensureDir(configDir);
    const content = stringify(config);
    await writeFile(configPath, content);

    prompts.outro(`Configuration saved to ${configPath}`);
  },
});

// =============================================================================
// Edit Command
// =============================================================================

const editCommand = defineCommand({
  meta: {
    name: 'edit',
    description: 'Open configuration in $EDITOR',
  },
  args: {
    global: {
      type: 'boolean',
      alias: 'g',
      description: 'Edit global config',
      default: false,
    },
    profile: {
      type: 'string',
      alias: 'p',
      description: 'Edit specific profile config',
    },
    local: {
      type: 'boolean',
      alias: 'l',
      description: 'Edit local (gitignored) config',
      default: false,
    },
  },
  async run({ args }) {
    const editor = process.env['EDITOR'] || process.env['VISUAL'] || 'vi';

    let configPath: string;

    if (args.profile) {
      const paths = getConfigPaths(args.profile);
      configPath = paths.profile;
    } else if (args.global) {
      const paths = getConfigPaths();
      configPath = paths.global;
    } else if (args.local) {
      const paths = getConfigPaths();
      configPath = paths.local;
    } else {
      const paths = getConfigPaths();
      configPath = paths.project;
    }

    // Ensure directory exists
    const configDir = join(configPath, '..');
    await ensureDir(configDir);

    // Create file if it doesn't exist
    if (!(await exists(configPath))) {
      await writeFile(configPath, '# claudeops configuration\n\n');
    }

    output.info(`Opening ${configPath} in ${editor}...`);

    // Spawn editor
    const child = spawn(editor, [configPath], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        output.success('Configuration saved');
      } else {
        output.warn('Editor exited with non-zero status');
      }
    });
  },
});

// =============================================================================
// Show Command
// =============================================================================

const showCommand = defineCommand({
  meta: {
    name: 'show',
    description: 'Display merged configuration',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
    toml: {
      type: 'boolean',
      description: 'Output as TOML',
      default: false,
    },
    layers: {
      type: 'boolean',
      alias: 'l',
      description: 'Show individual config layers',
      default: false,
    },
  },
  async run({ args }) {
    if (args.layers) {
      const layers = await getConfigLayers();

      if (args.json) {
        output.json(layers);
        return;
      }

      for (const layer of layers) {
        output.header(`Layer: ${layer.layer}${layer.path ? ` (${layer.path})` : ''}`);
        console.log(stringify(layer.config));
      }
      return;
    }

    const config = await loadConfig();

    if (args.json) {
      output.json(config);
      return;
    }

    if (args.toml) {
      console.log(stringify(config));
      return;
    }

    // Pretty print
    output.header('Configuration');

    output.kv('Profile', `${config.profile.name} (source: ${config.profile.source})`);
    if (config.profile.description) {
      output.kv('Description', config.profile.description);
    }

    console.log();
    output.header('Model');
    output.kv('Default', config.model.default);
    output.kv('Simple tasks', config.model.routing.simple);
    output.kv('Standard tasks', config.model.routing.standard);
    output.kv('Complex tasks', config.model.routing.complex);

    if (Object.keys(config.model.overrides).length > 0) {
      console.log();
      output.label('Overrides:', '');
      for (const [key, value] of Object.entries(config.model.overrides)) {
        output.kv(`  ${key}`, value, 2);
      }
    }

    console.log();
    output.header('Cost');
    output.kv('Tracking', config.cost.tracking ? 'enabled' : 'disabled');
    if (config.cost.budget_daily) {
      output.kv('Daily budget', output.formatCurrency(config.cost.budget_daily));
    }
    if (config.cost.budget_weekly) {
      output.kv('Weekly budget', output.formatCurrency(config.cost.budget_weekly));
    }
    if (config.cost.budget_monthly) {
      output.kv('Monthly budget', output.formatCurrency(config.cost.budget_monthly));
    }

    console.log();
    output.header('Sync');
    output.kv('Auto sync', config.sync.auto ? 'enabled' : 'disabled');
    output.kv('Watch mode', config.sync.watch ? 'enabled' : 'disabled');

    if (config.skills.enabled.length > 0 || config.skills.disabled.length > 0) {
      console.log();
      output.header('Skills');
      if (config.skills.enabled.length > 0) {
        output.kv('Enabled', config.skills.enabled.join(', '));
      }
      if (config.skills.disabled.length > 0) {
        output.kv('Disabled', config.skills.disabled.join(', '));
      }
    }

    const agentNames = Object.keys(config.agents);
    if (agentNames.length > 0) {
      console.log();
      output.header('Agents');
      output.table(
        agentNames.map(name => ({
          name,
          model: config.agents[name]?.model ?? '-',
          priority: config.agents[name]?.priority ?? 50,
        })),
        [
          { key: 'name', header: 'Name', width: 25 },
          { key: 'model', header: 'Model', width: 10 },
          { key: 'priority', header: 'Priority', width: 10, align: 'right' },
        ]
      );
    }

    if (config.mcp.enabled.length > 0 || config.mcp.disabled.length > 0) {
      console.log();
      output.header('MCP Servers');
      if (config.mcp.enabled.length > 0) {
        output.kv('Enabled', config.mcp.enabled.join(', '));
      }
      if (config.mcp.disabled.length > 0) {
        output.kv('Disabled', config.mcp.disabled.join(', '));
      }
    }

    if (config.team) {
      console.log();
      output.header('Team');
      if (config.team.extends) {
        output.kv('Extends', config.team.extends);
      }
      output.kv('Enforce', config.team.enforce ? 'yes' : 'no');
    }
  },
});

// =============================================================================
// Validate Command
// =============================================================================

const validateCommand = defineCommand({
  meta: {
    name: 'validate',
    description: 'Validate configuration files',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const s = prompts.spinner();
    s.start('Validating configuration...');

    const results: Array<{ file: string; valid: boolean; errors: string[] }> = [];
    const paths = getConfigPaths();

    // Validate each layer
    for (const [_name, path] of Object.entries(paths)) {
      if (!(await exists(path))) {
        continue;
      }

      try {
        // Try to load and parse
        await loadConfig();
        results.push({ file: path, valid: true, errors: [] });
      } catch (err) {
        results.push({
          file: path,
          valid: false,
          errors: [err instanceof Error ? err.message : String(err)],
        });
      }
    }

    s.stop('Validation complete');

    if (args.json) {
      output.json(results);
      return;
    }

    const allValid = results.every(r => r.valid);

    for (const result of results) {
      if (result.valid) {
        output.check(result.file);
      } else {
        output.cross(result.file);
        for (const error of result.errors) {
          output.dim(`  ${error}`);
        }
      }
    }

    console.log();
    if (allValid) {
      output.success('All configuration files are valid');
    } else {
      output.error('Some configuration files have errors');
      process.exit(1);
    }
  },
});

// =============================================================================
// Export Command
// =============================================================================

const exportCommand = defineCommand({
  meta: {
    name: 'export',
    description: 'Export merged configuration',
  },
  args: {
    format: {
      type: 'string',
      alias: 'f',
      description: 'Output format (toml, json)',
      default: 'toml',
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'Output file path',
    },
  },
  async run({ args }) {
    const config = await loadConfig();

    let content: string;
    if (args.format === 'json') {
      content = JSON.stringify(config, null, 2);
    } else {
      content = stringify(config);
    }

    if (args.output) {
      await writeFile(args.output, content);
      output.success(`Configuration exported to: ${args.output}`);
    } else {
      console.log(content);
    }
  },
});

// =============================================================================
// Paths Command
// =============================================================================

const pathsCommand = defineCommand({
  meta: {
    name: 'paths',
    description: 'Show configuration file paths',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const activeProfile = await getActiveProfileName();
    const paths = getConfigPaths(activeProfile);

    if (args.json) {
      output.json(paths);
      return;
    }

    output.header('Configuration Paths');

    for (const [name, path] of Object.entries(paths)) {
      const fileExists = await exists(path);
      console.log(`${name.padEnd(10)} ${path}${fileExists ? '' : ' (not found)'}`);
    }

    console.log();
    output.kv('Active profile', activeProfile);
  },
});

// =============================================================================
// Package Manager Command
// =============================================================================

const pmCommand = defineCommand({
  meta: {
    name: 'pm',
    description: 'Manage package manager preference',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  subCommands: {
    show: defineCommand({
      meta: {
        name: 'show',
        description: 'Show current package manager preference',
      },
      args: {
        json: {
          type: 'boolean',
          description: 'Output as JSON',
          default: false,
        },
      },
      async run({ args }) {
        const config = await loadConfig();
        const detected = detectFromLockfile(process.cwd());
        const resolved = resolvePackageManager(config.packageManager, process.cwd());

        if (args['json']) {
          output.json({
            configured: config.packageManager ?? null,
            detected: detected ?? null,
            resolved,
          });
          return;
        }

        output.header('Package Manager');
        output.kv('Configured', config.packageManager ?? '(not set)');
        output.kv('Detected', detected ?? '(no lockfile)');
        output.kv('Resolved', resolved);
      },
    }),
    set: defineCommand({
      meta: {
        name: 'set',
        description: 'Set package manager preference (e.g., cops config pm set pnpm)',
      },
      args: {
        global: {
          type: 'boolean',
          alias: 'g',
          description: 'Set in global config',
          default: false,
        },
      },
      async run({ args }) {
        const pm = args._[0];

        if (!pm) {
          output.error('Please specify a package manager: npm, yarn, pnpm, or bun');
          output.dim('  Example: cops config pm set pnpm');
          process.exit(1);
        }

        if (!isValidPackageManager(pm)) {
          output.error(`Invalid package manager: ${pm}`);
          output.info('Supported: ' + getSupportedPackageManagers().join(', '));
          process.exit(1);
        }

        if (args['global']) {
          const globalConfig = await loadGlobalConfig();
          // Type assertion needed: loadGlobalConfig returns input type, saveGlobalConfig expects output type
          // The spread preserves all existing fields while updating packageManager
          await saveGlobalConfig({ ...globalConfig, packageManager: pm } as Parameters<typeof saveGlobalConfig>[0]);
          output.success(`Global package manager set to: ${pm}`);
        } else {
          const projectConfig = await loadProjectConfig();
          await saveProjectConfig({ ...projectConfig, packageManager: pm } as Parameters<typeof saveProjectConfig>[0]);
          output.success(`Project package manager set to: ${pm}`);
        }

        output.dim('Run `cops sync` to update CLAUDE.md');
      },
    }),
    detect: defineCommand({
      meta: {
        name: 'detect',
        description: 'Auto-detect package manager from lockfile',
      },
      async run() {
        const detected = detectFromLockfile(process.cwd());

        if (detected) {
          output.success(`Detected package manager: ${detected}`);
          output.dim('Use `cops config pm set ' + detected + '` to save this preference');
        } else {
          output.warn('No lockfile found');
          output.info('Supported lockfiles:');
          output.dim('  - package-lock.json (npm)');
          output.dim('  - yarn.lock (yarn)');
          output.dim('  - pnpm-lock.yaml (pnpm)');
          output.dim('  - bun.lockb (bun)');
        }
      },
    }),
  },
  async run({ args }) {
    // Default to show command
    const config = await loadConfig();
    const detected = detectFromLockfile(process.cwd());
    const resolved = resolvePackageManager(config.packageManager, process.cwd());

    if (args.json) {
      output.json({
        configured: config.packageManager ?? null,
        detected: detected ?? null,
        resolved,
      });
      return;
    }

    output.header('Package Manager');
    output.kv('Configured', config.packageManager ?? '(not set)');
    output.kv('Detected', detected ?? '(no lockfile)');
    output.kv('Resolved', resolved);

    console.log();
    output.info('Commands:');
    output.dim('  cops config pm set <npm|yarn|pnpm|bun>  Set preference');
    output.dim('  cops config pm set <pm> -g              Set global preference');
    output.dim('  cops config pm detect                   Auto-detect from lockfile');
  },
});

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'config',
    description: 'Manage configuration',
  },
  subCommands: {
    init: initCommand,
    edit: editCommand,
    show: showCommand,
    validate: validateCommand,
    export: exportCommand,
    paths: pathsCommand,
    pm: pmCommand,
  },
});
