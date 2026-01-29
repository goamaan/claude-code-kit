/**
 * Swarm orchestration management commands (v5)
 * Reads from native Claude Code team/task state
 * cops swarm [status|tasks] + cops team [list|cleanup]
 */

import { defineCommand } from 'citty';
import { join } from 'node:path';
import { homedir } from 'node:os';
import pc from 'picocolors';
import * as output from '../ui/output.js';

// =============================================================================
// Constants
// =============================================================================

const CLAUDE_DIR = join(homedir(), '.claude');
const TEAMS_DIR = join(CLAUDE_DIR, 'teams');

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Read JSON file safely, returning null on any error
 */
async function readJsonSafe<T>(path: string): Promise<T | null> {
  try {
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * List directories in a path
 */
async function listDirs(path: string): Promise<string[]> {
  try {
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    return [];
  }
}

/**
 * Remove a directory recursively
 */
async function removeDir(path: string): Promise<void> {
  const { rm } = await import('node:fs/promises');
  await rm(path, { recursive: true, force: true });
}

// =============================================================================
// Status Command
// =============================================================================

const statusCommand = defineCommand({
  meta: {
    name: 'status',
    description: 'Show active teams from native Claude Code state',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const teamDirs = await listDirs(TEAMS_DIR);

    if (teamDirs.length === 0) {
      output.info('No active teams.');
      output.dim('Teams are created automatically by Claude Code when using TeammateTool.');
      return;
    }

    if (args.json) {
      const teams = [];
      for (const dir of teamDirs) {
        const configPath = join(TEAMS_DIR, dir, 'config.json');
        const config = await readJsonSafe<Record<string, unknown>>(configPath);
        if (config) {
          teams.push({ name: dir, ...config });
        }
      }
      output.json(teams);
      return;
    }

    output.header('Active Teams');
    for (const dir of teamDirs) {
      const configPath = join(TEAMS_DIR, dir, 'config.json');
      const config = await readJsonSafe<Record<string, unknown>>(configPath);

      if (config) {
        const memberCount = Array.isArray(config['members']) ? config['members'].length : 0;
        output.kv(dir, `${memberCount} members`);
      } else {
        output.kv(dir, pc.dim('(no config)'));
      }
    }
  },
});

// =============================================================================
// Tasks Command
// =============================================================================

const tasksCommand = defineCommand({
  meta: {
    name: 'tasks',
    description: 'Show tasks from native Claude Code state',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
    team: {
      type: 'string',
      description: 'Team name to show tasks for',
    },
  },
  async run({ args }) {
    const teamDirs = await listDirs(TEAMS_DIR);

    if (teamDirs.length === 0) {
      output.info('No active teams with tasks.');
      return;
    }

    // Find tasks across teams
    const teamName = args.team as string | undefined;
    const targetDirs = teamName ? [teamName] : teamDirs;

    for (const dir of targetDirs) {
      const tasksPath = join(TEAMS_DIR, dir, 'tasks.json');
      const tasks = await readJsonSafe<Array<Record<string, unknown>>>(tasksPath);

      if (!tasks || tasks.length === 0) continue;

      if (args.json) {
        output.json({ team: dir, tasks });
        continue;
      }

      output.header(`Tasks: ${dir}`);

      const statusSymbols: Record<string, string> = {
        completed: pc.green('+'),
        in_progress: pc.yellow('*'),
        pending: pc.dim('o'),
        claimed: pc.blue('>'),
        failed: pc.red('x'),
      };

      for (const task of tasks) {
        const status = String(task['status'] ?? 'pending');
        const symbol = statusSymbols[status] ?? pc.dim('?');
        const desc = String(task['description'] ?? task['id'] ?? 'unknown');
        const claimedBy = task['claimedBy'] ? pc.dim(` (${task['claimedBy']})`) : '';
        console.log(`  ${symbol} ${desc}${claimedBy}`);
      }
    }
  },
});

// =============================================================================
// Team List Command
// =============================================================================

const teamListCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List active teams from ~/.claude/teams/',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const teamDirs = await listDirs(TEAMS_DIR);

    if (teamDirs.length === 0) {
      output.info('No teams found.');
      output.dim('Teams are created by Claude Code when using TeammateTool.');
      return;
    }

    if (args.json) {
      output.json(teamDirs);
      return;
    }

    output.header('Teams');
    for (const dir of teamDirs) {
      console.log(`  ${pc.cyan(dir)}`);
    }
    output.dim(`\n${teamDirs.length} team(s) found in ${TEAMS_DIR}`);
  },
});

// =============================================================================
// Team Cleanup Command
// =============================================================================

const teamCleanupCommand = defineCommand({
  meta: {
    name: 'cleanup',
    description: 'Remove orphaned team directories',
  },
  args: {
    'dry-run': {
      type: 'boolean',
      description: 'Show what would be removed without removing',
      default: false,
    },
  },
  async run({ args }) {
    const teamDirs = await listDirs(TEAMS_DIR);

    if (teamDirs.length === 0) {
      output.info('No team directories to clean up.');
      return;
    }

    const orphaned: string[] = [];
    for (const dir of teamDirs) {
      const configPath = join(TEAMS_DIR, dir, 'config.json');
      const config = await readJsonSafe<Record<string, unknown>>(configPath);

      // Consider orphaned if no config or status is 'shutdown'/'completed'
      if (!config || config['status'] === 'shutdown' || config['status'] === 'completed') {
        orphaned.push(dir);
      }
    }

    if (orphaned.length === 0) {
      output.info('No orphaned teams to clean up.');
      return;
    }

    if (args['dry-run']) {
      output.header('Would remove (dry run)');
      for (const dir of orphaned) {
        console.log(`  ${pc.red('-')} ${dir}`);
      }
      return;
    }

    output.header('Cleaning up orphaned teams');
    for (const dir of orphaned) {
      const teamPath = join(TEAMS_DIR, dir);
      await removeDir(teamPath);
      output.status(`Removed: ${dir}`, 'success');
    }
    output.success(`Cleaned up ${orphaned.length} orphaned team(s).`);
  },
});

// =============================================================================
// Team Parent Command
// =============================================================================

const teamCommand = defineCommand({
  meta: {
    name: 'team',
    description: 'Native Claude Code team management',
  },
  subCommands: {
    list: teamListCommand,
    cleanup: teamCleanupCommand,
  },
});

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'swarm',
    description: 'Swarm orchestration and team management',
  },
  subCommands: {
    status: statusCommand,
    tasks: tasksCommand,
    team: teamCommand,
  },
});
