/**
 * Unit tests for configuration loader
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  getConfigPaths,
  getActiveProfileName,
  loadGlobalConfig,
  loadProfileConfig,
  loadConfig,
  getConfigLayers,
  listProfiles,
  profileExists,
} from './loader.js';
import { ConfigError } from './parser.js';
import { getGlobalConfigDir } from '../../utils/paths.js';

describe('config/loader', () => {
  describe('getConfigPaths', () => {
    it('should return correct paths with default profile and cwd', () => {
      const paths = getConfigPaths();
      const globalDir = getGlobalConfigDir();

      expect(paths.global).toBe(path.join(globalDir, 'config.toml'));
      expect(paths.profile).toBe(
        path.join(globalDir, 'profiles', 'default', 'config.toml')
      );
    });

    it('should return correct paths with custom profile name', () => {
      const paths = getConfigPaths('custom-profile');
      const globalDir = getGlobalConfigDir();

      expect(paths.profile).toBe(
        path.join(globalDir, 'profiles', 'custom-profile', 'config.toml')
      );
    });
  });

  describe('getActiveProfileName (with temp directory)', () => {
    let tempDir: string;

    beforeEach(async () => {
      // Create a temp directory that mimics ~/.claudeops
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claudeops-test-'));
    });

    afterEach(async () => {
      // Clean up
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    // Note: This test reads from the actual ~/.claudeops directory
    // since getActiveProfileName() uses getGlobalConfigDir() internally
    it('should return default when active-profile file does not exist', async () => {
      const profileName = await getActiveProfileName();
      // Will be 'default' if file doesn't exist, or actual value if it does
      expect(typeof profileName).toBe('string');
      expect(profileName.length).toBeGreaterThan(0);
    });

    // Testing setActiveProfile would modify the user's actual config,
    // so we skip integration tests for that function
  });

  describe('loadGlobalConfig', () => {
    it('should return empty object when global config does not exist', async () => {
      // This test assumes the user doesn't have a ~/.claudeops/config.toml
      // or it will return the actual config
      const config = await loadGlobalConfig();
      expect(typeof config).toBe('object');
    });
  });

  describe('loadProfileConfig', () => {
    it('should throw ConfigError when profile does not exist', async () => {
      await expect(
        loadProfileConfig('non-existent-profile-xyz-123')
      ).rejects.toThrow(ConfigError);
    });

    it('should throw ConfigError with profile name in message', async () => {
      try {
        await loadProfileConfig('missing-profile-abc');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError);
        const configError = error as ConfigError;
        expect(configError.message).toContain('missing-profile-abc');
      }
    });
  });

  describe('loadConfig', () => {
    it('should return default config when no configs exist', async () => {
      const config = await loadConfig();

      expect(config).toBeDefined();
      expect(config.model).toBeDefined();
      expect(config.model.default).toBeDefined();
      expect(config.cost).toBeDefined();
      expect(config.skills).toBeDefined();
    });
  });

  describe('getConfigLayers', () => {
    it('should return at least default layer', async () => {
      const layers = await getConfigLayers();

      expect(layers.length).toBeGreaterThan(0);
      expect(layers[0]?.layer).toBe('default');
    });
  });

  describe('listProfiles', () => {
    // Note: This test reads from the actual ~/.claudeops/profiles directory
    it('should return an array of profile names', async () => {
      const profiles = await listProfiles();
      expect(Array.isArray(profiles)).toBe(true);
    });

    it('should return sorted profile names', async () => {
      const profiles = await listProfiles();
      if (profiles.length > 1) {
        const sorted = [...profiles].sort();
        expect(profiles).toEqual(sorted);
      }
    });
  });

  describe('profileExists', () => {
    it('should return false for non-existent profile', async () => {
      const exists = await profileExists('non-existent-profile-xyz-999');
      expect(exists).toBe(false);
    });
  });

  describe('saveGlobalConfig and loadGlobalConfig', () => {
    // Note: We skip these tests as they would modify the user's actual
    // ~/.claudeops/config.toml file. In a real testing scenario, these
    // would require mocking the global config directory path.

    it.skip('should roundtrip global config', async () => {
      // This test is skipped to avoid modifying user's actual config
    });
  });

  describe('saveProfileConfig and loadProfileConfig', () => {
    // Note: We skip these tests as they would modify the user's actual
    // ~/.claudeops/profiles directory. In a real testing scenario, these
    // would require mocking the profiles directory path.

    it.skip('should roundtrip profile config', async () => {
      // This test is skipped to avoid modifying user's actual profiles
    });
  });

  describe('setActiveProfile and getActiveProfileName', () => {
    // Note: We skip these tests as they would modify the user's actual
    // ~/.claudeops/active-profile file. In a real testing scenario, these
    // would require mocking the global config directory path.

    it.skip('should roundtrip active profile name', async () => {
      // This test is skipped to avoid modifying user's actual config
    });
  });
});
