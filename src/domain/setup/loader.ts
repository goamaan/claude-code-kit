/**
 * Setup loader
 * Loads setups from directories, archives, URLs, and builtins
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import * as tar from 'tar';
import type { LoadedSetup, SetupManifest } from '@/types';
import {
  loadSetupManifest,
  getManifestFilename,
  SetupParseError,
} from './manifest-parser.js';

// =============================================================================
// Constants
// =============================================================================

const CLAUDE_MD_FILENAME = 'CLAUDE.md';
const BUILTIN_SETUPS_DIR = 'setups';

// =============================================================================
// Error Types
// =============================================================================

export class SetupLoadError extends Error {
  public readonly source: string;
  public readonly originalCause?: unknown;

  constructor(
    message: string,
    source: string,
    originalCause?: unknown,
  ) {
    super(message);
    this.name = 'SetupLoadError';
    this.source = source;
    this.originalCause = originalCause;
  }
}

// =============================================================================
// Setup Loader Interface
// =============================================================================

export interface SetupLoader {
  /**
   * Load a setup from a directory
   * @param dir - Path to the setup directory containing manifest.toml
   */
  loadFromDir(dir: string): Promise<LoadedSetup>;

  /**
   * Load a setup from a .tar.gz archive
   * @param archivePath - Path to the archive file
   */
  loadFromArchive(archivePath: string): Promise<LoadedSetup>;

  /**
   * Load a setup from a URL (downloads and extracts)
   * @param url - URL to the setup archive or directory
   */
  loadFromUrl(url: string): Promise<LoadedSetup>;

  /**
   * Load a builtin setup by name
   * @param name - Name of the builtin setup (e.g., 'minimal', 'fullstack')
   */
  loadBuiltin(name: string): Promise<LoadedSetup>;
}

// =============================================================================
// Implementation
// =============================================================================

interface SetupLoaderOptions {
  /** Base directory for builtin setups */
  builtinDir?: string;

  /** Cache directory for downloaded setups */
  cacheDir?: string;

  /** HTTP fetch function (for testing) */
  fetch?: typeof globalThis.fetch;
}

class SetupLoaderImpl implements SetupLoader {
  private readonly builtinDir: string;
  private readonly cacheDir: string;
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(options: SetupLoaderOptions = {}) {
    // Default to package's setups directory
    this.builtinDir = options.builtinDir ?? path.join(__dirname, '..', '..', '..', BUILTIN_SETUPS_DIR);
    this.cacheDir = options.cacheDir ?? path.join(os.homedir(), '.claudeops', 'cache', 'setups');
    this.fetchFn = options.fetch ?? globalThis.fetch;
  }

  async loadFromDir(dir: string): Promise<LoadedSetup> {
    const absoluteDir = path.resolve(dir);
    const manifestPath = path.join(absoluteDir, getManifestFilename());

    try {
      // Load manifest
      const manifest = await loadSetupManifest(manifestPath);

      // Load CLAUDE.md content if exists
      const content = await this.loadContent(absoluteDir, manifest);

      // Resolve inheritance chain
      const inheritanceChain = await this.resolveInheritanceChain(manifest, absoluteDir);

      return {
        manifest,
        content,
        sourcePath: absoluteDir,
        inheritanceChain,
        isRoot: true,
      };
    } catch (error) {
      if (error instanceof SetupParseError || error instanceof SetupLoadError) {
        throw error;
      }
      throw new SetupLoadError(
        `Failed to load setup from directory: ${absoluteDir}`,
        absoluteDir,
        error,
      );
    }
  }

