/**
 * Profile Manager
 * High-level API for profile management operations
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parse as parseToml, stringify as stringifyToml } from '@ltd/j-toml';
import {
  type ProfileSummary,
  type ProfileDetails,
  type CreateProfileOptions,
  type ExportProfileOptions,
  type ImportProfileOptions,
  type ProfileFileConfig,
  ProfileFileConfigSchema,
  DEFAULT_MODEL,
  DEFAULT_MODEL_ROUTING,
} from '@/types/index.js';
import { createProfileStorage, type ProfileStorage } from './storage.js';

// =============================================================================
// Interface
// =============================================================================

export interface ProfileManager {
  /** List all profiles with summary info */
  list(): Promise<ProfileSummary[]>;

  /** Get the currently active profile name */
  active(): Promise<string>;

  /** Get full details for a profile */
  get(name: string): Promise<ProfileDetails>;

  /** Get full details for a profile with project-level overrides */
  getWithOverrides(name: string, projectOverrides?: ProfileFileConfig): Promise<ProfileDetails>;

  /** Create a new profile */
  create(name: string, options?: Omit<CreateProfileOptions, 'name'>): Promise<void>;

  /** Switch to a different profile */
  use(name: string): Promise<void>;

  /** Delete a profile */
  delete(name: string): Promise<void>;

  /** Export a profile as TOML string */
  export(name: string, options?: Omit<ExportProfileOptions, 'name'>): Promise<string>;

  /** Import a profile from file path or URL */
  import(source: string, options?: Omit<ImportProfileOptions, 'source'>): Promise<void>;
}

// =============================================================================
// Errors
// =============================================================================

export class ProfileNotFoundError extends Error {
  constructor(name: string) {
    super(`Profile not found: ${name}`);
    this.name = 'ProfileNotFoundError';
  }
}

export class ProfileExistsError extends Error {
  constructor(name: string) {
    super(`Profile already exists: ${name}`);
    this.name = 'ProfileExistsError';
  }
}

export class ActiveProfileDeleteError extends Error {
  constructor(name: string) {
    super(`Cannot delete active profile: ${name}. Switch to another profile first.`);
    this.name = 'ActiveProfileDeleteError';
  }
}

// =============================================================================
// Implementation
// =============================================================================

