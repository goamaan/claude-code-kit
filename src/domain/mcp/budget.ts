/**
 * MCP Context Budget Calculator
 * Estimates context token usage per MCP server
 */

import type { McpServerState, McpBudgetSummary } from '@/types/index.js';

// =============================================================================
// Context Cost Estimates
// =============================================================================

/**
 * Estimated context token cost per MCP server type
 * These are approximations based on typical tool/resource definitions
 */
export const MCP_CONTEXT_COSTS: Record<string, number> = {
  // Popular MCP servers
  'github': 2000,
  'filesystem': 1000,
  'context7': 3000,
  'puppeteer': 1500,
  'brave-search': 800,
  'google-maps': 1200,
  'slack': 1800,
  'postgres': 1500,
  'sqlite': 1200,
  'fetch': 600,
  'memory': 400,
  'sequential-thinking': 500,
  'time': 200,
  'everart': 800,
  'everything': 1000,

  // Default for unknown servers
  'default': 500,
};

/**
 * Base context overhead per enabled MCP server
 * (connection info, server metadata, etc.)
 */
export const MCP_BASE_OVERHEAD = 100;

// =============================================================================
// Budget Calculation
// =============================================================================

/**
 * Estimate context token cost for a single MCP server
 * @param name - Server name
 * @returns Estimated token cost
 */
export function estimateServerCost(name: string): number {
  // Normalize name: strip version, scope, etc.
  const normalizedName = name
    .replace(/^@[^/]+\//, '') // Remove npm scope
    .replace(/-mcp$/, '')      // Remove -mcp suffix
    .replace(/-server$/, '')   // Remove -server suffix
    .toLowerCase();

  // Look up known cost or use default
  const knownCost = MCP_CONTEXT_COSTS[normalizedName];
  if (knownCost !== undefined) {
    return knownCost + MCP_BASE_OVERHEAD;
  }

  // Use default cost for unknown servers
  return MCP_CONTEXT_COSTS['default']! + MCP_BASE_OVERHEAD;
}

/**
 * Calculate total context budget for all enabled MCP servers
 * @param servers - Array of MCP server states
 * @returns Budget summary with totals and per-server breakdown
 */
export function calculateBudget(servers: McpServerState[]): McpBudgetSummary {
  const enabledServers = servers.filter(
    (s) => s.status !== 'disabled' && s.status !== 'error'
  );

  // Calculate totals
  const totalTokens = enabledServers.reduce(
    (sum, server) => sum + estimateServerCost(server.name),
    0
  );

  const totalRequests = enabledServers.reduce(
    (sum, server) => sum + server.requestCount,
    0
  );

  // Create summary
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return {
    serverName: 'all',
    totalRequests,
    successfulRequests: totalRequests, // Assume all successful for estimates
    failedRequests: 0,
    tokensUsed: totalTokens,
    budgetExceeded: false,
    period: {
      start: startOfDay,
      end: now,
    },
  };
}

/**
 * Calculate per-server budget summaries
 * @param servers - Array of MCP server states
 * @returns Array of per-server budget summaries
 */
export function calculatePerServerBudget(
  servers: McpServerState[]
): McpBudgetSummary[] {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return servers.map((server) => ({
    serverName: server.name,
    totalRequests: server.requestCount,
    successfulRequests: server.status === 'running' ? server.requestCount : 0,
    failedRequests: server.status === 'error' ? server.requestCount : 0,
    tokensUsed: estimateServerCost(server.name),
    budgetExceeded: false,
    period: {
      start: startOfDay,
      end: now,
    },
  }));
}

/**
 * Format budget summary for display
 * @param summary - Budget summary to format
 * @returns Formatted string representation
 */
export function formatBudgetSummary(summary: McpBudgetSummary): string {
  const lines: string[] = [];

  lines.push(`Server: ${summary.serverName}`);
  lines.push(`  Estimated Tokens: ${summary.tokensUsed?.toLocaleString() ?? 'N/A'}`);
  lines.push(`  Total Requests: ${summary.totalRequests}`);

  if (summary.budgetLimit !== undefined) {
    const percentUsed = ((summary.tokensUsed ?? 0) / summary.budgetLimit) * 100;
    lines.push(`  Budget: ${percentUsed.toFixed(1)}% used`);
    if (summary.budgetExceeded) {
      lines.push(`  WARNING: Budget exceeded!`);
    }
  }

  return lines.join('\n');
}

/**
 * Check if total context budget exceeds a limit
 * @param servers - Array of MCP server states
 * @param maxTokens - Maximum allowed tokens
 * @returns Object with exceeded status and current usage
 */
export function checkContextBudget(
  servers: McpServerState[],
  maxTokens: number
): { exceeded: boolean; current: number; limit: number; percentage: number } {
  const budget = calculateBudget(servers);
  const current = budget.tokensUsed ?? 0;

  return {
    exceeded: current > maxTokens,
    current,
    limit: maxTokens,
    percentage: (current / maxTokens) * 100,
  };
}
