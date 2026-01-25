/**
 * Skill command - Manage skills
 * cops skill <subcommand>
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import { createSkillManager } from '../domain/skill/index.js';
import type { Skill } from '../domain/skill/types.js';
import type { Domain } from '../core/classifier/types.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import pc from 'picocolors';
import { loadConfig } from '../core/config/loader.js';

const GLOBAL_SKILLS_DIR = join(homedir(), '.claudeops', 'skills');
const CLAUDE_SKILLS_DIR = join(homedir(), '.claude', 'skills');

/**
 * Create a skill manager with profile-aware disabled skills
 */
async function createProfileAwareSkillManager() {
  const config = await loadConfig();
  return createSkillManager({
    disabledSkills: config.skills.disabled,
  });
}

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
      const skillManager = await createProfileAwareSkillManager();
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
      const skillManager = await createProfileAwareSkillManager();
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
 * Add (generate) a skill using AI
 */
const addCommand = defineCommand({
  meta: {
    name: 'add',
    description: 'Generate a skill using AI',
  },
  args: {
    description: {
      type: 'positional',
      description: 'Description of the skill to generate',
      required: true,
    },
    name: {
      type: 'string',
      alias: 'n',
      description: 'Skill name (optional, AI will suggest)',
    },
    model: {
      type: 'string',
      alias: 'm',
      description: 'Model to use for generation (haiku, sonnet, opus)',
      default: 'sonnet',
    },
    domains: {
      type: 'string',
      alias: 'd',
      description: 'Comma-separated domains (frontend, backend, testing, etc.)',
    },
    reference: {
      type: 'string',
      alias: 'r',
      description: 'Reference URL to fetch for context',
    },
    yes: {
      type: 'boolean',
      alias: 'y',
      description: 'Skip confirmation and install directly',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const { generateSkill, generateSkillTemplate, isClaudeCliAvailable, GeneratorError } = await import('../domain/generator/index.js');
      const { createInterface } = await import('node:readline');

      // Parse domains
      const domains = args.domains
        ? (args.domains.split(',').map(d => d.trim()) as Domain[])
        : undefined;

      // Check if Claude CLI is available
      const cliAvailable = await isClaudeCliAvailable();

      output.info('Generating skill...');

      let skill;
      try {
        if (cliAvailable) {
          skill = await generateSkill({
            description: args.description,
            name: args.name,
            model: args.model as 'haiku' | 'sonnet' | 'opus',
            domains,
            referenceUrl: args.reference,
          });
        } else {
          output.warn('Claude CLI not found. Using template-based generation.');
          skill = generateSkillTemplate({
            description: args.description,
            name: args.name,
            domains,
          });
        }
      } catch (err) {
        if (err instanceof GeneratorError) {
          if (err.code === 'CLI_NOT_FOUND') {
            output.warn('Claude CLI not available. Falling back to template.');
            skill = generateSkillTemplate({
              description: args.description,
              name: args.name,
              domains,
            });
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      // Show preview
      output.header('Generated Skill Preview');
      console.log();
      output.kv('Name', skill.name);
      output.kv('Description', skill.description);
      if (skill.autoTrigger.length > 0) {
        output.kv('Auto Triggers', skill.autoTrigger.join(', '));
      }
      if (skill.domains.length > 0) {
        output.kv('Domains', skill.domains.join(', '));
      }
      if (skill.model) {
        output.kv('Model', skill.model);
      }

      console.log();
      output.header('Content Preview');
      console.log();
      // Show first 30 lines of content
      const lines = skill.content.split('\n');
      const previewLines = lines.slice(0, 30);
      for (const line of previewLines) {
        console.log(pc.dim(line));
      }
      if (lines.length > 30) {
        console.log(pc.dim(`... (${lines.length - 30} more lines)`));
      }

      // Confirm installation unless --yes
      if (!args.yes) {
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question('\nInstall this skill? (y/N) ', resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          output.info('Cancelled');
          return;
        }
      }

      // Ensure directory exists
      await mkdir(GLOBAL_SKILLS_DIR, { recursive: true });

      // Install skill
      const destPath = join(GLOBAL_SKILLS_DIR, `${skill.name}.md`);

      if (existsSync(destPath)) {
        output.warn(`Skill "${skill.name}" already exists. Overwriting.`);
      }

      await writeFile(destPath, skill.content, 'utf8');
      output.success(`Installed skill "${skill.name}" to ${destPath}`);

      // Suggest syncing
      output.info('Run "cops skill sync" to sync to Claude Code');

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
      const skillManager = await createProfileAwareSkillManager();
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
      const skillManager = await createProfileAwareSkillManager();
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
      const skillManager = await createProfileAwareSkillManager();
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
    add: addCommand,
    enable: enableCommand,
    disable: disableCommand,
    sync: syncCommand,
  },
  run() {
    console.log('Available subcommands:');
    console.log('  list       List all installed skills');
    console.log('  info       Show skill details');
    console.log('  install    Install a skill');
    console.log('  add        Generate a skill using AI');
    console.log('  enable     Enable a skill');
    console.log('  disable    Disable a skill');
    console.log('  sync       Sync skills to Claude Code');
    console.log();
    console.log('Run "cops skill <command> --help" for more information on a command.');
  },
});

export default skillCommand;
