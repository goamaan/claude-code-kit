/**
 * Configuration file discovery and loading
 * Handles the multi-layer configuration system for claudeops
 */

import { join } from 'node:path';
import {
  CONFIG_FILE,
  PROFILE_FILE,
  PROFILES_DIR,
  DEFAULT_PROFILE_NAME,
} from '../../utils/constants.js';
import {
  getGlobalConfigDir,
  getProfilesDir,
} from '../../utils/paths.js';
import {
  exists,
  readFileSafe,
  writeFile,
} from '../../utils/fs.js';
import {
  parseFile,
  stringify,
  ConfigError,
} from './parser.js';
import {
  merge,
  resolveInheritance,
  createHybridResolver,
  mergeEnabledDisabled,
} from './merger.js';
import type { z } from 'zod';
import {
  MainConfigSchema,
  ProfileFileConfigSchema,
  DEFAULT_MERGED_CONFIG,
  type MainConfig,
  type ProfileFileConfig,
  type MergedConfig,
  type ModelName,
  type ConfigLayerInfo,
} from '../../types/config.js';

/**
 * Configuration file paths
 */
export interface ConfigPaths {
  /** Global configuration file (~/.claudeops/config.toml) */
  global: string;
  /** Profile-specific configuration file (~/.claudeops/profiles/{name}/config.toml) */
  profile: string;
}

/**
 * Get all configuration file paths
 *
 * @param profileName - Optional profile name (defaults to active profile)
 * @returns Configuration file paths
 */
export function getConfigPaths(
  profileName?: string,
): ConfigPaths {
  const globalDir = getGlobalConfigDir();
  const profile = profileName ?? DEFAULT_PROFILE_NAME;

  return {
    global: join(globalDir, CONFIG_FILE),
    profile: join(globalDir, PROFILES_DIR, profile, CONFIG_FILE),
  };
}

/**
 * Get the currently active profile name
 *
 * @returns Active profile name, or 'default' if not set
 */
export async function getActiveProfileName(): Promise<string> {
  const profileFilePath = join(getGlobalConfigDir(), PROFILE_FILE);
  const content = await readFileSafe(profileFilePath);

  if (content) {
    const profileName = content.trim();
    if (profileName) {
      return profileName;
    }
  }

  return DEFAULT_PROFILE_NAME;
}

/**
 * Set the active profile
 *
 * @param profileName - Profile name to activate
 */
export async function setActiveProfile(profileName: string): Promise<void> {
  const profileFilePath = join(getGlobalConfigDir(), PROFILE_FILE);
  await writeFile(profileFilePath, profileName + '\n');
}

/**
 * Load the global configuration file
 *
 * @returns Global configuration or empty object if not found
 */
export async function loadGlobalConfig(): Promise<z.input<typeof MainConfigSchema>> {
  const paths = getConfigPaths();

  if (!(await exists(paths.global))) {
    return {};
  }

  return parseFile(paths.global, MainConfigSchema) as Promise<z.input<typeof MainConfigSchema>>;
}

/** Input type for profile config (before defaults are applied) */
type ProfileFileConfigInput = z.input<typeof ProfileFileConfigSchema>;

/**
 * Load a profile configuration file
 *
 * @param profileName - Profile name to load
 * @returns Profile configuration
 * @throws ConfigError if profile doesn't exist
 */
export async function loadProfileConfig(
  profileName: string
): Promise<ProfileFileConfigInput> {
  const profilePath = join(getProfilesDir(), profileName, CONFIG_FILE);

  if (!(await exists(profilePath))) {
    throw new ConfigError(`Profile '${profileName}' not found`, {
      filePath: profilePath,
    });
  }

  const config = await parseFile(profilePath, ProfileFileConfigSchema) as ProfileFileConfigInput;

  // If the profile extends another, resolve inheritance
  if (config.extends) {
    const resolver = createHybridResolver(async (path: string) => {
      // Treat relative paths as profile names
      if (!path.startsWith('/') && !path.startsWith('http')) {
        const parentPath = join(getProfilesDir(), path, CONFIG_FILE);
        return parseFile(parentPath, ProfileFileConfigSchema) as Promise<ProfileFileConfigInput>;
      }
      // Absolute path
      return parseFile(path, ProfileFileConfigSchema) as Promise<ProfileFileConfigInput>;
    });

    return resolveInheritance(config, resolver) as Promise<ProfileFileConfigInput>;
  }

  return config;
}

/**
 * Build the merged configuration from all layers
 *
 * @param options - Load options
 * @returns Fully merged configuration
 */
