/**
 * Swarm orchestration types
 * Defines types and schemas for multi-agent swarm execution
 */

import { z } from 'zod';
import type { ModelName } from './config.js';

// =============================================================================
// Model Tier (alias for swarm context)
// =============================================================================

/**
 * Model tier used for agent execution in swarms.
 * Maps to the ModelName type from config.
 */
export type ModelTier = ModelName;

export const ModelTierSchema = z.enum(['haiku', 'sonnet', 'opus']);

// =============================================================================
// Swarm Task Status
// =============================================================================

/**
 * Status of a task within a swarm execution.
 */
export const SwarmTaskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
]);
export type SwarmTaskStatus = z.infer<typeof SwarmTaskStatusSchema>;

// =============================================================================
// Task Cost Entry
// =============================================================================

/**
 * Cost tracking entry for an individual swarm task.
 */
export interface TaskCostEntry {
  /** ID of the task this cost entry belongs to */
  taskId: string;

  /** Name of the agent that executed the task */
  agentName: string;

  /** Model tier used for execution */
  model: ModelTier;

  /** Number of input tokens consumed */
  inputTokens: number;

  /** Number of output tokens generated */
  outputTokens: number;

  /** Total cost in USD */
  cost: number;
}

export const TaskCostEntrySchema = z.object({
  taskId: z.string(),
  agentName: z.string(),
  model: ModelTierSchema,
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  cost: z.number().min(0),
});

// =============================================================================
// Swarm Task
// =============================================================================

/**
 * A single task within a swarm plan.
 * Tasks can have dependencies on other tasks via blockedBy/blocks arrays.
 */
export interface SwarmTask {
  /** Unique task identifier */
  id: string;

  /** Short subject line describing the task */
  subject: string;

  /** Detailed description of what the task should accomplish */
  description: string;

  /** Current execution status */
  status: SwarmTaskStatus;

  /** Agent type to use for this task (e.g., 'executor', 'architect') */
  agent: string;

  /** Model tier to use for execution */
  model: ModelTier;

  /** Task IDs that must complete before this task can start */
  blockedBy: string[];

  /** Task IDs that depend on this task completing */
  blocks: string[];

  /** Owner/assignee of the task (optional) */
  owner?: string;

  /** Cost tracking for this task (populated after execution) */
  cost?: TaskCostEntry;

  /** Additional metadata for the task */
  metadata?: Record<string, unknown>;

  /** When the task was created */
  createdAt: Date;

  /** When the task started execution */
  startedAt?: Date;

  /** When the task completed (success or failure) */
  completedAt?: Date;
}

export const SwarmTaskSchema = z.object({
  id: z.string().min(1),
  subject: z.string().min(1),
  description: z.string(),
  status: SwarmTaskStatusSchema,
  agent: z.string().min(1),
  model: ModelTierSchema,
  blockedBy: z.array(z.string()),
  blocks: z.array(z.string()),
  owner: z.string().optional(),
  cost: TaskCostEntrySchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.coerce.date(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});

// =============================================================================
// Parallelism Mode
// =============================================================================

/**
 * Execution parallelism mode for swarm plans.
 * - sequential: Execute tasks one at a time in order
 * - parallel: Execute all ready tasks concurrently
 * - hybrid: Execute in parallel respecting dependencies
 */
export const ParallelismModeSchema = z.enum(['sequential', 'parallel', 'hybrid']);
export type ParallelismMode = z.infer<typeof ParallelismModeSchema>;

// =============================================================================
// Swarm Plan
// =============================================================================

/**
 * A complete plan for swarm execution containing multiple tasks.
 */
export interface SwarmPlan {
  /** Unique plan identifier */
  id: string;

  /** Human-readable name for the plan */
  name: string;

  /** List of tasks in the plan */
  tasks: SwarmTask[];

  /** Execution parallelism mode */
  parallelism: ParallelismMode;

  /** When the plan was created */
  createdAt: Date;
}

export const SwarmPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tasks: z.array(SwarmTaskSchema),
  parallelism: ParallelismModeSchema,
  createdAt: z.coerce.date(),
});

// =============================================================================
// Dependency Node
// =============================================================================

/**
 * A node in the task dependency graph.
 * Used for dependency analysis and execution ordering.
 */
export interface DependencyNode {
  /** Task ID this node represents */
  taskId: string;

  /** Depth in the dependency graph (0 = no dependencies) */
  depth: number;

  /** Task IDs that must complete before this task */
  blockedBy: string[];

  /** Task IDs that depend on this task */
  blocks: string[];
}

export const DependencyNodeSchema = z.object({
  taskId: z.string().min(1),
  depth: z.number().int().min(0),
  blockedBy: z.array(z.string()),
  blocks: z.array(z.string()),
});

