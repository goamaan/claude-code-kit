/**
 * Configuration types with Zod schemas
 * Defines all configuration structures for claude-kit
 */

import { z } from 'zod';

// =============================================================================
// Model Configuration
// =============================================================================

export const ModelNameSchema = z.enum(['haiku', 'sonnet', 'opus']);
export type ModelName = z.infer<typeof ModelNameSchema>;

export const ModelRoutingSchema = z.object({
  simple: ModelNameSchema.optional(),
  standard: ModelNameSchema.optional(),
  complex: ModelNameSchema.optional(),
});
export type ModelRouting = z.infer<typeof ModelRoutingSchema>;

export const ModelOverridesSchema = z.record(z.string(), ModelNameSchema);
export type ModelOverrides = z.infer<typeof ModelOverridesSchema>;

export const ModelConfigSchema = z.object({
  default: ModelNameSchema.optional(),
  routing: ModelRoutingSchema.optional(),
  overrides: ModelOverridesSchema.optional(),
});
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

// =============================================================================
// Profile Configuration
// =============================================================================

export const ProfileConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});
export type ProfileConfig = z.infer<typeof ProfileConfigSchema>;

// =============================================================================
// Cost Configuration
// =============================================================================

export const CostConfigSchema = z.object({
  tracking: z.boolean().optional().default(true),
  budget_daily: z.number().positive().optional(),
  budget_weekly: z.number().positive().optional(),
  budget_monthly: z.number().positive().optional(),
});
export type CostConfig = z.infer<typeof CostConfigSchema>;

// =============================================================================
// Sync Configuration
// =============================================================================

export const SyncConfigSchema = z.object({
  auto: z.boolean().optional().default(false),
  watch: z.boolean().optional().default(false),
});
export type SyncConfig = z.infer<typeof SyncConfigSchema>;

// =============================================================================
// Team Configuration
// =============================================================================

export const TeamConfigSchema = z.object({
  extends: z.string().url().optional(),
  enforce: z.boolean().optional().default(false),
});
export type TeamConfig = z.infer<typeof TeamConfigSchema>;

// =============================================================================
// Main Configuration (config.yaml at ~/.claude-kit/)
// =============================================================================

export const MainConfigSchema = z.object({
  profile: ProfileConfigSchema.optional(),
  model: ModelConfigSchema.optional(),
  cost: CostConfigSchema.optional(),
  sync: SyncConfigSchema.optional(),
  team: TeamConfigSchema.optional(),
});
export type MainConfig = z.infer<typeof MainConfigSchema>;

// =============================================================================
// Profile File Configuration
// =============================================================================

export const ProfileSkillsConfigSchema = z.object({
  enabled: z.array(z.string()).optional(),
  disabled: z.array(z.string()).optional(),
});
export type ProfileSkillsConfig = z.infer<typeof ProfileSkillsConfigSchema>;

export const ProfileAgentConfigSchema = z.object({
  model: ModelNameSchema.optional(),
  priority: z.number().int().min(0).max(100).optional(),
});
export type ProfileAgentConfig = z.infer<typeof ProfileAgentConfigSchema>;

export const ProfileAgentsConfigSchema = z.record(z.string(), ProfileAgentConfigSchema);
export type ProfileAgentsConfig = z.infer<typeof ProfileAgentsConfigSchema>;

export const ProfileMcpConfigSchema = z.object({
  enabled: z.array(z.string()).optional(),
  disabled: z.array(z.string()).optional(),
});
export type ProfileMcpConfig = z.infer<typeof ProfileMcpConfigSchema>;

export const ProfileFileConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  extends: z.string().optional(),
  skills: ProfileSkillsConfigSchema.optional(),
  agents: ProfileAgentsConfigSchema.optional(),
  mcp: ProfileMcpConfigSchema.optional(),
  model: ModelConfigSchema.optional(),
  cost: CostConfigSchema.optional(),
});
export type ProfileFileConfig = z.infer<typeof ProfileFileConfigSchema>;

// =============================================================================
// Project Configuration (.claude-kit.yaml in project root)
// =============================================================================

export const ProjectConfigSchema = z.object({
  profile: z.string().optional(),
  extends: z.string().url().optional(),
  model: ModelConfigSchema.optional(),
  cost: CostConfigSchema.optional(),
  skills: ProfileSkillsConfigSchema.optional(),
  agents: ProfileAgentsConfigSchema.optional(),
  mcp: ProfileMcpConfigSchema.optional(),
});
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

// =============================================================================
// Merged Configuration (all layers combined)
// =============================================================================

export interface MergedConfig {
  // Active profile info
  profile: {
    name: string;
    description?: string;
    source: 'default' | 'global' | 'project';
  };

  // Model configuration
  model: {
    default: ModelName;
    routing: Required<ModelRouting>;
    overrides: ModelOverrides;
  };

  // Cost configuration
  cost: {
    tracking: boolean;
    budget_daily?: number;
    budget_weekly?: number;
    budget_monthly?: number;
  };

  // Sync configuration
  sync: {
    auto: boolean;
    watch: boolean;
  };

  // Team configuration
  team?: {
    extends?: string;
    enforce: boolean;
  };

  // Skills configuration
  skills: {
    enabled: string[];
    disabled: string[];
  };

  // Agent configurations
  agents: Record<string, {
    model: ModelName;
    priority: number;
  }>;

  // MCP configuration
  mcp: {
    enabled: string[];
    disabled: string[];
  };
}

// =============================================================================
// Configuration Layer Types
// =============================================================================

export type ConfigLayer = 'default' | 'global' | 'profile' | 'team' | 'project';

export interface ConfigLayerInfo {
  layer: ConfigLayer;
  path?: string;
  config: Partial<MergedConfig>;
}

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_MODEL: ModelName = 'sonnet';

export const DEFAULT_MODEL_ROUTING: Required<ModelRouting> = {
  simple: 'haiku',
  standard: 'sonnet',
  complex: 'opus',
};

export const DEFAULT_MERGED_CONFIG: MergedConfig = {
  profile: {
    name: 'default',
    source: 'default',
  },
  model: {
    default: DEFAULT_MODEL,
    routing: DEFAULT_MODEL_ROUTING,
    overrides: {},
  },
  cost: {
    tracking: true,
  },
  sync: {
    auto: false,
    watch: false,
  },
  skills: {
    enabled: [],
    disabled: [],
  },
  agents: {},
  mcp: {
    enabled: [],
    disabled: [],
  },
};
