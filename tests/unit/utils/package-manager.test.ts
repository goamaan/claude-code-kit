/**
 * Unit tests for package-manager utility
 * Tests detection, resolution, and command generation for npm, yarn, pnpm, and bun
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectFromLockfile,
  resolvePackageManager,
  getCommands,
  getSupportedPackageManagers,
  isValidPackageManager,
  type PackageManager,
} from '../../../src/utils/package-manager.js';

// Create mock for existsSync
const mockExistsSync = vi.fn();

// Mock the fs module
vi.mock('fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
}));

describe('package-manager utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectFromLockfile', () => {
    it('should detect npm from package-lock.json', () => {
      mockExistsSync.mockImplementation((path: string) => {
        return String(path).endsWith('package-lock.json');
      });

      const result = detectFromLockfile('/project');
      expect(result).toBe('npm');
    });

    it('should detect yarn from yarn.lock', () => {
      mockExistsSync.mockImplementation((path: string) => {
        return String(path).endsWith('yarn.lock');
      });

      const result = detectFromLockfile('/project');
      expect(result).toBe('yarn');
    });

    it('should detect pnpm from pnpm-lock.yaml', () => {
      mockExistsSync.mockImplementation((path: string) => {
        return String(path).endsWith('pnpm-lock.yaml');
      });

      const result = detectFromLockfile('/project');
      expect(result).toBe('pnpm');
    });

    it('should detect bun from bun.lockb', () => {
      mockExistsSync.mockImplementation((path: string) => {
        return String(path).endsWith('bun.lockb');
      });

      const result = detectFromLockfile('/project');
      expect(result).toBe('bun');
    });

    it('should return null when no lockfile is found', () => {
      mockExistsSync.mockReturnValue(false);

      const result = detectFromLockfile('/project');
      expect(result).toBeNull();
    });

    it('should check the correct paths for lockfiles', () => {
      mockExistsSync.mockReturnValue(false);

      detectFromLockfile('/my/project/path');

      expect(mockExistsSync).toHaveBeenCalledWith('/my/project/path/package-lock.json');
      expect(mockExistsSync).toHaveBeenCalledWith('/my/project/path/yarn.lock');
      expect(mockExistsSync).toHaveBeenCalledWith('/my/project/path/pnpm-lock.yaml');
      expect(mockExistsSync).toHaveBeenCalledWith('/my/project/path/bun.lockb');
    });

    it('should return the first detected package manager when multiple lockfiles exist', () => {
      // When multiple lockfiles exist, it should return the first one found
      // based on the order in LOCKFILES object (package-lock.json is first)
      mockExistsSync.mockReturnValue(true);

      const result = detectFromLockfile('/project');
      expect(result).toBe('npm');
    });
  });

  describe('resolvePackageManager', () => {
    it('should return preferred package manager when provided', () => {
      // Even if a lockfile exists, preferred takes precedence
      mockExistsSync.mockReturnValue(true);

      expect(resolvePackageManager('yarn')).toBe('yarn');
      expect(resolvePackageManager('pnpm')).toBe('pnpm');
      expect(resolvePackageManager('bun')).toBe('bun');
      expect(resolvePackageManager('npm')).toBe('npm');
    });

    it('should detect from lockfile when no preference is given', () => {
      mockExistsSync.mockImplementation((path: string) => {
        return String(path).endsWith('yarn.lock');
      });

      const result = resolvePackageManager(undefined, '/project');
      expect(result).toBe('yarn');
    });

    it('should fall back to npm when no preference and no lockfile detected', () => {
      mockExistsSync.mockReturnValue(false);

      const result = resolvePackageManager(undefined, '/project');
      expect(result).toBe('npm');
    });

    it('should return npm when called with no arguments', () => {
      const result = resolvePackageManager();
      expect(result).toBe('npm');
    });

    it('should return npm when projectDir is undefined and no preference', () => {
      const result = resolvePackageManager(undefined, undefined);
      expect(result).toBe('npm');
    });

    it('should prioritize preference over detection', () => {
      // Lockfile says yarn, but preference says pnpm
      mockExistsSync.mockImplementation((path: string) => {
        return String(path).endsWith('yarn.lock');
      });

      const result = resolvePackageManager('pnpm', '/project');
      expect(result).toBe('pnpm');
    });
  });

  describe('getCommands', () => {
    it('should return correct commands for npm', () => {
      const commands = getCommands('npm');
      expect(commands).toEqual({
        run: 'npm run',
        exec: 'npx',
        install: 'npm install',
        globalInstall: 'npm install -g',
      });
    });

    it('should return correct commands for yarn', () => {
      const commands = getCommands('yarn');
      expect(commands).toEqual({
        run: 'yarn',
        exec: 'yarn dlx',
        install: 'yarn add',
        globalInstall: 'yarn global add',
      });
    });

    it('should return correct commands for pnpm', () => {
      const commands = getCommands('pnpm');
      expect(commands).toEqual({
        run: 'pnpm',
        exec: 'pnpm exec',
        install: 'pnpm add',
        globalInstall: 'pnpm add -g',
      });
    });

    it('should return correct commands for bun', () => {
      const commands = getCommands('bun');
      expect(commands).toEqual({
        run: 'bun run',
        exec: 'bunx',
        install: 'bun add',
        globalInstall: 'bun add -g',
      });
    });

    it('should return commands with all required properties', () => {
      const managers: PackageManager[] = ['npm', 'yarn', 'pnpm', 'bun'];

      for (const pm of managers) {
        const commands = getCommands(pm);
        expect(commands).toHaveProperty('run');
        expect(commands).toHaveProperty('exec');
        expect(commands).toHaveProperty('install');
        expect(commands).toHaveProperty('globalInstall');
        expect(typeof commands.run).toBe('string');
        expect(typeof commands.exec).toBe('string');
        expect(typeof commands.install).toBe('string');
        expect(typeof commands.globalInstall).toBe('string');
      }
    });
  });

  describe('getSupportedPackageManagers', () => {
    it('should return all 4 supported package managers', () => {
      const managers = getSupportedPackageManagers();
      expect(managers).toHaveLength(4);
    });

    it('should include npm, yarn, pnpm, and bun', () => {
      const managers = getSupportedPackageManagers();
      expect(managers).toContain('npm');
      expect(managers).toContain('yarn');
      expect(managers).toContain('pnpm');
      expect(managers).toContain('bun');
    });

    it('should return managers in expected order', () => {
      const managers = getSupportedPackageManagers();
      expect(managers).toEqual(['npm', 'yarn', 'pnpm', 'bun']);
    });

    it('should return a new array each time', () => {
      const managers1 = getSupportedPackageManagers();
      const managers2 = getSupportedPackageManagers();
      expect(managers1).not.toBe(managers2);
      expect(managers1).toEqual(managers2);
    });
  });

  describe('isValidPackageManager', () => {
    it('should return true for npm', () => {
      expect(isValidPackageManager('npm')).toBe(true);
    });

    it('should return true for yarn', () => {
      expect(isValidPackageManager('yarn')).toBe(true);
    });

    it('should return true for pnpm', () => {
      expect(isValidPackageManager('pnpm')).toBe(true);
    });

    it('should return true for bun', () => {
      expect(isValidPackageManager('bun')).toBe(true);
    });

    it('should return false for invalid strings', () => {
      expect(isValidPackageManager('invalid')).toBe(false);
      expect(isValidPackageManager('NPM')).toBe(false);
      expect(isValidPackageManager('Yarn')).toBe(false);
      expect(isValidPackageManager('')).toBe(false);
      expect(isValidPackageManager('node')).toBe(false);
      expect(isValidPackageManager('deno')).toBe(false);
    });

    it('should return false for strings with whitespace', () => {
      expect(isValidPackageManager(' npm')).toBe(false);
      expect(isValidPackageManager('npm ')).toBe(false);
      expect(isValidPackageManager(' npm ')).toBe(false);
    });

    it('should act as type guard', () => {
      const value: string = 'npm';
      if (isValidPackageManager(value)) {
        // TypeScript should now know value is PackageManager
        const pm: PackageManager = value;
        expect(pm).toBe('npm');
      }
    });
  });

  describe('integration scenarios', () => {
    it('should work together: detect, validate, and get commands', () => {
      mockExistsSync.mockImplementation((path: string) => {
        return String(path).endsWith('pnpm-lock.yaml');
      });

      // Detect package manager
      const detected = detectFromLockfile('/project');
      expect(detected).toBe('pnpm');

      // Validate it
      expect(isValidPackageManager(detected!)).toBe(true);

      // Get commands
      const commands = getCommands(detected!);
      expect(commands.install).toBe('pnpm add');
    });

    it('should resolve and get commands in one flow', () => {
      mockExistsSync.mockImplementation((path: string) => {
        return String(path).endsWith('bun.lockb');
      });

      const pm = resolvePackageManager(undefined, '/project');
      const commands = getCommands(pm);

      expect(pm).toBe('bun');
      expect(commands.run).toBe('bun run');
      expect(commands.exec).toBe('bunx');
    });

    it('should handle preference override correctly', () => {
      // Project has yarn.lock but user prefers npm
      mockExistsSync.mockImplementation((path: string) => {
        return String(path).endsWith('yarn.lock');
      });

      const pm = resolvePackageManager('npm', '/project');
      const commands = getCommands(pm);

      expect(pm).toBe('npm');
      expect(commands.install).toBe('npm install');
    });
  });
});
