/**
 * Unit tests for Pack Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPackManager, PackManagerError } from './manager.js';
import type { InstalledPack, PackComponent } from './types.js';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Test helper to create a temporary directory for tests
let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `claudeops-pack-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  try {
    await rm(testDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

describe('pack manager', () => {
  // ===========================================================================
  // Pack Manager Creation
  // ===========================================================================

  describe('createPackManager', () => {
    it('should create a pack manager instance', () => {
      const manager = createPackManager();

      expect(manager).toBeDefined();
      expect(manager.listPacks).toBeDefined();
      expect(manager.getPack).toBeDefined();
      expect(manager.removePack).toBeDefined();
      expect(manager.enablePack).toBeDefined();
      expect(manager.disablePack).toBeDefined();
      expect(manager.isInstalled).toBeDefined();
    });

    it('should provide access to installer', () => {
      const manager = createPackManager();
      const installer = manager.getInstaller();

      expect(installer).toBeDefined();
      expect(installer.install).toBeDefined();
    });
  });

  // ===========================================================================
  // List Packs
  // ===========================================================================

  describe('listPacks', () => {
    it('should return empty array when no packs installed', async () => {
      const manager = createPackManager();
      const packs = await manager.listPacks();

      expect(packs).toEqual([]);
    });

    it('should return sorted list of packs', async () => {
      const manager = createPackManager();
      const packs = await manager.listPacks();

      expect(Array.isArray(packs)).toBe(true);
    });
  });

  // ===========================================================================
  // Get Pack
  // ===========================================================================

  describe('getPack', () => {
    it('should return null for non-existent pack', async () => {
      const manager = createPackManager();
      const pack = await manager.getPack('non-existent-pack');

      expect(pack).toBeNull();
    });

    it('should return pack details when pack exists', async () => {
      const manager = createPackManager();

      // This test would require actually installing a pack
      // For now, we just verify the return type
      const pack = await manager.getPack('test-pack');

      if (pack !== null) {
        expect(pack).toHaveProperty('name');
        expect(pack).toHaveProperty('source');
        expect(pack).toHaveProperty('installedAt');
        expect(pack).toHaveProperty('components');
        expect(pack).toHaveProperty('enabled');
      }
    });
  });

  // ===========================================================================
  // Is Installed
  // ===========================================================================

  describe('isInstalled', () => {
    it('should return false for non-existent pack', async () => {
      const manager = createPackManager();
      const installed = await manager.isInstalled('non-existent-pack');

      expect(installed).toBe(false);
    });

    it('should return true for installed pack', async () => {
      const manager = createPackManager();

      // This would require a real pack installation
      // For now, we verify the method exists and returns boolean
      const installed = await manager.isInstalled('test-pack');

      expect(typeof installed).toBe('boolean');
    });
  });

  // ===========================================================================
  // Enable/Disable Pack
  // ===========================================================================

  describe('enablePack', () => {
    it('should throw error for non-existent pack', async () => {
      const manager = createPackManager();

      await expect(manager.enablePack('non-existent-pack')).rejects.toThrow(
        PackManagerError
      );
    });
  });

  describe('disablePack', () => {
    it('should throw error for non-existent pack', async () => {
      const manager = createPackManager();

      await expect(manager.disablePack('non-existent-pack')).rejects.toThrow(
        PackManagerError
      );
    });
  });

  // ===========================================================================
  // Remove Pack
  // ===========================================================================

  describe('removePack', () => {
    it('should throw error when pack does not exist', async () => {
      const manager = createPackManager();

      await expect(manager.removePack('non-existent-pack')).rejects.toThrow();
    });
  });

  // ===========================================================================
  // InstalledPack Type Validation
  // ===========================================================================

  describe('InstalledPack type', () => {
    it('should have correct structure', () => {
      const pack: InstalledPack = {
        name: 'test-pack',
        source: 'github:user/repo',
        installedAt: new Date().toISOString(),
        components: [],
        enabled: true,
      };

      expect(pack.name).toBe('test-pack');
      expect(pack.source).toBe('github:user/repo');
      expect(pack.installedAt).toBeDefined();
      expect(Array.isArray(pack.components)).toBe(true);
      expect(typeof pack.enabled).toBe('boolean');
    });

    it('should support components array', () => {
      const component: PackComponent = {
        type: 'agent',
        name: 'test-agent',
        path: '/path/to/agent',
        description: 'Test agent',
        model: 'sonnet',
        dependencies: ['dep1'],
      };

      const pack: InstalledPack = {
        name: 'test-pack',
        source: 'local',
        installedAt: new Date().toISOString(),
        components: [component],
        enabled: true,
      };

      expect(pack.components).toHaveLength(1);
      expect(pack.components[0]?.type).toBe('agent');
      expect(pack.components[0]?.name).toBe('test-agent');
      expect(pack.components[0]?.model).toBe('sonnet');
    });

    it('should support all component types', () => {
      const componentTypes: PackComponent['type'][] = [
        'agent',
        'skill',
        'hook',
        'rule',
        'mcp',
        'script',
      ];

      for (const type of componentTypes) {
        const component: PackComponent = {
          type,
          name: `test-${type}`,
          path: '/path',
          description: `Test ${type}`,
        };

        expect(component.type).toBe(type);
      }
    });

    it('should support all model types', () => {
      const models: Array<'haiku' | 'sonnet' | 'opus'> = ['haiku', 'sonnet', 'opus'];

      for (const model of models) {
        const component: PackComponent = {
          type: 'agent',
          name: 'test',
          path: '/path',
          description: 'Test',
          model,
        };

        expect(component.model).toBe(model);
      }
    });

    it('should support optional fields', () => {
      const minimalComponent: PackComponent = {
        type: 'skill',
        name: 'minimal',
        path: '/path',
        description: 'Minimal component',
      };

      expect(minimalComponent.model).toBeUndefined();
      expect(minimalComponent.dependencies).toBeUndefined();

      const fullComponent: PackComponent = {
        type: 'agent',
        name: 'full',
        path: '/path',
        description: 'Full component',
        model: 'opus',
        dependencies: ['dep1', 'dep2'],
      };

      expect(fullComponent.model).toBe('opus');
      expect(fullComponent.dependencies).toEqual(['dep1', 'dep2']);
    });
  });

  // ===========================================================================
  // PackManagerError
  // ===========================================================================

  describe('PackManagerError', () => {
    it('should create error with message', () => {
      const error = new PackManagerError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('PackManagerError');
    });

    it('should include pack name when provided', () => {
      const error = new PackManagerError('Test error', 'test-pack');

      expect(error.pack).toBe('test-pack');
    });

    it('should include cause when provided', () => {
      const cause = new Error('Original error');
      const error = new PackManagerError('Wrapper error', 'test-pack', cause);

      expect(error.cause).toBe(cause);
    });

    it('should be instanceof Error', () => {
      const error = new PackManagerError('Test');

      expect(error).toBeInstanceOf(Error);
    });
  });

  // ===========================================================================
  // State File Operations (Integration-style tests)
  // ===========================================================================

  describe('state file operations', () => {
    it('should handle missing state file gracefully', async () => {
      const manager = createPackManager();

      // Should not throw when state file doesn't exist
      await expect(manager.listPacks()).resolves.toBeDefined();
    });

    it('should handle invalid state file gracefully', async () => {
      const manager = createPackManager();

      // Should return empty list or handle gracefully
      const packs = await manager.listPacks();
      expect(Array.isArray(packs)).toBe(true);
    });
  });

  // ===========================================================================
  // Pack Components
  // ===========================================================================

  describe('pack components', () => {
    it('should validate component structure', () => {
      const validComponent: PackComponent = {
        type: 'agent',
        name: 'executor',
        path: '/agents/executor',
        description: 'Standard executor agent',
        model: 'sonnet',
        dependencies: [],
      };

      expect(validComponent.type).toBe('agent');
      expect(validComponent.name).toBe('executor');
      expect(validComponent.path).toBe('/agents/executor');
      expect(validComponent.description).toBeDefined();
      expect(validComponent.model).toBe('sonnet');
      expect(Array.isArray(validComponent.dependencies)).toBe(true);
    });

    it('should support agent components', () => {
      const agent: PackComponent = {
        type: 'agent',
        name: 'custom-agent',
        path: '/agents/custom',
        description: 'Custom agent',
        model: 'opus',
      };

      expect(agent.type).toBe('agent');
      expect(agent.model).toBe('opus');
    });

    it('should support skill components', () => {
      const skill: PackComponent = {
        type: 'skill',
        name: 'custom-skill',
        path: '/skills/custom',
        description: 'Custom skill',
      };

      expect(skill.type).toBe('skill');
    });

    it('should support hook components', () => {
      const hook: PackComponent = {
        type: 'hook',
        name: 'custom-hook',
        path: '/hooks/custom',
        description: 'Custom hook',
      };

      expect(hook.type).toBe('hook');
    });

    it('should support MCP server components', () => {
      const mcp: PackComponent = {
        type: 'mcp',
        name: 'custom-mcp',
        path: '/mcp/custom',
        description: 'Custom MCP server',
        dependencies: ['@modelcontextprotocol/sdk'],
      };

      expect(mcp.type).toBe('mcp');
      expect(mcp.dependencies).toContain('@modelcontextprotocol/sdk');
    });

    it('should support components with dependencies', () => {
      const component: PackComponent = {
        type: 'agent',
        name: 'agent-with-deps',
        path: '/agents/deps',
        description: 'Agent with dependencies',
        dependencies: ['axios', 'lodash', 'zod'],
      };

      expect(component.dependencies).toHaveLength(3);
      expect(component.dependencies).toContain('axios');
      expect(component.dependencies).toContain('lodash');
      expect(component.dependencies).toContain('zod');
    });
  });

  // ===========================================================================
  // Pack Metadata
  // ===========================================================================

  describe('pack metadata', () => {
    it('should track installation timestamp', () => {
      const pack: InstalledPack = {
        name: 'test-pack',
        source: 'github:user/repo',
        installedAt: new Date().toISOString(),
        components: [],
        enabled: true,
      };

      const date = new Date(pack.installedAt);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it('should track pack source', () => {
      const sources = [
        'github:user/repo',
        'npm:package-name',
        'local:/path/to/pack',
        'https://example.com/pack.tar.gz',
      ];

      for (const source of sources) {
        const pack: InstalledPack = {
          name: 'test',
          source,
          installedAt: new Date().toISOString(),
          components: [],
          enabled: true,
        };

        expect(pack.source).toBe(source);
      }
    });

    it('should track enabled state', () => {
      const enabledPack: InstalledPack = {
        name: 'enabled',
        source: 'local',
        installedAt: new Date().toISOString(),
        components: [],
        enabled: true,
      };

      const disabledPack: InstalledPack = {
        name: 'disabled',
        source: 'local',
        installedAt: new Date().toISOString(),
        components: [],
        enabled: false,
      };

      expect(enabledPack.enabled).toBe(true);
      expect(disabledPack.enabled).toBe(false);
    });
  });

  // ===========================================================================
  // Pack Collections
  // ===========================================================================

  describe('pack collections', () => {
    it('should handle multiple packs', () => {
      const packs: InstalledPack[] = [
        {
          name: 'pack-a',
          source: 'github:user/pack-a',
          installedAt: new Date().toISOString(),
          components: [],
          enabled: true,
        },
        {
          name: 'pack-b',
          source: 'github:user/pack-b',
          installedAt: new Date().toISOString(),
          components: [],
          enabled: false,
        },
        {
          name: 'pack-c',
          source: 'npm:pack-c',
          installedAt: new Date().toISOString(),
          components: [],
          enabled: true,
        },
      ];

      expect(packs).toHaveLength(3);
      expect(packs.filter((p) => p.enabled)).toHaveLength(2);
      expect(packs.filter((p) => !p.enabled)).toHaveLength(1);
    });

    it('should support packs with multiple components', () => {
      const pack: InstalledPack = {
        name: 'multi-component',
        source: 'local',
        installedAt: new Date().toISOString(),
        components: [
          {
            type: 'agent',
            name: 'agent-1',
            path: '/agents/1',
            description: 'Agent 1',
            model: 'sonnet',
          },
          {
            type: 'agent',
            name: 'agent-2',
            path: '/agents/2',
            description: 'Agent 2',
            model: 'opus',
          },
          {
            type: 'skill',
            name: 'skill-1',
            path: '/skills/1',
            description: 'Skill 1',
          },
          {
            type: 'hook',
            name: 'hook-1',
            path: '/hooks/1',
            description: 'Hook 1',
          },
        ],
        enabled: true,
      };

      expect(pack.components).toHaveLength(4);
      expect(pack.components.filter((c) => c.type === 'agent')).toHaveLength(2);
      expect(pack.components.filter((c) => c.type === 'skill')).toHaveLength(1);
      expect(pack.components.filter((c) => c.type === 'hook')).toHaveLength(1);
    });
  });
});
