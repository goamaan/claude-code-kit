#!/usr/bin/env node
/**
 * Hook Utilities
 * Shared utilities for Claude Code hook scripts
 */

/**
 * Read all data from stdin
 * @returns {Promise<string>} The stdin content
 */
export async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';

    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data);
    });

    process.stdin.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Parse JSON input from hook
 * @param {string} input - Raw input string
 * @returns {object} Parsed JSON object
 */
export function parseHookInput(input) {
  try {
    return JSON.parse(input);
  } catch (error) {
    logWarning(`Failed to parse hook input: ${error.message}`);
    return null;
  }
}

/**
 * Output JSON result to stdout
 * @param {object} result - Result object to output
 */
export function outputResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Log warning message to stderr
 * @param {string} message - Warning message
 */
export function logWarning(message) {
  console.error(`[Hook] ${message}`);
}

/**
 * Log error message to stderr
 * @param {string} message - Error message
 */
export function logError(message) {
  console.error(`[Hook Error] ${message}`);
}

/**
 * Log info message to stderr
 * @param {string} message - Info message
 */
export function logInfo(message) {
  console.error(`[Hook] ${message}`);
}

/**
 * Exit with code
 * @param {number} code - Exit code (0=allow, 1=error, 2=block)
 * @param {string} [message] - Optional message
 */
export function exit(code, message) {
  if (message) {
    if (code === 0) {
      logInfo(message);
    } else if (code === 2) {
      logWarning(message);
    } else {
      logError(message);
    }
  }
  process.exit(code);
}

/**
 * Get package root directory
 * @returns {Promise<string>} Absolute path to package root
 */
export async function getPackageRoot() {
  // When installed as npm package, hooks will be in node_modules/claudeops/scripts/hooks
  // We need to go up to the claudeops package root
  const { fileURLToPath } = await import('url');
  const { dirname, join } = await import('path');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // From scripts/hooks/lib/utils.js -> go up 3 levels
  return join(__dirname, '..', '..', '..');
}

/**
 * Try to import a module, return null if not available
 * @param {string} modulePath - Module path to import
 * @returns {Promise<any|null>} Module or null
 */
export async function tryImport(modulePath) {
  try {
    return await import(modulePath);
  } catch {
    return null;
  }
}
