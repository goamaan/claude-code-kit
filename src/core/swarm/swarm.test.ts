/**
 * Comprehensive tests for Swarm orchestration modules
 * Tests dependency-graph, spawner, and planner modules
 */

import { describe, it, expect } from 'vitest';
import {
  buildGraph,
  calculateDepths,
  topologicalSort,
  getParallelGroups,
  getReadyTasks,
  detectCycle,
  getCriticalPath,
  validateDependencies,
} from './dependency-graph.js';
import {
  selectModel,
  getAgentForDomain,
  generateWorkerPrompt,
  createSpawnConfig,
} from './spawner.js';
import {
  classifyComplexity,
  shouldDecompose,
  getSuggestedSubtasks,
  getSwarmRecommendation,
} from './planner.js';
import type { SwarmTask } from '../../types/swarm.js';
import type { IntentClassification } from '../classifier/types.js';

// =============================================================================
// Helper Functions
// =============================================================================

function createMockTask(
  id: string,
  blockedBy: string[] = [],
  blocks: string[] = []
): SwarmTask {
  return {
    id,
    subject: `Task ${id}`,
    description: `Description for task ${id}`,
    status: 'pending',
    agent: 'executor',
    model: 'sonnet',
    blockedBy,
    blocks,
    createdAt: new Date(),
  };
}

function createMockClassification(
  type: IntentClassification['type'] = 'implementation',
  complexity: IntentClassification['complexity'] = 'moderate',
  domains: IntentClassification['domains'] = ['general']
): IntentClassification {
  return {
    type,
    complexity,
    domains,
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
    confidence: 0.85,
  };
}

// =============================================================================
// Dependency Graph Tests
// =============================================================================

