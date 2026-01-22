/**
 * Setup manager
 * High-level API for managing setups
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as tar from 'tar';
import type { SetupMetadata, LoadedSetup, MergedSetup } from '@/types';
import {
  loadSetupManifest,
  extractMetadata,
  getManifestFilename,
} from './manifest-parser.js';
import {
  createSetupLoader,
  listBuiltinSetups,
  type SetupLoader,
  SetupLoadError,
} from './loader.js';
import { mergeSetups, type MergeOptions } from './merger.js';

// =============================================================================
// Constants
// =============================================================================

const USER_SETUPS_DIR = '.claude-code-kit/setups';
const CLAUDE_MD_FILENAME = 'CLAUDE.md';

// =============================================================================
// Error Types
// =============================================================================

export class SetupManagerError extends Error {
  public readonly code: string;
  public readonly originalCause?: unknown;

  constructor(
    message: string,
    code: string,
    originalCause?: unknown,
  ) {
    super(message);
    this.name = 'SetupManagerError';
    this.code = code;
    this.originalCause = originalCause;
  }
}

// =============================================================================
// Setup Manager Interface
// =============================================================================

export interface SetupManager {
  /**
   * List all available setups (builtin + user-installed)
   */
  list(): Promise<SetupMetadata[]>;

  /**
   * Get a loaded setup by name
   * @param name - Setup name (builtin or user-installed)
   */
  get(name: string): Promise<LoadedSetup>;

  /**
   * Apply a setup, optionally extending others
   * @param name - Primary setup name
   * @param extends_ - Optional setups to extend from
   * @param options - Merge options
   */
  apply(name: string, extends_?: string[], options?: MergeOptions): Promise<MergedSetup>;

  /**
   * Create a new user setup
   * @param name - Name for the new setup
   * @param from - Optional setup(s) to base it on
   */
  create(name: string, from?: string[]): Promise<void>;

  /**
   * Export a setup as a tar.gz archive
   * @param name - Setup name to export
   */
  export(name: string): Promise<Uint8Array>;

  /**
   * Import a setup from a file path, URL, or archive buffer
   * @param source - Path, URL, or Uint8Array of archive
   */
  import(source: string | Uint8Array): Promise<void>;

  /**
   * Delete a user setup
   * @param name - Setup name to delete
   */
  delete(name: string): Promise<void>;

  /**
   * Check if a setup exists
   * @param name - Setup name to check
   */
  exists(name: string): Promise<boolean>;
}

// =============================================================================
// Implementation
// =============================================================================

interface SetupManagerOptions {
  /** Directory for user setups */
  userSetupsDir?: string;

  /** Directory for builtin setups */
  builtinDir?: string;

  /** Setup loader instance */
  loader?: SetupLoader;
}

class SetupManagerImpl implements SetupManager {
  private readonly userSetupsDir: string;
  private readonly builtinDir: string;
  private readonly loader: SetupLoader;

  constructor(options: SetupManagerOptions = {}) {
    this.userSetupsDir = options.userSetupsDir ??
      path.join(os.homedir(), USER_SETUPS_DIR);
    this.builtinDir = options.builtinDir ??
      path.join(__dirname, '..', '..', '..', 'setups');
    this.loader = options.loader ?? createSetupLoader({
      builtinDir: this.builtinDir,
    });
  }

  async list(): Promise<SetupMetadata[]> {
    const results: SetupMetadata[] = [];

    // List builtin setups
    const builtinNames = await listBuiltinSetups(this.builtinDir);
    for (const name of builtinNames) {
      try {
        const setupDir = path.join(this.builtinDir, name);
        const manifest = await loadSetupManifest(
          path.join(setupDir, getManifestFilename()),
        );
        results.push({
          ...extractMetadata(manifest),
          // @ts-expect-error - adding extra field for listing
          source: 'builtin',
        });
      } catch {
        // Skip invalid setups
      }
    }

    // List user setups
    try {
      const entries = await fs.readdir(this.userSetupsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          try {
            const setupDir = path.join(this.userSetupsDir, entry.name);
            const manifest = await loadSetupManifest(
              path.join(setupDir, getManifestFilename()),
            );
            results.push({
              ...extractMetadata(manifest),
              // @ts-expect-error - adding extra field for listing
              source: 'user',
            });
          } catch {
            // Skip invalid setups
          }
        }
      }
    } catch {
      // User setups dir may not exist yet
    }

