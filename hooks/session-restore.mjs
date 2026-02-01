#!/usr/bin/env node
/**
 * session-restore - UserPromptSubmit Hook
 *
 * On the first user message of a session, checks .claude/session-state.json
 * for recent session state and injects brief context about what was
 * happening in the previous session.
 *
 * Protocol: reads JSON from stdin, outputs context to stdout
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Check if this is the first prompt of the session
 * Uses a flag file to track
 */
function isFirstPrompt(cwd) {
  const flagPath = join(cwd, '.claude', '.session-restored');

  if (existsSync(flagPath)) {
    // Check if flag is from current process (within last 24 hours)
    try {
      const content = readFileSync(flagPath, 'utf8').trim();
      const flagTime = parseInt(content, 10);
      if (Date.now() - flagTime < 86400000) { // Within 24 hours
        return false; // Already restored this session
      }
    } catch {
      // Flag is corrupt, treat as first prompt
    }
  }

  // Write flag
  try {
    writeFileSync(flagPath, String(Date.now()), 'utf8');
  } catch {
    // Ignore write errors
  }

  return true;
}

/**
 * Load session state
 */
function loadSessionState(cwd) {
  const statePath = join(cwd, '.claude', 'session-state.json');
  if (!existsSync(statePath)) return null;

  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Check if session state is recent (within 48 hours)
 */
function isRecent(state) {
  if (!state?.lastSession) return false;

  const lastTime = new Date(state.lastSession).getTime();
  const hoursAgo = (Date.now() - lastTime) / 3600000;
  return hoursAgo < 48;
}

// Read input from stdin
let input;
try {
  const stdinData = readFileSync(0, 'utf8');
  input = JSON.parse(stdinData);
} catch {
  process.exit(0);
}

const cwd = input.cwd || process.cwd();

// Only inject on first prompt
if (!isFirstPrompt(cwd)) {
  process.exit(0);
}

// Load and check state
const state = loadSessionState(cwd);
if (!state || !isRecent(state)) {
  process.exit(0);
}

// Build context
const parts = [];

if (state.branch) {
  parts.push(`Branch: ${state.branch}`);
}

if (state.modifiedFiles?.length > 0) {
  const fileList = state.modifiedFiles.slice(0, 5).join(', ');
  const extra = state.modifiedFiles.length > 5 ? ` (+${state.modifiedFiles.length - 5} more)` : '';
  parts.push(`Modified files: ${fileList}${extra}`);
}

if (state.stopReason && state.stopReason !== 'unknown') {
  parts.push(`Previous session ended: ${state.stopReason}`);
}

if (parts.length === 0) {
  process.exit(0);
}

// Output context for Claude
const output = {
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: `<previous_session>\n${parts.join('\n')}\n</previous_session>`
  }
};
console.log(JSON.stringify(output));
process.exit(0);
