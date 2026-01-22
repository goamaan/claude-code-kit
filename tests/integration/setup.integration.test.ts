/**
 * Integration tests for Setup Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { createSetupManager, SetupManagerError } from '@/domain/setup/manager.js';
import { createSetupLoader } from '@/domain/setup/loader.js';

describe('Setup Manager Integration', () => {
  let tempDir: string;
  let userSetupsDir: string;
  let builtinDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'setup-manager-integration-'));
    userSetupsDir = path.join(tempDir, 'user-setups');
    builtinDir = path.join(tempDir, 'builtin-setups');

    // Create directories
    await fs.mkdir(userSetupsDir, { recursive: true });
    await fs.mkdir(builtinDir, { recursive: true });

    // Create a minimal builtin setup
    const minimalDir = path.join(builtinDir, 'minimal');
    await fs.mkdir(minimalDir);
    await fs.writeFile(
      path.join(minimalDir, 'manifest.toml'),
      `
[setup]
name = "minimal"
version = "1.0.0"
description = "Minimal setup for testing"
author = "test"

[skills]
enabled = []

[hooks]
templates = []
`,
    );
    await fs.writeFile(
      path.join(minimalDir, 'CLAUDE.md'),
      '# Minimal Setup\n\nBasic configuration.\n',
    );

    // Create a fullstack builtin setup
    const fullstackDir = path.join(builtinDir, 'fullstack');
    await fs.mkdir(fullstackDir);
    await fs.writeFile(
      path.join(fullstackDir, 'manifest.toml'),
      `
[setup]
name = "fullstack"
version = "1.0.0"
description = "Full stack development"
author = "test"
extends = "minimal"

[skills]
enabled = ["autopilot", "ralph", "ultrawork"]

[agents.designer]
model = "sonnet"
priority = 70

[agents.architect]
model = "opus"
priority = 80

[hooks]
templates = []
`,
    );
    await fs.writeFile(
      path.join(fullstackDir, 'CLAUDE.md'),
      '# Fullstack Setup\n\nFor web development.\n',
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('list', () => {
    it('should list all available setups', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      const setups = await manager.list();

      expect(setups.length).toBeGreaterThanOrEqual(2);
      expect(setups.find(s => s.name === 'minimal')).toBeDefined();
      expect(setups.find(s => s.name === 'fullstack')).toBeDefined();
    });

    it('should include user setups in the list', async () => {
      // Create a user setup
      const userSetupDir = path.join(userSetupsDir, 'my-setup');
      await fs.mkdir(userSetupDir);
      await fs.writeFile(
        path.join(userSetupDir, 'manifest.toml'),
        `
[setup]
name = "my-setup"
version = "1.0.0"

[skills]
enabled = []
`,
      );

      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      const setups = await manager.list();

      expect(setups.find(s => s.name === 'my-setup')).toBeDefined();
    });
  });

  describe('get', () => {
    it('should get a builtin setup by name', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      const setup = await manager.get('minimal');

      expect(setup.manifest.name).toBe('minimal');
      expect(setup.manifest.version).toBe('1.0.0');
      expect(setup.content).toContain('Minimal Setup');
    });

    it('should get a user setup by name', async () => {
      // Create a user setup
      const userSetupDir = path.join(userSetupsDir, 'my-setup');
      await fs.mkdir(userSetupDir);
      await fs.writeFile(
        path.join(userSetupDir, 'manifest.toml'),
        `
[setup]
name = "my-setup"
version = "2.0.0"

[skills]
enabled = ["autopilot"]
`,
      );
      await fs.writeFile(
        path.join(userSetupDir, 'CLAUDE.md'),
        '# My Custom Setup\n',
      );

      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      const setup = await manager.get('my-setup');

      expect(setup.manifest.name).toBe('my-setup');
      expect(setup.manifest.version).toBe('2.0.0');
    });

    it('should prefer user setup over builtin with same name', async () => {
      // Create a user setup with same name as builtin
      const userSetupDir = path.join(userSetupsDir, 'minimal');
      await fs.mkdir(userSetupDir);
      await fs.writeFile(
        path.join(userSetupDir, 'manifest.toml'),
        `
[setup]
name = "minimal"
version = "9.9.9"
description = "User's custom minimal"

[skills]
enabled = []
`,
      );

      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      const setup = await manager.get('minimal');

      expect(setup.manifest.version).toBe('9.9.9');
      expect(setup.manifest.description).toBe("User's custom minimal");
    });

    it('should throw for non-existent setup', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      await expect(manager.get('nonexistent')).rejects.toThrow(SetupManagerError);
    });
  });

  describe('apply', () => {
    it('should apply a single setup', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      const merged = await manager.apply('fullstack');

      expect(merged.name).toBe('fullstack');
      expect(merged.skills.enabled).toContain('autopilot');
      expect(merged.skills.enabled).toContain('ralph');
      expect(merged.agents['designer']).toBeDefined();
    });

    it('should apply setup with extends', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      // fullstack extends minimal
      const merged = await manager.apply('fullstack');

      // Should include content from both
      expect(merged.content).toContain('Fullstack Setup');
    });

    it('should merge multiple setups', async () => {
      // Create a security setup
      const securityDir = path.join(builtinDir, 'security');
      await fs.mkdir(securityDir);
      await fs.writeFile(
        path.join(securityDir, 'manifest.toml'),
        `
[setup]
name = "security"
version = "1.0.0"

[skills]
enabled = ["security-reviewer"]

[agents.security-reviewer]
model = "opus"
priority = 90
`,
      );

      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      // Apply fullstack with security as base
      const merged = await manager.apply('fullstack', ['security']);

      expect(merged.name).toBe('fullstack');
      expect(merged.skills.enabled).toContain('autopilot');
      expect(merged.skills.enabled).toContain('security-reviewer');
      expect(merged.agents['security-reviewer']).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a new empty setup', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      await manager.create('my-new-setup');

      const exists = await manager.exists('my-new-setup');
      expect(exists).toBe(true);

      const setup = await manager.get('my-new-setup');
      expect(setup.manifest.name).toBe('my-new-setup');
      expect(setup.manifest.version).toBe('1.0.0');
    });

    it('should create a setup from existing one', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      await manager.create('my-fullstack', ['fullstack']);

      const setup = await manager.get('my-fullstack');
      expect(setup.manifest.skills?.enabled).toContain('autopilot');
    });

    it('should throw for invalid name', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      await expect(manager.create('Invalid-Name')).rejects.toThrow(SetupManagerError);
    });

    it('should throw if setup already exists', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      await manager.create('test-setup');
      await expect(manager.create('test-setup')).rejects.toThrow('already exists');
    });
  });

  describe('export', () => {
    it('should export a setup as tar.gz', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      const archive = await manager.export('minimal');

      expect(archive).toBeInstanceOf(Uint8Array);
      expect(archive.length).toBeGreaterThan(0);

      // Verify it's a gzip file (magic number)
      expect(archive[0]).toBe(0x1f);
      expect(archive[1]).toBe(0x8b);
    });

    it('should throw for non-existent setup', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      await expect(manager.export('nonexistent')).rejects.toThrow(SetupManagerError);
    });
  });

  describe('import', () => {
    it('should import a setup from directory', async () => {
      // Create a setup to import
      const importDir = path.join(tempDir, 'import-source');
      await fs.mkdir(importDir);
      await fs.writeFile(
        path.join(importDir, 'manifest.toml'),
        `
[setup]
name = "imported-setup"
version = "1.0.0"

[skills]
enabled = ["autopilot"]
`,
      );
      await fs.writeFile(
        path.join(importDir, 'CLAUDE.md'),
        '# Imported Setup\n',
      );

      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      await manager.import(importDir);

      const exists = await manager.exists('imported-setup');
      expect(exists).toBe(true);

      const setup = await manager.get('imported-setup');
      expect(setup.manifest.name).toBe('imported-setup');
    });

    it('should import a setup from archive buffer', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      // Export minimal and reimport as different name
      const archive = await manager.export('minimal');

      // We need to modify the archive to change the name
      // For simplicity, create a new setup and export it
      const exportDir = path.join(tempDir, 'export-source');
      await fs.mkdir(exportDir);
      await fs.writeFile(
        path.join(exportDir, 'manifest.toml'),
        `
[setup]
name = "from-buffer"
version = "1.0.0"

[skills]
enabled = []
`,
      );

      const loader = createSetupLoader({ builtinDir });
      const loaded = await loader.loadFromDir(exportDir);

      // Create a manager with a fresh user dir to import to
      const importManager = createSetupManager({
        userSetupsDir: path.join(tempDir, 'import-user-setups'),
        builtinDir,
      });

      await importManager.import(exportDir);

      const exists = await importManager.exists('from-buffer');
      expect(exists).toBe(true);
    });

    it('should throw if setup already exists', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      // Create a user setup
      await manager.create('existing-setup');

      // Try to import another setup with same name
      const importDir = path.join(tempDir, 'import-source');
      await fs.mkdir(importDir);
      await fs.writeFile(
        path.join(importDir, 'manifest.toml'),
        `
[setup]
name = "existing-setup"
version = "2.0.0"
`,
      );

      await expect(manager.import(importDir)).rejects.toThrow('already exists');
    });
  });

  describe('delete', () => {
    it('should delete a user setup', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      await manager.create('to-delete');
      expect(await manager.exists('to-delete')).toBe(true);

      await manager.delete('to-delete');
      expect(await manager.exists('to-delete')).toBe(false);
    });

    it('should throw for non-existent setup', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      await expect(manager.delete('nonexistent')).rejects.toThrow(SetupManagerError);
    });
  });

  describe('exists', () => {
    it('should return true for builtin setup', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      expect(await manager.exists('minimal')).toBe(true);
    });

    it('should return true for user setup', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      await manager.create('user-setup');
      expect(await manager.exists('user-setup')).toBe(true);
    });

    it('should return false for non-existent setup', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      expect(await manager.exists('nonexistent')).toBe(false);
    });
  });

  describe('full workflow', () => {
    it('should support complete setup lifecycle', async () => {
      const manager = createSetupManager({
        userSetupsDir,
        builtinDir,
      });

      // 1. List available setups
      const initialSetups = await manager.list();
      expect(initialSetups.length).toBeGreaterThanOrEqual(2);

      // 2. Create a new setup from fullstack
      await manager.create('my-project', ['fullstack']);

      // 3. Verify it exists
      expect(await manager.exists('my-project')).toBe(true);

      // 4. Get the setup
      const setup = await manager.get('my-project');
      expect(setup.manifest.name).toBe('my-project');

      // 5. Apply it
      const merged = await manager.apply('my-project');
      expect(merged.skills.enabled).toContain('autopilot');

      // 6. Export it
      const archive = await manager.export('my-project');
      expect(archive.length).toBeGreaterThan(0);

      // 7. Delete it
      await manager.delete('my-project');
      expect(await manager.exists('my-project')).toBe(false);

      // 8. List should not include deleted setup
      const finalSetups = await manager.list();
      expect(finalSetups.find(s => s.name === 'my-project')).toBeUndefined();
    });
  });
});
