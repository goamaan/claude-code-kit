/**
 * MCP Server Manager
 * High-level API for MCP server management operations
 */

import { join } from 'node:path';
import type {
  McpServerState,
  McpServerConfig,
  McpBudgetSummary,
  McpSettings,
  McpSettingsServer,
} from '@/types/index.js';
import { getClaudeDir, getGlobalConfigDir } from '@/utils/paths.js';
import {
  readJsonSafe,
  writeJson,
  exists,
} from '@/utils/fs.js';
import { CLAUDE_SETTINGS_FILE, MCP_SERVERS_FILE } from '@/utils/constants.js';
import { calculateBudget, calculatePerServerBudget } from './budget.js';

// =============================================================================
// Interface
// =============================================================================

export interface McpManagerOptions {
  /** Override Claude config directory (default: ~/.claude) */
  claudeDir?: string;
  /** Override claudeops config directory (default: ~/.claudeops) */
  configDir?: string;
}

export interface McpManager {
  /** List all MCP servers with their current state */
  list(): Promise<McpServerState[]>;

  /** Get a specific MCP server's state */
  get(name: string): Promise<McpServerState | null>;

  /** Enable an MCP server */
  enable(name: string): Promise<void>;

  /** Disable an MCP server */
  disable(name: string): Promise<void>;

  /** Configure an MCP server */
  configure(name: string, config: Partial<McpServerConfig>): Promise<void>;

  /** Get budget summary for all servers */
  budget(): Promise<McpBudgetSummary>;

  /** Get per-server budget summaries */
  budgetPerServer(): Promise<McpBudgetSummary[]>;

  /** Add a new MCP server */
  add(name: string, config: McpServerConfig): Promise<void>;

  /** Remove an MCP server */
  remove(name: string): Promise<void>;

  /** Reload MCP server configurations from disk */
  reload(): Promise<void>;
}

// =============================================================================
// Errors
// =============================================================================

export class McpServerNotFoundError extends Error {
  constructor(name: string) {
    super(`MCP server not found: ${name}`);
    this.name = 'McpServerNotFoundError';
  }
}

export class McpServerExistsError extends Error {
  constructor(name: string) {
    super(`MCP server already exists: ${name}`);
    this.name = 'McpServerExistsError';
  }
}

export class McpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpConfigError';
  }
}

// =============================================================================
// Internal Types
// =============================================================================

interface _McpServersConfig {
  mcpServers: Record<string, McpSettingsServer>;
}

// =============================================================================
// Implementation
// =============================================================================

