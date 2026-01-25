/**
 * Common error helper functions
 * Reusable patterns for handling specific error types
 */

import * as output from '../ui/output.js';
import { handleError, ErrorCategory } from './errors.js';

/**
 * Wrap command execution with consistent error handling
 */
export async function executeCommand<T>(
  operation: () => Promise<T>,
  errorContext?: {
    category?: ErrorCategory;
    onError?: (error: unknown) => void;
  }
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    if (errorContext?.onError) {
      errorContext.onError(error);
    }
    handleError(error, errorContext?.category);
    process.exit(1);
  }
}

/**
 * Show helpful error message when a resource is not found
 */
export function notFoundError(
  resourceType: string,
  name: string,
  suggestions: string[]
): never {
  output.error(`${resourceType} not found: ${name}`);
  console.log();
  if (suggestions.length > 0) {
    output.info('To fix this:');
    for (const suggestion of suggestions) {
      output.dim(`  • ${suggestion}`);
    }
  }
  process.exit(1);
}

/**
 * Show helpful error when config is invalid
 */
export function configError(
  path: string,
  reason: string,
  fix?: string
): never {
  output.error('Invalid configuration');
  console.log();
  output.kv('File', path);
  output.kv('Problem', reason);
  console.log();
  if (fix) {
    output.info('To fix this:');
    output.dim(`  • ${fix}`);
  } else {
    output.info('To fix this:');
    output.dim('  • Run: cops config validate');
    output.dim('  • Edit: cops config edit');
  }
  process.exit(1);
}

/**
 * Show helpful error when network request fails
 */
export function networkError(operation: string): never {
  output.error(`Network error during ${operation}`);
  console.log();
  output.info('Possible causes:');
  output.dim('  • No internet connection');
  output.dim('  • Server is unreachable');
  output.dim('  • Network firewall blocking request');
  console.log();
  output.info('To fix this:');
  output.dim('  • Check your internet connection');
  output.dim('  • Try again in a few moments');
  output.dim('  • Check proxy/firewall settings');
  process.exit(1);
}

/**
 * Show helpful error when file system operation fails
 */
export function fileSystemError(
  operation: string,
  path: string,
  reason: string
): never {
  output.error(`File system error: ${operation}`);
  console.log();
  output.kv('Path', path);
  output.kv('Reason', reason);
  console.log();
  output.info('To fix this:');
  output.dim('  • Check if the path exists');
  output.dim('  • Check file permissions');
  output.dim('  • Ensure parent directory exists');
  process.exit(1);
}

/**
 * Show helpful error when permissions are insufficient
 */
export function permissionError(path: string): never {
  output.error('Permission denied');
  console.log();
  output.kv('Path', path);
  console.log();
  output.info('To fix this:');
  output.dim(`  • Check permissions: ls -la "${path}"`);
  output.dim(`  • Fix permissions: chmod 755 "${path}"`);
  output.dim('  • Try running with sudo (not recommended)');
  output.dim('  • Use a user-level installation instead');
  process.exit(1);
}

/**
 * Show validation error with field details
 */
export function validationError(
  field: string,
  value: unknown,
  reason: string,
  expectedFormat?: string
): never {
  output.error('Validation error');
  console.log();
  output.kv('Field', field);
  output.kv('Value', String(value));
  output.kv('Problem', reason);
  if (expectedFormat) {
    output.kv('Expected', expectedFormat);
  }
  console.log();
  output.info('To fix this:');
  output.dim('  • Check the value and try again');
  output.dim('  • Run: cops config validate');
  process.exit(1);
}

/**
 * Show dependency error (e.g., missing Node.js version)
 */
export function dependencyError(
  dependency: string,
  required: string,
  actual?: string
): never {
  output.error(`Incompatible ${dependency} version`);
  console.log();
  output.kv('Required', required);
  if (actual) {
    output.kv('Actual', actual);
  }
  console.log();
  output.info('To fix this:');
  if (dependency.toLowerCase() === 'node.js' || dependency.toLowerCase() === 'node') {
    output.dim('  • Upgrade Node.js: https://nodejs.org');
    output.dim('  • Use nvm: nvm install 20 && nvm use 20');
  } else {
    output.dim(`  • Install or upgrade ${dependency}`);
    output.dim('  • Check installation documentation');
  }
  process.exit(1);
}

/**
 * Show installation error with recovery steps
 */
export function installationError(
  component: string,
  reason: string
): never {
  output.error(`Installation failed: ${component}`);
  console.log();
  output.kv('Reason', reason);
  console.log();
  output.info('To fix this:');
  output.dim('  • Try reinstalling: npm install -g claudeops@latest');
  output.dim('  • Clear cache: npm cache clean --force');
  output.dim('  • Check Node.js version: node --version');
  output.dim('  • Run: cops doctor --fix');
  process.exit(1);
}
