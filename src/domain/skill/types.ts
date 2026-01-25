/**
 * Skill Types
 * Type definitions for the claudeops skill system
 */

import type { Domain } from '../../core/classifier/types.js';

// =============================================================================
// Skill Definition
// =============================================================================

/**
 * Skill metadata from YAML frontmatter
 */
export interface SkillMetadata {
  /** Unique skill identifier */
  name: string;

  /** Human-readable description */
  description: string;

  /** Patterns that trigger this skill (optional) */
  autoTrigger?: string[];

  /** Domains this skill applies to */
  domains?: Domain[];

  /** Whether to disable auto-invocation by Claude */
  disableModelInvocation?: boolean;

  /** Whether user can manually invoke */
  userInvocable?: boolean;

  /** Tools this skill is allowed to use */
  allowedTools?: string[];

  /** Model to use when skill runs in subagent */
  model?: 'haiku' | 'sonnet' | 'opus' | 'inherit';
}

/**
 * Complete skill definition
 */
export interface Skill {
  /** Skill metadata from frontmatter */
  metadata: SkillMetadata;

  /** Full skill content (markdown body) */
  content: string;

  /** Source path of the skill file */
  sourcePath: string;

  /** Source type: built-in, global, project, profile */
  sourceType: SkillSourceType;
}

/**
 * Where the skill was loaded from
 */
export type SkillSourceType = 'builtin' | 'global' | 'project' | 'profile';

// =============================================================================
// Skill Matching
// =============================================================================

/**
 * Result of skill matching
 */
export interface SkillMatch {
  /** The matched skill */
  skill: Skill;

  /** Why it matched */
  matchReason: 'auto_trigger' | 'domain' | 'classification' | 'explicit';

  /** Match score (0-1) */
  score: number;
}

// =============================================================================
// Skill Manager Options
// =============================================================================

/**
 * Options for skill manager initialization
 */
export interface SkillManagerOptions {
  /** Directory containing built-in skills */
  builtinSkillsDir?: string;

  /** Global skills directory (~/.claudeops/skills/) */
  globalSkillsDir?: string;

  /** Project skills directory (.claude/skills/) */
  projectSkillsDir?: string;

  /** Profile-specific skills to enable */
  profileSkills?: string[];

  /** Skills explicitly disabled */
  disabledSkills?: string[];
}

/**
 * Skill context formatted for injection
 */
export interface FormattedSkillContext {
  /** The formatted context string */
  context: string;

  /** Skills included in context */
  skills: string[];

  /** Total character count */
  characterCount: number;
}
