/**
 * User-friendly error utilities
 * Provides context and actionable suggestions for common errors
 */

import pc from 'picocolors';
import { log } from './logger.js';

/**
 * Enhanced error with context and suggestions
 */
export class ClaudeOpsError extends Error {
  public readonly context?: string;
  public readonly suggestions: string[];

  constructor(
    message: string,
    context?: string,
    suggestions: string[] = [],
    override cause?: unknown
  ) {
    super(message, { cause });
    this.name = 'ClaudeOpsError';
    this.context = context;
    this.suggestions = suggestions;
  }
}

/**
 * Error categories for better handling
 */
export enum ErrorCategory {
  CONFIG = 'configuration',
  NETWORK = 'network',
  FILE_SYSTEM = 'file_system',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  INSTALLATION = 'installation',
  RUNTIME = 'runtime',
}

/**
 * Error handler that provides context and suggestions
 */
export function handleError(error: unknown, category?: ErrorCategory): void {
  log.newline();

  if (error instanceof ClaudeOpsError) {
    log.error(error.message);

    if (error.context) {
      console.log();
      console.log(pc.dim('Context: ' + error.context));
    }

    if (error.suggestions.length > 0) {
      console.log();
      console.log(pc.bold('To fix this:'));
      for (const suggestion of error.suggestions) {
        console.log(pc.dim('  • ') + suggestion);
      }
    }

    if (error.cause) {
      console.log();
      console.log(pc.dim('Caused by:'));
      console.log(pc.dim('  ' + String(error.cause)));
    }
  } else if (error instanceof Error) {
    log.error(error.message);

    const errorInfo = categorizeError(error, category);

    if (errorInfo.suggestions.length > 0) {
      console.log();
      console.log(pc.bold('To fix this:'));
      for (const suggestion of errorInfo.suggestions) {
        console.log(pc.dim('  • ') + suggestion);
      }
    }

    // Show stack trace in debug mode
    if (process.env['CLAUDE_KIT_LOG_LEVEL'] === 'debug' && error.stack) {
      console.log();
      console.log(pc.dim('Stack trace:'));
      console.log(pc.dim(error.stack));
    }
  } else {
    log.error(String(error));
  }

  log.newline();
}

/**
 * Categorize errors and provide contextual suggestions
 */
function categorizeError(
  error: Error,
  category?: ErrorCategory
): { category: ErrorCategory; suggestions: string[] } {
  const message = error.message.toLowerCase();
  const suggestions: string[] = [];
  let detectedCategory = category ?? ErrorCategory.RUNTIME;

  // Network errors
  if (message.includes('enotfound') || message.includes('network') ||
      message.includes('fetch') || message.includes('timeout')) {
    detectedCategory = ErrorCategory.NETWORK;
    suggestions.push('Check your internet connection');
    suggestions.push('Verify DNS resolution is working');
    if (message.includes('registry.npmjs.org')) {
      suggestions.push('Try again later - NPM registry might be down');
      suggestions.push('Check NPM status: https://status.npmjs.org');
    }
  }

  // File system errors
  else if (message.includes('enoent') || message.includes('no such file')) {
    detectedCategory = ErrorCategory.FILE_SYSTEM;
    const pathMatch = error.message.match(/['"]([^'"]+)['"]/);
    const path = pathMatch?.[1];

    if (path?.includes('config.toml')) {
      suggestions.push('Run: cck config init');
      suggestions.push('Or create the file manually');
    } else if (path?.includes('.claude')) {
      suggestions.push('Ensure Claude Code is installed');
      suggestions.push('Run Claude Code at least once to initialize');
    } else {
      suggestions.push(`The required file or directory doesn't exist`);
      suggestions.push('Run: cck doctor --fix to diagnose and fix');
    }
  }

  // Permission errors
  else if (message.includes('eacces') || message.includes('permission denied')) {
    detectedCategory = ErrorCategory.PERMISSION;
    const pathMatch = error.message.match(/['"]([^'"]+)['"]/);
    const path = pathMatch?.[1];

    if (path) {
      suggestions.push(`Check permissions: ls -la "${path}"`);
      suggestions.push(`Fix permissions: chmod 755 "${path}"`);
    }
    suggestions.push('You may need to use sudo or run as administrator');
    suggestions.push('Consider using a user-level installation instead');
  }

  // JSON/TOML parsing errors
  else if (message.includes('json') || message.includes('parse') ||
           message.includes('syntax') || message.includes('unexpected')) {
    detectedCategory = ErrorCategory.VALIDATION;
    suggestions.push('Check for syntax errors in your configuration file');
    suggestions.push('Run: cck config validate');
    suggestions.push('Use a validator: https://www.jsonlint.com or https://www.toml-lint.com');
  }

  // Installation errors
  else if (message.includes('install') || message.includes('module') ||
           message.includes('package')) {
    detectedCategory = ErrorCategory.INSTALLATION;
    suggestions.push('Try reinstalling: npm install -g claudeops@latest');
    suggestions.push('Clear cache: npm cache clean --force');
    suggestions.push('Check Node.js version: node --version (requires >=20)');
  }

  // Config errors
  else if (message.includes('config') || message.includes('profile') ||
           message.includes('setup')) {
    detectedCategory = ErrorCategory.CONFIG;
    suggestions.push('Run: cck config validate');
    suggestions.push('Run: cck doctor to diagnose issues');
    suggestions.push('Reset config: cck config init --force');
  }

  return { category: detectedCategory, suggestions };
}

