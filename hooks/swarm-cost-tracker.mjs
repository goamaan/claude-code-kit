/**
 * Swarm Cost Tracker Hook
 * Tracks per-agent costs when Task tool is used for orchestration
 *
 * @type {import('../src/types/hook.js').PostToolUseInput}
 * @event PostToolUse
 */

export default async function swarmCostTracker(event) {
  // Only track Task tool usage
  if (event?.tool_name !== 'Task') {
    return undefined;
  }

  const input = event?.tool_input || {};
  const success = event?.success ?? false;
  const duration = event?.duration_ms || 0;

  // Extract agent info
  const agentType = input.subagent_type || 'unknown';
  const model = input.model || 'unknown';
  const description = input.description || '';

  // Build cost tracking entry
  const entry = {
    timestamp: new Date().toISOString(),
    event: 'agent_task',
    agentType,
    model,
    description,
    success,
    durationMs: duration,
  };

  // Append to session cost log (stderr for Claude Code)
  process.stderr.write(`[swarm-cost] ${JSON.stringify(entry)}\n`);

  // Pass through - don't modify
  return undefined;
}
