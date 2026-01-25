/**
 * Hook types with Zod schemas
 * Defines hook event types and handler interfaces
 */

import { z } from 'zod';

// =============================================================================
// Hook Events
// =============================================================================

export type HookEvent = 'PreToolUse' | 'PostToolUse' | 'Stop' | 'SubagentStop' | 'UserPromptSubmit';

export const HookEventSchema = z.enum(['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop', 'UserPromptSubmit']);

// =============================================================================
// Pre-Tool Use Hook Input
// =============================================================================

export const PreToolUseInputSchema = z.object({
  /** The tool being called */
  tool_name: z.string(),

  /** Tool input parameters */
  tool_input: z.record(z.unknown()),

  /** Session ID */
  session_id: z.string().optional(),

  /** Agent type if this is a subagent */
  agent_type: z.string().optional(),

  /** Timestamp of the event */
  timestamp: z.string().datetime().optional(),
});
export type PreToolUseInput = z.infer<typeof PreToolUseInputSchema>;

// =============================================================================
// Post-Tool Use Hook Input
// =============================================================================

export const PostToolUseInputSchema = z.object({
  /** The tool that was called */
  tool_name: z.string(),

  /** Tool input parameters */
  tool_input: z.record(z.unknown()),

  /** Tool output/result */
  tool_output: z.unknown(),

  /** Whether the tool succeeded */
  success: z.boolean(),

  /** Error message if failed */
  error: z.string().optional(),

  /** Execution duration in milliseconds */
  duration_ms: z.number().optional(),

  /** Session ID */
  session_id: z.string().optional(),

  /** Agent type if this is a subagent */
  agent_type: z.string().optional(),

  /** Timestamp of the event */
  timestamp: z.string().datetime().optional(),
});
export type PostToolUseInput = z.infer<typeof PostToolUseInputSchema>;

// =============================================================================
// Stop Hook Input
// =============================================================================

export const StopInputSchema = z.object({
  /** Reason for stopping */
  reason: z.enum(['complete', 'error', 'user_cancel', 'timeout', 'budget_exceeded']),

  /** Final message/output */
  message: z.string().optional(),

  /** Error details if stopped due to error */
  error: z.object({
    code: z.string(),
    message: z.string(),
    stack: z.string().optional(),
  }).optional(),

  /** Session statistics */
  stats: z.object({
    duration_ms: z.number(),
    tools_used: z.number(),
    tokens_used: z.number().optional(),
    cost_usd: z.number().optional(),
  }).optional(),

  /** Session ID */
  session_id: z.string().optional(),

  /** Timestamp of the event */
  timestamp: z.string().datetime().optional(),
});
export type StopInput = z.infer<typeof StopInputSchema>;

// =============================================================================
// Subagent Stop Hook Input
// =============================================================================

export const SubagentStopInputSchema = z.object({
  /** Agent type that stopped */
  agent_type: z.string(),

  /** Agent name/ID */
  agent_id: z.string().optional(),

  /** Reason for stopping */
  reason: z.enum(['complete', 'error', 'user_cancel', 'timeout', 'budget_exceeded']),

  /** Final message/output from subagent */
  message: z.string().optional(),

  /** Result of subagent execution */
  result: z.unknown().optional(),

  /** Error details if stopped due to error */
  error: z.object({
    code: z.string(),
    message: z.string(),
    stack: z.string().optional(),
  }).optional(),

  /** Subagent statistics */
  stats: z.object({
    duration_ms: z.number(),
    tools_used: z.number(),
    tokens_used: z.number().optional(),
    cost_usd: z.number().optional(),
  }).optional(),

  /** Parent session ID */
  session_id: z.string().optional(),

  /** Timestamp of the event */
  timestamp: z.string().datetime().optional(),
});
export type SubagentStopInput = z.infer<typeof SubagentStopInputSchema>;

// =============================================================================
// Hook Handler Interface
// =============================================================================

export type HookResult =
  | { action: 'continue' }
  | { action: 'skip'; reason?: string }
  | { action: 'modify'; input: Record<string, unknown> }
  | { action: 'error'; message: string };

export interface HookHandler<T = unknown> {
  /** Handler name for identification */
  name: string;

