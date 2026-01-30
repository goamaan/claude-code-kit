/**
 * Profile types
 * Defines interfaces for profile management operations
 */

import type { ModelName, ProfileFileConfig } from './config.js';

// =============================================================================
// Profile Summary (for listing)
// =============================================================================

export interface ProfileSummary {
  /** Profile name */
  name: string;

  /** Profile description */
  description?: string;

  /** Path to profile file */
  path: string;

  /** Whether this is the active profile */
  active: boolean;

  /** Whether profile extends another */
  extends?: string;

  /** Last modified timestamp */
  modifiedAt: Date;

  /** Number of enabled skills */
  skillCount: number;

  /** Number of agent overrides */
  agentCount: number;
}

// =============================================================================
// Profile Details (full profile info)
// =============================================================================

export interface ProfileDetails {
  /** Profile name */
  name: string;

  /** Profile description */
  description?: string;

  /** Path to profile file */
  path: string;

  /** Whether this is the active profile */
  active: boolean;

  /** Full profile configuration */
  config: ProfileFileConfig;

  /** Resolved configuration (after inheritance) */
  resolved: {
    /** All enabled skills (including inherited) */
    skills: {
      enabled: string[];
      disabled: string[];
    };

    /** All enabled hooks (including inherited) */
    hooks: {
      enabled: string[];
      disabled: string[];
    };

    /** All agent configurations (including inherited) */
    agents: Record<string, {
      model?: ModelName;
      priority: number;
    }>;

    /** MCP configuration */
    mcp: {
      enabled: string[];
      disabled: string[];
    };

    /** Model configuration */
    model: {
      default: ModelName;
      routing: {
        simple: ModelName;
        standard: ModelName;
        complex: ModelName;
      };
      overrides: Record<string, ModelName>;
    };

    /** Custom CLAUDE.md content */
    content?: string;
  };

  /** Inheritance chain */
  inheritanceChain: string[];

  /** Creation timestamp */
  createdAt: Date;

  /** Last modified timestamp */
  modifiedAt: Date;
}

// =============================================================================
// Profile Operations
// =============================================================================

export interface CreateProfileOptions {
  /** Profile name */
  name: string;

  /** Profile description */
  description?: string;

  /** Base profile to extend */
  extends?: string;

  /** Initial skills configuration */
  skills?: {
    enabled?: string[];
    disabled?: string[];
  };

  /** Initial agent configurations */
  agents?: Record<string, {
    model?: ModelName;
    priority?: number;
  }>;

  /** Initial MCP configuration */
  mcp?: {
    enabled?: string[];
    disabled?: string[];
  };

  /** Initial model configuration */
  model?: {
    default?: ModelName;
    routing?: {
      simple?: ModelName;
      standard?: ModelName;
      complex?: ModelName;
    };
  };

  /** Custom CLAUDE.md content */
  content?: string;

  /** Whether to activate after creation */
  activate?: boolean;
}

export interface ExportProfileOptions {
  /** Profile name to export */
  name: string;

  /** Output format */
  format: 'yaml' | 'json';

  /** Whether to include resolved values */
  resolved?: boolean;

  /** Whether to include metadata */
  includeMetadata?: boolean;

  /** Output path (if not specified, returns string) */
  outputPath?: string;
}

export interface ImportProfileOptions {
  /** Path to profile file or URL */
  source: string;

  /** New name for imported profile (defaults to original) */
  name?: string;

  /** Whether to overwrite existing profile */
  overwrite?: boolean;

  /** Whether to validate before importing */
  validate?: boolean;

  /** Whether to activate after import */
  activate?: boolean;
}

export interface CloneProfileOptions {
  /** Source profile name */
  source: string;

  /** New profile name */
  name: string;

  /** New description */
  description?: string;

  /** Whether to activate after cloning */
  activate?: boolean;
}

export interface DeleteProfileOptions {
  /** Profile name to delete */
  name: string;

  /** Skip confirmation */
  force?: boolean;
}

export interface SwitchProfileOptions {
  /** Profile name to switch to */
  name: string;

  /** Apply to project level instead of global */
  project?: boolean;
}

// =============================================================================
// Profile Validation
// =============================================================================

export interface ProfileValidationResult {
  /** Whether profile is valid */
  valid: boolean;

  /** Validation errors */
  errors: Array<{
    path: string;
    message: string;
    code: string;
  }>;

  /** Validation warnings */
  warnings: Array<{
    path: string;
    message: string;
  }>;

  /** Missing dependencies */
  missingDependencies: Array<{
    type: 'profile' | 'addon' | 'skill';
    name: string;
  }>;
}

// =============================================================================
// Profile Diff
// =============================================================================

export interface ProfileDiff {
  /** Profiles being compared */
  profiles: [string, string];

  /** Added items */
  added: {
    skills: string[];
    agents: string[];
    mcp: string[];
  };

  /** Removed items */
  removed: {
    skills: string[];
    agents: string[];
    mcp: string[];
  };

  /** Changed items */
  changed: {
    agents: Array<{
      name: string;
      from: { model?: ModelName; priority?: number };
      to: { model?: ModelName; priority?: number };
    }>;
    model: {
      default?: { from: ModelName; to: ModelName };
      routing?: {
        simple?: { from: ModelName; to: ModelName };
        standard?: { from: ModelName; to: ModelName };
        complex?: { from: ModelName; to: ModelName };
      };
    };
  };
}