/**
 * Common error factories
 */
export const errors = {
  configNotFound(path: string): ClaudeOpsError {
    return new ClaudeOpsError(
      `Config file not found`,
      `Looking for: ${path}`,
      [
        'Run: cck config init',
        'Or create the file manually',
      ]
    );
  },

  invalidConfig(path: string, reason: string): ClaudeOpsError {
    return new ClaudeOpsError(
      `Invalid configuration`,
      `File: ${path}\nReason: ${reason}`,
      [
        'Run: cck config validate',
        'Check for syntax errors in the config file',
        'Use: cck config edit to fix manually',
      ]
    );
  },

  networkError(operation: string): ClaudeOpsError {
    return new ClaudeOpsError(
      `Network error during ${operation}`,
      'Could not connect to remote server',
      [
        'Check your internet connection',
        'Try again in a few moments',
        'Check if you\'re behind a proxy or firewall',
      ]
    );
  },

  permissionDenied(path: string): ClaudeOpsError {
    return new ClaudeOpsError(
      `Permission denied`,
      `Cannot access: ${path}`,
      [
        `Check permissions: ls -la "${path}"`,
        `Fix permissions: chmod 755 "${path}"`,
        'You may need elevated privileges',
      ]
    );
  },

  profileNotFound(name: string): ClaudeOpsError {
    return new ClaudeOpsError(
      `Profile not found: ${name}`,
      undefined,
      [
        'Run: cck profile list',
        `Create it: cck profile create ${name}`,
      ]
    );
  },

  setupNotFound(name: string): ClaudeOpsError {
    return new ClaudeOpsError(
      `Setup not found: ${name}`,
      undefined,
      [
        'Run: cck setup list',
        'Search available: cck setup search',
      ]
    );
  },

  addonNotFound(name: string): ClaudeOpsError {
    return new ClaudeOpsError(
      `Addon not found: ${name}`,
      undefined,
      [
        'Run: cck addon list',
        'Search available: cck addon search',
      ]
    );
  },

  incompatibleVersion(required: string, actual: string): ClaudeOpsError {
    return new ClaudeOpsError(
      `Incompatible version`,
      `Required: ${required}, Actual: ${actual}`,
      [
        'Upgrade Node.js: https://nodejs.org',
        'Use nvm: nvm install 20 && nvm use 20',
      ]
    );
  },

  validationError(field: string, reason: string): ClaudeOpsError {
    return new ClaudeOpsError(
      `Validation error`,
      `Field: ${field}\nReason: ${reason}`,
      [
        'Check the value and try again',
        'Run: cck config validate',
      ]
    );
  },
};

/**
 * Warn about deprecated features
 */
export function warnDeprecated(feature: string, alternative: string): void {
  log.warn(`"${feature}" is deprecated`);
  console.log(pc.dim(`  Use "${alternative}" instead`));
  log.newline();
}

/**
 * Assert a condition with a helpful error message
 */
export function assert(
  condition: boolean,
  message: string,
  suggestions: string[] = []
): asserts condition {
  if (!condition) {
    throw new ClaudeOpsError(message, undefined, suggestions);
  }
}

/**
 * Wrap async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  category?: ErrorCategory
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, category);
    process.exit(1);
  }
}