describe('dependency-graph', () => {
  describe('buildGraph', () => {
    it('should create a dependency graph from tasks', () => {
      const tasks = [
        createMockTask('a', [], ['b']),
        createMockTask('b', ['a'], []),
      ];

      const graph = buildGraph(tasks);

      expect(graph.size).toBe(2);
      expect(graph.get('a')).toBeDefined();
      expect(graph.get('b')).toBeDefined();
      expect(graph.get('a')?.blockedBy).toEqual([]);
      expect(graph.get('b')?.blockedBy).toEqual(['a']);
    });

    it('should handle empty task list', () => {
      const graph = buildGraph([]);
      expect(graph.size).toBe(0);
    });

    it('should calculate depths correctly', () => {
      const tasks = [
        createMockTask('a', [], ['b']),
        createMockTask('b', ['a'], ['c']),
        createMockTask('c', ['b'], []),
      ];

      const graph = buildGraph(tasks);

      expect(graph.get('a')?.depth).toBe(0);
      expect(graph.get('b')?.depth).toBe(1);
      expect(graph.get('c')?.depth).toBe(2);
    });

    it('should handle parallel branches correctly', () => {
      const tasks = [
        createMockTask('a', [], ['c']),
        createMockTask('b', [], ['c']),
        createMockTask('c', ['a', 'b'], []),
      ];

      const graph = buildGraph(tasks);

      expect(graph.get('a')?.depth).toBe(0);
      expect(graph.get('b')?.depth).toBe(0);
      expect(graph.get('c')?.depth).toBe(1);
    });

    it('should handle diamond dependency pattern', () => {
      const tasks = [
        createMockTask('a', [], ['b', 'c']),
        createMockTask('b', ['a'], ['d']),
        createMockTask('c', ['a'], ['d']),
        createMockTask('d', ['b', 'c'], []),
      ];

      const graph = buildGraph(tasks);

      expect(graph.get('a')?.depth).toBe(0);
      expect(graph.get('b')?.depth).toBe(1);
      expect(graph.get('c')?.depth).toBe(1);
      expect(graph.get('d')?.depth).toBe(2);
    });
  });

  describe('calculateDepths', () => {
    it('should calculate depths for nodes with no dependencies', () => {
      const graph = new Map();
      graph.set('a', { taskId: 'a', blockedBy: [], blocks: ['b'], depth: 0 });
      graph.set('b', { taskId: 'b', blockedBy: ['a'], blocks: [], depth: 0 });

      calculateDepths(graph);

      expect(graph.get('a')?.depth).toBe(0);
      expect(graph.get('b')?.depth).toBe(1);
    });

    it('should handle multiple root nodes', () => {
      const graph = new Map();
      graph.set('a', { taskId: 'a', blockedBy: [], blocks: ['c'], depth: 0 });
      graph.set('b', { taskId: 'b', blockedBy: [], blocks: ['c'], depth: 0 });
      graph.set('c', { taskId: 'c', blockedBy: ['a', 'b'], blocks: [], depth: 0 });

      calculateDepths(graph);

      expect(graph.get('a')?.depth).toBe(0);
      expect(graph.get('b')?.depth).toBe(0);
      expect(graph.get('c')?.depth).toBe(1);
    });

    it('should handle empty graph', () => {
      const graph = new Map();
      calculateDepths(graph);
      expect(graph.size).toBe(0);
    });

    it('should handle missing dependency references', () => {
      const graph = new Map();
      graph.set('a', { taskId: 'a', blockedBy: [], blocks: ['nonexistent'], depth: 0 });

      calculateDepths(graph);

      expect(graph.get('a')?.depth).toBe(0);
    });
  });

  describe('topologicalSort', () => {
    it('should return valid topological order', () => {
      const tasks = [
        createMockTask('c', ['b'], []),
        createMockTask('a', [], ['b']),
        createMockTask('b', ['a'], ['c']),
      ];

      const order = topologicalSort(tasks);

      expect(order).toEqual(['a', 'b', 'c']);
    });

    it('should handle tasks with no dependencies', () => {
      const tasks = [
        createMockTask('a', [], []),
        createMockTask('b', [], []),
        createMockTask('c', [], []),
      ];

      const order = topologicalSort(tasks);

      expect(order).toHaveLength(3);
      expect(order).toContain('a');
      expect(order).toContain('b');
      expect(order).toContain('c');
    });

    it('should handle single task', () => {
      const tasks = [createMockTask('a', [], [])];
      const order = topologicalSort(tasks);
      expect(order).toEqual(['a']);
    });

    it('should handle empty task list', () => {
      const order = topologicalSort([]);
      expect(order).toEqual([]);
    });

    it('should throw error on cycle', () => {
      const tasks = [
        createMockTask('a', ['b'], ['b']),
        createMockTask('b', ['a'], ['a']),
      ];

      expect(() => topologicalSort(tasks)).toThrow('Dependency graph contains a cycle');
    });

    it('should handle complex dependency graph', () => {
      const tasks = [
        createMockTask('a', [], ['b', 'c']),
        createMockTask('b', ['a'], ['d']),
        createMockTask('c', ['a'], ['d']),
        createMockTask('d', ['b', 'c'], ['e']),
        createMockTask('e', ['d'], []),
      ];

      const order = topologicalSort(tasks);

      expect(order[0]).toBe('a');
      expect(order[order.length - 1]).toBe('e');
      expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
      expect(order.indexOf('a')).toBeLessThan(order.indexOf('c'));
      expect(order.indexOf('b')).toBeLessThan(order.indexOf('d'));
      expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'));
      expect(order.indexOf('d')).toBeLessThan(order.indexOf('e'));
    });
  });

  describe('getParallelGroups', () => {
    it('should group tasks by depth level', () => {
      const tasks = [
        createMockTask('a', [], ['c']),
        createMockTask('b', [], ['c']),
        createMockTask('c', ['a', 'b'], []),
      ];

      const groups = getParallelGroups(tasks);

      expect(groups).toHaveLength(2);
      expect(groups[0]).toHaveLength(2);
      expect(groups[0]).toContain('a');
      expect(groups[0]).toContain('b');
      expect(groups[1]).toEqual(['c']);
    });

    it('should handle sequential tasks', () => {
      const tasks = [
        createMockTask('a', [], ['b']),
        createMockTask('b', ['a'], ['c']),
        createMockTask('c', ['b'], []),
      ];

      const groups = getParallelGroups(tasks);

      expect(groups).toHaveLength(3);
      expect(groups[0]).toEqual(['a']);
      expect(groups[1]).toEqual(['b']);
      expect(groups[2]).toEqual(['c']);
    });

    it('should handle empty task list', () => {
      const groups = getParallelGroups([]);
      expect(groups).toEqual([]);
    });

    it('should handle single task', () => {
      const tasks = [createMockTask('a', [], [])];
      const groups = getParallelGroups(tasks);
      expect(groups).toEqual([['a']]);
    });

    it('should handle complex parallel structure', () => {
      const tasks = [
        createMockTask('a', [], ['d']),
        createMockTask('b', [], ['d']),
        createMockTask('c', [], ['d']),
        createMockTask('d', ['a', 'b', 'c'], ['e', 'f']),
        createMockTask('e', ['d'], []),
        createMockTask('f', ['d'], []),
      ];

      const groups = getParallelGroups(tasks);

      expect(groups).toHaveLength(3);
      expect(groups[0]).toHaveLength(3);
      expect(groups[1]).toEqual(['d']);
      expect(groups[2]).toHaveLength(2);
    });
  });

  describe('getReadyTasks', () => {
    it('should return tasks with no unresolved dependencies', () => {
      const tasks = [
        { ...createMockTask('a', [], []), status: 'completed' as const },
        createMockTask('b', ['a'], []),
        createMockTask('c', ['b'], []),
      ];

      const ready = getReadyTasks(tasks, ['a']);

      expect(ready).toEqual(['b']);
    });

    it('should return tasks with no dependencies', () => {
      const tasks = [
        createMockTask('a', [], []),
        createMockTask('b', [], []),
      ];

      const ready = getReadyTasks(tasks, []);

      expect(ready).toHaveLength(2);
      expect(ready).toContain('a');
      expect(ready).toContain('b');
    });

    it('should exclude tasks with incomplete dependencies', () => {
      const tasks = [
        createMockTask('a', [], []),
        createMockTask('b', [], []),
        createMockTask('c', ['a', 'b'], []),
      ];

      const ready = getReadyTasks(tasks, ['a']);

      expect(ready).not.toContain('c');
    });

    it('should exclude non-pending tasks', () => {
      const tasks = [
        { ...createMockTask('a', [], []), status: 'completed' as const },
        { ...createMockTask('b', [], []), status: 'in_progress' as const },
        { ...createMockTask('c', [], []), status: 'failed' as const },
      ];

      const ready = getReadyTasks(tasks, []);

      expect(ready).toEqual([]);
    });

    it('should handle empty task list', () => {
      const ready = getReadyTasks([], []);
      expect(ready).toEqual([]);
    });

    it('should handle tasks with multiple dependencies', () => {
      const tasks = [
        { ...createMockTask('a', [], []), status: 'completed' as const },
        { ...createMockTask('b', [], []), status: 'completed' as const },
        { ...createMockTask('c', [], []), status: 'completed' as const },
        createMockTask('d', ['a', 'b', 'c'], []),
      ];

      const ready = getReadyTasks(tasks, ['a', 'b', 'c']);

      expect(ready).toEqual(['d']);
    });
  });

  describe('detectCycle', () => {
    it('should detect simple cycle', () => {
      const tasks = [
        createMockTask('a', ['b'], ['b']),
        createMockTask('b', ['a'], ['a']),
      ];

      const cycle = detectCycle(tasks);

      expect(cycle).not.toBeNull();
      expect(cycle).toContain('a');
      expect(cycle).toContain('b');
    });

    it('should detect three-node cycle', () => {
      const tasks = [
        createMockTask('a', ['c'], ['b']),
        createMockTask('b', ['a'], ['c']),
        createMockTask('c', ['b'], ['a']),
      ];

      const cycle = detectCycle(tasks);

      expect(cycle).not.toBeNull();
      expect(cycle?.length).toBeGreaterThan(0);
    });

    it('should return null for acyclic graph', () => {
      const tasks = [
        createMockTask('a', [], ['b']),
        createMockTask('b', ['a'], ['c']),
        createMockTask('c', ['b'], []),
      ];

      const cycle = detectCycle(tasks);

      expect(cycle).toBeNull();
    });

    it('should return null for empty graph', () => {
      const cycle = detectCycle([]);
      expect(cycle).toBeNull();
    });

    it('should handle self-reference', () => {
      const tasks = [createMockTask('a', ['a'], ['a'])];

      const cycle = detectCycle(tasks);

      expect(cycle).not.toBeNull();
    });

    it('should handle disconnected components', () => {
      const tasks = [
        createMockTask('a', [], ['b']),
        createMockTask('b', ['a'], []),
        createMockTask('c', [], ['d']),
        createMockTask('d', ['c'], []),
      ];

      const cycle = detectCycle(tasks);

      expect(cycle).toBeNull();
    });
  });

  describe('getCriticalPath', () => {
    it('should find longest path in simple chain', () => {
      const tasks = [
        createMockTask('a', [], ['b']),
        createMockTask('b', ['a'], ['c']),
        createMockTask('c', ['b'], []),
      ];

      const path = getCriticalPath(tasks);

      expect(path).toEqual(['a', 'b', 'c']);
    });

    it('should find longest path with parallel branches', () => {
      const tasks = [
        createMockTask('a', [], ['c']),
        createMockTask('b', [], ['c']),
        createMockTask('c', ['a', 'b'], ['d']),
        createMockTask('d', ['c'], []),
      ];

      const path = getCriticalPath(tasks);

      expect(path).toHaveLength(3);
      expect(path[0]).toMatch(/a|b/);
      expect(path[1]).toBe('c');
      expect(path[2]).toBe('d');
    });

    it('should return empty array for empty task list', () => {
      const path = getCriticalPath([]);
      expect(path).toEqual([]);
    });

    it('should handle single task', () => {
      const tasks = [createMockTask('a', [], [])];
      const path = getCriticalPath(tasks);
      expect(path).toEqual(['a']);
    });

    it('should return empty array for cyclic graph', () => {
      const tasks = [
        createMockTask('a', ['b'], ['b']),
        createMockTask('b', ['a'], ['a']),
      ];

      const path = getCriticalPath(tasks);

      expect(path).toEqual([]);
    });

    it('should handle diamond pattern correctly', () => {
      const tasks = [
        createMockTask('a', [], ['b', 'c']),
        createMockTask('b', ['a'], ['d']),
        createMockTask('c', ['a'], ['e']),
        createMockTask('d', ['b'], ['f']),
        createMockTask('e', ['c'], ['f']),
        createMockTask('f', ['d', 'e'], []),
      ];

      const path = getCriticalPath(tasks);

      expect(path).toHaveLength(4);
      expect(path[0]).toBe('a');
      expect(path[path.length - 1]).toBe('f');
    });
  });

  describe('validateDependencies', () => {
    it('should validate correct dependencies', () => {
      const tasks = [
        createMockTask('a', [], ['b']),
        createMockTask('b', ['a'], []),
      ];

      const result = validateDependencies(tasks);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect non-existent task in blockedBy', () => {
      const tasks = [createMockTask('a', ['nonexistent'], [])];

      const result = validateDependencies(tasks);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('nonexistent');
      expect(result.errors[0]).toContain('blockedBy');
    });

    it('should detect non-existent task in blocks', () => {
      const tasks = [createMockTask('a', [], ['nonexistent'])];

      const result = validateDependencies(tasks);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('nonexistent');
      expect(result.errors[0]).toContain('blocks');
    });

    it('should detect self-reference in blockedBy', () => {
      const tasks = [createMockTask('a', ['a'], [])];

      const result = validateDependencies(tasks);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('self-reference');
      expect(result.errors[0]).toContain('blockedBy');
    });

    it('should detect self-reference in blocks', () => {
      const tasks = [createMockTask('a', [], ['a'])];

      const result = validateDependencies(tasks);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('self-reference') && e.includes('blocks'))).toBe(true);
    });

    it('should detect cycles', () => {
      const tasks = [
        createMockTask('a', ['b'], ['b']),
        createMockTask('b', ['a'], ['a']),
      ];

      const result = validateDependencies(tasks);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('cycle'))).toBe(true);
    });

    it('should detect multiple errors', () => {
      const tasks = [
        createMockTask('a', ['nonexistent'], ['a']),
      ];

      const result = validateDependencies(tasks);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should handle empty task list', () => {
      const result = validateDependencies([]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

// =============================================================================
// Spawner Tests
// =============================================================================

describe('spawner', () => {
  describe('selectModel', () => {
    it('should select haiku for trivial complexity', () => {
      expect(selectModel('trivial', 'executor')).toBe('haiku');
      expect(selectModel('trivial', 'explore')).toBe('haiku');
      expect(selectModel('trivial', 'architect')).toBe('haiku');
    });

    it('should select haiku for simple complexity with eligible agents', () => {
      expect(selectModel('simple', 'explore')).toBe('haiku');
      expect(selectModel('simple', 'writer')).toBe('haiku');
      expect(selectModel('simple', 'executor-low')).toBe('haiku');
    });

    it('should select sonnet for simple complexity with non-eligible agents', () => {
      expect(selectModel('simple', 'executor')).toBe('sonnet');
      expect(selectModel('simple', 'architect')).toBe('sonnet');
      expect(selectModel('simple', 'qa-tester')).toBe('sonnet');
    });

    it('should select sonnet for moderate complexity', () => {
      expect(selectModel('moderate', 'executor')).toBe('sonnet');
      expect(selectModel('moderate', 'explore')).toBe('sonnet');
      expect(selectModel('moderate', 'architect')).toBe('sonnet');
    });

    it('should select opus for complex complexity', () => {
      expect(selectModel('complex', 'executor')).toBe('opus');
      expect(selectModel('complex', 'architect')).toBe('opus');
    });

    it('should select opus for architectural complexity', () => {
      expect(selectModel('architectural', 'executor')).toBe('opus');
      expect(selectModel('architectural', 'planner')).toBe('opus');
    });

    it('should fallback to sonnet for unknown complexity', () => {
      expect(selectModel('unknown' as any, 'executor')).toBe('sonnet');
    });
  });

  describe('getAgentForDomain', () => {
    it('should return designer for frontend domain', () => {
      expect(getAgentForDomain(['frontend'])).toBe('designer');
    });

    it('should return executor for backend domain', () => {
      expect(getAgentForDomain(['backend'])).toBe('executor');
    });

    it('should return executor for database domain', () => {
      expect(getAgentForDomain(['database'])).toBe('executor');
    });

    it('should return security for security domain', () => {
      expect(getAgentForDomain(['security'])).toBe('security');
    });

    it('should return qa-tester for testing domain', () => {
      expect(getAgentForDomain(['testing'])).toBe('qa-tester');
    });

    it('should return writer for documentation domain', () => {
      expect(getAgentForDomain(['documentation'])).toBe('writer');
    });

    it('should return executor for general domain', () => {
      expect(getAgentForDomain(['general'])).toBe('executor');
    });

    it('should return executor for devops domain', () => {
      expect(getAgentForDomain(['devops'])).toBe('executor');
    });

    it('should return executor for empty domains', () => {
      expect(getAgentForDomain([])).toBe('executor');
    });

    it('should prioritize security over other domains', () => {
      expect(getAgentForDomain(['backend', 'security'])).toBe('security');
    });

    it('should prioritize testing over backend', () => {
      expect(getAgentForDomain(['backend', 'testing'])).toBe('qa-tester');
    });

    it('should prioritize frontend over backend', () => {
      expect(getAgentForDomain(['backend', 'frontend'])).toBe('designer');
    });
  });

  describe('generateWorkerPrompt', () => {
    it('should generate basic prompt without context', () => {
      const task = createMockTask('task-1');
      task.subject = 'Test Task';
      task.description = 'Test description';
      task.agent = 'executor';

      const prompt = generateWorkerPrompt(task);

      expect(prompt).toContain('executor worker agent');
      expect(prompt).toContain('Test Task');
      expect(prompt).toContain('Test description');
      expect(prompt).toContain('## Instructions');
      expect(prompt).toContain('## On Completion');
    });

    it('should include codebase context when provided', () => {
      const task = createMockTask('task-1');
      const context = {
        codebaseContext: 'function UserService() { ... }',
      };

      const prompt = generateWorkerPrompt(task, context);

      expect(prompt).toContain('function UserService');
    });

    it('should include previous results when provided', () => {
      const task = createMockTask('task-1');
      const context = {
        previousResults: 'Previous task completed successfully',
      };

      const prompt = generateWorkerPrompt(task, context);

      expect(prompt).toContain('## Previous Task Results');
      expect(prompt).toContain('Previous task completed successfully');
    });

    it('should include constraints when provided', () => {
      const task = createMockTask('task-1');
      const context = {
        constraints: ['Use TypeScript', 'Follow existing patterns'],
      };

      const prompt = generateWorkerPrompt(task, context);

      expect(prompt).toContain('## Constraints');
      expect(prompt).toContain('Use TypeScript');
      expect(prompt).toContain('Follow existing patterns');
    });

    it('should include all sections when full context provided', () => {
      const task = createMockTask('task-1');
      const context = {
        codebaseContext: 'Relevant code',
        previousResults: 'Previous results',
        constraints: ['Constraint 1', 'Constraint 2'],
      };

      const prompt = generateWorkerPrompt(task, context);

      expect(prompt).toContain('## Context');
      expect(prompt).toContain('## Previous Task Results');
      expect(prompt).toContain('## Instructions');
      expect(prompt).toContain('## Constraints');
      expect(prompt).toContain('## On Completion');
    });

    it('should not include Previous Task Results section without results', () => {
      const task = createMockTask('task-1');
      const prompt = generateWorkerPrompt(task);

      expect(prompt).not.toContain('## Previous Task Results');
    });

    it('should not include Constraints section without constraints', () => {
      const task = createMockTask('task-1');
      const prompt = generateWorkerPrompt(task);

      expect(prompt).not.toContain('## Constraints');
    });
  });

  describe('createSpawnConfig', () => {
    it('should create valid spawn config', () => {
      const task = createMockTask('task-1');
      task.agent = 'executor';
      task.model = 'opus';

      const config = createSpawnConfig(task);

      expect(config.subagentType).toBe('claudeops:executor');
      expect(config.model).toBe('opus');
      expect(config.runInBackground).toBe(true);
      expect(config.taskId).toBe('task-1');
      expect(config.prompt).toBeDefined();
      expect(config.prompt.length).toBeGreaterThan(0);
    });

    it('should include context in spawn config prompt', () => {
      const task = createMockTask('task-1');
      const context = {
        codebaseContext: 'Test context',
        constraints: ['Test constraint'],
      };

      const config = createSpawnConfig(task, context);

      expect(config.prompt).toContain('Test context');
      expect(config.prompt).toContain('Test constraint');
    });

    it('should format agent name correctly', () => {
      const task = createMockTask('task-1');
      task.agent = 'architect';

      const config = createSpawnConfig(task);

      expect(config.subagentType).toBe('claudeops:architect');
    });
  });
});

// =============================================================================
// Planner Tests
// =============================================================================

describe('planner', () => {
  describe('classifyComplexity', () => {
    it('should return classification complexity by default', () => {
      const classification = createMockClassification('implementation', 'simple');
      expect(classifyComplexity(classification)).toBe('simple');
    });

    it('should upgrade simple to moderate when user wants thorough work', () => {
      const classification = createMockClassification('implementation', 'simple');
      classification.signals.wantsThorough = true;

      expect(classifyComplexity(classification)).toBe('moderate');
    });

    it('should upgrade moderate to complex with multiple domains', () => {
      const classification = createMockClassification(
        'implementation',
        'moderate',
        ['frontend', 'backend', 'database']
      );

      expect(classifyComplexity(classification)).toBe('complex');
    });

    it('should not upgrade with fewer than 3 domains', () => {
      const classification = createMockClassification(
        'implementation',
        'moderate',
        ['frontend', 'backend']
      );

      expect(classifyComplexity(classification)).toBe('moderate');
    });

    it('should upgrade complex to architectural when planning requested', () => {
      const classification = createMockClassification('implementation', 'complex');
      classification.signals.wantsPlanning = true;

      expect(classifyComplexity(classification)).toBe('architectural');
    });

    it('should not upgrade if not complex', () => {
      const classification = createMockClassification('implementation', 'moderate');
      classification.signals.wantsPlanning = true;

      expect(classifyComplexity(classification)).toBe('moderate');
    });

    it('should handle trivial complexity', () => {
      const classification = createMockClassification('implementation', 'trivial');
      expect(classifyComplexity(classification)).toBe('trivial');
    });

    it('should handle architectural complexity', () => {
      const classification = createMockClassification('implementation', 'architectural');
      expect(classifyComplexity(classification)).toBe('architectural');
    });
  });

  describe('shouldDecompose', () => {
    it('should not decompose trivial tasks', () => {
      expect(shouldDecompose('trivial')).toBe(false);
    });

    it('should not decompose simple tasks', () => {
      expect(shouldDecompose('simple')).toBe(false);
    });

    it('should decompose moderate tasks', () => {
      expect(shouldDecompose('moderate')).toBe(true);
    });

    it('should decompose complex tasks', () => {
      expect(shouldDecompose('complex')).toBe(true);
    });

    it('should decompose architectural tasks', () => {
      expect(shouldDecompose('architectural')).toBe(true);
    });
  });

  describe('getSuggestedSubtasks', () => {
    it('should return 1 for trivial complexity', () => {
      expect(getSuggestedSubtasks('trivial', 'implementation')).toBe(1);
    });

    it('should return 1 for simple complexity', () => {
      expect(getSuggestedSubtasks('simple', 'implementation')).toBe(1);
    });

    it('should return 2 for moderate research', () => {
      expect(getSuggestedSubtasks('moderate', 'research')).toBe(2);
    });

    it('should return 3 for moderate debugging', () => {
      expect(getSuggestedSubtasks('moderate', 'debugging')).toBe(3);
    });

    it('should return 3 for moderate implementation', () => {
      expect(getSuggestedSubtasks('moderate', 'implementation')).toBe(3);
    });

    it('should return 5 for complex research', () => {
      expect(getSuggestedSubtasks('complex', 'research')).toBe(5);
    });

    it('should return 6 for complex debugging', () => {
      expect(getSuggestedSubtasks('complex', 'debugging')).toBe(6);
    });

    it('should return 7 for complex refactoring', () => {
      expect(getSuggestedSubtasks('complex', 'refactoring')).toBe(7);
    });

    it('should return 8 for complex implementation', () => {
      expect(getSuggestedSubtasks('complex', 'implementation')).toBe(8);
    });

    it('should return 6 for architectural research', () => {
      expect(getSuggestedSubtasks('architectural', 'research')).toBe(6);
    });

    it('should return 8 for architectural planning', () => {
      expect(getSuggestedSubtasks('architectural', 'planning')).toBe(8);
    });

    it('should return 10 for architectural implementation', () => {
      expect(getSuggestedSubtasks('architectural', 'implementation')).toBe(10);
    });
  });

  describe('getSwarmRecommendation', () => {
    it('should recommend no decomposition for trivial tasks', () => {
      const classification = createMockClassification('implementation', 'trivial');
      const recommendation = getSwarmRecommendation(classification);

      expect(recommendation.decompose).toBe(false);
      expect(recommendation.suggestedSubtasks).toBe(1);
      expect(recommendation.parallelism).toBe('sequential');
    });

    it('should recommend no decomposition for simple tasks', () => {
      const classification = createMockClassification('implementation', 'simple');
      const recommendation = getSwarmRecommendation(classification);

      expect(recommendation.decompose).toBe(false);
      expect(recommendation.suggestedSubtasks).toBe(1);
      expect(recommendation.parallelism).toBe('sequential');
    });

    it('should recommend decomposition for moderate tasks', () => {
      const classification = createMockClassification('implementation', 'moderate');
      const recommendation = getSwarmRecommendation(classification);

      expect(recommendation.decompose).toBe(true);
      expect(recommendation.suggestedSubtasks).toBeGreaterThan(1);
    });

    it('should recommend parallel for research tasks', () => {
      const classification = createMockClassification('research', 'moderate');
      const recommendation = getSwarmRecommendation(classification);

      expect(recommendation.parallelism).toBe('parallel');
    });

    it('should recommend sequential for debugging tasks', () => {
      const classification = createMockClassification('debugging', 'moderate');
      const recommendation = getSwarmRecommendation(classification);

      expect(recommendation.parallelism).toBe('sequential');
    });

    it('should recommend hybrid for architectural complexity', () => {
      const classification = createMockClassification('implementation', 'architectural');
      const recommendation = getSwarmRecommendation(classification);

      expect(recommendation.parallelism).toBe('hybrid');
    });

    it('should recommend hybrid by default for decomposed tasks', () => {
      const classification = createMockClassification('implementation', 'complex');
      const recommendation = getSwarmRecommendation(classification);

      expect(recommendation.parallelism).toBe('hybrid');
    });

    it('should include correct subtask count', () => {
      const classification = createMockClassification('refactoring', 'complex');
      const recommendation = getSwarmRecommendation(classification);

      expect(recommendation.suggestedSubtasks).toBe(7);
    });

    it('should handle conversation intent', () => {
      const classification = createMockClassification('conversation', 'trivial');
      const recommendation = getSwarmRecommendation(classification);

      expect(recommendation.decompose).toBe(false);
      expect(recommendation.parallelism).toBe('sequential');
    });
  });
});
