/**
 * Profile Manager Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  createProfileManager,
  createProfileStorage,
  ProfileNotFoundError,
  ProfileExistsError,
  ActiveProfileDeleteError,
} from './index.js';

describe('ProfileManager', () => {
  let tempDir: string;
  let manager: ReturnType<typeof createProfileManager>;

  beforeEach(async () => {
    // Create a temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claudeops-test-'));
    const storage = createProfileStorage(tempDir);
    manager = createProfileManager(storage);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('list()', () => {
    it('should return empty array when no profiles exist', async () => {
      const profiles = await manager.list();
      expect(profiles).toEqual([]);
    });

    it('should return profile summaries', async () => {
      await manager.create('test-profile', {
        description: 'A test profile',
      });

      const profiles = await manager.list();
      expect(profiles).toHaveLength(1);
      expect(profiles[0]).toMatchObject({
        name: 'test-profile',
        description: 'A test profile',
        active: false,
      });
    });

    it('should mark active profile', async () => {
      await manager.create('profile1');
      await manager.create('profile2');
      await manager.use('profile1');

      const profiles = await manager.list();
      const profile1 = profiles.find((p) => p.name === 'profile1');
      const profile2 = profiles.find((p) => p.name === 'profile2');

      expect(profile1?.active).toBe(true);
      expect(profile2?.active).toBe(false);
    });
  });

  describe('active()', () => {
    it('should return default when no active profile set', async () => {
      const active = await manager.active();
      expect(active).toBe('default');
    });

    it('should return currently active profile', async () => {
      await manager.create('my-profile');
      await manager.use('my-profile');

      const active = await manager.active();
      expect(active).toBe('my-profile');
    });
  });

  describe('create()', () => {
    it('should create a new profile', async () => {
      await manager.create('new-profile', {
        description: 'Brand new profile',
      });

      const details = await manager.get('new-profile');
      expect(details.name).toBe('new-profile');
      expect(details.description).toBe('Brand new profile');
    });

    it('should create profile with skills configuration', async () => {
      await manager.create('skill-profile', {
        skills: {
          enabled: ['autopilot', 'ralph'],
          disabled: ['legacy-skill'],
        },
      });

      const details = await manager.get('skill-profile');
      expect(details.resolved.skills.enabled).toContain('autopilot');
      expect(details.resolved.skills.enabled).toContain('ralph');
      expect(details.resolved.skills.disabled).toContain('legacy-skill');
    });

    it('should create profile with agent overrides', async () => {
      await manager.create('agent-profile', {
        agents: {
          executor: { model: 'opus', priority: 80 },
          explorer: { model: 'haiku' },
        },
      });

      const details = await manager.get('agent-profile');
      expect(details.resolved.agents['executor']).toEqual({
        model: 'opus',
        priority: 80,
      });
      expect(details.resolved.agents['explorer']).toEqual({
        model: 'haiku',
        priority: 50, // default
      });
    });

    it('should throw if profile already exists', async () => {
      await manager.create('existing-profile');

      await expect(manager.create('existing-profile')).rejects.toThrow(
        ProfileExistsError
      );
    });

    it('should create profile extending another (--from)', async () => {
      await manager.create('base-profile', {
        skills: { enabled: ['skill1'] },
        agents: { executor: { model: 'sonnet' } },
      });

      await manager.create('derived-profile', {
        extends: 'base-profile',
        skills: { enabled: ['skill2'] },
      });

      const details = await manager.get('derived-profile');
      expect(details.inheritanceChain).toEqual(['base-profile', 'derived-profile']);
      expect(details.resolved.skills.enabled).toContain('skill1');
      expect(details.resolved.skills.enabled).toContain('skill2');
      expect(details.resolved.agents['executor']?.model).toBe('sonnet');
    });

    it('should throw if base profile does not exist', async () => {
      await expect(
        manager.create('derived', { extends: 'non-existent' })
      ).rejects.toThrow(ProfileNotFoundError);
    });

    it('should activate profile on creation if requested', async () => {
      await manager.create('auto-active', { activate: true });

      const active = await manager.active();
      expect(active).toBe('auto-active');
    });
  });

  describe('use()', () => {
    it('should switch active profile', async () => {
      await manager.create('profile-a');
      await manager.create('profile-b');

      await manager.use('profile-a');
      expect(await manager.active()).toBe('profile-a');

      await manager.use('profile-b');
      expect(await manager.active()).toBe('profile-b');
    });

    it('should throw if profile does not exist', async () => {
      await expect(manager.use('non-existent')).rejects.toThrow(
        ProfileNotFoundError
      );
    });
  });

  describe('delete()', () => {
    it('should delete a profile', async () => {
      await manager.create('to-delete');
      const beforeDelete = await manager.list();
      expect(beforeDelete).toHaveLength(1);

      await manager.delete('to-delete');
      const afterDelete = await manager.list();
      expect(afterDelete).toHaveLength(0);
    });

    it('should throw if deleting active profile', async () => {
      await manager.create('active-profile');
      await manager.use('active-profile');

      await expect(manager.delete('active-profile')).rejects.toThrow(
        ActiveProfileDeleteError
      );
    });

    it('should throw if profile does not exist', async () => {
      await expect(manager.delete('non-existent')).rejects.toThrow(
        ProfileNotFoundError
      );
    });
  });

  describe('export()', () => {
    it('should export profile as TOML string', async () => {
      await manager.create('export-test', {
        description: 'Profile for export',
        skills: { enabled: ['test-skill'] },
      });

      const exported = await manager.export('export-test');
      // TOML library uses single quotes
      expect(exported).toContain("name = 'export-test'");
      expect(exported).toContain("description = 'Profile for export'");
    });

    it('should export profile as JSON', async () => {
      await manager.create('json-export', {
        description: 'JSON export test',
      });

      const exported = await manager.export('json-export', { format: 'json' });
      const parsed = JSON.parse(exported);
      expect(parsed.name).toBe('json-export');
      expect(parsed.description).toBe('JSON export test');
    });

    it('should throw if profile does not exist', async () => {
      await expect(manager.export('non-existent')).rejects.toThrow(
        ProfileNotFoundError
      );
    });
  });

  describe('get()', () => {
    it('should return full profile details', async () => {
      await manager.create('detail-test', {
        description: 'Detailed profile',
        skills: { enabled: ['skill1'], disabled: ['skill2'] },
        agents: { executor: { model: 'opus', priority: 90 } },
        mcp: { enabled: ['mcp1'] },
        model: {
          default: 'opus',
          routing: { simple: 'haiku' },
        },
      });

      const details = await manager.get('detail-test');

      expect(details.name).toBe('detail-test');
      expect(details.description).toBe('Detailed profile');
      expect(details.config.skills?.enabled).toContain('skill1');
      expect(details.resolved.model.default).toBe('opus');
      expect(details.resolved.model.routing.simple).toBe('haiku');
      expect(details.inheritanceChain).toEqual(['detail-test']);
    });

    it('should throw if profile does not exist', async () => {
      await expect(manager.get('non-existent')).rejects.toThrow(
        ProfileNotFoundError
      );
    });
  });

  describe('import()', () => {
    it('should import profile from file', async () => {
      // Create a profile file to import
      const importFile = path.join(tempDir, 'import-test.toml');
      await fs.writeFile(
        importFile,
        `name = "imported-profile"
description = "Imported from file"

[skills]
enabled = ["imported-skill"]
`
      );

      await manager.import(importFile);

      const details = await manager.get('imported-profile');
      expect(details.name).toBe('imported-profile');
      expect(details.description).toBe('Imported from file');
      expect(details.resolved.skills.enabled).toContain('imported-skill');
    });

    it('should import with custom name', async () => {
      const importFile = path.join(tempDir, 'rename-import.toml');
      await fs.writeFile(
        importFile,
        `name = "original-name"
description = "Will be renamed"
`
      );

      await manager.import(importFile, { name: 'renamed-profile' });

      const profiles = await manager.list();
      expect(profiles.map((p) => p.name)).toContain('renamed-profile');
      expect(profiles.map((p) => p.name)).not.toContain('original-name');
    });

    it('should throw if profile exists and not overwriting', async () => {
      await manager.create('existing');

      const importFile = path.join(tempDir, 'conflict.toml');
      await fs.writeFile(importFile, `name = "existing"\n`);

      await expect(manager.import(importFile)).rejects.toThrow(ProfileExistsError);
    });

    it('should overwrite existing profile when requested', async () => {
      await manager.create('overwrite-me', { description: 'Original' });

      const importFile = path.join(tempDir, 'overwrite.toml');
      await fs.writeFile(
        importFile,
        `name = "overwrite-me"
description = "Overwritten"
`
      );

      await manager.import(importFile, { overwrite: true });

      const details = await manager.get('overwrite-me');
      expect(details.description).toBe('Overwritten');
    });

    it('should activate imported profile when requested', async () => {
      const importFile = path.join(tempDir, 'activate-import.toml');
      await fs.writeFile(importFile, `name = "activate-on-import"\n`);

      await manager.import(importFile, { activate: true });

      const active = await manager.active();
      expect(active).toBe('activate-on-import');
    });
  });

  describe('inheritance', () => {
    it('should resolve inheritance chain correctly', async () => {
      await manager.create('grandparent', {
        skills: { enabled: ['grandparent-skill'] },
        agents: { executor: { model: 'haiku', priority: 10 } },
      });

      await manager.create('parent', {
        extends: 'grandparent',
        skills: { enabled: ['parent-skill'] },
        agents: { executor: { priority: 50 } },
      });

      await manager.create('child', {
        extends: 'parent',
        skills: { enabled: ['child-skill'] },
        agents: { executor: { model: 'opus' } },
      });

      const details = await manager.get('child');

      expect(details.inheritanceChain).toEqual(['grandparent', 'parent', 'child']);
      expect(details.resolved.skills.enabled).toContain('grandparent-skill');
      expect(details.resolved.skills.enabled).toContain('parent-skill');
      expect(details.resolved.skills.enabled).toContain('child-skill');
      expect(details.resolved.agents['executor']?.model).toBe('opus');
      expect(details.resolved.agents['executor']?.priority).toBe(50);
    });

    it('should detect circular inheritance', async () => {
      // Create a profile that will be part of a cycle
      await manager.create('cycle-a', { description: 'First in cycle' });

      // Manually create cycle-b extending cycle-a
      const storage = createProfileStorage(tempDir);
      await storage.writeProfile('cycle-b', {
        name: 'cycle-b',
        extends: 'cycle-a',
      });

      // Update cycle-a to extend cycle-b (creating a cycle)
      await storage.writeProfile('cycle-a', {
        name: 'cycle-a',
        extends: 'cycle-b',
      });

      // Getting either profile should detect the cycle
      await expect(manager.get('cycle-a')).rejects.toThrow('Circular inheritance');
    });
  });

  describe('getWithOverrides()', () => {
    it('should apply project-level overrides to profile', async () => {
      await manager.create('base', {
        skills: { enabled: ['base-skill'] },
        agents: { executor: { model: 'haiku', priority: 50 } },
        mcp: { enabled: ['base-mcp'] },
      });

      const projectOverrides = {
        name: 'project-override',
        skills: { enabled: ['project-skill'], disabled: ['unwanted-skill'] },
        agents: { executor: { model: 'opus' as const } },
        mcp: { enabled: ['project-mcp'] },
      };

      const details = await manager.getWithOverrides('base', projectOverrides);

      expect(details.resolved.skills.enabled).toContain('base-skill');
      expect(details.resolved.skills.enabled).toContain('project-skill');
      expect(details.resolved.skills.disabled).toContain('unwanted-skill');
      expect(details.resolved.agents['executor']?.model).toBe('opus');
      expect(details.resolved.agents['executor']?.priority).toBe(50);
      expect(details.resolved.mcp.enabled).toContain('base-mcp');
      expect(details.resolved.mcp.enabled).toContain('project-mcp');
    });

    it('should return base profile when no overrides provided', async () => {
      await manager.create('no-override', {
        description: 'No overrides',
        skills: { enabled: ['test-skill'] },
      });

      const details = await manager.getWithOverrides('no-override');
      const baseDetails = await manager.get('no-override');

      expect(details).toEqual(baseDetails);
    });

    it('should override model configuration', async () => {
      await manager.create('model-base', {
        model: {
          default: 'haiku',
          routing: { simple: 'haiku', standard: 'sonnet' },
        },
      });

      const projectOverrides = {
        name: 'project-model-override',
        model: {
          default: 'opus' as const,
          routing: { complex: 'opus' as const },
        },
      };

      const details = await manager.getWithOverrides('model-base', projectOverrides);

      expect(details.resolved.model.default).toBe('opus');
      expect(details.resolved.model.routing.simple).toBe('haiku');
      expect(details.resolved.model.routing.complex).toBe('opus');
    });

    it('should add new agents from project overrides', async () => {
      await manager.create('agent-base', {
        agents: { executor: { model: 'sonnet' } },
      });

      const projectOverrides = {
        name: 'project-agent-override',
        agents: {
          designer: { model: 'opus' as const, priority: 80 },
        },
      };

      const details = await manager.getWithOverrides('agent-base', projectOverrides);

      expect(details.resolved.agents['executor']?.model).toBe('sonnet');
      expect(details.resolved.agents['designer']?.model).toBe('opus');
      expect(details.resolved.agents['designer']?.priority).toBe(80);
    });
  });

  describe('loadProjectOverrides()', () => {
    it('should load project overrides from .claudeops/profile.toml', async () => {
      const projectDir = path.join(tempDir, 'project1');
      const claudeopsDir = path.join(projectDir, '.claudeops');
      await fs.mkdir(claudeopsDir, { recursive: true });

      const profileContent = `name = "project-override"
description = "Project-level overrides"

[skills]
enabled = ["project-skill"]

[agents.executor]
model = "opus"
`;

      await fs.writeFile(path.join(claudeopsDir, 'profile.toml'), profileContent);

      const overrides = await manager.loadProjectOverrides(projectDir);

      expect(overrides).not.toBeNull();
      expect(overrides?.name).toBe('project-override');
      expect(overrides?.description).toBe('Project-level overrides');
      expect(overrides?.skills?.enabled).toContain('project-skill');
      expect(overrides?.agents?.['executor']?.model).toBe('opus');
    });

    it('should return null when no project override exists', async () => {
      const projectDir = path.join(tempDir, 'no-override-project');
      await fs.mkdir(projectDir, { recursive: true });

      const overrides = await manager.loadProjectOverrides(projectDir);

      expect(overrides).toBeNull();
    });

    it('should try multiple file locations', async () => {
      const projectDir = path.join(tempDir, 'project2');
      await fs.mkdir(projectDir, { recursive: true });

      // Create override in alternate location
      const profileContent = `name = "alternate-location"

[skills]
enabled = ["test"]
`;

      await fs.writeFile(path.join(projectDir, '.claudeops.toml'), profileContent);

      const overrides = await manager.loadProjectOverrides(projectDir);

      expect(overrides).not.toBeNull();
      expect(overrides?.name).toBe('alternate-location');
    });

    it('should skip invalid files and try next location', async () => {
      const projectDir = path.join(tempDir, 'project3');
      const claudeopsDir = path.join(projectDir, '.claudeops');
      await fs.mkdir(claudeopsDir, { recursive: true });

      // Create an invalid TOML file first
      await fs.writeFile(path.join(claudeopsDir, 'profile.toml'), 'invalid toml content [[[');

      // Create a valid file in alternate location
      const validContent = `name = "fallback-valid"

[skills]
enabled = ["fallback-skill"]
`;
      await fs.writeFile(path.join(projectDir, '.claudeops.toml'), validContent);

      const overrides = await manager.loadProjectOverrides(projectDir);

      expect(overrides).not.toBeNull();
      expect(overrides?.name).toBe('fallback-valid');
    });
  });
});
