/**
 * Deletion Protection Guardrails
 * Prevents destructive file deletion commands (claude-rm-rf style)
 */

import type { DeletionCheckResult } from './types.js';

// =============================================================================
// Dangerous Deletion Patterns
// =============================================================================

/**
 * Dangerous deletion patterns to block
 * These patterns indicate destructive deletion operations
 */
const DANGEROUS_PATTERNS = [
  // rm with recursive flag
  /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f?|--recursive).*\*/, // rm -rf *, rm -r *
  /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*r?).*\*/, // rm -fr *
  /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*)\s+\//, // rm -r / or rm -rf /

  // Recursive rm on root or important directories
  /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*)\s+(\/|\/usr|\/var|\/etc|\/home|\/root|~|\$HOME)/,

  // Wildcard deletion in current or parent directory
  /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*)\s+\.{1,2}\/?/, // rm -rf . or rm -rf ..

  // shred command (secure deletion)
  /\bshred\b/,

  // unlink (low-level deletion)
  /\bunlink\b/,

  // find with -delete flag
  /\bfind\b.*-delete/,

  // find with -exec rm
  /\bfind\b.*-exec\s+(rm|shred)/,

  // xargs with rm
  /\|\s*xargs\s+(rm|shred)/,
];

/**
 * Bypass attempt patterns
 * These indicate attempts to circumvent protections
 */
const BYPASS_PATTERNS = [
  // sudo escalation
  /\bsudo\s+(rm|shred|unlink|find)/,

  // Explicit path to binary
  /\/bin\/(rm|shred|unlink)/,
  /\/usr\/bin\/(rm|shred|unlink)/,

  // Command substitution bypass
  /\\\s*rm/,

  // Builtin command bypass
  /\bcommand\s+(rm|shred|unlink)/,

  // Alias bypass
  /\\(rm|shred|unlink)/,
];

/**
 * Safe alternative patterns
 * These are considered safe deletion methods
 */
const SAFE_ALTERNATIVES = [
  // trash/trash-cli commands (move to trash instead of delete)
  /\btrash\b/,
  /\btrash-put\b/,
  /\bgio\s+trash\b/,

  // macOS trash command
  /\bmv\s+.*\.Trash/,
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a command contains dangerous deletion patterns
 */
function containsDangerousPattern(command: string): {
  found: boolean;
  patterns: string[];
} {
  const matchedPatterns: string[] = [];

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      matchedPatterns.push(pattern.source);
    }
  }

  return {
    found: matchedPatterns.length > 0,
    patterns: matchedPatterns,
  };
}

/**
 * Check if a command contains bypass attempts
 */
function containsBypassAttempt(command: string): {
  found: boolean;
  patterns: string[];
} {
  const matchedPatterns: string[] = [];

  for (const pattern of BYPASS_PATTERNS) {
    if (pattern.test(command)) {
      matchedPatterns.push(pattern.source);
    }
  }

  return {
    found: matchedPatterns.length > 0,
    patterns: matchedPatterns,
  };
}

/**
 * Check if a command uses safe alternatives
 */
function usesSafeAlternative(command: string): boolean {
  return SAFE_ALTERNATIVES.some((pattern) => pattern.test(command));
}

/**
 * Extract potential paths from command
 */
function extractPaths(command: string): string[] {
  const paths: string[] = [];

  // Extract arguments that look like paths
  const args = command.split(/\s+/);

  for (const arg of args) {
    // Skip flags
    if (arg.startsWith('-')) {
      continue;
    }

    // Match path-like arguments
    if (
      arg.startsWith('/') ||
      arg.startsWith('~') ||
      arg.startsWith('.') ||
      arg.startsWith('$HOME')
    ) {
      paths.push(arg);
    }
  }

  return paths;
}

/**
 * Determine severity based on patterns detected
 */
function determineSeverity(
  hasDangerous: boolean,
  hasBypass: boolean
): 'info' | 'warn' | 'block' {
  if (hasBypass) {
    return 'block'; // Bypass attempts are always blocked
  }
  if (hasDangerous) {
    return 'block'; // Dangerous patterns are blocked
  }
  return 'info';
}

/**
 * Generate appropriate suggestion based on the command
 */
