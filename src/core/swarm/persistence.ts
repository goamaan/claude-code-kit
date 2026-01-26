/**
 * Swarm Persistence - Save/load swarm state and execution history
 * Handles persistence of swarm state to disk for recovery and history tracking
 */

import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  exists,
  readDirWithTypes,
  readJsonSafe,
  writeJson,
  mkdir,
  remove,
  writeFile,
  move,
} from '@/utils/fs.js';
import { getGlobalConfigDir, resolvePath } from '@/utils/paths.js';
import {
  SwarmStateSchema,
  SwarmExecutionSchema,
  type SwarmState,
  type SwarmExecution,
  type TaskCostEntry,
} from '@/types/swarm.js';

// =============================================================================
// Constants
// =============================================================================

const SWARMS_DIR = 'swarms';
const STATE_FILE = 'state.json';
const HISTORY_FILE = 'history.json';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the swarm storage directory
 * @returns Path to ~/.claudeops/swarms/
 */
export function getSwarmStorageDir(): string {
  return join(getGlobalConfigDir(), SWARMS_DIR);
}

/**
 * Get the directory for a specific swarm
 * @param swarmName - Name of the swarm
 * @returns Path to ~/.claudeops/swarms/<swarmName>/
 */
function getSwarmDir(swarmName: string): string {
  return join(getSwarmStorageDir(), swarmName);
}

/**
 * Get the state file path for a swarm
 * @param swarmName - Name of the swarm
 * @returns Path to state.json
 */
function getStateFilePath(swarmName: string): string {
  return join(getSwarmDir(swarmName), STATE_FILE);
}

/**
 * Get the global history file path
 * @returns Path to ~/.claudeops/swarms/history.json
 */