  async loadFromArchive(archivePath: string): Promise<LoadedSetup> {
    const absolutePath = path.resolve(archivePath);

    try {
      // Create a temporary directory for extraction
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claudeops-setup-'));

      try {
        // Extract the archive
        await this.extractArchive(absolutePath, tempDir);

        // Find the setup directory (may be nested)
        const setupDir = await this.findSetupDir(tempDir);

        // Load from the extracted directory
        const loaded = await this.loadFromDir(setupDir);

        return {
          ...loaded,
          sourcePath: absolutePath,
        };
      } finally {
        // Clean up temp directory
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {
          // Ignore cleanup errors
        });
      }
    } catch (error) {
      if (error instanceof SetupLoadError) {
        throw error;
      }
      throw new SetupLoadError(
        `Failed to load setup from archive: ${absolutePath}`,
        absolutePath,
        error,
      );
    }
  }

  async loadFromUrl(url: string): Promise<LoadedSetup> {
    try {
      // Generate cache key from URL
      const cacheKey = this.getCacheKey(url);
      const cachedPath = path.join(this.cacheDir, cacheKey);

      // Check if cached
      if (await this.isCached(cachedPath)) {
        return this.loadFromDir(cachedPath);
      }

      // Download the archive
      const response = await this.fetchFn(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Create cache directory
      await fs.mkdir(this.cacheDir, { recursive: true });

      // Save to temporary file
      const tempFile = path.join(this.cacheDir, `${cacheKey}.tar.gz`);
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(tempFile, buffer);

      try {
        // Extract to cache directory
        await fs.mkdir(cachedPath, { recursive: true });
        await this.extractArchive(tempFile, cachedPath);

        // Find and load setup
        const setupDir = await this.findSetupDir(cachedPath);

        // If nested, move to cache root
        if (setupDir !== cachedPath) {
          const entries = await fs.readdir(setupDir);
          for (const entry of entries) {
            await fs.rename(path.join(setupDir, entry), path.join(cachedPath, entry));
          }
        }

        return this.loadFromDir(cachedPath);
      } finally {
        // Clean up temp archive
        await fs.rm(tempFile, { force: true }).catch(() => {});
      }
    } catch (error) {
      if (error instanceof SetupLoadError) {
        throw error;
      }
      throw new SetupLoadError(
        `Failed to load setup from URL: ${url}`,
        url,
        error,
      );
    }
  }

  async loadBuiltin(name: string): Promise<LoadedSetup> {
    const setupDir = path.join(this.builtinDir, name);

    try {
      // Check if builtin exists
      await fs.access(setupDir);
      return this.loadFromDir(setupDir);
    } catch (error) {
      if (error instanceof SetupLoadError) {
        throw error;
      }
      throw new SetupLoadError(
        `Builtin setup not found: ${name}`,
        name,
        error,
      );
    }
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Load CLAUDE.md content, merging with inline content if present
   */
  private async loadContent(dir: string, manifest: SetupManifest): Promise<string> {
    const claudeMdPath = path.join(dir, CLAUDE_MD_FILENAME);
    let fileContent = '';

    try {
      fileContent = await fs.readFile(claudeMdPath, 'utf-8');
    } catch {
      // CLAUDE.md is optional
    }

    // Merge with inline content from manifest
    const parts: string[] = [];
    if (fileContent) {
      parts.push(fileContent.trim());
    }
    if (manifest.content) {
      parts.push(manifest.content.trim());
    }

    return parts.join('\n\n');
  }

  /**
   * Resolve the inheritance chain for a setup
   */
  private async resolveInheritanceChain(
    manifest: SetupManifest,
    baseDir: string,
  ): Promise<string[]> {
    const chain: string[] = [manifest.name];
    let current = manifest;
    const visited = new Set<string>([manifest.name]);

    while (current.extends) {
      const parentName = current.extends;

      // Circular dependency check
      if (visited.has(parentName)) {
        throw new SetupLoadError(
          `Circular inheritance detected: ${chain.join(' -> ')} -> ${parentName}`,
          baseDir,
        );
      }

      visited.add(parentName);
      chain.push(parentName);

      // Try to load parent
      try {
        // First try as sibling directory
        const siblingDir = path.join(path.dirname(baseDir), parentName);
        const siblingExists = await fs.access(siblingDir).then(() => true).catch(() => false);

        if (siblingExists) {
          const parentManifest = await loadSetupManifest(
            path.join(siblingDir, getManifestFilename()),
          );
          current = parentManifest;
          continue;
        }

        // Try as builtin
        const builtinDir = path.join(this.builtinDir, parentName);
        const builtinExists = await fs.access(builtinDir).then(() => true).catch(() => false);

        if (builtinExists) {
          const parentManifest = await loadSetupManifest(
            path.join(builtinDir, getManifestFilename()),
          );
          current = parentManifest;
          continue;
        }

        // Parent not found
        throw new SetupLoadError(
          `Parent setup not found: ${parentName}`,
          baseDir,
        );
      } catch (error) {
        if (error instanceof SetupLoadError) {
          throw error;
        }
        throw new SetupLoadError(
          `Failed to resolve parent setup: ${parentName}`,
          baseDir,
          error,
        );
      }
    }

    return chain;
  }

  /**
   * Extract a tar.gz archive to a directory
   */
  private async extractArchive(archivePath: string, destDir: string): Promise<void> {
    const fileHandle = await fs.open(archivePath, 'r');

    try {
      const fileStream = fileHandle.createReadStream();
      const gunzip = createGunzip();

      await pipeline(
        fileStream,
        gunzip,
        tar.extract({
          cwd: destDir,
          strip: 0,
        }),
      );
    } finally {
      await fileHandle.close();
    }
  }

  /**
   * Find the setup directory within an extracted archive
   * (handles archives with nested directories up to 2 levels deep)
   */
  private async findSetupDir(baseDir: string): Promise<string> {
    const manifestFilename = getManifestFilename();

    // Check if manifest exists at root
    const rootManifest = path.join(baseDir, manifestFilename);
    if (await fs.access(rootManifest).then(() => true).catch(() => false)) {
      return baseDir;
    }

    // Check one level deep
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const level1Dir = path.join(baseDir, entry.name);
        const level1Manifest = path.join(level1Dir, manifestFilename);
        if (await fs.access(level1Manifest).then(() => true).catch(() => false)) {
          return level1Dir;
        }

        // Check two levels deep
        try {
          const level2Entries = await fs.readdir(level1Dir, { withFileTypes: true });
          for (const level2Entry of level2Entries) {
            if (level2Entry.isDirectory()) {
              const level2Dir = path.join(level1Dir, level2Entry.name);
              const level2Manifest = path.join(level2Dir, manifestFilename);
              if (await fs.access(level2Manifest).then(() => true).catch(() => false)) {
                return level2Dir;
              }
            }
          }
        } catch {
          // Ignore errors reading subdirectories
        }
      }
    }

    throw new SetupLoadError(
      `No manifest.toml found in archive`,
      baseDir,
    );
  }

  /**
   * Generate a cache key for a URL
   */
  private getCacheKey(url: string): string {
    // Simple hash-like key from URL
    const hash = url
      .split('')
      .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
      .toString(16)
      .replace('-', 'n');

    // Extract name from URL if possible
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const name = pathParts[pathParts.length - 1]?.replace(/\.tar\.gz$/, '') ?? 'setup';

    return `${name}-${hash}`;
  }

  /**
   * Check if a cached setup exists and is valid
   */
  private async isCached(cachePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(cachePath, getManifestFilename()));
      return true;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new SetupLoader instance
 * @param options - Optional configuration
 */
export function createSetupLoader(options?: SetupLoaderOptions): SetupLoader {
  return new SetupLoaderImpl(options);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * List all builtin setups
 */
export async function listBuiltinSetups(builtinDir?: string): Promise<string[]> {
  const dir = builtinDir ?? path.join(__dirname, '..', '..', '..', BUILTIN_SETUPS_DIR);

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const setups: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const manifestPath = path.join(dir, entry.name, getManifestFilename());
        if (await fs.access(manifestPath).then(() => true).catch(() => false)) {
          setups.push(entry.name);
        }
      }
    }

    return setups.sort();
  } catch {
    return [];
  }
}

/**
 * Check if a path is a valid setup directory
 */
export async function isSetupDirectory(dir: string): Promise<boolean> {
  const manifestPath = path.join(dir, getManifestFilename());
  try {
    await fs.access(manifestPath);
    return true;
  } catch {
    return false;
  }
}
