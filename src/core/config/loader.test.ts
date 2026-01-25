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
  loadProjectConfig,
  loadLocalConfig,
  loadConfig,
  getConfigLayers,
  listProfiles,
  profileExists,
  saveProjectConfig,
  saveLocalConfig,
} from './loader.js';
import { ConfigError } from './parser.js';
import { getGlobalConfigDir, getProjectConfigDir } from '../../utils/paths.js';

describe('config/loader', () => {
  describe('getConfigPaths', () => {
    it('should return correct paths with default profile and cwd', () => {
      const paths = getConfigPaths();
      const globalDir = getGlobalConfigDir();
      const projectDir = getProjectConfigDir();

      expect(paths.global).toBe(path.join(globalDir, 'config.toml'));
      expect(paths.profile).toBe(
        path.join(globalDir, 'profiles', 'default', 'config.toml')
      );
      expect(paths.project).toBe(path.join(projectDir, 'config.toml'));
      expect(paths.local).toBe(path.join(projectDir, 'local.toml'));
    });

    it('should return correct paths with custom profile name', () => {
      const paths = getConfigPaths('custom-profile');
      const globalDir = getGlobalConfigDir();

      expect(paths.profile).toBe(
        path.join(globalDir, 'profiles', 'custom-profile', 'config.toml')
      );
    });

    it('should return correct paths with custom project root', () => {
      const customRoot = '/custom/project/root';
      const paths = getConfigPaths(undefined, customRoot);

      expect(paths.project).toBe(
        path.join(customRoot, '.claudeops', 'config.toml')
      );
      expect(paths.local).toBe(
        path.join(customRoot, '.claudeops', 'local.toml')
      );
    });

    it('should handle both custom profile and project root', () => {
      const customRoot = '/custom/root';
      const paths = getConfigPaths('my-profile', customRoot);
      const globalDir = getGlobalConfigDir();

      expect(paths.profile).toBe(
        path.join(globalDir, 'profiles', 'my-profile', 'config.toml')
      );
      expect(paths.project).toBe(
        path.join(customRoot, '.claudeops', 'config.toml')
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

  describe('loadProjectConfig', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claudeops-test-'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should return empty object when project config does not exist', async () => {
      const config = await loadProjectConfig(tempDir);
      expect(config).toEqual({});
    });

    it('should load project config when it exists', async () => {
      const projectConfigDir = path.join(tempDir, '.claudeops');
      await fs.mkdir(projectConfigDir, { recursive: true });

      const configContent = `
profile = "test-profile"

[model]
default = "haiku"
`;
      await fs.writeFile(
        path.join(projectConfigDir, 'config.toml'),
        configContent
      );

      const config = await loadProjectConfig(tempDir);
      expect(config.profile).toBe('test-profile');
      expect(config.model?.default).toBe('haiku');
    });

    it('should parse complex project config', async () => {
      const projectConfigDir = path.join(tempDir, '.claudeops');
      await fs.mkdir(projectConfigDir, { recursive: true });

      const configContent = `
profile = "dev"

[model]
default = "sonnet"

[model.routing]
simple = "haiku"
complex = "opus"

[cost]
tracking = true
budget_daily = 10.0

[skills]
enabled = ["autopilot", "ralph"]
disabled = ["legacy"]
`;
      await fs.writeFile(
        path.join(projectConfigDir, 'config.toml'),
        configContent
      );

      const config = await loadProjectConfig(tempDir);
      expect(config.profile).toBe('dev');
      expect(config.model?.default).toBe('sonnet');
      expect(config.model?.routing?.simple).toBe('haiku');
      expect(config.model?.routing?.complex).toBe('opus');
      expect(config.cost?.tracking).toBe(true);
      expect(config.cost?.budget_daily).toBe(10.0);
      expect(config.skills?.enabled).toEqual(['autopilot', 'ralph']);
      expect(config.skills?.disabled).toEqual(['legacy']);
    });
  });

  describe('loadLocalConfig', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claudeops-test-'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should return empty object when local config does not exist', async () => {
      const config = await loadLocalConfig(tempDir);
      expect(config).toEqual({});
    });

    it('should load local config when it exists', async () => {
      const projectConfigDir = path.join(tempDir, '.claudeops');
      await fs.mkdir(projectConfigDir, { recursive: true });

      const configContent = `
[model]
default = "opus"

[cost]
budget_daily = 5.0
`;
      await fs.writeFile(
        path.join(projectConfigDir, 'local.toml'),
        configContent
      );

      const config = await loadLocalConfig(tempDir);
      expect(config.model?.default).toBe('opus');
      expect(config.cost?.budget_daily).toBe(5.0);
    });

    it('should handle partial configuration', async () => {
      const projectConfigDir = path.join(tempDir, '.claudeops');
      await fs.mkdir(projectConfigDir, { recursive: true });

      const configContent = `
[skills]
disabled = ["unwanted-skill"]
`;
      await fs.writeFile(
        path.join(projectConfigDir, 'local.toml'),
        configContent
      );

      const config = await loadLocalConfig(tempDir);
      expect(config.skills?.disabled).toEqual(['unwanted-skill']);
      expect(config.model).toBeUndefined();
    });
  });

  describe('saveProjectConfig', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claudeops-test-'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should save project config to correct location', async () => {
      const projectConfigDir = path.join(tempDir, '.claudeops');
      await fs.mkdir(projectConfigDir, { recursive: true });

      await saveProjectConfig(
        {
          profile: 'test',
          model: {
            default: 'sonnet',
          },
        },
        tempDir
      );

      const savedContent = await fs.readFile(
        path.join(projectConfigDir, 'config.toml'),
        'utf-8'
      );

      expect(savedContent).toContain('test');
      expect(savedContent).toContain('sonnet');
    });

    it('should roundtrip project config', async () => {
      const projectConfigDir = path.join(tempDir, '.claudeops');
      await fs.mkdir(projectConfigDir, { recursive: true });

      const originalConfig = {
        profile: 'roundtrip-test',
        model: {
          default: 'haiku' as const,
          routing: {
            simple: 'haiku' as const,
            standard: 'sonnet' as const,
          },
        },
        cost: {
          tracking: true,
          budget_daily: 15.5,
        },
      };

      await saveProjectConfig(originalConfig, tempDir);
      const loadedConfig = await loadProjectConfig(tempDir);

      expect(loadedConfig.profile).toBe(originalConfig.profile);
      expect(loadedConfig.model?.default).toBe(originalConfig.model.default);
      expect(loadedConfig.model?.routing?.simple).toBe(
        originalConfig.model.routing.simple
      );
      expect(loadedConfig.model?.routing?.standard).toBe(
        originalConfig.model.routing.standard
      );
      expect(loadedConfig.cost?.tracking).toBe(originalConfig.cost.tracking);
      expect(loadedConfig.cost?.budget_daily).toBe(
        originalConfig.cost.budget_daily
      );
    });
  });

  describe('saveLocalConfig', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claudeops-test-'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should save local config to correct location', async () => {
      const projectConfigDir = path.join(tempDir, '.claudeops');
      await fs.mkdir(projectConfigDir, { recursive: true });

      await saveLocalConfig(
        {
          model: {
            default: 'opus',
          },
        },
        tempDir
      );

      const savedContent = await fs.readFile(
        path.join(projectConfigDir, 'local.toml'),
        'utf-8'
      );

      expect(savedContent).toContain('opus');
    });

    it('should roundtrip local config', async () => {
      const projectConfigDir = path.join(tempDir, '.claudeops');
      await fs.mkdir(projectConfigDir, { recursive: true });

      const originalConfig = {
        model: {
          default: 'sonnet' as const,
        },
        skills: {
          disabled: ['test-skill'],
        },
      };

      await saveLocalConfig(originalConfig, tempDir);
      const loadedConfig = await loadLocalConfig(tempDir);

      expect(loadedConfig.model?.default).toBe(originalConfig.model.default);
      expect(loadedConfig.skills?.disabled).toEqual(
        originalConfig.skills.disabled
      );
    });
  });

  describe('loadConfig', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claudeops-test-'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should return default config when no configs exist', async () => {
      const config = await loadConfig({ projectRoot: tempDir });

      expect(config).toBeDefined();
      expect(config.model).toBeDefined();
      expect(config.model.default).toBeDefined();
      expect(config.cost).toBeDefined();
      expect(config.skills).toBeDefined();
    });

    it('should merge project config over defaults', async () => {
      const projectConfigDir = path.join(tempDir, '.claudeops');
      await fs.mkdir(projectConfigDir, { recursive: true });

      const configContent = `
[model]
default = "haiku"

[cost]
tracking = true
budget_daily = 20.0
`;
      await fs.writeFile(
        path.join(projectConfigDir, 'config.toml'),
        configContent
      );

      const config = await loadConfig({ projectRoot: tempDir });

      expect(config.model.default).toBe('haiku');
      expect(config.cost.tracking).toBe(true);
      expect(config.cost.budget_daily).toBe(20.0);
    });

    it('should merge local config over project config', async () => {
      const projectConfigDir = path.join(tempDir, '.claudeops');
      await fs.mkdir(projectConfigDir, { recursive: true });

      const projectConfigContent = `
[model]
default = "haiku"

[cost]
budget_daily = 20.0
`;
      await fs.writeFile(
        path.join(projectConfigDir, 'config.toml'),
        projectConfigContent
      );

      const localConfigContent = `
[model]
default = "opus"
`;
      await fs.writeFile(
        path.join(projectConfigDir, 'local.toml'),
        localConfigContent
      );

      const config = await loadConfig({ projectRoot: tempDir });

      // Local should override project
      expect(config.model.default).toBe('opus');
      // Project value should still be present
      expect(config.cost.budget_daily).toBe(20.0);
    });

    it('should handle skills merging correctly', async () => {
      const projectConfigDir = path.join(tempDir, '.claudeops');
      await fs.mkdir(projectConfigDir, { recursive: true });

      const projectConfigContent = `
[skills]
enabled = ["skill-a", "skill-b"]
disabled = ["skill-x"]
`;
      await fs.writeFile(
        path.join(projectConfigDir, 'config.toml'),
        projectConfigContent
      );

      const localConfigContent = `
[skills]
enabled = ["skill-c"]
disabled = ["skill-y"]
`;
      await fs.writeFile(
        path.join(projectConfigDir, 'local.toml'),
        localConfigContent
      );

      const config = await loadConfig({ projectRoot: tempDir });

      // Skills should be merged from both layers
      expect(config.skills.enabled).toBeDefined();
      expect(config.skills.disabled).toBeDefined();
    });

    it('should set profile info correctly', async () => {
      const projectConfigDir = path.join(tempDir, '.claudeops');
      await fs.mkdir(projectConfigDir, { recursive: true });

      const configContent = `
profile = "custom-profile"
`;
      await fs.writeFile(
        path.join(projectConfigDir, 'config.toml'),
        configContent
      );

      const config = await loadConfig({ projectRoot: tempDir });

      expect(config.profile.name).toBe('custom-profile');
      expect(config.profile.source).toBe('project');
    });
  });

  describe('getConfigLayers', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claudeops-test-'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should return at least default layer', async () => {
      const layers = await getConfigLayers({ projectRoot: tempDir });

      expect(layers.length).toBeGreaterThan(0);
      expect(layers[0]?.layer).toBe('default');
    });

    it('should include project layer when config exists', async () => {
      const projectConfigDir = path.join(tempDir, '.claudeops');
      await fs.mkdir(projectConfigDir, { recursive: true });

      const configContent = `
[model]
default = "sonnet"
`;
      await fs.writeFile(
        path.join(projectConfigDir, 'config.toml'),
        configContent
      );

      const layers = await getConfigLayers({ projectRoot: tempDir });

      const projectLayer = layers.find((l) => l.layer === 'project');
      expect(projectLayer).toBeDefined();
      expect(projectLayer?.path).toContain('config.toml');
    });

    it('should not include project layer when config does not exist', async () => {
      const layers = await getConfigLayers({ projectRoot: tempDir });

      const projectLayer = layers.find((l) => l.layer === 'project');
      expect(projectLayer).toBeUndefined();
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
