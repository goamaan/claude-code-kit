/**
 * Pack Manager - High-level pack management interface
 * List, get, remove, enable/disable packs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { InstalledPack, PackComponent } from './types.js';
import { createPackInstaller, getPacksStateFile, type PackInstaller } from './installer.js';

// =============================================================================
// Error Types
// =============================================================================

export class PackManagerError extends Error {
  constructor(
    message: string,
    public readonly pack?: string,
    cause?: unknown
  ) {
    super(message, { cause });
    this.name = 'PackManagerError';
  }
}

// =============================================================================
// State Types
// =============================================================================

interface PacksState {
  version: string;
  packs: Record<string, {
    name: string;
    source: string;
    installedAt: string;
    components: PackComponent[];
    enabled: boolean;
  }>;
}

// =============================================================================
// Helper Functions
// =============================================================================

async function loadPacksState(): Promise<PacksState> {
  const stateFile = getPacksStateFile();
  try {
    const content = await readFile(stateFile, 'utf-8');
    return JSON.parse(content) as PacksState;
  } catch {
    return { version: '1', packs: {} };
  }
}

async function savePacksState(state: PacksState): Promise<void> {
  const stateFile = getPacksStateFile();
  const dir = dirname(stateFile);
  const { mkdir } = await import('node:fs/promises');
  await mkdir(dir, { recursive: true });
  await writeFile(stateFile, JSON.stringify(state, null, 2));
}

// =============================================================================
// Manager Interface
// =============================================================================

export interface PackManager {
  /**
   * List all installed packs
   */
  listPacks(): Promise<InstalledPack[]>;

  /**
   * Get a specific pack by name
   */
  getPack(name: string): Promise<InstalledPack | null>;

  /**
   * Remove a pack
   */
  removePack(name: string): Promise<void>;

  /**
   * Enable a pack
   */
  enablePack(name: string): Promise<void>;

  /**
   * Disable a pack (without removing)
   */
  disablePack(name: string): Promise<void>;

  /**
   * Check if a pack is installed
   */
  isInstalled(name: string): Promise<boolean>;

  /**
   * Get the pack installer
   */
  getInstaller(): PackInstaller;
}

// =============================================================================
// Manager Implementation
// =============================================================================

class PackManagerImpl implements PackManager {
  private installer: PackInstaller;

  constructor() {
    this.installer = createPackInstaller();
  }

  async listPacks(): Promise<InstalledPack[]> {
    const state = await loadPacksState();
    const packs: InstalledPack[] = [];

    for (const [, packState] of Object.entries(state.packs)) {
      packs.push({
        name: packState.name,
        source: packState.source,
        installedAt: packState.installedAt,
        components: packState.components,
        enabled: packState.enabled,
      });
    }

    return packs.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getPack(name: string): Promise<InstalledPack | null> {
    const state = await loadPacksState();
    const packState = state.packs[name];

    if (!packState) {
      return null;
    }

    return {
      name: packState.name,
      source: packState.source,
      installedAt: packState.installedAt,
      components: packState.components,
      enabled: packState.enabled,
    };
  }

  async removePack(name: string): Promise<void> {
    try {
      await this.installer.uninstall(name);
    } catch (err) {
      throw new PackManagerError(
        `Failed to remove pack ${name}: ${err instanceof Error ? err.message : String(err)}`,
        name,
        err
      );
    }
  }

  async enablePack(name: string): Promise<void> {
    const state = await loadPacksState();
    const packState = state.packs[name];

    if (!packState) {
      throw new PackManagerError(`Pack ${name} is not installed`, name);
    }

    packState.enabled = true;
    await savePacksState(state);
  }

  async disablePack(name: string): Promise<void> {
    const state = await loadPacksState();
    const packState = state.packs[name];

    if (!packState) {
      throw new PackManagerError(`Pack ${name} is not installed`, name);
    }

    packState.enabled = false;
    await savePacksState(state);
  }

  async isInstalled(name: string): Promise<boolean> {
    const pack = await this.getPack(name);
    return pack !== null;
  }

  getInstaller(): PackInstaller {
    return this.installer;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a pack manager instance
 */
export function createPackManager(): PackManager {
  return new PackManagerImpl();
}

/**
 * List all installed packs (convenience function)
 */
export async function listInstalledPacks(): Promise<InstalledPack[]> {
  const manager = createPackManager();
  return manager.listPacks();
}

/**
 * Get enabled packs only
 */
export async function listEnabledPacks(): Promise<InstalledPack[]> {
  const manager = createPackManager();
  const all = await manager.listPacks();
  return all.filter(pack => pack.enabled);
}
