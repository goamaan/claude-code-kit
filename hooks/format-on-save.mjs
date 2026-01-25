#!/usr/bin/env node
/**
 * format-on-save - PostToolUse Hook
 *
 * Automatically formats files after Write/Edit operations.
 * Supports Prettier, Black, rustfmt, gofmt, and other formatters.
 *
 * Hook type: PostToolUse
 * Triggers: After Write/Edit tool modifies files
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname } from 'path';

/**
 * Formatter configurations by file extension
 */
const FORMATTERS = {
  // JavaScript/TypeScript
  '.js': { formatter: 'prettier', command: 'npx prettier --write' },
  '.jsx': { formatter: 'prettier', command: 'npx prettier --write' },
  '.ts': { formatter: 'prettier', command: 'npx prettier --write' },
  '.tsx': { formatter: 'prettier', command: 'npx prettier --write' },
  '.json': { formatter: 'prettier', command: 'npx prettier --write' },
  '.css': { formatter: 'prettier', command: 'npx prettier --write' },
  '.scss': { formatter: 'prettier', command: 'npx prettier --write' },
  '.html': { formatter: 'prettier', command: 'npx prettier --write' },
  '.yaml': { formatter: 'prettier', command: 'npx prettier --write' },
  '.yml': { formatter: 'prettier', command: 'npx prettier --write' },
  '.md': { formatter: 'prettier', command: 'npx prettier --write' },

  // Python
  '.py': { formatter: 'black', command: 'black' },

  // Rust
  '.rs': { formatter: 'rustfmt', command: 'rustfmt' },

  // Go
  '.go': { formatter: 'gofmt', command: 'gofmt -w' },

  // C/C++
  '.c': { formatter: 'clang-format', command: 'clang-format -i' },
  '.cpp': { formatter: 'clang-format', command: 'clang-format -i' },
  '.h': { formatter: 'clang-format', command: 'clang-format -i' },
  '.hpp': { formatter: 'clang-format', command: 'clang-format -i' },
};

/**
 * Check if formatter is available
 */
function isFormatterAvailable(formatter) {
  try {
    if (formatter === 'prettier') {
      execSync('npx prettier --version', { stdio: 'pipe' });
      return true;
    }
    execSync(`which ${formatter}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Format file with appropriate formatter
 */
function formatFile(filePath) {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  const config = FORMATTERS[ext];

  if (!config) {
    return { success: false, reason: 'no-formatter' };
  }

  if (!isFormatterAvailable(config.formatter)) {
    return { success: false, reason: 'formatter-not-installed', formatter: config.formatter };
  }

  try {
    const cwd = dirname(filePath);
    execSync(`${config.command} "${filePath}"`, {
      cwd,
      stdio: 'pipe',
      timeout: 10000,
    });

    return { success: true, formatter: config.formatter };
  } catch (error) {
    return { success: false, reason: 'format-error', error: error.message };
  }
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

    // Only process Write and Edit tools
    if (data.tool !== 'Write' && data.tool !== 'Edit') {
      process.exit(0);
      return;
    }

    // Skip if disabled
    if (process.env.SKIP_AUTO_FORMAT === '1') {
      process.exit(0);
      return;
    }

    const filePath = data.parameters?.file_path || '';

    if (!filePath || !existsSync(filePath)) {
      process.exit(0);
      return;
    }

    // Skip config and hook files
    if (filePath.includes('.omc/') ||
        filePath.includes('.claude/') ||
        filePath.includes('node_modules/')) {
      process.exit(0);
      return;
    }

    // Attempt to format
    const result = formatFile(filePath);

    if (result.success) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `✨ Auto-formatted ${filePath} with ${result.formatter}`,
        },
      }));
    } else if (result.reason === 'formatter-not-installed') {
      // Warn about missing formatter
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `ℹ️  Install ${result.formatter} for auto-formatting (npm i -D prettier or pip install black)`,
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
