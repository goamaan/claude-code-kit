/**
 * MCP Domain Module
 * Re-exports MCP server management and budget utilities
 */

// Manager
export {
  createMcpManager,
  McpServerNotFoundError,
  McpServerExistsError,
  McpConfigError,
  type McpManager,
} from './manager.js';

// Budget
export {
  MCP_CONTEXT_COSTS,
  MCP_BASE_OVERHEAD,
  estimateServerCost,
  calculateBudget,
  calculatePerServerBudget,
  formatBudgetSummary,
  checkContextBudget,
} from './budget.js';
