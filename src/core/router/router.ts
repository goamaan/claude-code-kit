/**
 * Main Router
 * Combines all routing logic to make intelligent routing decisions
 */

import type { IntentClassification } from '../classifier/types.js';
import type { RoutingDecision, AgentConfig } from './types.js';
import {
  selectAgents,
  filterAgentsByComplexity,
  prioritizeAgents,
} from './agent-router.js';
import {
  getRecommendedModel,
  explainModelSelection,
} from './model-router.js';
import {
  selectParallelismStrategy,
  explainParallelismStrategy,
} from './parallelism.js';

// =============================================================================
// Main Router Function
// =============================================================================

/**
 * Route an intent classification to a routing decision
 * This is the main entry point for the intelligent router
 */
export function routeIntent(
  classification: IntentClassification,
): RoutingDecision {
  const { type, complexity, domains, signals } = classification;

  // 1. Select agents based on intent and domains
  let agents = selectAgents(type, domains);

  // 2. Filter agents based on complexity
  agents = filterAgentsByComplexity(agents, complexity);

  // 3. Prioritize agents for execution order
  agents = prioritizeAgents(agents, type);

  // 4. Select primary model tier
  const primaryModel = getRecommendedModel(complexity, type, {
    wantsSpeed: signals.wantsSpeed,
    wantsThorough: signals.wantsThorough,
    multiDomain: domains.length > 1,
    requiresVerification: signals.wantsVerification,
  });

  // 5. Determine parallelism strategy
  const parallelism = selectParallelismStrategy(agents, type, domains, signals);

  // 6. Determine if verification is needed
  const verification = shouldIncludeVerification(
    complexity,
    type,
    signals,
    agents,
  );

  // 7. Generate reasoning
  const reasoning = generateRoutingReasoning(
    classification,
    agents,
    primaryModel,
    parallelism,
    verification,
  );

  return {
    agents,
    primaryModel,
    parallelism,
    verification,
    reasoning,
  };
}

// =============================================================================
// Verification Logic
// =============================================================================

/**
 * Determine if verification step should be included
 */
function shouldIncludeVerification(
  complexity: IntentClassification['complexity'],
  intent: IntentClassification['type'],
  signals: IntentClassification['signals'],
  agents: AgentConfig[],
): boolean {
  // User explicitly wants verification
  if (signals.wantsVerification) {
    return true;
  }

  // Complex/architectural tasks should be verified
  if (complexity === 'complex' || complexity === 'architectural') {
    return true;
  }

  // Implementation tasks with multiple agents should be verified
  if (intent === 'implementation' && agents.length >= 2) {
    return true;
  }

  // Refactoring should be verified
  if (intent === 'refactoring') {
    return true;
  }

  // Security reviews don't need additional verification
  if (intent === 'review') {
    return false;
  }

  // Thorough work should include verification
  if (signals.wantsThorough) {
    return true;
  }

  return false;
}

// =============================================================================
// Reasoning Generation
// =============================================================================

/**
 * Generate human-readable reasoning for the routing decision
 */
function generateRoutingReasoning(
  classification: IntentClassification,
  agents: AgentConfig[],
  primaryModel: RoutingDecision['primaryModel'],
  parallelism: RoutingDecision['parallelism'],
  verification: boolean,
): string {
  const { type, complexity, domains, signals } = classification;

  const parts: string[] = [];

  // Intent and complexity
  parts.push(`Intent: ${type} (${complexity})`);

  // Domains
  if (domains.length > 0 && !domains.includes('general')) {
    parts.push(`Domains: ${domains.join(', ')}`);
  }

  // Model selection
  const modelExplanation = explainModelSelection(complexity, type, primaryModel);
  parts.push(`Model: ${modelExplanation}`);

  // Agent selection
  if (agents.length === 0) {
    parts.push('Agents: none (conversation)');
  } else if (agents.length === 1) {
    parts.push(`Agent: ${agents[0]!.name}`);
  } else {
    parts.push(`Agents: ${agents.map((a) => a.name).join(', ')}`);
  }

  // Parallelism
  const parallelismExplanation = explainParallelismStrategy(
    parallelism,
    agents,
    type,
    signals,
  );
  parts.push(`Execution: ${parallelismExplanation}`);

  // Verification
  if (verification) {
    const reasons: string[] = [];
    if (signals.wantsVerification) {
      reasons.push('user requested');
    }
    if (complexity === 'complex' || complexity === 'architectural') {
      reasons.push('high complexity');
    }
    if (type === 'refactoring') {
      reasons.push('refactoring task');
    }
    if (signals.wantsThorough) {
      reasons.push('thorough work');
    }
    parts.push(`Verification: yes (${reasons.join(', ')})`);
  }

  return parts.join(' | ');
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a simplified routing decision for simple queries
 */
export function createSimpleRoutingDecision(
  agentName: string,
  model: RoutingDecision['primaryModel'] = 'haiku',
  reasoning = 'Simple query',
): RoutingDecision {
  const agent: AgentConfig = {
    name: agentName,
    model,
    description: '',
    domains: [],
  };

  return {
    agents: [agent],
    primaryModel: model,
    parallelism: 'sequential',
    verification: false,
    reasoning,
  };
}

/**
 * Create a routing decision for conversation (no agents)
 */
export function createConversationRoutingDecision(): RoutingDecision {
  return {
    agents: [],
    primaryModel: 'sonnet',
    parallelism: 'sequential',
    verification: false,
    reasoning: 'Conversation - no agents needed',
  };
}
