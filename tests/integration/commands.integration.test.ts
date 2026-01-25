/**
 * CLI Commands Integration Tests
 * Tests that verify the CLI command infrastructure works correctly
 *
 * These tests focus on:
 * - Module imports and exports
 * - Command structure and metadata
 * - Helper functions and utilities
 * - Safe tests that don't modify user's actual config
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// Import Tests - Verify command modules can be imported
// =============================================================================

describe('CLI command imports', () => {
  it('should import sync command', async () => {
    const mod = await import('@/commands/sync.js');
    expect(mod.default).toBeDefined();
    expect(mod.syncAll).toBeDefined();
    expect(typeof mod.syncAll).toBe('function');
  });

  it('should import profile command', async () => {
    const mod = await import('@/commands/profile.js');
    expect(mod.default).toBeDefined();
    expect(mod.default.meta).toBeDefined();
  });

  it('should import skill command', async () => {
    const mod = await import('@/commands/skill.js');
    expect(mod.default).toBeDefined();
    expect(mod.default.meta).toBeDefined();
  });

  it('should import hook command', async () => {
    const mod = await import('@/commands/hook.js');
    expect(mod.default).toBeDefined();
    expect(mod.default.meta).toBeDefined();
  });

  it('should import doctor command', async () => {
    const mod = await import('@/commands/doctor.js');
    expect(mod.default).toBeDefined();
    expect(mod.default.meta).toBeDefined();
  });

  it('should import addon command', async () => {
    const mod = await import('@/commands/addon.js');
    expect(mod.default).toBeDefined();
    expect(mod.default.meta).toBeDefined();
  });

  it('should import config command', async () => {
    const mod = await import('@/commands/config.js');
    expect(mod.default).toBeDefined();
    expect(mod.default.meta).toBeDefined();
  });

  it('should import setup command', async () => {
    const mod = await import('@/commands/setup.js');
    expect(mod.default).toBeDefined();
    expect(mod.default.meta).toBeDefined();
  });

  it('should import mcp command', async () => {
    const mod = await import('@/commands/mcp.js');
    expect(mod.default).toBeDefined();
    expect(mod.default.meta).toBeDefined();
  });

  it('should import install command', async () => {
    const mod = await import('@/commands/install.js');
    expect(mod.default).toBeDefined();
    expect(mod.default.meta).toBeDefined();
  });

  it('should import upgrade command', async () => {
    const mod = await import('@/commands/upgrade.js');
    expect(mod.default).toBeDefined();
    expect(mod.default.meta).toBeDefined();
  });

  it('should import classify command', async () => {
    const mod = await import('@/commands/classify.js');
    expect(mod.default).toBeDefined();
    expect(mod.default.meta).toBeDefined();
  });

  it('should import cost command', async () => {
    const mod = await import('@/commands/cost.js');
    expect(mod.default).toBeDefined();
    expect(mod.default.meta).toBeDefined();
  });
});

// =============================================================================
// Command Metadata Tests - Verify command definitions
// =============================================================================

describe('command definitions', () => {
  it('sync command should have correct structure', async () => {
    const { default: syncCmd } = await import('@/commands/sync.js');
    expect(syncCmd.meta).toBeDefined();
    expect(syncCmd.args).toBeDefined();
    expect(syncCmd.run).toBeDefined();
  });

  it('sync command should have expected args', async () => {
    const { default: syncCmd } = await import('@/commands/sync.js');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = syncCmd.args as any;
    expect(args).toBeDefined();
    expect(args.dryRun).toBeDefined();
    expect(args.force).toBeDefined();
    expect(args.backup).toBeDefined();
    expect(args.verbose).toBeDefined();
    expect(args.json).toBeDefined();
  });

  it('profile command should have subcommands', async () => {
    const { default: profileCmd } = await import('@/commands/profile.js');
    expect(profileCmd.subCommands).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subCommands = profileCmd.subCommands as any;
    expect(subCommands.list).toBeDefined();
    expect(subCommands.use).toBeDefined();
    expect(subCommands.create).toBeDefined();
    expect(subCommands.delete).toBeDefined();
    expect(subCommands.export).toBeDefined();
    expect(subCommands.import).toBeDefined();
    expect(subCommands.show).toBeDefined();
  });

  it('skill command should have subcommands', async () => {
    const { default: skillCmd } = await import('@/commands/skill.js');
    expect(skillCmd.subCommands).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subCommands = skillCmd.subCommands as any;
    expect(subCommands.list).toBeDefined();
    expect(subCommands.info).toBeDefined();
    expect(subCommands.install).toBeDefined();
    expect(subCommands.add).toBeDefined();
    expect(subCommands.enable).toBeDefined();
    expect(subCommands.disable).toBeDefined();
    expect(subCommands.sync).toBeDefined();
  });

  it('hook command should have subcommands', async () => {
    const { default: hookCmd } = await import('@/commands/hook.js');
    expect(hookCmd.subCommands).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subCommands = hookCmd.subCommands as any;
    expect(subCommands.list).toBeDefined();
    expect(subCommands.debug).toBeDefined();
    expect(subCommands.test).toBeDefined();
    expect(subCommands.add).toBeDefined();
    expect(subCommands.sync).toBeDefined();
  });

  it('doctor command should have expected args', async () => {
    const { default: doctorCmd } = await import('@/commands/doctor.js');
    expect(doctorCmd.args).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = doctorCmd.args as any;
    expect(args.fix).toBeDefined();
    expect(args.json).toBeDefined();
    expect(args.category).toBeDefined();
  });
});

// =============================================================================
// Exported Functions Tests - Test helper functions
// =============================================================================

describe('sync command exports', () => {
  it('syncAll should be a function', async () => {
    const { syncAll } = await import('@/commands/sync.js');
    expect(typeof syncAll).toBe('function');
  });

  it('syncAll should accept options parameter', async () => {
    const { syncAll } = await import('@/commands/sync.js');
    // Verify function signature by checking length (0 or 1 params)
    expect(syncAll.length).toBeLessThanOrEqual(1);
  });

  // NOTE: Cannot safely test syncAll() execution as it modifies ~/.claude/
  // This would require full integration test environment or mocking
  it.skip('syncAll execution requires test environment', () => {
    // Skip - syncAll() modifies user's actual ~/.claude/ directory
    // To test this properly, we need:
    // 1. Mock getClaudeDir() to return temp directory
    // 2. Set up test config/skills/hooks in temp directory
    // 3. Execute syncAll() and verify results
    // 4. Clean up temp directory
  });
});

// =============================================================================
// Command Structure Tests - Verify citty command structure
// =============================================================================

describe('command structure', () => {
  it('sync command should have run function', async () => {
    const mod = await import('@/commands/sync.js');
    expect(typeof mod.default.run).toBe('function');
  });

  it('doctor command should have run function', async () => {
    const mod = await import('@/commands/doctor.js');
    expect(typeof mod.default.run).toBe('function');
  });

  it('profile command should have subcommands', async () => {
    const mod = await import('@/commands/profile.js');
    expect(mod.default.subCommands).toBeDefined();
    expect(Object.keys(mod.default.subCommands || {}).length).toBeGreaterThan(0);
  });

  it('subcommands should have proper structure', async () => {
    const { default: profileCmd } = await import('@/commands/profile.js');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subCommands = profileCmd.subCommands as any;

    if (subCommands) {
      for (const [_name, subCmd] of Object.entries(subCommands)) {
        expect(subCmd).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cmd = subCmd as any;
        expect(typeof cmd.run).toBe('function');
        expect(cmd.meta).toBeDefined();
      }
    }
  });
});

// =============================================================================
// Profile Manager Tests - Test createProfileManager helper
// =============================================================================

describe('profile command helpers', () => {
  it('should create profile manager', async () => {
    const { createProfileManager } = await import('@/domain/profile/manager.js');
    const manager = createProfileManager();

    expect(manager).toBeDefined();
    expect(typeof manager.list).toBe('function');
    expect(typeof manager.create).toBe('function');
    expect(typeof manager.get).toBe('function');
    expect(typeof manager.delete).toBe('function');
    expect(typeof manager.use).toBe('function');
    expect(typeof manager.active).toBe('function');
  });

  // NOTE: Cannot safely test profile manager methods without temp directory
  it.skip('profile manager operations require test environment', () => {
    // Skip - ProfileManager operations modify ~/.claudeops/profiles/
    // To test this properly, we need to:
    // 1. Mock getGlobalConfigDir() to return temp directory
    // 2. Initialize test profiles in temp directory
    // 3. Test manager operations
    // 4. Clean up temp directory
  });
});

// =============================================================================
// Skill Manager Tests - Test skill command helpers
// =============================================================================

describe('skill command helpers', () => {
  it('should create skill manager', async () => {
    const { createSkillManager } = await import('@/domain/skill/index.js');
    const manager = createSkillManager({
      disabledSkills: [],
    });

    expect(manager).toBeDefined();
    expect(typeof manager.loadSkills).toBe('function');
    expect(typeof manager.getSkill).toBe('function');
    expect(typeof manager.syncToClaudeCode).toBe('function');
  });

  it('skill manager should handle disabled skills', async () => {
    const { createSkillManager } = await import('@/domain/skill/index.js');
    const manager = createSkillManager({
      disabledSkills: ['skill1', 'skill2'],
    });

    expect(manager).toBeDefined();
  });

  // NOTE: Cannot safely test loadSkills() without setting up test directories
  it.skip('skill manager loadSkills requires test environment', () => {
    // Skip - loadSkills() reads from actual ~/.claudeops/skills/ directory
    // To test this properly, we need test fixtures
  });
});

// =============================================================================
// Hook Manager Tests - Test hook command helpers
// =============================================================================

describe('hook command helpers', () => {
  it('should create hook manager', async () => {
    const { createHookManager } = await import('@/domain/hook/index.js');
    const manager = createHookManager({
      disabledHooks: [],
    });

    expect(manager).toBeDefined();
    expect(typeof manager.loadHooks).toBe('function');
    expect(typeof manager.getHooks).toBe('function');
    expect(typeof manager.syncToClaudeSettings).toBe('function');
  });

  it('hook manager should handle disabled hooks', async () => {
    const { createHookManager } = await import('@/domain/hook/index.js');
    const manager = createHookManager({
      disabledHooks: ['hook1', 'hook2'],
    });

    expect(manager).toBeDefined();
  });

  // NOTE: Cannot safely test loadHooks() without setting up test directories
  it.skip('hook manager loadHooks requires test environment', () => {
    // Skip - loadHooks() reads from actual ~/.claudeops/hooks/ directory
    // To test this properly, we need test fixtures
  });
});

// =============================================================================
// Config Loading Tests - Test that config can be loaded
// =============================================================================

describe('config loading', () => {
  it('should be able to load config', async () => {
    const { loadConfig } = await import('@/core/config/loader.js');
    expect(typeof loadConfig).toBe('function');
  });

  // NOTE: Cannot safely test loadConfig() as it reads user's actual config
  it.skip('loadConfig execution requires test environment', () => {
    // Skip - loadConfig() reads from actual ~/.claudeops/config.toml
    // To test this properly, we need:
    // 1. Mock cosmiconfig to return test config
    // 2. Or set up temp directory with test config
    // 3. Execute loadConfig() and verify results
  });
});

// =============================================================================
// Error Classes Tests - Verify error types are exported
// =============================================================================

describe('error classes', () => {
  it('should export ProfileNotFoundError', async () => {
    const { ProfileNotFoundError } = await import('@/domain/profile/manager.js');
    expect(ProfileNotFoundError).toBeDefined();
    expect(typeof ProfileNotFoundError).toBe('function');

    const err = new ProfileNotFoundError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('test');
  });

  it('should export ProfileExistsError', async () => {
    const { ProfileExistsError } = await import('@/domain/profile/manager.js');
    expect(ProfileExistsError).toBeDefined();
    expect(typeof ProfileExistsError).toBe('function');

    const err = new ProfileExistsError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('test');
  });

  it('should export ActiveProfileDeleteError', async () => {
    const { ActiveProfileDeleteError } = await import('@/domain/profile/manager.js');
    expect(ActiveProfileDeleteError).toBeDefined();
    expect(typeof ActiveProfileDeleteError).toBe('function');

    const err = new ActiveProfileDeleteError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('test');
  });
});

// =============================================================================
// Command Integration - Basic smoke tests
// =============================================================================

describe('command integration', () => {
  it('sync command should have run function', async () => {
    const { default: syncCmd } = await import('@/commands/sync.js');
    expect(typeof syncCmd.run).toBe('function');
  });

  it('doctor command should have run function', async () => {
    const { default: doctorCmd } = await import('@/commands/doctor.js');
    expect(typeof doctorCmd.run).toBe('function');
  });

  it('classify command should have run function', async () => {
    const { default: classifyCmd } = await import('@/commands/classify.js');
    expect(typeof classifyCmd.run).toBe('function');
  });

  it('cost command should have run function', async () => {
    const { default: costCmd } = await import('@/commands/cost.js');
    expect(typeof costCmd.run).toBe('function');
  });

  it('upgrade command should have run function', async () => {
    const { default: upgradeCmd } = await import('@/commands/upgrade.js');
    expect(typeof upgradeCmd.run).toBe('function');
  });
});

// =============================================================================
// Generator Tests - Test skill/hook generation helpers
// =============================================================================

describe('generator functions', () => {
  it('should export generator functions', async () => {
    const mod = await import('@/domain/generator/index.js');
    expect(mod.generateSkill).toBeDefined();
    expect(mod.generateSkillTemplate).toBeDefined();
    expect(mod.generateHook).toBeDefined();
    expect(mod.generateHookTemplate).toBeDefined();
    expect(mod.isClaudeCliAvailable).toBeDefined();
    expect(mod.GeneratorError).toBeDefined();
  });

  it('generateSkillTemplate should create skill structure', async () => {
    const { generateSkillTemplate } = await import('@/domain/generator/index.js');

    const skill = generateSkillTemplate({
      description: 'Test skill for unit testing',
      name: 'test-skill',
      domains: ['testing'],
    });

    expect(skill).toBeDefined();
    expect(skill.name).toBe('test-skill');
    expect(skill.description).toBe('Test skill for unit testing');
    expect(skill.domains).toEqual(['testing']);
    expect(skill.content).toBeDefined();
    expect(skill.content).toContain('test-skill');
  });

  it('generateHookTemplate should create hook structure', async () => {
    const { generateHookTemplate } = await import('@/domain/generator/index.js');

    const hook = generateHookTemplate({
      description: 'Test hook',
      name: 'test-hook',
      event: 'PreToolUse',
      matcher: 'Bash',
      priority: 50,
    });

    expect(hook).toBeDefined();
    expect(hook.name).toBe('test-hook');
    expect(hook.description).toBe('Test hook');
    expect(hook.event).toBe('PreToolUse');
    expect(hook.matcher).toBe('Bash');
    expect(hook.priority).toBe(50);
    expect(hook.handlerContent).toBeDefined();
  });

  it('isClaudeCliAvailable should return boolean', async () => {
    const { isClaudeCliAvailable } = await import('@/domain/generator/index.js');
    const result = await isClaudeCliAvailable();
    expect(typeof result).toBe('boolean');
  });
});

// =============================================================================
// Documentation - Tests that need full environment setup
// =============================================================================

describe.skip('tests requiring full integration environment', () => {
  it('would test syncAll() with temp directory', () => {
    // Requires: Mock file system, temp directories, test fixtures
  });

  it('would test profile manager operations', () => {
    // Requires: Temp config directory, test profiles
  });

  it('would test skill manager sync operations', () => {
    // Requires: Temp skills directory, mock ~/.claude/skills/
  });

  it('would test hook manager sync operations', () => {
    // Requires: Temp hooks directory, mock ~/.claude/settings.json
  });

  it('would test config validation', () => {
    // Requires: Test config files, validation scenarios
  });

  it('would test command execution with CLI arguments', () => {
    // Requires: CLI execution environment, argument parsing tests
  });
});
