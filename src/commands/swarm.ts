/**
 * Swarm orchestration management commands
 * cops swarm [status|tasks|init|stop|history]
 */

import { defineCommand } from 'citty';
import pc from 'picocolors';
import * as output from '../ui/output.js';
import {
  getActiveSwarms,
  loadSwarmState,
  initPersistence,
  setTaskListId,
  recordSwarmCompletion,
  getSwarmHistory,
} from '../core/swarm/persistence.js';
import type { SwarmTask, SwarmState } from '../types/swarm.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get status symbol for a task
 */
function getTaskStatusSymbol(status: SwarmTask['status']): string {
  const symbols = {
    completed: pc.green('+'),
    in_progress: pc.yellow('*'),
    pending: pc.dim('o'),
    failed: pc.red('x'),
  };
  return symbols[status];
}

/**
 * Get status color for a task
 */
function getTaskStatusColor(status: SwarmTask['status']): (str: string) => string {
  const colors = {
    completed: pc.green,
    in_progress: pc.yellow,
    pending: pc.dim,
    failed: pc.red,
  };
  return colors[status];
}

/**
 * Print task counts summary
 */
function printTaskCounts(state: SwarmState): void {
  const tasks = state.plan.tasks;
  const counts = {
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
  };

  output.kv('Total tasks', tasks.length.toString());
  output.kv('Pending', pc.dim(counts.pending.toString()));
  output.kv('In Progress', pc.yellow(counts.in_progress.toString()));
  output.kv('Completed', pc.green(counts.completed.toString()));
  if (counts.failed > 0) {
    output.kv('Failed', pc.red(counts.failed.toString()));
  }
}

/**
 * Build a tree visualization of task dependencies
 */
function buildTaskTree(tasks: SwarmTask[]): string[] {
  const lines: string[] = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const processed = new Set<string>();

  // Find root tasks (no blockedBy dependencies)
  const roots = tasks.filter(t => t.blockedBy.length === 0);

  // Recursive function to build tree
  function buildNode(task: SwarmTask, prefix: string, isLast: boolean): void {
    if (processed.has(task.id)) {
      return;
    }
    processed.add(task.id);

    const connector = isLast ? '`-- ' : '|-- ';
    const statusSymbol = getTaskStatusSymbol(task.status);
    const colorFn = getTaskStatusColor(task.status);
    const taskLabel = colorFn(`${task.id}: ${task.subject}`);

    lines.push(`${pc.dim(prefix + connector)}${statusSymbol} ${taskLabel}`);

    // Get tasks that depend on this one
    const children = task.blocks
      .map(id => taskMap.get(id))
      .filter((t): t is SwarmTask => t !== undefined);

    if (children.length > 0) {
      const childPrefix = prefix + (isLast ? '    ' : '|   ');
      children.forEach((child, index) => {
        buildNode(child, childPrefix, index === children.length - 1);
      });
    }
  }

  // Build tree from each root
  roots.forEach((root, index) => {
    buildNode(root, '', index === roots.length - 1);
  });

  // Handle orphaned tasks (shouldn't happen but just in case)
  const orphans = tasks.filter(t => !processed.has(t.id));
  if (orphans.length > 0) {
    lines.push('');
    lines.push(pc.yellow('Orphaned tasks (no dependencies):'));
    orphans.forEach(task => {
      const statusSymbol = getTaskStatusSymbol(task.status);
      const colorFn = getTaskStatusColor(task.status);
      const taskLabel = colorFn(`${task.id}: ${task.subject}`);
      lines.push(`  ${statusSymbol} ${taskLabel}`);
    });
  }

  return lines;
}

// =============================================================================
// Status Command
// =============================================================================

const statusCommand = defineCommand({
  meta: {
    name: 'status',
    description: 'Show active swarm state and task counts',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const activeSwarms = await getActiveSwarms();

    if (activeSwarms.length === 0) {
      output.info('No active swarms.');
      output.dim('Use "ck swarm init <name>" to create a swarm.');
      return;
    }

    // Load the first active swarm (typically there's only one)
    const swarmName = activeSwarms[0]!;
    const state = await loadSwarmState(swarmName);

    if (!state) {
      output.error(`Failed to load swarm state for: ${swarmName}`);
      return;
    }

    if (args.json) {
      output.json({
        name: state.name,
        status: state.status,
        taskCounts: {
          total: state.plan.tasks.length,
          pending: state.plan.tasks.filter(t => t.status === 'pending').length,
          in_progress: state.plan.tasks.filter(t => t.status === 'in_progress').length,
          completed: state.plan.tasks.filter(t => t.status === 'completed').length,
          failed: state.plan.tasks.filter(t => t.status === 'failed').length,
        },
        totalCost: state.totalCost,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
      });
      return;
    }

    // Format output
    output.header(`Swarm Status: ${state.name}`);
    output.kv('Status', state.status);
    output.kv('Started', state.startedAt.toLocaleString());
    if (state.completedAt) {
      output.kv('Completed', state.completedAt.toLocaleString());
    }

    console.log();
    output.header('Task Counts');
    printTaskCounts(state);

    if (state.totalCost > 0) {
      console.log();
      output.kv('Total Cost', output.formatCurrency(state.totalCost));
    }

    // Show active workers if any
    const activeWorkers = state.plan.tasks.filter(t => t.status === 'in_progress');
    if (activeWorkers.length > 0) {
      console.log();
      output.header('Active Workers');
      activeWorkers.forEach(task => {
        output.status(
          `${task.id}: ${task.subject} (${task.agent}/${task.model})`,
          'info'
        );
      });
    }
  },
});

// =============================================================================
// Tasks Command
// =============================================================================

