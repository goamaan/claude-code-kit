/**
 * Parallelism Strategy
 * Determines execution strategy (sequential/parallel/swarm)
 */

import type { IntentType, Domain, UserSignals } from '../classifier/types.js';
import type { AgentConfig } from './types.js';

// =============================================================================
// Parallelism Type
// =============================================================================

export type ParallelismStrategy = 'sequential' | 'parallel' | 'swarm';

// =============================================================================
// Strategy Selection
// =============================================================================

/**
 * Determine if task should use parallel execution
 */
export function shouldUseParallel(
  agents: AgentConfig[],
  intent: IntentType,
  domains: Domain[],
  signals: UserSignals,
): boolean {
  // User explicitly wants speed
  if (signals.wantsSpeed) {
    return true;
  }

  // Research tasks benefit from parallel exploration
  if (intent === 'research') {
    return true;
  }

  // Multiple agents suggest parallel work
  if (agents.length >= 3) {
    return true;
  }

  // Multi-domain tasks can be parallelized
  if (domains.length >= 2) {
    return true;
  }

  return false;
}

/**
 * Determine if task should use swarm execution
 * Swarm: Multiple agents working on same problem from different angles
 */
export function shouldUseSwarm(
  agents: AgentConfig[],
  intent: IntentType,
  signals: UserSignals,
): boolean {
  // User wants thorough/comprehensive work
  if (signals.wantsThorough) {
    return agents.length >= 2;
  }

  // Planning benefits from multiple perspectives
  if (intent === 'planning' && agents.length >= 2) {
    return true;
  }

  // Review tasks benefit from multiple reviewers
  if (intent === 'review' && agents.length >= 2) {
    return true;
  }

  // Complex debugging with multiple agents
  if (intent === 'debugging' && agents.length >= 3) {
    return true;
  }

  return false;
}

/**
 * Select parallelism strategy
 */
export function selectParallelismStrategy(
  agents: AgentConfig[],
  intent: IntentType,
  domains: Domain[],
  signals: UserSignals,
): ParallelismStrategy {
  // Single agent or conversation = always sequential
  if (agents.length <= 1 || intent === 'conversation') {
    return 'sequential';
  }

  // Check for swarm first (more specific)
  if (shouldUseSwarm(agents, intent, signals)) {
    return 'swarm';
  }

  // Check for parallel
  if (shouldUseParallel(agents, intent, domains, signals)) {
    return 'parallel';
  }

  // Default to sequential
  return 'sequential';
}

/**
 * Get strategy explanation
 */
export function explainParallelismStrategy(
  strategy: ParallelismStrategy,
  agents: AgentConfig[],
  intent: IntentType,
  signals: UserSignals,
): string {
  const agentCount = agents.length;

  switch (strategy) {
    case 'sequential': {
      if (agentCount <= 1) {
        return 'Sequential (single agent)';
      }
      return 'Sequential (agents depend on each other)';
    }

    case 'parallel': {
      const reasons: string[] = [];
      if (signals.wantsSpeed) {
        reasons.push('user wants speed');
      }
      if (intent === 'research') {
        reasons.push('research task');
      }
      if (agentCount >= 3) {
        reasons.push(`${agentCount} agents`);
      }
      return `Parallel (${reasons.join(', ')})`;
    }

    case 'swarm': {
      const swarmReasons: string[] = [];
      if (signals.wantsThorough) {
        swarmReasons.push('thorough work requested');
      }
      if (intent === 'planning') {
        swarmReasons.push('multiple perspectives');
      }
      if (intent === 'review') {
        swarmReasons.push('multiple reviewers');
      }
      return `Swarm (${swarmReasons.join(', ')})`;
    }

    default:
      return 'Sequential (default)';
  }
}

/**
 * Organize agents for parallel execution
 * Groups agents that can run in parallel
 */
export function organizeAgentsForParallel(
  agents: AgentConfig[],
  intent: IntentType,
): AgentConfig[][] {
  // For research: all explore/search agents can run in parallel
  if (intent === 'research') {
    const searchAgents = agents.filter(
      (a) => a.name === 'explore' || a.name === 'researcher',
    );
    const otherAgents = agents.filter(
      (a) => a.name !== 'explore' && a.name !== 'researcher',
    );

    const groups: AgentConfig[][] = [];
    if (searchAgents.length > 0) {
      groups.push(searchAgents);
    }
    if (otherAgents.length > 0) {
      groups.push(otherAgents);
    }
    return groups;
  }

  // For implementation: separate planning from execution
  if (intent === 'implementation') {
    const planners = agents.filter((a) => a.name === 'planner');
    const executors = agents.filter(
      (a) => a.name === 'executor' || a.name === 'executor-low',
    );
    const testers = agents.filter((a) => a.name === 'qa-tester');

    const groups: AgentConfig[][] = [];
    if (planners.length > 0) {
      groups.push(planners); // Plan first
    }
    if (executors.length > 0) {
      groups.push(executors); // Execute in parallel
    }
    if (testers.length > 0) {
      groups.push(testers); // Test last
    }
    return groups;
  }

  // Default: each agent in its own group (sequential)
  return agents.map((agent) => [agent]);
}

/**
 * Organize agents for swarm execution
 * All agents work on same problem simultaneously
 */
export function organizeAgentsForSwarm(
  agents: AgentConfig[],
): AgentConfig[][] {
  // In swarm mode, all agents run in parallel
  return [agents];
}
