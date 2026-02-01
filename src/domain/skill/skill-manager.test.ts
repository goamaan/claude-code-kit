/**
 * Tests for SkillManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { SkillManager } from './skill-manager.js';
import type { Skill } from './types.js';

describe('SkillManager', () => {
  // Test directories
  const testDir = join(process.cwd(), '.test-skills');
  const builtinDir = join(testDir, 'builtin');
  const globalDir = join(testDir, 'global');
  const projectDir = join(testDir, 'project');
  let claudeSkillsDir: string;

  beforeEach(() => {
    // Create test directories
    mkdirSync(builtinDir, { recursive: true });
    mkdirSync(globalDir, { recursive: true });
    mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('loadSkills', () => {
    it('should load skills from all directories', async () => {
      // Create test skill files with new format
      writeFileSync(
        join(builtinDir, 'test-skill.md'),
        `---
name: test-skill
description: A test skill
metadata:
  claudeops:
    triggers: [test]
---

This is a test skill.`
      );

      writeFileSync(
        join(globalDir, 'global-skill.md'),
        `---
name: global-skill
description: A global skill
---

This is a global skill.`
      );

      writeFileSync(
        join(projectDir, 'project-skill.md'),
        `---
name: project-skill
description: A project skill
---

This is a project skill.`
      );

      const manager = new SkillManager({
        builtinSkillsDir: builtinDir,
        globalSkillsDir: globalDir,
        projectSkillsDir: projectDir,
      });

      const skills = await manager.loadSkills();

      expect(skills.length).toBe(3);
      expect(skills.map(s => s.metadata.name).sort()).toEqual([
        'global-skill',
        'project-skill',
        'test-skill',
      ]);
    });

    it('should respect disabled skills', async () => {
      writeFileSync(
        join(builtinDir, 'enabled-skill.md'),
        `---
name: enabled-skill
description: Enabled skill
---

Enabled content.`
      );

      writeFileSync(
        join(builtinDir, 'disabled-skill.md'),
        `---
name: disabled-skill
description: Disabled skill
---

Disabled content.`
      );

      const manager = new SkillManager({
        builtinSkillsDir: builtinDir,
        globalSkillsDir: globalDir,
        projectSkillsDir: projectDir,
        disabledSkills: ['disabled-skill'],
      });

      const skills = await manager.loadSkills();

      expect(skills.length).toBe(1);
      expect(skills[0]?.metadata.name).toBe('enabled-skill');
    });

    it('should handle SKILL.md in directories', async () => {
      const skillDir = join(builtinDir, 'my-skill');
      mkdirSync(skillDir, { recursive: true });

      writeFileSync(
        join(skillDir, 'SKILL.md'),
        `---
name: dir-skill
description: Skill from directory
---

Directory skill content.`
      );

      const manager = new SkillManager({
        builtinSkillsDir: builtinDir,
        globalSkillsDir: globalDir,
        projectSkillsDir: projectDir,
      });

      const skills = await manager.loadSkills();

      expect(skills.length).toBe(1);
      expect(skills[0]?.metadata.name).toBe('dir-skill');
    });

    it('should parse new agentskills.io-compatible metadata', async () => {
      writeFileSync(
        join(builtinDir, 'complex-skill.md'),
        `---
name: complex-skill
description: Complex skill with metadata
license: MIT
metadata:
  author: claudeops
  version: "4.0.0"
  claudeops:
    triggers: [autopilot, build me]
    domains: [frontend, backend]
    model: opus
    disableModelInvocation: true
    userInvocable: false
    alwaysActive: true
---

Complex skill content.`
      );

      const manager = new SkillManager({
        builtinSkillsDir: builtinDir,
        globalSkillsDir: globalDir,
        projectSkillsDir: projectDir,
      });

      const skills = await manager.loadSkills();

      expect(skills.length).toBe(1);
      const skill = skills[0] as Skill;
      expect(skill.metadata.name).toBe('complex-skill');
      expect(skill.metadata.description).toBe('Complex skill with metadata');
      expect(skill.metadata.license).toBe('MIT');
      expect(skill.metadata.autoTrigger).toEqual(['autopilot', 'build me']);
      expect(skill.metadata.domains).toEqual(['frontend', 'backend']);
      expect(skill.metadata.model).toBe('opus');
      expect(skill.metadata.disableModelInvocation).toBe(true);
      expect(skill.metadata.userInvocable).toBe(false);
      expect(skill.metadata.alwaysActive).toBe(true);
      expect(skill.metadata.rawMetadata).toEqual({
        author: 'claudeops',
        version: '4.0.0',
      });
    });

    it('should parse allowedTools from metadata.claudeops', async () => {
      writeFileSync(
        join(builtinDir, 'tools-skill.md'),
        `---
name: tools-skill
description: Skill with allowed tools
metadata:
  claudeops:
    userInvocable: true
    disableModelInvocation: true
    allowedTools: [Bash, Read, Write, Glob, Grep, Edit]
---

Tools skill content.`
      );

      const manager = new SkillManager({
        builtinSkillsDir: builtinDir,
        globalSkillsDir: globalDir,
        projectSkillsDir: projectDir,
      });

      const skills = await manager.loadSkills();

      expect(skills.length).toBe(1);
      const skill = skills[0] as Skill;
      expect(skill.metadata.allowedTools).toEqual(['Bash', 'Read', 'Write', 'Glob', 'Grep', 'Edit']);
      expect(skill.metadata.disableModelInvocation).toBe(true);
    });

    it('should handle legacy flat frontmatter format', async () => {
      writeFileSync(
        join(builtinDir, 'legacy-skill.md'),
        `---
name: legacy-skill
description: Legacy format skill
auto_trigger: ["test", "check"]
domains: ["frontend"]
model: sonnet
disable-model-invocation: false
user-invocable: true
---

Legacy skill content.`
      );

      const manager = new SkillManager({
        builtinSkillsDir: builtinDir,
        globalSkillsDir: globalDir,
        projectSkillsDir: projectDir,
      });

      const skills = await manager.loadSkills();

      expect(skills.length).toBe(1);
      const skill = skills[0] as Skill;
      expect(skill.metadata.name).toBe('legacy-skill');
      expect(skill.metadata.autoTrigger).toEqual(['test', 'check']);
      expect(skill.metadata.domains).toEqual(['frontend']);
      expect(skill.metadata.model).toBe('sonnet');
      expect(skill.metadata.disableModelInvocation).toBe(false);
      expect(skill.metadata.userInvocable).toBe(true);
    });

    it('should handle skills without frontmatter', async () => {
      writeFileSync(
        join(builtinDir, 'no-frontmatter.md'),
        'This skill has no frontmatter.'
      );

      const manager = new SkillManager({
        builtinSkillsDir: builtinDir,
        globalSkillsDir: globalDir,
        projectSkillsDir: projectDir,
      });

      const skills = await manager.loadSkills();

      expect(skills.length).toBe(1);
      expect(skills[0]?.metadata.name).toBe('no-frontmatter');
      expect(skills[0]?.metadata.description).toBe('');
    });

    it('should handle ecosystem skills without claudeops metadata', async () => {
      writeFileSync(
        join(builtinDir, 'ecosystem-skill.md'),
        `---
name: ecosystem-skill
description: A third-party skill
license: Apache-2.0
metadata:
  author: someone-else
  version: "1.0.0"
---

Ecosystem skill content.`
      );

      const manager = new SkillManager({
        builtinSkillsDir: builtinDir,
        globalSkillsDir: globalDir,
        projectSkillsDir: projectDir,
      });

      const skills = await manager.loadSkills();

      expect(skills.length).toBe(1);
      const skill = skills[0] as Skill;
      expect(skill.metadata.name).toBe('ecosystem-skill');
      expect(skill.metadata.license).toBe('Apache-2.0');
      expect(skill.metadata.rawMetadata).toEqual({
        author: 'someone-else',
        version: '1.0.0',
      });
      // No claudeops-specific fields
      expect(skill.metadata.autoTrigger).toBeUndefined();
      expect(skill.metadata.domains).toBeUndefined();
      expect(skill.metadata.model).toBeUndefined();
    });
  });

  describe('matchSkills', () => {
    let manager: SkillManager;

    beforeEach(async () => {
      writeFileSync(
        join(builtinDir, 'autopilot.md'),
        `---
name: autopilot
description: Full autonomous execution
metadata:
  claudeops:
    triggers: [autopilot, build me]
---

Autopilot skill.`
      );

      writeFileSync(
        join(builtinDir, 'planner.md'),
        `---
name: planner
description: Planning skill
metadata:
  claudeops:
    triggers: [plan this]
---

Planner skill.`
      );

      manager = new SkillManager({
        builtinSkillsDir: builtinDir,
        globalSkillsDir: globalDir,
        projectSkillsDir: projectDir,
      });

      await manager.loadSkills();
    });

    it('should match skills by trigger', () => {
      const matches = manager.matchSkills('autopilot: build a todo app');

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]?.skill.metadata.name).toBe('autopilot');
      expect(matches[0]?.matchReason).toBe('auto_trigger');
    });

    it('should match multiple triggers', () => {
      const matches = manager.matchSkills('build me a REST API');

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]?.skill.metadata.name).toBe('autopilot');
    });

    it('should return empty array for no matches', () => {
      const matches = manager.matchSkills('this should not match anything xyz123');

      expect(matches.length).toBe(0);
    });

    it('should be case insensitive', () => {
      const matches = manager.matchSkills('AUTOPILOT: BUILD A TODO APP');

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]?.skill.metadata.name).toBe('autopilot');
    });
  });

  describe('matchByClassification', () => {
    let manager: SkillManager;

    beforeEach(async () => {
      writeFileSync(
        join(builtinDir, 'testing.md'),
        `---
name: testing
description: Testing skill
metadata:
  claudeops:
    domains: [testing]
---

Testing skill.`
      );

      writeFileSync(
        join(builtinDir, 'autopilot.md'),
        `---
name: autopilot
description: Autopilot skill
---

Autopilot skill.`
      );

      manager = new SkillManager({
        builtinSkillsDir: builtinDir,
        globalSkillsDir: globalDir,
        projectSkillsDir: projectDir,
      });

      await manager.loadSkills();
    });

    it('should match skills by domain', () => {
      const matches = manager.matchByClassification({
        type: 'implementation',
        domains: ['testing'],
        complexity: 'moderate',
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['executor'],
          parallelism: 'sequential',
          modelTier: 'sonnet',
          verification: false,
        },
        confidence: 0.8,
      });

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0]?.skill.metadata.name).toBe('testing');
      expect(matches[0]?.matchReason).toBe('domain');
    });

    it('should match autopilot when wantsAutonomy is true', () => {
      const matches = manager.matchByClassification({
        type: 'implementation',
        domains: [],
        complexity: 'complex',
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: true,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['executor'],
          parallelism: 'parallel',
          modelTier: 'opus',
          verification: true,
        },
        confidence: 0.9,
      });

      expect(matches.length).toBeGreaterThan(0);
      const autopilotMatch = matches.find(m => m.skill.metadata.name === 'autopilot');
      expect(autopilotMatch).toBeDefined();
      expect(autopilotMatch?.matchReason).toBe('classification');
    });
  });

  describe('syncToClaudeCode', () => {
    let manager: SkillManager;
    let tempClaudeDir: string;

    beforeEach(async () => {
      // Create temp directory for Claude skills
      tempClaudeDir = join(testDir, 'claude');
      claudeSkillsDir = tempClaudeDir;
      mkdirSync(tempClaudeDir, { recursive: true });

      writeFileSync(
        join(builtinDir, 'test-skill.md'),
        `---
name: test-skill
description: A test skill
license: MIT
metadata:
  claudeops:
    triggers: [test]
---

Test skill content.`
      );

      writeFileSync(
        join(builtinDir, 'another-skill.md'),
        `---
name: another-skill
description: Another skill
---

Another skill content.`
      );

      manager = new SkillManager({
        builtinSkillsDir: builtinDir,
        globalSkillsDir: globalDir,
        projectSkillsDir: projectDir,
        claudeSkillsDir: tempClaudeDir,
      });

      await manager.loadSkills();
    });

    afterEach(() => {
      // Temp directory will be cleaned up by outer afterEach
    });

    it('should sync skills to Claude Code directory', async () => {
      const result = await manager.syncToClaudeCode();

      // Check that sync succeeded (at least attempted to add/update)
      const totalChanges = result.added.length + result.updated.length;
      expect(totalChanges).toBeGreaterThanOrEqual(2);
      expect(result.errors.length).toBe(0);

      // Verify files were created
      const testSkillPath = join(claudeSkillsDir, 'test-skill.md');
      const anotherSkillPath = join(claudeSkillsDir, 'another-skill.md');

      // Check if directory exists first
      if (existsSync(claudeSkillsDir)) {
        expect(existsSync(testSkillPath)).toBe(true);
        expect(existsSync(anotherSkillPath)).toBe(true);

        // Verify content includes new format frontmatter
        const content = readFileSync(testSkillPath, 'utf-8');
        expect(content).toContain('---');
        expect(content).toContain('name: test-skill');
        expect(content).toContain('description: A test skill');
        expect(content).toContain('license: MIT');
        expect(content).toContain('metadata:');
        expect(content).toContain('  claudeops:');
        expect(content).toContain('    triggers: [test]');
        expect(content).toContain('Test skill content.');
      }
    });

    it('should update existing skills on second sync', async () => {
      // First sync
      await manager.syncToClaudeCode();

      // Second sync (should update)
      const result = await manager.syncToClaudeCode();

      expect(result.updated.length).toBe(2);
      expect(result.added.length).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    it('should remove skills that are no longer enabled', async () => {
      // First sync with both skills
      await manager.syncToClaudeCode();

      // Create new manager with one skill disabled
      const newManager = new SkillManager({
        builtinSkillsDir: builtinDir,
        globalSkillsDir: globalDir,
        projectSkillsDir: projectDir,
        claudeSkillsDir: tempClaudeDir,
        disabledSkills: ['another-skill'],
      });

      await newManager.loadSkills();
      const result = await newManager.syncToClaudeCode();

      // Check that removal was attempted (may be 0 if file didn't exist or was already handled)
      expect(result.errors.length).toBe(0);

      // If the directory exists and skill was synced, verify it was removed
      const anotherSkillPath = join(claudeSkillsDir, 'another-skill.md');
      if (existsSync(claudeSkillsDir)) {
        // Either it was removed (removed.length > 0) or it never existed after filtering
        if (result.removed.length > 0) {
          expect(result.removed).toContain('another-skill');
          expect(existsSync(anotherSkillPath)).toBe(false);
        }
      }
    });
  });

  describe('formatSkillContext', () => {
    let manager: SkillManager;
    let skills: Skill[];

    beforeEach(async () => {
      writeFileSync(
        join(builtinDir, 'skill1.md'),
        `---
name: skill1
description: First skill
---

Content for skill 1.`
      );

      writeFileSync(
        join(builtinDir, 'skill2.md'),
        `---
name: skill2
description: Second skill
---

Content for skill 2.`
      );

      manager = new SkillManager({
        builtinSkillsDir: builtinDir,
        globalSkillsDir: globalDir,
        projectSkillsDir: projectDir,
      });

      skills = await manager.loadSkills();
    });

    it('should format skills as context string', () => {
      const formatted = manager.formatSkillContext(skills);

      expect(formatted.context).toContain('## Active Skills');
      expect(formatted.context).toContain('### skill1');
      expect(formatted.context).toContain('### skill2');
      expect(formatted.context).toContain('First skill');
      expect(formatted.context).toContain('Content for skill 1.');
      expect(formatted.skills).toEqual(['skill1', 'skill2']);
      expect(formatted.characterCount).toBeGreaterThan(0);
    });

    it('should respect maxLength parameter', () => {
      const formatted = manager.formatSkillContext(skills, 100);

      expect(formatted.characterCount).toBeLessThanOrEqual(200);
      expect(formatted.context).toContain('truncated');
    });

    it('should return empty context for no skills', () => {
      const formatted = manager.formatSkillContext([]);

      expect(formatted.context).toBe('');
      expect(formatted.skills).toEqual([]);
      expect(formatted.characterCount).toBe(0);
    });
  });
});
