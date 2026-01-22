/**
 * Setup manifest types with Zod schemas
 * Defines setup/profile structure for claude-code-kit
 */

import { z } from 'zod';
import { ModelNameSchema } from './config.js';

// =============================================================================
// Validation Patterns
// =============================================================================

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;

// =============================================================================
// Setup Metadata
// =============================================================================

export const SetupMetadataSchema = z.object({
  name: z.string()
    .min(1)
    .max(64)
    .regex(NAME_PATTERN, 'Name must be lowercase, start with letter, contain only letters, numbers, and hyphens'),
  version: z.string()
    .regex(SEMVER_PATTERN, 'Version must be valid semver (e.g., 1.0.0)'),
  description: z.string().max(256).optional(),
  author: z.string().max(128).optional(),
  extends: z.string().optional(),
});
export type SetupMetadata = z.infer<typeof SetupMetadataSchema>;

// =============================================================================
// Setup Requirements
// =============================================================================

export const VersionConstraintSchema = z.string().regex(
  /^[~^]?\d+(\.\d+)?(\.\d+)?(-[a-zA-Z0-9.-]+)?(\s*\|\|\s*[~^]?\d+(\.\d+)?(\.\d+)?(-[a-zA-Z0-9.-]+)?)*$/,
  'Invalid version constraint'
).optional();

export const SetupRequiresSchema = z.object({
  'oh-my-claudecode': VersionConstraintSchema,
  addons: z.array(z.string()).optional(),
});
export type SetupRequires = z.infer<typeof SetupRequiresSchema>;

// =============================================================================
// Setup Skills
// =============================================================================

export const SetupSkillsSchema = z.object({
  enabled: z.array(z.string()).optional(),
  disabled: z.array(z.string()).optional(),
});
export type SetupSkills = z.infer<typeof SetupSkillsSchema>;

// =============================================================================
// Setup Agents
// =============================================================================

export const AgentConfigSchema = z.object({
  model: ModelNameSchema.optional(),
  priority: z.number().int().min(0).max(100).optional(),
  enabled: z.boolean().optional().default(true),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const SetupAgentsSchema = z.record(z.string(), AgentConfigSchema);
export type SetupAgents = z.infer<typeof SetupAgentsSchema>;

// =============================================================================
// Setup MCP
// =============================================================================

export const SetupMcpSchema = z.object({
  recommended: z.array(z.string()).optional(),
  required: z.array(z.string()).optional(),
  max_enabled: z.number().int().positive().optional(),
});
export type SetupMcp = z.infer<typeof SetupMcpSchema>;

// =============================================================================
// Setup Hooks
// =============================================================================

export const HookTemplateSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  matcher: z.string(),
  handler: z.string(),
  priority: z.number().int().optional().default(0),
});
export type HookTemplate = z.infer<typeof HookTemplateSchema>;

export const SetupHooksSchema = z.object({
  templates: z.array(HookTemplateSchema).optional(),
});
export type SetupHooks = z.infer<typeof SetupHooksSchema>;

// =============================================================================
// Setup Commands
// =============================================================================

export const CommandConfigSchema = z.object({
  enabled: z.boolean().optional().default(true),
  alias: z.string().optional(),
  description: z.string().optional(),
});
export type CommandConfig = z.infer<typeof CommandConfigSchema>;

export const SetupCommandsSchema = z.record(z.string(), CommandConfigSchema);
export type SetupCommands = z.infer<typeof SetupCommandsSchema>;

// =============================================================================
// Full Setup Manifest
// =============================================================================

export const SetupManifestSchema = z.object({
  // Metadata (required)
  name: z.string()
    .min(1)
    .max(64)
    .regex(NAME_PATTERN, 'Name must be lowercase, start with letter, contain only letters, numbers, and hyphens'),
  version: z.string()
    .regex(SEMVER_PATTERN, 'Version must be valid semver (e.g., 1.0.0)'),
  description: z.string().max(256).optional(),
  author: z.string().max(128).optional(),

  // Inheritance
  extends: z.string().optional(),

  // Requirements
  requires: SetupRequiresSchema.optional(),

  // Configuration sections
  skills: SetupSkillsSchema.optional(),
  agents: SetupAgentsSchema.optional(),
  mcp: SetupMcpSchema.optional(),
  hooks: SetupHooksSchema.optional(),
  commands: SetupCommandsSchema.optional(),

  // Custom content to append to CLAUDE.md
  content: z.string().optional(),
});
export type SetupManifest = z.infer<typeof SetupManifestSchema>;

// =============================================================================
// Loaded Setup (manifest + resolved content)
// =============================================================================

export interface LoadedSetup {
  /** The parsed manifest */
  manifest: SetupManifest;

  /** Resolved content (after inheriting from extends) */
  content: string;

  /** Source path of the setup file */
  sourcePath: string;

  /** Chain of inherited setups */
  inheritanceChain: string[];

  /** Whether this is the root setup or inherited */
  isRoot: boolean;
}

// =============================================================================
// Merged Setup (combined from multiple setups)
// =============================================================================

export interface MergedSetup {
  /** Final name (from root setup) */
  name: string;

  /** Final version (from root setup) */
  version: string;

  /** Combined description */
  description?: string;

  /** All resolved requirements */
  requires: {
    'oh-my-claudecode'?: string;
    addons: string[];
  };

  /** Merged skills configuration */
  skills: {
    enabled: string[];
    disabled: string[];
  };

  /** Merged agents configuration */
  agents: Record<string, {
    model?: 'haiku' | 'sonnet' | 'opus';
    priority: number;
    enabled: boolean;
  }>;

  /** Merged MCP configuration */
  mcp: {
    recommended: string[];
    required: string[];
    max_enabled?: number;
  };

  /** Merged hook templates */
  hooks: {
    templates: HookTemplate[];
  };

  /** Merged commands configuration */
  commands: Record<string, {
    enabled: boolean;
    alias?: string;
    description?: string;
  }>;

  /** Final merged content */
  content: string;

  /** All sources that contributed to this merge */
  sources: string[];
}

// =============================================================================
// Setup Validation Result
// =============================================================================

export interface SetupValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    path: string;
    message: string;
  }>;
}
