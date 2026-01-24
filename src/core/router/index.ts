/**
 * Router Module - Barrel export
 * Exports intelligent routing functionality
 */

// Types
export type { ModelTier, AgentConfig, RoutingDecision, RouterFunction } from './types.js';

// Agent Catalog
export {
  AGENT_CATALOG,
  getAgent,
  getAllAgents,
  getAgentsByDomain,
  getAgentsByModel,
} from './agent-catalog.js';

// Agent Router
export {
  getAgentsForIntent,
  getAgentsForDomains,
  selectAgents,
  filterAgentsByComplexity,
  prioritizeAgents,
} from './agent-router.js';

// Model Router
export {
  selectModelTier,
  upgradeModelIfNeeded,
  downgradeModelForSpeed,
  getRecommendedModel,
  explainModelSelection,
} from './model-router.js';

// Parallelism
export type { ParallelismStrategy } from './parallelism.js';
export {
  shouldUseParallel,
  shouldUseSwarm,
  selectParallelismStrategy,
  explainParallelismStrategy,
  organizeAgentsForParallel,
  organizeAgentsForSwarm,
} from './parallelism.js';

// Main Router
export {
  routeIntent,
  createSimpleRoutingDecision,
  createConversationRoutingDecision,
} from './router.js';
