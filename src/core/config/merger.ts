/**
 * Configuration merging utilities with inheritance support
 */

import { ConfigError } from './parser.js';
import { MAX_INHERITANCE_DEPTH } from '../../utils/constants.js';

/**
 * Check if a value is a plain object (not an array, null, or other type)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Deep merge two objects
 * - Objects are recursively merged
 * - Arrays are replaced (not concatenated)
 * - Primitives from later objects override earlier ones
 * - undefined values are skipped
 *
 * @param target - Base object
 * @param source - Object to merge into target
 * @returns Merged object
 */
function deepMergeTwo<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target } as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    const sourceValue = (source as Record<string, unknown>)[key];
    const targetValue = result[key];

    // Skip undefined values
    if (sourceValue === undefined) {
      continue;
    }

    // If both are plain objects, recursively merge
    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      result[key] = deepMergeTwo(
        targetValue as Record<string, unknown>,
        sourceValue
      );
    } else {
      // Otherwise, replace (arrays, primitives, null)
      result[key] = sourceValue;
    }
  }

  return result as T;
}

/**
 * Deep merge multiple configuration objects
 * Later objects override earlier ones
 *
 * @param configs - Array of configuration objects to merge (in order of precedence, last wins)
 * @returns Merged configuration object
 *
 * @example
 * ```ts
 * const result = merge([
 *   { a: 1, b: { c: 2 } },
 *   { b: { d: 3 } },
 *   { a: 4 }
 * ]);
 * // Result: { a: 4, b: { c: 2, d: 3 } }
 * ```
 */
export function merge<T extends object>(configs: T[]): T {
  if (configs.length === 0) {
    return {} as T;
  }

  if (configs.length === 1) {
    const first = configs[0];
    if (!first) {
      return {} as T;
    }
    // Return a copy to avoid mutations
    return JSON.parse(JSON.stringify(first)) as T;
  }

  // Start with empty object and merge each config
  let result = {} as T;
  for (const config of configs) {
    result = deepMergeTwo(result, config);
  }

  return result;
}

/**
 * Interface for objects that support inheritance via `extends`
 */
export interface Extendable {
  extends?: string;
}

/**
 * Resolver function type for loading inherited configurations
 */
export type InheritanceResolver<T> = (url: string) => Promise<T>;

/**
 * Resolve inheritance chain and merge configurations
 *
 * @param config - Configuration object with optional `extends` property
 * @param resolver - Async function to resolve and load parent configurations
 * @returns Fully resolved configuration with inheritance applied
 * @throws ConfigError if circular inheritance is detected or max depth exceeded
 *
 * @example
 * ```ts
 * const resolved = await resolveInheritance(config, async (url) => {
 *   const response = await fetch(url);
 *   return response.json();
 * });
 * ```
 */
export async function resolveInheritance<T extends object & Extendable>(
  config: T,
  resolver: InheritanceResolver<T>
): Promise<Omit<T, 'extends'>> {
  // Track visited URLs to detect circular inheritance
  const visited = new Set<string>();

  // Collect configs in inheritance order (base first)
  const inheritanceChain: T[] = [];

  async function collectInheritance(current: T, depth: number): Promise<void> {
    if (depth > MAX_INHERITANCE_DEPTH) {
      throw new ConfigError(
        `Maximum inheritance depth (${MAX_INHERITANCE_DEPTH}) exceeded. Check for circular inheritance.`
      );
    }

    const parentUrl = current.extends;

    if (parentUrl) {
      // Check for circular inheritance
      if (visited.has(parentUrl)) {
        throw new ConfigError(
          `Circular inheritance detected: ${parentUrl} appears multiple times in inheritance chain`,
          { path: ['extends'] }
        );
      }

      visited.add(parentUrl);

      // Resolve and collect parent config
      let parentConfig: T;
      try {
        parentConfig = await resolver(parentUrl);
      } catch (error) {
        throw new ConfigError(
          `Failed to resolve inherited configuration: ${parentUrl}`,
          { path: ['extends'], cause: error }
        );
      }

      // Recursively collect parent's inheritance
      await collectInheritance(parentConfig, depth + 1);
    }

    // Add current config to chain (after parents)
    inheritanceChain.push(current);
  }

  await collectInheritance(config, 0);

  // Merge all configs (base first, so later configs override)
  const merged = merge(inheritanceChain);

  // Remove the `extends` property from the result
  const { extends: _, ...result } = merged as T;
  return result;
}

