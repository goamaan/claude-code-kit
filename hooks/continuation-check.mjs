#!/usr/bin/env node
/**
 * Continuation Check Hook - Stop
 *
 * Evaluates whether Claude should stop or continue working.
 * Checks for pending tasks, incomplete work, and verification status.
 *
 * Claude Code Hook Events:
 * - Runs when Claude is about to stop responding
 * - Can block stoppage by returning decision: "block" with a reason
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Read input from stdin
let input;
try {
  const stdinData = readFileSync(0, 'utf8');
  input = JSON.parse(stdinData);
} catch {
  process.exit(0);
}

// Check if stop hook is already active to prevent infinite loops
if (input.stop_hook_active) {
  // Already in continuation mode, allow stop
  process.exit(0);
}

const cwd = input.cwd || process.cwd();

/**
 * Check for pending tasks in the task list
 * Returns array of incomplete task subjects
 */
function checkPendingTasks() {
  // Look for task files in common locations
  const taskDirs = [
    join(process.env.HOME, '.claude', 'tasks'),
    join(cwd, '.claude', 'tasks')
  ];

  const pendingTasks = [];

  for (const dir of taskDirs) {
    if (!existsSync(dir)) continue;

    try {
      const files = execSync(`find "${dir}" -name "*.json" -type f 2>/dev/null || true`, {
        encoding: 'utf8',
        timeout: 5000
      }).trim().split('\n').filter(Boolean);

      for (const file of files.slice(0, 10)) { // Limit to prevent slowdown
        try {
          const content = JSON.parse(readFileSync(file, 'utf8'));
          if (content.status === 'pending' || content.status === 'in_progress') {
            pendingTasks.push(content.subject || 'Unknown task');
          }
        } catch {
          // Skip invalid files
        }
      }
    } catch {
      // Skip if find fails
    }
  }

  return pendingTasks;
}

/**
 * Check if there are uncommitted changes
 */
function _hasUncommittedChanges() {
  try {
    const status = execSync('git status --porcelain 2>/dev/null || true', {
      encoding: 'utf8',
      cwd,
      timeout: 5000
    }).trim();
    return status.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check for build/test failures in recent output
 */
function _checkForFailures() {
  // This is a heuristic - in practice, would check actual test/build status
  try {
    // Check if package.json exists and has test script
    const pkgPath = join(cwd, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (pkg.scripts?.test || pkg.scripts?.build) {
        // Could run quick check here, but for now just return false
        // to avoid blocking on every stop
      }
    }
  } catch {
    // Ignore errors
  }
  return false;
}

// Evaluate completion status
const pendingTasks = checkPendingTasks();
// Future: Could also check uncommitted changes and failures
// const hasChanges = hasUncommittedChanges();
// const hasFailures = checkForFailures();

// Build blocking reasons
const blockReasons = [];

if (pendingTasks.length > 0) {
  blockReasons.push(`Pending tasks: ${pendingTasks.slice(0, 3).join(', ')}${pendingTasks.length > 3 ? ` (+${pendingTasks.length - 3} more)` : ''}`);
}

// Only block if there are explicit pending tasks
// Don't block just for uncommitted changes as that's normal
if (blockReasons.length > 0) {
  const output = {
    decision: 'block',
    reason: `Work incomplete. ${blockReasons.join('. ')}. Please complete pending tasks before stopping, or explicitly mark them as complete if they are done.`
  };
  console.log(JSON.stringify(output));
  process.exit(0);
}

// Allow stop
process.exit(0);
