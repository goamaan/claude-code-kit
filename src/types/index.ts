/**
 * Barrel export for all types
 * Re-exports all types and schemas from individual modules
 */

// =============================================================================
// Configuration Types
// =============================================================================

export {
  // Schemas
  ModelNameSchema,
  ModelRoutingSchema,
  ModelOverridesSchema,
  ModelConfigSchema,
  ProfileConfigSchema,
  CostConfigSchema,
  SyncConfigSchema,
  TeamConfigSchema,
  MainConfigSchema,
  ProfileSkillsConfigSchema,
  ProfileAgentConfigSchema,
  ProfileAgentsConfigSchema,
  ProfileMcpConfigSchema,
  ProfileFileConfigSchema,
  ProjectConfigSchema,
  // Types
  type ModelName,
  type ModelRouting,
  type ModelOverrides,
  type ModelConfig,
  type ProfileConfig,
  type CostConfig,
  type SyncConfig,
  type TeamConfig,
  type MainConfig,
  type ProfileSkillsConfig,
  type ProfileAgentConfig,
  type ProfileAgentsConfig,
  type ProfileMcpConfig,
  type ProfileFileConfig,
  type ProjectConfig,
  type MergedConfig,
  type ConfigLayer,
  type ConfigLayerInfo,
  // Constants
  DEFAULT_MODEL,
  DEFAULT_MODEL_ROUTING,
  DEFAULT_MERGED_CONFIG,
} from './config.js';

// =============================================================================
// Setup Types
// =============================================================================

export {
  // Schemas
  SetupMetadataSchema,
  VersionConstraintSchema,
  SetupRequiresSchema,
  SetupSkillsSchema,
  AgentConfigSchema,
  SetupAgentsSchema,
  SetupMcpSchema,
  HookTemplateSchema,
  SetupHooksSchema,
  CommandConfigSchema,
  SetupCommandsSchema,
  SetupManifestSchema,
  // Types
  type SetupMetadata,
  type SetupRequires,
  type SetupSkills,
  type AgentConfig,
  type SetupAgents,
  type SetupMcp,
  type HookTemplate,
  type SetupHooks,
  type CommandConfig,
  type SetupCommands,
  type SetupManifest,
  type LoadedSetup,
  type MergedSetup,
  type SetupValidationResult,
} from './setup.js';

// =============================================================================
// Add-on Types
// =============================================================================

export {
  // Schemas
  AddonMetadataSchema,
  HookMatcherSchema,
  AddonHooksSchema,
  AddonRuntimeSchema,
  AddonDependencySchema,
  AddonInstallSchema,
  AddonConfigOptionTypeSchema,
  AddonConfigOptionSchema,
  AddonManifestSchema,
  // Types
  type AddonMetadata,
  type HookMatcher,
  type HookMatcherInput,
  type AddonHooks,
  type AddonHooksInput,
  type AddonRuntime,
  type AddonDependency,
  type AddonInstall,
  type AddonConfigOptionType,
  type AddonConfigOption,
  type AddonManifest,
  type InstalledAddon,
  type RegistryEntry,
  type RegistrySearchResult,
  type AddonResolution,
  type AddonValidationResult,
} from './addon.js';

// =============================================================================
// Hook Types
// =============================================================================

export {
  // Schemas
  HookEventSchema,
  PreToolUseInputSchema,
  PostToolUseInputSchema,
  StopInputSchema,
  SubagentStopInputSchema,
  // Types
  type HookEvent,
  type PreToolUseInput,
  type PostToolUseInput,
  type StopInput,
  type SubagentStopInput,
  type HookResult,
  type HookHandler,
  type ComposedHooks,
  type SettingsHookEntry,
  type SettingsHooks,
  type HookContext,
  type HookExecutionResult,
  type HookChainResult,
} from './hook.js';

// =============================================================================
// Profile Types
// =============================================================================

export {
  type ProfileSummary,
  type ProfileDetails,
  type CreateProfileOptions,
  type ExportProfileOptions,
  type ImportProfileOptions,
  type CloneProfileOptions,
  type DeleteProfileOptions,
  type SwitchProfileOptions,
  type ProfileValidationResult,
  type ProfileDiff,
} from './profile.js';

// =============================================================================
// MCP Types
// =============================================================================

export {
  // Schemas
  McpServerEnvSchema,
  McpServerConfigSchema,
  McpServerStatusSchema,
  McpServerStateSchema,
  McpSettingsServerSchema,
  McpSettingsSchema,
  // Types
  type McpServerEnv,
  type McpServerConfig,
  type McpServerStatus,
  type McpServerState,
  type McpBudgetSummary,
  type McpServerInfo,
  type McpSettingsServer,
  type McpSettings,
  type McpServerStartOptions,
  type McpServerStopOptions,
  type McpServerRestartOptions,
  type McpServerListOptions,
  type McpValidationResult,
  type McpDiscoveredServer,
} from './mcp.js';

// =============================================================================
// Cost Types
// =============================================================================

export {
  type CostEntry,
  type CostSummary,
  type CostQueryOptions,
  type CostReportOptions,
  type ModelPricing,
  type CostAlert,
  DEFAULT_PRICING,
} from './cost.js';

// =============================================================================
// Diagnostic Types
// =============================================================================

export {
  type DiagnosticSeverity,
  type DiagnosticResult,
  type DiagnosticCategory,
  type FixResult,
  type ValidationResult,
  type DiagnosticCheck,
  type DiagnosticContext,
  type DiagnosticReport,
  type DoctorOptions,
  type DiagnosticCheckId,
  DIAGNOSTIC_CHECKS,
} from './diagnostic.js';

// =============================================================================
// Swarm Types
// =============================================================================

export {
  // Schemas
  ModelTierSchema,
  SwarmTaskStatusSchema,
  TaskCostEntrySchema,
  SwarmTaskSchema,
  ParallelismModeSchema,
  SwarmPlanSchema,
  DependencyNodeSchema,
  SwarmPersistenceConfigSchema,
  SwarmCostTrackingConfigSchema,
  SwarmConfigSchema,
  SwarmStateStatusSchema,
  SwarmStateSchema,
  SwarmExecutionStatusSchema,
  SwarmExecutionSchema,
  SwarmRecommendationSchema,
  // Types
  type ModelTier,
  type SwarmTaskStatus,
  type TaskCostEntry,
  type SwarmTask,
  type ParallelismMode,
  type SwarmPlan,
  type DependencyNode,
  type SwarmPersistenceConfig,
  type SwarmCostTrackingConfig,
  type SwarmConfig,
  type SwarmStateStatus,
  type SwarmState,
  type SwarmExecutionStatus,
  type SwarmExecution,
  type SwarmRecommendation,
} from './swarm.js';