export function createProfileManager(storage?: ProfileStorage): ProfileManager {
  const profileStorage = storage ?? createProfileStorage();

  /**
   * Resolve a profile's inheritance chain and merge configurations
   */
  async function resolveProfile(
    name: string,
    visited: Set<string> = new Set()
  ): Promise<{
    config: ProfileFileConfig;
    inheritanceChain: string[];
    resolved: ProfileDetails['resolved'];
  }> {
    if (visited.has(name)) {
      throw new Error(`Circular inheritance detected: ${name}`);
    }

    const config = await profileStorage.readProfile(name);
    if (!config) {
      throw new ProfileNotFoundError(name);
    }

    visited.add(name);

    // Base resolved values
    let resolved: ProfileDetails['resolved'] = {
      skills: {
        enabled: config.skills?.enabled ?? [],
        disabled: config.skills?.disabled ?? [],
      },
      hooks: {
        enabled: config.hooks?.enabled ?? [],
        disabled: config.hooks?.disabled ?? [],
      },
      agents: {},
      mcp: {
        enabled: config.mcp?.enabled ?? [],
        disabled: config.mcp?.disabled ?? [],
      },
      model: {
        default: config.model?.default ?? DEFAULT_MODEL,
        routing: {
          simple: config.model?.routing?.simple ?? DEFAULT_MODEL_ROUTING.simple,
          standard: config.model?.routing?.standard ?? DEFAULT_MODEL_ROUTING.standard,
          complex: config.model?.routing?.complex ?? DEFAULT_MODEL_ROUTING.complex,
        },
        overrides: config.model?.overrides ?? {},
      },
    };

    // Merge agent configs
    if (config.agents) {
      for (const [agentName, agentConfig] of Object.entries(config.agents)) {
        resolved.agents[agentName] = {
          model: agentConfig.model,
          priority: agentConfig.priority ?? 50,
        };
      }
    }

    let inheritanceChain = [name];

    // If extends another profile, merge parent first
    if (config.extends) {
      const parent = await resolveProfile(config.extends, visited);
      inheritanceChain = [...parent.inheritanceChain, name];

      // Deep merge agents (child properties override parent properties per agent)
      const mergedAgents: ProfileDetails['resolved']['agents'] = { ...parent.resolved.agents };
      for (const [agentName, agentConfig] of Object.entries(resolved.agents)) {
        const parentAgent = parent.resolved.agents[agentName];
        if (parentAgent) {
          // Merge: child overrides specific properties
          mergedAgents[agentName] = {
            model: agentConfig.model ?? parentAgent.model,
            priority: agentConfig.priority,
          };
        } else {
          mergedAgents[agentName] = agentConfig;
        }
      }

      // Merge with parent (child overrides parent)
      resolved = {
        skills: {
          enabled: [...new Set([...parent.resolved.skills.enabled, ...resolved.skills.enabled])],
          disabled: [...new Set([...parent.resolved.skills.disabled, ...resolved.skills.disabled])],
        },
        hooks: {
          enabled: [...new Set([...parent.resolved.hooks.enabled, ...resolved.hooks.enabled])],
          disabled: [...new Set([...parent.resolved.hooks.disabled, ...resolved.hooks.disabled])],
        },
        agents: mergedAgents,
        mcp: {
          enabled: [...new Set([...parent.resolved.mcp.enabled, ...resolved.mcp.enabled])],
          disabled: [...new Set([...parent.resolved.mcp.disabled, ...resolved.mcp.disabled])],
        },
        model: {
          default: resolved.model.default,
          routing: { ...parent.resolved.model.routing, ...resolved.model.routing },
          overrides: { ...parent.resolved.model.overrides, ...resolved.model.overrides },
        },
      };
    }

    return { config, inheritanceChain, resolved };
  }

  /**
   * Get file stats for a profile
   */
  async function getProfileStats(name: string): Promise<{ createdAt: Date; modifiedAt: Date }> {
    const profilePath = profileStorage.getProfilePath(name);
    try {
      const stats = await fs.stat(profilePath);
      return {
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      };
    } catch {
      const now = new Date();
      return { createdAt: now, modifiedAt: now };
    }
  }

  /**
   * List all profiles with summary information
   */
  async function list(): Promise<ProfileSummary[]> {
    const profileNames = await profileStorage.listProfiles();
    const activeProfile = await profileStorage.getActiveProfile();

    const summaries: ProfileSummary[] = [];

    for (const name of profileNames) {
      const config = await profileStorage.readProfile(name);
      if (!config) continue;

      const stats = await getProfileStats(name);

      summaries.push({
        name,
        description: config.description,
        path: profileStorage.getProfilePath(name),
        active: name === activeProfile,
        extends: config.extends,
        modifiedAt: stats.modifiedAt,
        skillCount: (config.skills?.enabled?.length ?? 0) + (config.skills?.disabled?.length ?? 0),
        agentCount: Object.keys(config.agents ?? {}).length,
      });
    }

    return summaries;
  }

  /**
   * Get the currently active profile name
   */
  async function active(): Promise<string> {
    return profileStorage.getActiveProfile();
  }

  /**
   * Get full details for a profile
   */
  async function get(name: string): Promise<ProfileDetails> {
    const { config, inheritanceChain, resolved } = await resolveProfile(name);
    const stats = await getProfileStats(name);
    const activeProfile = await profileStorage.getActiveProfile();

    return {
      name,
      description: config.description,
      path: profileStorage.getProfilePath(name),
      active: name === activeProfile,
      config,
      resolved,
      inheritanceChain,
      createdAt: stats.createdAt,
      modifiedAt: stats.modifiedAt,
    };
  }

  /**
   * Get full details for a profile with project-level overrides
   */
  async function getWithOverrides(
    name: string,
    projectOverrides?: ProfileFileConfig
  ): Promise<ProfileDetails> {
    const baseDetails = await get(name);

    // If no overrides, return base
    if (!projectOverrides) {
      return baseDetails;
    }

    // Merge project overrides into resolved configuration
    const resolved: ProfileDetails['resolved'] = {
      skills: {
        enabled: [
          ...new Set([
            ...baseDetails.resolved.skills.enabled,
            ...(projectOverrides.skills?.enabled ?? []),
          ]),
        ],
        disabled: [
          ...new Set([
            ...baseDetails.resolved.skills.disabled,
            ...(projectOverrides.skills?.disabled ?? []),
          ]),
        ],
      },
      hooks: {
        enabled: [
          ...new Set([
            ...baseDetails.resolved.hooks.enabled,
            ...(projectOverrides.hooks?.enabled ?? []),
          ]),
        ],
        disabled: [
          ...new Set([
            ...baseDetails.resolved.hooks.disabled,
            ...(projectOverrides.hooks?.disabled ?? []),
          ]),
        ],
      },
      agents: { ...baseDetails.resolved.agents },
      mcp: {
        enabled: [
          ...new Set([
            ...baseDetails.resolved.mcp.enabled,
            ...(projectOverrides.mcp?.enabled ?? []),
          ]),
        ],
        disabled: [
          ...new Set([
            ...baseDetails.resolved.mcp.disabled,
            ...(projectOverrides.mcp?.disabled ?? []),
          ]),
        ],
      },
      model: {
        default: projectOverrides.model?.default ?? baseDetails.resolved.model.default,
        routing: {
          ...baseDetails.resolved.model.routing,
          ...projectOverrides.model?.routing,
        },
        overrides: {
          ...baseDetails.resolved.model.overrides,
          ...projectOverrides.model?.overrides,
        },
      },
    };

    // Merge project agent overrides
    if (projectOverrides.agents) {
      for (const [agentName, agentConfig] of Object.entries(projectOverrides.agents)) {
        const baseAgent = baseDetails.resolved.agents[agentName];
        if (baseAgent) {
          resolved.agents[agentName] = {
            model: agentConfig.model ?? baseAgent.model,
            priority: agentConfig.priority ?? baseAgent.priority,
          };
        } else {
          resolved.agents[agentName] = {
            model: agentConfig.model!,
            priority: agentConfig.priority ?? 50,
          };
        }
      }
    }

    return {
      ...baseDetails,
      resolved,
    };
  }

  /**
   * Create a new profile
   */
  async function create(
    name: string,
    options?: Omit<CreateProfileOptions, 'name'>
  ): Promise<void> {
    // Check if profile already exists
    if (await profileStorage.profileExists(name)) {
      throw new ProfileExistsError(name);
    }

    // If extending another profile, verify it exists
    if (options?.extends) {
      if (!(await profileStorage.profileExists(options.extends))) {
        throw new ProfileNotFoundError(options.extends);
      }
    }

    // Build the profile config
    const config: ProfileFileConfig = {
      name,
      description: options?.description,
      extends: options?.extends,
      skills: options?.skills,
      agents: options?.agents,
      mcp: options?.mcp,
      model: options?.model,
    };

    // Write the profile
    await profileStorage.writeProfile(name, config);

    // Activate if requested
    if (options?.activate) {
      await profileStorage.setActiveProfile(name);
    }
  }

  /**
   * Switch to a different profile
   */
  async function use(name: string): Promise<void> {
    // Verify profile exists
    if (!(await profileStorage.profileExists(name))) {
      throw new ProfileNotFoundError(name);
    }

    await profileStorage.setActiveProfile(name);
  }

  /**
   * Delete a profile
   */
  async function deleteProfile(name: string): Promise<void> {
    // Check if it's the active profile
    const activeProfile = await profileStorage.getActiveProfile();
    if (name === activeProfile) {
      throw new ActiveProfileDeleteError(name);
    }

    // Verify profile exists
    if (!(await profileStorage.profileExists(name))) {
      throw new ProfileNotFoundError(name);
    }

    await profileStorage.deleteProfile(name);
  }

  /**
   * Export a profile as TOML string
   */
  async function exportProfile(
    name: string,
    options?: Omit<ExportProfileOptions, 'name'>
  ): Promise<string> {
    const config = await profileStorage.readProfile(name);
    if (!config) {
      throw new ProfileNotFoundError(name);
    }

    // For TOML export (default)
    const format = options?.format ?? 'yaml';

    if (format === 'json') {
      if (options?.resolved) {
        const { resolved } = await resolveProfile(name);
        return JSON.stringify(
          {
            name: config.name,
            description: config.description,
            ...resolved,
          },
          null,
          2
        );
      }
      return JSON.stringify(config, null, 2);
    }

    // YAML format - we'll use TOML since that's our native format
    const tomlContent = stringifyToml(config as Parameters<typeof stringifyToml>[0], {
      newline: '\n',
      newlineAround: 'section',
    });

    return tomlContent;
  }

  /**
   * Import a profile from file path or URL
   */
  async function importProfile(
    source: string,
    options?: Omit<ImportProfileOptions, 'source'>
  ): Promise<void> {
    let content: string;

    // Check if source is a URL
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch profile from URL: ${response.statusText}`);
      }
      content = await response.text();
    } else {
      // Read from file
      content = await fs.readFile(path.resolve(source), 'utf-8');
    }

    // Parse the content
    let config: ProfileFileConfig;
    if (source.endsWith('.json')) {
      config = JSON.parse(content) as ProfileFileConfig;
    } else {
      config = parseToml(content, { bigint: false }) as ProfileFileConfig;
    }

    // Validate
    if (options?.validate !== false) {
      ProfileFileConfigSchema.parse(config);
    }

    // Determine the profile name
    const name = options?.name ?? config.name;

    // Check for existing profile
    if (await profileStorage.profileExists(name)) {
      if (!options?.overwrite) {
        throw new ProfileExistsError(name);
      }
    }

    // Update the name if different
    config.name = name;

    // Write the profile
    await profileStorage.writeProfile(name, config);

    // Activate if requested
    if (options?.activate) {
      await profileStorage.setActiveProfile(name);
    }
  }

  return {
    list,
    active,
    get,
    getWithOverrides,
    create,
    use,
    delete: deleteProfile,
    export: exportProfile,
    import: importProfile,
  };
}
