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
import type { MergedConfig } from '@/types';
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

<!-- claudeops:managed:start -->
Managed content
<!-- claudeops:managed:end -->
`;

      const result = extractUserContent(content);

      expect(result.before).toContain('My Custom Content');
      expect(result.before).toContain('Some user text here');
    });

    it('should extract content after managed section', () => {
      const content = `<!-- claudeops:managed:start -->
Managed content
<!-- claudeops:managed:end -->

# User Notes

My custom notes here.`;

      const result = extractUserContent(content);

      expect(result.after).toContain('User Notes');
      expect(result.after).toContain('My custom notes here');
    });

    it('should extract both before and after content', () => {
      const content = `# Before Content

<!-- claudeops:managed:start -->
Managed
<!-- claudeops:managed:end -->

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
    it('should generate CLAUDE.md with managed section markers', async () => {
      const config = createTestConfig();

      const result = await generateClaudeMd(config);

      expect(result.content).toContain('<!-- claudeops:managed:start -->');
      expect(result.content).toContain('<!-- claudeops:managed:end -->');
    });

    it('should include profile information when enabled', async () => {
      const config = createTestConfig({
        profile: { name: 'my-profile', description: 'My description', source: 'global' },
      });

      const result = await generateClaudeMd(config, { includeProfile: true });

      expect(result.content).toContain('my-profile');
      expect(result.sections).toContain('profile');
    });

    it('should skip profile information when disabled', async () => {
      const config = createTestConfig();

      const result = await generateClaudeMd(config, { includeProfile: false });

      expect(result.sections).not.toContain('profile');
    });

    it('should include model configuration', async () => {
      const config = createTestConfig({
        model: {
          default: 'opus',
          routing: { simple: 'haiku', standard: 'sonnet', complex: 'opus' },
          overrides: {},
        },
      });

      const result = await generateClaudeMd(config);

      expect(result.content).toContain('opus');
      expect(result.content).toContain('Model Configuration');
      expect(result.sections).toContain('model');
    });

    it('should include skills when enabled', async () => {
      const config = createTestConfig({
        skills: { enabled: ['skill-a', 'skill-b'], disabled: [] },
      });

      const result = await generateClaudeMd(config, { includeSkills: true });

      expect(result.content).toContain('skill-a');
      expect(result.content).toContain('skill-b');
      expect(result.sections).toContain('skills');
    });

    it('should include agents when enabled', async () => {
      const config = createTestConfig({
        agents: {
          'executor': { model: 'sonnet', priority: 50 },
          'architect': { model: 'opus', priority: 100 },
        },
      });

      const result = await generateClaudeMd(config, { includeAgents: true });

      expect(result.content).toContain('executor');
      expect(result.content).toContain('architect');
      expect(result.sections).toContain('agents');
    });

    it('should include profile content', async () => {
      const config = createTestConfig({
        content: '# Custom Profile Content\n\nThis is from the profile.',
      });

      const result = await generateClaudeMd(config);

      expect(result.content).toContain('Custom Profile Content');
      expect(result.sections).toContain('profile-content');
    });

    it('should preserve user content from existing CLAUDE.md', async () => {
      const config = createTestConfig();
      const existing = `# User Content

My important notes.

<!-- claudeops:managed:start -->
Old managed content
<!-- claudeops:managed:end -->`;

      const result = await generateClaudeMd(config, {
        existingContent: existing,
        preserveUserContent: true,
      });

      expect(result.content).toContain('My important notes');
      expect(result.preservedUserContent).toBe(true);
    });

    it('should use custom header when provided', async () => {
      const config = createTestConfig();

      const result = await generateClaudeMd(config, {
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
      const content = `<!-- claudeops:managed:start -->
Content
<!-- claudeops:managed:end -->`;

      expect(hasManagedSection(content)).toBe(true);
    });

    it('should return false when no managed section', () => {
      const content = '# Just some content';

      expect(hasManagedSection(content)).toBe(false);
    });

    it('should return false when only start marker', () => {
      const content = '<!-- claudeops:managed:start -->';

      expect(hasManagedSection(content)).toBe(false);
    });

    it('should return false when only end marker', () => {
      const content = '<!-- claudeops:managed:end -->';

      expect(hasManagedSection(content)).toBe(false);
    });
  });

  // ===========================================================================
  // getManagedSection
  // ===========================================================================

  describe('getManagedSection', () => {
    it('should return managed section content', () => {
      const content = `Before
<!-- claudeops:managed:start -->
Managed Content Here
<!-- claudeops:managed:end -->
After`;

      const result = getManagedSection(content);

      expect(result).toBe('Managed Content Here');
    });

    it('should return null when no managed section', () => {
      const content = '# No managed section';

      expect(getManagedSection(content)).toBeNull();
    });

    it('should handle empty managed section', () => {
      const content = `<!-- claudeops:managed:start -->
<!-- claudeops:managed:end -->`;

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
<!-- claudeops:managed:start -->
Old Content
<!-- claudeops:managed:end -->
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
      expect(result).toContain('<!-- claudeops:managed:start -->');
      expect(result).toContain('Managed');
      expect(result).toContain('<!-- claudeops:managed:end -->');
    });
  });

  // ===========================================================================
  // createMinimalClaudeMd
  // ===========================================================================

  describe('createMinimalClaudeMd', () => {
    it('should create minimal CLAUDE.md with model info', async () => {
      const config = createTestConfig();

      const result = await createMinimalClaudeMd(config);

      expect(result).toContain('Model Configuration');
      expect(result).toContain('<!-- claudeops:managed:start -->');
    });

    it('should not include profile, agents, skills, or hooks', async () => {
      const config = createTestConfig({
        skills: { enabled: ['skill-a'], disabled: [] },
        agents: { executor: { model: 'sonnet', priority: 50 } },
      });

      const result = await createMinimalClaudeMd(config);

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
      const content = `<!-- claudeops:managed:start -->
Content
<!-- claudeops:managed:end -->`;

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