// =============================================================================
// Swarm Configuration
// =============================================================================

/**
 * Persistence configuration for swarm state.
 */
export const SwarmPersistenceConfigSchema = z.object({
  /** Whether to persist swarm state to disk */
  enabled: z.boolean().default(false),

  /** Directory to store persistence files */
  directory: z.string().optional(),
});
export type SwarmPersistenceConfig = z.infer<typeof SwarmPersistenceConfigSchema>;

/**
 * Cost tracking configuration for swarms.
 */
export const SwarmCostTrackingConfigSchema = z.object({
  /** Whether to track costs for swarm execution */
  enabled: z.boolean().default(true),

  /** Whether to track costs per individual task */
  perTask: z.boolean().default(true),
});
export type SwarmCostTrackingConfig = z.infer<typeof SwarmCostTrackingConfigSchema>;

/**
 * Main swarm configuration schema.
 */
export const SwarmConfigSchema = z.object({
  /** Whether swarm orchestration is enabled */
  enabled: z.boolean().default(true),

  /** Default parallelism mode for new swarms */
  defaultParallelism: ParallelismModeSchema.default('parallel'),

  /** Maximum number of concurrent worker agents */
  maxConcurrentWorkers: z.number().int().min(1).max(10).default(5),

  /** State persistence configuration */
  persistence: SwarmPersistenceConfigSchema.default({}),

  /** Cost tracking configuration */
  costTracking: SwarmCostTrackingConfigSchema.default({}),
});
export type SwarmConfig = z.infer<typeof SwarmConfigSchema>;

// =============================================================================
// Swarm State Status
// =============================================================================

/**
 * Overall status of a swarm execution.
 */
export const SwarmStateStatusSchema = z.enum(['active', 'completed', 'stopped']);
export type SwarmStateStatus = z.infer<typeof SwarmStateStatusSchema>;

// =============================================================================
// Swarm State
// =============================================================================

/**
 * Current state of an active or completed swarm execution.
 */
export interface SwarmState {
  /** Unique swarm execution identifier */
  id: string;

  /** Human-readable name for this swarm execution */
  name: string;

  /** Current execution status */
  status: SwarmStateStatus;

  /** The plan being executed */
  plan: SwarmPlan;

  /** IDs of tasks that have completed successfully */
  completedTasks: string[];

  /** IDs of tasks that have failed */
  failedTasks: string[];

  /** Total accumulated cost in USD */
  totalCost: number;

  /** When the swarm execution started */
  startedAt: Date;

  /** When the swarm execution completed (if finished) */
  completedAt?: Date;
}

export const SwarmStateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: SwarmStateStatusSchema,
  plan: SwarmPlanSchema,
  completedTasks: z.array(z.string()),
  failedTasks: z.array(z.string()),
  totalCost: z.number().min(0),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
});

// =============================================================================
// Swarm Execution Status
// =============================================================================

/**
 * Final status of a swarm execution in history.
 */
export const SwarmExecutionStatusSchema = z.enum(['completed', 'stopped', 'failed']);
export type SwarmExecutionStatus = z.infer<typeof SwarmExecutionStatusSchema>;

// =============================================================================
// Swarm Execution
// =============================================================================

/**
 * Historical record of a completed swarm execution.
 */
export interface SwarmExecution {
  /** Unique execution identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Final execution status */
  status: SwarmExecutionStatus;

  /** Total number of tasks in the plan */
  taskCount: number;

  /** Number of tasks that completed successfully */
  completedCount: number;

  /** Total cost in USD */
  totalCost: number;

  /** Total execution duration in milliseconds */
  duration: number;

  /** When the execution started */
  startedAt: Date;

  /** When the execution completed */
  completedAt: Date;
}

export const SwarmExecutionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: SwarmExecutionStatusSchema,
  taskCount: z.number().int().min(0),
  completedCount: z.number().int().min(0),
  totalCost: z.number().min(0),
  duration: z.number().int().min(0),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date(),
});

// =============================================================================
// Swarm Recommendation
// =============================================================================

/**
 * Recommendation for how to handle a task or request.
 * Used by the planner to suggest decomposition strategies.
 */
export interface SwarmRecommendation {
  /** Whether the task should be decomposed into subtasks */
  decompose: boolean;

  /** Suggested number of subtasks if decomposition is recommended */
  suggestedSubtasks: number;

  /** Recommended parallelism mode for execution */
  parallelism: ParallelismMode;
}

export const SwarmRecommendationSchema = z.object({
  decompose: z.boolean(),
  suggestedSubtasks: z.number().int().min(0),
  parallelism: ParallelismModeSchema,
});
