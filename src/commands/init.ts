/**
 * Init command - Zero-config swarm setup
 * cops init [--minimal] [--swarm-name <name>] [--force]
 */

import { defineCommand } from 'citty';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import pc from 'picocolors';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { getGlobalConfigDir, getClaudeDir } from '../utils/paths.js';
import { exists, ensureDir, writeFile, readJsonSafe, writeJson } from '../utils/fs.js';
import { stringify } from '../core/config/parser.js';
import { createSkillManager } from '../domain/skill/index.js';

// =============================================================================
// Constants
// =============================================================================

const MIN_CLAUDE_VERSION = '2.1.16';

// =============================================================================
// Helper Functions
// =============================================================================

interface ClaudeCodeInfo {
  installed: boolean;
  version: string | null;
  versionWarning: boolean;
}

/**
 * Detect Claude Code installation and version
 */
async function detectClaudeCode(): Promise<ClaudeCodeInfo> {
  const claudeDir = getClaudeDir();
  const claudeDirExists = await exists(claudeDir);

  if (!claudeDirExists) {
    return {
      installed: false,
      version: null,
      versionWarning: false,
    };
  }

  // Try to get Claude Code version
  let version: string | null = null;
  try {
    // Try `claude --version` command
    const result = execSync('claude --version 2>/dev/null', { encoding: 'utf-8' });
    // Parse version from output (e.g., "claude 2.1.16")
    const match = result.match(/(\d+\.\d+\.\d+)/);
    if (match && match[1]) {
      version = match[1];
    }
  } catch {
    // Command not found or failed - that's OK, Claude Code might still work
  }

  // Check if version is below minimum
  let versionWarning = false;
  if (version) {
    const versionParts = version.split('.').map(Number);
    const minVersionParts = MIN_CLAUDE_VERSION.split('.').map(Number);
    const major = versionParts[0] ?? 0;
    const minor = versionParts[1] ?? 0;
    const patch = versionParts[2] ?? 0;
    const minMajor = minVersionParts[0] ?? 0;
    const minMinor = minVersionParts[1] ?? 0;
    const minPatch = minVersionParts[2] ?? 0;

    if (
      major < minMajor ||
      (major === minMajor && minor < minMinor) ||
      (major === minMajor && minor === minMinor && patch < minPatch)
    ) {
      versionWarning = true;
    }
  }

  return {
    installed: true,
    version,
    versionWarning,
  };
}

/**
 * Sync the orchestrate skill to Claude Code
 */
async function syncOrchestrateSkill(): Promise<{ synced: boolean; error?: string }> {
  try {
    const skillManager = createSkillManager();
    await skillManager.loadSkills();

    // Check if orchestrate skill exists
    const orchestrateSkill = skillManager.getSkill('orchestrate');
    if (!orchestrateSkill) {
      return { synced: false, error: 'Orchestrate skill not found in claudeops' };
    }

    // Sync all skills (including orchestrate) to Claude Code
    const result = await skillManager.syncToClaudeCode();

    if (result.errors.length > 0) {
      return { synced: false, error: result.errors.join(', ') };
    }

    return { synced: true };
  } catch (err) {
    return { synced: false, error: err instanceof Error ? err.message : String(err) };
  }
}

