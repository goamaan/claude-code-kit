/**
 * Addon Manager Tests
 *
 * NOTE: Many methods require refactoring to be fully testable.
 * The manager uses getStateFilePath() which returns a hardcoded path.
 * To properly test, we'd need to make state file path injectable.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  createAddonManager,
  AddonManagerError,
} from './manager.js';

describe('addon/manager', () => {
  describe('AddonManagerError', () => {
    it('should create error with message', () => {
      const error = new AddonManagerError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AddonManagerError');
    });

    it('should create error with addon name', () => {
      const error = new AddonManagerError('Test error', 'test-addon');
      expect(error.addon).toBe('test-addon');
    });

    it('should create error with cause', () => {
      const cause = new Error('Original error');
      const error = new AddonManagerError('Test error', 'test-addon', cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('createAddonManager', () => {
    it('should create manager instance', () => {
      const manager = createAddonManager();
      expect(manager).toBeDefined();
      expect(typeof manager.list).toBe('function');
      expect(typeof manager.get).toBe('function');
      expect(typeof manager.install).toBe('function');
      expect(typeof manager.update).toBe('function');
      expect(typeof manager.updateAll).toBe('function');
      expect(typeof manager.remove).toBe('function');
      expect(typeof manager.create).toBe('function');
      expect(typeof manager.enable).toBe('function');
      expect(typeof manager.disable).toBe('function');
      expect(typeof manager.isInstalled).toBe('function');
      expect(typeof manager.getRegistry).toBe('function');
    });

    it('should return registry from getRegistry', () => {
      const manager = createAddonManager();
      const registry = manager.getRegistry();
      expect(registry).toBeDefined();
      expect(typeof registry.search).toBe('function');
    });
  });

  // Tests that need state file path to be injectable
  describe.skip('list', () => {
    // Would need to inject state file path to test properly
    it('should list all installed addons', async () => {
      // Requires state file path injection
    });
  });

  describe.skip('get', () => {
    it('should return installed addon by name', async () => {
      // Requires state file path injection
    });

    it('should return null for non-existent addon', async () => {
      // Requires state file path injection
    });
  });

  describe.skip('install', () => {
    it('should install addon from path', async () => {
      // Requires installer refactoring
    });

    it('should install addon from github', async () => {
      // Requires network + installer refactoring
    });

    it('should install addon from registry', async () => {
      // Requires network + installer refactoring
    });
  });

  describe.skip('enable/disable', () => {
    it('should enable an addon', async () => {
      // Requires state file path injection
    });

    it('should disable an addon', async () => {
      // Requires state file path injection
    });

    it('should throw for non-existent addon', async () => {
      // Requires state file path injection
    });
  });

  describe('create', () => {
    let tempDir: string;
    let originalCwd: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `addon-manager-test-${randomUUID()}-`));
      originalCwd = process.cwd();
      process.chdir(tempDir);
    });

    afterEach(async () => {
      process.chdir(originalCwd);
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should create addon scaffold in current directory', async () => {
      const manager = createAddonManager();
      const addonPath = await manager.create('my-test-addon');

      // Normalize paths to handle macOS /var -> /private/var symlink
      const expectedPath = await fs.realpath(path.join(tempDir, 'my-test-addon'));
      const actualPath = await fs.realpath(addonPath);
      expect(actualPath).toBe(expectedPath);

      // Check files were created
      const manifestPath = path.join(addonPath, 'addon.toml');
      const hookPath = path.join(addonPath, 'hook.ts');
      const readmePath = path.join(addonPath, 'README.md');

      expect(await fs.access(manifestPath).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(hookPath).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(readmePath).then(() => true).catch(() => false)).toBe(true);

      // Check manifest content
      const manifest = await fs.readFile(manifestPath, 'utf-8');
      expect(manifest).toContain('name = "my-test-addon"');
      expect(manifest).toContain('version = "1.0.0"');
    });

    it('should throw for invalid addon name - uppercase', async () => {
      const manager = createAddonManager();

      await expect(manager.create('InvalidName')).rejects.toThrow(AddonManagerError);
    });

    it('should throw for invalid addon name - starts with number', async () => {
      const manager = createAddonManager();

      await expect(manager.create('123invalid')).rejects.toThrow(AddonManagerError);
    });

    it('should throw for invalid addon name - has spaces', async () => {
      const manager = createAddonManager();

      await expect(manager.create('has spaces')).rejects.toThrow(AddonManagerError);
    });

    it('should throw if directory already exists', async () => {
      const manager = createAddonManager();

      // Create directory first
      await fs.mkdir(path.join(tempDir, 'existing-addon'));

      await expect(manager.create('existing-addon')).rejects.toThrow(AddonManagerError);
    });

    it('should create valid hook.ts file', async () => {
      const manager = createAddonManager();
      const addonPath = await manager.create('hook-test-addon');

      const hookPath = path.join(addonPath, 'hook.ts');
      const hookContent = await fs.readFile(hookPath, 'utf-8');

      expect(hookContent).toContain('#!/usr/bin/env bun');
      expect(hookContent).toContain('interface HookInput');
      expect(hookContent).toContain('async function main()');
      expect(hookContent).toContain('process.exit(0)');
    });

    it('should create valid README.md file', async () => {
      const manager = createAddonManager();
      const addonPath = await manager.create('readme-test-addon');

      const readmePath = path.join(addonPath, 'README.md');
      const readmeContent = await fs.readFile(readmePath, 'utf-8');

      expect(readmeContent).toContain('# readme-test-addon');
      expect(readmeContent).toContain('## Installation');
      expect(readmeContent).toContain('## Configuration');
      expect(readmeContent).toContain('## Development');
    });

    it('should create addon with correct structure in manifest', async () => {
      const manager = createAddonManager();
      const addonPath = await manager.create('structure-test-addon');

      const manifestPath = path.join(addonPath, 'addon.toml');
      const manifest = await fs.readFile(manifestPath, 'utf-8');

      expect(manifest).toContain('[addon]');
      expect(manifest).toContain('[hooks]');
      expect(manifest).toContain('PreToolUse');
      expect(manifest).toContain('[install]');
      expect(manifest).toContain('runtime = "bun"');
      expect(manifest).toContain('license = "MIT"');
    });
  });
});
