/**
 * Generator Types
 * Type definitions for AI-powered skill and hook generation
 */

import type { HookEvent } from '../../types/hook.js';
import type { Domain } from '../../core/classifier/types.js';

// =============================================================================
// Generation Request Types
// =============================================================================

/**
 * Common generation options
 */
export interface GenerationOptions {
  /** Model to use for generation (default: sonnet) */
  model?: 'haiku' | 'sonnet' | 'opus';

  /** Reference URL to fetch for context */
  referenceUrl?: string;

  /** Skip confirmation and install directly */
  skipConfirm?: boolean;
}

/**
 * Skill generation request
 */
export interface SkillGenerationRequest extends GenerationOptions {
  /** Description of the skill to generate */
  description: string;

  /** Desired skill name (optional, AI will suggest if not provided) */
  name?: string;

  /** Domains the skill applies to */
  domains?: Domain[];

  /** Auto-trigger patterns */
  autoTrigger?: string[];
}

/**
 * Hook generation request
 */
export interface HookGenerationRequest extends GenerationOptions {
  /** Description of the hook to generate */
  description: string;

  /** Desired hook name (optional, AI will suggest if not provided) */
  name?: string;

  /** Event type for the hook */
  event?: HookEvent;

  /** Matcher pattern for the hook */
  matcher?: string;

  /** Priority (0-100, higher runs first) */
  priority?: number;
}

// =============================================================================
// Generation Result Types
// =============================================================================

/**
 * Generated skill result
 */
export interface GeneratedSkill {
  /** Skill name */
  name: string;

  /** Skill description */
  description: string;

  /** Full skill content (markdown with frontmatter) */
  content: string;

  /** Auto-trigger patterns */
  autoTrigger: string[];

  /** Domains */
  domains: Domain[];

  /** Model recommendation */
  model?: 'haiku' | 'sonnet' | 'opus' | 'inherit';

  /** Whether user can manually invoke */
  userInvocable: boolean;
}

/**
 * Generated hook result
 */
export interface GeneratedHook {
  /** Hook name */
  name: string;

  /** Hook description */
  description: string;

  /** Event type */
  event: HookEvent;

  /** Matcher pattern */
  matcher: string;

  /** Handler script content */
  handlerContent: string;

  /** Priority */
  priority: number;
}

// =============================================================================
// Generator Errors
// =============================================================================

export class GeneratorError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'CLI_NOT_FOUND'
      | 'CLI_ERROR'
      | 'PARSE_ERROR'
      | 'NETWORK_ERROR'
      | 'INVALID_INPUT',
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'GeneratorError';
  }
}

// =============================================================================
// Claude CLI Types
// =============================================================================

export interface ClaudeCliOptions {
  /** Prompt to send */
  prompt: string;

  /** Model to use */
  model?: 'haiku' | 'sonnet' | 'opus';

  /** Timeout in milliseconds (default: 60000) */
  timeout?: number;

  /** System prompt override */
  systemPrompt?: string;
}

export interface ClaudeCliResult {
  /** Whether the call succeeded */
  success: boolean;

  /** Output from Claude */
  output?: string;

  /** Error message if failed */
  error?: string;

  /** Exit code */
  exitCode?: number;
}
