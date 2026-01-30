#!/usr/bin/env node
/**
 * Hook: swarm-lifecycle
 * Event: SubagentStop
 * Description: Handles SubagentStop events for swarm task lifecycle management
 * Matcher: *
 * Enabled: true
 *
 * swarm-lifecycle - SubagentStop Hook
 *
 * Handles SubagentStop events for swarm task lifecycle management.
 * Logs task completion, tracks parallel group progress, and provides status summaries.
 *
 * Hook type: SubagentStop
 * Triggers: When a subagent completes execution
 */

import { readFileSync } from 'fs';

// =============================================================================
// In-memory tracking for parallel group detection
// =============================================================================

/**
 * Track active parallel groups and their task completion
 * Key: groupId (derived from session or swarm context)
 * Value: { total: number, completed: string[], startTime: number }
 */
const parallelGroups = new Map();

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Log to stderr to avoid interfering with agent output
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Message to log
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  const prefix = `[swarm-lifecycle][${level.toUpperCase()}]`;
  console.error(`${timestamp} ${prefix} ${message}`);
}

/**
 * Format duration in human-readable form
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format cost in USD
 * @param {number} cost - Cost in USD
 * @returns {string} - Formatted cost
 */
function formatCost(cost) {
  if (cost === undefined || cost === null) return 'N/A';
  return `$${cost.toFixed(4)}`;
}

/**
 * Extract task ID from agent context or metadata
 * @param {object} input - Hook input
 * @returns {string|null} - Task ID if found
 */
function extractTaskId(input) {
  // Check agent_id first (may contain task reference)
  if (input.agent_id) {
    // Agent ID might be formatted as "task-{taskId}" or contain task reference
    const taskMatch = input.agent_id.match(/task[_-]?(\w+)/i);
    if (taskMatch) return taskMatch[1];
    return input.agent_id;
  }
  return null;
}

/**
 * Extract parallel group ID from session context
 * @param {object} input - Hook input
 * @returns {string} - Group ID
 */
function extractGroupId(input) {
  // Use session_id as the group identifier
  // In a real swarm, tasks spawned together share the same parent session
  return input.session_id || 'default';
}

// =============================================================================
// Main Hook Handler
// =============================================================================

/**
 * Process SubagentStop event for swarm lifecycle management
 * @param {object} input - Hook input from Claude Code
 */
async function handleSubagentStop(input) {
  const {
    agent_type,
    agent_id,
    reason,
    message,
    stats,
    session_id: _session_id,
    timestamp: _timestamp,
  } = input;

  // Extract identifiers
  const taskId = extractTaskId(input);
  const groupId = extractGroupId(input);

  // Log task completion
  const agentDisplay = agent_type || 'unknown';
  const taskDisplay = taskId || agent_id || 'anonymous';
  const duration = stats?.duration_ms ? formatDuration(stats.duration_ms) : 'N/A';
  const cost = formatCost(stats?.cost_usd);

  // Build status line
  let statusIcon;
  switch (reason) {
    case 'complete':
      statusIcon = '[DONE]';
      break;
    case 'error':
      statusIcon = '[FAIL]';
      break;
    case 'timeout':
      statusIcon = '[TIMEOUT]';
      break;
    case 'budget_exceeded':
      statusIcon = '[BUDGET]';
      break;
    case 'user_cancel':
      statusIcon = '[CANCEL]';
      break;
    default:
      statusIcon = '[STOP]';
  }

  // Log completion summary
  log('info', `${statusIcon} Agent: ${agentDisplay} | Task: ${taskDisplay} | Duration: ${duration} | Cost: ${cost}`);

  // Log additional stats if available
  if (stats) {
    const toolsUsed = stats.tools_used ?? 0;
    const tokensUsed = stats.tokens_used ?? 0;
    if (toolsUsed > 0 || tokensUsed > 0) {
      log('info', `       Tools: ${toolsUsed} | Tokens: ${tokensUsed}`);
    }
  }

  // Log error details if task failed
  if (reason === 'error' && input.error) {
    log('error', `       Error: ${input.error.code} - ${input.error.message}`);
  }

  // Track parallel group completion
  if (groupId !== 'default') {
    if (!parallelGroups.has(groupId)) {
      parallelGroups.set(groupId, {
        total: 0,
        completed: [],
        failed: [],
        startTime: Date.now(),
      });
    }

    const group = parallelGroups.get(groupId);
    group.total++;

    if (reason === 'complete') {
      group.completed.push(taskDisplay);
    } else {
      group.failed.push(taskDisplay);
    }

    // Log group progress
    const completedCount = group.completed.length;
    const failedCount = group.failed.length;
    const totalProcessed = completedCount + failedCount;

    log('info', `       Group ${groupId}: ${completedCount} completed, ${failedCount} failed (${totalProcessed} total)`);
  }

  // Provide brief summary message if available
  if (message && message.length > 0) {
    // Truncate long messages
    const truncated = message.length > 100 ? message.substring(0, 100) + '...' : message;
    log('info', `       Summary: ${truncated}`);
  }
}

// =============================================================================
// Hook Entry Point
// =============================================================================

// Read input from stdin
let input;
try {
  const stdinData = readFileSync(0, 'utf8');
  input = JSON.parse(stdinData);
} catch {
  // Silent exit if no valid input
  process.exit(0);
}

// Extract event type - Claude Code may pass it in different ways
const event = input.event || input.hook_event || 'SubagentStop';

// Only handle SubagentStop events
if (event !== 'SubagentStop') {
  process.exit(0);
}

// Process the event
try {
  await handleSubagentStop(input);

  // Output continue response
  const output = {
    continue: true,
  };
  console.log(JSON.stringify(output));
} catch (error) {
  // Log error but don't block execution
  log('error', `Hook error: ${error.message}`);
  console.log(JSON.stringify({ continue: true }));
}

process.exit(0);
