/**
 * Intent Classification Types
 * Types for classifying user requests and recommending agent orchestration
 */

// =============================================================================
// Core Classification Enums
// =============================================================================

export type IntentType =
  | 'research'
  | 'implementation'
  | 'debugging'
  | 'review'
  | 'planning'
  | 'refactoring'
  | 'maintenance'
  | 'conversation';

export type Complexity =
  | 'trivial'
  | 'simple'
  | 'moderate'
  | 'complex'
  | 'architectural';

export type Domain =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'devops'
  | 'security'
  | 'testing'
  | 'documentation'
  | 'general';

// =============================================================================
// User Signals
// =============================================================================

export interface UserSignals {
  /** User wants task persistence (multi-step work) */
  wantsPersistence: boolean;

  /** User wants fast response (simple queries) */
  wantsSpeed: boolean;

  /** User wants autonomous execution (minimal interaction) */
  wantsAutonomy: boolean;

  /** User wants planning/breakdown first */
  wantsPlanning: boolean;

  /** User wants verification/testing */
  wantsVerification: boolean;

  /** User wants thorough/comprehensive work */
  wantsThorough: boolean;
}

// =============================================================================
// Agent Recommendation
// =============================================================================

export interface AgentRecommendation {
  /** Recommended agents to use (e.g., ["executor", "architect"]) */
  agents: string[];

  /** How to execute agents */
  parallelism: 'sequential' | 'parallel' | 'swarm';

  /** Recommended model tier for the task */
  modelTier: 'haiku' | 'sonnet' | 'opus';

  /** Whether to include verification step */
  verification: boolean;
}

// =============================================================================
// Intent Classification Result
// =============================================================================

export interface IntentClassification {
  /** Primary intent type */
  type: IntentType;

  /** Complexity assessment */
  complexity: Complexity;

  /** Relevant domains */
  domains: Domain[];

  /** Detected user signals */
  signals: UserSignals;

  /** Agent orchestration recommendation */
  recommendation: AgentRecommendation;

  /** Confidence score (0-1) */
  confidence: number;

  /** Optional reasoning explanation */
  reasoning?: string;
}
