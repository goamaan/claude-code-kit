/**
 * Hook: session-restore
 * Event: UserPromptSubmit
 * Description: Restores context from previous session on first message
 * Matcher: *
 * Enabled: true
 *
 * session-restore - UserPromptSubmit Hook
 *
 * On the first user message of a session, checks .claude/session-state.json
 * for recent session state and injects brief context about what was
 * happening in the previous session.
 *
 * Hook type: UserPromptSubmit
 * Triggers: Before user prompt is submitted to Claude
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
    // Check if flag is from current process (within last 10 seconds)
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

/**
 * Main hook function
 */
export default async function sessionRestoreHook(context) {
  const { prompt } = context;

  if (!prompt || typeof prompt !== 'string') {
    return { decision: 'allow' };
  }

  const cwd = process.cwd();

  // Only inject on first prompt
  if (!isFirstPrompt(cwd)) {
    return { decision: 'allow' };
  }

  // Load and check state
  const state = loadSessionState(cwd);
  if (!state || !isRecent(state)) {
    return { decision: 'allow' };
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
    return { decision: 'allow' };
  }

  const injection = `\n\n<previous_session>\n${parts.join('\n')}\n</previous_session>`;

  return {
    decision: 'allow',
    modifiedPrompt: prompt + injection,
    metadata: {
      sessionRestored: true,
      lastSession: state.lastSession,
    },
  };
}
