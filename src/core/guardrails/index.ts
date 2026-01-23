/**
 * Guardrails Layer
 * Security and safety checks for claudeops operations
 */

// Export types
export type {
  GuardrailSeverity,
  GuardrailAction,
  DeletionCheckResult,
  SecretType,
  SecretMatch,
  SecretScanResult,
  DangerousCommandResult,
  GuardrailContext,
  GuardrailConfig,
  PatternMatch,
  ValidationResult,
} from './types.js';

export {
  GuardrailSeveritySchema,
  GuardrailActionSchema,
  DeletionCheckResultSchema,
  SecretTypeSchema,
  SecretMatchSchema,
  SecretScanResultSchema,
  DangerousCommandResultSchema,
  GuardrailConfigSchema,
} from './types.js';

// Export deletion protection functions
export {
  checkDeletionCommand,
  checkDeletionCommands,
  checkDeletionScript,
  createCustomDeletionChecker,
} from './deletion.js';

// Export secret scanning functions
export {
  scanForSecrets,
  scanCommandForSecrets,
  scanFilesForSecrets,
  createCustomSecretScanner,
  checkLineForSecrets,
  getSecretStatistics,
} from './secrets.js';

// Export dangerous command checking functions
export {
  checkDangerousCommand,
  checkDangerousCommands,
  checkDangerousScript,
  createCustomDangerousChecker,
  getDangerousPatterns,
} from './dangerous.js';
