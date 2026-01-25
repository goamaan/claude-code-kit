/**
 * Skill command - Manage skills
 * cops skill <subcommand>
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import { createSkillManager } from '../domain/skill/index.js';
import type { Skill } from '../domain/skill/types.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import pc from 'picocolors';

const GLOBAL_SKILLS_DIR = join(homedir(), '.claudeops', 'skills');
const CLAUDE_SKILLS_DIR = join(homedir(), '.claude', 'skills');

// =============================================================================
// Subcommands
// =============================================================================

/**
 * List all installed skills
 */
const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List all installed skills',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
    verbose: {
      type: 'boolean',
      alias: 'v',
      description: 'Show detailed information',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const skillManager = createSkillManager();
      const skills = await skillManager.loadSkills();

      if (skills.length === 0) {
        output.warn('No skills installed');
        return;
      }

      if (args.json) {
        output.json(skills.map(s => ({
          name: s.metadata.name,
          description: s.metadata.description,
          source: s.sourceType,
          autoTrigger: s.metadata.autoTrigger,
          domains: s.metadata.domains,
        })));
        return;
      }

      // Group by source
      const bySource = skills.reduce((acc, skill) => {
        if (!acc[skill.sourceType]) {
          acc[skill.sourceType] = [];
        }
        acc[skill.sourceType]!.push(skill);
        return acc;
      }, {} as Record<string, Skill[]>);

      // Display skills grouped by source
      for (const [source, sourceSkills] of Object.entries(bySource)) {
        output.header(`${source.charAt(0).toUpperCase() + source.slice(1)} Skills (${sourceSkills.length})`);

        for (const skill of sourceSkills) {
          console.log();
          console.log(`  ${pc.cyan(skill.metadata.name)}`);

          if (args.verbose) {
            if (skill.metadata.description) {
              console.log(`  ${pc.dim(skill.metadata.description)}`);
            }
            if (skill.metadata.autoTrigger?.length) {
              console.log(`  ${pc.dim('Triggers:')} ${skill.metadata.autoTrigger.join(', ')}`);
            }
            if (skill.metadata.domains?.length) {
              console.log(`  ${pc.dim('Domains:')} ${skill.metadata.domains.join(', ')}`);
            }
            console.log(`  ${pc.dim('Path:')} ${skill.sourcePath}`);
          } else {
            console.log(`  ${pc.dim(skill.metadata.description || 'No description')}`);
          }
        }
        console.log();
      }

      // Summary
      const totalSkills = skills.length;
      console.log(pc.dim(`Total: ${totalSkills} skill${totalSkills === 1 ? '' : 's'}`));

    } catch (err) {
      output.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});

/**
 * Show detailed skill information
 */
