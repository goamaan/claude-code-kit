/**
 * Addon Installer - Install addons from various sources
 * Supports local paths, GitHub repos, and registry packages
 */

/// <reference types="node" />

import { mkdir, cp, rm, writeFile, readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import type { AddonManifest, InstalledAddon } from '@/types/index.js';
import {
  loadAddonManifest,
  checkCompatibility,
  ManifestParseError,
  ManifestValidationError,
} from './manifest-parser.js';
import { VERSION } from '@/index.js';

// =============================================================================
// Constants
// =============================================================================

const ADDONS_DIR = join(homedir(), '.claude-kit', 'addons');
const STATE_FILE = join(homedir(), '.claude-kit', 'addons.json');

// =============================================================================
// Error Types
// =============================================================================

export class AddonInstallError extends Error {
  public readonly addon?: string;

  constructor(
    message: string,
    addon?: string,
    cause?: unknown
  ) {
    super(message, { cause });
    this.name = 'AddonInstallError';
    this.addon = addon;
  }
}

// =============================================================================
// Types
// =============================================================================

export interface AddonInstaller {
  /**
   * Install addon from local filesystem path
   */
  installFromPath(path: string): Promise<InstalledAddon>;

  /**
   * Install addon from GitHub repository
   * Format: owner/repo or owner/repo@ref
   */
  installFromGitHub(repo: string): Promise<InstalledAddon>;

  /**
   * Install addon from registry
   * @param name Addon name
   * @param version Optional specific version (default: latest)
   */
  installFromRegistry(name: string, version?: string): Promise<InstalledAddon>;

  /**
   * Uninstall an addon by name
   */
  uninstall(name: string): Promise<void>;

  /**
   * Run post-install script for an addon
   */
  runPostInstall(addon: InstalledAddon): Promise<void>;
}

interface AddonsState {
  version: string;
  addons: Record<string, {
    manifest: AddonManifest;
    path: string;
    installedAt: string;
    updatedAt: string;
    enabled: boolean;
    config: Record<string, unknown>;
    source: {
      type: 'registry' | 'git' | 'local';
      url?: string;
      ref?: string;
    };
  }>;
}

// =============================================================================
// Helper Functions
// =============================================================================

async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw err;
    }
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadState(): Promise<AddonsState> {
  try {
    const content = await readFile(STATE_FILE, 'utf-8');
    return JSON.parse(content) as AddonsState;
  } catch {
    return { version: '1', addons: {} };
  }
}

async function saveState(state: AddonsState): Promise<void> {
  await ensureDir(dirname(STATE_FILE));
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

function execCommand(command: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code ?? 0 });
    });

    proc.on('error', (err) => {
      resolve({ stdout, stderr: err.message, code: 1 });
    });
  });
}

// =============================================================================
// Installer Implementation
// =============================================================================

class AddonInstallerImpl implements AddonInstaller {
  async installFromPath(sourcePath: string): Promise<InstalledAddon> {
    // Load and validate manifest
    let manifest: AddonManifest;
    try {
      manifest = await loadAddonManifest(sourcePath);
    } catch (err) {
      if (err instanceof ManifestParseError || err instanceof ManifestValidationError) {
        throw new AddonInstallError(
          `Invalid addon manifest: ${err.message}`,
          undefined,
          err
        );
      }
      throw new AddonInstallError(
        `Failed to load addon manifest from ${sourcePath}`,
        undefined,
        err
      );
    }

    // Check compatibility
    const compat = checkCompatibility(manifest, VERSION);
    if (!compat.compatible) {
      throw new AddonInstallError(
        `Addon ${manifest.name} is not compatible: ${compat.reason}`,
        manifest.name
      );
    }

    // Determine installation directory
    const installDir = join(ADDONS_DIR, manifest.name);

    // Check if already installed
    const state = await loadState();
    const existing = state.addons[manifest.name];
    if (existing) {
      // Remove existing installation
      await rm(installDir, { recursive: true, force: true });
    }

    // Copy addon files to installation directory
    await ensureDir(ADDONS_DIR);
    await cp(sourcePath, installDir, { recursive: true });

    // Create installed addon record
    const now = new Date();
    const installed: InstalledAddon = {
      manifest,
      path: installDir,
      installedAt: now,
      updatedAt: now,
      enabled: true,
      config: {},
      source: {
        type: 'local',
        url: sourcePath,
      },
    };

    // Update state
    state.addons[manifest.name] = {
      manifest: installed.manifest,
      path: installed.path,
      installedAt: installed.installedAt.toISOString(),
      updatedAt: installed.updatedAt.toISOString(),
      enabled: installed.enabled,
      config: installed.config,
      source: installed.source,
    };
    await saveState(state);

    // Run post-install if specified
    await this.runPostInstall(installed);

    return installed;
  }