interface ClaudeSettings {
  env?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Configure persistence for swarm tasks
 */
async function configurePersistence(swarmName: string): Promise<{ configured: boolean; error?: string }> {
  try {
    const claudeDir = getClaudeDir();
    const settingsPath = join(claudeDir, 'settings.json');

    // Read existing settings or create empty object
    let settings: ClaudeSettings = {};
    if (await exists(settingsPath)) {
      const existing = await readJsonSafe<ClaudeSettings>(settingsPath);
      if (existing) {
        settings = existing;
      }
    }

    // Set CLAUDE_CODE_TASK_LIST_ID in env
    settings.env = settings.env || {};
    settings.env['CLAUDE_CODE_TASK_LIST_ID'] = swarmName;

    // Write settings back
    await ensureDir(claudeDir);
    await writeJson(settingsPath, settings);

    // Create swarm state directory
    const swarmsDir = join(getGlobalConfigDir(), 'swarms', swarmName);
    await ensureDir(swarmsDir);

    return { configured: true };
  } catch (err) {
    return { configured: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Create default claudeops config
 */
async function createDefaultConfig(): Promise<{ created: boolean; existed: boolean; error?: string }> {
  try {
    const configDir = getGlobalConfigDir();
    const configPath = join(configDir, 'config.toml');

    if (await exists(configPath)) {
      return { created: false, existed: true };
    }

    await ensureDir(configDir);

    const config = {
      model: {
        default: 'opus',
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

    await writeFile(configPath, stringify(config));

    return { created: true, existed: false };
  } catch (err) {
    return { created: false, existed: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'init',
    description: 'Initialize claudeops with zero-config swarm setup',
  },
  args: {
    minimal: {
      type: 'boolean',
      alias: 'm',
      description: 'Non-interactive setup with defaults',
      default: false,
    },
    swarmName: {
      type: 'string',
      alias: 's',
      description: 'Enable task persistence with named swarm',
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Overwrite existing configuration',
      default: false,
    },
  },
  async run({ args }) {
    prompts.intro('claudeops Init');

    const configDir = getGlobalConfigDir();
    const claudeDir = getClaudeDir();

    // Check for existing installation
    if (await exists(join(configDir, 'config.toml'))) {
      if (!args.force) {
        if (args.minimal) {
          output.warn('Configuration already exists. Use --force to overwrite.');
          prompts.outro('Init cancelled');
          return;
        }

        const proceed = await prompts.confirm({
          message: 'Configuration already exists. Overwrite?',
          initialValue: false,
        });
        prompts.handleCancel(proceed);
        if (!proceed) {
          prompts.outro('Init cancelled');
          return;
        }
      }
    }

    const s = prompts.spinner();

    // ==========================================================================
    // Step 1: Detect Claude Code
    // ==========================================================================
    s.start('Detecting Claude Code installation...');

    const claudeInfo = await detectClaudeCode();

    if (!claudeInfo.installed) {
      s.stop('Claude Code not detected');
      output.warn('~/.claude directory not found');
      output.info('Claude Code should be run at least once before using claudeops');

      if (!args.minimal) {
        const proceed = await prompts.confirm({
          message: 'Continue anyway?',
          initialValue: false,
        });
        prompts.handleCancel(proceed);
        if (!proceed) {
          prompts.outro('Init cancelled');
          return;
        }
      } else {
        output.info('Continuing with setup (Claude Code can be installed later)');
      }
    } else {
      if (claudeInfo.version) {
        if (claudeInfo.versionWarning) {
          s.stop(`Claude Code ${claudeInfo.version} detected`);
          output.warn(`Version ${claudeInfo.version} is below recommended ${MIN_CLAUDE_VERSION}`);
          output.info('Some features may not work correctly. Consider upgrading Claude Code.');
        } else {
          s.stop(`Claude Code ${claudeInfo.version} detected`);
        }
      } else {
        s.stop('Claude Code detected (version unknown)');
      }
    }

    // ==========================================================================
    // Step 2: Interactive swarm name (if not provided and not minimal)
    // ==========================================================================
    let swarmName = args.swarmName;

    if (!args.minimal && !swarmName) {
      const enablePersistence = await prompts.confirm({
        message: 'Enable task persistence for swarm coordination?',
        initialValue: true,
      });
      prompts.handleCancel(enablePersistence);

      if (enablePersistence) {
        const name = await prompts.text({
          message: 'Swarm name (used for task persistence):',
          placeholder: 'my-project',
          validate: (val) => {
            if (!val) return 'Swarm name is required';
            if (!/^[a-z][a-z0-9-]*$/.test(val)) {
              return 'Swarm name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens';
            }
            return undefined;
          },
        });
        prompts.handleCancel(name);
        swarmName = name as string;
      }
    }

    // ==========================================================================
    // Step 3: Create default config
    // ==========================================================================
    s.start('Creating configuration...');

    const configResult = await createDefaultConfig();

    if (configResult.error) {
      s.stop('Failed to create configuration');
      output.error(configResult.error);
      process.exit(1);
    }

    if (configResult.existed && !args.force) {
      s.stop('Configuration exists (kept)');
    } else if (configResult.created) {
      s.stop('Configuration created');
    } else {
      s.stop('Configuration ready');
    }

    // ==========================================================================
    // Step 4: Sync orchestrate skill
    // ==========================================================================
    s.start('Syncing orchestrate skill...');

    const skillResult = await syncOrchestrateSkill();

    if (skillResult.error) {
      s.stop('Failed to sync skill');
      output.warn(skillResult.error);
      output.info('You can manually sync skills later with: cops sync');
    } else {
      s.stop('Orchestrate skill synced');
    }

    // ==========================================================================
    // Step 5: Configure persistence (if swarm name provided)
    // ==========================================================================
    if (swarmName) {
      s.start('Configuring task persistence...');

      const persistResult = await configurePersistence(swarmName);

      if (persistResult.error) {
        s.stop('Failed to configure persistence');
        output.warn(persistResult.error);
      } else {
        s.stop(`Persistence configured for swarm: ${swarmName}`);
      }
    }

    // ==========================================================================
    // Step 6: Create additional directories
    // ==========================================================================
    s.start('Setting up directories...');

    await ensureDir(join(configDir, 'profiles'));
    await ensureDir(join(configDir, 'skills'));
    await ensureDir(join(configDir, 'hooks'));
    await ensureDir(join(configDir, 'backups'));

    s.stop('Directories ready');

    // ==========================================================================
    // Output Summary and Quickstart
    // ==========================================================================
    console.log();
    output.header('Setup Complete');

    output.kv('Config', join(configDir, 'config.toml'));
    output.kv('Claude dir', claudeDir);
    if (swarmName) {
      output.kv('Swarm', swarmName);
      output.kv('Task persistence', 'enabled');
    }

    console.log();
    output.header('Quickstart');

    output.box([
      `${pc.bold('1.')} Start Claude Code:`,
      '   $ claude',
      '',
      `${pc.bold('2.')} Try a swarm command:`,
      '   "ultrawork: build me a REST API with auth"',
      '',
      `${pc.bold('3.')} Or use specific agents:`,
      '   "use architect to analyze my codebase"',
    ], 'Getting Started');

    console.log();
    output.header('Next Steps');

    output.list([
      'Run `cops doctor` to verify installation',
      'Run `cops skill list` to see available skills',
      'Run `cops sync` to manually sync configuration',
      swarmName ? `Tasks will persist in ~/.claudeops/swarms/${swarmName}/` : '',
    ].filter(Boolean));

    prompts.outro('Welcome to claudeops!');
  },
});
