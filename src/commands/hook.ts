/**
 * Hook management commands
 * ck hook list|debug
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import { listEnabledAddons } from '../domain/addon/manager.js';
import { getClaudeDir } from '../utils/paths.js';
import { exists, readFile } from '../utils/fs.js';
import { join } from 'node:path';
import type { SettingsHooks, HookEvent } from '../types/hook.js';

// =============================================================================
// Helper Functions
// =============================================================================

interface ResolvedHook {
  event: HookEvent;
  source: 'addon' | 'setup' | 'settings';
  sourceName: string;
  matcher: string;
  handler: string;
  priority: number;
}

async function resolveActiveHooks(): Promise<ResolvedHook[]> {
  const hooks: ResolvedHook[] = [];

  // 1. Get hooks from enabled addons
  const addons = await listEnabledAddons();
  for (const addon of addons) {
    if (!addon.manifest.hooks) continue;

    const hookEvents: HookEvent[] = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop'];
    for (const event of hookEvents) {
      const eventHooks = addon.manifest.hooks[event];
      if (!eventHooks || !Array.isArray(eventHooks)) continue;

      for (const hook of eventHooks) {
        hooks.push({
          event,
          source: 'addon',
          sourceName: addon.manifest.name,
          matcher: hook.matcher,
          handler: hook.handler,
          priority: hook.priority ?? 0,
        });
      }
    }
  }

  // 2. Get hooks from ~/.claude/settings.json
  const settingsPath = join(getClaudeDir(), 'settings.json');
  if (await exists(settingsPath)) {
    try {
      const content = await readFile(settingsPath);
      const settings = JSON.parse(content) as { hooks?: SettingsHooks };

      if (settings.hooks) {
        const hookEvents: HookEvent[] = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop'];
        for (const event of hookEvents) {
          const eventHooks = settings.hooks[event];
          if (!eventHooks || !Array.isArray(eventHooks)) continue;

          for (const hook of eventHooks) {
            hooks.push({
              event,
              source: 'settings',
              sourceName: 'settings.json',
              matcher: hook.matcher,
              handler: hook.handler,
              priority: hook.priority ?? 0,
            });
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Sort by event, then priority (descending)
  hooks.sort((a, b) => {
    if (a.event !== b.event) return a.event.localeCompare(b.event);
    return b.priority - a.priority;
  });

  return hooks;
}

// =============================================================================
// List Hooks
// =============================================================================

const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List active hooks',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
    event: {
      type: 'string',
      alias: 'e',
      description: 'Filter by event type (PreToolUse, PostToolUse, Stop, SubagentStop)',
    },
  },
  async run({ args }) {
    let hooks = await resolveActiveHooks();

    // Filter by event if specified
    if (args.event) {
      hooks = hooks.filter(h => h.event.toLowerCase() === args.event!.toLowerCase());
    }

    if (args.json) {
      output.json(hooks);
      return;
    }

    if (hooks.length === 0) {
      output.info('No active hooks found.');
      output.info('Hooks can be defined in addons or ~/.claude/settings.json');
      return;
    }

    output.header('Active Hooks');

    // Group by event
    const byEvent = new Map<HookEvent, ResolvedHook[]>();
    for (const hook of hooks) {
      if (!byEvent.has(hook.event)) {
        byEvent.set(hook.event, []);
      }
      byEvent.get(hook.event)!.push(hook);
    }

    for (const [event, eventHooks] of byEvent) {
      console.log();
      output.label(event, '');

      output.table(
        eventHooks.map(h => ({
          source: `${h.source}:${h.sourceName}`,
          matcher: output.truncate(h.matcher, 25),
          handler: output.truncate(h.handler, 30),
          priority: h.priority,
        })),
        [
          { key: 'source', header: 'Source', width: 25 },
          { key: 'matcher', header: 'Matcher', width: 25 },
          { key: 'handler', header: 'Handler', width: 30 },
          { key: 'priority', header: 'Priority', width: 8, align: 'right' },
        ]
      );
    }

    console.log();
    output.dim('Higher priority hooks run first. Hooks run in order for matching tools.');
  },
});

// =============================================================================
// Debug Hook Execution
// =============================================================================

const debugCommand = defineCommand({
  meta: {
    name: 'debug',
    description: 'Debug hook execution for a tool',
  },
  args: {
    tool: {
      type: 'positional',
      description: 'Tool name to check (e.g., Bash, Read, Write)',
      required: true,
    },
    event: {
      type: 'string',
      alias: 'e',
      description: 'Event type (default: PreToolUse)',
      default: 'PreToolUse',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const hooks = await resolveActiveHooks();
    const event = args.event as HookEvent;
    const toolName = args.tool;

    // Filter hooks for this event
    const eventHooks = hooks.filter(h => h.event === event);

    // Find matching hooks
    const matchingHooks: Array<ResolvedHook & { matchReason: string }> = [];

    for (const hook of eventHooks) {
      // Check if matcher matches the tool
      let matches = false;
      let matchReason = '';

      if (hook.matcher === '*') {
        matches = true;
        matchReason = 'Wildcard matcher (*)';
      } else if (hook.matcher.includes('*')) {
        // Glob-style matching
        const regex = new RegExp('^' + hook.matcher.replace(/\*/g, '.*') + '$', 'i');
        if (regex.test(toolName)) {
          matches = true;
          matchReason = `Glob pattern: ${hook.matcher}`;
        }
      } else if (hook.matcher.toLowerCase() === toolName.toLowerCase()) {
        matches = true;
        matchReason = 'Exact match';
      }

      if (matches) {
        matchingHooks.push({ ...hook, matchReason });
      }
    }

    // Sort by priority
    matchingHooks.sort((a, b) => b.priority - a.priority);

    if (args.json) {
      output.json({
        tool: toolName,
        event,
        totalHooksForEvent: eventHooks.length,
        matchingHooks,
      });
      return;
    }

    output.header(`Hook Debug: ${toolName} (${event})`);

    output.kv('Total hooks for event', eventHooks.length.toString());
    output.kv('Matching hooks', matchingHooks.length.toString());

    if (matchingHooks.length === 0) {
      console.log();
      output.info(`No hooks will be triggered for ${toolName} on ${event}`);
      return;
    }

    console.log();
    output.header('Execution Order');

    let order = 1;
    for (const hook of matchingHooks) {
      console.log();
      output.label(`${order}. ${hook.sourceName}`, '');
      output.kv('  Handler', hook.handler, 2);
      output.kv('  Match', hook.matchReason, 2);
      output.kv('  Priority', hook.priority.toString(), 2);
      order++;
    }

    console.log();
    output.dim('Hooks execute in order shown. First hook to block/error stops chain.');
  },
});