    // Sort by name
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  async get(name: string): Promise<LoadedSetup> {
    // Try user setups first
    const userSetupDir = path.join(this.userSetupsDir, name);
    try {
      await fs.access(userSetupDir);
      return this.loader.loadFromDir(userSetupDir);
    } catch {
      // Not a user setup
    }

    // Try builtin
    try {
      return await this.loader.loadBuiltin(name);
    } catch (error) {
      if (error instanceof SetupLoadError) {
        throw new SetupManagerError(
          `Setup not found: ${name}`,
          'SETUP_NOT_FOUND',
          error,
        );
      }
      throw error;
    }
  }

  async apply(
    name: string,
    extends_: string[] = [],
    options?: MergeOptions,
  ): Promise<MergedSetup> {
    const setupsToMerge: LoadedSetup[] = [];

    // Load base setups (in order, these are extended)
    for (const extendName of extends_) {
      const setup = await this.get(extendName);
      setupsToMerge.push(setup);
    }

    // Load the primary setup last (it takes precedence)
    const primarySetup = await this.get(name);
    setupsToMerge.push(primarySetup);

    // Merge all setups
    return mergeSetups(setupsToMerge, options);
  }

  async create(name: string, from?: string[]): Promise<void> {
    // Validate name
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      throw new SetupManagerError(
        'Setup name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens',
        'INVALID_NAME',
      );
    }

    // Check if already exists
    const setupDir = path.join(this.userSetupsDir, name);
    try {
      await fs.access(setupDir);
      throw new SetupManagerError(
        `Setup already exists: ${name}`,
        'SETUP_EXISTS',
      );
    } catch (error) {
      if (error instanceof SetupManagerError) {
        throw error;
      }
      // Directory doesn't exist, good to proceed
    }

    // Create setup directory
    await fs.mkdir(setupDir, { recursive: true });

