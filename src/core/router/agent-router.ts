/**
 * Agent Router
 * Maps intent types and domains to appropriate agents
 */

import type { IntentType, Domain } from '../classifier/types.js';
import type { AgentConfig } from './types.js';
import { AGENT_CATALOG } from './agent-catalog.js';

// =============================================================================
// Intent to Agent Mapping
// =============================================================================

/**
 * Primary agent mappings by intent type
 */
const INTENT_AGENT_MAP: Record<IntentType, string[]> = {
  research: ['explore', 'researcher'],
  implementation: ['executor', 'qa-tester'],
  debugging: ['architect', 'executor'],
  review: ['security', 'architect'],
  planning: ['planner', 'architect'],
  refactoring: ['architect', 'executor', 'qa-tester'],
  maintenance: ['executor-low', 'qa-tester'],
  conversation: [], // No agents needed for simple conversation
};

/**
 * Domain-specific agent additions
 */
const DOMAIN_AGENT_MAP: Record<Domain, string[]> = {
  frontend: ['designer', 'executor'],
  backend: ['executor', 'architect'],
  database: ['architect', 'executor'],
  devops: ['architect', 'executor'],
  security: ['security', 'architect'],
  testing: ['qa-tester'],
  documentation: ['writer', 'researcher'],
  general: ['executor'],
};

// =============================================================================
// Agent Selection Functions
// =============================================================================

/**
 * Get agents for an intent type
 */
export function getAgentsForIntent(intent: IntentType): AgentConfig[] {
  const agentNames = INTENT_AGENT_MAP[intent] || [];
  return agentNames
    .map((name) => AGENT_CATALOG[name])
    .filter((agent): agent is AgentConfig => agent !== undefined);
}

/**
 * Get additional agents for domains
 */
export function getAgentsForDomains(domains: Domain[]): AgentConfig[] {
  const agentNames = new Set<string>();

  for (const domain of domains) {
    const domainAgents = DOMAIN_AGENT_MAP[domain] || [];
    domainAgents.forEach((name) => agentNames.add(name));
  }

  return Array.from(agentNames)
    .map((name) => AGENT_CATALOG[name])
    .filter((agent): agent is AgentConfig => agent !== undefined);
}

/**
 * Select agents based on intent and domains
 * Combines intent-based agents with domain-specific agents
 */
export function selectAgents(
  intent: IntentType,
  domains: Domain[],
): AgentConfig[] {
  const intentAgents = getAgentsForIntent(intent);
  const domainAgents = getAgentsForDomains(domains);

  // Merge and deduplicate by agent name
  const agentMap = new Map<string, AgentConfig>();

  // Add intent agents first (higher priority)
  for (const agent of intentAgents) {
    agentMap.set(agent.name, agent);
  }

  // Add domain agents (only if not already present)
  for (const agent of domainAgents) {
    if (!agentMap.has(agent.name)) {
      agentMap.set(agent.name, agent);
    }
  }

  return Array.from(agentMap.values());
}

/**
 * Filter agents based on complexity
 * For simple tasks, prefer lighter agents
 */
export function filterAgentsByComplexity(
  agents: AgentConfig[],
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'architectural',
): AgentConfig[] {
  // For trivial/simple tasks, prefer haiku agents
  if (complexity === 'trivial' || complexity === 'simple') {
    return agents.filter(
      (agent) =>
        agent.model === 'haiku' ||
        (agent.model === 'sonnet' && agent.name === 'executor'),
    );
  }

  // For complex/architectural, ensure we have opus agents
  if (complexity === 'complex' || complexity === 'architectural') {
    const hasOpus = agents.some((agent) => agent.model === 'opus');
    if (!hasOpus) {
      // Add architect for complex tasks
      const architect = AGENT_CATALOG['architect'];
      if (architect) {
        return [...agents, architect];
      }
    }
  }

  return agents;
}

/**
 * Prioritize agents based on intent type
 * Returns agents in execution order
 */
export function prioritizeAgents(
  agents: AgentConfig[],
  intent: IntentType,
): AgentConfig[] {
  // Define priority order for each intent
  const priorityMap: Record<IntentType, string[]> = {
    research: ['explore', 'researcher'],
    implementation: ['architect', 'executor', 'qa-tester'],
    debugging: ['architect', 'executor'],
    review: ['security', 'architect'],
    planning: ['planner', 'architect', 'critic'],
    refactoring: ['architect', 'executor', 'qa-tester'],
    maintenance: ['executor-low', 'qa-tester'],
    conversation: [],
  };

  const priority = priorityMap[intent] || [];
  const agentMap = new Map(agents.map((a) => [a.name, a]));

  // Sort by priority order, then add remaining agents
  const sorted: AgentConfig[] = [];
  for (const name of priority) {
    const agent = agentMap.get(name);
    if (agent) {
      sorted.push(agent);
      agentMap.delete(name);
    }
  }

  // Add remaining agents
  sorted.push(...Array.from(agentMap.values()));

  return sorted;
}
