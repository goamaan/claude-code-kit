/**
 * Dangerous Command Guardrails
 * Warns about or blocks dangerous operations
 */

import type { DangerousCommandResult } from './types.js';

// =============================================================================
// Command Pattern Definitions
// =============================================================================

/**
 * Pattern definition for dangerous commands
 */
interface CommandPattern {
  pattern: RegExp;
  category: 'git' | 'database' | 'filesystem' | 'system' | 'network';
  operation: string;
  severity: 'warn' | 'block';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  suggestion?: string;
}

/**
 * Dangerous command patterns
 */
const DANGEROUS_PATTERNS: CommandPattern[] = [
  // Git - Force operations
  {
    pattern: /\bgit\s+push\s+.*--force(?!-with-lease)/,
    category: 'git',
    operation: 'push --force',
    severity: 'warn',
    riskLevel: 'high',
    reason: 'Force push can overwrite remote history and cause data loss',
    suggestion: 'Use --force-with-lease instead to prevent overwriting others\' work',
  },
  {
    pattern: /\bgit\s+push\s+.*-f\s+/,
    category: 'git',
    operation: 'push -f',
    severity: 'warn',
    riskLevel: 'high',
    reason: 'Force push can overwrite remote history and cause data loss',
    suggestion: 'Use --force-with-lease instead',
  },

  // Git - Force push to protected branches
  {
    pattern: /\bgit\s+push\s+.*--force.*\s+(main|master)/,
    category: 'git',
    operation: 'force push to main/master',
    severity: 'block',
    riskLevel: 'critical',
    reason: 'Force pushing to main/master branch can cause severe data loss',
    suggestion: 'Never force push to main/master; create a new branch instead',
  },
  {
    pattern: /\bgit\s+push\s+.*-f\s+.*\s+(main|master)/,
    category: 'git',
    operation: 'force push to main/master',
    severity: 'block',
    riskLevel: 'critical',
    reason: 'Force pushing to main/master branch can cause severe data loss',
    suggestion: 'Never force push to main/master',
  },

  // Git - Hard reset
  {
    pattern: /\bgit\s+reset\s+--hard/,
    category: 'git',
    operation: 'reset --hard',
    severity: 'warn',
    riskLevel: 'high',
    reason: 'Hard reset discards all uncommitted changes permanently',
    suggestion: 'Use git stash to save changes, or git reset --soft for a safer alternative',
  },

  // Git - Clean force
  {
    pattern: /\bgit\s+clean\s+.*-[a-zA-Z]*f/,
    category: 'git',
    operation: 'clean -f',
    severity: 'warn',
    riskLevel: 'medium',
    reason: 'Git clean removes untracked files permanently',
    suggestion: 'Run "git clean -n" first to preview what will be deleted',
  },

  // Database - DROP TABLE
  {
    pattern: /\bDROP\s+TABLE\b/i,
    category: 'database',
    operation: 'DROP TABLE',
    severity: 'block',
    riskLevel: 'critical',
    reason: 'DROP TABLE permanently deletes all data in the table',
    suggestion: 'Ensure you have a backup before dropping tables',
  },

  // Database - DROP DATABASE
  {
    pattern: /\bDROP\s+DATABASE\b/i,
    category: 'database',
    operation: 'DROP DATABASE',
    severity: 'block',
    riskLevel: 'critical',
    reason: 'DROP DATABASE permanently deletes the entire database',
    suggestion: 'Ensure you have a backup before dropping databases',
  },

  // Database - TRUNCATE
  {
    pattern: /\bTRUNCATE\s+TABLE\b/i,
    category: 'database',
    operation: 'TRUNCATE TABLE',
    severity: 'warn',
    riskLevel: 'high',
    reason: 'TRUNCATE permanently deletes all rows in the table',
    suggestion: 'Use DELETE with WHERE clause for selective deletion',
  },

  // Database - DELETE without WHERE
  {
    pattern: /\bDELETE\s+FROM\s+\w+\s*(?!WHERE)/i,
    category: 'database',
    operation: 'DELETE without WHERE',
    severity: 'warn',
    riskLevel: 'high',
    reason: 'DELETE without WHERE clause will remove all rows',
    suggestion: 'Add a WHERE clause to limit the scope of deletion',
  },

  // Database - UPDATE without WHERE
  {
    pattern: /\bUPDATE\s+\w+\s+SET\s+.*(?!WHERE)/i,
    category: 'database',
    operation: 'UPDATE without WHERE',
    severity: 'warn',
    riskLevel: 'high',
    reason: 'UPDATE without WHERE clause will modify all rows',
    suggestion: 'Add a WHERE clause to limit the scope of the update',
  },

  // System - Format disk
  {
    pattern: /\b(mkfs|fdisk|parted).*\b/,
    category: 'system',
    operation: 'disk formatting',
    severity: 'block',
    riskLevel: 'critical',
    reason: 'Disk formatting operations can cause catastrophic data loss',
    suggestion: 'Ensure you have backups and are targeting the correct disk',
  },

  // System - Kill all processes
  {
    pattern: /\bkillall\s+-9/,
    category: 'system',
    operation: 'killall -9',
    severity: 'warn',
    riskLevel: 'medium',
    reason: 'Sending SIGKILL to all processes may cause system instability',
    suggestion: 'Use SIGTERM first (killall without -9) to allow graceful shutdown',
  },

  // Network - Flush iptables
  {
    pattern: /\biptables\s+(-F|--flush)/,
    category: 'network',
    operation: 'iptables flush',
    severity: 'warn',
    riskLevel: 'high',
    reason: 'Flushing iptables removes all firewall rules and may lock you out',
    suggestion: 'Save current rules first with "iptables-save"',
  },

  // Filesystem - chmod 777
  {
    pattern: /\bchmod\s+(-R\s+)?777\b/,
    category: 'filesystem',
    operation: 'chmod 777',
    severity: 'warn',
    riskLevel: 'medium',
    reason: 'Setting permissions to 777 creates a security vulnerability',
    suggestion: 'Use more restrictive permissions like 755 or 644',
  },

  // Filesystem - chown root
  {
    pattern: /\bchown\s+(-R\s+)?root:/,
    category: 'filesystem',
    operation: 'chown root',
    severity: 'warn',
    riskLevel: 'medium',
    reason: 'Changing ownership to root may make files inaccessible',
    suggestion: 'Verify this is necessary and you have appropriate permissions',
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find matching dangerous patterns in a command
 */
function findDangerousPatterns(
  command: string
): CommandPattern[] {
  const matches: CommandPattern[] = [];

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.pattern.test(command)) {
      matches.push(pattern);
    }
  }

  return matches;
}

