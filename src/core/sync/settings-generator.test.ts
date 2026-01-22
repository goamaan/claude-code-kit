/**
 * Settings Generator Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateSettings,
  mergeSettings,
  validateSettings,
  serializeSettings,
  parseSettings,
  createDefaultSettings,
  getApiModelId,
  type GeneratedSettings,
} from './settings-generator.js';
import type { MergedConfig, MergedSetup, InstalledAddon, ComposedHooks } from '@/types';
import { createEmptyHooks } from '@/domain/hook/composer.js';
import { DEFAULT_MERGED_CONFIG } from '@/types';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestConfig(overrides: Partial<MergedConfig> = {}): MergedConfig {
  return {
    ...DEFAULT_MERGED_CONFIG,
    ...overrides,
  };
}

function createTestSetup(overrides: Partial<MergedSetup> = {}): MergedSetup {
  return {
    name: 'test-setup',
    version: '1.0.0',
    description: 'Test setup',
    requires: {
      addons: [],
    },
    skills: {
      enabled: [],
      disabled: [],
    },
    agents: {},
    mcp: {
      recommended: [],
      required: [],
    },
    hooks: {
      templates: [],
    },
    commands: {},
    content: '',
    sources: [],
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('settings-generator', () => {
  // ===========================================================================
  // getApiModelId
  // ===========================================================================

  describe('getApiModelId', () => {
    it('should return correct API ID for haiku', () => {
      expect(getApiModelId('haiku')).toBe('claude-3-haiku-20240307');
    });

    it('should return correct API ID for sonnet', () => {
      expect(getApiModelId('sonnet')).toBe('claude-3-5-sonnet-20241022');
    });

    it('should return correct API ID for opus', () => {
      expect(getApiModelId('opus')).toBe('claude-3-opus-20240229');
    });
  });

  // ===========================================================================
  // generateSettings
  // ===========================================================================

  describe('generateSettings', () => {
    it('should generate settings with model', () => {
      const config = createTestConfig();
      const setup = createTestSetup();
      const addons: InstalledAddon[] = [];
      const hooks = createEmptyHooks();

      const result = generateSettings(config, setup, addons, hooks);

      expect(result.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should use model override when provided', () => {
      const config = createTestConfig();
      const setup = createTestSetup();
      const addons: InstalledAddon[] = [];
      const hooks = createEmptyHooks();

      const result = generateSettings(config, setup, addons, hooks, {
        modelOverride: 'opus',
      });

      expect(result.model).toBe('claude-3-opus-20240229');
    });

    it('should include metadata with profile and setup info', () => {
      const config = createTestConfig({
        profile: { name: 'my-profile', source: 'global' },
      });
      const setup = createTestSetup({ name: 'my-setup' });
      const addons: InstalledAddon[] = [];
      const hooks = createEmptyHooks();

      const result = generateSettings(config, setup, addons, hooks);

      expect(result.metadata).toBeDefined();
      const claudeKitMeta = result.metadata!['claude-kit'] as Record<string, unknown>;
      expect(claudeKitMeta['profile']).toBe('my-profile');
      expect(claudeKitMeta['setup']).toBe('my-setup');
    });

    it('should skip hooks when includeHooks is false', () => {
      const config = createTestConfig();
      const setup = createTestSetup();
      const addons: InstalledAddon[] = [];
      const hooks: ComposedHooks = {
        PreToolUse: [{
          name: 'test',
          matcher: 'test',
          matchType: 'exact',
          priority: 0,
          enabled: true,
          source: 'test',
          handle: () => ({ action: 'continue' }),
        }],
        PostToolUse: [],
        Stop: [],
        SubagentStop: [],
      };

      const result = generateSettings(config, setup, addons, hooks, {
        includeHooks: false,
      });

      expect(result.hooks).toBeUndefined();
    });

    it('should include MCP servers from required in setup', () => {
      const config = createTestConfig();
      const setup = createTestSetup({
        mcp: {
          recommended: [],
          required: ['filesystem', 'memory'],
        },
      });
      const addons: InstalledAddon[] = [];
      const hooks = createEmptyHooks();

      const result = generateSettings(config, setup, addons, hooks);

      expect(result.mcpServers).toBeDefined();
      expect(result.mcpServers!['filesystem']).toBeDefined();
      expect(result.mcpServers!['memory']).toBeDefined();
    });

    it('should skip disabled MCP servers', () => {
      const config = createTestConfig({
        mcp: {
          enabled: [],
          disabled: ['filesystem'],
        },
      });
      const setup = createTestSetup({
        mcp: {
          recommended: [],
          required: ['filesystem', 'memory'],
        },
      });
      const addons: InstalledAddon[] = [];
      const hooks = createEmptyHooks();

      const result = generateSettings(config, setup, addons, hooks);

      expect(result.mcpServers!['filesystem']).toBeUndefined();
      expect(result.mcpServers!['memory']).toBeDefined();
    });

    it('should merge with existing settings', () => {
      const config = createTestConfig();
      const setup = createTestSetup();
      const addons: InstalledAddon[] = [];
      const hooks = createEmptyHooks();
      const existing: GeneratedSettings = {
        temperature: 0.7,
        maxTokens: 4096,
      };

      const result = generateSettings(config, setup, addons, hooks, {
        mergeWith: existing,
      });

      expect(result.temperature).toBe(0.7);
      expect(result.maxTokens).toBe(4096);
    });
  });

  // ===========================================================================
  // mergeSettings
  // ===========================================================================

  describe('mergeSettings', () => {
    it('should override simple values', () => {
      const base: GeneratedSettings = {
        model: 'claude-3-haiku-20240307',
        temperature: 0.5,
      };
      const override: GeneratedSettings = {
        model: 'claude-3-opus-20240229',
      };

      const result = mergeSettings(base, override);

      expect(result.model).toBe('claude-3-opus-20240229');
      expect(result.temperature).toBe(0.5);
    });

    it('should merge hooks', () => {
      const base: GeneratedSettings = {
        hooks: {
          PreToolUse: [{ matcher: 'a', handler: 'a.ts' }],
        },
      };
      const override: GeneratedSettings = {
        hooks: {
          PreToolUse: [{ matcher: 'b', handler: 'b.ts' }],
        },
      };

      const result = mergeSettings(base, override);

      expect(result.hooks!.PreToolUse).toHaveLength(2);
    });

    it('should merge MCP servers', () => {
      const base: GeneratedSettings = {
        mcpServers: {
          'server-a': { command: 'a' },
        },
      };
      const override: GeneratedSettings = {
        mcpServers: {
          'server-b': { command: 'b' },
        },
      };

      const result = mergeSettings(base, override);

      expect(result.mcpServers!['server-a']).toBeDefined();
      expect(result.mcpServers!['server-b']).toBeDefined();
    });

    it('should merge permissions', () => {
      const base: GeneratedSettings = {
        permissions: {
          allowFileRead: true,
        },
      };
      const override: GeneratedSettings = {
        permissions: {
          allowFileWrite: true,
        },
      };

      const result = mergeSettings(base, override);

      expect(result.permissions!.allowFileRead).toBe(true);
      expect(result.permissions!.allowFileWrite).toBe(true);
    });

    it('should merge metadata', () => {
      const base: GeneratedSettings = {
        metadata: { key1: 'value1' },
      };
      const override: GeneratedSettings = {
        metadata: { key2: 'value2' },
      };

      const result = mergeSettings(base, override);

      expect(result.metadata!['key1']).toBe('value1');
      expect(result.metadata!['key2']).toBe('value2');
    });
  });

  // ===========================================================================
  // validateSettings
  // ===========================================================================

  describe('validateSettings', () => {
    it('should pass validation for valid settings', () => {
      const settings: GeneratedSettings = {
        model: 'claude-3-5-sonnet-20241022',
      };

      const result = validateSettings(settings);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn when no model specified', () => {
      const settings: GeneratedSettings = {};

      const result = validateSettings(settings);

      expect(result.warnings.some(w => w.includes('model'))).toBe(true);
    });

    it('should warn for non-Claude model identifier', () => {
      const settings: GeneratedSettings = {
        model: 'gpt-4',
      };

      const result = validateSettings(settings);

      expect(result.warnings.some(w => w.includes('model'))).toBe(true);
    });

    it('should warn when API key is present', () => {
      const settings: GeneratedSettings = {
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-xxx',
      };

      const result = validateSettings(settings);

      expect(result.warnings.some(w => w.includes('API key'))).toBe(true);
    });

    it('should error for hooks with missing matcher', () => {
      const settings: GeneratedSettings = {
        hooks: {
          PreToolUse: [
            { matcher: '', handler: 'handler.ts' },
          ],
        },
      };

      const result = validateSettings(settings);

      expect(result.errors.some(e => e.includes('matcher'))).toBe(true);
    });

    it('should error for hooks with missing handler', () => {
      const settings: GeneratedSettings = {
        hooks: {
          PreToolUse: [
            { matcher: 'test', handler: '' },
          ],
        },
      };

      const result = validateSettings(settings);

      expect(result.errors.some(e => e.includes('handler'))).toBe(true);
    });
  });

  // ===========================================================================
  // serializeSettings / parseSettings
  // ===========================================================================

  describe('serializeSettings', () => {
    it('should serialize to pretty JSON by default', () => {
      const settings: GeneratedSettings = {
        model: 'claude-3-5-sonnet-20241022',
      };

      const result = serializeSettings(settings);

      expect(result).toContain('\n');
      expect(result).toContain('  ');
    });

    it('should serialize to compact JSON when pretty is false', () => {
      const settings: GeneratedSettings = {
        model: 'claude-3-5-sonnet-20241022',
      };

      const result = serializeSettings(settings, false);

      expect(result).not.toContain('\n');
    });
  });

  describe('parseSettings', () => {
    it('should parse JSON string to settings', () => {
      const json = '{"model": "claude-3-5-sonnet-20241022"}';

      const result = parseSettings(json);

      expect(result.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should handle complex settings', () => {
      const settings: GeneratedSettings = {
        model: 'claude-3-5-sonnet-20241022',
        hooks: {
          PreToolUse: [{ matcher: 'test', handler: 'test.ts' }],
        },
        mcpServers: {
          'filesystem': { command: 'npx', args: ['@modelcontextprotocol/filesystem'] },
        },
      };
      const json = JSON.stringify(settings);

      const result = parseSettings(json);

      expect(result.model).toBe(settings.model);
      expect(result.hooks!.PreToolUse).toHaveLength(1);
      expect(result.mcpServers!['filesystem']).toBeDefined();
    });
  });

  // ===========================================================================
  // createDefaultSettings
  // ===========================================================================

  describe('createDefaultSettings', () => {
    it('should create settings with default model', () => {
      const result = createDefaultSettings();

      expect(result.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should include metadata', () => {
      const result = createDefaultSettings();

      expect(result.metadata).toBeDefined();
      expect(result.metadata!['claude-kit']).toBeDefined();
    });
  });
});
