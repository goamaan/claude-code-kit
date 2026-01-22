/**
 * Add-on types with Zod schemas
 * Defines add-on manifest and registry structures
 */

import { z } from 'zod';

// =============================================================================
// Validation Patterns
// =============================================================================

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;

// =============================================================================
// Add-on Metadata
// =============================================================================

export const AddonMetadataSchema = z.object({
  name: z.string()
    .min(1)
    .max(64)
    .regex(NAME_PATTERN, 'Name must be lowercase, start with letter, contain only letters, numbers, and hyphens'),
  version: z.string()
    .regex(SEMVER_PATTERN, 'Version must be valid semver'),
  description: z.string().max(512).optional(),
  author: z.string().max(128).optional(),
  repository: z.string().url().optional(),
  license: z.string().max(32).optional(),
  keywords: z.array(z.string().max(32)).max(10).optional(),
});
export type AddonMetadata = z.infer<typeof AddonMetadataSchema>;

// =============================================================================
// Hook Matcher Configuration
// =============================================================================

export const HookMatcherSchema = z.object({
  /** Pattern to match against (tool name, event type, etc.) */
  matcher: z.string(),

  /** Handler function name or inline handler */
  handler: z.string(),

  /** Priority (higher runs first, default 0) */
  priority: z.number().int().optional().default(0),

  /** Whether this hook is enabled */
  enabled: z.boolean().optional().default(true),
});
export type HookMatcher = z.infer<typeof HookMatcherSchema>;

/** Input type for HookMatcher (before defaults are applied) */
export type HookMatcherInput = z.input<typeof HookMatcherSchema>;

// =============================================================================
// Add-on Hooks
// =============================================================================

export const AddonHooksSchema = z.object({
  /** Hooks that run before tool use */
  PreToolUse: z.array(HookMatcherSchema).optional(),

  /** Hooks that run after tool use */
  PostToolUse: z.array(HookMatcherSchema).optional(),

  /** Hooks that run when agent stops */
  Stop: z.array(HookMatcherSchema).optional(),

  /** Hooks that run when subagent stops */
  SubagentStop: z.array(HookMatcherSchema).optional(),
});
export type AddonHooks = z.infer<typeof AddonHooksSchema>;

/** Input type for AddonHooks (before defaults are applied) */
export type AddonHooksInput = z.input<typeof AddonHooksSchema>;

// =============================================================================
// Add-on Installation
// =============================================================================

export const AddonRuntimeSchema = z.enum(['node', 'bun', 'deno']);
export type AddonRuntime = z.infer<typeof AddonRuntimeSchema>;

export const AddonDependencySchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  optional: z.boolean().optional().default(false),
});
export type AddonDependency = z.infer<typeof AddonDependencySchema>;

export const AddonInstallSchema = z.object({
  /** Runtime to use for executing add-on code */
  runtime: AddonRuntimeSchema.optional().default('node'),

  /** Post-install script to run */
  postinstall: z.string().optional(),

  /** Dependencies required by this add-on */
  dependencies: z.array(AddonDependencySchema).optional(),

  /** Files to download/copy during install */
  files: z.array(z.object({
    source: z.string(),
    destination: z.string(),
  })).optional(),
});
export type AddonInstall = z.infer<typeof AddonInstallSchema>;

// =============================================================================
// Add-on Configuration Options
// =============================================================================

export const AddonConfigOptionTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'array',
  'object',
  'select',
]);
export type AddonConfigOptionType = z.infer<typeof AddonConfigOptionTypeSchema>;

export const AddonConfigOptionSchema = z.object({
  /** Option key */
  key: z.string(),

  /** Display label */
  label: z.string().optional(),

  /** Option type */
  type: AddonConfigOptionTypeSchema,

  /** Default value */
  default: z.unknown().optional(),

  /** Description for documentation */
  description: z.string().max(256).optional(),

  /** Required flag */
  required: z.boolean().optional().default(false),

  /** Valid choices for 'select' type */
  choices: z.array(z.object({
    value: z.unknown(),
    label: z.string(),
  })).optional(),

  /** Validation pattern for 'string' type */
  pattern: z.string().optional(),

  /** Min/max for 'number' type */
  min: z.number().optional(),
  max: z.number().optional(),
});
export type AddonConfigOption = z.infer<typeof AddonConfigOptionSchema>;

// =============================================================================
// Full Add-on Manifest
// =============================================================================

export const AddonManifestSchema = z.object({
  // Metadata (required)
  name: z.string()
    .min(1)
    .max(64)
    .regex(NAME_PATTERN, 'Name must be lowercase, start with letter, contain only letters, numbers, and hyphens'),
  version: z.string()
    .regex(SEMVER_PATTERN, 'Version must be valid semver'),
  description: z.string().max(512).optional(),
  author: z.string().max(128).optional(),
  repository: z.string().url().optional(),
  license: z.string().max(32).optional(),
  keywords: z.array(z.string().max(32)).max(10).optional(),

  // Compatibility
  requires: z.object({
    'claude-code-kit': z.string().optional(),
    'oh-my-claudecode': z.string().optional(),
  }).optional(),

  // Installation
  install: AddonInstallSchema.optional(),

  // Hooks
  hooks: AddonHooksSchema.optional(),

  // Configuration options
  config: z.array(AddonConfigOptionSchema).optional(),

  // Entry point for add-on logic
  main: z.string().optional(),

  // Skills provided by this add-on
  skills: z.array(z.string()).optional(),

  // Content to append to CLAUDE.md when enabled
  content: z.string().optional(),
});
export type AddonManifest = z.infer<typeof AddonManifestSchema>;

// =============================================================================
// Installed Add-on State
// =============================================================================

export interface InstalledAddon {
  /** Add-on manifest */
  manifest: AddonManifest;

  /** Installation path */
  path: string;

  /** Installation timestamp */
  installedAt: Date;

  /** Last updated timestamp */
  updatedAt: Date;

  /** Whether add-on is enabled */
  enabled: boolean;

  /** User configuration values */
  config: Record<string, unknown>;

  /** Source (registry, git, local) */
  source: {
    type: 'registry' | 'git' | 'local';
    url?: string;
    ref?: string;
  };
}

// =============================================================================
// Registry Types
// =============================================================================

export interface RegistryEntry {
  /** Add-on name */
  name: string;

  /** Latest version */
  version: string;

  /** Description */
  description?: string;

  /** Author */
  author?: string;

  /** Keywords for search */
  keywords: string[];

  /** Download URL */
  url: string;

  /** SHA256 checksum */
  checksum?: string;

  /** Number of downloads */
  downloads: number;

  /** Star rating (0-5) */
  rating?: number;

  /** Last updated timestamp */
  updatedAt: string;

  /** All available versions */
  versions: string[];

  /** Repository URL */
  repository?: string;

  /** License */
  license?: string;
}

export interface RegistrySearchResult {
  /** Total matching entries */
  total: number;

  /** Current page */
  page: number;

  /** Results per page */
  perPage: number;

  /** Search results */
  results: RegistryEntry[];
}

// =============================================================================
// Add-on Resolution Types
// =============================================================================

export interface AddonResolution {
  /** Resolved add-on name */
  name: string;

  /** Resolved version */
  version: string;

  /** Source URL or path */
  source: string;

  /** Dependencies to install */
  dependencies: Array<{
    name: string;
    version: string;
  }>;

  /** Conflicts detected */
  conflicts: Array<{
    addon: string;
    reason: string;
  }>;
}

export interface AddonValidationResult {
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
