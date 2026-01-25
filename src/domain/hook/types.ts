/**
 * Hook Domain Types
 * Type definitions for the claudeops hook management system
 */

import type { HookEvent } from '../../types/hook.js';

// =============================================================================
// Hook Definition
// =============================================================================

/**
 * Where the hook was loaded from
 */
export type HookSourceType = 'builtin' | 'global' | 'project' | 'settings';

/**
 * Hook metadata from script header or config
 */
export interface HookMetadata {
  /** Unique hook identifier */
  name: string;

  /** Human-readable description */
  description: string;

  /** Event type this hook handles */
  event: HookEvent;

  /** Matcher pattern (glob, regex, or exact) */
  matcher: string;

  /** Priority (higher runs first) */
  priority: number;

  /** Whether this hook is enabled */
  enabled: boolean;

  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Complete hook definition
 */
export interface Hook {
  /** Hook metadata */
  metadata: HookMetadata;

  /** Handler path (script file) */
  handlerPath: string;

  /** Source path of the hook file */
  sourcePath: string;

  /** Source type: built-in, global, project, settings */
  sourceType: HookSourceType;
}

// =============================================================================
// Hook Manager Options
// =============================================================================

/**
 * Options for hook manager initialization
 */
export interface HookManagerOptions {
  /** Directory containing built-in hooks */
  builtinHooksDir?: string;

  /** Global hooks directory (~/.claudeops/hooks/) */
  globalHooksDir?: string;

  /** Project hooks directory (.claude/hooks/) */
  projectHooksDir?: string;

  /** Hooks explicitly disabled */
  disabledHooks?: string[];
}

// =============================================================================
// Hook Sync Result
// =============================================================================

/**
 * Result of syncing hooks to Claude settings
 */
export interface HookSyncResult {
  /** Hooks added to settings */
  added: string[];

  /** Hooks updated in settings */
  updated: string[];

  /** Hooks removed from settings */
  removed: string[];

  /** Any errors encountered */
  errors: string[];
}
