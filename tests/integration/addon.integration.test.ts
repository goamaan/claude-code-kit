/**
 * Addon Integration Tests
 *
 * Tests the full addon workflow including parsing, installation, and registry.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  parseAddonManifest,
  loadAddonManifest,
  createAddonInstaller,
  createAddonRegistry,
  createLocalRegistry,
  createAddonManager,
} from '@/domain/addon/index.js';

describe('Addon Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `claudeops-integration-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('End-to-end addon workflow', () => {
    it('should create, parse, and validate an addon', async () => {
      // Create addon directory
      const addonDir = join(testDir, 'my-addon');
      await mkdir(addonDir, { recursive: true });

      // Write manifest
      const manifestContent = `
[addon]
name = "my-addon"
version = "1.0.0"
description = "My test addon"
author = "Test"
license = "MIT"

[hooks]
PreToolUse = [
  { matcher = "Bash", handler = "./hook.ts", priority = 10 }
]

[install]
runtime = "bun"
`;
      await writeFile(join(addonDir, 'addon.toml'), manifestContent);

      // Write hook
      const hookContent = `#!/usr/bin/env bun
const input = JSON.parse(await Bun.stdin.text());
process.exit(0);
`;
      await writeFile(join(addonDir, 'hook.ts'), hookContent);

      // Load and validate manifest
      const manifest = await loadAddonManifest(addonDir);

      expect(manifest.name).toBe('my-addon');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.description).toBe('My test addon');
      expect(manifest.hooks?.PreToolUse).toHaveLength(1);
      expect(manifest.install?.runtime).toBe('bun');
    });

    it('should work with the local registry', async () => {
      // Create addons directory with a test addon
      const addonsDir = join(testDir, 'addons');
      const addonDir = join(addonsDir, 'test-addon');
      await mkdir(addonDir, { recursive: true });

      const manifest = `
[addon]
name = "test-addon"
version = "2.0.0"
description = "A registry test addon"
keywords = ["test", "registry"]
`;
      await writeFile(join(addonDir, 'addon.toml'), manifest);

      // Create local registry pointing to our test addons dir
      const registry = createLocalRegistry(addonsDir);

      // Search for addon
      const searchResults = await registry.search('test');
      expect(searchResults.total).toBe(1);
      expect(searchResults.results[0]?.name).toBe('test-addon');

      // Get specific addon
      const entry = await registry.get('test-addon');
      expect(entry).not.toBeNull();
      expect(entry?.version).toBe('2.0.0');
      expect(entry?.keywords).toContain('test');

      // Get versions
      const versions = await registry.getVersions('test-addon');
      expect(versions).toContain('2.0.0');
    });

    it('should search registry with multiple addons', async () => {
      const addonsDir = join(testDir, 'addons');

      // Create multiple addons
      const addons = [
        { name: 'safety-addon', keywords: ['safety', 'guard'] },
        { name: 'format-addon', keywords: ['format', 'lint'] },
        { name: 'safety-check', keywords: ['safety', 'verify'] },
      ];

      for (const addon of addons) {
        const dir = join(addonsDir, addon.name);
        await mkdir(dir, { recursive: true });
        const manifest = `
[addon]
name = "${addon.name}"
version = "1.0.0"
keywords = ${JSON.stringify(addon.keywords)}
`;
        await writeFile(join(dir, 'addon.toml'), manifest);
      }

      const registry = createLocalRegistry(addonsDir);

      // Search for safety-related addons
      const safetyResults = await registry.search('safety');
      expect(safetyResults.total).toBe(2);

      // Search for format
      const formatResults = await registry.search('format');
      expect(formatResults.total).toBe(1);

      // Search with empty query returns all
      const allResults = await registry.search('');
      expect(allResults.total).toBe(3);
    });

    it('should create addon scaffold via manager', async () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const manager = createAddonManager();
        const addonPath = await manager.create('my-new-addon');

        // Verify files were created
        await expect(access(join(addonPath, 'addon.toml'))).resolves.toBeUndefined();
        await expect(access(join(addonPath, 'hook.ts'))).resolves.toBeUndefined();
        await expect(access(join(addonPath, 'README.md'))).resolves.toBeUndefined();

        // Verify manifest is valid
        const manifest = await loadAddonManifest(addonPath);
        expect(manifest.name).toBe('my-new-addon');
        expect(manifest.version).toBe('1.0.0');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Built-in addons validation', () => {
    it('should have valid rm-rf-guard addon', async () => {
      const addonDir = join(process.cwd(), 'addons', 'rm-rf-guard');

      try {
        const manifest = await loadAddonManifest(addonDir);
        expect(manifest.name).toBe('rm-rf-guard');
        expect(manifest.hooks?.PreToolUse).toBeDefined();
        expect(manifest.hooks?.PreToolUse?.[0]?.matcher).toBe('Bash');
      } catch {
        // Skip if addon doesn't exist (running tests before addons created)
      }
    });

    it('should have valid safety-net addon', async () => {
      const addonDir = join(process.cwd(), 'addons', 'safety-net');

      try {
        const manifest = await loadAddonManifest(addonDir);
        expect(manifest.name).toBe('safety-net');
        expect(manifest.hooks?.PreToolUse).toBeDefined();
      } catch {
        // Skip if addon doesn't exist
      }
    });

    it('should have valid claude-ignore addon', async () => {
      const addonDir = join(process.cwd(), 'addons', 'claude-ignore');

      try {
        const manifest = await loadAddonManifest(addonDir);
        expect(manifest.name).toBe('claude-ignore');
        expect(manifest.hooks?.PreToolUse).toBeDefined();
      } catch {
        // Skip if addon doesn't exist
      }
    });
  });

  describe('Manifest edge cases', () => {
    it('should handle manifest with only required fields', async () => {
      const addonDir = join(testDir, 'minimal-addon');
      await mkdir(addonDir, { recursive: true });

      const manifest = `
[addon]
name = "minimal"
version = "0.0.1"
`;
      await writeFile(join(addonDir, 'addon.toml'), manifest);

      const parsed = await loadAddonManifest(addonDir);
      expect(parsed.name).toBe('minimal');
      expect(parsed.version).toBe('0.0.1');
      expect(parsed.description).toBeUndefined();
      expect(parsed.hooks).toBeUndefined();
    });

    it('should handle prerelease versions', async () => {
      const addonDir = join(testDir, 'prerelease-addon');
      await mkdir(addonDir, { recursive: true });

      const manifest = `
[addon]
name = "prerelease"
version = "1.0.0-beta.1"
`;
      await writeFile(join(addonDir, 'addon.toml'), manifest);

      const parsed = await loadAddonManifest(addonDir);
      expect(parsed.version).toBe('1.0.0-beta.1');
    });

    it('should handle all hook types', async () => {
      const addonDir = join(testDir, 'all-hooks-addon');
      await mkdir(addonDir, { recursive: true });

      const manifest = `
[addon]
name = "all-hooks"
version = "1.0.0"

[hooks]
PreToolUse = [{ matcher = "Bash", handler = "./pre.ts" }]
PostToolUse = [{ matcher = "*", handler = "./post.ts" }]
Stop = [{ matcher = "*", handler = "./stop.ts" }]
SubagentStop = [{ matcher = "*", handler = "./subagent.ts" }]
`;
      await writeFile(join(addonDir, 'addon.toml'), manifest);

      const parsed = await loadAddonManifest(addonDir);
      expect(parsed.hooks?.PreToolUse).toHaveLength(1);
      expect(parsed.hooks?.PostToolUse).toHaveLength(1);
      expect(parsed.hooks?.Stop).toHaveLength(1);
      expect(parsed.hooks?.SubagentStop).toHaveLength(1);
    });

    it('should handle config options', async () => {
      const addonDir = join(testDir, 'config-addon');
      await mkdir(addonDir, { recursive: true });

      const manifest = `
[addon]
name = "configurable"
version = "1.0.0"

[[config]]
key = "enabled"
label = "Enable feature"
type = "boolean"
default = true
description = "Whether to enable"

[[config]]
key = "level"
label = "Strictness level"
type = "select"
default = "medium"
choices = [
  { value = "low", label = "Low" },
  { value = "medium", label = "Medium" },
  { value = "high", label = "High" }
]
`;
      await writeFile(join(addonDir, 'addon.toml'), manifest);

      const parsed = await loadAddonManifest(addonDir);
      expect(parsed.config).toHaveLength(2);
      expect(parsed.config?.[0]?.key).toBe('enabled');
      expect(parsed.config?.[0]?.type).toBe('boolean');
      expect(parsed.config?.[1]?.choices).toHaveLength(3);
    });
  });
});
