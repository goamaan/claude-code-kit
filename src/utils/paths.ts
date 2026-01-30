/**
 * Path resolution utilities for claudeops
 */

import { homedir } from 'node:os';
import { join, resolve, isAbsolute, normalize, relative } from 'node:path';
import {
  GLOBAL_CONFIG_DIR,
  CLAUDE_DIR,
  PROFILES_DIR,
  ADDONS_DIR,
  SETUPS_DIR,
} from './constants.js';

/**
 * Get the user's home directory
 */
export function getHomeDir(): string {
  return homedir();
}

/**
 * Get the global claudeops configuration directory
 * @returns ~/.claudeops
 */
export function getGlobalConfigDir(): string {
  return join(getHomeDir(), GLOBAL_CONFIG_DIR);
}

/**
 * Get the Claude configuration directory
 * @returns ~/.claude
 */
export function getClaudeDir(): string {
  return join(getHomeDir(), CLAUDE_DIR);
}

/**
 * Get the profiles directory
 * @returns ~/.claudeops/profiles
 */
export function getProfilesDir(): string {
  return join(getGlobalConfigDir(), PROFILES_DIR);
}

/**
 * Get a specific profile directory
 * @param profileName - Name of the profile
 * @returns ~/.claudeops/profiles/<profileName>
 */
export function getProfileDir(profileName: string): string {
  return join(getProfilesDir(), profileName);
}

/**
 * Get the addons directory
 * @returns ~/.claudeops/addons
 */
export function getAddonsDir(): string {
  return join(getGlobalConfigDir(), ADDONS_DIR);
}

/**
 * Get a specific addon directory
 * @param addonName - Name of the addon
 * @returns ~/.claudeops/addons/<addonName>
 */
export function getAddonDir(addonName: string): string {
  return join(getAddonsDir(), addonName);
}

/**
 * Get the setups directory
 * @returns ~/.claudeops/setups
 */
export function getSetupsDir(): string {
  return join(getGlobalConfigDir(), SETUPS_DIR);
}

/**
 * Get a specific setup directory
 * @param setupName - Name of the setup
 * @returns ~/.claudeops/setups/<setupName>
 */
export function getSetupDir(setupName: string): string {
  return join(getSetupsDir(), setupName);
}

/**
 * Expand tilde (~) in a path to the user's home directory
 * @param path - Path that may contain ~
 * @returns Expanded path
 */
export function expandPath(path: string): string {
  if (path.startsWith('~/')) {
    return join(getHomeDir(), path.slice(2));
  }
  if (path === '~') {
    return getHomeDir();
  }
  return path;
}

/**
 * Resolve path segments to an absolute path
 * Handles tilde expansion and relative paths
 * @param segments - Path segments to resolve
 * @returns Absolute resolved path
 */
export function resolvePath(...segments: string[]): string {
  if (segments.length === 0) {
    return process.cwd();
  }

  // Expand tilde in the first segment if present
  const firstSegment = segments[0];
  if (firstSegment !== undefined) {
    const expanded = expandPath(firstSegment);
    const restSegments = segments.slice(1);

    if (isAbsolute(expanded)) {
      return normalize(join(expanded, ...restSegments));
    }

    return resolve(expanded, ...restSegments);
  }

  return resolve(...segments);
}

/**
 * Check if a path is within a directory
 * @param childPath - Path to check
 * @param parentPath - Parent directory path
 * @returns Whether childPath is within parentPath
 */
export function isPathWithin(childPath: string, parentPath: string): boolean {
  const resolvedChild = resolvePath(childPath);
  const resolvedParent = resolvePath(parentPath);

  return (
    resolvedChild === resolvedParent ||
    resolvedChild.startsWith(resolvedParent + '/')
  );
}

/**
 * Get relative path from one path to another
 * @param from - Source path
 * @param to - Target path
 * @returns Relative path from source to target
 */
export function getRelativePath(from: string, to: string): string {
  return relative(resolvePath(from), resolvePath(to));
}

/**
 * Normalize a path for consistent comparison
 * @param path - Path to normalize
 * @returns Normalized path
 */
export function normalizePath(path: string): string {
  return normalize(expandPath(path));
}

/**
 * Join paths and expand tilde if present
 * @param segments - Path segments to join
 * @returns Joined and expanded path
 */
export function joinPath(...segments: string[]): string {
  if (segments.length === 0) {
    return '';
  }

  const firstSegment = segments[0];
  if (firstSegment !== undefined) {
    const expanded = expandPath(firstSegment);
    return join(expanded, ...segments.slice(1));
  }

  return join(...segments);
}
