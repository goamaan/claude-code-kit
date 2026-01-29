/**
 * Team Lifecycle Hook
 * Logs team creation and shutdown events for native Claude Code Teams
 *
 * @type {import('../src/types/hook.js').SubagentStopInput}
 * @event SubagentStop
 */

export default async function teamLifecycle(event) {
  // Only process team-related subagent events
  const agentType = event?.agent_type || '';
  const reason = event?.reason || 'unknown';
  const agentId = event?.agent_id || 'unknown';

  // Log team member lifecycle events
  if (agentType.includes('teammate') || agentType.includes('team')) {
    const stats = event?.stats || {};
    const duration = stats.duration_ms ? `${Math.round(stats.duration_ms / 1000)}s` : 'unknown';
    const tokens = stats.tokens_used || 0;
    const cost = stats.cost_usd ? `$${stats.cost_usd.toFixed(4)}` : 'unknown';

    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'team_member_stop',
      agentType,
      agentId,
      reason,
      duration,
      tokens,
      cost,
    };

    // Write to stderr (visible in Claude Code logs)
    process.stderr.write(`[team-lifecycle] ${JSON.stringify(logEntry)}\n`);
  }

  // Pass through - don't modify the event
  return undefined;
}
