/**
 * Router Types
 * Types for intelligent agent routing and model selection
 */

import type { IntentClassification } from '../classifier/types.js';

// =============================================================================
// Model and Agent Types
// =============================================================================

export type ModelTier = 'haiku' | 'sonnet' | 'opus';

export interface AgentConfig {
  /** Agent identifier (e.g., "executor", "architect") */
  name: string;

  /** Model tier this agent should use */
  model: ModelTier;

  /** Human-readable description */
  description: string;

  /** Domains this agent specializes in */
  domains: string[];
}

// =============================================================================
// Routing Decision
// =============================================================================

export interface RoutingDecision {
  /** Selected agents for the task */
  agents: AgentConfig[];

  /** Primary model tier for the main orchestrator */
  primaryModel: ModelTier;

  /** Execution strategy */
  parallelism: 'sequential' | 'parallel' | 'swarm';

  /** Whether to include verification step */
  verification: boolean;

  /** Explanation of routing decision */
  reasoning: string;
}

// =============================================================================
// Router Function Types
// =============================================================================

export type RouterFunction = (
  classification: IntentClassification,
) => RoutingDecision;
