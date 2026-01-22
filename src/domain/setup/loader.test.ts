/**
 * Unit tests for loader
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as tar from 'tar';
import {
  createSetupLoader,
  listBuiltinSetups,
  isSetupDirectory,
  SetupLoadError,
} from './loader.js';

describe('loader', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'loader-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a valid setup in a directory
   */
  async function createSetup(dir: string, name: string, options?: {
    extends?: string;
    content?: string;
  }) {
    await fs.mkdir(dir, { recursive: true });

    const manifest = `
[setup]
name = "${name}"
version = "1.0.0"
${options?.extends ? `extends = "${options.extends}"` : ''}

[skills]
enabled = []

[hooks]
templates = []
`;
    await fs.writeFile(path.join(dir, 'manifest.toml'), manifest);
    await fs.writeFile(
      path.join(dir, 'CLAUDE.md'),
      options?.content ?? `# ${name}\n\nTest setup.\n`,
    );
  }

  describe('loadFromDir', () => {
    it('should load a setup from a directory', async () => {
      const setupDir = path.join(tempDir, 'test-setup');
      await createSetup(setupDir, 'test-setup');

      const loader = createSetupLoader({ builtinDir: tempDir });
      const result = await loader.loadFromDir(setupDir);

      expect(result.manifest.name).toBe('test-setup');
      expect(result.manifest.version).toBe('1.0.0');
      expect(result.sourcePath).toBe(setupDir);
      expect(result.isRoot).toBe(true);
      expect(result.inheritanceChain).toContain('test-setup');
    });

    it('should load content from CLAUDE.md', async () => {
      const setupDir = path.join(tempDir, 'test-setup');
      await createSetup(setupDir, 'test-setup', {
        content: '# Custom Content\n\nThis is custom.',
      });

      const loader = createSetupLoader({ builtinDir: tempDir });
      const result = await loader.loadFromDir(setupDir);

      expect(result.content).toContain('Custom Content');
    });

    it('should work without CLAUDE.md', async () => {
      const setupDir = path.join(tempDir, 'test-setup');
      await fs.mkdir(setupDir, { recursive: true });
      await fs.writeFile(path.join(setupDir, 'manifest.toml'), `
name = "test-setup"
version = "1.0.0"
`);

      const loader = createSetupLoader({ builtinDir: tempDir });
      const result = await loader.loadFromDir(setupDir);

      expect(result.manifest.name).toBe('test-setup');
      expect(result.content).toBe('');
    });

    it('should throw for non-existent directory', async () => {
      const loader = createSetupLoader({ builtinDir: tempDir });
      // Throws SetupParseError because manifest doesn't exist
      await expect(loader.loadFromDir(path.join(tempDir, 'nonexistent'))).rejects.toThrow(
        /not found|ENOENT/,
      );
    });

    it('should resolve inheritance chain', async () => {
      // Create parent setup
      const parentDir = path.join(tempDir, 'parent');
      await createSetup(parentDir, 'parent');

      // Create child setup
      const childDir = path.join(tempDir, 'child');
      await createSetup(childDir, 'child', { extends: 'parent' });

      const loader = createSetupLoader({ builtinDir: tempDir });
      const result = await loader.loadFromDir(childDir);

      expect(result.inheritanceChain).toEqual(['child', 'parent']);
    });

    it('should detect circular inheritance', async () => {
      // Create setup A that extends B
      const setupADir = path.join(tempDir, 'setup-a');
      await createSetup(setupADir, 'setup-a', { extends: 'setup-b' });

      // Create setup B that extends A
      const setupBDir = path.join(tempDir, 'setup-b');
      await createSetup(setupBDir, 'setup-b', { extends: 'setup-a' });

      const loader = createSetupLoader({ builtinDir: tempDir });
      await expect(loader.loadFromDir(setupADir)).rejects.toThrow('Circular inheritance');
    });
  });

  describe('loadFromArchive', () => {
    it('should load a setup from a tar.gz archive', async () => {
      // Create setup
      const setupDir = path.join(tempDir, 'test-setup');
      await createSetup(setupDir, 'test-setup');

      // Create archive
      const archivePath = path.join(tempDir, 'test-setup.tar.gz');
      await tar.create(
        {
          gzip: true,
          file: archivePath,
          cwd: tempDir,
        },
        ['test-setup'],
      );

      const loader = createSetupLoader({ builtinDir: tempDir });
      const result = await loader.loadFromArchive(archivePath);

      expect(result.manifest.name).toBe('test-setup');
      expect(result.manifest.version).toBe('1.0.0');
    });

    it('should handle nested directory in archive', async () => {
      // Create nested structure
      const nestedDir = path.join(tempDir, 'outer', 'test-setup');
      await createSetup(nestedDir, 'test-setup');

      // Create archive with nested path
      const archivePath = path.join(tempDir, 'nested.tar.gz');
      await tar.create(
        {
          gzip: true,
          file: archivePath,
          cwd: tempDir,
        },
        ['outer'],
      );

      const loader = createSetupLoader({ builtinDir: tempDir });
      const result = await loader.loadFromArchive(archivePath);

      expect(result.manifest.name).toBe('test-setup');
    });

    it('should throw SetupLoadError for invalid archive', async () => {
      const archivePath = path.join(tempDir, 'invalid.tar.gz');
      await fs.writeFile(archivePath, 'not a valid archive');

      const loader = createSetupLoader({ builtinDir: tempDir });
      await expect(loader.loadFromArchive(archivePath)).rejects.toThrow(SetupLoadError);
    });

    it('should throw SetupLoadError for archive without manifest', async () => {
      // Create directory without manifest
      const emptyDir = path.join(tempDir, 'empty');
      await fs.mkdir(emptyDir);
      await fs.writeFile(path.join(emptyDir, 'README.md'), '# Empty');

      // Create archive
      const archivePath = path.join(tempDir, 'empty.tar.gz');
      await tar.create(
        {
          gzip: true,
          file: archivePath,
          cwd: tempDir,
        },
        ['empty'],
      );

      const loader = createSetupLoader({ builtinDir: tempDir });
      await expect(loader.loadFromArchive(archivePath)).rejects.toThrow('No manifest.toml');
    });
  });

  describe('loadBuiltin', () => {
    it('should load a builtin setup', async () => {
      // Create builtin setup
      const builtinDir = path.join(tempDir, 'builtins', 'minimal');
      await createSetup(builtinDir, 'minimal');

      const loader = createSetupLoader({ builtinDir: path.join(tempDir, 'builtins') });
      const result = await loader.loadBuiltin('minimal');

      expect(result.manifest.name).toBe('minimal');
    });

    it('should throw SetupLoadError for non-existent builtin', async () => {
      const loader = createSetupLoader({ builtinDir: path.join(tempDir, 'builtins') });
      await expect(loader.loadBuiltin('nonexistent')).rejects.toThrow(SetupLoadError);
    });
  });

  describe('loadFromUrl', () => {
    it('should load a setup from a URL', async () => {
      // Create setup
      const setupDir = path.join(tempDir, 'remote-setup');
      await createSetup(setupDir, 'remote-setup');

      // Create archive
      const archivePath = path.join(tempDir, 'remote-setup.tar.gz');
      await tar.create(
        {
          gzip: true,
          file: archivePath,
          cwd: tempDir,
        },
        ['remote-setup'],
      );

      // Read archive into buffer
      const archiveBuffer = await fs.readFile(archivePath);

      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(archiveBuffer.buffer),
      });

      const loader = createSetupLoader({
        builtinDir: tempDir,
        cacheDir: path.join(tempDir, 'cache'),
        fetch: mockFetch as unknown as typeof globalThis.fetch,
      });

      const result = await loader.loadFromUrl('https://example.com/setup.tar.gz');

      expect(result.manifest.name).toBe('remote-setup');
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/setup.tar.gz');
    });

    it('should throw SetupLoadError for failed HTTP request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const loader = createSetupLoader({
        builtinDir: tempDir,
        cacheDir: path.join(tempDir, 'cache'),
        fetch: mockFetch as unknown as typeof globalThis.fetch,
      });

      await expect(loader.loadFromUrl('https://example.com/notfound.tar.gz')).rejects.toThrow(
        SetupLoadError,
      );
    });
  });

  describe('listBuiltinSetups', () => {
    it('should list all builtin setups', async () => {
      const builtinDir = path.join(tempDir, 'builtins');

      // Create some builtin setups
      await createSetup(path.join(builtinDir, 'minimal'), 'minimal');
      await createSetup(path.join(builtinDir, 'fullstack'), 'fullstack');
      await createSetup(path.join(builtinDir, 'frontend'), 'frontend');

      const setups = await listBuiltinSetups(builtinDir);

      expect(setups).toContain('minimal');
      expect(setups).toContain('fullstack');
      expect(setups).toContain('frontend');
      expect(setups).toHaveLength(3);
    });

    it('should skip directories without manifest', async () => {
      const builtinDir = path.join(tempDir, 'builtins');

      await createSetup(path.join(builtinDir, 'valid'), 'valid');
      await fs.mkdir(path.join(builtinDir, 'invalid'), { recursive: true });
      await fs.writeFile(path.join(builtinDir, 'invalid', 'README.md'), '# Invalid');

      const setups = await listBuiltinSetups(builtinDir);

      expect(setups).toContain('valid');
      expect(setups).not.toContain('invalid');
    });

    it('should return empty array for non-existent directory', async () => {
      const setups = await listBuiltinSetups(path.join(tempDir, 'nonexistent'));
      expect(setups).toEqual([]);
    });

    it('should skip hidden directories', async () => {
      const builtinDir = path.join(tempDir, 'builtins');

      await createSetup(path.join(builtinDir, 'valid'), 'valid');
      await createSetup(path.join(builtinDir, '.hidden'), 'hidden');

      const setups = await listBuiltinSetups(builtinDir);

      expect(setups).toContain('valid');
      expect(setups).not.toContain('.hidden');
    });
  });

  describe('isSetupDirectory', () => {
    it('should return true for directory with manifest', async () => {
      const setupDir = path.join(tempDir, 'test-setup');
      await createSetup(setupDir, 'test-setup');

      expect(await isSetupDirectory(setupDir)).toBe(true);
    });

    it('should return false for directory without manifest', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      await fs.mkdir(emptyDir);

      expect(await isSetupDirectory(emptyDir)).toBe(false);
    });

    it('should return false for non-existent directory', async () => {
      expect(await isSetupDirectory(path.join(tempDir, 'nonexistent'))).toBe(false);
    });
  });
});
