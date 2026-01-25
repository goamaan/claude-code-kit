/**
 * MCP Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  createMcpManager,
  McpServerNotFoundError,
  McpServerExistsError,
} from './manager.js';
import type { McpServerState, McpSettings } from '@/types/index.js';

describe('McpManager', () => {
  let tempDir: string;
  let claudeDir: string;
  let configDir: string;

  beforeEach(async () => {
    // Create temp directory structure
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-manager-test-'));
    claudeDir = path.join(tempDir, 'claude');
    configDir = path.join(tempDir, 'config');

    // Create directory structure
    await fs.mkdir(claudeDir, { recursive: true });
    await fs.mkdir(path.join(configDir, 'cache'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to write settings file
   */
  async function writeSettings(settings: McpSettings) {
    await fs.writeFile(
      path.join(claudeDir, 'claude_desktop_config.json'),
      JSON.stringify(settings, null, 2)
    );
  }

  /**
   * Helper to write state file
   */
  async function writeState(state: Record<string, Partial<McpServerState>>) {
    await fs.writeFile(
      path.join(configDir, 'cache', 'mcp-servers.json'),
      JSON.stringify(state, null, 2)
    );
  }

  /**
   * Helper to read settings file
   */
  async function readSettings(): Promise<McpSettings> {
    const content = await fs.readFile(
      path.join(claudeDir, 'claude_desktop_config.json'),
      'utf-8'
    );
    return JSON.parse(content);
  }

  /**
   * Helper to read state file
   */
  async function readState(): Promise<Record<string, Partial<McpServerState>>> {
    const content = await fs.readFile(
      path.join(configDir, 'cache', 'mcp-servers.json'),
      'utf-8'
    );
    return JSON.parse(content);
  }

  describe('list', () => {
    it('returns empty array when no servers configured', async () => {
      await writeSettings({ mcpServers: {} });

      const manager = createMcpManager({ claudeDir, configDir });
      const servers = await manager.list();

      expect(servers).toEqual([]);
    });

    it('returns servers from settings', async () => {
      const settings: McpSettings = {
        mcpServers: {
          github: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
          },
          filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem'],
          },
        },
      };

      await writeSettings(settings);

      const manager = createMcpManager({ claudeDir, configDir });
      const servers = await manager.list();

      expect(servers).toHaveLength(2);
      expect(servers.map((s) => s.name).sort()).toEqual(['filesystem', 'github']);
    });

    it('merges server state with config', async () => {
      const settings: McpSettings = {
        mcpServers: {
          github: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
          },
        },
      };

      const state: Record<string, Partial<McpServerState>> = {
        github: {
          status: 'running',
          requestCount: 5,
          startedAt: '2024-01-01T00:00:00Z',
        },
      };

      await writeSettings(settings);
      await writeState(state);

      const manager = createMcpManager({ claudeDir, configDir });
      const servers = await manager.list();

      expect(servers[0]).toMatchObject({
        name: 'github',
        status: 'running',
        requestCount: 5,
      });
    });
  });

  describe('get', () => {
    it('returns null for non-existent server', async () => {
      await writeSettings({ mcpServers: {} });

      const manager = createMcpManager({ claudeDir, configDir });
      const server = await manager.get('nonexistent');

      expect(server).toBeNull();
    });

    it('returns server by name', async () => {
      const settings: McpSettings = {
        mcpServers: {
          github: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
          },
        },
      };

      await writeSettings(settings);

      const manager = createMcpManager({ claudeDir, configDir });
      const server = await manager.get('github');

      expect(server).not.toBeNull();
      expect(server?.name).toBe('github');
    });
  });

  describe('enable', () => {
    it('throws error for non-existent server', async () => {
      await writeSettings({ mcpServers: {} });

      const manager = createMcpManager({ claudeDir, configDir });

      await expect(manager.enable('nonexistent')).rejects.toThrow(
        McpServerNotFoundError
      );
    });

    it('enables a disabled server', async () => {
      const settings: McpSettings = {
        mcpServers: {
          github: { command: 'npx', args: [] },
        },
      };

      const state: Record<string, Partial<McpServerState>> = {
        github: { status: 'disabled' },
      };

      await writeSettings(settings);
      await writeState(state);

      const manager = createMcpManager({ claudeDir, configDir });
      await manager.enable('github');

      const updatedState = await readState();
      expect(updatedState['github']?.status).toBe('stopped');
    });
  });

  describe('disable', () => {
    it('throws error for non-existent server', async () => {
      await writeSettings({ mcpServers: {} });

      const manager = createMcpManager({ claudeDir, configDir });

      await expect(manager.disable('nonexistent')).rejects.toThrow(
        McpServerNotFoundError
      );
    });

    it('disables a running server', async () => {
      const settings: McpSettings = {
        mcpServers: {
          github: { command: 'npx', args: [] },
        },
      };

      const state: Record<string, Partial<McpServerState>> = {
        github: { status: 'running' },
      };

      await writeSettings(settings);
      await writeState(state);

      const manager = createMcpManager({ claudeDir, configDir });
      await manager.disable('github');

      const updatedState = await readState();
      expect(updatedState['github']?.status).toBe('disabled');
    });
  });

  describe('configure', () => {
    it('throws error for non-existent server', async () => {
      await writeSettings({ mcpServers: {} });

      const manager = createMcpManager({ claudeDir, configDir });

      await expect(
        manager.configure('nonexistent', { command: 'new-cmd' })
      ).rejects.toThrow(McpServerNotFoundError);
    });

    it('updates server configuration', async () => {
      const settings: McpSettings = {
        mcpServers: {
          github: { command: 'npx', args: ['old-args'] },
        },
      };

      await writeSettings(settings);

      const manager = createMcpManager({ claudeDir, configDir });
      await manager.configure('github', { args: ['new-args'] });

      const updatedSettings = await readSettings();
      expect(updatedSettings.mcpServers?.['github']?.args).toEqual(['new-args']);
    });
  });

  describe('add', () => {
    it('throws error if server already exists', async () => {
      const settings: McpSettings = {
        mcpServers: {
          github: { command: 'npx', args: [] },
        },
      };

      await writeSettings(settings);

      const manager = createMcpManager({ claudeDir, configDir });

      await expect(
        manager.add('github', { command: 'new-cmd', enabled: true })
      ).rejects.toThrow(McpServerExistsError);
    });

    it('adds a new server', async () => {
      await writeSettings({ mcpServers: {} });

      const manager = createMcpManager({ claudeDir, configDir });
      await manager.add('github', {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        enabled: true,
      });

      const updatedSettings = await readSettings();
      expect(updatedSettings.mcpServers?.['github']).toMatchObject({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
      });

      const state = await readState();
      expect(state['github']?.status).toBe('stopped');
    });

    it('adds server as disabled when enabled is false', async () => {
      await writeSettings({ mcpServers: {} });

      const manager = createMcpManager({ claudeDir, configDir });
      await manager.add('github', {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        enabled: false,
      });

      const state = await readState();
      expect(state['github']?.status).toBe('disabled');
    });
  });

  describe('remove', () => {
    it('throws error for non-existent server', async () => {
      await writeSettings({ mcpServers: {} });

      const manager = createMcpManager({ claudeDir, configDir });

      await expect(manager.remove('nonexistent')).rejects.toThrow(
        McpServerNotFoundError
      );
    });

    it('removes a server', async () => {
      const settings: McpSettings = {
        mcpServers: {
          github: { command: 'npx', args: [] },
          filesystem: { command: 'npx', args: [] },
        },
      };

      await writeSettings(settings);
      await writeState({ github: {}, filesystem: {} });

      const manager = createMcpManager({ claudeDir, configDir });
      await manager.remove('github');

      const updatedSettings = await readSettings();
      expect(updatedSettings.mcpServers?.['github']).toBeUndefined();
      expect(updatedSettings.mcpServers?.['filesystem']).toBeDefined();

      const updatedState = await readState();
      expect(updatedState['github']).toBeUndefined();
      expect(updatedState['filesystem']).toBeDefined();
    });
  });

  describe('budget', () => {
    it('returns budget summary for all servers', async () => {
      const settings: McpSettings = {
        mcpServers: {
          github: { command: 'npx', args: [] },
          filesystem: { command: 'npx', args: [] },
        },
      };

      await writeSettings(settings);

      const manager = createMcpManager({ claudeDir, configDir });
      const budget = await manager.budget();

      expect(budget).toMatchObject({
        serverName: 'all',
        totalRequests: 0,
        budgetExceeded: false,
      });
      expect(budget.tokensUsed).toBeGreaterThan(0);
    });
  });

  describe('budgetPerServer', () => {
    it('returns per-server budget summaries', async () => {
      const settings: McpSettings = {
        mcpServers: {
          github: { command: 'npx', args: [] },
          filesystem: { command: 'npx', args: [] },
        },
      };

      await writeSettings(settings);

      const manager = createMcpManager({ claudeDir, configDir });
      const budgets = await manager.budgetPerServer();

      expect(budgets).toHaveLength(2);
      expect(budgets.map((b) => b.serverName).sort()).toEqual([
        'filesystem',
        'github',
      ]);
    });
  });
});
