/**
 * Learning management commands
 * cops learn list|show|evolve|clear
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import { createLearningManager } from '../domain/learning/manager.js';

// =============================================================================
// List Learnings
// =============================================================================

const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List captured learnings',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const manager = createLearningManager();
    const learnings = await manager.list();

    if (args.json) {
      output.json({
        learnings: learnings.map(l => ({
          file: l.fileName,
          date: l.learning.date,
          category: l.learning.category,
          component: l.learning.component,
          symptoms: l.learning.symptoms,
          tags: l.learning.tags,
          confidence: l.learning.confidence,
        })),
      });
      return;
    }

    if (learnings.length === 0) {
      output.info('No learnings captured yet.');
      output.dim('  Learnings are captured automatically from Claude Code sessions');
      output.dim('  when problems are resolved (errors fixed, tests passing, etc.).');
      return;
    }

    output.header('Learnings');

    output.table(
      learnings.map(l => ({
        date: l.learning.date.split('T')[0] || '',
        category: l.learning.category,
        component: l.learning.component,
        symptom: output.truncate(l.learning.symptoms[0] || '-', 35),
        confidence: String(l.learning.confidence),
      })),
      [
        { key: 'date', header: 'Date', width: 12 },
        { key: 'category', header: 'Category', width: 14 },
        { key: 'component', header: 'Component', width: 12 },
        { key: 'symptom', header: 'Symptom', width: 37 },
        { key: 'confidence', header: 'Conf', width: 6 },
      ]
    );

    console.log();
    output.dim(`  ${learnings.length} learnings total`);
  },
});

// =============================================================================
// Show Learning
// =============================================================================

const showCommand = defineCommand({
  meta: {
    name: 'show',
    description: 'Show a specific learning',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Learning filename to show',
      required: true,
    },
  },
  async run({ args }) {
    const manager = createLearningManager();
    const learning = await manager.get(args.file);

    if (!learning) {
      output.error(`Learning not found: ${args.file}`);
      output.info('Use "cops learn list" to see available learnings');
      process.exit(1);
    }

    const l = learning.learning;

    output.header(l.symptoms[0] || l.rootCause);
    console.log();

    output.kv('Date', l.date.split('T')[0] || l.date);
    output.kv('Category', l.category);
    output.kv('Component', l.component);
    output.kv('Root Cause', l.rootCause);
    output.kv('Resolution', l.resolution);
    output.kv('Confidence', String(l.confidence));
    output.kv('Tags', l.tags.join(', '));

    if (l.symptoms.length > 0) {
      console.log();
      output.dim('  Symptoms:');
      for (const s of l.symptoms) {
        output.dim(`    - ${s}`);
      }
    }

    if (l.problem) {
      console.log();
      output.header('Problem');
      console.log(l.problem);
    }

    if (l.solution) {
      console.log();
      output.header('Solution');
      console.log(l.solution);
    }

    if (l.why) {
      console.log();
      output.header('Why');
      console.log(l.why);
    }
  },
});

// =============================================================================
// Evolve Learnings into Skills
// =============================================================================

const evolveCommand = defineCommand({
  meta: {
    name: 'evolve',
    description: 'Cluster learnings into project-specific skills',
  },
  args: {
    skillsDir: {
      type: 'string',
      description: 'Target skills directory (default: .claude/skills)',
    },
  },
  async run({ args }) {
    const { join } = await import('path');
    const manager = createLearningManager();
    const skillsDir = args.skillsDir || join(process.cwd(), '.claude', 'skills');

    const learnings = await manager.list();
    if (learnings.length < 3) {
      output.info('Not enough learnings to evolve (need at least 3).');
      output.dim(`  Currently have ${learnings.length} learnings.`);
      return;
    }

    output.info(`Analyzing ${learnings.length} learnings for patterns...`);

    const generated = await manager.evolve(skillsDir);

    if (generated.length === 0) {
      output.info('No clusters found with 3+ shared tags.');
      output.dim('  More learnings with shared tags are needed to generate skills.');
      return;
    }

    for (const skill of generated) {
      output.success(`Generated skill: ${skill.name} (from ${skill.learningCount} learnings)`);
      output.dim(`  ${skill.path}`);
    }

    console.log();
    output.info('Run "cops sync" to deliver generated skills to Claude Code.');
  },
});

// =============================================================================
// Clear Learnings
// =============================================================================

const clearCommand = defineCommand({
  meta: {
    name: 'clear',
    description: 'Remove all captured learnings',
  },
  args: {},
  async run() {
    const manager = createLearningManager();
    const count = await manager.clear();

    if (count === 0) {
      output.info('No learnings to clear.');
    } else {
      output.success(`Cleared ${count} learnings.`);
    }
  },
});

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'learn',
    description: 'Manage captured learnings (list, show, evolve, clear)',
  },
  subCommands: {
    list: listCommand,
    show: showCommand,
    evolve: evolveCommand,
    clear: clearCommand,
  },
});
