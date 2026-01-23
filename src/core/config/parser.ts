/**
 * TOML parser with Zod validation for claudeops configuration files
 */

/// <reference types="node" />

import TOML from '@ltd/j-toml';
import type { z } from 'zod';
import { readFile as fsReadFile } from '../../utils/fs.js';

/**
 * Custom error class for configuration parsing and validation errors
 */
export class ConfigError extends Error {
  /** Path to the problematic field (for nested errors) */
  public readonly path?: string[];

  /** Zod validation issues (if validation failed) */
  public readonly issues?: z.ZodIssue[];

  /** Source file path (if available) */
  public readonly filePath?: string;

  constructor(
    message: string,
    options?: {
      path?: string[];
      issues?: z.ZodIssue[];
      filePath?: string;
      cause?: unknown;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'ConfigError';
    this.path = options?.path;
    this.issues = options?.issues;
    this.filePath = options?.filePath;
  }

  /**
   * Format the error for display
   */
  format(): string {
    const lines: string[] = [this.message];

    if (this.filePath) {
      lines.push(`  File: ${this.filePath}`);
    }

    if (this.path && this.path.length > 0) {
      lines.push(`  Path: ${this.path.join('.')}`);
    }

    if (this.issues && this.issues.length > 0) {
      lines.push('  Validation errors:');
      for (const issue of this.issues) {
        const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
        lines.push(`    - ${path}: ${issue.message}`);
      }
    }

    return lines.join('\n');
  }
}

/**
 * Options for TOML parsing
 */
export interface ParseOptions {
  /** Whether to allow multi-line basic strings */
  multilineBasicStrings?: boolean;
  /** Whether to allow inline tables to be nested */
  nestedInlineTables?: boolean;
}

/**
 * Parse a TOML string and validate against a Zod schema
 *
 * @param toml - TOML string to parse
 * @param schema - Zod schema to validate against
 * @param options - Parsing options
 * @returns Validated and typed configuration object
 * @throws ConfigError if parsing or validation fails
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { parse } from './parser';
 *
 * const schema = z.object({
 *   name: z.string(),
 *   version: z.number(),
 * });
 *
 * const config = parse(`
 *   name = "my-app"
 *   version = 1
 * `, schema);
 * // config is typed as { name: string; version: number }
 * ```
 */
export function parse<T>(
  toml: string,
  schema: z.ZodSchema<T>,
  options?: ParseOptions
): T {
  // Parse TOML string to object
  let parsed: unknown;
  try {
    parsed = TOML.parse(toml, {
      x: {
        multi: options?.multilineBasicStrings ?? true,
      },
      bigint: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown TOML parse error';
    throw new ConfigError(`Failed to parse TOML: ${message}`, { cause: error });
  }

  // Validate against schema
  const result = schema.safeParse(parsed);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path.map(String);
    throw new ConfigError(
      `Configuration validation failed: ${firstIssue?.message ?? 'Unknown error'}`,
      {
        path,
        issues: result.error.issues,
      }
    );
  }

  return result.data;
}

/**
 * Parse a TOML string without schema validation
 *
 * @param toml - TOML string to parse
 * @param options - Parsing options
 * @returns Parsed object (untyped)
 * @throws ConfigError if parsing fails
 */
export function parseRaw(
  toml: string,
  options?: ParseOptions
): Record<string, unknown> {
  try {
    return TOML.parse(toml, {
      x: {
        multi: options?.multilineBasicStrings ?? true,
      },
      bigint: false,
    }) as Record<string, unknown>;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown TOML parse error';
    throw new ConfigError(`Failed to parse TOML: ${message}`, { cause: error });
  }
}

/**
 * Convert an object to a TOML string
 *
 * @param config - Configuration object to stringify
 * @param options - Stringify options
 * @returns TOML string representation
 *
 * @example
 * ```ts
 * const toml = stringify({
 *   name: "my-app",
 *   settings: {
 *     debug: true
 *   }
 * });
 * // Returns:
 * // name = "my-app"
 * //
 * // [settings]
 * // debug = true
 * ```
 */
export function stringify<T extends object>(
  config: T,
  options?: {
    /** Add newlines between sections */
    newlinesBetweenSections?: boolean;
    /** Indent for nested structures */
    indent?: string;
  }
): string {
  try {
    // Convert to a plain object to avoid issues with class instances
    const plain = JSON.parse(JSON.stringify(config));

    // Use j-toml's stringify with appropriate options
    return TOML.stringify(plain, {
      newline: '\n',
      newlineAround: options?.newlinesBetweenSections ? 'section' : undefined,
      indent: options?.indent ?? '  ',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown TOML stringify error';
    throw new ConfigError(`Failed to stringify config: ${message}`, {
      cause: error,
    });
  }
}

/**
 * Read and parse a TOML file with schema validation
 *
 * @param path - Path to the TOML file
 * @param schema - Zod schema to validate against
 * @returns Validated and typed configuration object
 * @throws ConfigError if file reading, parsing, or validation fails
 *
 * @example
 * ```ts
 * const config = await parseFile('./config.toml', ConfigSchema);
 * ```
 */
export async function parseFile<T>(
  path: string,
  schema: z.ZodSchema<T>
): Promise<T> {
  let content: string;
  try {
    content = await fsReadFile(path);
  } catch (error) {
    const isNodeError = (e: unknown): e is NodeJS.ErrnoException =>
      e instanceof Error && 'code' in e;

    if (isNodeError(error) && error.code === 'ENOENT') {
      throw new ConfigError(`Configuration file not found: ${path}`, {
        filePath: path,
        cause: error,
      });
    }
    throw new ConfigError(`Failed to read configuration file: ${path}`, {
      filePath: path,
      cause: error,
    });
  }

  try {
    return parse(content, schema);
  } catch (error) {
    if (error instanceof ConfigError) {
      // Add file path to the error if not already present
      if (!error.filePath) {
        throw new ConfigError(error.message, {
          path: error.path,
          issues: error.issues,
          filePath: path,
          cause: error.cause,
        });
      }
      throw error;
    }
    throw new ConfigError(`Failed to parse configuration file: ${path}`, {
      filePath: path,
      cause: error,
    });
  }
}

/**
 * Read and parse a TOML file without schema validation
 *
 * @param path - Path to the TOML file
 * @returns Parsed object (untyped)
 * @throws ConfigError if file reading or parsing fails
 */
export async function parseFileRaw(
  path: string
): Promise<Record<string, unknown>> {
  let content: string;
  try {
    content = await fsReadFile(path);
  } catch (error) {
    const isNodeError = (e: unknown): e is NodeJS.ErrnoException =>
      e instanceof Error && 'code' in e;

    if (isNodeError(error) && error.code === 'ENOENT') {
      throw new ConfigError(`Configuration file not found: ${path}`, {
        filePath: path,
        cause: error,
      });
    }
    throw new ConfigError(`Failed to read configuration file: ${path}`, {
      filePath: path,
      cause: error,
    });
  }

  try {
    return parseRaw(content);
  } catch (error) {
    if (error instanceof ConfigError) {
      if (!error.filePath) {
        throw new ConfigError(error.message, {
          filePath: path,
          cause: error.cause,
        });
      }
      throw error;
    }
    throw new ConfigError(`Failed to parse configuration file: ${path}`, {
      filePath: path,
      cause: error,
    });
  }
}

/**
 * Validate an object against a Zod schema
 *
 * @param config - Configuration object to validate
 * @param schema - Zod schema to validate against
 * @returns Validated and typed configuration object
 * @throws ConfigError if validation fails
 */
export function validate<T>(config: unknown, schema: z.ZodSchema<T>): T {
  const result = schema.safeParse(config);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path.map(String);
    throw new ConfigError(
      `Configuration validation failed: ${firstIssue?.message ?? 'Unknown error'}`,
      {
        path,
        issues: result.error.issues,
      }
    );
  }

  return result.data;
}

/**
 * Safely validate an object against a Zod schema
 *
 * @param config - Configuration object to validate
 * @param schema - Zod schema to validate against
 * @returns Result object with success status and data or error
 */
export function validateSafe<T>(
  config: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: ConfigError } {
  const result = schema.safeParse(config);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const firstIssue = result.error.issues[0];
  const path = firstIssue?.path.map(String);
  return {
    success: false,
    error: new ConfigError(
      `Configuration validation failed: ${firstIssue?.message ?? 'Unknown error'}`,
      {
        path,
        issues: result.error.issues,
      }
    ),
  };
}
