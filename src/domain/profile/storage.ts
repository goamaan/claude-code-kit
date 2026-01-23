/**
 * Profile Storage Layer
 * Handles persistence of profile configurations to the filesystem
 */

/// <reference types="node" />

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { parse as parseToml, stringify as stringifyToml } from '@ltd/j-toml';
import { ProfileFileConfigSchema, type ProfileFileConfig } from '@/types/index.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Recursively remove undefined values from an object
 * TOML cannot serialize undefined values
 */
function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const cleaned = removeUndefined(value as Record<string, unknown>);
      // Only include non-empty objects
      if (Object.keys(cleaned).length > 0) {
        result[key] = cleaned;
      }
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

// =============================================================================
// Constants
// =============================================================================

const CLAUDE_KIT_DIR = '.claudeops';
const PROFILES_DIR = 'profiles';
const ACTIVE_PROFILE_FILE = 'active-profile';
const PROFILE_EXTENSION = '.toml';

// =============================================================================
// Interface
// =============================================================================

export interface ProfileStorage {
  /** Get the base profiles directory path */
  getProfilesDir(): string;

  /** Get the full path for a profile file */
  getProfilePath(name: string): string;

  /** List all profile names */
  listProfiles(): Promise<string[]>;

  /** Read a profile configuration */
  readProfile(name: string): Promise<ProfileFileConfig | null>;

  /** Write a profile configuration */
  writeProfile(name: string, config: ProfileFileConfig): Promise<void>;

  /** Delete a profile */
  deleteProfile(name: string): Promise<void>;

  /** Get the currently active profile name */
  getActiveProfile(): Promise<string>;

  /** Set the active profile */
  setActiveProfile(name: string): Promise<void>;

  /** Check if a profile exists */
  profileExists(name: string): Promise<boolean>;
}

// =============================================================================
// Implementation
// =============================================================================

export function createProfileStorage(baseDir?: string): ProfileStorage {
  const claudeKitDir = baseDir ?? path.join(os.homedir(), CLAUDE_KIT_DIR);
  const profilesDir = path.join(claudeKitDir, PROFILES_DIR);
  const activeProfilePath = path.join(claudeKitDir, ACTIVE_PROFILE_FILE);

  /**
   * Ensure the profiles directory exists
   */
  async function ensureProfilesDir(): Promise<void> {
    await fs.mkdir(profilesDir, { recursive: true });
  }

  /**
   * Get the profiles directory path
   */
  function getProfilesDir(): string {
    return profilesDir;
  }

  /**
   * Get the full path for a profile file
   */
  function getProfilePath(name: string): string {
    return path.join(profilesDir, `${name}${PROFILE_EXTENSION}`);
  }

  /**
   * List all profile names (without extension)
   */
  async function listProfiles(): Promise<string[]> {
    await ensureProfilesDir();

    try {
      const files = await fs.readdir(profilesDir);
      return files
        .filter((f) => f.endsWith(PROFILE_EXTENSION))
        .map((f) => path.basename(f, PROFILE_EXTENSION))
        .sort();
    } catch {
      return [];
    }
  }

  /**
   * Read a profile configuration from disk
   */
  async function readProfile(name: string): Promise<ProfileFileConfig | null> {
    const profilePath = getProfilePath(name);

    try {
      const content = await fs.readFile(profilePath, 'utf-8');
      const parsed = parseToml(content, { bigint: false });
      const validated = ProfileFileConfigSchema.parse(parsed);
      return validated;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }

  /**
   * Write a profile configuration to disk
   */
  async function writeProfile(name: string, config: ProfileFileConfig): Promise<void> {
    await ensureProfilesDir();

    const profilePath = getProfilePath(name);

    // Validate before writing
    ProfileFileConfigSchema.parse(config);

    // Remove undefined values (TOML cannot serialize undefined)
    const cleanConfig = removeUndefined(config);

    // Convert to TOML
    const tomlContent = stringifyToml(cleanConfig as Parameters<typeof stringifyToml>[0], {
      newline: '\n',
      newlineAround: 'section',
    });

    await fs.writeFile(profilePath, tomlContent, 'utf-8');
  }

  /**
   * Delete a profile from disk
   */
  async function deleteProfile(name: string): Promise<void> {
    const profilePath = getProfilePath(name);

    try {
      await fs.unlink(profilePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  /**
   * Get the currently active profile name
   */
  async function getActiveProfile(): Promise<string> {
    try {
      const content = await fs.readFile(activeProfilePath, 'utf-8');
      return content.trim() || 'default';
    } catch {
      return 'default';
    }
  }

  /**
   * Set the active profile
   */
  async function setActiveProfile(name: string): Promise<void> {
    await fs.mkdir(claudeKitDir, { recursive: true });
    await fs.writeFile(activeProfilePath, name, 'utf-8');
  }

  /**
   * Check if a profile exists
   */
  async function profileExists(name: string): Promise<boolean> {
    const profilePath = getProfilePath(name);

    try {
      await fs.access(profilePath);
      return true;
    } catch {
      return false;
    }
  }

  return {
    getProfilesDir,
    getProfilePath,
    listProfiles,
    readProfile,
    writeProfile,
    deleteProfile,
    getActiveProfile,
    setActiveProfile,
    profileExists,
  };
}