    try {
      if (from && from.length > 0) {
        // Create from existing setup(s)
        const merged = await this.apply(from[0] ?? 'minimal', from.slice(1));

        // Write manifest
        const manifestContent = generateManifestToml(name, '1.0.0', merged);
        await fs.writeFile(
          path.join(setupDir, getManifestFilename()),
          manifestContent,
        );

        // Write CLAUDE.md
        await fs.writeFile(
          path.join(setupDir, CLAUDE_MD_FILENAME),
          merged.content || `# ${name}\n\nCustom setup created from: ${from.join(', ')}\n`,
        );
      } else {
        // Create minimal setup
        const manifestContent = generateManifestToml(name, '1.0.0');
        await fs.writeFile(
          path.join(setupDir, getManifestFilename()),
          manifestContent,
        );

        await fs.writeFile(
          path.join(setupDir, CLAUDE_MD_FILENAME),
          `# ${name}\n\nCustom setup.\n`,
        );
      }
    } catch (error) {
      // Clean up on failure
      await fs.rm(setupDir, { recursive: true, force: true }).catch(() => {});
      throw new SetupManagerError(
        `Failed to create setup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CREATE_FAILED',
        error,
      );
    }
  }

  async export(name: string): Promise<Uint8Array> {
    // Get setup directory
    let setupDir: string;

    // Try user setups first
    const userSetupDir = path.join(this.userSetupsDir, name);
    try {
      await fs.access(userSetupDir);
      setupDir = userSetupDir;
    } catch {
      // Try builtin
      const builtinSetupDir = path.join(this.builtinDir, name);
      try {
        await fs.access(builtinSetupDir);
        setupDir = builtinSetupDir;
      } catch {
        throw new SetupManagerError(
          `Setup not found: ${name}`,
          'SETUP_NOT_FOUND',
        );
      }
    }

    // Create tar.gz archive by writing to temp file then reading
    const tempFile = path.join(os.tmpdir(), `${name}-${Date.now()}.tar.gz`);

    await tar.create(
      {
        gzip: true,
        file: tempFile,
        cwd: path.dirname(setupDir),
        portable: true,
      },
      [path.basename(setupDir)],
    );

    const buffer = await fs.readFile(tempFile);
    await fs.rm(tempFile, { force: true }).catch(() => {});

    return new Uint8Array(buffer);
  }

  async import(source: string | Uint8Array): Promise<void> {
    let setupDir: string;
    let manifest: Awaited<ReturnType<typeof loadSetupManifest>>;
    let tempDir: string | undefined;

    try {
      if (typeof source === 'string') {
        if (source.startsWith('http://') || source.startsWith('https://')) {
          // Load from URL
          const loaded = await this.loader.loadFromUrl(source);
          manifest = loaded.manifest;
          setupDir = loaded.sourcePath;
        } else {
          // Load from path (directory or archive)
          const stats = await fs.stat(source);
          if (stats.isDirectory()) {
            const loaded = await this.loader.loadFromDir(source);
            manifest = loaded.manifest;
            setupDir = source;
          } else {
            const loaded = await this.loader.loadFromArchive(source);
            manifest = loaded.manifest;
            setupDir = loaded.sourcePath;
          }
        }
      } else {
        // Load from buffer (archive)
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-code-kit-import-'));
        const tempArchive = path.join(tempDir, 'import.tar.gz');
        await fs.writeFile(tempArchive, source);
        const loaded = await this.loader.loadFromArchive(tempArchive);
        manifest = loaded.manifest;
        setupDir = loaded.sourcePath;
      }

      // Check if already exists
      const targetDir = path.join(this.userSetupsDir, manifest.name);
      try {
        await fs.access(targetDir);
        throw new SetupManagerError(
          `Setup already exists: ${manifest.name}`,
          'SETUP_EXISTS',
        );
      } catch (error) {
        if (error instanceof SetupManagerError) {
          throw error;
        }
        // Doesn't exist, good
      }

      // Copy to user setups directory
      await fs.mkdir(this.userSetupsDir, { recursive: true });
      await copyDir(setupDir, targetDir);
    } finally {
      // Clean up temp directory
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  async delete(name: string): Promise<void> {
    const setupDir = path.join(this.userSetupsDir, name);

    try {
      await fs.access(setupDir);
    } catch {
      throw new SetupManagerError(
        `User setup not found: ${name}`,
        'SETUP_NOT_FOUND',
      );
    }

    // Check if it's actually within our user setups dir (not trying to delete builtin via symlink etc)
    const realPath = await fs.realpath(setupDir);
    const resolvedUserSetupsDir = await fs.realpath(this.userSetupsDir).catch(() => this.userSetupsDir);
    if (!realPath.startsWith(resolvedUserSetupsDir)) {
      throw new SetupManagerError(
        `Cannot delete non-user setup: ${name}`,
        'CANNOT_DELETE_BUILTIN',
      );
    }

    await fs.rm(setupDir, { recursive: true, force: true });
  }

  async exists(name: string): Promise<boolean> {
    // Check user setups
    const userSetupDir = path.join(this.userSetupsDir, name);
    try {
      await fs.access(userSetupDir);
      return true;
    } catch {
      // Not in user setups
    }

    // Check builtin
    const builtinSetupDir = path.join(this.builtinDir, name);
    try {
      await fs.access(builtinSetupDir);
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
 * Create a new SetupManager instance
 * @param options - Optional configuration
 */
export function createSetupManager(options?: SetupManagerOptions): SetupManager {
  return new SetupManagerImpl(options);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a manifest.toml content string
 */
function generateManifestToml(
  name: string,
  version: string,
  merged?: MergedSetup,
): string {
  const lines: string[] = [
    '[setup]',
    `name = "${name}"`,
    `version = "${version}"`,
  ];

  if (merged?.description) {
    lines.push(`description = "${merged.description}"`);
  }

  lines.push('author = ""');

  if (merged) {
    // Skills
    if (merged.skills.enabled.length > 0 || merged.skills.disabled.length > 0) {
      lines.push('');
      lines.push('[skills]');
      if (merged.skills.enabled.length > 0) {
        lines.push(`enabled = [${merged.skills.enabled.map(s => `"${s}"`).join(', ')}]`);
      }
      if (merged.skills.disabled.length > 0) {
        lines.push(`disabled = [${merged.skills.disabled.map(s => `"${s}"`).join(', ')}]`);
      }
    }

    // Hooks
    if (merged.hooks.templates.length > 0) {
      lines.push('');
      lines.push('[hooks]');
      lines.push('templates = [');
      for (const hook of merged.hooks.templates) {
        lines.push(`  { name = "${hook.name}", matcher = "${hook.matcher}", handler = "${hook.handler}"${hook.priority ? `, priority = ${hook.priority}` : ''} },`);
      }
      lines.push(']');
    }
  } else {
    lines.push('');
    lines.push('[skills]');
    lines.push('enabled = []');
    lines.push('');
    lines.push('[hooks]');
    lines.push('templates = []');
  }

  return lines.join('\n') + '\n';
}

/**
 * Recursively copy a directory
 */
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
