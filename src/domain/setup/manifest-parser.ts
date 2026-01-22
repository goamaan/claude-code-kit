/**
 * Setup manifest parser
 * Parses and validates TOML setup manifests
 */

/// <reference types="node" />

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import TOML from '@ltd/j-toml';
import { ZodError } from 'zod';
import {
  SetupManifestSchema,
  type SetupManifest,
  type SetupValidationResult,
} from '@/types';

// =============================================================================
// Parse Error
// =============================================================================

export class SetupParseError extends Error {
  public filePath?: string;

  constructor(
    message: string,
    public readonly originalCause?: unknown,
    filePath?: string,
  ) {
    super(message);
    this.name = 'SetupParseError';
    this.filePath = filePath;
  }
}

// =============================================================================
// TOML Parsing
// =============================================================================

/**
 * Parse a TOML string into a setup manifest
 * @param toml - The TOML string to parse
 * @returns The parsed setup manifest
 * @throws SetupParseError if parsing fails
 */
export function parseSetupManifest(toml: string): SetupManifest {
  try {
    // Parse TOML with multiline string support
    const parsed = TOML.parse(toml, {
      joiner: '\n',
      bigint: false,
      x: {
        multi: true,
      },
    });

    // Convert to plain object (TOML library returns special Table objects)
    const plain = JSON.parse(JSON.stringify(parsed)) as Record<string, unknown>;

    // Handle nested [setup] section if present
    const manifestData = hasSetupSection(plain)
      ? flattenSetupSection(plain)
      : plain;

    // Validate with Zod schema
    return SetupManifestSchema.parse(manifestData);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new SetupParseError(`Invalid setup manifest: ${messages.join(', ')}`, error);
    }
    if (error instanceof Error) {
      throw new SetupParseError(`Failed to parse TOML: ${error.message}`, error);
    }
    throw new SetupParseError('Failed to parse TOML: Unknown error', error);
  }
}

/**
 * Check if the parsed TOML has a [setup] section
 */
function hasSetupSection(parsed: unknown): parsed is { setup: Record<string, unknown> } {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'setup' in parsed &&
    typeof (parsed as Record<string, unknown>)['setup'] === 'object'
  );
}

/**
 * Flatten [setup] section to top level while preserving other sections
 */
function flattenSetupSection(parsed: { setup: Record<string, unknown> }): Record<string, unknown> {
  const { setup, ...rest } = parsed;
  return {
    ...setup,
    ...rest,
  };
}

// =============================================================================
// File Loading
// =============================================================================

/**
 * Load a setup manifest from a file path
 * @param filePath - Path to the manifest file (manifest.toml)
 * @returns The parsed setup manifest
 * @throws SetupParseError if loading or parsing fails
 */
export async function loadSetupManifest(filePath: string): Promise<SetupManifest> {
  const absolutePath = path.resolve(filePath);

  try {
    const content = await fs.readFile(absolutePath, 'utf-8');
    return parseSetupManifest(content);
  } catch (error) {
    if (error instanceof SetupParseError) {
      error.filePath = absolutePath;
      throw error;
    }
    if (error instanceof Error && 'code' in error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        throw new SetupParseError(`Setup manifest not found: ${absolutePath}`, error, absolutePath);
      }
      if (nodeError.code === 'EACCES') {
        throw new SetupParseError(`Permission denied reading: ${absolutePath}`, error, absolutePath);
      }
    }
    throw new SetupParseError(
      `Failed to load setup manifest: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error,
      absolutePath,
    );
  }
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate a setup manifest object
 * @param manifest - The manifest object to validate
 * @returns Validation result with detailed errors and warnings
 */
export function validateSetupManifest(manifest: unknown): SetupValidationResult {
  const errors: SetupValidationResult['errors'] = [];
  const warnings: SetupValidationResult['warnings'] = [];

  // Zod validation
  const result = SetupManifestSchema.safeParse(manifest);

  if (!result.success) {
    for (const error of result.error.errors) {
      errors.push({
        path: error.path.join('.'),
        message: error.message,
        code: error.code,
      });
    }
    return { valid: false, errors, warnings };
  }

  const parsed = result.data;

  // Additional semantic validations

  // Check for conflicting skill settings
  if (parsed.skills?.enabled && parsed.skills?.disabled) {
    const overlap = parsed.skills.enabled.filter(s =>
      parsed.skills?.disabled?.includes(s)
    );
    if (overlap.length > 0) {
      errors.push({
        path: 'skills',
        message: `Skills cannot be both enabled and disabled: ${overlap.join(', ')}`,
        code: 'conflicting_skills',
      });
    }
  }

  // Check for circular extension (basic check - full check requires loader)
  if (parsed.extends === parsed.name) {
    errors.push({
      path: 'extends',
      message: 'Setup cannot extend itself',
      code: 'circular_extension',
    });
  }

  // Warnings for best practices

  // Warn if no description
  if (!parsed.description) {
    warnings.push({
      path: 'description',
      message: 'Consider adding a description for better discoverability',
    });
  }

  // Warn if no author
  if (!parsed.author) {
    warnings.push({
      path: 'author',
      message: 'Consider adding an author for attribution',
    });
  }

  // Warn about deprecated patterns
  if (parsed.hooks?.templates) {
    for (let i = 0; i < parsed.hooks.templates.length; i++) {
      const template = parsed.hooks.templates[i];
      if (template && template.matcher === '*') {
        warnings.push({
          path: `hooks.templates[${i}].matcher`,
          message: 'Wildcard matcher "*" may impact performance; consider more specific patterns',
        });
      }
    }
  }

  // Warn if using high priority values
  if (parsed.agents) {
    for (const [name, config] of Object.entries(parsed.agents)) {
      if (config.priority && config.priority > 90) {
        warnings.push({
          path: `agents.${name}.priority`,
          message: 'Very high priority values (>90) may override important system behaviors',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract metadata from a manifest (lightweight operation)
 */
export function extractMetadata(manifest: SetupManifest): {
  name: string;
  version: string;
  description?: string;
  author?: string;
  extends?: string;
} {
  return {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    extends: manifest.extends,
  };
}

/**
 * Check if a manifest file exists at the given path
 */
export async function manifestExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the default manifest filename
 */
export function getManifestFilename(): string {
  return 'manifest.toml';
}
