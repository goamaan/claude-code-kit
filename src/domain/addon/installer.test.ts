/**
 * Addon Installer Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  createAddonInstaller,
  getAddonsDir,
  AddonInstallError,
} from './installer.js';

describe('installer', () => {
  let testDir: string;
  let addonDir: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `claude-kit-test-${randomUUID()}`);
    addonDir = join(testDir, 'test-addon');
    await mkdir(addonDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('createAddonInstaller', () => {
    it('should create an installer instance', () => {
      const installer = createAddonInstaller();

      expect(installer).toBeDefined();
      expect(installer.installFromPath).toBeDefined();
      expect(installer.installFromGitHub).toBeDefined();
      expect(installer.installFromRegistry).toBeDefined();
      expect(installer.uninstall).toBeDefined();
      expect(installer.runPostInstall).toBeDefined();
    });
  });

  describe('installFromPath', () => {
    it('should install a valid addon from local path', async () => {
      // Create a valid addon manifest
      const manifest = `
[addon]
name = "test-addon"
version = "1.0.0"
description = "Test addon"

[install]
runtime = "bun"
`;
      await writeFile(join(addonDir, 'addon.toml'), manifest);
      await writeFile(join(addonDir, 'hook.ts'), '// hook code');

      const installer = createAddonInstaller();
      const installed = await installer.installFromPath(addonDir);

      expect(installed.manifest.name).toBe('test-addon');
      expect(installed.manifest.version).toBe('1.0.0');
      expect(installed.enabled).toBe(true);
      expect(installed.source.type).toBe('local');
    });

    it('should throw for missing addon.toml', async () => {
      // Create directory without manifest
      const emptyDir = join(testDir, 'empty-addon');
      await mkdir(emptyDir, { recursive: true });

      const installer = createAddonInstaller();

      await expect(installer.installFromPath(emptyDir)).rejects.toThrow(
        AddonInstallError
      );
    });

    it('should throw for invalid manifest', async () => {
      // Create invalid manifest
      const manifest = `
[addon]
name = "Invalid Name"
version = "not-semver"
`;
      await writeFile(join(addonDir, 'addon.toml'), manifest);

      const installer = createAddonInstaller();

      await expect(installer.installFromPath(addonDir)).rejects.toThrow(
        AddonInstallError
      );
    });
  });

  describe('installFromGitHub', () => {
    it('should throw for invalid repo format', async () => {
      const installer = createAddonInstaller();

      await expect(installer.installFromGitHub('invalid')).rejects.toThrow(
        AddonInstallError
      );
      await expect(installer.installFromGitHub('invalid/')).rejects.toThrow(
        AddonInstallError
      );
    });

    // Note: Actual GitHub cloning tests would require network access
    // and should be in integration tests
  });

  describe('installFromRegistry', () => {
    it('should throw for non-existent addon', async () => {
      const installer = createAddonInstaller();

      await expect(
        installer.installFromRegistry('non-existent-addon')
      ).rejects.toThrow(AddonInstallError);
    });
  });

  describe('uninstall', () => {
    it('should throw for non-installed addon', async () => {
      const installer = createAddonInstaller();

      await expect(installer.uninstall('not-installed')).rejects.toThrow(
        AddonInstallError
      );
    });
  });

  describe('runPostInstall', () => {
    it('should skip if no postinstall script', async () => {
      const installer = createAddonInstaller();

      // Should not throw
      await installer.runPostInstall({
        manifest: {
          name: 'test',
          version: '1.0.0',
        },
        path: testDir,
        installedAt: new Date(),
        updatedAt: new Date(),
        enabled: true,
        config: {},
        source: { type: 'local' },
      });
    });

    it('should throw for missing postinstall script', async () => {
      const installer = createAddonInstaller();

      await expect(
        installer.runPostInstall({
          manifest: {
            name: 'test',
            version: '1.0.0',
            install: {
              runtime: 'bun',
              postinstall: 'missing-script.ts',
            },
          },
          path: testDir,
          installedAt: new Date(),
          updatedAt: new Date(),
          enabled: true,
          config: {},
          source: { type: 'local' },
        })
      ).rejects.toThrow(AddonInstallError);
    });
  });

  describe('getAddonsDir', () => {
    it('should return the addons directory path', () => {
      const dir = getAddonsDir();

      expect(dir).toContain('.claude-kit');
      expect(dir).toContain('addons');
    });
  });
});