export function createMcpManager(options?: McpManagerOptions): McpManager {
  // Cache for server states (currently unused but reserved for future optimization)
  // let _cachedServers: McpServerState[] | null = null;

  const claudeDir = options?.claudeDir ?? getClaudeDir();
  const configDir = options?.configDir ?? getGlobalConfigDir();

  /**
   * Get path to Claude settings file
   */
  function getSettingsPath(): string {
    return join(claudeDir, CLAUDE_SETTINGS_FILE);
  }

  /**
   * Get path to MCP servers state file (for claudeops tracking)
   */
  function getStatePath(): string {
    return join(configDir, 'cache', MCP_SERVERS_FILE);
  }

  /**
   * Load MCP settings from Claude config
   */
  async function loadSettings(): Promise<McpSettings> {
    const settingsPath = getSettingsPath();

    if (!(await exists(settingsPath))) {
      return { mcpServers: {} };
    }

    const settings = await readJsonSafe<McpSettings>(settingsPath);
    return settings ?? { mcpServers: {} };
  }

  /**
   * Save MCP settings to Claude config
   */
  async function saveSettings(settings: McpSettings): Promise<void> {
    const settingsPath = getSettingsPath();
    await writeJson(settingsPath, settings);
  }

  /**
   * Load server state tracking data
   */
  async function loadState(): Promise<Record<string, Partial<McpServerState>>> {
    const statePath = getStatePath();

    if (!(await exists(statePath))) {
      return {};
    }

    const state = await readJsonSafe<Record<string, Partial<McpServerState>>>(statePath);
    return state ?? {};
  }

  /**
   * Save server state tracking data
   */
  async function saveState(state: Record<string, Partial<McpServerState>>): Promise<void> {
    const statePath = getStatePath();
    await writeJson(statePath, state);
  }

  /**
   * Build server state from config and tracked state
   */
  function buildServerState(
    name: string,
    config: McpSettingsServer,
    trackedState?: Partial<McpServerState>
  ): McpServerState {
    // Determine status based on config and tracked state
    let status: McpServerState['status'] = 'stopped';

    if (trackedState?.status === 'disabled') {
      status = 'disabled';
    } else if (trackedState?.status === 'error') {
      status = 'error';
    } else if (trackedState?.status === 'running') {
      status = 'running';
    }

    return {
      name,
      status,
      requestCount: trackedState?.requestCount ?? 0,
      pid: trackedState?.pid,
      startedAt: trackedState?.startedAt,
      error: trackedState?.error,
      lastRequestAt: trackedState?.lastRequestAt,
      uptimeMs: trackedState?.uptimeMs,
    };
  }

  /**
   * List all MCP servers with their current state
   */
  async function list(): Promise<McpServerState[]> {
    const settings = await loadSettings();
    const state = await loadState();

    const servers: McpServerState[] = [];

    if (settings.mcpServers) {
      for (const [name, config] of Object.entries(settings.mcpServers)) {
        servers.push(buildServerState(name, config, state[name]));
      }
    }

    // Cache for quick lookups (currently unused)
    // _cachedServers = servers;

    return servers;
  }

  /**
   * Get a specific MCP server's state
   */
  async function get(name: string): Promise<McpServerState | null> {
    const servers = await list();
    return servers.find((s) => s.name === name) ?? null;
  }

  /**
   * Enable an MCP server
   */
  async function enable(name: string): Promise<void> {
    const server = await get(name);
    if (!server) {
      throw new McpServerNotFoundError(name);
    }

    const state = await loadState();
    state[name] = {
      ...state[name],
      status: 'stopped', // Will be started by Claude Code
    };
    await saveState(state);

    // Clear cache (currently unused)
    // _cachedServers = null;
  }

  /**
   * Disable an MCP server
   */
  async function disable(name: string): Promise<void> {
    const server = await get(name);
    if (!server) {
      throw new McpServerNotFoundError(name);
    }

    const state = await loadState();
    state[name] = {
      ...state[name],
      status: 'disabled',
    };
    await saveState(state);

    // Clear cache (currently unused)
    // _cachedServers = null;
  }

  /**
   * Configure an MCP server
   */
  async function configure(
    name: string,
    config: Partial<McpServerConfig>
  ): Promise<void> {
    const settings = await loadSettings();

    if (!settings.mcpServers?.[name]) {
      throw new McpServerNotFoundError(name);
    }

    // Update configuration
    const existingConfig = settings.mcpServers[name];
    settings.mcpServers[name] = {
      command: config.command ?? existingConfig.command,
      args: config.args ?? existingConfig.args,
      env: config.env ?? existingConfig.env,
    };

    await saveSettings(settings);

    // Clear cache (currently unused)
    // _cachedServers = null;
  }

  /**
   * Get budget summary for all servers
   */
  async function budget(): Promise<McpBudgetSummary> {
    const servers = await list();
    return calculateBudget(servers);
  }

  /**
   * Get per-server budget summaries
   */
  async function budgetPerServer(): Promise<McpBudgetSummary[]> {
    const servers = await list();
    return calculatePerServerBudget(servers);
  }

  /**
   * Add a new MCP server
   */
  async function add(name: string, config: McpServerConfig): Promise<void> {
    const settings = await loadSettings();

    if (settings.mcpServers?.[name]) {
      throw new McpServerExistsError(name);
    }

    // Initialize mcpServers if not present
    if (!settings.mcpServers) {
      settings.mcpServers = {};
    }

    // Add the server
    settings.mcpServers[name] = {
      command: config.command,
      args: config.args,
      env: config.env,
    };

    await saveSettings(settings);

    // Initialize state
    const state = await loadState();
    state[name] = {
      status: config.enabled === false ? 'disabled' : 'stopped',
      requestCount: 0,
    };
    await saveState(state);

    // Clear cache (currently unused)
    // _cachedServers = null;
  }

  /**
   * Remove an MCP server
   */
  async function remove(name: string): Promise<void> {
    const settings = await loadSettings();

    if (!settings.mcpServers?.[name]) {
      throw new McpServerNotFoundError(name);
    }

    // Remove from settings
    delete settings.mcpServers[name];
    await saveSettings(settings);

    // Remove from state
    const state = await loadState();
    delete state[name];
    await saveState(state);

    // Clear cache (currently unused)
    // _cachedServers = null;
  }

  /**
   * Reload MCP server configurations from disk
   */
  async function reload(): Promise<void> {
    // _cachedServers = null;
    await list();
  }

  return {
    list,
    get,
    enable,
    disable,
    configure,
    budget,
    budgetPerServer,
    add,
    remove,
    reload,
  };
}
