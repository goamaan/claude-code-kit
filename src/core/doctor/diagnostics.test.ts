/**
 * Doctor Diagnostics Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runDiagnostics, CHECKS, getCheck } from './diagnostics.js';
import type { DiagnosticCategory } from '@/types/index.js';
import { CONFIG_FILE, PROFILE_FILE, CLAUDE_SETTINGS_FILE } from '@/utils/constants.js';

describe('Diagnostics', () => {
  let tempDir: string;
  let configDir: string;
  let claudeDir: string;
  let profilesDir: string;
  let addonsDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await mkdtemp(join(tmpdir(), 'claudeops-test-'));
    configDir = join(tempDir, '.claudeops');
    claudeDir = join(tempDir, '.claude');
    profilesDir = join(configDir, 'profiles');
    addonsDir = join(configDir, 'addons');
  });

  afterEach(async () => {
    // Clean up temp directory
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('CHECKS', () => {
    it('has required check definitions', () => {
      expect(CHECKS.length).toBeGreaterThan(0);

      for (const check of CHECKS) {
        expect(check.id).toBeTruthy();
        expect(check.name).toBeTruthy();
        expect(check.category).toBeTruthy();
        expect(check.description).toBeTruthy();
        expect(typeof check.run).toBe('function');
      }
    });

    it('has unique check IDs', () => {
      const ids = CHECKS.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('includes installation checks', () => {
      const installChecks = CHECKS.filter((c) => c.category === 'installation');
      expect(installChecks.length).toBeGreaterThan(0);
    });

    it('includes configuration checks', () => {
      const configChecks = CHECKS.filter((c) => c.category === 'configuration');
      expect(configChecks.length).toBeGreaterThan(0);
    });
  });

  describe('getCheck', () => {
    it('returns check by ID', () => {
      const check = getCheck('claudeops-dir');
      expect(check).toBeDefined();
      expect(check?.id).toBe('claudeops-dir');
    });

    it('returns undefined for unknown ID', () => {
      const check = getCheck('nonexistent-check');
      expect(check).toBeUndefined();
    });
  });

  describe('runDiagnostics', () => {
    it('runs all enabled checks by default', async () => {
      // Create basic directory structure
      await mkdir(configDir, { recursive: true });
      await mkdir(claudeDir, { recursive: true });

      const results = await runDiagnostics({
        configDir,
        claudeDir,
        profilesDir,
        addonsDir,
      });

      // Should have run multiple checks
      expect(results.length).toBeGreaterThan(0);

      // Each result should have required fields
      for (const result of results) {
        expect(result.id).toBeTruthy();
        expect(result.name).toBeTruthy();
        expect(typeof result.passed).toBe('boolean');
        expect(result.message).toBeTruthy();
        expect(typeof result.duration).toBe('number');
      }
    });

    it('filters by category', async () => {
      await mkdir(configDir, { recursive: true });

      const results = await runDiagnostics({
        categories: ['installation'] as DiagnosticCategory[],
        configDir,
        claudeDir,
        profilesDir,
        addonsDir,
      });

      for (const result of results) {
        expect(result.category).toBe('installation');
      }
    });

    it('filters by specific checks', async () => {
      await mkdir(configDir, { recursive: true });

      const results = await runDiagnostics({
        checks: ['claudeops-dir'],
        configDir,
        claudeDir,
        profilesDir,
        addonsDir,
      });

      expect(results.length).toBe(1);
      expect(results[0]?.id).toBe('claudeops-dir');
    });

    it('skips specified checks', async () => {
      await mkdir(configDir, { recursive: true });

      const filteredResults = await runDiagnostics({
        skip: ['bun-version'],
        configDir,
        claudeDir,
        profilesDir,
        addonsDir,
      });

      // bun-version should not be in results since it was skipped
      const skippedCheck = filteredResults.find((r) => r.id === 'bun-version');
      expect(skippedCheck).toBeUndefined();
    });

    it('handles dependencies correctly', async () => {
      // Don't create configDir to make claudeops-dir fail
      const results = await runDiagnostics({
        checks: ['claudeops-dir', 'config-valid'],
        configDir,
        claudeDir,
        profilesDir,
        addonsDir,
      });

      // config-valid depends on claudeops-dir
      // If claudeops-dir fails, config-valid should be skipped
      const configResult = results.find((r) => r.id === 'config-valid');

      // The dependency should have run first
      expect(results.find((r) => r.id === 'claudeops-dir')).toBeDefined();

      // config-valid should be skipped due to failed dependency
      if (configResult) {
        expect(configResult.message).toContain('Skipped due to failed dependencies');
      }
    });
  });

  describe('individual checks', () => {
    describe('claudeops-dir', () => {
      it('passes when directory exists', async () => {
        await mkdir(configDir, { recursive: true });

        const check = getCheck('claudeops-dir')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(true);
        expect(result.message).toContain('exists');
      });

      it('fails when directory missing', async () => {
        const check = getCheck('claudeops-dir')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(false);
        expect(result.fixAvailable).toBe(true);
      });

      it('fix creates directory', async () => {
        const check = getCheck('claudeops-dir')!;
        expect(check.fix).toBeDefined();

        const fixResult = await check.fix!({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(fixResult.success).toBe(true);
        expect(fixResult.actions.length).toBeGreaterThan(0);

        // Verify directory was created
        const { isDirectory } = await import('@/utils/fs.js');
        expect(await isDirectory(configDir)).toBe(true);
      });
    });

    describe('config-valid', () => {
      it('passes when no config exists (defaults used)', async () => {
        await mkdir(configDir, { recursive: true });

        const check = getCheck('config-valid')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(true);
        expect(result.severity).toBe('info');
      });

      it('passes with valid TOML config', async () => {
        await mkdir(configDir, { recursive: true });
        await writeFile(join(configDir, CONFIG_FILE), `
[model]
default = "sonnet"
`);

        const check = getCheck('config-valid')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(true);
      });

      it('fails with invalid TOML config', async () => {
        await mkdir(configDir, { recursive: true });
        await writeFile(join(configDir, CONFIG_FILE), 'invalid toml {{{');

        const check = getCheck('config-valid')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(false);
        expect(result.message).toContain('invalid syntax');
      });
    });

    describe('active-profile', () => {
      it('passes when active profile exists', async () => {
        await mkdir(configDir, { recursive: true });
        await mkdir(profilesDir, { recursive: true });

        const defaultProfileDir = join(profilesDir, 'default');
        await mkdir(defaultProfileDir, { recursive: true });
        await writeFile(join(configDir, PROFILE_FILE), 'default');

        const check = getCheck('active-profile')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(true);
      });

      it('suggests fix when profile missing', async () => {
        await mkdir(configDir, { recursive: true });
        await writeFile(join(configDir, PROFILE_FILE), 'missing-profile');

        const check = getCheck('active-profile')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(false);
        expect(result.fixAvailable).toBe(true);
        expect(result.suggestions?.length).toBeGreaterThan(0);
      });

      it('fix creates default profile', async () => {
        const check = getCheck('active-profile')!;
        expect(check.fix).toBeDefined();

        const fixResult = await check.fix!({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(fixResult.success).toBe(true);
        expect(fixResult.actions.length).toBeGreaterThan(0);

        // Verify profile was created
        const { isDirectory, isFile } = await import('@/utils/fs.js');
        const defaultProfileDir = join(profilesDir, 'default');
        expect(await isDirectory(defaultProfileDir)).toBe(true);
        expect(await isFile(join(defaultProfileDir, CONFIG_FILE))).toBe(true);
      });
    });

    describe('claude-dir-sync', () => {
      it('warns when directory does not exist', async () => {
        const check = getCheck('claude-dir-sync')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(false);
        expect(result.severity).toBe('warning');
        expect(result.fixAvailable).toBe(true);
      });

      it('passes when directory exists', async () => {
        await mkdir(claudeDir, { recursive: true });

        const check = getCheck('claude-dir-sync')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(true);
      });

      it('passes with valid settings file', async () => {
        await mkdir(claudeDir, { recursive: true });
        await writeFile(join(claudeDir, CLAUDE_SETTINGS_FILE), JSON.stringify({ hooks: {} }));

        const check = getCheck('claude-dir-sync')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(true);
      });

      it('fails with invalid settings file', async () => {
        await mkdir(claudeDir, { recursive: true });
        await writeFile(join(claudeDir, CLAUDE_SETTINGS_FILE), 'invalid json {{{');

        const check = getCheck('claude-dir-sync')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(false);
        expect(result.severity).toBe('error');
      });

      it('fix creates directory', async () => {
        const check = getCheck('claude-dir-sync')!;
        expect(check.fix).toBeDefined();

        const fixResult = await check.fix!({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(fixResult.success).toBe(true);

        // Verify directory was created
        const { isDirectory } = await import('@/utils/fs.js');
        expect(await isDirectory(claudeDir)).toBe(true);
      });
    });

    describe('addon-manifests', () => {
      it('passes when no addons installed', async () => {
        const check = getCheck('addon-manifests')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(true);
        expect(result.severity).toBe('info');
      });

      it('validates addon manifests', async () => {
        await mkdir(addonsDir, { recursive: true });
        const testAddonDir = join(addonsDir, 'test-addon');
        await mkdir(testAddonDir, { recursive: true });
        await writeFile(join(testAddonDir, 'addon.toml'), `
[addon]
name = "test-addon"
version = "1.0.0"
`);

        const check = getCheck('addon-manifests')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(true);
        expect(result.details?.['addons']).toContain('test-addon');
      });

      it('detects missing manifests', async () => {
        await mkdir(addonsDir, { recursive: true });
        const testAddonDir = join(addonsDir, 'test-addon');
        await mkdir(testAddonDir, { recursive: true });
        // Don't create addon.toml

        const check = getCheck('addon-manifests')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(false);
        expect(result.severity).toBe('warning');
        expect(result.suggestions?.some(s => s.includes('test-addon'))).toBe(true);
      });

      it('detects invalid manifests', async () => {
        await mkdir(addonsDir, { recursive: true });
        const testAddonDir = join(addonsDir, 'test-addon');
        await mkdir(testAddonDir, { recursive: true });
        await writeFile(join(testAddonDir, 'addon.toml'), 'invalid toml {{{');

        const check = getCheck('addon-manifests')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(false);
        expect(result.severity).toBe('warning');
      });
    });

    describe('hooks-valid', () => {
      it('passes when no hooks configured', async () => {
        await mkdir(claudeDir, { recursive: true });

        const check = getCheck('hooks-valid')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(true);
        expect(result.severity).toBe('info');
      });

      it('validates hooks configuration', async () => {
        await mkdir(claudeDir, { recursive: true });
        await writeFile(join(claudeDir, CLAUDE_SETTINGS_FILE), JSON.stringify({
          hooks: {
            'pre-tool-use': {
              handler: 'test-hook.js',
            },
          },
        }));

        const check = getCheck('hooks-valid')!;
        const result = await check.run({ getConfigDir: () => configDir, getClaudeDir: () => claudeDir, getProfilesDir: () => profilesDir, getAddonsDir: () => addonsDir });

        expect(result.passed).toBe(true);
        expect(result.details?.['hooks']).toContain('pre-tool-use');
      });
    });
  });
});
