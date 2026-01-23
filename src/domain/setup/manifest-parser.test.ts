/**
 * Unit tests for manifest-parser
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  parseSetupManifest,
  loadSetupManifest,
  validateSetupManifest,
  extractMetadata,
  manifestExists,
  getManifestFilename,
  SetupParseError,
} from './manifest-parser.js';

describe('manifest-parser', () => {
  describe('parseSetupManifest', () => {
    it('should parse a minimal valid manifest', () => {
      const toml = `
[setup]
name = "test-setup"
version = "1.0.0"
`;
      const result = parseSetupManifest(toml);
      expect(result.name).toBe('test-setup');
      expect(result.version).toBe('1.0.0');
    });

    it('should parse a manifest without [setup] section', () => {
      const toml = `
name = "test-setup"
version = "1.0.0"
description = "A test setup"
`;
      const result = parseSetupManifest(toml);
      expect(result.name).toBe('test-setup');
      expect(result.version).toBe('1.0.0');
      expect(result.description).toBe('A test setup');
    });

    it('should parse a full manifest with all sections', () => {
      const toml = `
[setup]
name = "fullstack"
version = "1.2.3"
description = "Full stack development"
author = "test-author"
extends = "minimal"

[requires]
addons = ["addon-a", "addon-b"]

[skills]
enabled = ["autopilot", "planner"]
disabled = ["frontend-ui-ux"]

[agents.designer]
model = "sonnet"
priority = 70

[agents.architect]
model = "opus"
priority = 80

[mcp]
recommended = ["filesystem", "git"]
required = ["git"]
max_enabled = 5

[hooks]
templates = [
  { name = "pre-commit", matcher = "*.ts", handler = "lint", priority = 10 }
]

[commands]
build = { enabled = true, alias = "b", description = "Build the project" }
`;
      const result = parseSetupManifest(toml);

      expect(result.name).toBe('fullstack');
      expect(result.version).toBe('1.2.3');
      expect(result.description).toBe('Full stack development');
      expect(result.author).toBe('test-author');
      expect(result.extends).toBe('minimal');

      expect(result.requires?.addons).toEqual(['addon-a', 'addon-b']);

      expect(result.skills?.enabled).toEqual(['autopilot', 'planner']);
      expect(result.skills?.disabled).toEqual(['frontend-ui-ux']);

      expect(result.agents?.['designer']?.model).toBe('sonnet');
      expect(result.agents?.['designer']?.priority).toBe(70);
      expect(result.agents?.['architect']?.model).toBe('opus');

      expect(result.mcp?.recommended).toEqual(['filesystem', 'git']);
      expect(result.mcp?.required).toEqual(['git']);
      expect(result.mcp?.max_enabled).toBe(5);

      expect(result.hooks?.templates).toHaveLength(1);
      expect(result.hooks?.templates?.[0]?.name).toBe('pre-commit');

      expect(result.commands?.['build']?.enabled).toBe(true);
      expect(result.commands?.['build']?.alias).toBe('b');
    });

    it('should throw SetupParseError for invalid TOML', () => {
      const toml = `
[invalid
name = "test"
`;
      expect(() => parseSetupManifest(toml)).toThrow(SetupParseError);
    });

    it('should throw SetupParseError for missing required fields', () => {
      const toml = `
[setup]
description = "Missing name and version"
`;
      expect(() => parseSetupManifest(toml)).toThrow(SetupParseError);
    });

    it('should throw SetupParseError for invalid name format', () => {
      const toml = `
[setup]
name = "Invalid-Name"
version = "1.0.0"
`;
      expect(() => parseSetupManifest(toml)).toThrow(SetupParseError);
    });

    it('should throw SetupParseError for invalid version format', () => {
      const toml = `
[setup]
name = "test-setup"
version = "invalid"
`;
      expect(() => parseSetupManifest(toml)).toThrow(SetupParseError);
    });

    it('should throw SetupParseError for invalid model name', () => {
      const toml = `
[setup]
name = "test-setup"
version = "1.0.0"

[agents.test]
model = "invalid-model"
`;
      expect(() => parseSetupManifest(toml)).toThrow(SetupParseError);
    });

    it('should parse manifest with inline content', () => {
      const toml = `
[setup]
name = "test-setup"
version = "1.0.0"
content = """
# Custom Content

This is inline content.
"""
`;
      const result = parseSetupManifest(toml);
      expect(result.content).toContain('# Custom Content');
    });
  });

  describe('loadSetupManifest', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manifest-parser-test-'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should load a valid manifest file', async () => {
      const manifestPath = path.join(tempDir, 'manifest.toml');
      await fs.writeFile(manifestPath, `
[setup]
name = "test-setup"
version = "1.0.0"
`);
      const result = await loadSetupManifest(manifestPath);
      expect(result.name).toBe('test-setup');
      expect(result.version).toBe('1.0.0');
    });

    it('should throw SetupParseError for non-existent file', async () => {
      const manifestPath = path.join(tempDir, 'nonexistent.toml');
      await expect(loadSetupManifest(manifestPath)).rejects.toThrow(SetupParseError);
    });

    it('should include path in error for non-existent file', async () => {
      const manifestPath = path.join(tempDir, 'nonexistent.toml');
      try {
        await loadSetupManifest(manifestPath);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SetupParseError);
        expect((error as SetupParseError).filePath).toBe(manifestPath);
      }
    });
  });

  describe('validateSetupManifest', () => {
    it('should return valid=true for valid manifest', () => {
      const manifest = {
        name: 'test-setup',
        version: '1.0.0',
        description: 'A valid setup',
        author: 'test-author',
      };
      const result = validateSetupManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid manifest', () => {
      const manifest = {
        name: 'Invalid',
        version: 'not-semver',
      };
      const result = validateSetupManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect conflicting skills', () => {
      const manifest = {
        name: 'test-setup',
        version: '1.0.0',
        skills: {
          enabled: ['autopilot', 'ralph'],
          disabled: ['ralph', 'ultrawork'],
        },
      };
      const result = validateSetupManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'conflicting_skills')).toBe(true);
    });

    it('should detect circular extension', () => {
      const manifest = {
        name: 'test-setup',
        version: '1.0.0',
        extends: 'test-setup',
      };
      const result = validateSetupManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'circular_extension')).toBe(true);
    });

    it('should warn about missing description', () => {
      const manifest = {
        name: 'test-setup',
        version: '1.0.0',
      };
      const result = validateSetupManifest(manifest);
      expect(result.warnings.some(w => w.path === 'description')).toBe(true);
    });

    it('should warn about wildcard matcher', () => {
      const manifest = {
        name: 'test-setup',
        version: '1.0.0',
        hooks: {
          templates: [
            { name: 'catch-all', matcher: '*', handler: 'log' },
          ],
        },
      };
      const result = validateSetupManifest(manifest);
      expect(result.warnings.some(w => w.path.includes('matcher'))).toBe(true);
    });

    it('should warn about very high agent priority', () => {
      const manifest = {
        name: 'test-setup',
        version: '1.0.0',
        agents: {
          designer: {
            model: 'opus',
            priority: 95,
          },
        },
      };
      const result = validateSetupManifest(manifest);
      expect(result.warnings.some(w => w.path.includes('priority'))).toBe(true);
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata from manifest', () => {
      const manifest = {
        name: 'test-setup',
        version: '1.0.0',
        description: 'Test description',
        author: 'test-author',
        extends: 'minimal',
        skills: {
          enabled: ['autopilot'],
        },
      };
      const metadata = extractMetadata(manifest);
      expect(metadata).toEqual({
        name: 'test-setup',
        version: '1.0.0',
        description: 'Test description',
        author: 'test-author',
        extends: 'minimal',
      });
    });
  });

  describe('manifestExists', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manifest-exists-test-'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should return true for existing file', async () => {
      const manifestPath = path.join(tempDir, 'manifest.toml');
      await fs.writeFile(manifestPath, 'name = "test"\nversion = "1.0.0"');
      expect(await manifestExists(manifestPath)).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const manifestPath = path.join(tempDir, 'nonexistent.toml');
      expect(await manifestExists(manifestPath)).toBe(false);
    });
  });

  describe('getManifestFilename', () => {
    it('should return manifest.toml', () => {
      expect(getManifestFilename()).toBe('manifest.toml');
    });
  });
});