function generateSuggestion(command: string): string | undefined {
  // If using rm, suggest trash
  if (/\brm\b/.test(command)) {
    return 'Use "trash" or "gio trash" to safely move files to trash instead of permanent deletion';
  }

  // If using find with delete
  if (/\bfind\b.*-delete/.test(command)) {
    return 'Use "find ... -exec trash {} \\;" instead of "-delete" to safely move files to trash';
  }

  // If using shred
  if (/\bshred\b/.test(command)) {
    return 'Consider whether secure deletion is truly necessary; use "trash" for reversible deletion';
  }

  return undefined;
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Check if a deletion command is safe to execute
 *
 * @param command - The command to check
 * @returns Result indicating if the command is allowed and why
 *
 * @example
 * ```ts
 * const result = checkDeletionCommand('rm -rf /important-dir');
 * if (!result.allowed) {
 *   console.error(result.reason);
 *   console.log(result.suggestion);
 * }
 * ```
 */
export function checkDeletionCommand(command: string): DeletionCheckResult {
  // Normalize command (trim and collapse whitespace)
  const normalized = command.trim().replace(/\s+/g, ' ');

  // Check for safe alternatives first
  if (usesSafeAlternative(normalized)) {
    return {
      allowed: true,
      severity: 'info',
    };
  }

  // Check for bypass attempts
  const bypassCheck = containsBypassAttempt(normalized);

  // Check for dangerous patterns
  const dangerousCheck = containsDangerousPattern(normalized);

  // If neither dangerous nor bypass, allow
  if (!dangerousCheck.found && !bypassCheck.found) {
    return {
      allowed: true,
      severity: 'info',
    };
  }

  // Extract paths for context
  const paths = extractPaths(normalized);

  // Determine severity
  const severity = determineSeverity(
    dangerousCheck.found,
    bypassCheck.found
  );

  // Build reason message
  let reason = '';
  if (bypassCheck.found) {
    reason =
      'Detected bypass attempt: Command uses techniques to circumvent deletion protection';
  } else if (dangerousCheck.found) {
    reason = 'Dangerous deletion pattern detected: This command may cause irreversible data loss';
  }

  // Get suggestion
  const suggestion = generateSuggestion(normalized);

  return {
    allowed: false,
    severity,
    reason,
    suggestion,
    details: {
      patterns: dangerousCheck.patterns,
      bypassAttempts: bypassCheck.patterns,
      paths: paths.length > 0 ? paths : undefined,
    },
  };
}

/**
 * Check multiple commands at once
 *
 * @param commands - Array of commands to check
 * @returns Array of results for each command
 */
export function checkDeletionCommands(
  commands: string[]
): DeletionCheckResult[] {
  return commands.map(checkDeletionCommand);
}

/**
 * Check if any command in a script contains dangerous deletions
 *
 * @param script - Multi-line script content
 * @returns Result for the entire script
 */
export function checkDeletionScript(script: string): DeletionCheckResult {
  const lines = script.split('\n').filter((line) => {
    const trimmed = line.trim();
    // Filter out comments and empty lines
    return trimmed.length > 0 && !trimmed.startsWith('#');
  });

  const results = checkDeletionCommands(lines);

  // Find any blocked results
  const blocked = results.filter((r) => !r.allowed);

  if (blocked.length === 0) {
    return {
      allowed: true,
      severity: 'info',
    };
  }

  // Aggregate all issues
  const allPatterns = blocked.flatMap((r) => r.details?.patterns ?? []);
  const allBypassAttempts = blocked.flatMap(
    (r) => r.details?.bypassAttempts ?? []
  );
  const allPaths = blocked.flatMap((r) => r.details?.paths ?? []);

  // Use highest severity
  const severity = blocked.some((r) => r.severity === 'block')
    ? 'block'
    : 'warn';

  return {
    allowed: false,
    severity,
    reason: `Script contains ${blocked.length} dangerous deletion command(s)`,
    suggestion: blocked[0]?.suggestion,
    details: {
      patterns: [...new Set(allPatterns)],
      bypassAttempts: [...new Set(allBypassAttempts)],
      paths: [...new Set(allPaths)],
    },
  };
}

/**
 * Create a custom deletion checker with additional patterns
 *
 * @param customPatterns - Additional regex patterns to block
 * @returns Custom check function
 */
export function createCustomDeletionChecker(
  customPatterns: RegExp[]
): (command: string) => DeletionCheckResult {
  const allPatterns = [...DANGEROUS_PATTERNS, ...customPatterns];

  return (command: string): DeletionCheckResult => {
    const normalized = command.trim().replace(/\s+/g, ' ');

    if (usesSafeAlternative(normalized)) {
      return { allowed: true, severity: 'info' };
    }

    const bypassCheck = containsBypassAttempt(normalized);

    // Check against all patterns including custom ones
    const matchedPatterns: string[] = [];
    for (const pattern of allPatterns) {
      if (pattern.test(normalized)) {
        matchedPatterns.push(pattern.source);
      }
    }

    const hasDangerous = matchedPatterns.length > 0;

    if (!hasDangerous && !bypassCheck.found) {
      return { allowed: true, severity: 'info' };
    }

    const paths = extractPaths(normalized);
    const severity = determineSeverity(hasDangerous, bypassCheck.found);
    const suggestion = generateSuggestion(normalized);

    let reason = '';
    if (bypassCheck.found) {
      reason = 'Detected bypass attempt';
    } else if (hasDangerous) {
      reason = 'Dangerous deletion pattern detected';
    }

    return {
      allowed: false,
      severity,
      reason,
      suggestion,
      details: {
        patterns: matchedPatterns,
        bypassAttempts: bypassCheck.patterns,
        paths: paths.length > 0 ? paths : undefined,
      },
    };
  };
}
