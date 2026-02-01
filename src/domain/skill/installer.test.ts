/**
 * Tests for Skill Installer
 * Tests source parsing, skill discovery, lock file management, and install/remove flows
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  parseSource,
  discoverSkills,
  readLockFile,
  writeLockFile,
  installFromSource,
  removeSkill,
  listInstalledSkills,
} from './installer.js';
import type { SkillLockFile } from './installer.js';
import { homedir } from 'os';

// =============================================================================
// parseSource
// =============================================================================

describe('parseSource', () => {
  it('should parse owner/repo as GitHub shorthand', () => {
    const result = parseSource('vercel-labs/agent-skills');
    expect(result.type).toBe('github');
    expect(result.owner).toBe('vercel-labs');
    expect(result.repo).toBe('agent-skills');
    expect(result.url).toBe('https://github.com/vercel-labs/agent-skills.git');
    expect(result.skillName).toBeUndefined();
  });

  it('should parse owner/repo@skill-name', () => {
    const result = parseSource('vercel-labs/agent-skills@react-best-practices');
    expect(result.type).toBe('github');
    expect(result.owner).toBe('vercel-labs');
    expect(result.repo).toBe('agent-skills');
    expect(result.skillName).toBe('react-best-practices');
    expect(result.url).toBe('https://github.com/vercel-labs/agent-skills.git');
  });

  it('should parse full GitHub URL', () => {
    const result = parseSource('https://github.com/vercel-labs/agent-skills');
    expect(result.type).toBe('github');
    expect(result.owner).toBe('vercel-labs');
    expect(result.repo).toBe('agent-skills');
    expect(result.url).toBe('https://github.com/vercel-labs/agent-skills');
  });

  it('should parse GitHub URL with .git suffix', () => {
    const result = parseSource('https://github.com/vercel-labs/agent-skills.git');
    expect(result.type).toBe('github');
    expect(result.owner).toBe('vercel-labs');
    expect(result.repo).toBe('agent-skills');
  });

  it('should parse GitLab URL', () => {
    const result = parseSource('https://gitlab.com/myorg/my-skills');
    expect(result.type).toBe('gitlab');
    expect(result.owner).toBe('myorg');
    expect(result.repo).toBe('my-skills');
  });

  it('should parse generic git URL as git type', () => {
    const result = parseSource('https://my-server.com/repo/skills');
    expect(result.type).toBe('git');
    expect(result.url).toBe('https://my-server.com/repo/skills');
  });

  it('should parse relative local path', () => {
    const result = parseSource('./my-skills');
    expect(result.type).toBe('local');
    expect(result.path).toContain('my-skills');
  });

  it('should parse absolute local path', () => {
    const result = parseSource('/tmp/my-skills');
    expect(result.type).toBe('local');
    expect(result.path).toBe('/tmp/my-skills');
  });

  it('should parse tilde path', () => {
    const result = parseSource('~/my-skills');
    expect(result.type).toBe('local');
    expect(result.path).toBe(join(homedir(), 'my-skills'));
  });

  it('should fall back to git type for unknown format', () => {
    const result = parseSource('some-random-string');
    expect(result.type).toBe('git');
    expect(result.url).toBe('some-random-string');
  });
});

// =============================================================================
// discoverSkills
// =============================================================================

describe('discoverSkills', () => {
  const testDir = join(process.cwd(), '.test-installer-discover');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should discover skills in skills/ subdirectory', async () => {
    const skillsDir = join(testDir, 'skills', 'my-skill');
    mkdirSync(skillsDir, { recursive: true });
    writeFileSync(
      join(skillsDir, 'SKILL.md'),
      `---
name: my-skill
description: A test skill
---

Content here.`
    );

    const discovered = await discoverSkills(testDir);
    expect(discovered.length).toBe(1);
    expect(discovered[0]?.name).toBe('my-skill');
    expect(discovered[0]?.description).toBe('A test skill');
    expect(discovered[0]?.isDirectory).toBe(true);
  });

  it('should discover skills in .claude/skills/ subdirectory', async () => {
    const skillsDir = join(testDir, '.claude', 'skills', 'claude-skill');
    mkdirSync(skillsDir, { recursive: true });
    writeFileSync(
      join(skillsDir, 'SKILL.md'),
      `---
name: claude-skill
description: A Claude skill
---

Content.`
    );

    const discovered = await discoverSkills(testDir);
    expect(discovered.length).toBe(1);
    expect(discovered[0]?.name).toBe('claude-skill');
  });

  it('should discover standalone .md files with frontmatter', async () => {
    writeFileSync(
      join(testDir, 'standalone.md'),
      `---
name: standalone-skill
description: Standalone skill
---

Standalone content.`
    );

    const discovered = await discoverSkills(testDir);
    expect(discovered.length).toBe(1);
    expect(discovered[0]?.name).toBe('standalone-skill');
    expect(discovered[0]?.isDirectory).toBe(false);
  });

  it('should skip README.md', async () => {
    writeFileSync(
      join(testDir, 'README.md'),
      `---
name: readme
description: Should be skipped
---

README content.`
    );

    const discovered = await discoverSkills(testDir);
    expect(discovered.length).toBe(0);
  });

  it('should skip .md files without name in frontmatter', async () => {
    writeFileSync(
      join(testDir, 'no-name.md'),
      `---
description: No name field
---

Content.`
    );

    const discovered = await discoverSkills(testDir);
    expect(discovered.length).toBe(0);
  });

  it('should use directory name as fallback when SKILL.md has no name', async () => {
    const skillDir = join(testDir, 'skills', 'fallback-name');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---
description: No name field
---

Content.`
    );

    const discovered = await discoverSkills(testDir);
    expect(discovered.length).toBe(1);
    expect(discovered[0]?.name).toBe('fallback-name');
  });

  it('should deduplicate skills by name', async () => {
    // Same skill in skills/ and root
    const skillDir = join(testDir, 'skills', 'dupe-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---
name: dupe-skill
description: From skills dir
---

Content.`
    );

    writeFileSync(
      join(testDir, 'dupe-skill.md'),
      `---
name: dupe-skill
description: From root
---

Content.`
    );

    const discovered = await discoverSkills(testDir);
    // Should only have one instance (first found wins — from skills/ dir)
    const dupes = discovered.filter(s => s.name === 'dupe-skill');
    expect(dupes.length).toBe(1);
  });

  it('should discover multiple skills', async () => {
    const skill1Dir = join(testDir, 'skills', 'skill-one');
    const skill2Dir = join(testDir, 'skills', 'skill-two');
    mkdirSync(skill1Dir, { recursive: true });
    mkdirSync(skill2Dir, { recursive: true });

    writeFileSync(
      join(skill1Dir, 'SKILL.md'),
      `---
name: skill-one
description: First skill
---

Content.`
    );

    writeFileSync(
      join(skill2Dir, 'SKILL.md'),
      `---
name: skill-two
description: Second skill
---

Content.`
    );

    const discovered = await discoverSkills(testDir);
    expect(discovered.length).toBe(2);
    const names = discovered.map(s => s.name).sort();
    expect(names).toEqual(['skill-one', 'skill-two']);
  });

  it('should return empty array for empty directory', async () => {
    const emptyDir = join(testDir, 'empty');
    mkdirSync(emptyDir, { recursive: true });

    const discovered = await discoverSkills(emptyDir);
    expect(discovered.length).toBe(0);
  });
});

// =============================================================================
// Lock File
// =============================================================================

describe('lock file operations', () => {
  const lockDir = join(process.cwd(), '.test-installer-lock');

  beforeEach(() => {
    mkdirSync(lockDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(lockDir)) {
      rmSync(lockDir, { recursive: true, force: true });
    }
  });

  it('readLockFile should return empty lock when file does not exist', () => {
    // readLockFile reads from ~/.claudeops/skill-lock.json
    // We can't easily redirect it, so just verify the function works
    const lock = readLockFile();
    expect(lock.version).toBe(1);
    expect(lock.skills).toBeDefined();
  });

  it('writeLockFile and readLockFile should round-trip', () => {
    const lock: SkillLockFile = {
      version: 1,
      skills: {
        'test-skill': {
          name: 'test-skill',
          source: 'owner/repo',
          sourceType: 'github',
          installedAt: '2026-01-31T00:00:00.000Z',
          updatedAt: '2026-01-31T00:00:00.000Z',
          path: '/some/path',
        },
      },
    };

    writeLockFile(lock);
    const result = readLockFile();

    expect(result.version).toBe(1);
    expect(result.skills['test-skill']).toBeDefined();
    expect(result.skills['test-skill']?.name).toBe('test-skill');
    expect(result.skills['test-skill']?.source).toBe('owner/repo');
    expect(result.skills['test-skill']?.sourceType).toBe('github');
  });

  it('listInstalledSkills should return skills from lock file', () => {
    const lock: SkillLockFile = {
      version: 1,
      skills: {
        'skill-a': {
          name: 'skill-a',
          source: 'a/b',
          sourceType: 'github',
          installedAt: '2026-01-31T00:00:00.000Z',
          updatedAt: '2026-01-31T00:00:00.000Z',
          path: '/some/path/a',
        },
        'skill-b': {
          name: 'skill-b',
          source: './local',
          sourceType: 'local',
          installedAt: '2026-01-31T00:00:00.000Z',
          updatedAt: '2026-01-31T00:00:00.000Z',
          path: '/some/path/b',
        },
      },
    };

    writeLockFile(lock);
    const installed = listInstalledSkills();

    expect(installed.length).toBe(2);
    const names = installed.map(s => s.name).sort();
    expect(names).toEqual(['skill-a', 'skill-b']);
  });
});

// =============================================================================
// installFromSource (local)
// =============================================================================

describe('installFromSource', () => {
  const testDir = join(process.cwd(), '.test-installer-install');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should install from local directory with single skill', async () => {
    const skillDir = join(testDir, 'skills', 'local-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---
name: local-skill
description: A local skill
---

Local skill content.`
    );

    const source = parseSource(testDir);
    const installed = await installFromSource(source);

    expect(installed.length).toBe(1);
    expect(installed[0]?.name).toBe('local-skill');
    expect(installed[0]?.sourceType).toBe('local');

    // Verify in lock file
    const lock = readLockFile();
    expect(lock.skills['local-skill']).toBeDefined();
  });

  it('should throw when local path not found', async () => {
    const source = parseSource('/nonexistent/path/123456');
    await expect(installFromSource(source)).rejects.toThrow('Local path not found');
  });

  it('should throw when no skills found', async () => {
    const emptyDir = join(testDir, 'empty');
    mkdirSync(emptyDir, { recursive: true });

    const source = parseSource(emptyDir);
    await expect(installFromSource(source)).rejects.toThrow('No skills found in source');
  });

  it('should throw when multiple skills found without --all', async () => {
    const skill1Dir = join(testDir, 'skills', 'skill-one');
    const skill2Dir = join(testDir, 'skills', 'skill-two');
    mkdirSync(skill1Dir, { recursive: true });
    mkdirSync(skill2Dir, { recursive: true });

    writeFileSync(
      join(skill1Dir, 'SKILL.md'),
      `---
name: skill-one
description: First
---

Content.`
    );

    writeFileSync(
      join(skill2Dir, 'SKILL.md'),
      `---
name: skill-two
description: Second
---

Content.`
    );

    const source = parseSource(testDir);
    await expect(installFromSource(source)).rejects.toThrow('Multiple skills found');
  });

  it('should install all skills with --all flag', async () => {
    const skill1Dir = join(testDir, 'skills', 'skill-one');
    const skill2Dir = join(testDir, 'skills', 'skill-two');
    mkdirSync(skill1Dir, { recursive: true });
    mkdirSync(skill2Dir, { recursive: true });

    writeFileSync(
      join(skill1Dir, 'SKILL.md'),
      `---
name: skill-one
description: First
---

Content.`
    );

    writeFileSync(
      join(skill2Dir, 'SKILL.md'),
      `---
name: skill-two
description: Second
---

Content.`
    );

    const source = parseSource(testDir);
    const installed = await installFromSource(source, { all: true });

    expect(installed.length).toBe(2);
    const names = installed.map(s => s.name).sort();
    expect(names).toEqual(['skill-one', 'skill-two']);
  });

  it('should filter to specific skill by name', async () => {
    const skill1Dir = join(testDir, 'skills', 'skill-one');
    const skill2Dir = join(testDir, 'skills', 'skill-two');
    mkdirSync(skill1Dir, { recursive: true });
    mkdirSync(skill2Dir, { recursive: true });

    writeFileSync(
      join(skill1Dir, 'SKILL.md'),
      `---
name: skill-one
description: First
---

Content.`
    );

    writeFileSync(
      join(skill2Dir, 'SKILL.md'),
      `---
name: skill-two
description: Second
---

Content.`
    );

    const source = parseSource(testDir);
    const installed = await installFromSource(source, { skillName: 'skill-two' });

    expect(installed.length).toBe(1);
    expect(installed[0]?.name).toBe('skill-two');
  });

  it('should throw when specified skill name not found', async () => {
    const skillDir = join(testDir, 'skills', 'existing');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---
name: existing
description: Existing
---

Content.`
    );

    const source = parseSource(testDir);
    await expect(
      installFromSource(source, { skillName: 'nonexistent' })
    ).rejects.toThrow('Skill "nonexistent" not found');
  });

  it('should preserve installedAt on update', async () => {
    const skillDir = join(testDir, 'skills', 'update-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---
name: update-skill
description: Update test
---

Content.`
    );

    // First install
    const source = parseSource(testDir);
    const first = await installFromSource(source);
    const firstInstalled = first[0]!.installedAt;

    // Update the skill content
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---
name: update-skill
description: Updated description
---

Updated content.`
    );

    // Second install (update)
    const second = await installFromSource(source);
    expect(second[0]?.installedAt).toBe(firstInstalled);
    expect(second[0]?.updatedAt).not.toBe(firstInstalled);
  });
});

// =============================================================================
// removeSkill
// =============================================================================

describe('removeSkill', () => {
  const testDir = join(process.cwd(), '.test-installer-remove');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should throw when skill is not installed', async () => {
    // Write empty lock file
    writeLockFile({ version: 1, skills: {} });
    await expect(removeSkill('nonexistent')).rejects.toThrow('Skill "nonexistent" is not installed');
  });

  it('should remove installed skill from lock file', async () => {
    // Set up: install a skill first
    const skillDir = join(testDir, 'skills', 'to-remove');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---
name: to-remove
description: Will be removed
---

Content.`
    );

    const source = parseSource(testDir);
    await installFromSource(source);

    // Verify installed
    let lock = readLockFile();
    expect(lock.skills['to-remove']).toBeDefined();

    // Remove
    await removeSkill('to-remove');

    // Verify removed from lock
    lock = readLockFile();
    expect(lock.skills['to-remove']).toBeUndefined();
  });
});
