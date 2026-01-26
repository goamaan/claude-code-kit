/**
 * MCP server management commands
 * cops mcp list|enable|disable|budget
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { loadConfig } from '../core/config/loader.js';
import { getClaudeDir } from '../utils/paths.js';
import { exists, readFile, writeFile } from '../utils/fs.js';
import { join } from 'node:path';
import type { McpSettings } from '../types/mcp.js';

// =============================================================================
// Helper Functions
// =============================================================================

async function loadMcpSettings(): Promise<McpSettings> {
  const settingsPath = join(getClaudeDir(), 'claude_desktop_config.json');

  if (!(await exists(settingsPath))) {
    return { mcpServers: {} };
  }

  try {
    const content = await readFile(settingsPath);
    return JSON.parse(content) as McpSettings;
  } catch {
    return { mcpServers: {} };
  }
}

async function saveMcpSettings(settings: McpSettings): Promise<void> {
  const settingsPath = join(getClaudeDir(), 'claude_desktop_config.json');
  await writeFile(settingsPath, JSON.stringify(settings, null, 2));
}

// =============================================================================
// List MCP Servers
// =============================================================================

const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List MCP servers',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
    all: {
      type: 'boolean',
      alias: 'a',
      description: 'Include disabled servers',
      default: true,
    },
  },
  async run({ args }) {
    const settings = await loadMcpSettings();
    const config = await loadConfig();

    const servers = settings.mcpServers ?? {};
    const serverNames = Object.keys(servers);

    if (args.json) {
      output.json({
        servers,
        enabled: config.mcp.enabled,
        disabled: config.mcp.disabled,
      });
      return;
    }

    if (serverNames.length === 0) {
      output.info('No MCP servers configured.');
      output.info('Configure servers in ~/.claude/claude_desktop_config.json');
      return;
    }

    output.header('MCP Servers');

    const enabledSet = new Set(config.mcp.enabled);
    const disabledSet = new Set(config.mcp.disabled);

    output.table(
      serverNames.map(name => {
        const server = servers[name]!;
        let status = 'active';
        if (disabledSet.has(name)) {
          status = 'disabled';
        } else if (enabledSet.has(name)) {
          status = 'enabled';
        }

        return {
          name,
          command: output.truncate(server.command, 30),
          args: server.args?.join(' ') ?? '-',
          status,
        };
      }),
      [
        { key: 'name', header: 'Name', width: 20 },
        { key: 'command', header: 'Command', width: 30 },
        { key: 'args', header: 'Args', width: 25 },
        { key: 'status', header: 'Status', width: 10 },
      ]
    );

    console.log();
    output.dim('Manage via profile or project config with [mcp] section');
  },
});

// =============================================================================
// Enable MCP Server
// =============================================================================

const enableCommand = defineCommand({
  meta: {
    name: 'enable',
    description: 'Enable an MCP server',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Server name to enable',
      required: true,
    },
  },
  async run({ args }) {
    const settings = await loadMcpSettings();
    const servers = settings.mcpServers ?? {};

    if (!servers[args.name]) {
      output.error(`MCP server not found: ${args.name}`);
      output.info('List available servers with: ck mcp list');
      process.exit(1);
    }

    output.info('To enable/disable MCP servers, update your profile or project config:');
    console.log();
    output.box([
      '[mcp]',
      `enabled = ["${args.name}"]`,
      '# or',
      `disabled = ["other-server"]`,
    ], 'config.toml');
    console.log();
    output.info('Then run: ck sync');
  },
});

// =============================================================================
// Disable MCP Server
// =============================================================================

const disableCommand = defineCommand({
  meta: {
    name: 'disable',
    description: 'Disable an MCP server',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Server name to disable',
      required: true,
    },
  },
  async run({ args }) {
    const settings = await loadMcpSettings();
    const servers = settings.mcpServers ?? {};

    if (!servers[args.name]) {
      output.error(`MCP server not found: ${args.name}`);
      output.info('List available servers with: ck mcp list');
      process.exit(1);
    }

    output.info('To enable/disable MCP servers, update your profile or project config:');
    console.log();
    output.box([
      '[mcp]',
      `disabled = ["${args.name}"]`,
    ], 'config.toml');
    console.log();
    output.info('Then run: ck sync');
  },
});

// =============================================================================
// Budget Command
// =============================================================================

const budgetCommand = defineCommand({
  meta: {
    name: 'budget',
    description: 'Show MCP context budget',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const settings = await loadMcpSettings();
    const servers = settings.mcpServers ?? {};
    const serverCount = Object.keys(servers).length;

    // Estimate context usage per server (rough estimates)
    const TOKENS_PER_SERVER_BASE = 500; // Base overhead
    const TOKENS_PER_TOOL = 200; // Per tool definition
    const ESTIMATED_TOOLS_PER_SERVER = 5;

    const estimatedTokens = serverCount * (TOKENS_PER_SERVER_BASE + TOKENS_PER_TOOL * ESTIMATED_TOOLS_PER_SERVER);

    const budget = {
      servers: serverCount,
      estimatedTokens,
      percentOfContext: (estimatedTokens / 200000 * 100).toFixed(1), // Assuming 200k context
      recommendation: serverCount > 10 ? 'Consider reducing active servers' : 'OK',
    };

    if (args.json) {
      output.json(budget);
      return;
    }

    output.header('MCP Context Budget');

    output.kv('Active servers', serverCount.toString());
    output.kv('Estimated tokens', `~${estimatedTokens.toLocaleString()}`);
    output.kv('Context usage', `~${budget.percentOfContext}% of 200k`);

    console.log();

    if (serverCount > 10) {
      output.warn('Many active servers may impact context window and performance');
      output.info('Consider disabling unused servers in your profile config');
    } else if (serverCount > 5) {
      output.info('Moderate number of servers - monitor context usage');
    } else {
      output.success('Context budget looks healthy');
    }
  },
});

// =============================================================================
// Info Command
// =============================================================================

const infoCommand = defineCommand({
  meta: {
    name: 'info',
    description: 'Show details for an MCP server',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Server name',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const settings = await loadMcpSettings();
    const servers = settings.mcpServers ?? {};
    const server = servers[args.name];

    if (!server) {
      output.error(`MCP server not found: ${args.name}`);
      output.info('List available servers with: ck mcp list');
      process.exit(1);
    }

    if (args.json) {
      output.json({ name: args.name, ...server });
      return;
    }

    output.header(`MCP Server: ${args.name}`);

    output.kv('Command', server.command);
    if (server.args && server.args.length > 0) {
      output.kv('Arguments', server.args.join(' '));
    }

    if (server.env && Object.keys(server.env).length > 0) {
      console.log();
      output.label('Environment Variables:', '');
      for (const [key, value] of Object.entries(server.env)) {
        // Mask sensitive values
        const maskedValue = key.toLowerCase().includes('key') ||
                          key.toLowerCase().includes('secret') ||
                          key.toLowerCase().includes('token')
          ? '***' + value.slice(-4)
          : value;
        output.kv(`  ${key}`, maskedValue, 2);
      }
    }
  },
});

// =============================================================================
// Add Command
// =============================================================================

const addCommand = defineCommand({
  meta: {
    name: 'add',
    description: 'Add a new MCP server',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Server name',
      required: true,
    },
    command: {
      type: 'string',
      alias: 'c',
      description: 'Command to run',
      required: true,
    },
    args: {
      type: 'string',
      alias: 'a',
      description: 'Command arguments (space-separated)',
    },
  },
  async run({ args }) {
    const settings = await loadMcpSettings();

    if (!settings.mcpServers) {
      settings.mcpServers = {};
    }

    if (settings.mcpServers[args.name]) {
      output.error(`Server already exists: ${args.name}`);
      process.exit(1);
    }

    const serverConfig: { command: string; args?: string[]; env?: Record<string, string> } = {
      command: args.command,
    };

    if (args.args) {
      serverConfig.args = args.args.split(' ').filter(Boolean);
    }

    settings.mcpServers[args.name] = serverConfig;
    await saveMcpSettings(settings);

    output.success(`Added MCP server: ${args.name}`);
    output.info('Restart Claude Code for changes to take effect');
  },
});

// =============================================================================
// Remove Command
// =============================================================================

const removeCommand = defineCommand({
  meta: {
    name: 'remove',
    description: 'Remove an MCP server',
  },
  args: {
    name: {
      type: 'positional',
      description: 'Server name to remove',
      required: true,
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Skip confirmation',
      default: false,
    },
  },
  async run({ args }) {
    const settings = await loadMcpSettings();

    if (!settings.mcpServers?.[args.name]) {
      output.error(`Server not found: ${args.name}`);
      process.exit(1);
    }

    if (!args.force) {
      const confirmed = await prompts.promptConfirm(
        `Remove MCP server "${args.name}"?`
      );
      prompts.handleCancel(confirmed);
      if (!confirmed) {
        output.info('Removal cancelled');
        return;
      }
    }

    delete settings.mcpServers[args.name];
    await saveMcpSettings(settings);

    output.success(`Removed MCP server: ${args.name}`);
    output.info('Restart Claude Code for changes to take effect');
  },
});

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'mcp',
    description: 'Manage MCP servers',
  },
  subCommands: {
    list: listCommand,
    info: infoCommand,
    add: addCommand,
    remove: removeCommand,
    enable: enableCommand,
    disable: disableCommand,
    budget: budgetCommand,
  },
});
