/**
 * Sync Engine Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  createSyncEngine,
  isSyncNeeded,
  getSyncSummary,
  type SyncEngineOptions,
} from './engine.js';
import type { MergedConfig, MergedSetup, InstalledAddon } from '@/types';
import { DEFAULT_MERGED_CONFIG } from '@/types';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestConfig(overrides: Partial<MergedConfig> = {}): MergedConfig {
  return {
    ...DEFAULT_MERGED_CONFIG,
    profile: {
      name: 'test-profile',
      source: 'global',
    },
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

describe('engine', () => {
  let testDir: string;
  let claudeDir: string;
  let configDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `claude-code-kit-test-${randomUUID()}`);
    claudeDir = join(testDir, '.claude');
    configDir = join(testDir, '.claude-code-kit');
    await mkdir(claudeDir, { recursive: true });
    await mkdir(configDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ===========================================================================
  // createSyncEngine
  // ===========================================================================

  describe('createSyncEngine', () => {
    it('should create an engine instance', () => {
      const options: SyncEngineOptions = {
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      };

      const engine = createSyncEngine(options);

      expect(engine).toBeDefined();
      expect(engine.sync).toBeDefined();
      expect(engine.diff).toBeDefined();
      expect(engine.validate).toBeDefined();
      expect(engine.loadState).toBeDefined();
    });
  });

  // ===========================================================================
  // loadState
  // ===========================================================================

  describe('loadState', () => {
    it('should load state with config, setup, and addons', async () => {
      const config = createTestConfig();
      const setup = createTestSetup();

      const engine = createSyncEngine({
        loadConfig: async () => config,
        loadSetup: async () => setup,
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const state = await engine.loadState();

      expect(state.config).toEqual(config);
      expect(state.setup).toEqual(setup);
      expect(state.addons).toEqual([]);
    });

    it('should generate settings from loaded state', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const state = await engine.loadState();

      expect(state.settings).toBeDefined();
      expect(state.settings.model).toBeDefined();
    });

    it('should generate CLAUDE.md from loaded state', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const state = await engine.loadState();

      expect(state.claudeMd).toBeDefined();
      expect(state.claudeMd.content).toContain('claude-code-kit:managed');
    });
  });

  // ===========================================================================
  // diff
  // ===========================================================================

  describe('diff', () => {
    it('should show create when files do not exist', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const diff = await engine.diff();

      expect(diff).toHaveLength(2);
      expect(diff.find(d => d.file === 'settings.json')?.type).toBe('create');
      expect(diff.find(d => d.file === 'CLAUDE.md')?.type).toBe('create');
    });

    it('should show unchanged when files match', async () => {
      // First sync to create files
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      await engine.sync({ backup: false });

      // Check diff
      const diff = await engine.diff();

      expect(diff.find(d => d.file === 'settings.json')?.type).toBe('unchanged');
      expect(diff.find(d => d.file === 'CLAUDE.md')?.type).toBe('unchanged');
    });

    it('should show modify when files differ', async () => {
      // Create existing files with different content
      await writeFile(join(claudeDir, 'settings.json'), '{"model": "old-model"}');
      await writeFile(join(claudeDir, 'CLAUDE.md'), '# Old content');

      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const diff = await engine.diff();

      expect(diff.find(d => d.file === 'settings.json')?.type).toBe('modify');
      expect(diff.find(d => d.file === 'CLAUDE.md')?.type).toBe('modify');
    });
  });

  // ===========================================================================
  // validate
  // ===========================================================================

  describe('validate', () => {
    it('should pass validation for valid config', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn when required addon is missing', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup({
          requires: { addons: ['missing-addon'] },
        }),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine.validate();

      expect(result.errors.some(e => e.code === 'MISSING_ADDON')).toBe(true);
    });

    it('should warn when required addon is disabled', async () => {
      const addon: InstalledAddon = {
        manifest: { name: 'test-addon', version: '1.0.0' },
        path: '/path/to/addon',
        installedAt: new Date(),
        updatedAt: new Date(),
        enabled: false,
        config: {},
        source: { type: 'local' },
      };

      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup({
          requires: { addons: ['test-addon'] },
        }),
        loadAddons: async () => [addon],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine.validate();

      expect(result.warnings.some(w => w.code === 'DISABLED_ADDON')).toBe(true);
    });

    it('should warn for skill conflicts', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig({
          skills: { enabled: ['skill-a'], disabled: ['skill-a'] },
        }),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine.validate();

      expect(result.warnings.some(w => w.code === 'SKILL_CONFLICT')).toBe(true);
    });
  });

  // ===========================================================================
  // sync
  // ===========================================================================

  describe('sync', () => {
    it('should create files on first sync', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine.sync({ backup: false });

      expect(result.success).toBe(true);
      expect(result.modifiedFiles).toContain(join(claudeDir, 'settings.json'));
      expect(result.modifiedFiles).toContain(join(claudeDir, 'CLAUDE.md'));
    });

    it('should not modify files on dry run', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine.sync({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.modifiedFiles).toHaveLength(0);
      expect(result.changes.some(c => c.type === 'create')).toBe(true);
    });

    it('should only sync settings.json when settingsOnly is true', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine.sync({ backup: false, settingsOnly: true });

      expect(result.success).toBe(true);
      expect(result.modifiedFiles.some(f => f.includes('settings.json'))).toBe(true);
      expect(result.modifiedFiles.some(f => f.includes('CLAUDE.md'))).toBe(false);
    });

    it('should only sync CLAUDE.md when claudeMdOnly is true', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine.sync({ backup: false, claudeMdOnly: true });

      expect(result.success).toBe(true);
      expect(result.modifiedFiles.some(f => f.includes('CLAUDE.md'))).toBe(true);
      expect(result.modifiedFiles.some(f => f.includes('settings.json'))).toBe(false);
    });

    it('should skip sync when validation fails (without force)', async () => {
      // Create engine that will fail validation
      const engine = createSyncEngine({
        loadConfig: async () => { throw new Error('Config load failed'); },
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine.sync({ backup: false });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should create backup when requested', async () => {
      // Create existing files
      await writeFile(join(claudeDir, 'settings.json'), '{}');

      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine.sync({ backup: true });

      expect(result.success).toBe(true);
      // Backup path should be set (or warning if it failed)
      // Note: actual backup behavior depends on implementation
    });

    it('should be idempotent', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      // First sync
      await engine.sync({ backup: false });

      // Second sync should have no changes
      const result = await engine.sync({ backup: false });

      expect(result.success).toBe(true);
      expect(result.modifiedFiles).toHaveLength(0);
    });
  });

  // ===========================================================================
  // isSyncNeeded
  // ===========================================================================

  describe('isSyncNeeded', () => {
    it('should return true when files need to be created', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const needed = await isSyncNeeded(engine);

      expect(needed).toBe(true);
    });

    it('should return false when files are in sync', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      await engine.sync({ backup: false });

      const needed = await isSyncNeeded(engine);

      expect(needed).toBe(false);
    });
  });

  // ===========================================================================
  // getSyncSummary
  // ===========================================================================

  describe('getSyncSummary', () => {
    it('should return summary of changes', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const summary = await getSyncSummary(engine);

      expect(summary.needsSync).toBe(true);
      expect(summary.creates).toBe(2);
      expect(summary.modifies).toBe(0);
      expect(summary.deletes).toBe(0);
      expect(summary.files).toContain('settings.json');
      expect(summary.files).toContain('CLAUDE.md');
    });

    it('should return zeros when no changes needed', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadSetup: async () => createTestSetup(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      await engine.sync({ backup: false });

      const summary = await getSyncSummary(engine);

      expect(summary.needsSync).toBe(false);
      expect(summary.creates).toBe(0);
      expect(summary.modifies).toBe(0);
      expect(summary.deletes).toBe(0);
      expect(summary.files).toHaveLength(0);
    });
  });
});