export async function loadConfig(options?: {
  profileName?: string;
}): Promise<MergedConfig> {
  const profileName =
    options?.profileName ?? (await getActiveProfileName());

  const [globalConfig, profileConfig] =
    await Promise.all([
      loadGlobalConfig(),
      loadProfileConfigSafe(profileName),
    ]);

  let result: MergedConfig = { ...DEFAULT_MERGED_CONFIG };

  result.profile = {
    name: profileName,
    description: profileConfig?.description,
    source: profileName !== DEFAULT_PROFILE_NAME ? 'global' : 'default',
  };

  const modelDefault =
    profileConfig?.model?.default ??
    globalConfig.model?.default ??
    result.model.default;

  const modelRouting = merge([
    result.model.routing,
    globalConfig.model?.routing ?? {},
    profileConfig?.model?.routing ?? {},
  ]);

  const modelOverrides = merge([
    result.model.overrides,
    globalConfig.model?.overrides ?? {},
    profileConfig?.model?.overrides ?? {},
  ]);

  result.model = {
    default: modelDefault,
    routing: modelRouting as MergedConfig['model']['routing'],
    overrides: modelOverrides,
  };

  result.cost = {
    tracking:
      profileConfig?.cost?.tracking ??
      globalConfig.cost?.tracking ??
      result.cost.tracking,
    budget_daily:
      profileConfig?.cost?.budget_daily ??
      globalConfig.cost?.budget_daily,
    budget_weekly:
      profileConfig?.cost?.budget_weekly ??
      globalConfig.cost?.budget_weekly,
    budget_monthly:
      profileConfig?.cost?.budget_monthly ??
      globalConfig.cost?.budget_monthly,
  };

  result.sync = {
    auto: globalConfig.sync?.auto ?? result.sync.auto,
    watch: globalConfig.sync?.watch ?? result.sync.watch,
  };

  if (globalConfig.team) {
    result.team = {
      extends: globalConfig.team.extends,
      enforce: globalConfig.team.enforce ?? false,
    };
  }

  result.skills = mergeEnabledDisabled(
    result.skills,
    profileConfig?.skills ?? {}
  );

  const mergedAgents: MergedConfig['agents'] = {};
  const allAgentNames = new Set([
    ...Object.keys(profileConfig?.agents ?? {}),
  ]);

  for (const agentName of allAgentNames) {
    const profileAgent = profileConfig?.agents?.[agentName];

    mergedAgents[agentName] = {
      model: (profileAgent?.model ?? result.model.default) as ModelName,
      priority: profileAgent?.priority ?? 50,
    };
  }
  result.agents = mergedAgents;

  result.mcp = mergeEnabledDisabled(
    result.mcp,
    profileConfig?.mcp ?? {}
  );

  result.packageManager = globalConfig.packageManager;

  // Content from profile (custom CLAUDE.md instructions)
  result.content = profileConfig?.content;

  return result;
}

/**
 * Load profile config safely (returns empty config if not found)
 */
async function loadProfileConfigSafe(
  profileName: string
): Promise<ProfileFileConfigInput | undefined> {
  try {
    return await loadProfileConfig(profileName);
  } catch (error) {
    if (error instanceof ConfigError) {
      return undefined;
    }
    throw error;
  }
}

/**
 * Get information about all config layers
 * Useful for debugging and displaying config sources
 */
export async function getConfigLayers(options?: {
  profileName?: string;
}): Promise<ConfigLayerInfo[]> {
  const profileName =
    options?.profileName ?? (await getActiveProfileName());
  const paths = getConfigPaths(profileName);

  const layers: ConfigLayerInfo[] = [];

  layers.push({
    layer: 'default',
    config: DEFAULT_MERGED_CONFIG,
  });

  if (await exists(paths.global)) {
    const config = await loadGlobalConfig();
    layers.push({
      layer: 'global',
      path: paths.global,
      config: config as unknown as Partial<MergedConfig>,
    });
  }

  try {
    const config = await loadProfileConfig(profileName);
    layers.push({
      layer: 'profile',
      path: paths.profile,
      config: config as unknown as Partial<MergedConfig>,
    });
  } catch {
    // Profile doesn't exist
  }

  return layers;
}

/**
 * List all available profiles
 *
 * @returns Array of profile names
 */
export async function listProfiles(): Promise<string[]> {
  const profilesDir = getProfilesDir();

  if (!(await exists(profilesDir))) {
    return [];
  }

  const { readDirWithTypes } = await import('../../utils/fs.js');
  const entries = await readDirWithTypes(profilesDir);

  const profiles: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const configPath = join(profilesDir, entry.name, CONFIG_FILE);
      if (await exists(configPath)) {
        profiles.push(entry.name);
      }
    }
  }

  return profiles.sort();
}

/**
 * Check if a profile exists
 *
 * @param profileName - Profile name to check
 * @returns Whether the profile exists
 */
export async function profileExists(profileName: string): Promise<boolean> {
  const configPath = join(getProfilesDir(), profileName, CONFIG_FILE);
  return exists(configPath);
}

/**
 * Save global configuration
 *
 * @param config - Configuration to save
 */
export async function saveGlobalConfig(config: MainConfig): Promise<void> {
  const paths = getConfigPaths();
  const content = stringify(config);
  await writeFile(paths.global, content);
}

/**
 * Save profile configuration
 *
 * @param profileName - Profile name
 * @param config - Configuration to save
 */
export async function saveProfileConfig(
  profileName: string,
  config: ProfileFileConfig
): Promise<void> {
  const configPath = join(getProfilesDir(), profileName, CONFIG_FILE);
  const content = stringify(config);
  await writeFile(configPath, content);
}