const tasksCommand = defineCommand({
  meta: {
    name: 'tasks',
    description: 'Show task dependency visualization',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const activeSwarms = await getActiveSwarms();

    if (activeSwarms.length === 0) {
      output.info('No active swarms.');
      output.dim('Use "ck swarm init <name>" to create a swarm.');
      return;
    }

    // Load the first active swarm
    const swarmName = activeSwarms[0]!;
    const state = await loadSwarmState(swarmName);

    if (!state) {
      output.error(`Failed to load swarm state for: ${swarmName}`);
      return;
    }

    if (args.json) {
      output.json({
        name: state.name,
        tasks: state.plan.tasks.map(t => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          agent: t.agent,
          model: t.model,
          blockedBy: t.blockedBy,
          blocks: t.blocks,
        })),
      });
      return;
    }

    // Print header
    output.header(`Task Dependencies: ${state.name}`);

    // Print legend
    console.log(pc.dim('Legend:'));
    console.log(`  ${pc.green('+')} completed  ${pc.yellow('*')} in_progress  ${pc.dim('o')} pending  ${pc.red('x')} failed`);
    console.log();

    // Build and print tree
    const treeLines = buildTaskTree(state.plan.tasks);
    treeLines.forEach(line => console.log(line));

    // Print summary
    console.log();
    printTaskCounts(state);
  },
});

// =============================================================================
// Init Command
// =============================================================================

const initCommand = defineCommand({
  meta: {
    name: 'init',
    description: 'Create a named swarm for persistence',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Name of the swarm',
      required: false,
      default: 'default',
    },
    'set-task-list': {
      type: 'boolean',
      description: 'Set CLAUDE_CODE_TASK_LIST_ID environment variable',
      default: true,
    },
  },
  async run({ args }) {
    const swarmName = args.name as string;

    try {
      // Initialize persistence
      await initPersistence(swarmName);

      // Set task list ID if requested
      if (args['set-task-list']) {
        await setTaskListId(swarmName);
      }

      output.success(`Initialized swarm: ${swarmName}`);
      if (args['set-task-list']) {
        output.info('Set CLAUDE_CODE_TASK_LIST_ID in ~/.claude/settings.json');
      }
      output.dim('Swarm state will be persisted to:');
      output.dim(`  ~/.claudeops/swarms/${swarmName}/`);
    } catch (err) {
      output.error(`Failed to initialize swarm: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  },
});

// =============================================================================
// Stop Command
// =============================================================================

const stopCommand = defineCommand({
  meta: {
    name: 'stop',
    description: 'Gracefully stop active swarm',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Name of the swarm to stop',
      required: false,
    },
  },
  async run({ args }) {
    const activeSwarms = await getActiveSwarms();

    if (activeSwarms.length === 0) {
      output.info('No active swarms to stop.');
      return;
    }

    // Determine which swarm to stop
    let swarmName: string;
    if (args.name) {
      swarmName = args.name as string;
      if (!activeSwarms.includes(swarmName)) {
        output.error(`Swarm not found: ${swarmName}`);
        output.info('Active swarms:');
        activeSwarms.forEach(name => output.dim(`  - ${name}`));
        return;
      }
    } else {
      swarmName = activeSwarms[0]!;
    }

    // Load state
    const state = await loadSwarmState(swarmName);

    if (!state) {
      output.error(`Failed to load swarm state for: ${swarmName}`);
      return;
    }

    // Mark as stopped
    state.status = 'stopped';
    state.completedAt = new Date();

    // Record completion
    await recordSwarmCompletion(state);

    output.success(`Stopped swarm: ${swarmName}`);
    output.info('Execution recorded to history.');
  },
});

// =============================================================================
// History Command
// =============================================================================

const historyCommand = defineCommand({
  meta: {
    name: 'history',
    description: 'Show past swarm executions',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
    limit: {
      type: 'string',
      alias: 'n',
      description: 'Limit number of results',
      default: '10',
    },
  },
  async run({ args }) {
    const history = await getSwarmHistory();

    if (history.length === 0) {
      output.info('No swarm execution history.');
      output.dim('Completed swarms will appear here.');
      return;
    }

    // Sort by completion time (most recent first)
    const sorted = history.sort((a, b) =>
      b.completedAt.getTime() - a.completedAt.getTime()
    );

    // Apply limit
    const limit = parseInt(args.limit as string, 10);
    const limited = isNaN(limit) ? sorted : sorted.slice(0, limit);

    if (args.json) {
      output.json(limited);
      return;
    }

    output.header('Swarm Execution History');

    // Print table
    output.table(
      limited.map(exec => ({
        name: exec.name,
        status: exec.status,
        tasks: `${exec.completedCount}/${exec.taskCount}`,
        duration: output.formatDuration(exec.duration),
        cost: output.formatCurrency(exec.totalCost),
        completed: output.formatRelativeTime(exec.completedAt),
      })),
      [
        { key: 'name', header: 'Name', width: 20 },
        { key: 'status', header: 'Status', width: 10 },
        { key: 'tasks', header: 'Tasks', width: 10, align: 'right' },
        { key: 'duration', header: 'Duration', width: 12, align: 'right' },
        { key: 'cost', header: 'Cost', width: 12, align: 'right' },
        { key: 'completed', header: 'Completed', width: 15 },
      ]
    );

    if (limited.length < sorted.length) {
      console.log();
      output.dim(`Showing ${limited.length} of ${sorted.length} executions. Use --limit to show more.`);
    }
  },
});

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'swarm',
    description: 'Swarm orchestration management',
  },
  subCommands: {
    status: statusCommand,
    tasks: tasksCommand,
    init: initCommand,
    stop: stopCommand,
    history: historyCommand,
  },
});
