/**
 * Team export/import commands
 * cops team export [--output file.toml]
 * cops team import <file.toml>
 *
 * Exports and imports complete team configurations including
 * profile, installed skills, enabled hooks, and conventions.
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { createProfileManager } from '../domain/profile/manager.js';
import { listInstalledSkills, installFromSource, parseSource } from '../domain/skill/index.js';
import { createHookManager } from '../domain/hook/index.js';
import { getClaudeDir } from '../utils/paths.js';
import { readFileSafe, writeFile, exists } from '../utils/fs.js';
import { syncAll } from './sync.js';
import { join, resolve } from 'node:path';
import type { ModelName } from '../types/index.js';

// =============================================================================
// Types
// =============================================================================

interface TeamExportConfig {
  version: 1;
  exportedAt: string;
  profile: {
    name: string;
    description?: string;
    model?: {
      default?: ModelName;
      routing?: {
        simple?: ModelName;
        standard?: ModelName;
        complex?: ModelName;
      };
    };
    skills?: {
      enabled?: string[];
      disabled?: string[];
    };
    hooks?: {
      enabled?: string[];
      disabled?: string[];
    };
  };
  skills: Array<{
    name: string;
    source: string;
    sourceType: string;
  }>;
  hooks: Array<{
    name: string;
    event: string;
    enabled: boolean;
    sourceType: string;
  }>;
  conventions?: Record<string, unknown>;
}

// =============================================================================
// Export Command
// =============================================================================

const exportCommand = defineCommand({
  meta: {
    name: 'export',
    description: 'Export complete team configuration',
  },
  args: {
    output: {
      type: 'string',
      alias: 'o',
      description: 'Output file path (defaults to stdout)',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON instead of TOML-like format',
      default: false,
    },
  },
  async run({ args }) {
    const s = prompts.spinner();
    s.start('Gathering team configuration...');

    const profileManager = createProfileManager();
    const hookManager = createHookManager({
      disabledHooks: [],
    });

    // Get active profile
    const activeProfileName = await profileManager.active();
    const profile = await profileManager.get(activeProfileName);

    // Get installed skills
    const installedSkills = listInstalledSkills();

    // Load hooks
    await hookManager.loadHooks();
    const hooks = hookManager.getHooks();

    // Load conventions if they exist
    const conventionsPath = join(getClaudeDir(), 'conventions.json');
    let conventions: Record<string, unknown> | undefined;
    if (await exists(conventionsPath)) {
      const content = await readFileSafe(conventionsPath);
      if (content) {
        try {
          conventions = JSON.parse(content) as Record<string, unknown>;
        } catch {
          // Skip invalid conventions
        }
      }
    }

    // Also check project-level conventions
    if (!conventions) {
      const projectConventionsPath = join(process.cwd(), '.claude', 'conventions.json');
      if (await exists(projectConventionsPath)) {
        const content = await readFileSafe(projectConventionsPath);
        if (content) {
          try {
            conventions = JSON.parse(content) as Record<string, unknown>;
          } catch {
            // Skip invalid conventions
          }
        }
      }
    }

    const teamConfig: TeamExportConfig = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: {
        name: profile.name,
        description: profile.description,
        model: {
          default: profile.resolved.model.default as ModelName,
          routing: {
            simple: profile.resolved.model.routing.simple as ModelName | undefined,
            standard: profile.resolved.model.routing.standard as ModelName | undefined,
            complex: profile.resolved.model.routing.complex as ModelName | undefined,
          },
        },
        skills: {
          enabled: profile.resolved.skills.enabled,
          disabled: profile.resolved.skills.disabled,
        },
        hooks: {
          enabled: profile.resolved.hooks.enabled,
          disabled: profile.resolved.hooks.disabled,
        },
      },
      skills: installedSkills.map(s => ({
        name: s.name,
        source: s.source,
        sourceType: s.sourceType,
      })),
      hooks: hooks.map(h => ({
        name: h.metadata.name,
        event: h.metadata.event,
        enabled: h.metadata.enabled,
        sourceType: h.sourceType,
      })),
      conventions,
    };

    s.stop('Configuration gathered');

    const content = JSON.stringify(teamConfig, null, 2);

    if (args.output) {
      const outputPath = resolve(args.output);
      await writeFile(outputPath, content);
      output.success(`Team configuration exported to: ${outputPath}`);
    } else {
      console.log(content);
    }

    // Print summary
    if (args.output) {
      console.log();
      output.kv('Profile', teamConfig.profile.name);
      output.kv('Skills', `${teamConfig.skills.length} installed`);
      output.kv('Hooks', `${teamConfig.hooks.length} configured`);
      output.kv('Conventions', conventions ? 'included' : 'none');
    }
  },
});

// =============================================================================
// Import Command
// =============================================================================

const importCommand = defineCommand({
  meta: {
    name: 'import',
    description: 'Import team configuration from file',
  },
  args: {
    source: {
      type: 'positional',
      description: 'Path to team config file',
      required: true,
    },
    skipSkills: {
      type: 'boolean',
      description: 'Skip installing skills',
      default: false,
    },
    skipSync: {
      type: 'boolean',
      description: 'Skip syncing after import',
      default: false,
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Skip confirmation prompts',
      default: false,
    },
  },
  async run({ args }) {
    const sourcePath = resolve(args.source);

    if (!(await exists(sourcePath))) {
      output.error(`File not found: ${sourcePath}`);
      process.exit(1);
    }

    // Read and parse config
    const content = await readFileSafe(sourcePath);
    if (!content) {
      output.error('Failed to read config file');
      process.exit(1);
    }

    let teamConfig: TeamExportConfig;
    try {
      teamConfig = JSON.parse(content) as TeamExportConfig;
    } catch {
      output.error('Invalid JSON in config file');
      process.exit(1);
    }

    if (teamConfig.version !== 1) {
      output.error(`Unsupported config version: ${teamConfig.version}`);
      process.exit(1);
    }

    // Show what will be imported
    output.header('Team Configuration Import');
    output.kv('Profile', teamConfig.profile.name);
    output.kv('Skills to install', `${teamConfig.skills.length}`);
    output.kv('Hooks', `${teamConfig.hooks.length}`);
    output.kv('Conventions', teamConfig.conventions ? 'yes' : 'no');
    output.kv('Exported at', teamConfig.exportedAt);
    console.log();

    if (!args.force) {
      const confirmed = await prompts.promptConfirm('Import this configuration?');
      prompts.handleCancel(confirmed);
      if (!confirmed) {
        output.info('Import cancelled');
        return;
      }
    }

    const s = prompts.spinner();

    // 1. Create/update profile
    s.start('Setting up profile...');
    const profileManager = createProfileManager();

    try {
      await profileManager.create(teamConfig.profile.name, {
        description: teamConfig.profile.description,
        skills: teamConfig.profile.skills,
        model: teamConfig.profile.model,
      });
    } catch {
      // Profile may already exist, try to use it
    }

    await profileManager.use(teamConfig.profile.name);
    s.stop(`Profile: ${teamConfig.profile.name}`);

    // 2. Install skills
    if (!args.skipSkills && teamConfig.skills.length > 0) {
      s.start('Installing skills...');
      let installed = 0;
      let failed = 0;

      for (const skill of teamConfig.skills) {
        try {
          const source = parseSource(skill.source);
          await installFromSource(source, { skillName: skill.name });
          installed++;
        } catch {
          failed++;
        }
      }

      s.stop(`Skills: ${installed} installed${failed > 0 ? `, ${failed} failed` : ''}`);
    }

    // 3. Write conventions if included
    if (teamConfig.conventions) {
      s.start('Writing conventions...');
      const conventionsPath = join(process.cwd(), '.claude', 'conventions.json');
      await writeFile(conventionsPath, JSON.stringify(teamConfig.conventions, null, 2));
      s.stop('Conventions written');
    }

    // 4. Sync
    if (!args.skipSync) {
      s.start('Syncing to Claude Code...');
      try {
        await syncAll({ verbose: false });
        s.stop('Sync complete');
      } catch (err) {
        s.stop('Sync failed');
        output.warn(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
        output.info('Run "cops sync" manually');
      }
    }

    console.log();
    output.success('Team configuration imported');
  },
});

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'team',
    description: 'Export and import team configurations',
  },
  subCommands: {
    export: exportCommand,
    import: importCommand,
  },
});