function getHistoryFilePath(): string {
  return join(getSwarmStorageDir(), HISTORY_FILE);
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize persistence for a named swarm
 * Creates the swarm directory and empty state/history files
 *
 * @param swarmName - Name of the swarm to initialize
 */
export async function initPersistence(swarmName: string): Promise<void> {
  const swarmDir = getSwarmDir(swarmName);

  // Create the swarm directory
  await mkdir(swarmDir, { recursive: true });

  // Create empty state.json file
  const statePath = getStateFilePath(swarmName);
  if (!(await exists(statePath))) {
    await writeFile(statePath, '{}');
  }

  // Ensure global history file exists
  const historyPath = getHistoryFilePath();
  if (!(await exists(historyPath))) {
    await writeJson(historyPath, []);
  }
}

// =============================================================================
// State Management
// =============================================================================

/**
 * Save current swarm state to disk
 * Uses atomic write (write to temp file, then rename)
 *
 * @param state - The swarm state to save
 */
export async function saveSwarmState(state: SwarmState): Promise<void> {
  const swarmDir = getSwarmDir(state.name);
  const statePath = getStateFilePath(state.name);
  const tempPath = join(swarmDir, `state.${randomUUID()}.tmp`);

  // Ensure directory exists
  await mkdir(swarmDir, { recursive: true });

  // Write to temp file first
  await writeJson(tempPath, state);

  // Atomic rename
  await move(tempPath, statePath);
}

/**
 * Load swarm state from disk
 *
 * @param swarmName - Name of the swarm to load
 * @returns The swarm state, or null if not found
 */
export async function loadSwarmState(
  swarmName: string
): Promise<SwarmState | null> {
  const statePath = getStateFilePath(swarmName);

  // Read the state file
  const rawState = await readJsonSafe<unknown>(statePath);

  if (rawState === undefined) {
    return null;
  }

  // Handle empty object (from init)
  if (
    typeof rawState === 'object' &&
    rawState !== null &&
    Object.keys(rawState).length === 0
  ) {
    return null;
  }

  // Parse and validate with schema
  const result = SwarmStateSchema.safeParse(rawState);

  if (!result.success) {
    // Invalid state file, treat as not found
    return null;
  }

  return result.data;
}

/**
 * Delete the state file for a swarm
 *
 * @param swarmName - Name of the swarm
 */
export async function clearSwarmState(swarmName: string): Promise<void> {
  const statePath = getStateFilePath(swarmName);

  if (await exists(statePath)) {
    await remove(statePath);
  }
}

// =============================================================================
// Task Tracking
// =============================================================================

/**
 * Record a task completion with cost information
 * Updates the swarm state with completed task and cost data
 *
 * @param swarmName - Name of the swarm
 * @param taskId - ID of the completed task
 * @param cost - Cost entry for the task
 */
export async function recordTaskCompletion(
  swarmName: string,
  taskId: string,
  cost: TaskCostEntry
): Promise<void> {
  // Load current state
  const state = await loadSwarmState(swarmName);

  if (!state) {
    throw new Error(`Swarm state not found for: ${swarmName}`);
  }

  // Update completedTasks array if not already present
  if (!state.completedTasks.includes(taskId)) {
    state.completedTasks.push(taskId);
  }

  // Find and update the task's cost field
  const task = state.plan.tasks.find((t) => t.id === taskId);
  if (task) {
    task.cost = cost;
    task.status = 'completed';
    task.completedAt = new Date();
  }

  // Update total cost
  state.totalCost += cost.cost;

  // Save updated state
  await saveSwarmState(state);
}

// =============================================================================
// History Management
// =============================================================================

/**
 * Get all past swarm executions
 *
 * @returns Array of swarm execution records
 */
export async function getSwarmHistory(): Promise<SwarmExecution[]> {
  const historyPath = getHistoryFilePath();

  const rawHistory = await readJsonSafe<unknown[]>(historyPath);

  if (rawHistory === undefined) {
    return [];
  }

  // Parse and validate each entry
  const executions: SwarmExecution[] = [];

  for (const entry of rawHistory) {
    const result = SwarmExecutionSchema.safeParse(entry);
    if (result.success) {
      executions.push(result.data);
    }
  }

  return executions;
}

/**
 * Record a completed swarm execution to history
 * Converts SwarmState to SwarmExecution and appends to history
 *
 * @param state - The final swarm state to record
 */
export async function recordSwarmCompletion(state: SwarmState): Promise<void> {
  // Convert SwarmState to SwarmExecution
  const completedAt = state.completedAt ?? new Date();
  const startedAt = state.startedAt;
  const duration = completedAt.getTime() - startedAt.getTime();

  // Determine final status
  let status: SwarmExecution['status'];
  if (state.status === 'stopped') {
    status = 'stopped';
  } else if (state.failedTasks.length > 0) {
    status = 'failed';
  } else {
    status = 'completed';
  }

  const execution: SwarmExecution = {
    id: state.id,
    name: state.name,
    status,
    taskCount: state.plan.tasks.length,
    completedCount: state.completedTasks.length,
    totalCost: state.totalCost,
    duration,
    startedAt,
    completedAt,
  };

  // Load existing history
  const history = await getSwarmHistory();

  // Append new execution
  history.push(execution);

  // Write updated history
  const historyPath = getHistoryFilePath();
  await mkdir(getSwarmStorageDir(), { recursive: true });
  await writeJson(historyPath, history);

  // Delete the swarm's state file
  await clearSwarmState(state.name);
}

// =============================================================================
// Active Swarms
// =============================================================================

/**
 * List all swarms with active state files
 *
 * @returns Array of swarm names that have active state files
 */
export async function getActiveSwarms(): Promise<string[]> {
  const swarmsDir = getSwarmStorageDir();

  if (!(await exists(swarmsDir))) {
    return [];
  }

  const entries = await readDirWithTypes(swarmsDir);
  const activeSwarms: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const statePath = join(swarmsDir, entry.name, STATE_FILE);
    if (await exists(statePath)) {
      // Verify it's a valid state (not empty)
      const state = await loadSwarmState(entry.name);
      if (state !== null) {
        activeSwarms.push(entry.name);
      }
    }
  }

  return activeSwarms;
}

// =============================================================================
// Claude Settings Integration
// =============================================================================

/**
 * Set CLAUDE_CODE_TASK_LIST_ID in Claude settings
 * This allows Claude Code to associate tasks with a swarm
 *
 * @param swarmName - Name of the swarm to set as active
 */
export async function setTaskListId(swarmName: string): Promise<void> {
  const claudeSettingsPath = resolvePath('~/.claude/settings.json');

  // Read existing settings or create empty object
  const settings = (await readJsonSafe<Record<string, unknown>>(
    claudeSettingsPath
  )) ?? {};

  // Ensure env object exists
  if (!settings['env'] || typeof settings['env'] !== 'object') {
    settings['env'] = {};
  }

  // Set the task list ID
  (settings['env'] as Record<string, string>)['CLAUDE_CODE_TASK_LIST_ID'] = swarmName;

  // Write back
  await writeJson(claudeSettingsPath, settings);
}

/**
 * Clear CLAUDE_CODE_TASK_LIST_ID from Claude settings
 */
export async function clearTaskListId(): Promise<void> {
  const claudeSettingsPath = resolvePath('~/.claude/settings.json');

  const settings = await readJsonSafe<Record<string, unknown>>(
    claudeSettingsPath
  );

  if (!settings) {
    return;
  }

  // Remove the task list ID if env exists
  const env = settings['env'];
  if (env && typeof env === 'object') {
    delete (env as Record<string, string>)['CLAUDE_CODE_TASK_LIST_ID'];

    // Remove env object if empty
    if (Object.keys(env).length === 0) {
      delete settings['env'];
    }
  }

  // Write back
  await writeJson(claudeSettingsPath, settings);
}
