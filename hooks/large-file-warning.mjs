#!/usr/bin/env node
/**
 * Hook: large-file-warning
 * Event: PreToolUse
 * Description: Warns before reading large files
 * Matcher: Read
 * Enabled: false
 *
 * large-file-warning - PreToolUse Hook
 *
 * Warns before reading large files that could consume excessive tokens.
 * Helps prevent accidental context bloat from reading massive files.
 *
 * Hook type: PreToolUse
 * Triggers: Before Read tool executes
 */

import { statSync, existsSync } from 'fs';

/**
 * Size thresholds (in bytes)
 */
const WARN_SIZE = 100_000;  // 100 KB
const CRITICAL_SIZE = 500_000;  // 500 KB

/**
 * File types that are often large but okay to read
 */
const SAFE_LARGE_FILES = [
  '.json',  // Package lock, configs
  '.md',    // Documentation
  '.txt',   // Logs, text data
];

/**
 * File types that should always warn if large
 */
const DANGEROUS_LARGE_FILES = [
  '.min.js',
  '.bundle.js',
  '.map',
  '.bin',
  '.dat',
  '.sql',
  '.csv',
  '.log',
];

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Estimate token count from file size
 */
function estimateTokens(bytes) {
  // Rough estimate: 1 token ≈ 4 characters ≈ 4 bytes
  return Math.floor(bytes / 4);
}

/**
 * Get file extension
 */
function getExtension(filePath) {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return '';
  const ext = filePath.slice(lastDot);
  return ext;
}

/**
 * Check if file type is safe to read when large
 */
function isSafeType(filePath) {
  const ext = getExtension(filePath);
  return SAFE_LARGE_FILES.some(safe => ext === safe);
}

/**
 * Check if file type is dangerous when large
 */
function isDangerousType(filePath) {
  return DANGEROUS_LARGE_FILES.some(dangerous => filePath.endsWith(dangerous));
}

/**
 * Main hook function
 */
async function main() {
  // Read hook input from stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const data = JSON.parse(input);

    // Only check Read tool
    if (data.tool !== 'Read') {
      process.exit(0);
      return;
    }

    const filePath = data.parameters?.file_path || '';

    if (!filePath) {
      process.exit(0);
      return;
    }

    // Check if file exists and get size
    if (!existsSync(filePath)) {
      process.exit(0);
      return;
    }

    let stats;
    try {
      stats = statSync(filePath);
    } catch {
      process.exit(0);
      return;
    }

    const size = stats.size;

    // Skip if file is small
    if (size < WARN_SIZE) {
      process.exit(0);
      return;
    }

    // Determine warning level
    const isCritical = size >= CRITICAL_SIZE;
    const isSafe = isSafeType(filePath) && !isDangerousType(filePath);

    // Skip warning for safe types unless critical
    if (isSafe && !isCritical) {
      process.exit(0);
      return;
    }

    // Build warning message
    const severity = isCritical ? '🚨 CRITICAL' : '⚠️  WARNING';
    const tokens = estimateTokens(size);

    const warningMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${severity}: Large File Read
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File: ${filePath}
Size: ${formatBytes(size)}
Estimated tokens: ~${tokens.toLocaleString()}

Reading this file will consume significant context.

Consider:
  1. Read only specific lines: Read(file_path="...", offset=0, limit=100)
  2. Use Grep to find specific content: Grep(pattern="...", path="...")
  3. Use Bash with head/tail: head -n 50 "${filePath}"
  4. Split into smaller chunks

To bypass: export SKIP_FILE_SIZE_CHECK=1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    // Check if user wants to skip
    if (process.env.SKIP_FILE_SIZE_CHECK !== '1') {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: warningMessage,
        },
      }));
    }

    process.exit(0);
  } catch {
    // On error, just continue without blocking
    process.exit(0);
  }
}

main();
