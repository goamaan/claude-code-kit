/**
 * Manifest Parser - Parse and validate addon.toml manifests
 * Handles TOML parsing and Zod validation for addon manifests
 */

import { parse as parseTOML } from '@ltd/j-toml';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import {
  AddonManifestSchema,
  type AddonManifest,
  type AddonValidationResult,
} from '@/types/index.js';

// =============================================================================
// TOML-specific Schema (handles TOML table structure)
// =============================================================================

/**
 * Schema for the TOML file structure where [addon] is the main table
 */
const TomlAddonFileSchema = z.object({
  addon: z.object({
    name: z.string(),
    version: z.string(),
    description: z.string().optional(),
    author: z.string().optional(),
    repository: z.string().optional(),
    license: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }),
  requires: z.object({
    'claudeops': z.string().optional(),
  }).optional(),
  install: z.object({
    runtime: z.enum(['node', 'bun', 'deno']).optional(),
    postinstall: z.string().optional(),
    dependencies: z.array(z.object({
      name: z.string(),
      version: z.string().optional(),
      optional: z.boolean().optional(),
    })).optional(),
    files: z.array(z.object({
      source: z.string(),
      destination: z.string(),
    })).optional(),
  }).optional(),
  hooks: z.object({
    PreToolUse: z.array(z.object({
      matcher: z.string(),
      handler: z.string(),
      priority: z.number().optional(),
      enabled: z.boolean().optional(),
    })).optional(),
    PostToolUse: z.array(z.object({
      matcher: z.string(),
      handler: z.string(),
      priority: z.number().optional(),
      enabled: z.boolean().optional(),
    })).optional(),
    Stop: z.array(z.object({
      matcher: z.string(),
      handler: z.string(),
      priority: z.number().optional(),
      enabled: z.boolean().optional(),
    })).optional(),
    SubagentStop: z.array(z.object({
      matcher: z.string(),
      handler: z.string(),
      priority: z.number().optional(),
      enabled: z.boolean().optional(),
    })).optional(),
  }).optional(),
  config: z.array(z.object({
    key: z.string(),
    label: z.string().optional(),
    type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'select']),
    default: z.unknown().optional(),
    description: z.string().optional(),
    required: z.boolean().optional(),
    choices: z.array(z.object({
      value: z.unknown(),
      label: z.string(),
    })).optional(),
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })).optional(),
}).passthrough();

// =============================================================================
// Error Types
// =============================================================================

export class ManifestParseError extends Error {
  public readonly path?: string;

  constructor(
    message: string,
    cause?: unknown,
    path?: string
  ) {
    super(message, { cause });
    this.name = 'ManifestParseError';
    this.path = path;
  }
}

export class ManifestValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: Array<{ path: string; message: string; code: string }>
  ) {
    super(message);
    this.name = 'ManifestValidationError';
  }
}

// =============================================================================
// Parser Functions
// =============================================================================

/**
 * Parse TOML string into an AddonManifest
 * Handles the TOML structure where metadata is under [addon] table
 */
export function parseAddonManifest(toml: string): AddonManifest {
  let parsed: unknown;

  try {
    // j-toml returns a Section object, we need the raw data
    parsed = parseTOML(toml, { joiner: '\n', bigint: false });
  } catch (err) {
    throw new ManifestParseError(
      `Failed to parse TOML: ${err instanceof Error ? err.message : String(err)}`,
      err
    );
  }

  // Validate TOML structure
  const tomlResult = TomlAddonFileSchema.safeParse(parsed);
  if (!tomlResult.success) {
    const errors = tomlResult.error.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));
    throw new ManifestValidationError(
      `Invalid addon.toml structure: ${errors.map(e => e.message).join(', ')}`,
      errors
    );
  }

  const data = tomlResult.data;

  // Transform TOML structure to flat manifest structure
  const manifest: Record<string, unknown> = {
    // Flatten [addon] table to root level
    name: data.addon.name,
    version: data.addon.version,
    description: data.addon.description,
    author: data.addon.author,
    repository: data.addon.repository,
    license: data.addon.license,
    keywords: data.addon.keywords,
    // Keep other sections as-is
    requires: data.requires,
    install: data.install,
    hooks: data.hooks,
    config: data.config,
  };

  // Remove undefined values
  Object.keys(manifest).forEach(key => {
    if (manifest[key] === undefined) {
      delete manifest[key];
    }
  });

  // Validate against full AddonManifest schema
  return validateAddonManifest(manifest);
}

/**
 * Load and parse addon manifest from filesystem
 * Looks for addon.toml in the given directory or at the given path
 */
