/**
 * Unit tests for path resolution utilities
 */

import { describe, it, expect } from 'vitest';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  getHomeDir,
  getGlobalConfigDir,
  getClaudeDir,
  getProjectConfigDir,
  getProfilesDir,
  getProfileDir,
  getAddonsDir,
  getAddonDir,
  getSetupsDir,
  getSetupDir,
  expandPath,
  resolvePath,
  isPathWithin,
  normalizePath,
  joinPath,
} from './paths.js';

describe('paths', () => {
  const home = homedir();

  describe('getHomeDir', () => {
    it('should return the home directory', () => {
      expect(getHomeDir()).toBe(home);
    });
  });

  describe('getGlobalConfigDir', () => {
    it('should return ~/.claudeops', () => {
      expect(getGlobalConfigDir()).toBe(join(home, '.claudeops'));
    });
  });

  describe('getClaudeDir', () => {
    it('should return ~/.claude', () => {
      expect(getClaudeDir()).toBe(join(home, '.claude'));
    });
  });

  describe('getProjectConfigDir', () => {
    it('should return .claudeops in cwd by default', () => {
      expect(getProjectConfigDir()).toBe(join(process.cwd(), '.claudeops'));
    });

    it('should return .claudeops in specified root', () => {
      expect(getProjectConfigDir('/custom/root')).toBe(
        '/custom/root/.claudeops'
      );
    });
  });

  describe('getProfilesDir', () => {
    it('should return ~/.claudeops/profiles', () => {
      expect(getProfilesDir()).toBe(join(home, '.claudeops', 'profiles'));
    });
  });

  describe('getProfileDir', () => {
    it('should return profile directory path', () => {
      expect(getProfileDir('my-profile')).toBe(
        join(home, '.claudeops', 'profiles', 'my-profile')
      );
    });
  });

  describe('getAddonsDir', () => {
    it('should return ~/.claudeops/addons', () => {
      expect(getAddonsDir()).toBe(join(home, '.claudeops', 'addons'));
    });
  });

  describe('getAddonDir', () => {
    it('should return addon directory path', () => {
      expect(getAddonDir('my-addon')).toBe(
        join(home, '.claudeops', 'addons', 'my-addon')
      );
    });
  });

  describe('getSetupsDir', () => {
    it('should return ~/.claudeops/setups', () => {
      expect(getSetupsDir()).toBe(join(home, '.claudeops', 'setups'));
    });
  });

  describe('getSetupDir', () => {
    it('should return setup directory path', () => {
      expect(getSetupDir('my-setup')).toBe(
        join(home, '.claudeops', 'setups', 'my-setup')
      );
    });
  });

  describe('expandPath', () => {
    it('should expand ~ to home directory', () => {
      expect(expandPath('~')).toBe(home);
    });

    it('should expand ~/ prefix to home directory', () => {
      expect(expandPath('~/some/path')).toBe(join(home, 'some/path'));
    });

    it('should not modify absolute paths', () => {
      expect(expandPath('/absolute/path')).toBe('/absolute/path');
    });

    it('should not modify relative paths without ~', () => {
      expect(expandPath('relative/path')).toBe('relative/path');
    });

    it('should handle ~/ with multiple segments', () => {
      expect(expandPath('~/a/b/c')).toBe(join(home, 'a/b/c'));
    });
  });

  describe('resolvePath', () => {
    it('should return cwd for no arguments', () => {
      expect(resolvePath()).toBe(process.cwd());
    });

    it('should resolve absolute paths', () => {
      expect(resolvePath('/absolute/path')).toBe('/absolute/path');
    });

    it('should resolve relative paths from cwd', () => {
      expect(resolvePath('relative')).toBe(resolve('relative'));
    });

    it('should expand tilde in first segment', () => {
      expect(resolvePath('~/path')).toBe(join(home, 'path'));
    });

    it('should join multiple segments', () => {
      expect(resolvePath('~/base', 'sub', 'file.txt')).toBe(
        join(home, 'base', 'sub', 'file.txt')
      );
    });

    it('should normalize the path', () => {
      expect(resolvePath('~/a/../b')).toBe(join(home, 'b'));
    });

    it('should handle absolute path with additional segments', () => {
      expect(resolvePath('/root', 'sub', 'file')).toBe('/root/sub/file');
    });
  });

  describe('isPathWithin', () => {
    it('should return true for same path', () => {
      expect(isPathWithin('/a/b', '/a/b')).toBe(true);
    });

    it('should return true for child path', () => {
      expect(isPathWithin('/a/b/c', '/a/b')).toBe(true);
    });

    it('should return false for unrelated paths', () => {
      expect(isPathWithin('/a/b', '/c/d')).toBe(false);
    });

    it('should return false for parent path', () => {
      expect(isPathWithin('/a', '/a/b')).toBe(false);
    });

    it('should handle tilde expansion', () => {
      expect(isPathWithin('~/sub', '~')).toBe(true);
    });

    it('should not match partial directory names', () => {
      expect(isPathWithin('/abc', '/ab')).toBe(false);
    });
  });

  describe('normalizePath', () => {
    it('should expand tilde', () => {
      expect(normalizePath('~/path')).toBe(join(home, 'path'));
    });

    it('should remove redundant slashes', () => {
      expect(normalizePath('/a//b///c')).toBe('/a/b/c');
    });

    it('should resolve . and ..', () => {
      expect(normalizePath('/a/b/../c/./d')).toBe('/a/c/d');
    });
  });

  describe('joinPath', () => {
    it('should return empty string for no arguments', () => {
      expect(joinPath()).toBe('');
    });

    it('should expand tilde in first segment', () => {
      expect(joinPath('~', 'path')).toBe(join(home, 'path'));
    });

    it('should join multiple segments', () => {
      expect(joinPath('a', 'b', 'c')).toBe(join('a', 'b', 'c'));
    });

    it('should handle absolute first segment', () => {
      expect(joinPath('/root', 'sub')).toBe('/root/sub');
    });
  });
});
