/**
 * Guardrails Types
 * TypeScript types for guardrail validation results
 */

import { z } from 'zod';

// =============================================================================
// Severity Levels
// =============================================================================

/**
 * Severity level for guardrail violations
 * - info: Informational, no action needed
 * - warn: Warning, action recommended but not required
 * - block: Blocking, action must not proceed
 */
export const GuardrailSeveritySchema = z.enum(['info', 'warn', 'block']);
export type GuardrailSeverity = z.infer<typeof GuardrailSeveritySchema>;

/**
 * Action to take based on guardrail check
 * - allow: Proceed with the action
 * - warn: Proceed with warning
 * - block: Block the action
 */
export const GuardrailActionSchema = z.enum(['allow', 'warn', 'block']);
export type GuardrailAction = z.infer<typeof GuardrailActionSchema>;

// =============================================================================
// Deletion Guardrails
// =============================================================================

/**
 * Result from deletion command check
 */
export const DeletionCheckResultSchema = z.object({
  /** Whether the command is allowed */
  allowed: z.boolean(),

  /** Severity of the issue (if not allowed) */
  severity: GuardrailSeveritySchema.optional(),

  /** Reason why the command was blocked or warned */
  reason: z.string().optional(),

  /** Alternative safe command suggestion */
  suggestion: z.string().optional(),

  /** Details about what was detected */
  details: z
    .object({
      /** Detected dangerous patterns */
      patterns: z.array(z.string()).optional(),

      /** Bypass attempts detected */
      bypassAttempts: z.array(z.string()).optional(),

      /** Affected paths */
      paths: z.array(z.string()).optional(),
    })
    .optional(),
});
export type DeletionCheckResult = z.infer<typeof DeletionCheckResultSchema>;

// =============================================================================
// Secret Scanning
// =============================================================================

/**
 * Type of secret detected
 */
export const SecretTypeSchema = z.enum([
  'aws_key',
  'github_token',
  'stripe_key',
  'private_key',
  'api_key',
  'password',
  'generic_secret',
  'jwt',
  'oauth_token',
]);
export type SecretType = z.infer<typeof SecretTypeSchema>;

/**
 * A matched secret in content
 */
export const SecretMatchSchema = z.object({
  /** Type of secret detected */
  type: SecretTypeSchema,

  /** The matched value (may be redacted) */
  value: z.string(),

  /** Line number where found (1-indexed) */
  line: z.number().int().positive().optional(),

  /** Column number where found (1-indexed) */
  column: z.number().int().positive().optional(),

  /** Context around the match */
  context: z.string().optional(),

  /** Confidence level (0-1) */
  confidence: z.number().min(0).max(1).optional(),
});
export type SecretMatch = z.infer<typeof SecretMatchSchema>;

/**
 * Result from secret scanning
 */
export const SecretScanResultSchema = z.object({
  /** Whether secrets were detected */
  hasSecrets: z.boolean(),

  /** All secret matches found */
  matches: z.array(SecretMatchSchema),

  /** Severity level */
  severity: GuardrailSeveritySchema,

  /** Summary message */
  message: z.string().optional(),

  /** Suggestions for remediation */
  suggestions: z.array(z.string()).optional(),
});
export type SecretScanResult = z.infer<typeof SecretScanResultSchema>;

// =============================================================================
// Dangerous Commands
// =============================================================================

/**
 * Result from dangerous command check
 */
export const DangerousCommandResultSchema = z.object({
  /** Action to take */
  action: GuardrailActionSchema,

  /** Severity of the issue */
  severity: GuardrailSeveritySchema,

  /** Reason for the action */
  reason: z.string().optional(),

  /** Alternative safe command suggestion */
  suggestion: z.string().optional(),

  /** Details about what was detected */
  details: z
    .object({
      /** Command category */
      category: z
        .enum(['git', 'database', 'filesystem', 'system', 'network'])
        .optional(),

      /** Specific operation detected */
      operation: z.string().optional(),

      /** Risk level */
      riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),

      /** Affected resources */
      affectedResources: z.array(z.string()).optional(),
    })
    .optional(),
});
export type DangerousCommandResult = z.infer<
  typeof DangerousCommandResultSchema
>;

// =============================================================================
// Guardrail Check Context
// =============================================================================

/**
 * Context for guardrail checks
 */
export interface GuardrailContext {
  /** Current working directory */
  cwd: string;

  /** Session ID */
  sessionId?: string;

  /** Agent type if this is a subagent */
  agentType?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Guardrail Configuration
// =============================================================================

/**
 * Configuration for guardrails
 */
export const GuardrailConfigSchema = z.object({
  /** Enable deletion protection */
  deletion: z
    .object({
      enabled: z.boolean().default(true),
      allowTrash: z.boolean().default(true),
      blockPatterns: z.array(z.string()).optional(),
    })
    .optional(),

  /** Enable secret scanning */
  secrets: z
    .object({
      enabled: z.boolean().default(true),
      scanFiles: z.boolean().default(true),
      scanCommands: z.boolean().default(true),
      customPatterns: z.array(z.string()).optional(),
    })
    .optional(),

  /** Enable dangerous command warnings */
  dangerous: z
    .object({
      enabled: z.boolean().default(true),
      blockDestructive: z.boolean().default(false),
      requireConfirmation: z.boolean().default(true),
      allowedCommands: z.array(z.string()).optional(),
    })
    .optional(),
});
export type GuardrailConfig = z.infer<typeof GuardrailConfigSchema>;

// =============================================================================
// Helper Types
// =============================================================================

/**
 * Pattern match result
 */
export interface PatternMatch {
  /** The pattern that matched */
  pattern: string;

  /** The matched string */
  match: string;

  /** Index where the match starts */
  index: number;

  /** Length of the match */
  length: number;

  /** Captured groups (if regex) */
  groups?: Record<string, string>;
}

/**
 * Validation result for any guardrail check
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Severity if validation failed */
  severity?: GuardrailSeverity;

  /** Message describing the result */
  message?: string;

  /** Suggestions for fixing the issue */
  suggestions?: string[];

  /** Additional details */
  details?: Record<string, unknown>;
}
