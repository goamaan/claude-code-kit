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
import { dirname, join } from 'path';

/**
 * Detect package manager from environment or lockfile
 */
function getPackageManager(projectDir) {
  // Check env var first (set by claudeops sync)
  const preferred = process.env.CLAUDEOPS_PACKAGE_MANAGER;
  if (preferred && ['npm', 'yarn', 'pnpm', 'bun'].includes(preferred)) {
    return preferred;
  }

  // Detect from lockfile
  const lockfiles = {
    'package-lock.json': 'npm',
    'yarn.lock': 'yarn',
    'pnpm-lock.yaml': 'pnpm',
    'bun.lockb': 'bun',
  };

  for (const [file, pm] of Object.entries(lockfiles)) {
    if (existsSync(join(projectDir, file))) {
      return pm;
    }
  }

  return 'npm';
}

/**
 * Get exec command for package manager
 */
function getExecCommand(pm) {
  const commands = {
    npm: 'npx',
    yarn: 'yarn dlx',
    pnpm: 'pnpm exec',
    bun: 'bunx',
  };
  return commands[pm] || 'npx';
}

/**
 * Get prettier command for the detected package manager
 */
function getPrettierCommand(projectDir) {
  const pm = getPackageManager(projectDir);
  const execCmd = getExecCommand(pm);
  return `${execCmd} prettier --write`;
}

/**
 * Formatter configurations by file extension
 * For prettier-based formatters, command is set dynamically based on package manager
 */
const FORMATTERS = {
  // JavaScript/TypeScript (prettier - command set dynamically)
  '.js': { formatter: 'prettier', command: null },
  '.jsx': { formatter: 'prettier', command: null },
  '.ts': { formatter: 'prettier', command: null },
  '.tsx': { formatter: 'prettier', command: null },
  '.json': { formatter: 'prettier', command: null },
  '.css': { formatter: 'prettier', command: null },
  '.scss': { formatter: 'prettier', command: null },
  '.html': { formatter: 'prettier', command: null },
  '.yaml': { formatter: 'prettier', command: null },
  '.yml': { formatter: 'prettier', command: null },
  '.md': { formatter: 'prettier', command: null },

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
function isFormatterAvailable(formatter, projectDir) {
  try {
    if (formatter === 'prettier') {
      const pm = getPackageManager(projectDir);
      const execCmd = getExecCommand(pm);
      execSync(`${execCmd} prettier --version`, { stdio: 'pipe', cwd: projectDir });
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

  const cwd = dirname(filePath);

  if (!isFormatterAvailable(config.formatter, cwd)) {
    return { success: false, reason: 'formatter-not-installed', formatter: config.formatter };
  }

  try {
    // Get the command - for prettier, build it dynamically
    let command = config.command;
    if (config.formatter === 'prettier') {
      command = getPrettierCommand(cwd);
    }

    execSync(`${command} "${filePath}"`, {
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
