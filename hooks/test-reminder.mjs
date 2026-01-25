#!/usr/bin/env node
/**
 * test-reminder - PostToolUse Hook
 *
 * Reminds to run tests after code changes.
 * Tracks modified files and suggests appropriate test commands.
 *
 * Hook type: PostToolUse
 * Triggers: After Write/Edit tool modifies source files
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * File patterns that indicate source code
 */
const SOURCE_PATTERNS = /\.(ts|tsx|js|jsx|py|go|rs|java|cpp|c)$/;

/**
 * Get session state file path
 */
function getStateFilePath() {
  const stateDir = join(homedir(), '.claudeops', 'state');
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  return join(stateDir, 'test-reminder.json');
}

/**
 * Load session state
 */
function loadState() {
  const filePath = getStateFilePath();

  if (!existsSync(filePath)) {
    return { modifiedFiles: [], lastReminder: null };
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return { modifiedFiles: [], lastReminder: null };
  }
}

/**
 * Save session state
 */
function saveState(state) {
  const filePath = getStateFilePath();
  writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Detect test framework from file content
 */
function detectTestFramework(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');

    if (content.includes('pytest') || content.includes('def test_')) {
      return { framework: 'pytest', command: 'pytest' };
    }
    if (content.includes('jest') || content.includes('describe(')) {
      return { framework: 'jest', command: 'npm test' };
    }
    if (content.includes('vitest')) {
      return { framework: 'vitest', command: 'npm run test' };
    }
    if (content.includes('go test')) {
      return { framework: 'go', command: 'go test ./...' };
    }
    if (content.includes('#[test]') || content.includes('#[cfg(test)]')) {
      return { framework: 'cargo', command: 'cargo test' };
    }
  } catch {
    // File not readable
  }

  // Fallback based on extension
  if (filePath.endsWith('.py')) {
    return { framework: 'pytest', command: 'pytest' };
  }
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js')) {
    return { framework: 'npm', command: 'npm test' };
  }
  if (filePath.endsWith('.go')) {
    return { framework: 'go', command: 'go test ./...' };
  }
  if (filePath.endsWith('.rs')) {
    return { framework: 'cargo', command: 'cargo test' };
  }

  return { framework: 'unknown', command: 'make test' };
}

/**
 * Check if enough time has passed since last reminder
 */
function shouldRemind(lastReminder) {
  if (!lastReminder) return true;

  const now = Date.now();
  const lastTime = new Date(lastReminder).getTime();
  const minutesSince = (now - lastTime) / 1000 / 60;

  // Remind every 15 minutes
  return minutesSince >= 15;
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

    // Only check Write and Edit tools
    if (data.tool !== 'Write' && data.tool !== 'Edit') {
      process.exit(0);
      return;
    }

    const filePath = data.parameters?.file_path || '';

    // Only track source files
    if (!SOURCE_PATTERNS.test(filePath)) {
      process.exit(0);
      return;
    }

    // Load state
    const state = loadState();

    // Add file to modified list
    if (!state.modifiedFiles.includes(filePath)) {
      state.modifiedFiles.push(filePath);
    }

    // Check if we should remind
    if (!shouldRemind(state.lastReminder)) {
      process.exit(0);
      return;
    }

    // Update reminder time
    state.lastReminder = new Date().toISOString();
    saveState(state);

    // Detect test framework
    const testInfo = detectTestFramework(filePath);

    // Build reminder message
    const reminderMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 TEST REMINDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Modified ${state.modifiedFiles.length} source file(s).

Consider running tests:
  ${testInfo.command}

Modified files:
${state.modifiedFiles.slice(-5).map(f => `  - ${f}`).join('\n')}

To disable: export SKIP_TEST_REMINDER=1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    // Check if user wants to skip
    if (process.env.SKIP_TEST_REMINDER !== '1') {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: reminderMessage,
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
