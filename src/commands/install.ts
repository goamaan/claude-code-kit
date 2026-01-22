/**
 * Install command - Interactive installation wizard
 * ck install [--setup <name>] [--minimal]
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { createProfileManager } from '../domain/profile/manager.js';
import { createSetupManager } from '../domain/setup/manager.js';
import { getGlobalConfigDir, getClaudeDir } from '../utils/paths.js';
import { exists, ensureDir, writeFile } from '../utils/fs.js';
import { join } from 'node:path';
import { stringify } from '../core/config/parser.js';

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'install',
    description: 'Interactive installation wizard',
  },
  args: {
    setup: {
      type: 'string',
      alias: 's',
      description: 'Setup to use (skip setup selection)',
    },
    minimal: {
      type: 'boolean',
      alias: 'm',
      description: 'Minimal installation (no interactive prompts)',
      default: false,
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Overwrite existing configuration',
      default: false,
    },
  },
  async run({ args }) {
    prompts.intro('claude-kit Installation');

    const configDir = getGlobalConfigDir();
    const claudeDir = getClaudeDir();

    // Check for existing installation
    if (await exists(join(configDir, 'config.toml'))) {
      if (!args.force) {
        const proceed = await prompts.confirm({
          message: 'Configuration already exists. Overwrite?',
          initialValue: false,
        });
        prompts.handleCancel(proceed);
        if (!proceed) {
          prompts.outro('Installation cancelled');
          return;
        }
      }
    }

    // Minimal installation
    if (args.minimal) {
      const s = prompts.spinner();
      s.start('Setting up minimal configuration...');

      await ensureDir(configDir);

      const config = {
        model: {
          default: 'sonnet',
          routing: {
            simple: 'haiku',
            standard: 'sonnet',
            complex: 'opus',
          },
        },
        cost: {
          tracking: true,
        },
        sync: {
          auto: false,
          watch: false,
        },
      };

      await writeFile(join(configDir, 'config.toml'), stringify(config));

      // Create default profile
      const profileManager = createProfileManager();
      try {
        await profileManager.create('default', {
          description: 'Default profile',
          activate: true,
        });
      } catch {
        // Profile might already exist
      }

      s.stop('Configuration created');

      prompts.outro('Installation complete! Run `ck doctor` to verify.');
      return;
    }

    // Interactive installation

    // Step 1: Welcome and check prerequisites
    const s = prompts.spinner();
    s.start('Checking prerequisites...');

    const prereqs = {
      claudeDir: await exists(claudeDir),
      nodeVersion: parseInt(process.version.slice(1).split('.')[0] ?? '0') >= 20,
    };

    s.stop('Prerequisites checked');

    if (!prereqs.nodeVersion) {
      output.error('Node.js 20 or later is required');
      process.exit(1);
    }

    if (!prereqs.claudeDir) {
      output.warn('~/.claude directory not found');
      output.info('Claude Code should be run at least once before using claude-kit');

      const proceed = await prompts.confirm({
        message: 'Continue anyway?',
        initialValue: false,
      });
      prompts.handleCancel(proceed);
      if (!proceed) {
        prompts.outro('Installation cancelled');
        return;
      }
    }

    // Step 2: Select setup
    let selectedSetup: string | undefined = args.setup;

    if (!selectedSetup) {
      const setupManager = createSetupManager();
      const setups = await setupManager.list();

      if (setups.length > 0) {
        const setupChoice = await prompts.promptSelect(
          'Select a setup to use as your base configuration:',
          [
            { value: 'none', label: 'No setup (start fresh)', hint: 'Create configuration from scratch' },
            ...setups.map(s => ({
              value: s.name,
              label: s.name,
              hint: s.description ?? `v${s.version}`,
            })),
          ]
        );
        prompts.handleCancel(setupChoice);

        if (setupChoice !== 'none') {
          selectedSetup = setupChoice as string;
        }
      }
    }

    // Step 3: Configure model preferences
    const defaultModel = await prompts.promptSelect(
      'Select your default model:',
      [
        { value: 'haiku', label: 'Haiku', hint: 'Fast, cost-effective - good for simple tasks' },
        { value: 'sonnet', label: 'Sonnet', hint: 'Balanced performance - recommended for most use' },
        { value: 'opus', label: 'Opus', hint: 'Most capable - best for complex tasks' },
      ]
    );
    prompts.handleCancel(defaultModel);

    // Step 4: Configure cost tracking
    const enableCostTracking = await prompts.confirm({
      message: 'Enable cost tracking?',
      initialValue: true,
    });
    prompts.handleCancel(enableCostTracking);

    let dailyBudget: number | undefined;
    if (enableCostTracking) {
      const setBudget = await prompts.confirm({
        message: 'Set a daily spending limit?',
        initialValue: false,
      });
      prompts.handleCancel(setBudget);

      if (setBudget) {
        const budgetStr = await prompts.text({
          message: 'Daily budget (USD):',
          placeholder: '10.00',
          validate: (val) => {
            if (!val) return 'Budget is required';
            const num = parseFloat(val);
            if (isNaN(num) || num <= 0) return 'Must be a positive number';
            return undefined;
          },
        });
        prompts.handleCancel(budgetStr);
        dailyBudget = parseFloat(budgetStr as string);
      }
    }

    // Step 5: Create profile
    const profileName = await prompts.text({
      message: 'Name for your first profile:',
      placeholder: 'default',
      initialValue: 'default',
      validate: (val) => {
        if (!val) return 'Profile name is required';
        if (!/^[a-z][a-z0-9-]*$/.test(val)) {
          return 'Profile name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens';
        }
        return undefined;
      },
    });
    prompts.handleCancel(profileName);

    const profileDescription = await prompts.text({
      message: 'Profile description (optional):',
      placeholder: 'My default profile',
    });
    prompts.handleCancel(profileDescription);

    // Step 6: Confirm and execute
    console.log();
    output.header('Installation Summary');

    output.kv('Config directory', configDir);
    output.kv('Default model', defaultModel as string);
    output.kv('Cost tracking', enableCostTracking ? 'enabled' : 'disabled');
    if (dailyBudget) {
      output.kv('Daily budget', output.formatCurrency(dailyBudget));
    }
    output.kv('Profile', profileName as string);
    if (selectedSetup) {
      output.kv('Setup', selectedSetup);
    }

    console.log();

    const confirm = await prompts.confirm({
      message: 'Proceed with installation?',
      initialValue: true,
    });
    prompts.handleCancel(confirm);

    if (!confirm) {
      prompts.outro('Installation cancelled');
      return;
    }

    // Execute installation
    const installSpinner = prompts.spinner();
    installSpinner.start('Installing...');

    try {
      // Create directories
      await ensureDir(configDir);
      await ensureDir(join(configDir, 'profiles'));
      await ensureDir(join(configDir, 'addons'));
      await ensureDir(join(configDir, 'setups'));
      await ensureDir(join(configDir, 'backups'));

      // Write main config
      const config = {
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
        sync: {
          auto: false,
          watch: false,
        },
      };

      await writeFile(join(configDir, 'config.toml'), stringify(config));

      // Create profile
      const profileManager = createProfileManager();
      await profileManager.create(profileName as string, {
        description: profileDescription as string || undefined,
        activate: true,
      });

      // Apply setup if selected
      if (selectedSetup) {
        const setupManager = createSetupManager();
        const merged = await setupManager.apply(selectedSetup);

        // Write CLAUDE.md to Claude directory
        if (merged.content) {
          await ensureDir(claudeDir);
          await writeFile(join(claudeDir, 'CLAUDE.md'), merged.content);
        }
      }

      installSpinner.stop('Installation complete');

      // Next steps
      console.log();
      output.header('Next Steps');

      output.list([
        'Run `ck doctor` to verify your installation',
        'Run `ck config show` to view your configuration',
        'Run `ck profile list` to see your profiles',
        selectedSetup ? '' : 'Run `ck setup list` to see available setups',
        'Run `ck addon search` to find addons',
      ].filter(Boolean));

      prompts.outro('Welcome to claude-kit!');
    } catch (err) {
      installSpinner.stop('Installation failed');
      output.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});
