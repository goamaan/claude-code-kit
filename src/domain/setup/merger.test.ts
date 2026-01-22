/**
 * Unit tests for merger
 */

import { describe, it, expect } from 'vitest';
import type { LoadedSetup, SetupManifest } from '@/types';
import {
  mergeSetups,
  createEmptyMergedSetup,
  areMergedSetupsEqual,
  diffMergedSetups,
  SetupMergeError,
} from './merger.js';

/**
 * Helper to create a LoadedSetup for testing
 */
function createLoadedSetup(
  manifest: Partial<SetupManifest> & { name: string; version: string },
  content: string = '',
  sourcePath: string = '/test/path',
): LoadedSetup {
  return {
    manifest: {
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      extends: manifest.extends,
      requires: manifest.requires,
      skills: manifest.skills,
      agents: manifest.agents,
      mcp: manifest.mcp,
      hooks: manifest.hooks,
      commands: manifest.commands,
      content: manifest.content,
    },
    content,
    sourcePath,
    inheritanceChain: [manifest.name],
    isRoot: true,
  };
}

describe('merger', () => {
  describe('mergeSetups', () => {
    it('should throw SetupMergeError for empty setup list', () => {
      expect(() => mergeSetups([])).toThrow(SetupMergeError);
    });

    it('should return a single setup unchanged (mostly)', () => {
      const setup = createLoadedSetup({
        name: 'test-setup',
        version: '1.0.0',
        description: 'Test',
        skills: {
          enabled: ['autopilot'],
        },
      }, '# Content');

      const result = mergeSetups([setup]);

      expect(result.name).toBe('test-setup');
      expect(result.version).toBe('1.0.0');
      expect(result.skills.enabled).toContain('autopilot');
      expect(result.content).toBe('# Content');
    });

    it('should use root setup for name and version', () => {
      const base = createLoadedSetup({
        name: 'base',
        version: '1.0.0',
      });

      const derived = createLoadedSetup({
        name: 'derived',
        version: '2.0.0',
      });

      const result = mergeSetups([base, derived]);

      expect(result.name).toBe('derived');
      expect(result.version).toBe('2.0.0');
      expect(result.sources).toEqual(['/test/path', '/test/path']);
    });

    it('should union skills by default', () => {
      const base = createLoadedSetup({
        name: 'base',
        version: '1.0.0',
        skills: {
          enabled: ['autopilot', 'ralph'],
        },
      });

      const derived = createLoadedSetup({
        name: 'derived',
        version: '1.0.0',
        skills: {
          enabled: ['ultrawork', 'planner'],
        },
      });

      const result = mergeSetups([base, derived]);

      expect(result.skills.enabled).toContain('autopilot');
      expect(result.skills.enabled).toContain('ralph');
      expect(result.skills.enabled).toContain('ultrawork');
      expect(result.skills.enabled).toContain('planner');
    });

    it('should override skills when strategy is override', () => {
      const base = createLoadedSetup({
        name: 'base',
        version: '1.0.0',
        skills: {
          enabled: ['autopilot', 'ralph'],
        },
      });

      const derived = createLoadedSetup({
        name: 'derived',
        version: '1.0.0',
        skills: {
          enabled: ['ultrawork'],
        },
      });

      const result = mergeSetups([base, derived], { skillStrategy: 'override' });

      expect(result.skills.enabled).toEqual(['ultrawork']);
    });

    it('should remove disabled skills from enabled list', () => {
      const base = createLoadedSetup({
        name: 'base',
        version: '1.0.0',
        skills: {
          enabled: ['autopilot', 'ralph', 'ultrawork'],
        },
      });

      const derived = createLoadedSetup({
        name: 'derived',
        version: '1.0.0',
        skills: {
          disabled: ['ralph'],
        },
      });

      const result = mergeSetups([base, derived]);

      expect(result.skills.enabled).toContain('autopilot');
      expect(result.skills.enabled).toContain('ultrawork');
      expect(result.skills.enabled).not.toContain('ralph');
      expect(result.skills.disabled).toContain('ralph');
    });

    it('should merge agents (later overrides)', () => {
      const base = createLoadedSetup({
        name: 'base',
        version: '1.0.0',
        agents: {
          designer: {
            model: 'sonnet',
            priority: 50,
            enabled: true,
          },
          architect: {
            model: 'opus',
            priority: 60,
            enabled: true,
          },
        },
      });

      const derived = createLoadedSetup({
        name: 'derived',
        version: '1.0.0',
        agents: {
          designer: {
            model: 'opus',
            priority: 80,
            enabled: true,
          },
        },
      });

      const result = mergeSetups([base, derived]);

      expect(result.agents['designer']).toEqual({
        model: 'opus',
        priority: 80,
        enabled: true,
      });
      expect(result.agents['architect']).toEqual({
        model: 'opus',
        priority: 60,
        enabled: true,
      });
    });

    it('should merge hooks', () => {
      const base = createLoadedSetup({
        name: 'base',
        version: '1.0.0',
        hooks: {
          templates: [
            { name: 'hook-a', matcher: '*.ts', handler: 'lint', priority: 10 },
          ],
        },
      });

      const derived = createLoadedSetup({
        name: 'derived',
        version: '1.0.0',
        hooks: {
          templates: [
            { name: 'hook-b', matcher: '*.js', handler: 'format', priority: 20 },
          ],
        },
      });

      const result = mergeSetups([base, derived]);

      expect(result.hooks.templates).toHaveLength(2);
      expect(result.hooks.templates.find(h => h.name === 'hook-a')).toBeDefined();
      expect(result.hooks.templates.find(h => h.name === 'hook-b')).toBeDefined();
    });

    it('should deduplicate hooks by name (keep higher priority)', () => {
      const base = createLoadedSetup({
        name: 'base',
        version: '1.0.0',
        hooks: {
          templates: [
            { name: 'lint', matcher: '*.ts', handler: 'old-lint', priority: 10 },
          ],
        },
      });

      const derived = createLoadedSetup({
        name: 'derived',
        version: '1.0.0',
        hooks: {
          templates: [
            { name: 'lint', matcher: '*.ts', handler: 'new-lint', priority: 20 },
          ],
        },
      });

      const result = mergeSetups([base, derived]);

      expect(result.hooks.templates).toHaveLength(1);
      expect(result.hooks.templates[0]?.handler).toBe('new-lint');
    });

    it('should concatenate content by default', () => {
      const base = createLoadedSetup(
        { name: 'base', version: '1.0.0' },
        '# Base Content',
      );

      const derived = createLoadedSetup(
        { name: 'derived', version: '1.0.0' },
        '# Derived Content',
      );

      const result = mergeSetups([base, derived]);

      expect(result.content).toContain('# Base Content');
      expect(result.content).toContain('# Derived Content');
    });

    it('should override content when strategy is override', () => {
      const base = createLoadedSetup(
        { name: 'base', version: '1.0.0' },
        '# Base Content',
      );

      const derived = createLoadedSetup(
        { name: 'derived', version: '1.0.0' },
        '# Derived Content',
      );

      const result = mergeSetups([base, derived], { contentStrategy: 'override' });

      expect(result.content).toBe('# Derived Content');
    });

    it('should merge MCP configuration', () => {
      const base = createLoadedSetup({
        name: 'base',
        version: '1.0.0',
        mcp: {
          recommended: ['filesystem', 'git'],
          required: ['git'],
          max_enabled: 10,
        },
      });

      const derived = createLoadedSetup({
        name: 'derived',
        version: '1.0.0',
        mcp: {
          recommended: ['fetch'],
          max_enabled: 5,
        },
      });

      const result = mergeSetups([base, derived]);

      expect(result.mcp.recommended).toContain('filesystem');
      expect(result.mcp.recommended).toContain('git');
      expect(result.mcp.recommended).toContain('fetch');
      expect(result.mcp.required).toContain('git');
      expect(result.mcp.max_enabled).toBe(5);
    });

    it('should merge commands (later overrides)', () => {
      const base = createLoadedSetup({
        name: 'base',
        version: '1.0.0',
        commands: {
          build: {
            enabled: true,
            alias: 'b',
          },
          test: {
            enabled: true,
            alias: 't',
          },
        },
      });

      const derived = createLoadedSetup({
        name: 'derived',
        version: '1.0.0',
        commands: {
          build: {
            enabled: false,
          },
        },
      });

      const result = mergeSetups([base, derived]);

      expect(result.commands['build']?.enabled).toBe(false);
      expect(result.commands['test']?.enabled).toBe(true);
    });

    it('should merge requires addons', () => {
      const base = createLoadedSetup({
        name: 'base',
        version: '1.0.0',
        requires: {
          addons: ['addon-a'],
        },
      });

      const derived = createLoadedSetup({
        name: 'derived',
        version: '1.0.0',
        requires: {
          addons: ['addon-b', 'addon-a'],
        },
      });

      const result = mergeSetups([base, derived]);

      expect(result.requires.addons).toContain('addon-a');
      expect(result.requires.addons).toContain('addon-b');
      // Should deduplicate
      expect(result.requires.addons.filter(a => a === 'addon-a')).toHaveLength(1);
    });
  });

  describe('createEmptyMergedSetup', () => {
    it('should create an empty merged setup with name and version', () => {
      const result = createEmptyMergedSetup('test', '1.0.0');

      expect(result.name).toBe('test');
      expect(result.version).toBe('1.0.0');
      expect(result.skills.enabled).toEqual([]);
      expect(result.skills.disabled).toEqual([]);
      expect(result.agents).toEqual({});
      expect(result.hooks.templates).toEqual([]);
      expect(result.content).toBe('');
    });

    it('should use default version', () => {
      const result = createEmptyMergedSetup('test');
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('areMergedSetupsEqual', () => {
    it('should return true for identical setups', () => {
      const a = createEmptyMergedSetup('test', '1.0.0');
      const b = createEmptyMergedSetup('test', '1.0.0');

      expect(areMergedSetupsEqual(a, b)).toBe(true);
    });

    it('should return false for different setups', () => {
      const a = createEmptyMergedSetup('test-a', '1.0.0');
      const b = createEmptyMergedSetup('test-b', '1.0.0');

      expect(areMergedSetupsEqual(a, b)).toBe(false);
    });
  });

  describe('diffMergedSetups', () => {
    it('should detect added skills', () => {
      const before = createEmptyMergedSetup('test', '1.0.0');
      const after = createEmptyMergedSetup('test', '1.0.0');
      after.skills.enabled = ['autopilot', 'ralph'];

      const diff = diffMergedSetups(before, after);

      expect(diff.added.skills).toContain('autopilot');
      expect(diff.added.skills).toContain('ralph');
    });

    it('should detect removed skills', () => {
      const before = createEmptyMergedSetup('test', '1.0.0');
      before.skills.enabled = ['autopilot', 'ralph'];

      const after = createEmptyMergedSetup('test', '1.0.0');
      after.skills.enabled = ['autopilot'];

      const diff = diffMergedSetups(before, after);

      expect(diff.removed.skills).toContain('ralph');
    });

    it('should detect added agents', () => {
      const before = createEmptyMergedSetup('test', '1.0.0');
      const after = createEmptyMergedSetup('test', '1.0.0');
      after.agents = {
        designer: { model: 'sonnet', priority: 50, enabled: true },
      };

      const diff = diffMergedSetups(before, after);

      expect(diff.added.agents).toContain('designer');
    });

    it('should detect modified agents', () => {
      const before = createEmptyMergedSetup('test', '1.0.0');
      before.agents = {
        designer: { model: 'sonnet', priority: 50, enabled: true },
      };

      const after = createEmptyMergedSetup('test', '1.0.0');
      after.agents = {
        designer: { model: 'opus', priority: 80, enabled: true },
      };

      const diff = diffMergedSetups(before, after);

      expect(diff.modified.agents).toContain('designer');
    });

    it('should detect added hooks', () => {
      const before = createEmptyMergedSetup('test', '1.0.0');
      const after = createEmptyMergedSetup('test', '1.0.0');
      after.hooks.templates = [
        { name: 'lint', matcher: '*.ts', handler: 'lint', priority: 0 },
      ];

      const diff = diffMergedSetups(before, after);

      expect(diff.added.hooks).toContain('lint');
    });
  });
});
