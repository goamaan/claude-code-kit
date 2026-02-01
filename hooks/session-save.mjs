#!/usr/bin/env node
/**
 * Hook: session-save
 * Event: Stop
 * Description: Saves session state for cross-session context restoration
 * Matcher: *
 * Enabled: true
 *
 * session-save - Stop Hook
 *
 * On session end, saves key session state (branch, modified files,
 * summary, pending TODOs) to .claude/session-state.json for
 * restoration in the next session.
 *
 * Hook type: Stop
 * Triggers: Before session ends
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

/**
 * Get current git branch
 */
function getCurrentBranch(cwd) {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', {
      encoding: 'utf8',
      cwd,
      timeout: 5000,
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Get modified files from git
 */
function getModifiedFiles(cwd) {
  try {
    const status = execSync('git diff --name-only HEAD 2>/dev/null', {
      encoding: 'utf8',
      cwd,
      timeout: 5000,
    }).trim();
    return status ? status.split('\n').filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Main hook function
 */
async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const data = JSON.parse(input);
    const cwd = data.cwd || process.cwd();

    // Gather session state
    const branch = getCurrentBranch(cwd);
    const modifiedFiles = getModifiedFiles(cwd);
    const stats = data.stats || {};

    const sessionState = {
      lastSession: new Date().toISOString(),
      branch,
      modifiedFiles: modifiedFiles.slice(0, 20),
      stats: {
        duration: stats.duration,
        toolsUsed: stats.tools_used || 0,
        tokensUsed: (stats.input_tokens || 0) + (stats.output_tokens || 0),
      },
      stopReason: data.reason || 'unknown',
    };

    // Write session state
    const claudeDir = join(cwd, '.claude');
    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true });
    }

    const statePath = join(claudeDir, 'session-state.json');
    writeFileSync(statePath, JSON.stringify(sessionState, null, 2), 'utf8');

    // Non-blocking — just save and exit
    process.exit(0);
  } catch {
    // Don't block session end on errors
    process.exit(0);
  }
}

main();
