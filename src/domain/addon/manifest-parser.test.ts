/**
 * Manifest Parser Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseAddonManifest,
  validateAddonManifest,
  validateManifestSafe,
  checkCompatibility,
  ManifestParseError,
  ManifestValidationError,
} from './manifest-parser.js';
import type { AddonManifest } from '@/types/index.js';

describe('manifest-parser', () => {
  describe('parseAddonManifest', () => {
    it('should parse a minimal valid manifest', () => {
      const toml = `
[addon]
name = "test-addon"
version = "1.0.0"
`;

      const manifest = parseAddonManifest(toml);

      expect(manifest.name).toBe('test-addon');
      expect(manifest.version).toBe('1.0.0');
    });

    it('should parse a full manifest with all fields', () => {
      const toml = `
[addon]
name = "my-addon"
version = "2.1.0"
description = "A test addon"
author = "Test Author"
license = "MIT"
keywords = ["test", "example"]

[hooks]
PreToolUse = [
  { matcher = "Bash", handler = "./hook.ts", priority = 10 }
]

[install]
runtime = "bun"
postinstall = "./setup.ts"
`;

      const manifest = parseAddonManifest(toml);

      expect(manifest.name).toBe('my-addon');
      expect(manifest.version).toBe('2.1.0');
      expect(manifest.description).toBe('A test addon');
      expect(manifest.author).toBe('Test Author');
      expect(manifest.license).toBe('MIT');
      expect(manifest.keywords).toEqual(['test', 'example']);
      expect(manifest.hooks?.PreToolUse).toHaveLength(1);
      expect(manifest.hooks?.PreToolUse?.[0]?.matcher).toBe('Bash');
      expect(manifest.hooks?.PreToolUse?.[0]?.handler).toBe('./hook.ts');
      expect(manifest.hooks?.PreToolUse?.[0]?.priority).toBe(10);
      expect(manifest.install?.runtime).toBe('bun');
      expect(manifest.install?.postinstall).toBe('./setup.ts');
    });

    it('should parse manifest with multiple hooks', () => {
      const toml = `
[addon]
name = "multi-hook"
version = "1.0.0"

[hooks]
PreToolUse = [
  { matcher = "Bash", handler = "./pre-bash.ts", priority = 10 },
  { matcher = "Read", handler = "./pre-read.ts", priority = 5 }
]
PostToolUse = [
  { matcher = "*", handler = "./post.ts" }
]
`;

      const manifest = parseAddonManifest(toml);

      expect(manifest.hooks?.PreToolUse).toHaveLength(2);
      expect(manifest.hooks?.PostToolUse).toHaveLength(1);
    });

    it('should throw ManifestParseError for invalid TOML', () => {
      const invalidToml = `
[addon
name = "broken
`;

      expect(() => parseAddonManifest(invalidToml)).toThrow(ManifestParseError);
    });

    it('should throw ManifestValidationError for missing required fields', () => {
      const toml = `
[addon]
name = "missing-version"
`;

      expect(() => parseAddonManifest(toml)).toThrow(ManifestValidationError);
    });

    it('should throw ManifestValidationError for invalid addon name', () => {
      const toml = `
[addon]
name = "Invalid_Name"
version = "1.0.0"
`;

      expect(() => parseAddonManifest(toml)).toThrow(ManifestValidationError);
    });

    it('should throw ManifestValidationError for invalid version format', () => {
      const toml = `
[addon]
name = "test-addon"
version = "not-a-version"
`;

      expect(() => parseAddonManifest(toml)).toThrow(ManifestValidationError);
    });
  });

  describe('validateAddonManifest', () => {
    it('should validate a correct manifest object', () => {
      const manifest = {
        name: 'valid-addon',
        version: '1.0.0',
      };

      const result = validateAddonManifest(manifest);

      expect(result.name).toBe('valid-addon');
      expect(result.version).toBe('1.0.0');
    });

    it('should throw for invalid manifest object', () => {
      const invalid = {
        name: 'valid-addon',
        // missing version
      };

      expect(() => validateAddonManifest(invalid)).toThrow(ManifestValidationError);
    });

    it('should validate hooks structure', () => {
      const manifest = {
        name: 'hook-addon',
        version: '1.0.0',
        hooks: {
          PreToolUse: [
            { matcher: 'Bash', handler: './hook.ts' },
          ],
        },
      };

      const result = validateAddonManifest(manifest);

      expect(result.hooks?.PreToolUse?.[0]?.priority).toBe(0); // default value
      expect(result.hooks?.PreToolUse?.[0]?.enabled).toBe(true); // default value
    });

    it('should validate install section', () => {
      const manifest = {
        name: 'install-addon',
        version: '1.0.0',
        install: {
          runtime: 'deno',
        },
      };

      const result = validateAddonManifest(manifest);

      expect(result.install?.runtime).toBe('deno');
    });

    it('should reject invalid runtime', () => {
      const manifest = {
        name: 'bad-runtime',
        version: '1.0.0',
        install: {
          runtime: 'python', // not valid
        },
      };

      expect(() => validateAddonManifest(manifest)).toThrow(ManifestValidationError);
    });
  });

  describe('validateManifestSafe', () => {
    it('should return valid result for correct manifest', () => {
      const manifest = {
        name: 'valid-addon',
        version: '1.0.0',
        description: 'A description',
        license: 'MIT',
      };

      const result = validateManifestSafe(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid manifest', () => {
      const manifest = {
        name: 'Invalid Name',
        version: '1.0.0',
      };

      const result = validateManifestSafe(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('checkCompatibility', () => {
    it('should return compatible for no requirements', () => {
      const manifest: AddonManifest = {
        name: 'no-reqs',
        version: '1.0.0',
      };

      const result = checkCompatibility(manifest, '1.0.0');

      expect(result.compatible).toBe(true);
    });

    it('should check caret version constraint', () => {
      const manifest: AddonManifest = {
        name: 'caret-req',
        version: '1.0.0',
        requires: {
          'claude-kit': '^1.0.0',
        },
      };

      expect(checkCompatibility(manifest, '1.0.0').compatible).toBe(true);
      expect(checkCompatibility(manifest, '1.5.0').compatible).toBe(true);
      expect(checkCompatibility(manifest, '0.9.0').compatible).toBe(false);
    });

    it('should check tilde version constraint', () => {
      const manifest: AddonManifest = {
        name: 'tilde-req',
        version: '1.0.0',
        requires: {
          'claude-kit': '~1.2.0',
        },
      };

      expect(checkCompatibility(manifest, '1.2.0').compatible).toBe(true);
      expect(checkCompatibility(manifest, '1.2.5').compatible).toBe(true);
      expect(checkCompatibility(manifest, '1.1.0').compatible).toBe(false);
    });

    it('should check >= version constraint', () => {
      const manifest: AddonManifest = {
        name: 'gte-req',
        version: '1.0.0',
        requires: {
          'claude-kit': '>=2.0.0',
        },
      };

      expect(checkCompatibility(manifest, '2.0.0').compatible).toBe(true);
      expect(checkCompatibility(manifest, '3.0.0').compatible).toBe(true);
      expect(checkCompatibility(manifest, '1.9.9').compatible).toBe(false);
    });
  });
});