// =============================================================================
// Test Hook
// =============================================================================

const testCommand = defineCommand({
  meta: {
    name: 'test',
    description: 'Test a hook handler with sample input',
  },
  args: {
    handler: {
      type: 'positional',
      description: 'Path to hook handler script',
      required: true,
    },
    tool: {
      type: 'string',
      alias: 't',
      description: 'Tool name for test input',
      default: 'Bash',
    },
    input: {
      type: 'string',
      alias: 'i',
      description: 'JSON input for tool_input (or use defaults)',
    },
  },
  async run({ args }) {
    const { spawn } = await import('node:child_process');
    const { resolve } = await import('node:path');

    const handlerPath = resolve(args.handler);

    // Build test input
    const testInput = {
      tool_name: args.tool,
      tool_input: args.input ? JSON.parse(args.input) : {
        command: 'echo "test"',
      },
      session_id: 'test-session-' + Date.now(),
    };

    output.header('Testing Hook Handler');
    output.kv('Handler', handlerPath);
    output.kv('Tool', testInput.tool_name);

    console.log();
    output.label('Input:', '');
    console.log(JSON.stringify(testInput, null, 2));

    console.log();
    output.header('Execution');

    const startTime = Date.now();

    try {
      const result = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
        const child = spawn(handlerPath, [], {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        child.on('error', reject);

        child.on('close', (code) => {
          resolve({ code: code ?? 0, stdout, stderr });
        });

        // Send input
        child.stdin.write(JSON.stringify(testInput));
        child.stdin.end();
      });

      const duration = Date.now() - startTime;

      output.kv('Exit code', result.code.toString());
      output.kv('Duration', output.formatDuration(duration));

      if (result.stdout) {
        console.log();
        output.label('stdout:', '');
        console.log(result.stdout);
      }

      if (result.stderr) {
        console.log();
        output.label('stderr:', '');
        console.log(result.stderr);
      }

      console.log();
      output.header('Result Interpretation');

      switch (result.code) {
        case 0:
          output.success('Exit code 0: Tool call ALLOWED');
          break;
        case 1:
          output.error('Exit code 1: Hook ERROR (stops execution)');
          break;
        case 2:
          output.warn('Exit code 2: Tool call BLOCKED');
          break;
        default:
          output.info(`Exit code ${result.code}: Unknown (treated as error)`);
      }
    } catch (err) {
      output.error(`Failed to execute handler: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  },
});

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'hook',
    description: 'Manage hooks',
  },
  subCommands: {
    list: listCommand,
    debug: debugCommand,
    test: testCommand,
  },
});