  /** Description of what this handler does */
  description?: string;

  /** Matcher pattern (glob, regex, or exact match) */
  matcher: string;

  /** Match type */
  matchType?: 'glob' | 'regex' | 'exact';

  /** Priority (higher runs first) */
  priority: number;

  /** Whether this handler is enabled */
  enabled: boolean;

  /** The handler function */
  handle: (input: T) => HookResult | Promise<HookResult>;

  /** Source add-on or 'built-in' */
  source: string;
}

// =============================================================================
// Composed Hooks Interface
// =============================================================================

export interface ComposedHooks {
  /** All PreToolUse handlers, sorted by priority */
  PreToolUse: Array<HookHandler<PreToolUseInput>>;

  /** All PostToolUse handlers, sorted by priority */
  PostToolUse: Array<HookHandler<PostToolUseInput>>;

  /** All Stop handlers, sorted by priority */
  Stop: Array<HookHandler<StopInput>>;

  /** All SubagentStop handlers, sorted by priority */
  SubagentStop: Array<HookHandler<SubagentStopInput>>;
}

// =============================================================================
// Settings Hook Entry (for settings.json hooks)
// =============================================================================

/**
 * Individual hook command specification
 */
export interface SettingsHookCommand {
  /** Type of hook (currently only "command" or "prompt" supported) */
  type: 'command' | 'prompt';

  /** Command to execute (for type: "command") */
  command?: string;

  /** Prompt to send to LLM (for type: "prompt") */
  prompt?: string;

  /** Timeout in seconds */
  timeout?: number;
}

/**
 * Hook entry in settings.json
 *
 * Format per official Claude Code docs:
 * - matcher: String pattern (regex supported, e.g., "Bash", "Edit|Write", "*")
 * - hooks: Array of command objects
 */
export interface SettingsHookEntry {
  /**
   * Matcher pattern - STRING format
   * - Simple: "Write" matches only Write tool
   * - Regex: "Edit|Write" or "Notebook.*"
   * - Wildcard: "*" matches all tools
   * - Expression: 'tool == "Bash" && tool_input.command matches "..."'
   * - Optional for events like UserPromptSubmit, Stop
   */
  matcher?: string;

  /** Array of hook commands to execute */
  hooks: SettingsHookCommand[];

  /** Optional description of what the hook does */
  description?: string;
}

export interface SettingsHooks {
  PreToolUse?: SettingsHookEntry[];
  PostToolUse?: SettingsHookEntry[];
  PostToolUseFailure?: SettingsHookEntry[];
  Stop?: SettingsHookEntry[];
  SubagentStop?: SettingsHookEntry[];
  SubagentStart?: SettingsHookEntry[];
  UserPromptSubmit?: SettingsHookEntry[];
  SessionStart?: SettingsHookEntry[];
  SessionEnd?: SettingsHookEntry[];
  PreCompact?: SettingsHookEntry[];
  Setup?: SettingsHookEntry[];
  Notification?: SettingsHookEntry[];
  PermissionRequest?: SettingsHookEntry[];
}

// =============================================================================
// Hook Execution Context
// =============================================================================

export interface HookContext {
  /** Current session ID */
  sessionId: string;

  /** Working directory */
  cwd: string;

  /** Current profile name */
  profile: string;

  /** Environment variables to pass to hooks */
  env: Record<string, string>;

  /** Logging function */
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string) => void;
}

// =============================================================================
// Hook Execution Result
// =============================================================================

export interface HookExecutionResult {
  /** Handler name that produced this result */
  handler: string;

  /** Result of execution */
  result: HookResult;

  /** Execution duration in milliseconds */
  duration_ms: number;

  /** Any errors encountered */
  error?: {
    code: string;
    message: string;
  };
}

export interface HookChainResult {
  /** Final action to take */
  action: 'continue' | 'skip' | 'modify' | 'error';

  /** Modified input if action is 'modify' */
  modifiedInput?: Record<string, unknown>;

  /** Error message if action is 'error' */
  error?: string;

  /** Results from each handler in the chain */
  results: HookExecutionResult[];

  /** Total execution time */
  total_duration_ms: number;
}
