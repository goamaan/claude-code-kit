/**
 * Secret Scanning Guardrails
 * Detects secrets, API keys, and credentials in content
 */

import type { SecretScanResult, SecretMatch, SecretType } from './types.js';

// =============================================================================
// Secret Detection Patterns
// =============================================================================

/**
 * Pattern definitions for different secret types
 */
interface SecretPattern {
  type: SecretType;
  pattern: RegExp;
  confidence: number; // 0-1
  description: string;
}

/**
 * Comprehensive secret patterns
 */
const SECRET_PATTERNS: SecretPattern[] = [
  // AWS Access Keys
  {
    type: 'aws_key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    confidence: 0.95,
    description: 'AWS Access Key ID',
  },
  {
    type: 'aws_key',
    pattern: /aws_access_key_id\s*=\s*["']?([A-Z0-9]{20})["']?/gi,
    confidence: 0.9,
    description: 'AWS Access Key in config',
  },
  {
    type: 'aws_key',
    pattern: /aws_secret_access_key\s*=\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    confidence: 0.9,
    description: 'AWS Secret Access Key',
  },

  // GitHub Tokens
  {
    type: 'github_token',
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    confidence: 0.95,
    description: 'GitHub Personal Access Token',
  },
  {
    type: 'github_token',
    pattern: /gho_[a-zA-Z0-9]{36}/g,
    confidence: 0.95,
    description: 'GitHub OAuth Token',
  },
  {
    type: 'github_token',
    pattern: /ghu_[a-zA-Z0-9]{36}/g,
    confidence: 0.95,
    description: 'GitHub User Token',
  },
  {
    type: 'github_token',
    pattern: /ghs_[a-zA-Z0-9]{36}/g,
    confidence: 0.95,
    description: 'GitHub Server Token',
  },
  {
    type: 'github_token',
    pattern: /ghr_[a-zA-Z0-9]{36}/g,
    confidence: 0.95,
    description: 'GitHub Refresh Token',
  },

  // Stripe Keys
  {
    type: 'stripe_key',
    pattern: /sk_live_[a-zA-Z0-9]{24,}/g,
    confidence: 0.95,
    description: 'Stripe Live Secret Key',
  },
  {
    type: 'stripe_key',
    pattern: /pk_live_[a-zA-Z0-9]{24,}/g,
    confidence: 0.9,
    description: 'Stripe Live Publishable Key',
  },
  {
    type: 'stripe_key',
    pattern: /rk_live_[a-zA-Z0-9]{24,}/g,
    confidence: 0.95,
    description: 'Stripe Live Restricted Key',
  },

  // Private Keys
  {
    type: 'private_key',
    pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    confidence: 0.99,
    description: 'Private Key (PEM format)',
  },
  {
    type: 'private_key',
    pattern: /-----BEGIN (DSA |PGP )?PRIVATE KEY BLOCK-----/g,
    confidence: 0.99,
    description: 'PGP Private Key',
  },

  // JWT Tokens
  {
    type: 'jwt',
    pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
    confidence: 0.85,
    description: 'JWT Token',
  },

  // Generic API Keys (assignments)
  {
    type: 'api_key',
    pattern:
      /api[_-]?key\s*[=:]\s*["']([a-zA-Z0-9_-]{20,})["']/gi,
    confidence: 0.7,
    description: 'API Key assignment',
  },
  {
    type: 'api_key',
    pattern:
      /apikey\s*[=:]\s*["']([a-zA-Z0-9_-]{20,})["']/gi,
    confidence: 0.7,
    description: 'API Key assignment',
  },

  // Passwords (assignments with actual values)
  {
    type: 'password',
    pattern:
      /password\s*[=:]\s*["']([^"'\s]{8,})["']/gi,
    confidence: 0.6,
    description: 'Password assignment',
  },
  {
    type: 'password',
    pattern:
      /passwd\s*[=:]\s*["']([^"'\s]{8,})["']/gi,
    confidence: 0.6,
    description: 'Password assignment',
  },
  {
    type: 'password',
    pattern:
      /pwd\s*[=:]\s*["']([^"'\s]{8,})["']/gi,
    confidence: 0.5,
    description: 'Password assignment',
  },

  // Generic Secrets
  {
    type: 'generic_secret',
    pattern:
      /secret\s*[=:]\s*["']([a-zA-Z0-9_-]{16,})["']/gi,
    confidence: 0.6,
    description: 'Secret assignment',
  },
  {
    type: 'generic_secret',
    pattern:
      /token\s*[=:]\s*["']([a-zA-Z0-9_-]{20,})["']/gi,
    confidence: 0.6,
    description: 'Token assignment',
  },

  // OAuth Tokens
  {
    type: 'oauth_token',
    pattern:
      /access[_-]?token\s*[=:]\s*["']([a-zA-Z0-9_.-]{20,})["']/gi,
    confidence: 0.7,
    description: 'OAuth Access Token',
  },
];

/**
 * False positive patterns to exclude
 * These patterns indicate the value is likely not a real secret
 */
const FALSE_POSITIVE_PATTERNS = [
  // Environment variable references
  /process\.env\./,
  /os\.environ/,
  /ENV\[/,
  /getenv\(/,
  /<%(.*?)%>/,

  // Placeholder values
  /your[_-]?api[_-]?key/i,
  /example/i,
  /placeholder/i,
  /xxxxxxx/i,
  /\*\*\*\*\*\*\*/,
  /\.\.\./,
  /test[_-]?key/i,
  /dummy/i,
  /fake/i,
  /sample/i,

  // Template strings
  /\$\{.*\}/,
  /\{\{.*\}\}/,
  /%\(.*\)/,

  // Base64 encoded strings that are just examples
  /base64/i,

  // Documentation
  /\/\/.*example/i,
  /\/\*.*example/i,
  /#.*example/i,
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a match is likely a false positive
 */
function isFalsePositive(match: string, context: string): boolean {
  // Check if the match or its context contains false positive indicators
  const combined = `${match} ${context}`;

  return FALSE_POSITIVE_PATTERNS.some((pattern) => pattern.test(combined));
}

/**
 * Extract line and column from content and match index
 */
function getLineAndColumn(
  content: string,
  index: number
): { line: number; column: number } {
  const lines = content.substring(0, index).split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1]?.length ?? 0;

  return { line, column: column + 1 }; // 1-indexed
}

/**
 * Get context around a match
 */
function getContext(content: string, index: number, contextSize = 50): string {
  const start = Math.max(0, index - contextSize);
  const end = Math.min(content.length, index + contextSize);

  let context = content.substring(start, end);

  // Add ellipsis if truncated
  if (start > 0) {
    context = '...' + context;
  }
  if (end < content.length) {
    context = context + '...';
  }

  // Replace the actual secret with asterisks for safety
  return context;
}

/**
 * Redact a secret value for safe display
 */
function redactSecret(value: string): string {
  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }

  // Show first 4 and last 4 characters
  const start = value.substring(0, 4);
  const end = value.substring(value.length - 4);

  return `${start}${'*'.repeat(value.length - 8)}${end}`;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Scan content for secrets and credentials
 *
 * @param content - The content to scan (file content, command, etc.)
 * @param options - Scanning options
 * @returns Scan result with all detected secrets
 *
 * @example
 * ```ts
 * const result = scanForSecrets(fileContent);
 * if (result.hasSecrets) {
 *   console.error('Secrets detected!');
 *   for (const match of result.matches) {
 *     console.log(`${match.type} at line ${match.line}`);
 *   }
 * }
 * ```
 */
export function scanForSecrets(
  content: string,
  options?: {
    /** Include low-confidence matches */
    includeLowConfidence?: boolean;
    /** Minimum confidence threshold (0-1) */
    minConfidence?: number;
    /** Custom patterns to check */
    customPatterns?: SecretPattern[];
  }
): SecretScanResult {
  const minConfidence = options?.minConfidence ?? 0.5;
  const patterns = [
    ...SECRET_PATTERNS,
    ...(options?.customPatterns ?? []),
  ];

  const matches: SecretMatch[] = [];

  // Scan with each pattern
  for (const patternDef of patterns) {
    // Skip if confidence is below threshold
    if (patternDef.confidence < minConfidence) {
      continue;
    }

    // Reset regex lastIndex
    patternDef.pattern.lastIndex = 0;

    let match: RegExpExecArray | null;

    while ((match = patternDef.pattern.exec(content)) !== null) {
      const matchedValue = match[0];
      const matchIndex = match.index;

      // Get context around the match
      const context = getContext(content, matchIndex);

      // Check for false positives
      if (isFalsePositive(matchedValue, context)) {
        continue;
      }

      // Get line and column
      const { line, column } = getLineAndColumn(content, matchIndex);

      // Add to matches
      matches.push({
        type: patternDef.type,
        value: redactSecret(matchedValue),
        line,
        column,
        context,
        confidence: patternDef.confidence,
      });
    }
  }

  // Remove duplicates (same value at same location)
  const uniqueMatches = matches.filter(
    (match, index, self) =>
      index ===
      self.findIndex(
        (m) => m.line === match.line && m.column === match.column
      )
  );

  const hasSecrets = uniqueMatches.length > 0;

  // Determine severity
  const severity = hasSecrets ? 'block' : 'info';

  // Build message
  let message: string | undefined;
  if (hasSecrets) {
    const secretTypes = [...new Set(uniqueMatches.map((m) => m.type))];
    message = `Detected ${uniqueMatches.length} secret(s) of type(s): ${secretTypes.join(', ')}`;
  }

  // Build suggestions
  const suggestions: string[] = [];
  if (hasSecrets) {
    suggestions.push('Remove secrets from the content');
    suggestions.push('Use environment variables instead (e.g., process.env.API_KEY)');
    suggestions.push('Store secrets in a secure vault or secrets manager');
    suggestions.push('Add sensitive files to .gitignore');
  }

  return {
    hasSecrets,
    matches: uniqueMatches,
    severity,
    message,
    suggestions: hasSecrets ? suggestions : undefined,
  };
}

/**
 * Scan a command string for embedded secrets
 *
 * @param command - The command to scan
 * @returns Scan result
 */
export function scanCommandForSecrets(command: string): SecretScanResult {
  return scanForSecrets(command, {
    minConfidence: 0.7, // Higher threshold for commands
  });
}

/**
 * Scan multiple files for secrets
 *
 * @param files - Map of filename to content
 * @returns Map of filename to scan results
 */
export function scanFilesForSecrets(
  files: Map<string, string>
): Map<string, SecretScanResult> {
  const results = new Map<string, SecretScanResult>();

  for (const [filename, content] of files) {
    const result = scanForSecrets(content);
    results.set(filename, result);
  }

  return results;
}

/**
 * Create a custom secret scanner with additional patterns
 *
 * @param customPatterns - Additional secret patterns to check
 * @returns Custom scan function
 */
export function createCustomSecretScanner(
  customPatterns: SecretPattern[]
): (content: string) => SecretScanResult {
  return (content: string): SecretScanResult => {
    return scanForSecrets(content, { customPatterns });
  };
}

/**
 * Check if a specific line contains secrets
 *
 * @param line - The line to check
 * @param lineNumber - Line number for context
 * @returns Whether the line contains secrets and details
 */
export function checkLineForSecrets(
  line: string,
  lineNumber?: number
): {
  hasSecrets: boolean;
  matches: SecretMatch[];
} {
  const result = scanForSecrets(line);

  // Update line numbers if provided
  if (lineNumber !== undefined && result.matches.length > 0) {
    for (const match of result.matches) {
      match.line = lineNumber;
    }
  }

  return {
    hasSecrets: result.hasSecrets,
    matches: result.matches,
  };
}

/**
 * Get statistics about detected secrets
 *
 * @param result - Scan result to analyze
 * @returns Statistics about the secrets found
 */
export function getSecretStatistics(result: SecretScanResult): {
  totalSecrets: number;
  secretsByType: Record<SecretType, number>;
  highConfidenceCount: number;
  averageConfidence: number;
} {
  const secretsByType: Partial<Record<SecretType, number>> = {};

  let highConfidenceCount = 0;
  let totalConfidence = 0;

  for (const match of result.matches) {
    secretsByType[match.type] = (secretsByType[match.type] ?? 0) + 1;

    if (match.confidence && match.confidence >= 0.8) {
      highConfidenceCount++;
    }

    totalConfidence += match.confidence ?? 0;
  }

  return {
    totalSecrets: result.matches.length,
    secretsByType: secretsByType as Record<SecretType, number>,
    highConfidenceCount,
    averageConfidence:
      result.matches.length > 0 ? totalConfidence / result.matches.length : 0,
  };
}
