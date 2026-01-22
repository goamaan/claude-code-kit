/**
 * Settings Generator - Generate Claude Code settings.json
 * Combines configuration from various sources into final settings
 */

import type {
  MergedConfig,
  MergedSetup,
  InstalledAddon,
  SettingsHooks,
  ComposedHooks,
  ModelName,
} from '@/types';
import { toSettingsFormat } from '@/domain/hook/composer.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Generated settings structure
 * Matches Claude Code settings.json format
 */
export interface GeneratedSettings {
  /** Model to use for Claude */
  model?: string;

  /** API key (should not be stored, placeholder only) */
  apiKey?: string;

  /** Hook configurations */
  hooks?: SettingsHooks;

  /** MCP server configurations */
  mcpServers?: Record<string, McpServerSettings>;

  /** Custom system prompt additions */
  systemPrompt?: string;

  /** Maximum tokens per request */
  maxTokens?: number;

  /** Temperature setting */
  temperature?: number;

  /** Top-p sampling */
  topP?: number;

  /** Permission settings */
  permissions?: PermissionSettings;

  /** Feature flags */
  features?: FeatureSettings;

  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * MCP server settings for settings.json
 */
export interface McpServerSettings {
  /** Command to run the server */
  command: string;

  /** Command arguments */
  args?: string[];

  /** Environment variables */
  env?: Record<string, string>;

  /** Working directory */
  cwd?: string;

  /** Whether server is enabled */
  enabled?: boolean;
}

/**
 * Permission settings
 */
export interface PermissionSettings {
  /** Allow file read operations */
  allowFileRead?: boolean;

  /** Allow file write operations */
  allowFileWrite?: boolean;

  /** Allow command execution */
  allowCommands?: boolean;

  /** Allowed commands list (if commands restricted) */
  allowedCommands?: string[];

  /** Denied paths for file operations */
  deniedPaths?: string[];
}

/**
 * Feature flags
 */
export interface FeatureSettings {
  /** Enable experimental features */
  experimental?: boolean;

  /** Enable vision capabilities */
  vision?: boolean;

  /** Enable code execution */
  codeExecution?: boolean;

  /** Enable web browsing */
  webBrowsing?: boolean;
}

/**
 * Options for settings generation
 */
export interface GenerateSettingsOptions {
  /** Include hooks in settings */
  includeHooks?: boolean;

  /** Include MCP servers */
  includeMcp?: boolean;

  /** Merge with existing settings */
  mergeWith?: GeneratedSettings;

