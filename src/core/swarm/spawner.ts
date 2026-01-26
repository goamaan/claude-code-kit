/**
 * Worker Spawner Module
 * Generates worker prompts and handles model routing for swarm agents
 */

import type { SwarmTask, ModelTier } from '../../types/swarm.js';
import type { Complexity, Domain } from '../classifier/types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Context provided to worker agents for task execution.
 */
export interface WorkerContext {
  /** Relevant code snippets for the task */
  codebaseContext?: string;

  /** Results from previously completed dependent tasks */
  previousResults?: string;

  /** Constraints the worker must follow */
  constraints?: string[];
}

/**
 * Configuration for spawning a worker agent.
 */
export interface SpawnConfig {
  /** Subagent type identifier (e.g., "claudeops:executor") */
  subagentType: string;

  /** Model tier to use for execution */
  model: ModelTier;

  /** Generated prompt for the worker */
  prompt: string;

  /** Whether to run the task in background */
  runInBackground: boolean;

  /** Unique task identifier */
  taskId: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Haiku-eligible agents for simple complexity tasks
 */
const HAIKU_ELIGIBLE_AGENTS = new Set(['explore', 'writer', 'executor-low']);

/**
 * Domain to agent mapping for task assignment
 */
const DOMAIN_AGENT_MAP: Record<Domain, string> = {
  frontend: 'designer',
  backend: 'executor',
  database: 'executor',
  security: 'security',
  testing: 'qa-tester',
  documentation: 'writer',
  general: 'executor',
  devops: 'executor',
};

// =============================================================================
// Prompt Generation
// =============================================================================

/**
 * Generate a prompt for a worker agent based on task details.
 *
 * @param task - The swarm task to generate a prompt for
 * @param context - Optional context for the worker
 * @returns Generated prompt string
 *
 * @example
 * ```typescript
 * const prompt = generateWorkerPrompt(task, {
 *   codebaseContext: 'function UserService...',
 *   constraints: ['Follow existing patterns'],
 * });
 * ```
 */
export function generateWorkerPrompt(
  task: SwarmTask,
  context?: WorkerContext,
): string {
  const parts: string[] = [];

  // Agent identity
  parts.push(`You are a ${task.agent} worker agent.`);
  parts.push('');

  // Task details
  parts.push(`## Task: ${task.subject}`);
  parts.push(task.description);
  parts.push('');

  // Context section
  parts.push('## Context');
  parts.push(context?.codebaseContext || 'No additional context provided.');
  parts.push('');

  // Previous results if available
  if (context?.previousResults) {
    parts.push('## Previous Task Results');
    parts.push(context.previousResults);
    parts.push('');
  }

  // Instructions
  parts.push('## Instructions');
  parts.push('1. Focus ONLY on this specific task');
  parts.push('2. Use appropriate tools for your specialization');
  parts.push('3. Follow existing code patterns');
  parts.push('4. When complete, summarize what you accomplished');
  parts.push('');

  // Constraints
  if (context?.constraints && context.constraints.length > 0) {
    parts.push('## Constraints');
    for (const constraint of context.constraints) {
      parts.push(`- ${constraint}`);
    }
    parts.push('');
  }

  // Completion requirements
  parts.push('## On Completion');
  parts.push('Provide:');
  parts.push('- Summary of accomplishments');
  parts.push('- Files changed');
  parts.push('- Any issues encountered');

  return parts.join('\n');
}

// =============================================================================
// Model Selection
// =============================================================================

/**
 * Select appropriate model tier based on complexity and agent type.
 *
 * Rules:
 * - trivial: Always 'haiku'
 * - simple: 'haiku' for explore/writer/executor-low, 'sonnet' for others
 * - moderate: 'sonnet'
 * - complex/architectural: 'opus'
 *
 * @param complexity - Task complexity level
 * @param agent - Agent type identifier
 * @returns Selected model tier
 *
 * @example
 * ```typescript
 * const model = selectModel('simple', 'explore'); // 'haiku'
 * const model = selectModel('simple', 'executor'); // 'sonnet'
 * const model = selectModel('complex', 'architect'); // 'opus'
 * ```
 */
export function selectModel(complexity: Complexity, agent: string): ModelTier {
  switch (complexity) {
    case 'trivial':
      return 'haiku';

    case 'simple':
      return HAIKU_ELIGIBLE_AGENTS.has(agent) ? 'haiku' : 'sonnet';

    case 'moderate':
      return 'sonnet';

    case 'complex':
    case 'architectural':
      return 'opus';

    default:
      // Fallback for unknown complexity
      return 'sonnet';
  }
}

// =============================================================================
// Spawn Configuration
// =============================================================================

/**
 * Create the full spawn configuration for a worker.
 *
 * @param task - The swarm task to create configuration for
 * @param context - Optional context for the worker
 * @returns Complete spawn configuration
 *
 * @example
 * ```typescript
 * const config = createSpawnConfig(task, { constraints: ['Use TypeScript'] });
 * // {
 * //   subagentType: 'claudeops:executor',
 * //   model: 'opus',
 * //   prompt: '...',
 * //   runInBackground: true,
 * //   taskId: 'task-1'
 * // }
 * ```
 */
export function createSpawnConfig(
  task: SwarmTask,
  context?: WorkerContext,
): SpawnConfig {
  return {
    subagentType: `claudeops:${task.agent}`,
    model: task.model,
    prompt: generateWorkerPrompt(task, context),
    runInBackground: true,
    taskId: task.id,
  };
}

// =============================================================================
// Domain Mapping
// =============================================================================

/**
 * Map domains to recommended agent types.
 *
 * Priority order when multiple domains are provided:
 * 1. First matching specialized domain (security, testing, frontend)
 * 2. Falls back to 'executor' for general-purpose work
 *
 * @param domains - Array of domain identifiers
 * @returns Recommended agent type
 *
 * @example
 * ```typescript
 * getAgentForDomain(['frontend']); // 'designer'
 * getAgentForDomain(['backend', 'database']); // 'executor'
 * getAgentForDomain(['security', 'backend']); // 'security'
 * getAgentForDomain([]); // 'executor'
 * ```
 */
export function getAgentForDomain(domains: string[]): string {
  // Empty domains default to executor
  if (!domains || domains.length === 0) {
    return 'executor';
  }

  // Priority order for domain matching
  const priorityDomains: Domain[] = [
    'security',
    'testing',
    'frontend',
    'documentation',
    'backend',
    'database',
    'devops',
    'general',
  ];

  // Find first matching domain by priority
  for (const priorityDomain of priorityDomains) {
    if (domains.includes(priorityDomain)) {
      return DOMAIN_AGENT_MAP[priorityDomain];
    }
  }

  // Fallback to executor
  return 'executor';
}

// =============================================================================
// Batch Configuration
// =============================================================================

/**
 * Build spawn configurations for multiple tasks (for parallel execution).
 *
 * @param tasks - Array of swarm tasks to configure
 * @param context - Optional shared context for all workers
 * @returns Array of spawn configurations
 *
 * @example
 * ```typescript
 * const configs = buildBatchSpawnConfigs(tasks, {
 *   codebaseContext: 'Shared project context...',
 *   constraints: ['Follow coding standards'],
 * });
 * ```
 */
export function buildBatchSpawnConfigs(
  tasks: SwarmTask[],
  context?: WorkerContext,
): SpawnConfig[] {
  return tasks.map((task) => createSpawnConfig(task, context));
}