export async function loadAddonManifest(path: string): Promise<AddonManifest> {
  // Determine the actual file path
  const filePath = path.endsWith('.toml') ? path : join(path, 'addon.toml');

  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new ManifestParseError(
      `Failed to read manifest file: ${filePath}`,
      err,
      filePath
    );
  }

  try {
    return parseAddonManifest(content);
  } catch (err) {
    if (err instanceof ManifestParseError || err instanceof ManifestValidationError) {
      throw err;
    }
    throw new ManifestParseError(
      `Failed to parse manifest at ${filePath}`,
      err,
      filePath
    );
  }
}

/**
 * Validate an unknown object as an AddonManifest
 * Uses Zod schema for comprehensive validation
 */
export function validateAddonManifest(manifest: unknown): AddonManifest {
  const result = AddonManifestSchema.safeParse(manifest);

  if (!result.success) {
    const errors = result.error.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));
    throw new ManifestValidationError(
      `Invalid addon manifest: ${errors.map(e => `${e.path}: ${e.message}`).join('; ')}`,
      errors
    );
  }

  return result.data;
}

/**
 * Validate manifest and return detailed validation result
 * Does not throw, returns validation result object instead
 */
export function validateManifestSafe(manifest: unknown): AddonValidationResult {
  const result = AddonManifestSchema.safeParse(manifest);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  const errors = result.error.errors.map(e => ({
    path: e.path.join('.'),
    message: e.message,
    code: e.code,
  }));

  // Check for warnings (non-critical issues)
  const warnings: Array<{ path: string; message: string }> = [];

  if (result.error.errors.length === 0 && typeof manifest === 'object' && manifest !== null) {
    const m = manifest as Record<string, unknown>;

    // Warn if no description
    if (!m['description']) {
      warnings.push({
        path: 'description',
        message: 'Consider adding a description for better discoverability',
      });
    }

    // Warn if no license
    if (!m['license']) {
      warnings.push({
        path: 'license',
        message: 'Consider specifying a license',
      });
    }
  }

  return {
    valid: false,
    errors,
    warnings,
  };
}

/**
 * Check if a manifest is compatible with current claudeops version
 * Uses semver for proper version constraint checking
 */
export function checkCompatibility(
  manifest: AddonManifest,
  claudeKitVersion: string
): { compatible: boolean; reason?: string } {
  const requires = manifest.requires;

  if (!requires || !requires['claudeops']) {
    // No version requirement specified, assume compatible
    return { compatible: true };
  }

  const requiredVersion = requires['claudeops'];

  // Use dynamic import for semver to avoid bundling issues
  // For synchronous usage, we do basic version comparison
  const currentParts = claudeKitVersion.replace(/[^\d.]/g, '').split('.').map(Number);
  const requiredClean = requiredVersion.replace(/[~^>=<]/g, '').trim();
  const requiredParts = requiredClean.split('.').map(Number);

  // Handle caret (^) - compatible with same major version
  if (requiredVersion.startsWith('^')) {
    const [reqMajor] = requiredParts;
    const [curMajor] = currentParts;
    if (reqMajor !== undefined && curMajor !== undefined && curMajor < reqMajor) {
      return {
        compatible: false,
        reason: `Requires claudeops ${requiredVersion}, but ${claudeKitVersion} is installed`,
      };
    }
    return { compatible: true };
  }

  // Handle tilde (~) - compatible with same minor version
  if (requiredVersion.startsWith('~')) {
    const [reqMajor, reqMinor] = requiredParts;
    const [curMajor, curMinor] = currentParts;
    if (reqMajor !== undefined && curMajor !== undefined && curMajor < reqMajor) {
      return {
        compatible: false,
        reason: `Requires claudeops ${requiredVersion}, but ${claudeKitVersion} is installed`,
      };
    }
    if (reqMinor !== undefined && curMinor !== undefined && curMajor === reqMajor && curMinor < reqMinor) {
      return {
        compatible: false,
        reason: `Requires claudeops ${requiredVersion}, but ${claudeKitVersion} is installed`,
      };
    }
    return { compatible: true };
  }

  // Handle >= constraint
  if (requiredVersion.startsWith('>=')) {
    for (let i = 0; i < 3; i++) {
      const cur = currentParts[i] ?? 0;
      const req = requiredParts[i] ?? 0;
      if (cur > req) return { compatible: true };
      if (cur < req) {
        return {
          compatible: false,
          reason: `Requires claudeops ${requiredVersion}, but ${claudeKitVersion} is installed`,
        };
      }
    }
    return { compatible: true };
  }

  // Default: basic major version check
  const [reqMajor] = requiredParts;
  const [curMajor] = currentParts;
  if (reqMajor !== undefined && curMajor !== undefined && curMajor < reqMajor) {
    return {
      compatible: false,
      reason: `Requires claudeops ${requiredVersion}, but ${claudeKitVersion} is installed`,
    };
  }

  return { compatible: true };
}
