/**
 * Unit tests for configuration merging utilities
 */

import { describe, it, expect, vi } from 'vitest';
import {
  merge,
  resolveInheritance,
  getInheritanceChain,
  createCachedResolver,
  createHybridResolver,
  mergeEnabledDisabled,
} from './merger.js';
import { ConfigError } from './parser.js';

describe('merger', () => {
  describe('merge', () => {
    it('should return empty object for empty array', () => {
      const result = merge([]);
      expect(result).toEqual({});
    });

    it('should return copy of single config', () => {
      const config = { name: 'test', value: 42 };
      const result = merge([config]);

      expect(result).toEqual(config);
      expect(result).not.toBe(config); // Should be a copy
    });

    it('should merge two simple objects', () => {
      const result = merge([{ a: 1 }, { b: 2 }]);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should override values from later configs', () => {
      const result = merge([{ a: 1, b: 2 }, { a: 10 }]);

      expect(result).toEqual({ a: 10, b: 2 });
    });

    it('should deep merge nested objects', () => {
      const result = merge([
        { settings: { debug: true, level: 1 } },
        { settings: { level: 5 } },
      ]);

      expect(result).toEqual({
        settings: { debug: true, level: 5 },
      });
    });

    it('should replace arrays (not concatenate)', () => {
      const result = merge([{ tags: ['a', 'b'] }, { tags: ['c'] }]);

      expect(result).toEqual({ tags: ['c'] });
    });

    it('should handle null values', () => {
      const result = merge([{ a: 'value' }, { a: null }]);

      expect(result).toEqual({ a: null });
    });

    it('should skip undefined values', () => {
      const result = merge([{ a: 'value', b: 'keep' }, { a: undefined }]);

      expect(result).toEqual({ a: 'value', b: 'keep' });
    });

    it('should merge multiple configs in order', () => {
      const result = merge([
        { a: 1, b: 1, c: 1 },
        { a: 2, b: 2 },
        { a: 3 },
      ]);

      expect(result).toEqual({ a: 3, b: 2, c: 1 });
    });

    it('should handle deeply nested objects', () => {
      const result = merge([
        { a: { b: { c: { d: 1 } } } },
        { a: { b: { c: { e: 2 } } } },
      ]);

      expect(result).toEqual({
        a: { b: { c: { d: 1, e: 2 } } },
      });
    });

    it('should handle mixed types (object to primitive)', () => {
      const result = merge([
        { a: { nested: true } },
        { a: 'replaced' },
      ]);

      expect(result).toEqual({ a: 'replaced' });
    });

    it('should handle mixed types (primitive to object)', () => {
      const result = merge([
        { a: 'primitive' },
        { a: { nested: true } },
      ]);

      expect(result).toEqual({ a: { nested: true } });
    });
  });

  describe('resolveInheritance', () => {
    it('should return config as-is when no extends', async () => {
      const config = { name: 'test', value: 42 };
      const resolver = vi.fn();

      const result = await resolveInheritance(config, resolver);

      expect(result).toEqual({ name: 'test', value: 42 });
      expect(resolver).not.toHaveBeenCalled();
    });

    it('should resolve single-level inheritance', async () => {
      const parent = { a: 1, b: 2 };
      const child = { extends: 'parent.toml', b: 20, c: 3 };

      const resolver = vi.fn().mockResolvedValue(parent);

      const result = await resolveInheritance(child, resolver);

      expect(result).toEqual({ a: 1, b: 20, c: 3 });
      expect(resolver).toHaveBeenCalledWith('parent.toml');
    });

    it('should resolve multi-level inheritance', async () => {
      const grandparent = { a: 1 };
      const parent = { extends: 'grandparent.toml', b: 2 };
      const child = { extends: 'parent.toml', c: 3 };

      const resolver = vi.fn().mockImplementation((url: string) => {
        if (url === 'parent.toml') return Promise.resolve(parent);
        if (url === 'grandparent.toml') return Promise.resolve(grandparent);
        throw new Error(`Unknown URL: ${url}`);
      });

      const result = await resolveInheritance(child, resolver);

      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should detect circular inheritance', async () => {
      const configA = { extends: 'b.toml', name: 'A' };
      const configB = { extends: 'a.toml', name: 'B' };

      const resolver = vi.fn().mockImplementation((url: string) => {
        if (url === 'a.toml') return Promise.resolve(configA);
        if (url === 'b.toml') return Promise.resolve(configB);
        throw new Error(`Unknown URL: ${url}`);
      });

      await expect(resolveInheritance(configA, resolver)).rejects.toThrow(
        ConfigError
      );
    });

    it('should throw on max depth exceeded', async () => {
      // Create a chain deeper than MAX_INHERITANCE_DEPTH
      const createConfig = (depth: number): { extends?: string; depth: number } => ({
        extends: depth > 0 ? `config-${depth - 1}.toml` : undefined,
        depth,
      });

      const resolver = vi.fn().mockImplementation((url: string) => {
        const match = url.match(/config-(\d+)\.toml/);
        if (match && match[1]) {
          return Promise.resolve(createConfig(parseInt(match[1], 10)));
        }
        throw new Error(`Unknown URL: ${url}`);
      });

      const deepConfig = { extends: 'config-15.toml', depth: 16 };

      await expect(resolveInheritance(deepConfig, resolver)).rejects.toThrow(
        /Maximum inheritance depth/
      );
    });

    it('should throw on resolver error', async () => {
      const config = { extends: 'missing.toml', name: 'test' };
      const resolver = vi.fn().mockRejectedValue(new Error('Not found'));

      await expect(resolveInheritance(config, resolver)).rejects.toThrow(
        ConfigError
      );
    });

    it('should remove extends from result', async () => {
      const config = { extends: 'parent.toml', name: 'child' };
      const resolver = vi.fn().mockResolvedValue({ base: true });

      const result = await resolveInheritance(config, resolver);

      expect(result).not.toHaveProperty('extends');
    });
  });

  describe('getInheritanceChain', () => {
    it('should return empty array when no extends', async () => {
      const config = { name: 'test' };
      const resolver = vi.fn();

      const chain = await getInheritanceChain(config, resolver);

      expect(chain).toEqual([]);
    });

    it('should return inheritance chain in order', async () => {
      const grandparent = { name: 'grandparent' };
      const parent = { extends: 'grandparent.toml', name: 'parent' };
      const child = { extends: 'parent.toml', name: 'child' };

      const resolver = vi.fn().mockImplementation((url: string) => {
        if (url === 'parent.toml') return Promise.resolve(parent);
        if (url === 'grandparent.toml') return Promise.resolve(grandparent);
        throw new Error(`Unknown URL: ${url}`);
      });

      const chain = await getInheritanceChain(child, resolver);

      expect(chain).toEqual(['grandparent.toml', 'parent.toml']);
    });
  });

  describe('createCachedResolver', () => {
    it('should cache successful resolutions', async () => {
      const baseResolver = vi
        .fn()
        .mockResolvedValue({ name: 'cached' });
      const cachedResolver = createCachedResolver(baseResolver);

      const result1 = await cachedResolver('config.toml');
      const result2 = await cachedResolver('config.toml');

      expect(result1).toEqual({ name: 'cached' });
      expect(result2).toEqual({ name: 'cached' });
      expect(baseResolver).toHaveBeenCalledTimes(1);
    });

    it('should not cache failed resolutions', async () => {
      let callCount = 0;
      const baseResolver = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First call fails'));
        }
        return Promise.resolve({ name: 'success' });
      });

      const cachedResolver = createCachedResolver(baseResolver);

      await expect(cachedResolver('config.toml')).rejects.toThrow(
        'First call fails'
      );
      const result = await cachedResolver('config.toml');

      expect(result).toEqual({ name: 'success' });
      expect(baseResolver).toHaveBeenCalledTimes(2);
    });

    it('should cache different URLs separately', async () => {
      const baseResolver = vi.fn().mockImplementation((url: string) => {
        return Promise.resolve({ url });
      });

      const cachedResolver = createCachedResolver(baseResolver);

      const result1 = await cachedResolver('a.toml');
      const result2 = await cachedResolver('b.toml');
      await cachedResolver('a.toml');
      await cachedResolver('b.toml');

      expect(result1).toEqual({ url: 'a.toml' });
      expect(result2).toEqual({ url: 'b.toml' });
      expect(baseResolver).toHaveBeenCalledTimes(2);
    });
  });

  describe('createHybridResolver', () => {
    it('should use file resolver for local paths', async () => {
      const fileResolver = vi.fn().mockResolvedValue({ source: 'file' });
      const urlResolver = vi.fn().mockResolvedValue({ source: 'url' });

      const resolver = createHybridResolver(fileResolver, urlResolver);

      const result = await resolver('/path/to/config.toml');

      expect(result).toEqual({ source: 'file' });
      expect(fileResolver).toHaveBeenCalledWith('/path/to/config.toml');
      expect(urlResolver).not.toHaveBeenCalled();
    });

    it('should use URL resolver for HTTP URLs', async () => {
      const fileResolver = vi.fn().mockResolvedValue({ source: 'file' });
      const urlResolver = vi.fn().mockResolvedValue({ source: 'url' });

      const resolver = createHybridResolver(fileResolver, urlResolver);

      const result = await resolver('https://example.com/config.toml');

      expect(result).toEqual({ source: 'url' });
      expect(urlResolver).toHaveBeenCalledWith(
        'https://example.com/config.toml'
      );
      expect(fileResolver).not.toHaveBeenCalled();
    });

    it('should treat relative paths as file paths', async () => {
      const fileResolver = vi.fn().mockResolvedValue({ source: 'file' });
      const urlResolver = vi.fn().mockResolvedValue({ source: 'url' });

      const resolver = createHybridResolver(fileResolver, urlResolver);

      const result = await resolver('relative/path/config.toml');

      expect(result).toEqual({ source: 'file' });
      expect(fileResolver).toHaveBeenCalledWith('relative/path/config.toml');
    });
  });

  describe('mergeEnabledDisabled', () => {
    it('should merge empty configs', () => {
      const result = mergeEnabledDisabled({}, {});

      expect(result).toEqual({ enabled: [], disabled: [] });
    });

    it('should preserve base enabled items', () => {
      const result = mergeEnabledDisabled(
        { enabled: ['a', 'b'] },
        {}
      );

      expect(result).toEqual({ enabled: ['a', 'b'], disabled: [] });
    });

    it('should add override enabled items', () => {
      const result = mergeEnabledDisabled(
        { enabled: ['a'] },
        { enabled: ['b'] }
      );

      expect(result).toEqual({ enabled: ['a', 'b'], disabled: [] });
    });

    it('should remove from disabled when enabled in override', () => {
      const result = mergeEnabledDisabled(
        { disabled: ['a', 'b'] },
        { enabled: ['a'] }
      );

      expect(result.enabled).toContain('a');
      expect(result.disabled).not.toContain('a');
      expect(result.disabled).toContain('b');
    });

    it('should remove from enabled when disabled in override', () => {
      const result = mergeEnabledDisabled(
        { enabled: ['a', 'b'] },
        { disabled: ['a'] }
      );

      expect(result.enabled).not.toContain('a');
      expect(result.enabled).toContain('b');
      expect(result.disabled).toContain('a');
    });

    it('should handle conflicts (disabled wins)', () => {
      const result = mergeEnabledDisabled(
        { enabled: ['a'] },
        { enabled: ['a'], disabled: ['a'] }
      );

      expect(result.enabled).not.toContain('a');
      expect(result.disabled).toContain('a');
    });

    it('should sort results', () => {
      const result = mergeEnabledDisabled(
        { enabled: ['c', 'a', 'b'] },
        {}
      );

      expect(result.enabled).toEqual(['a', 'b', 'c']);
    });

    it('should handle complex merge scenario', () => {
      const result = mergeEnabledDisabled(
        { enabled: ['a', 'b'], disabled: ['x', 'y'] },
        { enabled: ['c', 'x'], disabled: ['b', 'z'] }
      );

      // 'a' stays enabled (not in override disabled)
      expect(result.enabled).toContain('a');
      // 'b' gets disabled (in override disabled)
      expect(result.disabled).toContain('b');
      expect(result.enabled).not.toContain('b');
      // 'c' gets enabled (in override enabled)
      expect(result.enabled).toContain('c');
      // 'x' gets enabled (was disabled, now in override enabled)
      expect(result.enabled).toContain('x');
      expect(result.disabled).not.toContain('x');
      // 'y' stays disabled
      expect(result.disabled).toContain('y');
      // 'z' gets disabled
      expect(result.disabled).toContain('z');
    });
  });
});
