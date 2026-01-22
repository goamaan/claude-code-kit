/**
 * Profile Integration Tests
 * Tests full lifecycle operations and persistence across instances
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  createProfileManager,
  createProfileStorage,
} from '../../src/domain/profile/index.js';

describe('Profile Integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-kit-integration-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Full lifecycle: create -> use -> delete', () => {
    it('should complete full profile lifecycle', async () => {
      const storage = createProfileStorage(tempDir);
      const manager = createProfileManager(storage);

      // Create profile
      await manager.create('lifecycle-test', {
        description: 'Testing full lifecycle',
        skills: { enabled: ['skill1', 'skill2'] },
        agents: {
          executor: { model: 'opus', priority: 90 },
          explorer: { model: 'haiku' },
        },
        model: {
          default: 'sonnet',
          routing: { simple: 'haiku', complex: 'opus' },
        },
      });

      // Verify creation
      let profiles = await manager.list();
      expect(profiles).toHaveLength(1);
      expect(profiles[0]?.name).toBe('lifecycle-test');

      // Use profile
      await manager.use('lifecycle-test');
      expect(await manager.active()).toBe('lifecycle-test');

      // Verify details
      const details = await manager.get('lifecycle-test');
      expect(details.resolved.skills.enabled).toEqual(['skill1', 'skill2']);
      expect(details.resolved.agents['executor']?.model).toBe('opus');
      expect(details.resolved.model.default).toBe('sonnet');

      // Create another profile to switch to
      await manager.create('another-profile');
      await manager.use('another-profile');

      // Now delete the original
      await manager.delete('lifecycle-test');

      // Verify deletion
      profiles = await manager.list();
      expect(profiles).toHaveLength(1);
      expect(profiles[0]?.name).toBe('another-profile');
    });
  });

  describe('Persistence across instances', () => {
    it('should persist profile data across manager instances', async () => {
      // First instance - create profile
      const storage1 = createProfileStorage(tempDir);
      const manager1 = createProfileManager(storage1);

      await manager1.create('persistent-profile', {
        description: 'Should persist',
        skills: { enabled: ['persist-skill'] },
        agents: { executor: { model: 'opus' } },
      });
      await manager1.use('persistent-profile');

      // Second instance - verify data persisted
      const storage2 = createProfileStorage(tempDir);
      const manager2 = createProfileManager(storage2);

      // List should show the profile
      const profiles = await manager2.list();
      expect(profiles).toHaveLength(1);
      expect(profiles[0]?.name).toBe('persistent-profile');
      expect(profiles[0]?.active).toBe(true);

      // Active should be correct
      expect(await manager2.active()).toBe('persistent-profile');

      // Details should be complete
      const details = await manager2.get('persistent-profile');
      expect(details.description).toBe('Should persist');
      expect(details.resolved.skills.enabled).toContain('persist-skill');
      expect(details.resolved.agents['executor']?.model).toBe('opus');
    });

    it('should persist active profile selection', async () => {
      const storage1 = createProfileStorage(tempDir);
      const manager1 = createProfileManager(storage1);

      await manager1.create('profile-a');
      await manager1.create('profile-b');
      await manager1.use('profile-b');

      // New instance should remember active profile
      const storage2 = createProfileStorage(tempDir);
      const manager2 = createProfileManager(storage2);

      expect(await manager2.active()).toBe('profile-b');

      // Switch in second instance
      await manager2.use('profile-a');

      // Third instance should see the new active
      const storage3 = createProfileStorage(tempDir);
      const manager3 = createProfileManager(storage3);

      expect(await manager3.active()).toBe('profile-a');
    });
  });

  describe('Export/Import round-trip', () => {
    it('should export and import profile with full fidelity', async () => {
      const storage = createProfileStorage(tempDir);
      const manager = createProfileManager(storage);

      // Create a complex profile
      await manager.create('export-source', {
        description: 'Complex profile for export',
        skills: {
          enabled: ['skill1', 'skill2', 'skill3'],
          disabled: ['legacy-skill'],
        },
        agents: {
          executor: { model: 'opus', priority: 95 },
          explorer: { model: 'haiku', priority: 30 },
          architect: { model: 'opus', priority: 100 },
        },
        mcp: {
          enabled: ['mcp-server-1', 'mcp-server-2'],
          disabled: ['mcp-legacy'],
        },
        model: {
          default: 'sonnet',
          routing: {
            simple: 'haiku',
            standard: 'sonnet',
            complex: 'opus',
          },
        },
      });

      // Export to TOML
      const exported = await manager.export('export-source');

      // Delete the original
      await manager.delete('export-source');

      // Create a temp file for import
      const importPath = path.join(tempDir, 'exported-profile.toml');
      await fs.writeFile(importPath, exported);

      // Import with a new name
      await manager.import(importPath, { name: 'imported-copy' });

      // Verify imported profile matches original
      const imported = await manager.get('imported-copy');

      expect(imported.description).toBe('Complex profile for export');
      expect(imported.resolved.skills.enabled).toEqual(['skill1', 'skill2', 'skill3']);
      expect(imported.resolved.skills.disabled).toEqual(['legacy-skill']);
      expect(imported.resolved.agents['executor']).toEqual({ model: 'opus', priority: 95 });
      expect(imported.resolved.agents['explorer']).toEqual({ model: 'haiku', priority: 30 });
      expect(imported.resolved.mcp.enabled).toEqual(['mcp-server-1', 'mcp-server-2']);
      expect(imported.resolved.model.default).toBe('sonnet');
      expect(imported.resolved.model.routing.simple).toBe('haiku');
    });

    it('should export and import JSON format', async () => {
      const storage = createProfileStorage(tempDir);
      const manager = createProfileManager(storage);

      await manager.create('json-source', {
        description: 'JSON export test',
        skills: { enabled: ['json-skill'] },
      });

      // Export as JSON
      const exported = await manager.export('json-source', { format: 'json' });

      // Verify it's valid JSON
      const parsed = JSON.parse(exported);
      expect(parsed.name).toBe('json-source');

      // Delete original
      await manager.delete('json-source');

      // Import from JSON
      const importPath = path.join(tempDir, 'exported.json');
      await fs.writeFile(importPath, exported);

      await manager.import(importPath, { name: 'json-imported' });

      const details = await manager.get('json-imported');
      expect(details.description).toBe('JSON export test');
      expect(details.resolved.skills.enabled).toContain('json-skill');
    });
  });

  describe('Inheritance persistence', () => {
    it('should persist inheritance across instances', async () => {
      // First instance - create inheritance chain
      const storage1 = createProfileStorage(tempDir);
      const manager1 = createProfileManager(storage1);

      await manager1.create('base', {
        skills: { enabled: ['base-skill'] },
        agents: { executor: { model: 'sonnet' } },
      });

      await manager1.create('derived', {
        extends: 'base',
        skills: { enabled: ['derived-skill'] },
        agents: { executor: { priority: 80 } },
      });

      // Second instance - verify inheritance resolves correctly
      const storage2 = createProfileStorage(tempDir);
      const manager2 = createProfileManager(storage2);

      const details = await manager2.get('derived');

      expect(details.inheritanceChain).toEqual(['base', 'derived']);
      expect(details.resolved.skills.enabled).toContain('base-skill');
      expect(details.resolved.skills.enabled).toContain('derived-skill');
      expect(details.resolved.agents['executor']?.model).toBe('sonnet');
      expect(details.resolved.agents['executor']?.priority).toBe(80);
    });
  });

  describe('File system verification', () => {
    it('should create correct file structure', async () => {
      const storage = createProfileStorage(tempDir);
      const manager = createProfileManager(storage);

      await manager.create('fs-test', { description: 'File system test' });
      await manager.use('fs-test');

      // Verify profiles directory exists
      const profilesDir = path.join(tempDir, 'profiles');
      const profilesDirStat = await fs.stat(profilesDir);
      expect(profilesDirStat.isDirectory()).toBe(true);

      // Verify profile file exists
      const profileFile = path.join(profilesDir, 'fs-test.toml');
      const profileFileStat = await fs.stat(profileFile);
      expect(profileFileStat.isFile()).toBe(true);

      // Verify active-profile file exists
      const activeFile = path.join(tempDir, 'active-profile');
      const activeContent = await fs.readFile(activeFile, 'utf-8');
      expect(activeContent.trim()).toBe('fs-test');

      // Verify profile file content
      const profileContent = await fs.readFile(profileFile, 'utf-8');
      // TOML library uses single quotes
      expect(profileContent).toContain("name = 'fs-test'");
      expect(profileContent).toContain("description = 'File system test'");
    });

    it('should handle concurrent operations', async () => {
      const storage = createProfileStorage(tempDir);
      const manager = createProfileManager(storage);

      // Create multiple profiles concurrently
      await Promise.all([
        manager.create('concurrent-1', { description: 'Profile 1' }),
        manager.create('concurrent-2', { description: 'Profile 2' }),
        manager.create('concurrent-3', { description: 'Profile 3' }),
      ]);

      const profiles = await manager.list();
      expect(profiles).toHaveLength(3);

      const names = profiles.map((p) => p.name).sort();
      expect(names).toEqual(['concurrent-1', 'concurrent-2', 'concurrent-3']);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty profiles directory', async () => {
      // Create profiles dir but leave it empty
      await fs.mkdir(path.join(tempDir, 'profiles'), { recursive: true });

      const storage = createProfileStorage(tempDir);
      const manager = createProfileManager(storage);

      const profiles = await manager.list();
      expect(profiles).toEqual([]);
    });

    it('should handle profiles with special characters in values', async () => {
      const storage = createProfileStorage(tempDir);
      const manager = createProfileManager(storage);

      await manager.create('special-chars', {
        description: 'Profile with "quotes" and \\backslashes\\ and newlines\nin description',
      });

      // Export and re-import to verify round-trip
      const exported = await manager.export('special-chars');
      await manager.delete('special-chars');

      const importPath = path.join(tempDir, 'special.toml');
      await fs.writeFile(importPath, exported);

      await manager.import(importPath);

      const details = await manager.get('special-chars');
      expect(details.description).toContain('quotes');
      expect(details.description).toContain('backslashes');
    });

    it('should handle default active profile when none set', async () => {
      const storage = createProfileStorage(tempDir);
      const manager = createProfileManager(storage);

      // Don't set any active profile
      const active = await manager.active();
      expect(active).toBe('default');
    });

    it('should preserve profile on failed import', async () => {
      const storage = createProfileStorage(tempDir);
      const manager = createProfileManager(storage);

      // Create existing profile
      await manager.create('existing', { description: 'Original' });

      // Try to import invalid file (should fail validation)
      const invalidPath = path.join(tempDir, 'invalid.toml');
      await fs.writeFile(invalidPath, 'invalid toml {{{{');

      await expect(manager.import(invalidPath, { name: 'existing' })).rejects.toThrow();

      // Original profile should still exist unchanged
      const details = await manager.get('existing');
      expect(details.description).toBe('Original');
    });
  });
});