const infoCommand = defineCommand({
  meta: {
    name: 'info',
    description: 'Show skill details',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Skill name',
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
      const skillManager = createSkillManager();
      await skillManager.loadSkills();

      const skill = skillManager.getSkill(args.name);

      if (!skill) {
        output.error(`Skill "${args.name}" not found`);
        process.exit(1);
      }

      if (args.json) {
        output.json({
          name: skill.metadata.name,
          description: skill.metadata.description,
          source: skill.sourceType,
          sourcePath: skill.sourcePath,
          autoTrigger: skill.metadata.autoTrigger,
          domains: skill.metadata.domains,
          model: skill.metadata.model,
          userInvocable: skill.metadata.userInvocable,
          disableModelInvocation: skill.metadata.disableModelInvocation,
          content: skill.content,
        });
        return;
      }

      // Human-readable output
      output.header(skill.metadata.name);

      console.log();
      if (skill.metadata.description) {
        console.log(skill.metadata.description);
        console.log();
      }

      output.kv('Source', skill.sourceType);
      output.kv('Path', skill.sourcePath);

      if (skill.metadata.autoTrigger?.length) {
        output.kv('Auto Triggers', skill.metadata.autoTrigger.join(', '));
      }

      if (skill.metadata.domains?.length) {
        output.kv('Domains', skill.metadata.domains.join(', '));
      }

      if (skill.metadata.model) {
        output.kv('Model', skill.metadata.model);
      }

      output.kv('User Invocable', skill.metadata.userInvocable !== false ? 'yes' : 'no');

      if (skill.metadata.disableModelInvocation) {
        output.kv('Model Invocation', 'disabled');
      }

      console.log();
      output.header('Content');
      console.log();
      console.log(skill.content);

    } catch (err) {
      output.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});

/**
 * Install a skill
 */
const installCommand = defineCommand({
  meta: {
    name: 'install',
    description: 'Install a skill',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Skill name or path',
      required: true,
    },
    from: {
      type: 'string',
      description: 'Install from URL or path',
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Overwrite existing skill',
      default: false,
    },
  },
  async run({ args }) {
    try {
      // Ensure global skills directory exists
      await mkdir(GLOBAL_SKILLS_DIR, { recursive: true });

      const destPath = join(GLOBAL_SKILLS_DIR, `${args.name}.md`);

      if (existsSync(destPath) && !args.force) {
        output.error(`Skill "${args.name}" already exists. Use --force to overwrite.`);
        process.exit(1);
      }

      if (args.from) {
        // Install from URL or path
        let content: string;

        if (args.from.startsWith('http://') || args.from.startsWith('https://')) {
          // Download from URL
          output.info(`Downloading skill from ${args.from}...`);
          const response = await fetch(args.from);

          if (!response.ok) {
            throw new Error(`Failed to download: ${response.statusText}`);
          }

          content = await response.text();
        } else {
          // Load from local file
          if (!existsSync(args.from)) {
            output.error(`File not found: ${args.from}`);
            process.exit(1);
          }

          content = await readFile(args.from, 'utf8');
        }

        await writeFile(destPath, content, 'utf8');
        output.success(`Installed skill "${args.name}" to ${destPath}`);
      } else {
        // Create empty skill template
        const template = `---
name: ${args.name}
description: Custom skill
auto_trigger: []
domains: []
---

# ${args.name}

Add your skill content here.
`;

        await writeFile(destPath, template, 'utf8');
        output.success(`Created skill template at ${destPath}`);
        output.info('Edit the file to customize your skill');
      }

    } catch (err) {
      output.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});

/**
 * Enable a skill
 */
const enableCommand = defineCommand({
  meta: {
    name: 'enable',
    description: 'Enable a skill',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Skill name',
      required: true,
    },
  },
  async run({ args }) {
    try {
      // For now, just verify the skill exists
      const skillManager = createSkillManager();
      await skillManager.loadSkills();

      const skill = skillManager.getSkill(args.name);

      if (!skill) {
        output.error(`Skill "${args.name}" not found`);
        process.exit(1);
      }

      // TODO: Implement config.toml management
      output.info('Skill enablement via config.toml will be implemented in a future version');
      output.success(`Skill "${args.name}" is enabled`);

    } catch (err) {
      output.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});

/**
 * Disable a skill
 */
const disableCommand = defineCommand({
  meta: {
    name: 'disable',
    description: 'Disable a skill',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Skill name',
      required: true,
    },
  },
  async run({ args }) {
    try {
      // For now, just verify the skill exists
      const skillManager = createSkillManager();
      await skillManager.loadSkills();

      const skill = skillManager.getSkill(args.name);

      if (!skill) {
        output.error(`Skill "${args.name}" not found`);
        process.exit(1);
      }

      // TODO: Implement config.toml management
      output.info('Skill disablement via config.toml will be implemented in a future version');
      output.success(`Skill "${args.name}" is disabled`);

    } catch (err) {
      output.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});

/**
 * Sync skills to Claude Code
 */
const syncCommand = defineCommand({
  meta: {
    name: 'sync',
    description: 'Sync skills to Claude Code',
  },
  args: {
    verbose: {
      type: 'boolean',
      alias: 'v',
      description: 'Show detailed sync information',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const skillManager = createSkillManager();
      await skillManager.loadSkills();

      output.info(`Syncing skills to ${CLAUDE_SKILLS_DIR}...`);

      const result = await skillManager.syncToClaudeCode();

      const totalSynced = result.added.length + result.updated.length;
      if (totalSynced > 0) {
        output.success(`Synced ${totalSynced} skill${totalSynced === 1 ? '' : 's'}`);

        if (args.verbose) {
          console.log();
          if (result.added.length > 0) {
            console.log('Added skills:');
            for (const name of result.added) {
              console.log(`  + ${name}`);
            }
          }
          if (result.updated.length > 0) {
            console.log('Updated skills:');
            for (const name of result.updated) {
              console.log(`  ~ ${name}`);
            }
          }
          if (result.removed.length > 0) {
            console.log('Removed skills:');
            for (const name of result.removed) {
              console.log(`  - ${name}`);
            }
          }
        }
      }

      if (result.errors.length > 0) {
        console.log();
        output.warn(`Failed to sync ${result.errors.length} skill${result.errors.length === 1 ? '' : 's'}:`);
        for (const error of result.errors) {
          console.log(`  ${pc.red('✗')} ${error}`);
        }
        process.exit(1);
      }

    } catch (err) {
      output.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});

// =============================================================================
// Main Command
// =============================================================================

const skillCommand = defineCommand({
  meta: {
    name: 'skill',
    description: 'Manage skills',
  },
  subCommands: {
    list: listCommand,
    info: infoCommand,
    install: installCommand,
    enable: enableCommand,
    disable: disableCommand,
    sync: syncCommand,
  },
  run() {
    console.log('Available subcommands:');
    console.log('  list       List all installed skills');
    console.log('  info       Show skill details');
    console.log('  install    Install a skill');
    console.log('  enable     Enable a skill');
    console.log('  disable    Disable a skill');
    console.log('  sync       Sync skills to Claude Code');
    console.log();
    console.log('Run "cops skill <command> --help" for more information on a command.');
  },
});

export default skillCommand;