/**
 * Determine the most severe action required
 */
function getMostSevereAction(
  patterns: CommandPattern[]
): 'allow' | 'warn' | 'block' {
  if (patterns.length === 0) {
    return 'allow';
  }

  // If any pattern requires blocking, block
  if (patterns.some((p) => p.severity === 'block')) {
    return 'block';
  }

  // If any pattern requires warning, warn
  if (patterns.some((p) => p.severity === 'warn')) {
    return 'warn';
  }

  return 'allow';
}

/**
 * Get the highest risk level
 */
function getHighestRiskLevel(
  patterns: CommandPattern[]
): 'low' | 'medium' | 'high' | 'critical' {
  const riskOrder = ['low', 'medium', 'high', 'critical'];

  let highestRisk = 'low';
  for (const pattern of patterns) {
    if (
      riskOrder.indexOf(pattern.riskLevel) > riskOrder.indexOf(highestRisk)
    ) {
      highestRisk = pattern.riskLevel;
    }
  }

  return highestRisk as 'low' | 'medium' | 'high' | 'critical';
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Check if a command is dangerous
 *
 * @param command - The command to check
 * @returns Result indicating the action to take
 *
 * @example
 * ```ts
 * const result = checkDangerousCommand('git push --force origin main');
 * if (result.action === 'block') {
 *   console.error(result.reason);
 *   console.log(result.suggestion);
 * }
 * ```
 */
export function checkDangerousCommand(
  command: string
): DangerousCommandResult {
  // Normalize command
  const normalized = command.trim().replace(/\s+/g, ' ');

  // Find all matching patterns
  const matches = findDangerousPatterns(normalized);

  // If no matches, allow
  if (matches.length === 0) {
    return {
      action: 'allow',
      severity: 'info',
    };
  }

  // Determine action and severity
  const action = getMostSevereAction(matches);
  const severity = action === 'block' ? 'block' : 'warn';

  // Get the first (most relevant) match for reason and suggestion
  const primaryMatch = matches[0]!; // Safe because we checked matches.length > 0

  // Collect all operations detected
  const operations = matches.map((m) => m.operation);

  // Collect categories
  const categories = [...new Set(matches.map((m) => m.category))];

  // Get highest risk level
  const riskLevel = getHighestRiskLevel(matches);

  return {
    action,
    severity,
    reason: primaryMatch.reason,
    suggestion: primaryMatch.suggestion,
    details: {
      category: categories[0],
      operation: operations.join(', '),
      riskLevel,
      affectedResources: operations,
    },
  };
}

/**
 * Check multiple commands
 *
 * @param commands - Array of commands to check
 * @returns Array of results for each command
 */
export function checkDangerousCommands(
  commands: string[]
): DangerousCommandResult[] {
  return commands.map(checkDangerousCommand);
}

/**
 * Check if a script contains dangerous commands
 *
 * @param script - Multi-line script content
 * @returns Result for the entire script
 */
export function checkDangerousScript(script: string): DangerousCommandResult {
  const lines = script.split('\n').filter((line) => {
    const trimmed = line.trim();
    // Filter out comments and empty lines
    return trimmed.length > 0 && !trimmed.startsWith('#');
  });

  const results = checkDangerousCommands(lines);

  // Find any blocked results
  const blocked = results.filter((r) => r.action === 'block');
  const warned = results.filter((r) => r.action === 'warn');

  if (blocked.length > 0) {
    const operations = blocked.flatMap(
      (r) => r.details?.affectedResources ?? []
    );

    return {
      action: 'block',
      severity: 'block',
      reason: `Script contains ${blocked.length} blocked operation(s)`,
      suggestion: blocked[0]?.suggestion,
      details: {
        operation: operations.join(', '),
        riskLevel: 'critical',
        affectedResources: [...new Set(operations)],
      },
    };
  }

  if (warned.length > 0) {
    const operations = warned.flatMap((r) => r.details?.affectedResources ?? []);

    return {
      action: 'warn',
      severity: 'warn',
      reason: `Script contains ${warned.length} dangerous operation(s)`,
      suggestion: warned[0]?.suggestion,
      details: {
        operation: operations.join(', '),
        riskLevel: 'high',
        affectedResources: [...new Set(operations)],
      },
    };
  }

  return {
    action: 'allow',
    severity: 'info',
  };
}

/**
 * Create a custom dangerous command checker with additional patterns
 *
 * @param customPatterns - Additional command patterns to check
 * @returns Custom check function
 */
export function createCustomDangerousChecker(
  customPatterns: CommandPattern[]
): (command: string) => DangerousCommandResult {
  const allPatterns = [...DANGEROUS_PATTERNS, ...customPatterns];

  return (command: string): DangerousCommandResult => {
    const normalized = command.trim().replace(/\s+/g, ' ');

    const matches: CommandPattern[] = [];
    for (const pattern of allPatterns) {
      if (pattern.pattern.test(normalized)) {
        matches.push(pattern);
      }
    }

    if (matches.length === 0) {
      return { action: 'allow', severity: 'info' };
    }

    const action = getMostSevereAction(matches);
    const severity = action === 'block' ? 'block' : 'warn';
    const primaryMatch = matches[0]!; // Safe because we checked matches.length > 0
    const operations = matches.map((m) => m.operation);
    const categories = [...new Set(matches.map((m) => m.category))];
    const riskLevel = getHighestRiskLevel(matches);

    return {
      action,
      severity,
      reason: primaryMatch.reason,
      suggestion: primaryMatch.suggestion,
      details: {
        category: categories[0],
        operation: operations.join(', '),
        riskLevel,
        affectedResources: operations,
      },
    };
  };
}

/**
 * Get all dangerous patterns for documentation
 *
 * @returns Array of all registered dangerous patterns
 */
export function getDangerousPatterns(): ReadonlyArray<
  Readonly<CommandPattern>
> {
  return DANGEROUS_PATTERNS;
}
