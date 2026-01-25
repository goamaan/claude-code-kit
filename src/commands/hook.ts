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
import pc from 'picocolors';
import { loadConfig } from '../core/config/loader.js';

/**
 * Create a hook manager with profile-aware disabled hooks
 */
async function createProfileAwareHookManager() {
  const { createHookManager } = await import('../domain/hook/index.js');
  const config = await loadConfig();
  return createHookManager({
    disabledHooks: config.hooks.disabled,
  });
}

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

    const hookEvents: HookEvent[] = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop', 'UserPromptSubmit'];
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
        const hookEvents: HookEvent[] = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop', 'UserPromptSubmit'];
        for (const event of hookEvents) {
          const eventHooks = settings.hooks[event];
          if (!eventHooks || !Array.isArray(eventHooks)) continue;

          for (const hook of eventHooks) {
            // Extract matcher string (already a string in current format)
            const matcherStr = hook.matcher || '*';
            // Extract handler from hooks array
            const handler = hook.hooks?.[0]?.command || '';

            hooks.push({
              event,
              source: 'settings',
              sourceName: 'settings.json',
              matcher: matcherStr,
              handler: handler,
              priority: 0, // Priority is not stored in new format
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
          matcher: output.truncate(h.matcher || '*', 25),
          handler: output.truncate(h.handler || '', 30),
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
// Add (Generate) Hook
// =============================================================================

const addCommand = defineCommand({
  meta: {
    name: 'add',
    description: 'Generate a hook using AI',
  },
  args: {
    description: {
      type: 'positional',
      description: 'Description of the hook to generate',
      required: true,
    },
    name: {
      type: 'string',
      alias: 'n',
      description: 'Hook name (optional, AI will suggest)',
    },
    event: {
      type: 'string',
      alias: 'e',
      description: 'Event type (PreToolUse, PostToolUse, Stop, SubagentStop)',
      default: 'PreToolUse',
    },
    matcher: {
      type: 'string',
      alias: 'm',
      description: 'Matcher pattern (glob or exact)',
      default: '*',
    },
    priority: {
      type: 'string',
      alias: 'p',
      description: 'Priority (0-100, higher runs first)',
      default: '50',
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
    const { generateHook, generateHookTemplate, isClaudeCliAvailable, GeneratorError } = await import('../domain/generator/index.js');
    const { createInterface } = await import('node:readline');

    try {
      const event = args.event as HookEvent;
      const priority = parseInt(args.priority, 10);

      // Validate event type
      const validEvents: HookEvent[] = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop'];
      if (!validEvents.includes(event)) {
        output.error(`Invalid event type: ${args.event}`);
        output.info(`Valid events: ${validEvents.join(', ')}`);
        process.exit(1);
      }

      // Check if Claude CLI is available
      const cliAvailable = await isClaudeCliAvailable();

      output.info('Generating hook...');

      let hook;
      try {
        if (cliAvailable) {
          hook = await generateHook({
            description: args.description,
            name: args.name,
            event,
            matcher: args.matcher,
            priority,
            referenceUrl: args.reference,
          });
        } else {
          output.warn('Claude CLI not found. Using template-based generation.');
          hook = generateHookTemplate({
            description: args.description,
            name: args.name,
            event,
            matcher: args.matcher,
            priority,
          });
        }
      } catch (err) {
        if (err instanceof GeneratorError) {
          if (err.code === 'CLI_NOT_FOUND') {
            output.warn('Claude CLI not available. Falling back to template.');
            hook = generateHookTemplate({
              description: args.description,
              name: args.name,
              event,
              matcher: args.matcher,
              priority,
            });
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      // Show preview
      output.header('Generated Hook Preview');
      console.log();
      output.kv('Name', hook.name);
      output.kv('Description', hook.description);
      output.kv('Event', hook.event);
      output.kv('Matcher', hook.matcher);
      output.kv('Priority', hook.priority.toString());

      console.log();
      output.header('Handler Preview');
      console.log();
      // Show first 30 lines of handler
      const lines = hook.handlerContent.split('\n');
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
          rl.question('\nInstall this hook? (y/N) ', resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          output.info('Cancelled');
          return;
        }
      }

      // Install hook
      const hookManager = await createProfileAwareHookManager();
      const destPath = await hookManager.installHook(hook.name, hook.handlerContent);

      output.success(`Installed hook "${hook.name}" to ${destPath}`);
      output.info('Run "cops hook sync" to sync to Claude Code settings');

    } catch (err) {
      output.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});

// =============================================================================
// Sync Hooks
// =============================================================================

const syncCommand = defineCommand({
  meta: {
    name: 'sync',
    description: 'Sync hooks to Claude Code settings',
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
      const hookManager = await createProfileAwareHookManager();
      await hookManager.loadHooks();

      const hooks = hookManager.getHooks();
      if (hooks.length === 0) {
        output.info('No hooks found to sync.');
        return;
      }

      output.info('Syncing hooks to Claude Code settings...');

      const result = await hookManager.syncToClaudeSettings();

      const totalSynced = result.added.length + result.updated.length;
      if (totalSynced > 0) {
        output.success(`Synced ${totalSynced} hook${totalSynced === 1 ? '' : 's'}`);

        if (args.verbose) {
          console.log();
          if (result.added.length > 0) {
            console.log('Added hooks:');
            for (const name of result.added) {
              console.log(`  + ${name}`);
            }
          }
          if (result.updated.length > 0) {
            console.log('Updated hooks:');
            for (const name of result.updated) {
              console.log(`  ~ ${name}`);
            }
          }
          if (result.removed.length > 0) {
            console.log('Removed hooks:');
            for (const name of result.removed) {
              console.log(`  - ${name}`);
            }
          }
        }
      } else {
        output.info('No changes to sync.');
      }

      if (result.errors.length > 0) {
        console.log();
        output.warn(`Errors during sync:`);
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
// Legacy Hooks.json Commands
// =============================================================================

interface LegacyHook {
  name: string;
  type: string;
  enabled: boolean;
  path: string;
  description: string;
}

interface LegacyHooksConfig {
  hooks: LegacyHook[];
}

async function loadLegacyHooks(): Promise<LegacyHooksConfig> {
  const { join } = await import('node:path');
  const hooksPath = join(process.cwd(), 'hooks', 'hooks.json');

  try {
    const content = await readFile(hooksPath);
    return JSON.parse(content) as LegacyHooksConfig;
  } catch {
    return { hooks: [] };
  }
}

async function saveLegacyHooks(config: LegacyHooksConfig): Promise<void> {
  const { join } = await import('node:path');
  const hooksPath = join(process.cwd(), 'hooks', 'hooks.json');
  const content = JSON.stringify(config, null, 2);

  const { writeFile } = await import('node:fs/promises');
  await writeFile(hooksPath, content, 'utf8');
}

const legacyListCommand = defineCommand({
  meta: {
    name: 'legacy-list',
    description: 'List legacy hooks.json hooks',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const config = await loadLegacyHooks();
    const hooks = config.hooks;

    if (hooks.length === 0) {
      output.info('No legacy hooks found in hooks/hooks.json');
      return;
    }

    if (args.json) {
      output.json(hooks);
      return;
    }

    output.header('Legacy Hooks (hooks.json)');

    for (const hook of hooks) {
      console.log();
      const status = hook.enabled ? pc.green('enabled') : pc.dim('disabled');
      output.label(hook.name, status);
      output.kv('  Type', hook.type, 2);
      output.kv('  Path', hook.path, 2);
      if (hook.description) {
        output.kv('  Description', hook.description, 2);
      }
    }

    console.log();
    const enabledCount = hooks.filter(h => h.enabled).length;
    output.dim(`${hooks.length} hooks (${enabledCount} enabled)`);
  },
});

const installLegacyCommand = defineCommand({
  meta: {
    name: 'install-legacy',
    description: 'Install a hook to hooks.json',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Hook name',
      required: true,
    },
    from: {
      type: 'string',
      description: 'Install from URL or path',
    },
    type: {
      type: 'string',
      description: 'Hook event type',
      default: 'UserPromptSubmit',
    },
  },
  async run({ args }) {
    const { join } = await import('node:path');
    const { copyFile, writeFile } = await import('node:fs/promises');

    const config = await loadLegacyHooks();
    const existing = config.hooks.find(h => h.name === args.name);

    const hookFileName = `${args.name}.mjs`;
    const destPath = join(process.cwd(), 'hooks', hookFileName);

    if (args.from) {
      // Install from URL or path
      if (args.from.startsWith('http://') || args.from.startsWith('https://')) {
        output.info(`Downloading from ${args.from}...`);
        const response = await fetch(args.from);
        if (!response.ok) {
          output.error(`Download failed: ${response.statusText}`);
          process.exit(1);
        }
        const content = await response.text();
        await writeFile(destPath, content, 'utf8');
      } else {
        if (!(await exists(args.from))) {
          output.error(`File not found: ${args.from}`);
          process.exit(1);
        }
        await copyFile(args.from, destPath);
      }
    } else {
      // Create template
      const template = `#!/usr/bin/env node
/**
 * ${args.name} - ${args.type} Hook
 */

import { readFileSync } from 'fs';

let input;
try {
  const stdinData = readFileSync(0, 'utf8');
  input = JSON.parse(stdinData);
} catch {
  process.exit(0);
}

const prompt = input.prompt || '';

// TODO: Implement hook logic

const output = {
  hookSpecificOutput: {
    hookEventName: '${args.type}',
    additionalContext: ''
  }
};

console.log(JSON.stringify(output));
process.exit(0);
`;
      await writeFile(destPath, template, 'utf8');
    }

    // Update config
    if (existing) {
      existing.path = `./${hookFileName}`;
      existing.type = args.type;
    } else {
      config.hooks.push({
        name: args.name,
        type: args.type,
        enabled: true,
        path: `./${hookFileName}`,
        description: 'Custom hook',
      });
    }

    await saveLegacyHooks(config);
    output.success(`Installed legacy hook "${args.name}"`);
  },
});

const enableLegacyCommand = defineCommand({
  meta: {
    name: 'enable-legacy',
    description: 'Enable a legacy hook',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Hook name',
      required: true,
    },
  },
  async run({ args }) {
    const config = await loadLegacyHooks();
    const hook = config.hooks.find(h => h.name === args.name);

    if (!hook) {
      output.error(`Hook "${args.name}" not found`);
      process.exit(1);
    }

    hook.enabled = true;
    await saveLegacyHooks(config);
    output.success(`Enabled "${args.name}"`);
  },
});

const disableLegacyCommand = defineCommand({
  meta: {
    name: 'disable-legacy',
    description: 'Disable a legacy hook',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Hook name',
      required: true,
    },
  },
  async run({ args }) {
    const config = await loadLegacyHooks();
    const hook = config.hooks.find(h => h.name === args.name);

    if (!hook) {
      output.error(`Hook "${args.name}" not found`);
      process.exit(1);
    }

    hook.enabled = false;
    await saveLegacyHooks(config);
    output.success(`Disabled "${args.name}"`);
  },
});

const infoLegacyCommand = defineCommand({
  meta: {
    name: 'info-legacy',
    description: 'Show legacy hook details',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Hook name',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const { join } = await import('node:path');
    const config = await loadLegacyHooks();
    const hook = config.hooks.find(h => h.name === args.name);

    if (!hook) {
      output.error(`Hook "${args.name}" not found`);
      process.exit(1);
    }

    if (args.json) {
      output.json(hook);
      return;
    }

    output.header(hook.name);
    output.kv('Type', hook.type);
    output.kv('Status', hook.enabled ? 'enabled' : 'disabled');
    output.kv('Path', hook.path);
    if (hook.description) {
      output.kv('Description', hook.description);
    }

    // Try to read hook file
    const hookPath = join(process.cwd(), 'hooks', hook.path);
    if (await exists(hookPath)) {
      const content = await readFile(hookPath);
      const lines = content.split('\n').slice(0, 20);
      const docLines = lines.filter(l => l.trim().startsWith('*') || l.trim().startsWith('//'));

      if (docLines.length > 0) {
        console.log();
        output.header('Documentation');
        for (const line of docLines.slice(0, 10)) {
          const cleaned = line.trim().replace(/^[*/]+\s*/, '');
          if (cleaned) {
            console.log(output.dim(cleaned));
          }
        }
      }
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
    add: addCommand,
    sync: syncCommand,
    'legacy-list': legacyListCommand,
    'legacy-install': installLegacyCommand,
    'legacy-enable': enableLegacyCommand,
    'legacy-disable': disableLegacyCommand,
    'legacy-info': infoLegacyCommand,
  },
  run() {
    console.log('Available subcommands:');
    console.log();
    console.log('Hook management:');
    console.log('  list              List active hooks');
    console.log('  debug <tool>      Debug hook execution for a specific tool');
    console.log('  test <handler>    Test a hook handler with sample input');
    console.log('  add               Generate a hook using AI');
    console.log('  sync              Sync hooks to Claude Code');
    console.log();
    console.log('Legacy hooks.json:');
    console.log('  legacy-list       List hooks from hooks/hooks.json');
    console.log('  legacy-install    Install a hook to hooks.json');
    console.log('  legacy-enable     Enable a legacy hook');
    console.log('  legacy-disable    Disable a legacy hook');
    console.log('  legacy-info       Show legacy hook details');
    console.log();
    console.log('Run "cops hook <command> --help" for more information on a command.');
  },
});
