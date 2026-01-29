/**
 * Agent Catalog
 * Registry of all available agents with their configurations
 */

import type { AgentConfig, ModelTier } from './types.js';

// =============================================================================
// Agent Catalog
// =============================================================================

export const AGENT_CATALOG: Record<string, AgentConfig> = {
  // ---------------------------------------------------------------------------
  // Search & Exploration
  // ---------------------------------------------------------------------------
  explore: {
    name: 'explore',
    model: 'haiku',
    description: 'Fast codebase search and file discovery',
    domains: ['general', 'documentation'],
  },

  // ---------------------------------------------------------------------------
  // Execution
  // ---------------------------------------------------------------------------
  executor: {
    name: 'executor',
    model: 'opus',
    description: 'Standard feature implementation and bug fixes',
    domains: ['general', 'backend', 'frontend', 'testing'],
  },

  'executor-low': {
    name: 'executor-low',
    model: 'haiku',
    description: 'Simple boilerplate and trivial changes',
    domains: ['general', 'documentation'],
  },

  // ---------------------------------------------------------------------------
  // Analysis & Architecture
  // ---------------------------------------------------------------------------
  architect: {
    name: 'architect',
    model: 'opus',
    description: 'Deep analysis, debugging, and architectural decisions',
    domains: ['general', 'backend', 'frontend', 'database', 'devops'],
  },

  // ---------------------------------------------------------------------------
  // Frontend & Design
  // ---------------------------------------------------------------------------
  designer: {
    name: 'designer',
    model: 'opus',
    description: 'UI/UX design, component creation, and styling',
    domains: ['frontend'],
  },

  // ---------------------------------------------------------------------------
  // Quality Assurance
  // ---------------------------------------------------------------------------
  'qa-tester': {
    name: 'qa-tester',
    model: 'opus',
    description: 'Test writing, TDD workflow, and quality checks',
    domains: ['testing', 'general'],
  },

  security: {
    name: 'security',
    model: 'opus',
    description: 'Security audits and vulnerability analysis',
    domains: ['security', 'backend', 'devops'],
  },

  // ---------------------------------------------------------------------------
  // Documentation & Research
  // ---------------------------------------------------------------------------
  researcher: {
    name: 'researcher',
    model: 'opus',
    description: 'External research and documentation analysis',
    domains: ['documentation', 'general'],
  },

  writer: {
    name: 'writer',
    model: 'haiku',
    description: 'Documentation writing and maintenance',
    domains: ['documentation'],
  },

  // ---------------------------------------------------------------------------
  // Strategic Planning
  // ---------------------------------------------------------------------------
  planner: {
    name: 'planner',
    model: 'opus',
    description: 'Strategic planning and task breakdown',
    domains: ['general'],
  },

  critic: {
    name: 'critic',
    model: 'opus',
    description: 'Plan review and critical analysis',
    domains: ['general'],
  },

  // ---------------------------------------------------------------------------
  // Specialist Agents (v5)
  // ---------------------------------------------------------------------------
  'security-sentinel': {
    name: 'security-sentinel',
    model: 'opus',
    description: 'Security vulnerability review and OWASP compliance',
    domains: ['security', 'backend'],
  },

  'performance-oracle': {
    name: 'performance-oracle',
    model: 'opus',
    description: 'Performance bottleneck analysis and optimization',
    domains: ['backend', 'frontend', 'database'],
  },

  'architecture-strategist': {
    name: 'architecture-strategist',
    model: 'opus',
    description: 'Architectural compliance and design pattern review',
    domains: ['general', 'backend', 'frontend'],
  },

  'code-simplicity-reviewer': {
    name: 'code-simplicity-reviewer',
    model: 'sonnet',
    description: 'YAGNI and over-engineering detection',
    domains: ['general'],
  },

  'best-practices-researcher': {
    name: 'best-practices-researcher',
    model: 'sonnet',
    description: 'Framework best practices and convention research',
    domains: ['general', 'documentation'],
  },

  'git-history-analyzer': {
    name: 'git-history-analyzer',
    model: 'haiku',
    description: 'Code archaeology and git history analysis',
    domains: ['general'],
  },
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get agent by name
 */
export function getAgent(name: string): AgentConfig | undefined {
  return AGENT_CATALOG[name];
}

/**
 * Get all agents
 */
export function getAllAgents(): AgentConfig[] {
  return Object.values(AGENT_CATALOG);
}

/**
 * Get agents by domain
 */
export function getAgentsByDomain(domain: string): AgentConfig[] {
  return getAllAgents().filter((agent) => agent.domains.includes(domain));
}

/**
 * Get agents by model tier
 */
export function getAgentsByModel(model: ModelTier): AgentConfig[] {
  return getAllAgents().filter((agent) => agent.model === model);
}
