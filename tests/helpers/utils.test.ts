/**
 * Tests for shared test utilities
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import {
  createTempDir,
  removeTempDir,
  createFile,
  createJsonFile,
  readJsonFile,
  fileExists,
  createDirStructure,
} from './utils.js';

describe('test utilities', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await removeTempDir(tempDir);
    }
  });

  describe('createTempDir', () => {
    it('should create a temporary directory', async () => {
      tempDir = await createTempDir('utils-test-');
      expect(await fileExists(tempDir)).toBe(true);

      // Verify it's in the temp directory
      const stats = await fs.stat(tempDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should use custom prefix', async () => {
      tempDir = await createTempDir('custom-prefix-');
      expect(path.basename(tempDir)).toMatch(/^custom-prefix-/);
    });

    it('should create unique directories', async () => {
      const dir1 = await createTempDir('unique-');
      const dir2 = await createTempDir('unique-');

      expect(dir1).not.toBe(dir2);

      // Cleanup
      await removeTempDir(dir1);
      await removeTempDir(dir2);
    });
  });

  describe('removeTempDir', () => {
    it('should remove an empty directory', async () => {
      tempDir = await createTempDir('remove-test-');
      expect(await fileExists(tempDir)).toBe(true);

      await removeTempDir(tempDir);
      expect(await fileExists(tempDir)).toBe(false);
      tempDir = ''; // prevent double cleanup
    });

    it('should remove a directory with contents', async () => {
      tempDir = await createTempDir('remove-test-');
      await createFile(path.join(tempDir, 'test.txt'), 'content');
      await fs.mkdir(path.join(tempDir, 'subdir'));
      await createFile(path.join(tempDir, 'subdir', 'nested.txt'), 'nested');

      await removeTempDir(tempDir);
      expect(await fileExists(tempDir)).toBe(false);
      tempDir = ''; // prevent double cleanup
    });

    it('should not throw for non-existent directory', async () => {
      // Should complete without throwing
      await removeTempDir('/nonexistent/path');
    });
  });

  describe('createFile', () => {
    it('should create a file with content', async () => {
      tempDir = await createTempDir('file-test-');
      const filePath = path.join(tempDir, 'test.txt');

      await createFile(filePath, 'test content');

      expect(await fileExists(filePath)).toBe(true);
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('test content');
    });

    it('should create parent directories if they do not exist', async () => {
      tempDir = await createTempDir('file-test-');
      const filePath = path.join(tempDir, 'deep', 'nested', 'path', 'test.txt');

      await createFile(filePath, 'nested content');

      expect(await fileExists(filePath)).toBe(true);
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('nested content');
    });
  });

  describe('createJsonFile', () => {
    it('should create a JSON file from an object', async () => {
      tempDir = await createTempDir('json-test-');
      const filePath = path.join(tempDir, 'data.json');
      const data = { name: 'test', value: 42, nested: { key: 'value' } };

      await createJsonFile(filePath, data);

      expect(await fileExists(filePath)).toBe(true);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(data);
    });

    it('should format JSON with 2-space indentation', async () => {
      tempDir = await createTempDir('json-test-');
      const filePath = path.join(tempDir, 'data.json');

      await createJsonFile(filePath, { key: 'value' });

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('  '); // Should have indentation
    });
  });

  describe('readJsonFile', () => {
    it('should read and parse a JSON file', async () => {
      tempDir = await createTempDir('json-test-');
      const filePath = path.join(tempDir, 'data.json');
      const data = { name: 'test', value: 42 };

      await createJsonFile(filePath, data);
      const result = await readJsonFile<typeof data>(filePath);

      expect(result).toEqual(data);
    });

    it('should throw for invalid JSON', async () => {
      tempDir = await createTempDir('json-test-');
      const filePath = path.join(tempDir, 'invalid.json');

      await createFile(filePath, 'not valid json{]');

      await expect(readJsonFile(filePath)).rejects.toThrow();
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      tempDir = await createTempDir('exists-test-');
      const filePath = path.join(tempDir, 'exists.txt');

      await createFile(filePath, 'content');

      expect(await fileExists(filePath)).toBe(true);
    });

    it('should return true for existing directory', async () => {
      tempDir = await createTempDir('exists-test-');

      expect(await fileExists(tempDir)).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      tempDir = await createTempDir('exists-test-');
      const filePath = path.join(tempDir, 'nonexistent.txt');

      expect(await fileExists(filePath)).toBe(false);
    });
  });

  describe('createDirStructure', () => {
    it('should create files from flat structure', async () => {
      tempDir = await createTempDir('structure-test-');

      await createDirStructure(tempDir, {
        'file1.txt': 'content 1',
        'file2.txt': 'content 2',
      });

      expect(await fileExists(path.join(tempDir, 'file1.txt'))).toBe(true);
      expect(await fileExists(path.join(tempDir, 'file2.txt'))).toBe(true);

      const content1 = await fs.readFile(path.join(tempDir, 'file1.txt'), 'utf-8');
      expect(content1).toBe('content 1');
    });

    it('should create nested directory structure', async () => {
      tempDir = await createTempDir('structure-test-');

      await createDirStructure(tempDir, {
        'root.txt': 'root content',
        'dir1': {
          'nested1.txt': 'nested content 1',
          'nested2.txt': 'nested content 2',
        },
        'dir2': {
          'subdir': {
            'deep.txt': 'deep content',
          },
        },
      });

      // Check root file
      expect(await fileExists(path.join(tempDir, 'root.txt'))).toBe(true);

      // Check nested files
      expect(await fileExists(path.join(tempDir, 'dir1', 'nested1.txt'))).toBe(true);
      expect(await fileExists(path.join(tempDir, 'dir1', 'nested2.txt'))).toBe(true);

      // Check deeply nested file
      const deepPath = path.join(tempDir, 'dir2', 'subdir', 'deep.txt');
      expect(await fileExists(deepPath)).toBe(true);

      const deepContent = await fs.readFile(deepPath, 'utf-8');
      expect(deepContent).toBe('deep content');
    });

    it('should handle empty directories', async () => {
      tempDir = await createTempDir('structure-test-');

      await createDirStructure(tempDir, {
        'file.txt': 'content',
        'emptyDir': {},
      });

      expect(await fileExists(path.join(tempDir, 'file.txt'))).toBe(true);
      expect(await fileExists(path.join(tempDir, 'emptyDir'))).toBe(true);

      const stats = await fs.stat(path.join(tempDir, 'emptyDir'));
      expect(stats.isDirectory()).toBe(true);
    });

    it('should handle complex nested structures', async () => {
      tempDir = await createTempDir('structure-test-');

      await createDirStructure(tempDir, {
        'package.json': JSON.stringify({ name: 'test' }),
        'src': {
          'index.ts': 'export const main = () => {};',
          'utils': {
            'helpers.ts': 'export const helper = () => {};',
          },
        },
        'tests': {
          'index.test.ts': 'describe("test", () => {});',
        },
      });

      // Verify structure
      expect(await fileExists(path.join(tempDir, 'package.json'))).toBe(true);
      expect(await fileExists(path.join(tempDir, 'src', 'index.ts'))).toBe(true);
      expect(await fileExists(path.join(tempDir, 'src', 'utils', 'helpers.ts'))).toBe(true);
      expect(await fileExists(path.join(tempDir, 'tests', 'index.test.ts'))).toBe(true);

      // Verify content
      const pkg = await fs.readFile(path.join(tempDir, 'package.json'), 'utf-8');
      expect(pkg).toContain('test');
    });
  });
});
