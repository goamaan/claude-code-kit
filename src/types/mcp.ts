/**
 * MCP (Model Context Protocol) types with Zod schemas
 * Defines MCP server configuration and state management
 */

import { z } from 'zod';

// =============================================================================
// MCP Server Configuration
// =============================================================================

export const McpServerEnvSchema = z.record(z.string(), z.string());
export type McpServerEnv = z.infer<typeof McpServerEnvSchema>;

export const McpServerConfigSchema = z.object({
  /** Server command to execute */
  command: z.string(),

  /** Command arguments */
  args: z.array(z.string()).optional(),

  /** Environment variables */
  env: McpServerEnvSchema.optional(),

  /** Working directory */
  cwd: z.string().optional(),

  /** Timeout in milliseconds */
  timeout: z.number().positive().optional(),

  /** Whether server is enabled */
  enabled: z.boolean().optional().default(true),
});
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

// =============================================================================
// MCP Server State
// =============================================================================

export const McpServerStatusSchema = z.enum([
  'stopped',
  'starting',
  'running',
  'error',
  'disabled',
]);
export type McpServerStatus = z.infer<typeof McpServerStatusSchema>;

export const McpServerStateSchema = z.object({
  /** Server name */
  name: z.string(),

  /** Current status */
  status: McpServerStatusSchema,

  /** Process ID if running */
  pid: z.number().optional(),

  /** Start timestamp */
  startedAt: z.string().datetime().optional(),

  /** Error message if status is 'error' */
  error: z.string().optional(),

  /** Number of requests handled */
  requestCount: z.number().default(0),

  /** Last request timestamp */
  lastRequestAt: z.string().datetime().optional(),

  /** Uptime in milliseconds */
  uptimeMs: z.number().optional(),
});
export type McpServerState = z.infer<typeof McpServerStateSchema>;

// =============================================================================
// MCP Budget Summary
// =============================================================================

export interface McpBudgetSummary {
  /** Server name */
  serverName: string;

  /** Total requests made */
  totalRequests: number;

  /** Successful requests */
  successfulRequests: number;

  /** Failed requests */
  failedRequests: number;

  /** Total tokens used (if tracked) */
  tokensUsed?: number;

  /** Estimated cost in USD (if tracked) */
  costUsd?: number;

  /** Budget limit (if set) */
  budgetLimit?: number;

  /** Budget remaining (if limit set) */
  budgetRemaining?: number;

  /** Whether budget is exceeded */
  budgetExceeded: boolean;

  /** Time period for this summary */
  period: {
    start: Date;
    end: Date;
  };
}

// =============================================================================
// MCP Server Info (for display)
// =============================================================================

export interface McpServerInfo {
  /** Server name */
  name: string;

  /** Server configuration */
  config: McpServerConfig;

  /** Current state */
  state: McpServerState;

  /** Source of configuration */
  source: 'global' | 'profile' | 'project' | 'addon';

  /** Budget summary if tracking enabled */
  budget?: McpBudgetSummary;

  /** Available tools provided by this server */
  tools?: Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
  }>;

  /** Available resources provided by this server */
  resources?: Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
  }>;

  /** Available prompts provided by this server */
  prompts?: Array<{
    name: string;
    description?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }>;
}

// =============================================================================
// MCP Settings (for claude_desktop_config.json)
// =============================================================================

export const McpSettingsServerSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
});
export type McpSettingsServer = z.infer<typeof McpSettingsServerSchema>;

export const McpSettingsSchema = z.object({
  mcpServers: z.record(z.string(), McpSettingsServerSchema).optional(),
});
export type McpSettings = z.infer<typeof McpSettingsSchema>;

// =============================================================================
// MCP Operations
// =============================================================================

export interface McpServerStartOptions {
  /** Server name to start */
  name: string;

  /** Force restart if already running */
  force?: boolean;

  /** Timeout in milliseconds */
  timeout?: number;
}

export interface McpServerStopOptions {
  /** Server name to stop */
  name: string;

  /** Force kill (SIGKILL instead of SIGTERM) */
  force?: boolean;

  /** Timeout for graceful shutdown */
  timeout?: number;
}

export interface McpServerRestartOptions {
  /** Server name to restart */
  name: string;

  /** Timeout for graceful shutdown */
  shutdownTimeout?: number;

  /** Timeout for startup */
  startupTimeout?: number;
}

export interface McpServerListOptions {
  /** Filter by status */
  status?: McpServerStatus[];

  /** Filter by source */
  source?: Array<'global' | 'profile' | 'project' | 'addon'>;

  /** Include disabled servers */
  includeDisabled?: boolean;
}

// =============================================================================
// MCP Validation
// =============================================================================

export interface McpValidationResult {
  /** Server name */
  name: string;

  /** Whether configuration is valid */
  valid: boolean;

  /** Validation errors */
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;

  /** Validation warnings */
  warnings: Array<{
    field: string;
    message: string;
  }>;

  /** Whether command exists and is executable */
  commandValid?: boolean;

  /** Whether environment variables are set */
  envValid?: boolean;
}

// =============================================================================
// MCP Discovery
// =============================================================================

export interface McpDiscoveredServer {
  /** Server name (from manifest or directory) */
  name: string;

  /** Server type */
  type: 'npm' | 'python' | 'binary' | 'unknown';

  /** Path to server */
  path: string;

  /** Suggested configuration */
  suggestedConfig: McpServerConfig;

  /** Description if found in manifest */
  description?: string;

  /** Version if found */
  version?: string;
}
