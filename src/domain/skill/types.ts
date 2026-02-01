/**
 * Skill Types
 * Type definitions for the claudeops skill system
 */

export type Domain =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'devops'
  | 'security'
  | 'testing'
  | 'documentation'
  | 'general';

// =============================================================================
// Skill Definition
// =============================================================================

/**
 * Skill metadata from YAML frontmatter (agentskills.io-compatible format)
 */
export interface SkillMetadata {
  /** Unique skill identifier */
  name: string;

  /** Human-readable description */
  description: string;

  /** License (e.g., "MIT") */
  license?: string;

  // claudeops-specific (from metadata.claudeops.*)

  /** Patterns that trigger this skill (optional) */
  autoTrigger?: string[];

  /** Domains this skill applies to */
  domains?: Domain[];

  /** Model to use when skill runs in subagent */
  model?: 'haiku' | 'sonnet' | 'opus' | 'inherit';

  /** Whether to disable auto-invocation by Claude */
  disableModelInvocation?: boolean;

  /** Whether user can manually invoke */
  userInvocable?: boolean;

  /** Tools this skill is allowed to use */
  allowedTools?: string[];

  /** Whether this skill is always active (loaded regardless of context) */
  alwaysActive?: boolean;

  /** Original metadata block (for ecosystem skills) */
  rawMetadata?: Record<string, unknown>;
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

  /** Claude Code skills directory (~/.claude/skills/) - for testing */
  claudeSkillsDir?: string;

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