  async installFromGitHub(repo: string): Promise<InstalledAddon> {
    // Parse repo format: owner/repo or owner/repo@ref
    const [repoPath, ref = 'main'] = repo.split('@');
    if (!repoPath || !repoPath.includes('/')) {
      throw new AddonInstallError(
        `Invalid GitHub repo format: ${repo}. Expected: owner/repo or owner/repo@ref`
      );
    }

    const [owner, repoName] = repoPath.split('/');
    if (!owner || !repoName) {
      throw new AddonInstallError(
        `Invalid GitHub repo format: ${repo}. Expected: owner/repo`
      );
    }

    // Create temp directory for clone
    const tempDir = join(tmpdir(), `claude-kit-addon-${randomUUID()}`);
    await ensureDir(tempDir);

    try {
      // Clone repository
      const gitUrl = `https://github.com/${owner}/${repoName}.git`;
      const cloneResult = await execCommand(
        'git',
        ['clone', '--depth', '1', '--branch', ref, gitUrl, tempDir],
        tempDir
      );

      if (cloneResult.code !== 0) {
        throw new AddonInstallError(
          `Failed to clone GitHub repo ${repo}: ${cloneResult.stderr}`,
          undefined
        );
      }

      // Install from cloned path
      const installed = await this.installFromPath(tempDir);

      // Update source info
      const state = await loadState();
      const addonState = state.addons[installed.manifest.name];
      if (addonState) {
        addonState.source = {
          type: 'git',
          url: gitUrl,
          ref,
        };
        await saveState(state);
      }

      installed.source = {
        type: 'git',
        url: gitUrl,
        ref,
      };

      return installed;
    } finally {
      // Cleanup temp directory
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  async installFromRegistry(name: string, version?: string): Promise<InstalledAddon> {
    // For now, registry installation looks in the bundled addons directory
    // In the future, this would fetch from a remote registry
    const bundledAddonsDir = join(dirname(dirname(dirname(dirname(__dirname)))), 'addons');
    const addonDir = join(bundledAddonsDir, name);

    if (!(await fileExists(addonDir))) {
      throw new AddonInstallError(
        `Addon ${name} not found in registry`,
        name
      );
    }

    const installed = await this.installFromPath(addonDir);

    // Verify version if specified
    if (version && installed.manifest.version !== version) {
      // For local registry, we can't specify version
      // In future, this would fetch specific version from remote registry
      console.warn(
        `Requested version ${version} but installed ${installed.manifest.version}`
      );
    }

    // Update source info
    const state = await loadState();
    const addonState = state.addons[installed.manifest.name];
    if (addonState) {
      addonState.source = {
        type: 'registry',
        url: name,
        ref: version,
      };
      await saveState(state);
    }

    installed.source = {
      type: 'registry',
      url: name,
      ref: version,
    };

    return installed;
  }

  async uninstall(name: string): Promise<void> {
    const state = await loadState();
    const addon = state.addons[name];

    if (!addon) {
      throw new AddonInstallError(
        `Addon ${name} is not installed`,
        name
      );
    }

    // Remove addon directory
    const installDir = join(ADDONS_DIR, name);
    await rm(installDir, { recursive: true, force: true });

    // Update state
    delete state.addons[name];
    await saveState(state);
  }

  async runPostInstall(addon: InstalledAddon): Promise<void> {
    const postinstall = addon.manifest.install?.postinstall;
    if (!postinstall) {
      return;
    }

    const runtime = addon.manifest.install?.runtime ?? 'node';
    const scriptPath = join(addon.path, postinstall);

    // Check if script exists
    if (!(await fileExists(scriptPath))) {
      throw new AddonInstallError(
        `Post-install script not found: ${postinstall}`,
        addon.manifest.name
      );
    }

    // Determine command based on runtime
    let command: string;
    let args: string[];

    switch (runtime) {
      case 'bun':
        command = 'bun';
        args = ['run', scriptPath];
        break;
      case 'deno':
        command = 'deno';
        args = ['run', '--allow-all', scriptPath];
        break;
      case 'node':
      default:
        command = 'node';
        args = [scriptPath];
        break;
    }

    const result = await execCommand(command, args, addon.path);

    if (result.code !== 0) {
      throw new AddonInstallError(
        `Post-install script failed: ${result.stderr || result.stdout}`,
        addon.manifest.name
      );
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an addon installer instance
 */
export function createAddonInstaller(): AddonInstaller {
  return new AddonInstallerImpl();
}

/**
 * Get the addons installation directory
 */
export function getAddonsDir(): string {
  return ADDONS_DIR;
}

/**
 * Get the addons state file path
 */
export function getStateFilePath(): string {
  return STATE_FILE;
}
