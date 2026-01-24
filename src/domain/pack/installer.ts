/**
 * Pack Installer - Interactive pack installation
 * Analyzes, presents options, and installs pack components
 */

import { mkdir, cp, rm, writeFile, readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import * as p from '@clack/prompts';
import { createPackAnalyzer } from './analyzer.js';
import type { PackAnalysis, PackComponent, InstalledPack } from './types.js';

// =============================================================================
// Constants
// =============================================================================

const PACKS_DIR = join(homedir(), '.claude', 'packs');
const AGENTS_DIR = join(homedir(), '.claude', 'agents');
const SKILLS_DIR = join(homedir(), '.claude', 'skills');
const HOOKS_DIR = join(homedir(), '.claude', 'hooks');
const PACKS_STATE_FILE = join(homedir(), '.claude', 'packs.json');

// =============================================================================
// Error Types
// =============================================================================

export class PackInstallError extends Error {
  constructor(
    message: string,
    public readonly pack?: string,
    cause?: unknown
  ) {
    super(message, { cause });
    this.name = 'PackInstallError';
  }
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

async function loadPacksState(): Promise<PacksState> {
  try {
    const content = await readFile(PACKS_STATE_FILE, 'utf-8');
    return JSON.parse(content) as PacksState;
  } catch {
    return { version: '1', packs: {} };
  }
}

async function savePacksState(state: PacksState): Promise<void> {
  await ensureDir(dirname(PACKS_STATE_FILE));
  await writeFile(PACKS_STATE_FILE, JSON.stringify(state, null, 2));
}

// =============================================================================
// Installer Implementation
// =============================================================================

export interface PackInstaller {
  /**
   * Install a pack from source (GitHub URL or local path)
   */
  install(source: string): Promise<InstalledPack>;

  /**
   * Uninstall a pack by name
   */
  uninstall(name: string): Promise<void>;

  /**
   * Get installation directory for a pack
   */
  getPackDir(name: string): string;
}

class PackInstallerImpl implements PackInstaller {
  private analyzer = createPackAnalyzer();

  async install(source: string): Promise<InstalledPack> {
    p.intro('Pack Installation');

    // Step 1: Analyze the repository
    const spinner = p.spinner();
    spinner.start('Analyzing repository...');

    let analysis: PackAnalysis;
    try {
      analysis = await this.analyzer.analyze(source);
      spinner.stop('Analysis complete');
    } catch (err) {
      spinner.stop('Analysis failed');
      throw new PackInstallError(
        `Failed to analyze pack: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        err
      );
    }

    // Step 2: Display analysis results
    p.note(
      `Type: ${analysis.type}\n` +
      `Description: ${analysis.description}\n` +
      `Components: ${analysis.components.length}\n` +
      `Confidence: ${(analysis.confidence * 100).toFixed(0)}%`,
      'Pack Analysis'
    );

    // Step 3: Component selection
    if (analysis.components.length === 0) {
      p.cancel('No components found to install');
      throw new PackInstallError('No installable components found', analysis.name);
    }

    const componentChoices = analysis.components.map(c => ({
      value: c.name,
      label: `${c.type}: ${c.name} - ${c.description}`,
    }));

    const selectedComponents = await p.multiselect({
      message: 'Select components to install:',
      options: componentChoices,
      initialValues: analysis.components.map(c => c.name),
      required: true,
    });

    if (p.isCancel(selectedComponents)) {
      p.cancel('Installation cancelled');
      process.exit(0);
    }

    // Filter selected components
    const componentsToInstall = analysis.components.filter(c =>
      (selectedComponents as string[]).includes(c.name)
    );

    // Step 4: Confirm installation
    const shouldContinue = await p.confirm({
      message: `Install ${componentsToInstall.length} component(s)?`,
      initialValue: true,
    });

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel('Installation cancelled');
      process.exit(0);
    }

    // Step 5: Install components
    spinner.start('Installing pack...');

    try {
      // Ensure directories exist
      await ensureDir(PACKS_DIR);
      await ensureDir(AGENTS_DIR);
      await ensureDir(SKILLS_DIR);
      await ensureDir(HOOKS_DIR);

      // Clone/copy pack to packs directory
      const packDir = join(PACKS_DIR, analysis.name);
      await ensureDir(packDir);

      // Copy components to appropriate directories
      for (const component of componentsToInstall) {
        const sourcePath = join(packDir, component.path);
        let targetDir: string;

        switch (component.type) {
          case 'agent':
            targetDir = AGENTS_DIR;
            break;
          case 'skill':
            targetDir = SKILLS_DIR;
            break;
          case 'hook':
            targetDir = HOOKS_DIR;
            break;
          case 'rule':
          case 'script':
          case 'mcp':
            targetDir = packDir; // Keep in pack directory
            break;
          default:
            targetDir = packDir;
        }

        // Copy component file if it exists in source
        if (await fileExists(sourcePath)) {
          await cp(sourcePath, join(targetDir, component.name), { recursive: true });
        }
      }

      // Update state
      const state = await loadPacksState();
      state.packs[analysis.name] = {
        name: analysis.name,
        source,
        installedAt: new Date().toISOString(),
        components: componentsToInstall,
        enabled: true,
      };
      await savePacksState(state);

      spinner.stop('Installation complete');

      // Step 6: Show next steps
      p.note(analysis.installInstructions, 'Next Steps');

      p.outro(`Successfully installed ${analysis.name}`);

      return {
        name: analysis.name,
        source,
        installedAt: new Date().toISOString(),
        components: componentsToInstall,
        enabled: true,
      };
    } catch (err) {
      spinner.stop('Installation failed');
      throw new PackInstallError(
        `Failed to install pack: ${err instanceof Error ? err.message : String(err)}`,
        analysis.name,
        err
      );
    }
  }

  async uninstall(name: string): Promise<void> {
    const state = await loadPacksState();
    const pack = state.packs[name];

    if (!pack) {
      throw new PackInstallError(`Pack ${name} is not installed`, name);
    }

    // Remove pack directory
    const packDir = join(PACKS_DIR, name);
    await rm(packDir, { recursive: true, force: true });

    // Update state
    delete state.packs[name];
    await savePacksState(state);
  }

  getPackDir(name: string): string {
    return join(PACKS_DIR, name);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a pack installer instance
 */
export function createPackInstaller(): PackInstaller {
  return new PackInstallerImpl();
}

/**
 * Get the packs installation directory
 */
export function getPacksDir(): string {
  return PACKS_DIR;
}

/**
 * Get the packs state file path
 */
export function getPacksStateFile(): string {
  return PACKS_STATE_FILE;
}