/**
 * Get the inheritance chain for a configuration
 * Useful for debugging and displaying inheritance info
 *
 * @param config - Configuration object with optional `extends` property
 * @param resolver - Async function to resolve and load parent configurations
 * @returns Array of URLs in inheritance order (base first)
 */
export async function getInheritanceChain<T extends object & Extendable>(
  config: T,
  resolver: InheritanceResolver<T>
): Promise<string[]> {
  const chain: string[] = [];
  const visited = new Set<string>();

  async function collectChain(current: T, depth: number): Promise<void> {
    if (depth > MAX_INHERITANCE_DEPTH) {
      throw new ConfigError(
        `Maximum inheritance depth (${MAX_INHERITANCE_DEPTH}) exceeded`
      );
    }

    const parentUrl = current.extends;
    if (!parentUrl) {
      return;
    }

    if (visited.has(parentUrl)) {
      throw new ConfigError(`Circular inheritance detected: ${parentUrl}`);
    }

    visited.add(parentUrl);
    const parentConfig = await resolver(parentUrl);
    await collectChain(parentConfig, depth + 1);
    chain.push(parentUrl);
  }

  await collectChain(config, 0);
  return chain;
}

/**
 * Create a resolver that caches resolved configurations
 * Useful for resolving the same URL multiple times efficiently
 *
 * @param resolver - Base resolver function
 * @returns Cached resolver function
 */
export function createCachedResolver<T>(
  resolver: InheritanceResolver<T>
): InheritanceResolver<T> {
  const cache = new Map<string, Promise<T>>();

  return async (url: string): Promise<T> => {
    const cached = cache.get(url);
    if (cached) {
      return cached;
    }

    const promise = resolver(url);
    cache.set(url, promise);

    try {
      return await promise;
    } catch (error) {
      // Remove from cache on error so it can be retried
      cache.delete(url);
      throw error;
    }
  };
}

/**
 * Create a resolver that can handle both URLs and local file paths
 *
 * @param fileResolver - Function to resolve local file paths
 * @param urlResolver - Function to resolve URLs (optional, defaults to fetch)
 * @returns Combined resolver function
 */
export function createHybridResolver<T>(
  fileResolver: (path: string) => Promise<T>,
  urlResolver?: (url: string) => Promise<T>
): InheritanceResolver<T> {
  const defaultUrlResolver = async (url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${url}: ${response.status} ${response.statusText}`
      );
    }
    return (await response.json()) as T;
  };

  const resolveUrl = urlResolver ?? defaultUrlResolver;

  return async (source: string): Promise<T> => {
    // Check if it's a URL
    if (source.startsWith('http://') || source.startsWith('https://')) {
      return resolveUrl(source);
    }

    // Treat as local file path
    return fileResolver(source);
  };
}

/**
 * Merge arrays with special handling for enabled/disabled patterns
 * Used for skills and MCP server lists
 *
 * @param base - Base enabled/disabled arrays
 * @param override - Override enabled/disabled arrays
 * @returns Merged result
 */
export function mergeEnabledDisabled(
  base: { enabled?: string[]; disabled?: string[] },
  override: { enabled?: string[]; disabled?: string[] }
): { enabled: string[]; disabled: string[] } {
  const baseEnabled = new Set(base.enabled ?? []);
  const baseDisabled = new Set(base.disabled ?? []);
  const overrideEnabled = new Set(override.enabled ?? []);
  const overrideDisabled = new Set(override.disabled ?? []);

  // Items enabled in override remove them from disabled
  for (const item of overrideEnabled) {
    baseDisabled.delete(item);
  }

  // Items disabled in override remove them from enabled
  for (const item of overrideDisabled) {
    baseEnabled.delete(item);
  }

  // Merge the sets
  const finalEnabled = new Set([...baseEnabled, ...overrideEnabled]);
  const finalDisabled = new Set([...baseDisabled, ...overrideDisabled]);

  // Remove any item that appears in both (disabled wins)
  for (const item of finalDisabled) {
    finalEnabled.delete(item);
  }

  return {
    enabled: [...finalEnabled].sort(),
    disabled: [...finalDisabled].sort(),
  };
}
