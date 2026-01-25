/**
 * Package manager detection and command utilities
 * Supports npm, yarn, pnpm, and bun
 */

import { existsSync } from 'fs';
import { join } from 'path';

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

export interface PackageManagerCommands {
  run: string;           // "npm run" | "yarn" | "pnpm" | "bun run"
  exec: string;          // "npx" | "yarn dlx" | "pnpm exec" | "bunx"
  install: string;       // "npm install" | "yarn add" | "pnpm add" | "bun add"
  globalInstall: string; // "npm install -g" | "yarn global add" | "pnpm add -g" | "bun add -g"
}

const LOCKFILES: Record<string, PackageManager> = {
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm',
  'bun.lockb': 'bun',
};

const COMMANDS: Record<PackageManager, PackageManagerCommands> = {
  npm: {
    run: 'npm run',
    exec: 'npx',
    install: 'npm install',
    globalInstall: 'npm install -g',
  },
  yarn: {
    run: 'yarn',
    exec: 'yarn dlx',
    install: 'yarn add',
    globalInstall: 'yarn global add',
  },
  pnpm: {
    run: 'pnpm',
    exec: 'pnpm exec',
    install: 'pnpm add',
    globalInstall: 'pnpm add -g',
  },
  bun: {
    run: 'bun run',
    exec: 'bunx',
    install: 'bun add',
    globalInstall: 'bun add -g',
  },
};

/**
 * Detect package manager from lockfile in directory
 */
export function detectFromLockfile(dir: string): PackageManager | null {
  for (const [lockfile, pm] of Object.entries(LOCKFILES)) {
    if (existsSync(join(dir, lockfile))) {
      return pm;
    }
  }
  return null;
}

/**
 * Resolve the package manager to use based on preference and detection
 * Priority: preferred > lockfile detection > npm (default)
 */
export function resolvePackageManager(
  preferred?: PackageManager,
  projectDir?: string
): PackageManager {
  // Use explicitly preferred package manager if provided
  if (preferred) {
    return preferred;
  }

  // Try to detect from lockfile
  if (projectDir) {
    const detected = detectFromLockfile(projectDir);
    if (detected) {
      return detected;
    }
  }

  // Fall back to npm
  return 'npm';
}

/**
 * Get commands for a package manager
 */
export function getCommands(pm: PackageManager): PackageManagerCommands {
  return COMMANDS[pm];
}

/**
 * Get all supported package managers
 */
export function getSupportedPackageManagers(): PackageManager[] {
  return ['npm', 'yarn', 'pnpm', 'bun'];
}

/**
 * Check if a string is a valid package manager
 */
export function isValidPackageManager(value: string): value is PackageManager {
  return ['npm', 'yarn', 'pnpm', 'bun'].includes(value);
}
