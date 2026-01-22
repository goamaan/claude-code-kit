/**
 * CLAUDE.md Generator Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateClaudeMd,
  extractUserContent,
  hasManagedSection,
  getManagedSection,
  replaceManagedSection,
  createMinimalClaudeMd,
  parseClaudeMdInfo,
} from './claudemd-generator.js';
import type { MergedSetup, MergedConfig } from '@/types';
import { DEFAULT_MERGED_CONFIG } from '@/types';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestConfig(overrides: Partial<MergedConfig> = {}): MergedConfig {
  return {
    ...DEFAULT_MERGED_CONFIG,
    profile: {
      name: 'test-profile',
      description: 'Test profile description',
      source: 'global',
    },
    ...overrides,
  };
}

function createTestSetup(overrides: Partial<MergedSetup> = {}): MergedSetup {
  return {
    name: 'test-setup',
    version: '1.0.0',
    description: 'Test setup',
    requires: {
      addons: [],
    },
    skills: {
      enabled: [],
      disabled: [],
    },
    agents: {},
    mcp: {
      recommended: [],
      required: [],
    },
    hooks: {
      templates: [],
    },
    commands: {},
    content: '',
    sources: [],
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('claudemd-generator', () => {
  // ===========================================================================
  // extractUserContent
  // ===========================================================================

  describe('extractUserContent', () => {
    it('should extract content before managed section', () => {
      const content = `# My Custom Content

Some user text here.

<!-- claude-kit:managed:start -->
Managed content
<!-- claude-kit:managed:end -->
`;

      const result = extractUserContent(content);

      expect(result.before).toContain('My Custom Content');
      expect(result.before).toContain('Some user text here');
    });

    it('should extract content after managed section', () => {
      const content = `<!-- claude-kit:managed:start -->
Managed content
<!-- claude-kit:managed:end -->

# User Notes

My custom notes here.`;

      const result = extractUserContent(content);

      expect(result.after).toContain('User Notes');
      expect(result.after).toContain('My custom notes here');
    });

    it('should extract both before and after content', () => {
      const content = `# Before Content

<!-- claude-kit:managed:start -->
Managed
<!-- claude-kit:managed:end -->

# After Content`;

      const result = extractUserContent(content);

      expect(result.before).toContain('Before Content');
      expect(result.after).toContain('After Content');
    });

    it('should treat all content as "before" when no managed section', () => {
      const content = `# All User Content

No managed section here.`;

      const result = extractUserContent(content);

      expect(result.before).toContain('All User Content');
      expect(result.after).toBe('');
    });

    it('should handle empty content', () => {
      const result = extractUserContent('');

      expect(result.before).toBe('');
      expect(result.after).toBe('');
    });
  });

  // ===========================================================================
  // generateClaudeMd
  // ===========================================================================

  describe('generateClaudeMd', () => {
    it('should generate CLAUDE.md with managed section markers', () => {
      const setup = createTestSetup();
      const config = createTestConfig();

      const result = generateClaudeMd(setup, config);

      expect(result.content).toContain('<!-- claude-kit:managed:start -->');
      expect(result.content).toContain('<!-- claude-kit:managed:end -->');
    });

    it('should include profile information when enabled', () => {
      const setup = createTestSetup();
      const config = createTestConfig({
        profile: { name: 'my-profile', description: 'My description', source: 'global' },
      });

      const result = generateClaudeMd(setup, config, { includeProfile: true });

      expect(result.content).toContain('my-profile');
      expect(result.sections).toContain('profile');
    });

    it('should skip profile information when disabled', () => {
      const setup = createTestSetup();
      const config = createTestConfig();

      const result = generateClaudeMd(setup, config, { includeProfile: false });

      expect(result.sections).not.toContain('profile');
    });

    it('should include model configuration', () => {
      const setup = createTestSetup();
      const config = createTestConfig({
        model: {
          default: 'opus',
          routing: { simple: 'haiku', standard: 'sonnet', complex: 'opus' },
          overrides: {},
        },
      });

      const result = generateClaudeMd(setup, config);

      expect(result.content).toContain('opus');
      expect(result.content).toContain('Model Configuration');
      expect(result.sections).toContain('model');
    });

    it('should include skills when enabled', () => {
      const setup = createTestSetup({
        skills: { enabled: ['skill-a', 'skill-b'], disabled: [] },
      });
      const config = createTestConfig();

      const result = generateClaudeMd(setup, config, { includeSkills: true });

      expect(result.content).toContain('skill-a');
      expect(result.content).toContain('skill-b');
      expect(result.sections).toContain('skills');
    });

    it('should include agents when enabled', () => {
      const setup = createTestSetup({
        agents: {
          'executor': { model: 'sonnet', priority: 50, enabled: true },
          'architect': { model: 'opus', priority: 100, enabled: true },
        },
      });
      const config = createTestConfig();

      const result = generateClaudeMd(setup, config, { includeAgents: true });

      expect(result.content).toContain('executor');
      expect(result.content).toContain('architect');
      expect(result.sections).toContain('agents');
    });

    it('should include hooks when enabled', () => {
      const setup = createTestSetup({
        hooks: {
          templates: [
            { name: 'bash-hook', description: 'Bash handler', matcher: 'Bash', handler: 'bash.ts', priority: 0 },
          ],
        },
      });
      const config = createTestConfig();

      const result = generateClaudeMd(setup, config, { includeHooks: true });

      expect(result.content).toContain('bash-hook');
      expect(result.sections).toContain('hooks');
    });

    it('should include setup content', () => {
      const setup = createTestSetup({
        content: '# Custom Setup Content\n\nThis is from the setup.',
      });
      const config = createTestConfig();

      const result = generateClaudeMd(setup, config);

      expect(result.content).toContain('Custom Setup Content');
      expect(result.sections).toContain('setup-content');
    });

    it('should preserve user content from existing CLAUDE.md', () => {
      const setup = createTestSetup();
      const config = createTestConfig();
      const existing = `# User Content

My important notes.

<!-- claude-kit:managed:start -->
Old managed content
<!-- claude-kit:managed:end -->`;

      const result = generateClaudeMd(setup, config, {
        existingContent: existing,
        preserveUserContent: true,
      });

      expect(result.content).toContain('My important notes');
      expect(result.preservedUserContent).toBe(true);
    });

    it('should use custom header when provided', () => {
      const setup = createTestSetup();
      const config = createTestConfig();

      const result = generateClaudeMd(setup, config, {
        customHeader: '# My Custom Header',
      });

      expect(result.content).toContain('My Custom Header');
    });
  });

  // ===========================================================================
  // hasManagedSection
  // ===========================================================================

  describe('hasManagedSection', () => {
    it('should return true when managed section exists', () => {
      const content = `<!-- claude-kit:managed:start -->
Content
<!-- claude-kit:managed:end -->`;

      expect(hasManagedSection(content)).toBe(true);
    });

    it('should return false when no managed section', () => {
      const content = '# Just some content';

      expect(hasManagedSection(content)).toBe(false);
    });

    it('should return false when only start marker', () => {
      const content = '<!-- claude-kit:managed:start -->';

      expect(hasManagedSection(content)).toBe(false);
    });

    it('should return false when only end marker', () => {
      const content = '<!-- claude-kit:managed:end -->';

      expect(hasManagedSection(content)).toBe(false);
    });
  });

  // ===========================================================================
  // getManagedSection
  // ===========================================================================

  describe('getManagedSection', () => {
    it('should return managed section content', () => {
      const content = `Before
<!-- claude-kit:managed:start -->
Managed Content Here
<!-- claude-kit:managed:end -->
After`;

      const result = getManagedSection(content);

      expect(result).toBe('Managed Content Here');
    });

    it('should return null when no managed section', () => {
      const content = '# No managed section';

      expect(getManagedSection(content)).toBeNull();
    });

    it('should handle empty managed section', () => {
      const content = `<!-- claude-kit:managed:start -->
<!-- claude-kit:managed:end -->`;

      const result = getManagedSection(content);

      expect(result).toBe('');
    });
  });

  // ===========================================================================
  // replaceManagedSection
  // ===========================================================================

  describe('replaceManagedSection', () => {
    it('should replace existing managed section', () => {
      const existing = `Before
<!-- claude-kit:managed:start -->
Old Content
<!-- claude-kit:managed:end -->
After`;

      const result = replaceManagedSection(existing, 'New Content');

      expect(result).toContain('New Content');
      expect(result).not.toContain('Old Content');
      expect(result).toContain('Before');
      expect(result).toContain('After');
    });

    it('should append managed section when none exists', () => {
      const existing = '# User Content';

      const result = replaceManagedSection(existing, 'Managed');

      expect(result).toContain('# User Content');
      expect(result).toContain('<!-- claude-kit:managed:start -->');
      expect(result).toContain('Managed');
      expect(result).toContain('<!-- claude-kit:managed:end -->');
    });
  });

  // ===========================================================================
  // createMinimalClaudeMd
  // ===========================================================================

  describe('createMinimalClaudeMd', () => {
    it('should create minimal CLAUDE.md with model info', () => {
      const setup = createTestSetup();
      const config = createTestConfig();

      const result = createMinimalClaudeMd(setup, config);

      expect(result).toContain('Model Configuration');
      expect(result).toContain('<!-- claude-kit:managed:start -->');
    });

    it('should not include profile, agents, skills, or hooks', () => {
      const setup = createTestSetup({
        skills: { enabled: ['skill-a'], disabled: [] },
        agents: { executor: { model: 'sonnet', priority: 50, enabled: true } },
        hooks: { templates: [{ name: 'hook', matcher: 'test', handler: 'test.ts', priority: 0 }] },
      });
      const config = createTestConfig();

      const result = createMinimalClaudeMd(setup, config);

      expect(result).not.toContain('## Skills');
      expect(result).not.toContain('## Agents');
      expect(result).not.toContain('## Hooks');
    });
  });

  // ===========================================================================
  // parseClaudeMdInfo
  // ===========================================================================

  describe('parseClaudeMdInfo', () => {
    it('should detect managed section', () => {
      const content = `<!-- claude-kit:managed:start -->
Content
<!-- claude-kit:managed:end -->`;

      const result = parseClaudeMdInfo(content);

      expect(result.hasManaged).toBe(true);
    });

    it('should extract profile name', () => {
      const content = `**Name:** my-profile`;

      const result = parseClaudeMdInfo(content);

      expect(result.profile).toBe('my-profile');
    });

    it('should extract default model', () => {
      const content = `**Default Model:** opus`;

      const result = parseClaudeMdInfo(content);

      expect(result.model).toBe('opus');
    });

    it('should extract enabled skills', () => {
      const content = `### Enabled

- skill-a
- skill-b
`;

      const result = parseClaudeMdInfo(content);

      expect(result.skills.enabled).toContain('skill-a');
      expect(result.skills.enabled).toContain('skill-b');
    });

    it('should extract disabled skills', () => {
      const content = `### Disabled

- disabled-skill
`;

      const result = parseClaudeMdInfo(content);

      expect(result.skills.disabled).toContain('disabled-skill');
    });

    it('should extract agents from table', () => {
      const content = `| Agent | Model | Priority |
|-------|-------|----------|
| executor | sonnet | 50 |
| architect | opus | 100 |`;

      const result = parseClaudeMdInfo(content);

      expect(result.agents).toContain('executor');
      expect(result.agents).toContain('architect');
    });

    it('should handle empty content', () => {
      const result = parseClaudeMdInfo('');

      expect(result.hasManaged).toBe(false);
      expect(result.profile).toBeUndefined();
      expect(result.model).toBeUndefined();
      expect(result.skills.enabled).toEqual([]);
      expect(result.skills.disabled).toEqual([]);
      expect(result.agents).toEqual([]);
    });
  });
});
