/**
 * Configuration file discovery and loading
 * Handles the multi-layer configuration system for claudeops
 */

import { join } from 'node:path';
import {
  CONFIG_FILE,
  LOCAL_CONFIG_FILE,
  PROFILE_FILE,
  PROFILES_DIR,
  DEFAULT_PROFILE_NAME,
} from '../../utils/constants.js';
import {
  getGlobalConfigDir,
  getProjectConfigDir,
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
  ProjectConfigSchema,
  DEFAULT_MERGED_CONFIG,
  type MainConfig,
  type ProfileFileConfig,
  type ProjectConfig,
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
  /** Project-level configuration file (.claudeops/config.toml) */
  project: string;
  /** Local configuration file (.claudeops/local.toml) - gitignored */
  local: string;
}

/**
 * Get all configuration file paths
 *
 * @param profileName - Optional profile name (defaults to active profile)
 * @param projectRoot - Optional project root (defaults to cwd)
 * @returns Configuration file paths
 */
export function getConfigPaths(
  profileName?: string,
  projectRoot?: string
): ConfigPaths {
  const globalDir = getGlobalConfigDir();
  const projectDir = getProjectConfigDir(projectRoot);
  const profile = profileName ?? DEFAULT_PROFILE_NAME;

  return {
    global: join(globalDir, CONFIG_FILE),
    profile: join(globalDir, PROFILES_DIR, profile, CONFIG_FILE),
    project: join(projectDir, CONFIG_FILE),
    local: join(projectDir, LOCAL_CONFIG_FILE),
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

/** Input type for project config (before defaults are applied) */
type ProjectConfigInput = z.input<typeof ProjectConfigSchema>;

/**
 * Load the project configuration file
 *
 * @param projectRoot - Optional project root (defaults to cwd)
 * @returns Project configuration or empty object if not found
 */
export async function loadProjectConfig(
  projectRoot?: string
): Promise<ProjectConfigInput> {
  const paths = getConfigPaths(undefined, projectRoot);

  if (!(await exists(paths.project))) {
    return {};
  }

  const config = await parseFile(paths.project, ProjectConfigSchema) as ProjectConfigInput;

  // If the project extends a URL, resolve inheritance
  if (config.extends) {
    const resolver = createHybridResolver(async (path: string) => {
      return parseFile(path, ProjectConfigSchema) as Promise<ProjectConfigInput>;
    });

    return resolveInheritance(config, resolver) as Promise<ProjectConfigInput>;
  }

  return config;
}

/**
 * Load the local configuration file (gitignored)
 *
 * @param projectRoot - Optional project root (defaults to cwd)
 * @returns Local configuration or empty object if not found
 */
export async function loadLocalConfig(
  projectRoot?: string
): Promise<Partial<ProjectConfigInput>> {
  const paths = getConfigPaths(undefined, projectRoot);

  if (!(await exists(paths.local))) {
    return {};
  }

  // Local config uses the same schema as project config
  return parseFile(paths.local, ProjectConfigSchema.partial()) as Promise<Partial<ProjectConfigInput>>;
}

/**
 * Build the merged configuration from all layers
 *
 * @param options - Load options
 * @returns Fully merged configuration
 */
export async function loadConfig(options?: {
  projectRoot?: string;
  profileName?: string;
}): Promise<MergedConfig> {
  // Determine active profile
  const profileName =
    options?.profileName ?? (await getActiveProfileName());

  // Load all configuration layers
  const [globalConfig, profileConfig, projectConfig, localConfig] =
    await Promise.all([
      loadGlobalConfig(),
      loadProfileConfigSafe(profileName),
      loadProjectConfig(options?.projectRoot),
      loadLocalConfig(options?.projectRoot),
    ]);

  // Determine the effective profile (project can override)
  const effectiveProfile = projectConfig.profile ?? profileName;
  let effectiveProfileConfig = profileConfig;

  // If project specifies a different profile, load it
  if (projectConfig.profile && projectConfig.profile !== profileName) {
    effectiveProfileConfig = await loadProfileConfigSafe(projectConfig.profile);
  }

  // Start with defaults
  let result: MergedConfig = { ...DEFAULT_MERGED_CONFIG };

  // Set profile info
  result.profile = {
    name: effectiveProfile,
    description: effectiveProfileConfig?.description,
    source: projectConfig.profile
      ? 'project'
      : profileName !== DEFAULT_PROFILE_NAME
        ? 'global'
        : 'default',
  };

  // Merge model configuration
  const modelDefault =
    localConfig.model?.default ??
    projectConfig.model?.default ??
    effectiveProfileConfig?.model?.default ??
    globalConfig.model?.default ??
    result.model.default;

  const modelRouting = merge([
    result.model.routing,
    globalConfig.model?.routing ?? {},
    effectiveProfileConfig?.model?.routing ?? {},
    projectConfig.model?.routing ?? {},
    localConfig.model?.routing ?? {},
  ]);

  const modelOverrides = merge([
    result.model.overrides,
    globalConfig.model?.overrides ?? {},
    effectiveProfileConfig?.model?.overrides ?? {},
    projectConfig.model?.overrides ?? {},
    localConfig.model?.overrides ?? {},
  ]);

  result.model = {
    default: modelDefault,
    routing: modelRouting as MergedConfig['model']['routing'],
    overrides: modelOverrides,
  };

  // Merge cost configuration
  result.cost = {
    tracking:
      localConfig.cost?.tracking ??
      projectConfig.cost?.tracking ??
      effectiveProfileConfig?.cost?.tracking ??
      globalConfig.cost?.tracking ??
      result.cost.tracking,
    budget_daily:
      localConfig.cost?.budget_daily ??
      projectConfig.cost?.budget_daily ??
      effectiveProfileConfig?.cost?.budget_daily ??
      globalConfig.cost?.budget_daily,
    budget_weekly:
      localConfig.cost?.budget_weekly ??
      projectConfig.cost?.budget_weekly ??
      effectiveProfileConfig?.cost?.budget_weekly ??
      globalConfig.cost?.budget_weekly,
    budget_monthly:
      localConfig.cost?.budget_monthly ??
      projectConfig.cost?.budget_monthly ??
      effectiveProfileConfig?.cost?.budget_monthly ??
      globalConfig.cost?.budget_monthly,
  };

  // Merge sync configuration (from global only)
  result.sync = {
    auto: globalConfig.sync?.auto ?? result.sync.auto,
    watch: globalConfig.sync?.watch ?? result.sync.watch,
  };

  // Merge team configuration (from global only)
  if (globalConfig.team) {
    result.team = {
      extends: globalConfig.team.extends,
      enforce: globalConfig.team.enforce ?? false,
    };
  }

  // Merge skills configuration
  result.skills = mergeEnabledDisabled(
    mergeEnabledDisabled(
      result.skills,
      effectiveProfileConfig?.skills ?? {}
    ),
    mergeEnabledDisabled(
      projectConfig.skills ?? {},
      localConfig.skills ?? {}
    )
  );

  // Merge agents configuration
  const mergedAgents: MergedConfig['agents'] = {};
  const allAgentNames = new Set([
    ...Object.keys(effectiveProfileConfig?.agents ?? {}),
    ...Object.keys(projectConfig.agents ?? {}),
    ...Object.keys(localConfig.agents ?? {}),
  ]);

  for (const agentName of allAgentNames) {
    const profileAgent = effectiveProfileConfig?.agents?.[agentName];
    const projectAgent = projectConfig.agents?.[agentName];
    const localAgent = localConfig.agents?.[agentName];

    mergedAgents[agentName] = {
      model:
        (localAgent?.model ??
        projectAgent?.model ??
        profileAgent?.model ??
        result.model.default) as ModelName,
      priority:
        localAgent?.priority ?? projectAgent?.priority ?? profileAgent?.priority ?? 50,
    };
  }
  result.agents = mergedAgents;

  // Merge MCP configuration
  result.mcp = mergeEnabledDisabled(
    mergeEnabledDisabled(
      result.mcp,
      effectiveProfileConfig?.mcp ?? {}
    ),
    mergeEnabledDisabled(
      projectConfig.mcp ?? {},
      localConfig.mcp ?? {}
    )
  );

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
  projectRoot?: string;
  profileName?: string;
}): Promise<ConfigLayerInfo[]> {
  const profileName =
    options?.profileName ?? (await getActiveProfileName());
  const paths = getConfigPaths(profileName, options?.projectRoot);

  const layers: ConfigLayerInfo[] = [];

  // Default layer (always exists)
  layers.push({
    layer: 'default',
    config: DEFAULT_MERGED_CONFIG,
  });

  // Global layer
  if (await exists(paths.global)) {
    const config = await loadGlobalConfig();
    layers.push({
      layer: 'global',
      path: paths.global,
      config: config as unknown as Partial<MergedConfig>,
    });
  }

  // Profile layer
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

  // Project layer
  if (await exists(paths.project)) {
    const config = await loadProjectConfig(options?.projectRoot);
    layers.push({
      layer: 'project',
      path: paths.project,
      config: config as unknown as Partial<MergedConfig>,
    });
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

/**
 * Save project configuration
 *
 * @param config - Configuration to save
 * @param projectRoot - Optional project root (defaults to cwd)
 */
export async function saveProjectConfig(
  config: ProjectConfig,
  projectRoot?: string
): Promise<void> {
  const paths = getConfigPaths(undefined, projectRoot);
  const content = stringify(config);
  await writeFile(paths.project, content);
}

/**
 * Save local configuration
 *
 * @param config - Configuration to save
 * @param projectRoot - Optional project root (defaults to cwd)
 */
export async function saveLocalConfig(
  config: Partial<ProjectConfig>,
  projectRoot?: string
): Promise<void> {
  const paths = getConfigPaths(undefined, projectRoot);
  const content = stringify(config);
  await writeFile(paths.local, content);
}