  /** Model override */
  modelOverride?: ModelName;
}

// =============================================================================
// Model Mapping
// =============================================================================

/**
 * Map internal model names to Claude API model identifiers
 */
const MODEL_MAP: Record<ModelName, string> = {
  haiku: 'claude-3-haiku-20240307',
  sonnet: 'claude-3-5-sonnet-20241022',
  opus: 'claude-3-opus-20240229',
};

/**
 * Get the API model identifier for a model name
 */
export function getApiModelId(model: ModelName): string {
  return MODEL_MAP[model] ?? MODEL_MAP.sonnet;
}

// =============================================================================
// Settings Generation
// =============================================================================

/**
 * Generate Claude Code settings.json from configuration
 *
 * @param config - Merged configuration
 * @param setup - Merged setup
 * @param addons - Installed addons
 * @param hooks - Composed hooks
 * @param options - Generation options
 * @returns Generated settings object
 */
export function generateSettings(
  config: MergedConfig,
  setup: MergedSetup,
  addons: InstalledAddon[],
  hooks: ComposedHooks,
  options: GenerateSettingsOptions = {},
): GeneratedSettings {
  const {
    includeHooks = true,
    includeMcp = true,
    mergeWith,
    modelOverride,
  } = options;

  // Start with existing settings if merging
  const settings: GeneratedSettings = mergeWith ? { ...mergeWith } : {};

  // Set model
  const model = modelOverride ?? config.model.default;
  settings.model = getApiModelId(model);

  // Add hooks if enabled and not empty
  if (includeHooks) {
    const settingsHooks = toSettingsFormat(hooks);
    if (Object.keys(settingsHooks).length > 0) {
      settings.hooks = settingsHooks;
    }
  }

  // Add MCP servers if enabled
  if (includeMcp) {
    const mcpServers = generateMcpServers(setup, addons, config);
    if (Object.keys(mcpServers).length > 0) {
      settings.mcpServers = mcpServers;
    }
  }

  // Add metadata for tracking
  settings.metadata = {
    ...settings.metadata,
    'claude-code-kit': {
      version: '0.1.0',  // TODO: Get from package.json
      profile: config.profile.name,
      setup: setup.name,
      generatedAt: new Date().toISOString(),
    },
  };

  return settings;
}

/**
 * Generate MCP server configurations from setup and addons
 */
function generateMcpServers(
  setup: MergedSetup,
  addons: InstalledAddon[],
  config: MergedConfig,
): Record<string, McpServerSettings> {
  const servers: Record<string, McpServerSettings> = {};

  // Add servers from required MCP in setup
  for (const serverName of setup.mcp.required) {
    // Skip if disabled in config
    if (config.mcp.disabled.includes(serverName)) {
      continue;
    }

    // Add placeholder - actual config comes from MCP registry
    servers[serverName] = {
      command: serverName,
      enabled: true,
    };
  }

  // Add servers from recommended MCP in setup if enabled in config
  for (const serverName of setup.mcp.recommended) {
    // Only include if explicitly enabled
    if (config.mcp.enabled.includes(serverName)) {
      servers[serverName] = {
        command: serverName,
        enabled: true,
      };
    }
  }

  // Add servers from enabled config
  for (const serverName of config.mcp.enabled) {
    if (!servers[serverName]) {
      servers[serverName] = {
        command: serverName,
        enabled: true,
      };
    }
  }

  return servers;
}

/**
 * Merge two settings objects
 * Later values override earlier ones
 */
export function mergeSettings(
  base: GeneratedSettings,
  override: GeneratedSettings,
): GeneratedSettings {
  const result: GeneratedSettings = { ...base };

  // Simple value overrides
  if (override.model !== undefined) {
    result.model = override.model;
  }
  if (override.apiKey !== undefined) {
    result.apiKey = override.apiKey;
  }
  if (override.systemPrompt !== undefined) {
    result.systemPrompt = override.systemPrompt;
  }
  if (override.maxTokens !== undefined) {
    result.maxTokens = override.maxTokens;
  }
  if (override.temperature !== undefined) {
    result.temperature = override.temperature;
  }
  if (override.topP !== undefined) {
    result.topP = override.topP;
  }

  // Merge hooks
  if (override.hooks) {
    result.hooks = mergeHooks(result.hooks ?? {}, override.hooks);
  }

  // Merge MCP servers
  if (override.mcpServers) {
    result.mcpServers = {
      ...result.mcpServers,
      ...override.mcpServers,
    };
  }

  // Merge permissions
  if (override.permissions) {
    result.permissions = {
      ...result.permissions,
      ...override.permissions,
    };
  }

  // Merge features
  if (override.features) {
    result.features = {
      ...result.features,
      ...override.features,
    };
  }

  // Merge metadata
  if (override.metadata) {
    result.metadata = {
      ...result.metadata,
      ...override.metadata,
    };
  }

  return result;
}

/**
 * Merge hook settings
 */
function mergeHooks(base: SettingsHooks, override: SettingsHooks): SettingsHooks {
  const result: SettingsHooks = { ...base };

  if (override.PreToolUse) {
    result.PreToolUse = [...(result.PreToolUse ?? []), ...override.PreToolUse];
  }
  if (override.PostToolUse) {
    result.PostToolUse = [...(result.PostToolUse ?? []), ...override.PostToolUse];
  }
  if (override.Stop) {
    result.Stop = [...(result.Stop ?? []), ...override.Stop];
  }
  if (override.SubagentStop) {
    result.SubagentStop = [...(result.SubagentStop ?? []), ...override.SubagentStop];
  }

  return result;
}

/**
 * Validate generated settings
 */
export function validateSettings(settings: GeneratedSettings): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required fields
  if (!settings.model) {
    warnings.push('No model specified, Claude Code will use default');
  }

  // Validate model format
  if (settings.model && !settings.model.startsWith('claude-')) {
    warnings.push(`Model "${settings.model}" may not be a valid Claude model identifier`);
  }

  // Check for sensitive data
  if (settings.apiKey) {
    warnings.push('API key should not be stored in settings.json');
  }

  // Validate hooks
  if (settings.hooks) {
    const hookEvents = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop'] as const;
    for (const event of hookEvents) {
      const entries = settings.hooks[event];
      if (entries) {
        for (const entry of entries) {
          if (!entry.matcher) {
            errors.push(`Hook in ${event} missing matcher`);
          }
          if (!entry.handler) {
            errors.push(`Hook in ${event} missing handler`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Serialize settings to JSON string
 */
export function serializeSettings(settings: GeneratedSettings, pretty = true): string {
  return JSON.stringify(settings, null, pretty ? 2 : 0);
}

/**
 * Parse settings from JSON string
 */
export function parseSettings(json: string): GeneratedSettings {
  return JSON.parse(json) as GeneratedSettings;
}

/**
 * Create default/empty settings
 */
export function createDefaultSettings(): GeneratedSettings {
  return {
    model: MODEL_MAP.sonnet,
    metadata: {
      'claude-code-kit': {
        version: '0.1.0',
        generatedAt: new Date().toISOString(),
      },
    },
  };
}
