/**
 * Tests for Learning Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { LearningManager, parseLearningFile, formatLearning } from './manager.js';
import type { Learning } from './types.js';

const testDir = join(process.cwd(), '.test-learnings');

function makeLearning(overrides: Partial<Learning> = {}): Learning {
  return {
    date: '2026-01-31T12:00:00.000Z',
    category: 'build-error',
    component: 'typescript',
    symptoms: ['TS4111: Property comes from index signature'],
    rootCause: 'index-signature',
    resolution: 'code-fix',
    tags: ['typescript', 'index-signature', 'strict-mode'],
    confidence: 0.8,
    problem: 'TypeScript strict mode disallows property access on index signatures.',
    solution: 'Use bracket notation obj["key"] instead of obj.key.',
    why: 'TS strict mode treats index signature properties differently.',
    ...overrides,
  };
}

describe('LearningManager', () => {
  let manager: LearningManager;

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    manager = new LearningManager({ learningsDir: testDir });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('ensureStructure', () => {
    it('should create all category directories', async () => {
      await manager.ensureStructure();

      expect(existsSync(join(testDir, 'build-errors'))).toBe(true);
      expect(existsSync(join(testDir, 'test-failures'))).toBe(true);
      expect(existsSync(join(testDir, 'type-errors'))).toBe(true);
      expect(existsSync(join(testDir, 'runtime-errors'))).toBe(true);
      expect(existsSync(join(testDir, 'config-issues'))).toBe(true);
      expect(existsSync(join(testDir, 'patterns'))).toBe(true);
      expect(existsSync(join(testDir, 'workarounds'))).toBe(true);
      expect(existsSync(join(testDir, 'conventions'))).toBe(true);
    });
  });

  describe('save and list', () => {
    it('should save a learning and list it', async () => {
      const learning = makeLearning();
      const filePath = await manager.save(learning);

      expect(existsSync(filePath)).toBe(true);

      const listed = await manager.list();
      expect(listed.length).toBe(1);
      expect(listed[0]?.learning.category).toBe('build-error');
      expect(listed[0]?.learning.component).toBe('typescript');
    });

    it('should save to correct category directory', async () => {
      await manager.save(makeLearning({ category: 'test-failure' }));

      const listed = await manager.list();
      expect(listed.length).toBe(1);
      expect(listed[0]?.filePath).toContain('test-failures');
    });

    it('should list multiple learnings', async () => {
      await manager.save(makeLearning({ symptoms: ['error-one'], tags: ['tag1'] }));
      await manager.save(makeLearning({
        category: 'test-failure',
        symptoms: ['error-two'],
        tags: ['tag2'],
      }));

      const listed = await manager.list();
      expect(listed.length).toBe(2);
    });

    it('should return empty list when no learnings exist', async () => {
      const listed = await manager.list();
      expect(listed.length).toBe(0);
    });
  });

  describe('get', () => {
    it('should get a specific learning by filename', async () => {
      await manager.save(makeLearning());

      const listed = await manager.list();
      const fileName = listed[0]!.fileName;

      const result = await manager.get(fileName);
      expect(result).not.toBeNull();
      expect(result!.learning.component).toBe('typescript');
    });

    it('should return null for nonexistent file', async () => {
      const result = await manager.get('nonexistent.md');
      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    it('should find learnings by tag keyword', async () => {
      await manager.save(makeLearning({
        symptoms: ['ts strict error'],
        tags: ['strict-mode'],
        component: 'tsc',
      }));
      await manager.save(makeLearning({
        category: 'test-failure',
        component: 'vitest',
        symptoms: ['mock import failed'],
        tags: ['vitest', 'mock', 'import'],
      }));

      const results = await manager.search(['vitest']);
      expect(results.length).toBe(1);
      expect(results[0]?.learning.component).toBe('vitest');
    });

    it('should find learnings by symptom keyword', async () => {
      await manager.save(makeLearning({
        symptoms: ['property comes from index signature'],
      }));

      const results = await manager.search(['index']);
      expect(results.length).toBe(1);
    });

    it('should find learnings by component keyword', async () => {
      await manager.save(makeLearning());

      const results = await manager.search(['typescript']);
      expect(results.length).toBe(1);
    });

    it('should return empty for no matches', async () => {
      await manager.save(makeLearning());

      const results = await manager.search(['python', 'django']);
      expect(results.length).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all learnings', async () => {
      await manager.save(makeLearning({ symptoms: ['one'], tags: ['a'] }));
      await manager.save(makeLearning({
        category: 'test-failure',
        symptoms: ['two'],
        tags: ['b'],
      }));

      const count = await manager.clear();
      expect(count).toBe(2);

      const listed = await manager.list();
      expect(listed.length).toBe(0);
    });

    it('should return 0 when no learnings exist', async () => {
      const count = await manager.clear();
      expect(count).toBe(0);
    });
  });

  describe('evolve', () => {
    it('should generate skill from cluster of 3+ learnings sharing a tag', async () => {
      const skillsDir = join(testDir, 'generated-skills');

      // Save 3 learnings sharing the "typescript" tag
      await manager.save(makeLearning({
        symptoms: ['error-1'],
        tags: ['typescript', 'strict'],
      }));
      await manager.save(makeLearning({
        symptoms: ['error-2'],
        tags: ['typescript', 'types'],
      }));
      await manager.save(makeLearning({
        symptoms: ['error-3'],
        tags: ['typescript', 'generics'],
      }));

      const generated = await manager.evolve(skillsDir);

      expect(generated.length).toBeGreaterThanOrEqual(1);
      const tsSkill = generated.find(g => g.name === 'project-typescript');
      expect(tsSkill).toBeDefined();
      expect(tsSkill!.learningCount).toBe(3);
      expect(existsSync(tsSkill!.path)).toBe(true);

      // Verify skill content
      const content = readFileSync(tsSkill!.path, 'utf8');
      expect(content).toContain('name: project-typescript');
      expect(content).toContain('Project Patterns: typescript');
    });

    it('should return empty when fewer than 3 learnings', async () => {
      const skillsDir = join(testDir, 'generated-skills');

      await manager.save(makeLearning({ symptoms: ['one'], tags: ['a'] }));
      await manager.save(makeLearning({ symptoms: ['two'], tags: ['a'] }));

      const generated = await manager.evolve(skillsDir);
      expect(generated.length).toBe(0);
    });

    it('should not generate skill when no tag has 3+ entries', async () => {
      const skillsDir = join(testDir, 'generated-skills');

      await manager.save(makeLearning({ symptoms: ['1'], tags: ['a', 'b'] }));
      await manager.save(makeLearning({ symptoms: ['2'], tags: ['c', 'd'] }));
      await manager.save(makeLearning({ symptoms: ['3'], tags: ['e', 'f'] }));

      const generated = await manager.evolve(skillsDir);
      expect(generated.length).toBe(0);
    });
  });

  describe('schema', () => {
    it('should return default schema when no file exists', async () => {
      const schema = await manager.getSchema();
      expect(schema.version).toBe(1);
      expect(schema.categories.length).toBeGreaterThan(0);
    });

    it('should save and read schema', async () => {
      const schema = {
        version: 1 as const,
        generatedFrom: 'scanner' as const,
        categories: ['build-error' as const, 'test-failure' as const],
        components: ['typescript', 'vitest'],
        rootCauses: ['type-mismatch'],
        resolutionTypes: ['code-fix' as const],
      };

      await manager.saveSchema(schema);

      const loaded = await manager.getSchema();
      expect(loaded.generatedFrom).toBe('scanner');
      expect(loaded.components).toEqual(['typescript', 'vitest']);
    });
  });
});

// =============================================================================
// Parsing / Formatting
// =============================================================================

describe('parseLearningFile', () => {
  it('should parse a well-formed learning file', () => {
    const content = `---
date: 2026-01-31T12:00:00.000Z
category: build-error
component: typescript
symptoms:
  - "TS4111: Property comes from index signature"
root_cause: index-signature
resolution: code-fix
tags: [typescript, index-signature]
confidence: 0.8
---

## Problem
TypeScript strict mode error.

## Solution
Use bracket notation.

## Why
Index signatures are different.
`;

    const result = parseLearningFile(content);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('build-error');
    expect(result!.component).toBe('typescript');
    expect(result!.rootCause).toBe('index-signature');
    expect(result!.tags).toEqual(['typescript', 'index-signature']);
    expect(result!.confidence).toBe(0.8);
    expect(result!.problem).toContain('TypeScript strict mode error');
    expect(result!.solution).toContain('bracket notation');
    expect(result!.why).toContain('Index signatures');
  });

  it('should return null for content without frontmatter', () => {
    const result = parseLearningFile('No frontmatter here.');
    expect(result).toBeNull();
  });

  it('should return null for unclosed frontmatter', () => {
    const result = parseLearningFile('---\nname: test\nNo closing delimiter.');
    expect(result).toBeNull();
  });
});

describe('formatLearning', () => {
  it('should produce valid markdown with frontmatter', () => {
    const learning = makeLearning();
    const formatted = formatLearning(learning);

    expect(formatted).toContain('---');
    expect(formatted).toContain('date: 2026-01-31T12:00:00.000Z');
    expect(formatted).toContain('category: build-error');
    expect(formatted).toContain('component: typescript');
    expect(formatted).toContain('tags: [typescript, index-signature, strict-mode]');
    expect(formatted).toContain('## Problem');
    expect(formatted).toContain('## Solution');
    expect(formatted).toContain('## Why');
  });

  it('should round-trip through parse', () => {
    const original = makeLearning();
    const formatted = formatLearning(original);
    const parsed = parseLearningFile(formatted);

    expect(parsed).not.toBeNull();
    expect(parsed!.category).toBe(original.category);
    expect(parsed!.component).toBe(original.component);
    expect(parsed!.rootCause).toBe(original.rootCause);
    expect(parsed!.confidence).toBe(original.confidence);
  });
});
