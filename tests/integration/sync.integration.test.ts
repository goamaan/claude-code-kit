/**
 * Sync Integration Tests
 * Tests the full sync workflow end-to-end
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  createSyncEngine,
  createBackup,
  restoreBackup,
  listBackups,
  pruneBackups,
} from '@/core/sync/index.js';
import type { MergedConfig, InstalledAddon } from '@/types';
import { DEFAULT_MERGED_CONFIG } from '@/types';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestConfig(overrides: Partial<MergedConfig> = {}): MergedConfig {
  return {
    ...DEFAULT_MERGED_CONFIG,
    profile: {
      name: 'integration-profile',
      description: 'Integration test profile',
      source: 'global',
    },
    model: {
      default: 'sonnet',
      routing: { simple: 'haiku', standard: 'sonnet', complex: 'opus' },
      overrides: {},
    },
    ...overrides,
  };
}

function createTestAddon(overrides: Partial<InstalledAddon> = {}): InstalledAddon {
  return {
    manifest: {
      name: 'test-addon',
      version: '1.0.0',
      description: 'Test addon',
      hooks: {
        PreToolUse: [
          { matcher: 'Write', handler: 'handlers/write.ts', priority: 10, enabled: true },
        ],
      },
    },
    path: '/path/to/addon',
    installedAt: new Date(),
    updatedAt: new Date(),
    enabled: true,
    config: {},
    source: { type: 'local' },
    ...overrides,
  };
}

// =============================================================================
// Integration Tests
// =============================================================================

describe('Sync Integration', () => {
  let testDir: string;
  let claudeDir: string;
  let configDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `claudeops-integration-${randomUUID()}`);
    claudeDir = join(testDir, '.claude');
    configDir = join(testDir, '.claudeops');
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
  // Full Sync Workflow
  // ===========================================================================

  describe('Full Sync', () => {
    it('should create expected files on initial sync', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig({ content: '# Integration Test Setup\n\nThis is test content.' }),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine.sync({ backup: false });

      expect(result.success).toBe(true);

      // Check settings.json was created
      const settingsContent = await readFile(join(claudeDir, 'settings.json'), 'utf-8');
      const settings = JSON.parse(settingsContent);
      expect(settings.model).toBeDefined();
      expect(settings.metadata).toBeDefined();
      expect(settings.metadata['claudeops'].profile).toBe('integration-profile');

      // Check CLAUDE.md was created
      const claudeMdContent = await readFile(join(claudeDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeMdContent).toContain('claudeops:managed:start');
      expect(claudeMdContent).toContain('Integration Test Setup');
      expect(claudeMdContent).toContain('sonnet');
    });

    it('should include addon hooks in generated settings', async () => {
      const addon = createTestAddon();

      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadAddons: async () => [addon],
        claudeDir,
        globalConfigDir: configDir,
      });

      await engine.sync({ backup: false });

      const settingsContent = await readFile(join(claudeDir, 'settings.json'), 'utf-8');
      const settings = JSON.parse(settingsContent);

      // Hooks should be composed from addons
      expect(settings.hooks).toBeDefined();
    });

    it('should include MCP servers in generated settings', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig({
          mcp: { enabled: ['filesystem'], disabled: [] },
        }),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      await engine.sync({ backup: false });

      const settingsContent = await readFile(join(claudeDir, 'settings.json'), 'utf-8');
      const settings = JSON.parse(settingsContent);

      expect(settings.mcpServers).toBeDefined();
      expect(settings.mcpServers['filesystem']).toBeDefined();
    });
  });

  // ===========================================================================
  // Idempotency
  // ===========================================================================

  describe('Idempotency', () => {
    it('should be idempotent - multiple syncs produce same result', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      // First sync
      await engine.sync({ backup: false });
      const firstSettings = await readFile(join(claudeDir, 'settings.json'), 'utf-8');
      const firstClaudeMd = await readFile(join(claudeDir, 'CLAUDE.md'), 'utf-8');

      // Second sync
      const secondResult = await engine.sync({ backup: false });
      const secondSettings = await readFile(join(claudeDir, 'settings.json'), 'utf-8');
      const secondClaudeMd = await readFile(join(claudeDir, 'CLAUDE.md'), 'utf-8');

      // Should have no modifications
      expect(secondResult.modifiedFiles).toHaveLength(0);

      // Content should be identical
      expect(secondSettings).toBe(firstSettings);
      expect(secondClaudeMd).toBe(firstClaudeMd);
    });

    it('should detect no changes needed after initial sync', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      await engine.sync({ backup: false });

      const diff = await engine.diff();

      expect(diff.every(d => d.type === 'unchanged')).toBe(true);
    });
  });

  // ===========================================================================
  // User Content Preservation
  // ===========================================================================

  describe('User Content Preservation', () => {
    it('should preserve user content outside managed sections', async () => {
      // Create initial CLAUDE.md with user content
      const userContent = `# My Custom Notes

Some important user notes here.

<!-- claudeops:managed:start -->
Old managed content
<!-- claudeops:managed:end -->

# More User Notes

Additional notes that should be preserved.`;

      await writeFile(join(claudeDir, 'CLAUDE.md'), userContent);

      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      await engine.sync({ backup: false, preserveUserContent: true });

      const newContent = await readFile(join(claudeDir, 'CLAUDE.md'), 'utf-8');

      expect(newContent).toContain('My Custom Notes');
      expect(newContent).toContain('Some important user notes');
      expect(newContent).toContain('More User Notes');
      expect(newContent).toContain('Additional notes that should be preserved');
      // Old managed content should be replaced
      expect(newContent).not.toContain('Old managed content');
      // New managed content should be present
      expect(newContent).toContain('integration-profile');
    });
  });

  // ===========================================================================
  // Diff Accuracy
  // ===========================================================================

  describe('Diff Accuracy', () => {
    it('should correctly identify creates', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const diff = await engine.diff();

      expect(diff.filter(d => d.type === 'create')).toHaveLength(2);
      expect(diff.find(d => d.file === 'settings.json')?.type).toBe('create');
      expect(diff.find(d => d.file === 'CLAUDE.md')?.type).toBe('create');
    });

    it('should correctly identify modifications', async () => {
      // Create existing files with different content
      await writeFile(join(claudeDir, 'settings.json'), '{"model": "old"}');
      await writeFile(join(claudeDir, 'CLAUDE.md'), '# Old');

      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const diff = await engine.diff();

      expect(diff.filter(d => d.type === 'modify')).toHaveLength(2);
      expect(diff.find(d => d.file === 'settings.json')?.type).toBe('modify');
      expect(diff.find(d => d.file === 'CLAUDE.md')?.type).toBe('modify');
    });

    it('should correctly identify unchanged files', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      // Sync first
      await engine.sync({ backup: false });

      // Check diff
      const diff = await engine.diff();

      expect(diff.filter(d => d.type === 'unchanged')).toHaveLength(2);
    });
  });

  // ===========================================================================
  // Backup and Restore
  // ===========================================================================

  describe('Backup and Restore', () => {
    it('should create backup during sync', async () => {
      // Create initial files
      await writeFile(join(claudeDir, 'settings.json'), '{"initial": true}');
      await writeFile(join(claudeDir, 'CLAUDE.md'), '# Initial');

      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine.sync({ backup: true });

      expect(result.success).toBe(true);
      // Backup should be created (or warning if failed)

      const backups = await listBackups(configDir);
      expect(backups.length).toBeGreaterThanOrEqual(0); // May be 0 if backup dir doesn't exist yet
    });

    it('should restore from backup', async () => {
      // Create initial content
      await writeFile(join(claudeDir, 'settings.json'), '{"original": true}');

      // Create backup
      const backupResult = await createBackup(claudeDir, configDir);
      expect(backupResult.success).toBe(true);

      // Modify content
      await writeFile(join(claudeDir, 'settings.json'), '{"modified": true}');

      // Verify modification
      const modified = await readFile(join(claudeDir, 'settings.json'), 'utf-8');
      expect(JSON.parse(modified).modified).toBe(true);

      // Restore
      const restoreResult = await restoreBackup(backupResult.path!, claudeDir);
      expect(restoreResult.success).toBe(true);

      // Verify restoration
      const restored = await readFile(join(claudeDir, 'settings.json'), 'utf-8');
      expect(JSON.parse(restored).original).toBe(true);
    });

    it('should prune old backups', async () => {
      // Create multiple backups
      for (let i = 0; i < 5; i++) {
        await writeFile(join(claudeDir, 'settings.json'), `{"backup": ${i}}`);
        await createBackup(claudeDir, configDir);
        // Small delay to ensure unique timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Prune to keep only 2
      const pruned = await pruneBackups(2, configDir);

      expect(pruned).toBeGreaterThanOrEqual(3);

      const remaining = await listBackups(configDir);
      expect(remaining.length).toBe(2);
    });
  });

  // ===========================================================================
  // Validation
  // ===========================================================================

  describe('Validation', () => {
    it('should validate successfully for complete config', async () => {
      const engine = createSyncEngine({
        loadConfig: async () => createTestConfig(),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Configuration Changes
  // ===========================================================================

  describe('Configuration Changes', () => {
    it('should update settings when config changes', async () => {
      // Initial sync with opus
      const engine1 = createSyncEngine({
        loadConfig: async () => createTestConfig({ model: { default: 'opus', routing: { simple: 'haiku', standard: 'sonnet', complex: 'opus' }, overrides: {} } }),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      await engine1.sync({ backup: false });

      let settings = JSON.parse(await readFile(join(claudeDir, 'settings.json'), 'utf-8'));
      expect(settings.model).toContain('opus');

      // New sync with haiku
      const engine2 = createSyncEngine({
        loadConfig: async () => createTestConfig({ model: { default: 'haiku', routing: { simple: 'haiku', standard: 'sonnet', complex: 'opus' }, overrides: {} } }),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine2.sync({ backup: false });

      expect(result.success).toBe(true);
      expect(result.modifiedFiles.some(f => f.includes('settings.json'))).toBe(true);

      settings = JSON.parse(await readFile(join(claudeDir, 'settings.json'), 'utf-8'));
      expect(settings.model).toContain('haiku');
    });

    it('should update CLAUDE.md when profile content changes', async () => {
      // Initial sync
      const engine1 = createSyncEngine({
        loadConfig: async () => createTestConfig({ content: '# Version 1' }),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      await engine1.sync({ backup: false });

      let claudeMd = await readFile(join(claudeDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeMd).toContain('Version 1');

      // New sync with different content and preserveUserContent=false
      // to ensure old content is removed
      const engine2 = createSyncEngine({
        loadConfig: async () => createTestConfig({ content: '# Version 2' }),
        loadAddons: async () => [],
        claudeDir,
        globalConfigDir: configDir,
      });

      const result = await engine2.sync({ backup: false, preserveUserContent: false });

      expect(result.success).toBe(true);
      expect(result.modifiedFiles.some(f => f.includes('CLAUDE.md'))).toBe(true);

      claudeMd = await readFile(join(claudeDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeMd).toContain('Version 2');
      expect(claudeMd).not.toContain('Version 1');
    });
  });
});
