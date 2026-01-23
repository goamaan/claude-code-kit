/**
 * Addon Manager - High-level addon management interface
 * Combines installer, registry, and lifecycle management
 */

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { InstalledAddon } from '@/types/index.js';
import {
  createAddonInstaller,
  getStateFilePath,
  AddonInstallError,
  type AddonInstaller,
} from './installer.js';
import {
  createAddonRegistry,
  type AddonRegistry,
} from './registry.js';

// =============================================================================
// Types
// =============================================================================

export type AddonInstallSource =
  | { type: 'path'; path: string }
  | { type: 'github'; repo: string }
  | { type: 'registry'; name: string; version?: string };

export interface AddonManager {
  /**
   * List all installed addons
   */
  list(): Promise<InstalledAddon[]>;

  /**
   * Get a specific installed addon by name
   */
  get(name: string): Promise<InstalledAddon | null>;

  /**
   * Install an addon from various sources
   */
  install(source: AddonInstallSource): Promise<void>;

  /**
   * Update a specific addon to latest version
   */
  update(name: string): Promise<void>;

  /**
   * Update all installed addons
   */
  updateAll(): Promise<void>;

  /**
   * Remove an installed addon
   */
  remove(name: string): Promise<void>;

  /**
   * Create a new addon scaffold
   * @returns Path to the created addon directory
   */
  create(name: string): Promise<string>;

  /**
   * Enable an installed addon
   */
  enable(name: string): Promise<void>;

  /**
   * Disable an installed addon
   */
  disable(name: string): Promise<void>;

  /**
   * Check if an addon is installed
   */
  isInstalled(name: string): Promise<boolean>;

  /**
   * Get the addon registry client
   */
  getRegistry(): AddonRegistry;
}

// =============================================================================
// Error Types
// =============================================================================

export class AddonManagerError extends Error {
  public readonly addon?: string;

  constructor(
    message: string,
    addon?: string,
    cause?: unknown
  ) {
    super(message, { cause });
    this.name = 'AddonManagerError';
    this.addon = addon;
  }
}

// =============================================================================
// State Types
// =============================================================================

