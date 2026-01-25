/**
 * Session state management for classification and routing tracking
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * Classification result structure
 */
export interface Classification {
  type: string;
  complexity: string;
  confidence: number;
  reasoning?: string;
  [key: string]: unknown;
}

/**
 * Routing decision structure
 */
export interface Routing {
  agent?: string;
  model?: string;
  skills?: string[];
  [key: string]: unknown;
}

/**
 * Session state structure
 */
export interface SessionState {
  timestamp: string;
  prompt: string;
  classification: Classification;
  routing?: Routing;
}

/**
 * Get the state file path
 */
function getStateFilePath(): string {
  const stateDir = join(process.cwd(), '.claudeops', 'state');
  return join(stateDir, 'session.json');
}

/**
 * Ensure state directory exists
 */
function ensureStateDir(): void {
  const stateDir = join(process.cwd(), '.claudeops', 'state');
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
}

/**
 * Save session state to .claudeops/state/session.json
 */
export function saveSessionState(state: SessionState): void {
  ensureStateDir();
  const statePath = getStateFilePath();

  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Load current session state
 * Returns null if no state file exists
 */
export function loadSessionState(): SessionState | null {
  const statePath = getStateFilePath();

  if (!existsSync(statePath)) {
    return null;
  }

  try {
    const content = readFileSync(statePath, 'utf-8');
    return JSON.parse(content) as SessionState;
  } catch (error) {
    console.error('[State] Failed to load session state:', error);
    return null;
  }
}

/**
 * Clear the session state file
 */
export function clearSessionState(): void {
  const statePath = getStateFilePath();

  if (existsSync(statePath)) {
    unlinkSync(statePath);
  }
}
