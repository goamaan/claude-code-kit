/**
 * Init command - Global + project initialization
 * cops init [--global] [--project] [--minimal] [--force] [--swarm-name <name>] [--path <dir>]
 */

import { defineCommand } from 'citty';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { getGlobalConfigDir, getClaudeDir } from '../utils/paths.js';
import { exists, ensureDir, writeFile, readFile, readJsonSafe, writeJson } from '../utils/fs.js';
import { stringify } from '../core/config/parser.js';
import { createSkillManager } from '../domain/skill/index.js';
import { scan } from '../core/scanner/index.js';
import {
  generateProjectClaudeMd,
  generateProjectSettings,
  spliceManagedSection,
  MANAGED_START,
} from '../core/scanner/generator.js';

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
  permissions?: {
    allow?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Configure persistence for swarm tasks
 */
async function configurePersistence(swarmName: string): Promise<{ configured: boolean; error?: string }> {
  try {
    // Use project-local .claude directory instead of global
    const projectClaudeDir = join(process.cwd(), '.claude');
    const settingsPath = join(projectClaudeDir, 'settings.json');

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

    // Write settings back to project-local .claude directory
    await ensureDir(projectClaudeDir);
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

/**
 * Run project initialization: scan + generate .claude/ artifacts
 */
async function initProject(
  targetPath: string,
  opts: { force: boolean; spinner: ReturnType<typeof prompts.spinner> },
): Promise<{ claudeMd: boolean; settings: boolean }> {
  const { force, spinner: s } = opts;
  const projectClaudeDir = join(targetPath, '.claude');
  const claudeMdPath = join(projectClaudeDir, 'CLAUDE.md');
  const settingsPath = join(projectClaudeDir, 'settings.json');
  const result = { claudeMd: false, settings: false };

  // Scan the project
  s.start('Scanning codebase...');
  const scanResult = await scan({ path: targetPath });
  s.stop('Scan complete');

  // Generate CLAUDE.md
  s.start('Generating .claude/CLAUDE.md...');
  const generatedMd = generateProjectClaudeMd(scanResult);

  await ensureDir(projectClaudeDir);

  if (await exists(claudeMdPath)) {
    const existing = await readFile(claudeMdPath);
    if (existing.includes(MANAGED_START)) {
      // Has managed markers — splice in the new content
      const spliced = spliceManagedSection(existing, generatedMd);
      if (spliced) {
        await writeFile(claudeMdPath, spliced);
        s.stop('.claude/CLAUDE.md updated (managed section replaced)');
        result.claudeMd = true;
      } else {
        s.stop('.claude/CLAUDE.md unchanged (splice failed)');
      }
    } else if (force) {
      // No markers but --force: prepend generated content, keep existing
      await writeFile(claudeMdPath, generatedMd + '\n' + existing);
      s.stop('.claude/CLAUDE.md updated (prepended managed section)');
      result.claudeMd = true;
    } else {
      s.stop('.claude/CLAUDE.md exists (no managed markers, use --force to prepend)');
    }
  } else {
    await writeFile(claudeMdPath, generatedMd);
    s.stop('.claude/CLAUDE.md created');
    result.claudeMd = true;
  }

  // Generate settings.json
  s.start('Generating .claude/settings.json...');
  const generatedSettings = generateProjectSettings(scanResult);

  if (generatedSettings) {
    if (await exists(settingsPath)) {
      // Merge into existing settings
      const existing = await readJsonSafe<ClaudeSettings>(settingsPath);
      if (existing) {
        const merged = mergeSettings(existing, generatedSettings as ClaudeSettings);
        await writeJson(settingsPath, merged);
        s.stop('.claude/settings.json updated (permissions merged)');
      } else {
        await writeJson(settingsPath, generatedSettings);
        s.stop('.claude/settings.json created');
      }
    } else {
      await writeJson(settingsPath, generatedSettings);
      s.stop('.claude/settings.json created');
    }
    result.settings = true;
  } else {
    s.stop('.claude/settings.json skipped (no permissions to add)');
  }

  // Create learnings directory structure
  const learningsDir = join(projectClaudeDir, 'learnings');
  await ensureDir(learningsDir);
  await ensureDir(join(learningsDir, 'build-errors'));
  await ensureDir(join(learningsDir, 'test-failures'));
  await ensureDir(join(learningsDir, 'type-errors'));
  await ensureDir(join(learningsDir, 'runtime-errors'));
  await ensureDir(join(learningsDir, 'config-issues'));
  await ensureDir(join(learningsDir, 'patterns'));

  // Generate learnings schema from scan results
  const schemaPath = join(learningsDir, 'schema.json');
  if (!(await exists(schemaPath)) || force) {
    const components = [
      ...scanResult.languages.map(l => l.name.toLowerCase()),
      ...scanResult.frameworks.map(f => f.name.toLowerCase()),
      ...(scanResult.testing || []).map(t => t.framework.toLowerCase()),
      ...(scanResult.linting || []).map(l => l.tool.toLowerCase()),
    ].filter((v, i, a) => a.indexOf(v) === i); // dedupe

    const schema = {
      version: 1,
      generatedFrom: 'scanner',
      categories: ['build-error', 'test-failure', 'type-error', 'runtime-error', 'config-issue', 'pattern', 'workaround', 'convention'],
      components,
      rootCauses: ['missing-dependency', 'type-mismatch', 'config-error', 'api-change', 'version-conflict'],
      resolutionTypes: ['code-fix', 'config-change', 'dependency-update', 'workaround', 'refactor', 'documentation'],
    };

    await writeJson(schemaPath, schema);
  }

  return result;
}

/**
 * Merge generated settings into existing settings without clobbering
 */
function mergeSettings(existing: ClaudeSettings, generated: ClaudeSettings): ClaudeSettings {
  const merged = { ...existing };

  // Merge permission allowlists
  if (generated.permissions?.allow) {
    merged.permissions = merged.permissions || {};
    const existingAllow = merged.permissions.allow || [];
    const newAllow = generated.permissions.allow.filter(
      (p: string) => !existingAllow.includes(p),
    );
    merged.permissions.allow = [...existingAllow, ...newAllow];
  }

  return merged;
}

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'init',
    description: 'Initialize claudeops + project .claude/ artifacts',
  },
  args: {
    global: {
      type: 'boolean',
      alias: 'g',
      description: 'Global setup only (skip project initialization)',
      default: false,
    },
    project: {
      type: 'boolean',
      alias: 'p',
      description: 'Project setup only (skip global initialization)',
      default: false,
    },
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
    path: {
      type: 'string',
      description: 'Target project directory (defaults to current directory)',
    },
  },
  async run({ args }) {
    const doGlobal = args.global || !args.project;
    const doProject = args.project || !args.global;
    const targetPath = resolve(args.path ?? process.cwd());

    prompts.intro('claudeops Init');

    const configDir = getGlobalConfigDir();
    const claudeDir = getClaudeDir();
    const s = prompts.spinner();

    // ========================================================================
    // Global Setup
    // ========================================================================
    if (doGlobal) {
      // Check for existing installation
      if (await exists(join(configDir, 'config.toml'))) {
        if (!args.force) {
          if (args.minimal) {
            output.info('Global configuration already exists (kept)');
          } else if (!args.project) {
            // Only prompt if not --project-only mode
            const proceed = await prompts.confirm({
              message: 'Global configuration already exists. Overwrite?',
              initialValue: false,
            });
            prompts.handleCancel(proceed);
            if (!proceed && !doProject) {
              prompts.outro('Init cancelled');
              return;
            }
          }
        }
      }

      // Step 1: Detect Claude Code
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

      // Step 2: Interactive swarm name (if not provided and not minimal)
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

      // Step 3: Create default config
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

      // Step 4: Sync orchestrate skill
      s.start('Syncing orchestrate skill...');

      const skillResult = await syncOrchestrateSkill();

      if (skillResult.error) {
        s.stop('Failed to sync skill');
        output.warn(skillResult.error);
        output.info('You can manually sync skills later with: cops sync');
      } else {
        s.stop('Orchestrate skill synced');
      }

      // Step 5: Configure persistence (if swarm name provided)
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

      // Step 6: Create additional directories
      s.start('Setting up directories...');

      await ensureDir(join(configDir, 'profiles'));
      await ensureDir(join(configDir, 'skills'));
      await ensureDir(join(configDir, 'hooks'));
      await ensureDir(join(configDir, 'backups'));
      await ensureDir(join(configDir, 'learnings'));

      s.stop('Directories ready');
    }

    // ========================================================================
    // Project Setup
    // ========================================================================
    let projectResult: { claudeMd: boolean; settings: boolean } | null = null;

    if (doProject) {
      console.log();
      output.header('Project Setup');
      output.kv('Path', targetPath);
      console.log();

      projectResult = await initProject(targetPath, { force: args.force, spinner: s });
    }

    // ========================================================================
    // Output Summary
    // ========================================================================
    console.log();
    output.header('Setup Complete');

    if (doGlobal) {
      console.log();
      output.dim('  Global:');
      output.kv('Config', join(configDir, 'config.toml'), 2);
      output.kv('Claude dir', claudeDir, 2);
    }

    if (projectResult) {
      console.log();
      output.dim('  Project:');
      output.kv('Path', targetPath, 2);
      output.kv(
        '.claude/CLAUDE.md',
        projectResult.claudeMd ? 'generated' : 'skipped',
        2,
      );
      output.kv(
        '.claude/settings.json',
        projectResult.settings ? 'generated' : 'skipped',
        2,
      );
    }

    console.log();
    output.header('Next Steps');

    const steps: string[] = [];
    steps.push('Start Claude Code: `claude`');
    if (projectResult?.claudeMd) {
      steps.push('Review `.claude/CLAUDE.md` and customize it');
    }
    steps.push('Use `/scan` in Claude Code for AI-enhanced analysis');
    steps.push('Run `cops doctor` to verify installation');

    output.list(steps);

    prompts.outro('Welcome to claudeops!');
  },
});
