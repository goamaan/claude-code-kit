/**
 * Generator Module Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateSkillTemplate,
  generateHookTemplate,
  buildSkillPrompt,
  buildHookPrompt,
} from './index.js';

describe('Generator Module', () => {
  describe('generateSkillTemplate', () => {
    it('should generate a basic skill template', () => {
      const result = generateSkillTemplate({
        description: 'A skill for code review',
        name: 'code-reviewer',
        domains: ['testing', 'backend'],
      });

      expect(result.name).toBe('code-reviewer');
      expect(result.description).toBe('A skill for code review');
      expect(result.domains).toEqual(['testing', 'backend']);
      expect(result.content).toContain('---');
      expect(result.content).toContain('name: code-reviewer');
    });

    it('should use default name when not provided', () => {
      const result = generateSkillTemplate({
        description: 'Test skill',
      });

      expect(result.name).toBe('custom-skill');
    });

    it('should default to general domain', () => {
      const result = generateSkillTemplate({
        description: 'Test skill',
      });

      expect(result.domains).toContain('general');
    });
  });

  describe('generateHookTemplate', () => {
    it('should generate a basic hook template', () => {
      const result = generateHookTemplate({
        description: 'A hook for logging',
        name: 'logger',
        event: 'PostToolUse',
        priority: 100,
      });

      expect(result.name).toBe('logger');
      expect(result.event).toBe('PostToolUse');
      expect(result.priority).toBe(100);
      expect(result.handlerContent).toContain('#!/usr/bin/env node');
    });

    it('should use defaults when not provided', () => {
      const result = generateHookTemplate({
        description: 'Test hook',
      });

      expect(result.name).toBe('custom-hook');
      expect(result.event).toBe('PreToolUse');
      expect(result.matcher).toBe('*');
      expect(result.priority).toBe(50);
    });
  });

  describe('buildSkillPrompt', () => {
    it('should build a basic prompt', () => {
      const prompt = buildSkillPrompt({
        description: 'Code review skill',
      });

      expect(prompt).toContain('Code review skill');
      expect(prompt).toContain('YAML frontmatter');
    });

    it('should include name when provided', () => {
      const prompt = buildSkillPrompt({
        description: 'Test',
        name: 'test-skill',
      });

      expect(prompt).toContain('test-skill');
    });

    it('should include domains when provided', () => {
      const prompt = buildSkillPrompt({
        description: 'Test',
        domains: ['frontend', 'testing'],
      });

      expect(prompt).toContain('frontend');
      expect(prompt).toContain('testing');
    });

    it('should include reference content when provided', () => {
      const prompt = buildSkillPrompt({
        description: 'Test',
        referenceContent: 'Reference content here',
      });

      expect(prompt).toContain('Reference content here');
    });
  });

  describe('buildHookPrompt', () => {
    it('should build a basic prompt', () => {
      const prompt = buildHookPrompt({
        description: 'Logging hook',
      });

      expect(prompt).toContain('Logging hook');
      expect(prompt).toContain('PreToolUse');
    });

    it('should include event type', () => {
      const prompt = buildHookPrompt({
        description: 'Test',
        event: 'PostToolUse',
      });

      expect(prompt).toContain('PostToolUse');
    });

    it('should include matcher pattern', () => {
      const prompt = buildHookPrompt({
        description: 'Test',
        matcher: 'Bash*',
      });

      expect(prompt).toContain('Bash*');
    });
  });
});
