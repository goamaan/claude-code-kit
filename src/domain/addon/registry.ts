/**
 * Addon Registry - Local and remote registry client
 * Provides search, fetch, and download capabilities for addons
 */

import { readdir, readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type {
  RegistryEntry,
  RegistrySearchResult,
  AddonManifest,
} from '@/types/index.js';
import { loadAddonManifest } from './manifest-parser.js';

// =============================================================================
// Types
// =============================================================================

export interface AddonRegistry {
  /**
   * Search for addons matching a query
   * @param query Search query (matches name, description, keywords)
   * @param limit Maximum results to return (default: 20)
   */
  search(query: string, limit?: number): Promise<RegistrySearchResult>;

  /**
   * Get a specific addon entry by name
   * @param name Addon name
   */
  get(name: string): Promise<RegistryEntry | null>;

  /**
   * Get all available versions of an addon
   * @param name Addon name
   */
  getVersions(name: string): Promise<string[]>;

  /**
   * Download addon package as bytes
   * @param name Addon name
   * @param version Optional specific version (default: latest)
   */
  download(name: string, version?: string): Promise<Uint8Array>;
}

// =============================================================================
// Error Types
// =============================================================================

export class RegistryError extends Error {
  public readonly addon?: string;

  constructor(
    message: string,
    addon?: string,
    cause?: unknown
  ) {
    super(message, { cause });
    this.name = 'RegistryError';
    this.addon = addon;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function directoryExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function manifestToRegistryEntry(
  manifest: AddonManifest,
  addonPath: string
): RegistryEntry {
  return {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    keywords: manifest.keywords ?? [],
    url: addonPath,
    downloads: 0, // Local registry doesn't track downloads
    updatedAt: new Date().toISOString(),
    versions: [manifest.version], // Local only has one version
    repository: manifest.repository,
    license: manifest.license,
  };
}

function matchesQuery(entry: RegistryEntry, query: string): boolean {
  const q = query.toLowerCase();

  // Match name
  if (entry.name.toLowerCase().includes(q)) {
    return true;
  }

  // Match description
  if (entry.description?.toLowerCase().includes(q)) {
    return true;
  }

  // Match keywords
  if (entry.keywords.some(k => k.toLowerCase().includes(q))) {
    return true;
  }

  // Match author
  if (entry.author?.toLowerCase().includes(q)) {
    return true;
  }

  return false;
}

// =============================================================================
// Local Registry Implementation
// =============================================================================

class LocalAddonRegistry implements AddonRegistry {
  private addonsDir: string;
  private cache: Map<string, RegistryEntry> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(addonsDir: string) {
    this.addonsDir = addonsDir;
  }

  private async refreshCache(): Promise<void> {
    if (Date.now() < this.cacheExpiry) {
      return;
    }

    this.cache.clear();

    if (!(await directoryExists(this.addonsDir))) {
      this.cacheExpiry = Date.now() + this.CACHE_TTL;
      return;
    }

    try {
      const entries = await readdir(this.addonsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const addonPath = join(this.addonsDir, entry.name);
        const manifestPath = join(addonPath, 'addon.toml');

        if (!(await directoryExists(manifestPath))) {
          continue;
        }

        try {
          const manifest = await loadAddonManifest(addonPath);
          const registryEntry = manifestToRegistryEntry(manifest, addonPath);
          this.cache.set(manifest.name, registryEntry);
        } catch {
          // Skip invalid manifests
          continue;
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    this.cacheExpiry = Date.now() + this.CACHE_TTL;
  }

  async search(query: string, limit = 20): Promise<RegistrySearchResult> {
    await this.refreshCache();

    const allEntries = Array.from(this.cache.values());

    // If no query, return all
    const filtered = query
      ? allEntries.filter(entry => matchesQuery(entry, query))
      : allEntries;

    // Sort by relevance (name match first, then downloads)
    const sorted = filtered.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().startsWith(query.toLowerCase());
      const bNameMatch = b.name.toLowerCase().startsWith(query.toLowerCase());

      if (aNameMatch && !bNameMatch) return -1;
      if (bNameMatch && !aNameMatch) return 1;

      return b.downloads - a.downloads;
    });

    const results = sorted.slice(0, limit);

    return {
      total: filtered.length,
      page: 1,
      perPage: limit,
      results,
    };
  }

  async get(name: string): Promise<RegistryEntry | null> {
    await this.refreshCache();
    return this.cache.get(name) ?? null;
  }

  async getVersions(name: string): Promise<string[]> {
    const entry = await this.get(name);
    if (!entry) {
      return [];
    }
    // Local registry only has one version per addon
    return entry.versions;
  }

  async download(name: string, _version?: string): Promise<Uint8Array> {
    const entry = await this.get(name);
    if (!entry) {
      throw new RegistryError(`Addon ${name} not found in registry`, name);
    }

    // For local registry, return the manifest file contents as a simple indicator
    // In a real implementation, this would return a tarball
    const manifestPath = join(entry.url, 'addon.toml');

    try {
      const content = await readFile(manifestPath);
      return new Uint8Array(content);
    } catch (err) {
      throw new RegistryError(
        `Failed to read addon ${name}`,
        name,
        err
      );
    }
  }

  /**
   * Invalidate cache to force refresh on next operation
   */
  invalidateCache(): void {
    this.cacheExpiry = 0;
    this.cache.clear();
  }
}

// =============================================================================
// Composite Registry (for future remote registry support)
// =============================================================================

class CompositeAddonRegistry implements AddonRegistry {
  private registries: AddonRegistry[];

  constructor(registries: AddonRegistry[]) {
    this.registries = registries;
  }

  async search(query: string, limit = 20): Promise<RegistrySearchResult> {
    // Search all registries and merge results
    const allResults: RegistryEntry[] = [];

    for (const registry of this.registries) {
      try {
        const result = await registry.search(query, limit);
        allResults.push(...result.results);
      } catch {
        // Continue with other registries on error
      }
    }

    // Deduplicate by name (prefer first occurrence)
    const seen = new Set<string>();
    const deduplicated = allResults.filter(entry => {
      if (seen.has(entry.name)) {
        return false;
      }
      seen.add(entry.name);
      return true;
    });

    const results = deduplicated.slice(0, limit);

    return {
      total: deduplicated.length,
      page: 1,
      perPage: limit,
      results,
    };
  }

  async get(name: string): Promise<RegistryEntry | null> {
    for (const registry of this.registries) {
      try {
        const entry = await registry.get(name);
        if (entry) {
          return entry;
        }
      } catch {
        // Continue with other registries on error
      }
    }
    return null;
  }

  async getVersions(name: string): Promise<string[]> {
    const allVersions: string[] = [];

    for (const registry of this.registries) {
      try {
        const versions = await registry.getVersions(name);
        allVersions.push(...versions);
      } catch {
        // Continue with other registries on error
      }
    }

    // Deduplicate and sort
    const unique = [...new Set(allVersions)];
    return unique.sort((a, b) => {
      // Simple version comparison (for proper semver, use semver package)
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);

      for (let i = 0; i < 3; i++) {
        const aVal = aParts[i] ?? 0;
        const bVal = bParts[i] ?? 0;
        if (aVal !== bVal) {
          return bVal - aVal; // Descending (latest first)
        }
      }
      return 0;
    });
  }

  async download(name: string, version?: string): Promise<Uint8Array> {
    for (const registry of this.registries) {
      try {
        return await registry.download(name, version);
      } catch {
        // Continue with other registries on error
      }
    }
    throw new RegistryError(`Addon ${name} not found in any registry`, name);
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an addon registry client
 * By default, uses the bundled addons directory
 */
export function createAddonRegistry(addonsDir?: string): AddonRegistry {
  // Default to bundled addons directory
  const defaultAddonsDir = join(
    dirname(dirname(dirname(dirname(__dirname)))),
    'addons'
  );

  return new LocalAddonRegistry(addonsDir ?? defaultAddonsDir);
}

/**
 * Create a composite registry from multiple sources
 */
export function createCompositeRegistry(
  registries: AddonRegistry[]
): AddonRegistry {
  return new CompositeAddonRegistry(registries);
}

/**
 * Create a local registry for testing or custom addon directories
 */
export function createLocalRegistry(addonsDir: string): LocalAddonRegistry {
  return new LocalAddonRegistry(addonsDir);
}