interface AddonsState {
  version: string;
  addons: Record<string, {
    manifest: {
      name: string;
      version: string;
      description?: string;
      author?: string;
      [key: string]: unknown;
    };
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

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

async function loadState(): Promise<AddonsState> {
  const stateFile = getStateFilePath();
  try {
    const content = await readFile(stateFile, 'utf-8');
    return JSON.parse(content) as AddonsState;
  } catch {
    return { version: '1', addons: {} };
  }
}

async function saveState(state: AddonsState): Promise<void> {
  const stateFile = getStateFilePath();
  await ensureDir(dirname(stateFile));
  await writeFile(stateFile, JSON.stringify(state, null, 2));
}

// =============================================================================
// Manager Implementation
// =============================================================================

class AddonManagerImpl implements AddonManager {
  private installer: AddonInstaller;
  private registry: AddonRegistry;

  constructor() {
    this.installer = createAddonInstaller();
    this.registry = createAddonRegistry();
  }

  async list(): Promise<InstalledAddon[]> {
    const state = await loadState();
    const addons: InstalledAddon[] = [];

    for (const [, addonState] of Object.entries(state.addons)) {
      addons.push({
        manifest: addonState.manifest as InstalledAddon['manifest'],
        path: addonState.path,
        installedAt: new Date(addonState.installedAt),
        updatedAt: new Date(addonState.updatedAt),
        enabled: addonState.enabled,
        config: addonState.config,
        source: addonState.source,
      });
    }

    return addons.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
  }

  async get(name: string): Promise<InstalledAddon | null> {
    const state = await loadState();
    const addonState = state.addons[name];

    if (!addonState) {
      return null;
    }

    return {
      manifest: addonState.manifest as InstalledAddon['manifest'],
      path: addonState.path,
      installedAt: new Date(addonState.installedAt),
      updatedAt: new Date(addonState.updatedAt),
      enabled: addonState.enabled,
      config: addonState.config,
      source: addonState.source,
    };
  }

  async install(source: AddonInstallSource): Promise<void> {
    try {
      switch (source.type) {
        case 'path':
          await this.installer.installFromPath(source.path);
          break;
        case 'github':
          await this.installer.installFromGitHub(source.repo);
          break;
        case 'registry':
          await this.installer.installFromRegistry(source.name, source.version);
          break;
      }
    } catch (err) {
      if (err instanceof AddonInstallError) {
        throw new AddonManagerError(err.message, err.addon, err);
      }
      throw new AddonManagerError(
        `Failed to install addon: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        err
      );
    }
  }

  async update(name: string): Promise<void> {
    const installed = await this.get(name);
    if (!installed) {
      throw new AddonManagerError(`Addon ${name} is not installed`, name);
    }

    const { source } = installed;

    switch (source.type) {
      case 'git': {
        if (!source.url) {
          throw new AddonManagerError(
            `Cannot update addon ${name}: missing source URL`,
            name
          );
        }
        // Re-install from git to get latest
        const ref = source.ref ?? 'main';
        const repoMatch = source.url.match(/github\.com\/([^/]+\/[^/.]+)/);
        if (!repoMatch?.[1]) {
          throw new AddonManagerError(
            `Cannot update addon ${name}: invalid GitHub URL`,
            name
          );
        }
        await this.installer.installFromGitHub(`${repoMatch[1]}@${ref}`);
        break;
      }

      case 'registry':
        // Re-install from registry to get latest
        await this.installer.installFromRegistry(name);
        break;

      case 'local':
        // Cannot update local addons automatically
        throw new AddonManagerError(
          `Addon ${name} was installed from local path and cannot be auto-updated. Re-install manually.`,
          name
        );
    }
  }

  async updateAll(): Promise<void> {
    const installed = await this.list();
    const errors: Array<{ name: string; error: string }> = [];

    for (const addon of installed) {
      try {
        await this.update(addon.manifest.name);
      } catch (err) {
        errors.push({
          name: addon.manifest.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (errors.length > 0) {
      throw new AddonManagerError(
        `Failed to update some addons: ${errors.map(e => `${e.name}: ${e.error}`).join('; ')}`
      );
    }
  }

  async remove(name: string): Promise<void> {
    try {
      await this.installer.uninstall(name);
    } catch (err) {
      if (err instanceof AddonInstallError) {
        throw new AddonManagerError(err.message, name, err);
      }
      throw new AddonManagerError(
        `Failed to remove addon ${name}: ${err instanceof Error ? err.message : String(err)}`,
        name,
        err
      );
    }
  }

  async create(name: string): Promise<string> {
    // Validate name
    const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
    if (!NAME_PATTERN.test(name)) {
      throw new AddonManagerError(
        `Invalid addon name: ${name}. Must be lowercase, start with a letter, and contain only letters, numbers, and hyphens.`,
        name
      );
    }

    // Create in current directory
    const addonDir = join(process.cwd(), name);

    if (await fileExists(addonDir)) {
      throw new AddonManagerError(
        `Directory ${name} already exists`,
        name
      );
    }

    // Create directory structure
    await ensureDir(addonDir);

    // Create addon.toml
    const manifest = `[addon]
name = "${name}"
version = "1.0.0"
description = "My custom addon"
author = ""
license = "MIT"

[hooks]
PreToolUse = [
  { matcher = "Bash", handler = "./hook.ts", priority = 0 }
]

[install]
runtime = "bun"
`;

    await writeFile(join(addonDir, 'addon.toml'), manifest);

    // Create hook.ts
    const hook = `#!/usr/bin/env bun
/**
 * ${name} - PreToolUse Hook
 *
 * This hook runs before tool execution.
 * Exit codes:
 *   0 = allow (continue execution)
 *   1 = error (stop with error)
 *   2 = block (skip this tool call)
 */

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id?: string;
}

async function main(): Promise<void> {
  // Read input from stdin
  const input: HookInput = JSON.parse(await Bun.stdin.text());

  // Your hook logic here
  // Example: Check if tool_name is "Bash" and inspect the command
  if (input.tool_name === 'Bash') {
    const command = (input.tool_input.command as string) || '';

    // Add your checks here
    // if (someDangerousPattern.test(command)) {
    //   console.error(\`Blocked: \${command}\`);
    //   process.exit(2); // Block the command
    // }
  }

  // Allow by default
  process.exit(0);
}

main().catch((err) => {
  console.error('Hook error:', err);
  process.exit(1);
});
`;

    await writeFile(join(addonDir, 'hook.ts'), hook);

    // Create README.md
    const readme = `# ${name}

A custom addon for claudeops.

## Installation

\`\`\`bash
claudeops addon install ./${name}
\`\`\`

## Configuration

Edit \`addon.toml\` to configure hooks and behavior.

## Development

The \`hook.ts\` file contains the main hook logic. Edit it to implement your custom behavior.

### Exit Codes

- \`0\` - Allow the tool call to proceed
- \`1\` - Error (stop execution with error)
- \`2\` - Block (skip this tool call silently)

## License

MIT
`;

    await writeFile(join(addonDir, 'README.md'), readme);

    return addonDir;
  }

  async enable(name: string): Promise<void> {
    const state = await loadState();
    const addonState = state.addons[name];

    if (!addonState) {
      throw new AddonManagerError(`Addon ${name} is not installed`, name);
    }

    addonState.enabled = true;
    addonState.updatedAt = new Date().toISOString();
    await saveState(state);
  }

  async disable(name: string): Promise<void> {
    const state = await loadState();
    const addonState = state.addons[name];

    if (!addonState) {
      throw new AddonManagerError(`Addon ${name} is not installed`, name);
    }

    addonState.enabled = false;
    addonState.updatedAt = new Date().toISOString();
    await saveState(state);
  }

  async isInstalled(name: string): Promise<boolean> {
    const addon = await this.get(name);
    return addon !== null;
  }

  getRegistry(): AddonRegistry {
    return this.registry;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an addon manager instance
 */
export function createAddonManager(): AddonManager {
  return new AddonManagerImpl();
}

/**
 * Get all installed addons (convenience function)
 */
export async function listInstalledAddons(): Promise<InstalledAddon[]> {
  const manager = createAddonManager();
  return manager.list();
}

/**
 * Get enabled addons only
 */
export async function listEnabledAddons(): Promise<InstalledAddon[]> {
  const manager = createAddonManager();
  const all = await manager.list();
  return all.filter(addon => addon.enabled);
}
