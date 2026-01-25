/**
 * Hook Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { HookManager, createHookManager } from './hook-manager.js';

describe('HookManager', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'hook-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('loadHooks', () => {
    it('should load hooks from directory', async () => {
      // Create a test hook file
      const hooksDir = join(tempDir, 'hooks');
      await mkdir(hooksDir, { recursive: true });

      const hookContent = `#!/usr/bin/env node
/**
 * Hook: test-hook
 * Event: PreToolUse
 * Description: A test hook
 * Matcher: *
 * Priority: 50
 */

import { readFileSync } from 'fs';
let input;
try {
  const stdinData = readFileSync(0, 'utf8');
  input = JSON.parse(stdinData);
} catch (err) {
  process.exit(1);
}
process.exit(0);
`;

      await writeFile(join(hooksDir, 'test-hook.mjs'), hookContent);

      const manager = new HookManager({
        builtinHooksDir: join(tempDir, 'nonexistent-builtin'),
        globalHooksDir: hooksDir,
        projectHooksDir: join(tempDir, 'nonexistent-project'),
      });

      const hooks = await manager.loadHooks();

      expect(hooks.length).toBe(1);
      expect(hooks[0]?.metadata.name).toBe('test-hook');
      expect(hooks[0]?.metadata.event).toBe('PreToolUse');
      expect(hooks[0]?.metadata.priority).toBe(50);
    });

    it('should return empty array for missing directory', async () => {
      const manager = new HookManager({
        builtinHooksDir: join(tempDir, 'nonexistent-builtin'),
        globalHooksDir: join(tempDir, 'nonexistent'),
        projectHooksDir: join(tempDir, 'nonexistent-project'),
      });

      const hooks = await manager.loadHooks();

      expect(hooks).toEqual([]);
    });

    it('should skip disabled hooks', async () => {
      const hooksDir = join(tempDir, 'hooks');
      await mkdir(hooksDir, { recursive: true });

      const enabledHook = `#!/usr/bin/env node
/**
 * Hook: enabled
 * Event: PreToolUse
 */
process.exit(0);
`;

      const disabledHook = `#!/usr/bin/env node
/**
 * Hook: disabled
 * Event: PreToolUse
 */
process.exit(0);
`;

      await writeFile(join(hooksDir, 'enabled.mjs'), enabledHook);
      await writeFile(join(hooksDir, 'disabled.mjs'), disabledHook);

      const manager = new HookManager({
        builtinHooksDir: join(tempDir, 'nonexistent-builtin'),
        globalHooksDir: hooksDir,
        projectHooksDir: join(tempDir, 'nonexistent-project'),
        disabledHooks: ['disabled'],
      });

      const hooks = await manager.loadHooks();

      expect(hooks.length).toBe(1);
      expect(hooks[0]?.metadata.name).toBe('enabled');
    });
  });

  describe('getHooksForEvent', () => {
    it('should filter hooks by event type', async () => {
      const hooksDir = join(tempDir, 'hooks');
      await mkdir(hooksDir, { recursive: true });

      await writeFile(
        join(hooksDir, 'pre-hook.mjs'),
        `/**
 * Hook: pre-hook
 * Event: PreToolUse
 */`
      );

      await writeFile(
        join(hooksDir, 'post-hook.mjs'),
        `/**
 * Hook: post-hook
 * Event: PostToolUse
 */`
      );

      const manager = new HookManager({
        builtinHooksDir: join(tempDir, 'nonexistent-builtin'),
        globalHooksDir: hooksDir,
        projectHooksDir: join(tempDir, 'nonexistent-project'),
      });

      await manager.loadHooks();

      const preHooks = manager.getHooksForEvent('PreToolUse');
      const postHooks = manager.getHooksForEvent('PostToolUse');

      expect(preHooks.length).toBe(1);
      expect(preHooks[0]?.metadata.name).toBe('pre-hook');

      expect(postHooks.length).toBe(1);
      expect(postHooks[0]?.metadata.name).toBe('post-hook');
    });

    it('should sort hooks by priority (descending)', async () => {
      const hooksDir = join(tempDir, 'hooks');
      await mkdir(hooksDir, { recursive: true });

      await writeFile(
        join(hooksDir, 'low.mjs'),
        `/**
 * Hook: low
 * Event: PreToolUse
 * Priority: 10
 */`
      );

      await writeFile(
        join(hooksDir, 'high.mjs'),
        `/**
 * Hook: high
 * Event: PreToolUse
 * Priority: 100
 */`
      );

      const manager = new HookManager({
        builtinHooksDir: join(tempDir, 'nonexistent-builtin'),
        globalHooksDir: hooksDir,
        projectHooksDir: join(tempDir, 'nonexistent-project'),
      });

      await manager.loadHooks();

      const hooks = manager.getHooksForEvent('PreToolUse');

      expect(hooks[0]?.metadata.name).toBe('high');
      expect(hooks[1]?.metadata.name).toBe('low');
    });
  });

  describe('installHook', () => {
    it('should install hook to global directory', async () => {
      const hooksDir = join(tempDir, 'hooks');

      const manager = new HookManager({
        builtinHooksDir: join(tempDir, 'nonexistent-builtin'),
        globalHooksDir: hooksDir,
        projectHooksDir: join(tempDir, 'nonexistent-project'),
      });

      const content = '#!/usr/bin/env node\nprocess.exit(0);';
      const path = await manager.installHook('test-hook', content);

      expect(path).toBe(join(hooksDir, 'test-hook.mjs'));
    });
  });

  describe('createHookManager', () => {
    it('should create a hook manager with default options', () => {
      const manager = createHookManager();

      expect(manager).toBeInstanceOf(HookManager);
    });
  });
});
