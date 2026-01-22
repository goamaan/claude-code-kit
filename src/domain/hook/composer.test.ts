/**
 * Hook Composer Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  composeHooks,
  toSettingsFormat,
  resolveHandlerPath,
  isHooksEmpty,
  mergeComposedHooks,
  createEmptyHooks,
  getHookCount,
  filterHooksBySource,
  removeHooksBySource,
  getHookSources,
  type HookSource,
} from './composer.js';
import type { ComposedHooks } from '@/types';

describe('composer', () => {
  // ===========================================================================
  // resolveHandlerPath
  // ===========================================================================

  describe('resolveHandlerPath', () => {
    it('should return absolute paths unchanged', () => {
      const result = resolveHandlerPath('/absolute/path/handler.ts', '/base/path');
      expect(result).toBe('/absolute/path/handler.ts');
    });

    it('should resolve relative paths against base path', () => {
      const result = resolveHandlerPath('handler.ts', '/base/path');
      expect(result).toBe('/base/path/handler.ts');
    });

    it('should resolve nested relative paths', () => {
      const result = resolveHandlerPath('hooks/pre-tool.ts', '/addon/dir');
      expect(result).toBe('/addon/dir/hooks/pre-tool.ts');
    });

    it('should handle paths with ../', () => {
      const result = resolveHandlerPath('../shared/handler.ts', '/addon/hooks');
      expect(result).toContain('shared/handler.ts');
    });
  });

  // ===========================================================================
  // composeHooks - Basic
  // ===========================================================================

  describe('composeHooks', () => {
    it('should return empty hooks for empty sources array', () => {
      const result = composeHooks([]);

      expect(result.PreToolUse).toEqual([]);
      expect(result.PostToolUse).toEqual([]);
      expect(result.Stop).toEqual([]);
      expect(result.SubagentStop).toEqual([]);
    });

    it('should compose hooks from a single source', () => {
      const source: HookSource = {
        type: 'addon',
        name: 'test-addon',
        basePath: '/addons/test-addon',
        hooks: {
          PreToolUse: [
            { matcher: 'Bash', handler: 'handlers/bash.ts' },
          ],
        },
      };

      const result = composeHooks([source]);

      expect(result.PreToolUse).toHaveLength(1);
      expect(result.PreToolUse[0]!.matcher).toBe('Bash');
      expect(result.PreToolUse[0]!.source).toBe('test-addon');
    });

    it('should compose hooks from multiple sources', () => {
      const sources: HookSource[] = [
        {
          type: 'addon',
          name: 'addon-a',
          basePath: '/addons/a',
          hooks: {
            PreToolUse: [
              { matcher: 'Read', handler: 'read.ts' },
            ],
          },
        },
        {
          type: 'addon',
          name: 'addon-b',
          basePath: '/addons/b',
          hooks: {
            PreToolUse: [
              { matcher: 'Write', handler: 'write.ts' },
            ],
          },
        },
      ];

      const result = composeHooks(sources);

      expect(result.PreToolUse).toHaveLength(2);
      expect(result.PreToolUse.map(h => h.matcher)).toContain('Read');
      expect(result.PreToolUse.map(h => h.matcher)).toContain('Write');
    });

    it('should handle all event types', () => {
      const source: HookSource = {
        type: 'addon',
        name: 'full-addon',
        basePath: '/addons/full',
        hooks: {
          PreToolUse: [{ matcher: 'pre', handler: 'pre.ts' }],
          PostToolUse: [{ matcher: 'post', handler: 'post.ts' }],
          Stop: [{ matcher: 'stop', handler: 'stop.ts' }],
          SubagentStop: [{ matcher: 'subagent', handler: 'subagent.ts' }],
        },
      };

      const result = composeHooks([source]);

      expect(result.PreToolUse).toHaveLength(1);
      expect(result.PostToolUse).toHaveLength(1);
      expect(result.Stop).toHaveLength(1);
      expect(result.SubagentStop).toHaveLength(1);
    });

    it('should filter out disabled hooks', () => {
      const source: HookSource = {
        type: 'addon',
        name: 'addon',
        basePath: '/addons/test',
        hooks: {
          PreToolUse: [
            { matcher: 'enabled', handler: 'a.ts', enabled: true },
            { matcher: 'disabled', handler: 'b.ts', enabled: false },
          ],
        },
      };

      const result = composeHooks([source]);

      expect(result.PreToolUse).toHaveLength(1);
      expect(result.PreToolUse[0]!.matcher).toBe('enabled');
    });

    it('should default enabled to true when not specified', () => {
      const source: HookSource = {
        type: 'addon',
        name: 'addon',
        basePath: '/addons/test',
        hooks: {
          PreToolUse: [
            { matcher: 'test', handler: 'test.ts' },
          ],
        },
      };

      const result = composeHooks([source]);

      expect(result.PreToolUse).toHaveLength(1);
      expect(result.PreToolUse[0]!.enabled).toBe(true);
    });
  });

  // ===========================================================================
  // composeHooks - Sorting
  // ===========================================================================

  describe('composeHooks - priority sorting', () => {
    it('should sort hooks by priority (lower first)', () => {
      const source: HookSource = {
        type: 'addon',
        name: 'addon',
        basePath: '/addons/test',
        hooks: {
          PreToolUse: [
            { matcher: 'high', handler: 'high.ts', priority: 100 },
            { matcher: 'low', handler: 'low.ts', priority: -10 },
            { matcher: 'medium', handler: 'medium.ts', priority: 50 },
          ],
        },
      };

      const result = composeHooks([source]);

      expect(result.PreToolUse[0]!.matcher).toBe('low');
      expect(result.PreToolUse[1]!.matcher).toBe('medium');
      expect(result.PreToolUse[2]!.matcher).toBe('high');
    });

    it('should maintain order for equal priorities', () => {
      const sources: HookSource[] = [
        {
          type: 'addon',
          name: 'addon-a',
          basePath: '/addons/a',
          hooks: {
            PreToolUse: [
              { matcher: 'first', handler: 'a.ts', priority: 0 },
            ],
          },
        },
        {
          type: 'addon',
          name: 'addon-b',
          basePath: '/addons/b',
          hooks: {
            PreToolUse: [
              { matcher: 'second', handler: 'b.ts', priority: 0 },
            ],
          },
        },
      ];

      const result = composeHooks(sources);

      expect(result.PreToolUse).toHaveLength(2);
      // Both have priority 0, so order should be stable based on source order
    });

    it('should default priority to 0', () => {
      const source: HookSource = {
        type: 'addon',
        name: 'addon',
        basePath: '/addons/test',
        hooks: {
          PreToolUse: [
            { matcher: 'test', handler: 'test.ts' },
          ],
        },
      };

      const result = composeHooks([source]);

      expect(result.PreToolUse[0]!.priority).toBe(0);
    });
  });

  // ===========================================================================
  // composeHooks - Match Types
  // ===========================================================================

  describe('composeHooks - match type detection', () => {
    it('should detect glob patterns', () => {
      const source: HookSource = {
        type: 'addon',
        name: 'addon',
        basePath: '/addons/test',
        hooks: {
          PreToolUse: [
            { matcher: 'Bash*', handler: 'bash.ts' },
            { matcher: 'Read[File]', handler: 'read.ts' },
            { matcher: '*.ts', handler: 'ts.ts' },
          ],
        },
      };

      const result = composeHooks([source]);

      expect(result.PreToolUse[0]!.matchType).toBe('glob');
      expect(result.PreToolUse[1]!.matchType).toBe('glob');
      expect(result.PreToolUse[2]!.matchType).toBe('glob');
    });

    it('should detect regex patterns', () => {
      const source: HookSource = {
        type: 'addon',
        name: 'addon',
        basePath: '/addons/test',
        hooks: {
          PreToolUse: [
            { matcher: '/^Bash.*$/', handler: 'bash.ts' },
          ],
        },
      };

      const result = composeHooks([source]);

      expect(result.PreToolUse[0]!.matchType).toBe('regex');
    });

    it('should detect exact matches', () => {
      const source: HookSource = {
        type: 'addon',
        name: 'addon',
        basePath: '/addons/test',
        hooks: {
          PreToolUse: [
            { matcher: 'Bash', handler: 'bash.ts' },
            { matcher: 'Write', handler: 'write.ts' },
          ],
        },
      };

      const result = composeHooks([source]);

      expect(result.PreToolUse[0]!.matchType).toBe('exact');
      expect(result.PreToolUse[1]!.matchType).toBe('exact');
    });
  });

  // ===========================================================================
  // toSettingsFormat
  // ===========================================================================

  describe('toSettingsFormat', () => {
    it('should return empty object for empty hooks', () => {
      const hooks = createEmptyHooks();
      const result = toSettingsFormat(hooks);

      expect(result).toEqual({});
    });

    it('should convert PreToolUse hooks', () => {
      const hooks: ComposedHooks = {
        PreToolUse: [
          {
            name: 'test-hook',
            matcher: 'Bash',
            matchType: 'exact',
            priority: 10,
            enabled: true,
            source: 'test-addon',
            handle: () => ({ action: 'continue' }),
          },
        ],
        PostToolUse: [],
        Stop: [],
        SubagentStop: [],
      };

      const result = toSettingsFormat(hooks);

      expect(result.PreToolUse).toBeDefined();
      expect(result.PreToolUse).toHaveLength(1);
      expect(result.PreToolUse![0]!.matcher).toBe('Bash');
      expect(result.PreToolUse![0]!.priority).toBe(10);
    });

    it('should omit priority when zero', () => {
      const hooks: ComposedHooks = {
        PreToolUse: [
          {
            name: 'test-hook',
            matcher: 'Bash',
            matchType: 'exact',
            priority: 0,
            enabled: true,
            source: 'test-addon',
            handle: () => ({ action: 'continue' }),
          },
        ],
        PostToolUse: [],
        Stop: [],
        SubagentStop: [],
      };

      const result = toSettingsFormat(hooks);

      expect(result.PreToolUse![0]!.priority).toBeUndefined();
    });

    it('should omit enabled when true', () => {
      const hooks: ComposedHooks = {
        PreToolUse: [
          {
            name: 'test-hook',
            matcher: 'Bash',
            matchType: 'exact',
            priority: 0,
            enabled: true,
            source: 'test-addon',
            handle: () => ({ action: 'continue' }),
          },
        ],
        PostToolUse: [],
        Stop: [],
        SubagentStop: [],
      };

      const result = toSettingsFormat(hooks);

      expect(result.PreToolUse![0]!.enabled).toBeUndefined();
    });

    it('should include all event types', () => {
      const hooks: ComposedHooks = {
        PreToolUse: [
          {
            name: 'pre',
            matcher: 'Pre',
            matchType: 'exact',
            priority: 0,
            enabled: true,
            source: 'test',
            handle: () => ({ action: 'continue' }),
          },
        ],
        PostToolUse: [
          {
            name: 'post',
            matcher: 'Post',
            matchType: 'exact',
            priority: 0,
            enabled: true,
            source: 'test',
            handle: () => ({ action: 'continue' }),
          },
        ],
        Stop: [
          {
            name: 'stop',
            matcher: 'Stop',
            matchType: 'exact',
            priority: 0,
            enabled: true,
            source: 'test',
            handle: () => ({ action: 'continue' }),
          },
        ],
        SubagentStop: [
          {
            name: 'subagent',
            matcher: 'Subagent',
            matchType: 'exact',
            priority: 0,
            enabled: true,
            source: 'test',
            handle: () => ({ action: 'continue' }),
          },
        ],
      };

      const result = toSettingsFormat(hooks);

      expect(result.PreToolUse).toBeDefined();
      expect(result.PostToolUse).toBeDefined();
      expect(result.Stop).toBeDefined();
      expect(result.SubagentStop).toBeDefined();
    });
  });

  // ===========================================================================
  // Utility Functions
  // ===========================================================================

  describe('isHooksEmpty', () => {
    it('should return true for empty hooks', () => {
      const hooks = createEmptyHooks();
      expect(isHooksEmpty(hooks)).toBe(true);
    });

    it('should return false when PreToolUse has handlers', () => {
      const hooks: ComposedHooks = {
        ...createEmptyHooks(),
        PreToolUse: [{
          name: 'test',
          matcher: 'test',
          matchType: 'exact',
          priority: 0,
          enabled: true,
          source: 'test',
          handle: () => ({ action: 'continue' }),
        }],
      };
      expect(isHooksEmpty(hooks)).toBe(false);
    });

    it('should return false when any event type has handlers', () => {
      const hooks: ComposedHooks = {
        ...createEmptyHooks(),
        SubagentStop: [{
          name: 'test',
          matcher: 'test',
          matchType: 'exact',
          priority: 0,
          enabled: true,
          source: 'test',
          handle: () => ({ action: 'continue' }),
        }],
      };
      expect(isHooksEmpty(hooks)).toBe(false);
    });
  });

  describe('createEmptyHooks', () => {
    it('should create hooks with empty arrays', () => {
      const hooks = createEmptyHooks();

      expect(hooks.PreToolUse).toEqual([]);
      expect(hooks.PostToolUse).toEqual([]);
      expect(hooks.Stop).toEqual([]);
      expect(hooks.SubagentStop).toEqual([]);
    });
  });

  describe('getHookCount', () => {
    it('should return 0 for empty hooks', () => {
      const hooks = createEmptyHooks();
      expect(getHookCount(hooks)).toBe(0);
    });

    it('should count all hooks across event types', () => {
      const hooks: ComposedHooks = {
        PreToolUse: [
          { name: 'a', matcher: 'a', matchType: 'exact', priority: 0, enabled: true, source: 'test', handle: () => ({ action: 'continue' }) },
          { name: 'b', matcher: 'b', matchType: 'exact', priority: 0, enabled: true, source: 'test', handle: () => ({ action: 'continue' }) },
        ],
        PostToolUse: [
          { name: 'c', matcher: 'c', matchType: 'exact', priority: 0, enabled: true, source: 'test', handle: () => ({ action: 'continue' }) },
        ],
        Stop: [],
        SubagentStop: [
          { name: 'd', matcher: 'd', matchType: 'exact', priority: 0, enabled: true, source: 'test', handle: () => ({ action: 'continue' }) },
        ],
      };

      expect(getHookCount(hooks)).toBe(4);
    });
  });

  describe('mergeComposedHooks', () => {
    it('should merge two empty hooks', () => {
      const a = createEmptyHooks();
      const b = createEmptyHooks();
      const result = mergeComposedHooks(a, b);

      expect(isHooksEmpty(result)).toBe(true);
    });

    it('should combine handlers from both hooks', () => {
      const a: ComposedHooks = {
        ...createEmptyHooks(),
        PreToolUse: [
          { name: 'a', matcher: 'a', matchType: 'exact', priority: 0, enabled: true, source: 'addon-a', handle: () => ({ action: 'continue' }) },
        ],
      };
      const b: ComposedHooks = {
        ...createEmptyHooks(),
        PreToolUse: [
          { name: 'b', matcher: 'b', matchType: 'exact', priority: 0, enabled: true, source: 'addon-b', handle: () => ({ action: 'continue' }) },
        ],
      };

      const result = mergeComposedHooks(a, b);

      expect(result.PreToolUse).toHaveLength(2);
    });

    it('should re-sort after merging', () => {
      const a: ComposedHooks = {
        ...createEmptyHooks(),
        PreToolUse: [
          { name: 'high', matcher: 'high', matchType: 'exact', priority: 100, enabled: true, source: 'test', handle: () => ({ action: 'continue' }) },
        ],
      };
      const b: ComposedHooks = {
        ...createEmptyHooks(),
        PreToolUse: [
          { name: 'low', matcher: 'low', matchType: 'exact', priority: -10, enabled: true, source: 'test', handle: () => ({ action: 'continue' }) },
        ],
      };

      const result = mergeComposedHooks(a, b);

      expect(result.PreToolUse[0]!.name).toBe('low');
      expect(result.PreToolUse[1]!.name).toBe('high');
    });
  });

  describe('filterHooksBySource', () => {
    it('should return only hooks from specified source', () => {
      const hooks: ComposedHooks = {
        PreToolUse: [
          { name: 'a', matcher: 'a', matchType: 'exact', priority: 0, enabled: true, source: 'addon-a', handle: () => ({ action: 'continue' }) },
          { name: 'b', matcher: 'b', matchType: 'exact', priority: 0, enabled: true, source: 'addon-b', handle: () => ({ action: 'continue' }) },
        ],
        PostToolUse: [],
        Stop: [],
        SubagentStop: [],
      };

      const result = filterHooksBySource(hooks, 'addon-a');

      expect(result.PreToolUse).toHaveLength(1);
      expect(result.PreToolUse[0]!.source).toBe('addon-a');
    });

    it('should return empty hooks when source not found', () => {
      const hooks: ComposedHooks = {
        PreToolUse: [
          { name: 'a', matcher: 'a', matchType: 'exact', priority: 0, enabled: true, source: 'addon-a', handle: () => ({ action: 'continue' }) },
        ],
        PostToolUse: [],
        Stop: [],
        SubagentStop: [],
      };

      const result = filterHooksBySource(hooks, 'nonexistent');

      expect(isHooksEmpty(result)).toBe(true);
    });
  });

  describe('removeHooksBySource', () => {
    it('should remove hooks from specified source', () => {
      const hooks: ComposedHooks = {
        PreToolUse: [
          { name: 'a', matcher: 'a', matchType: 'exact', priority: 0, enabled: true, source: 'addon-a', handle: () => ({ action: 'continue' }) },
          { name: 'b', matcher: 'b', matchType: 'exact', priority: 0, enabled: true, source: 'addon-b', handle: () => ({ action: 'continue' }) },
        ],
        PostToolUse: [],
        Stop: [],
        SubagentStop: [],
      };

      const result = removeHooksBySource(hooks, 'addon-a');

      expect(result.PreToolUse).toHaveLength(1);
      expect(result.PreToolUse[0]!.source).toBe('addon-b');
    });

    it('should return unchanged hooks when source not found', () => {
      const hooks: ComposedHooks = {
        PreToolUse: [
          { name: 'a', matcher: 'a', matchType: 'exact', priority: 0, enabled: true, source: 'addon-a', handle: () => ({ action: 'continue' }) },
        ],
        PostToolUse: [],
        Stop: [],
        SubagentStop: [],
      };

      const result = removeHooksBySource(hooks, 'nonexistent');

      expect(result.PreToolUse).toHaveLength(1);
    });
  });

  describe('getHookSources', () => {
    it('should return empty array for empty hooks', () => {
      const hooks = createEmptyHooks();
      const sources = getHookSources(hooks);

      expect(sources).toEqual([]);
    });

    it('should return unique sorted source names', () => {
      const hooks: ComposedHooks = {
        PreToolUse: [
          { name: 'a', matcher: 'a', matchType: 'exact', priority: 0, enabled: true, source: 'addon-b', handle: () => ({ action: 'continue' }) },
          { name: 'b', matcher: 'b', matchType: 'exact', priority: 0, enabled: true, source: 'addon-a', handle: () => ({ action: 'continue' }) },
          { name: 'c', matcher: 'c', matchType: 'exact', priority: 0, enabled: true, source: 'addon-b', handle: () => ({ action: 'continue' }) },
        ],
        PostToolUse: [
          { name: 'd', matcher: 'd', matchType: 'exact', priority: 0, enabled: true, source: 'addon-c', handle: () => ({ action: 'continue' }) },
        ],
        Stop: [],
        SubagentStop: [],
      };

      const sources = getHookSources(hooks);

      expect(sources).toEqual(['addon-a', 'addon-b', 'addon-c']);
    });
  });
});
