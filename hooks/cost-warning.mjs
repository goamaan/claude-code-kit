#!/usr/bin/env node
/**
 * Hook: cost-warning
 * Event: UserPromptSubmit
 * Description: Warns when approaching daily cost budget based on token usage
 * Matcher: *
 * Enabled: false
 *
 * cost-warning - UserPromptSubmit Hook
 *
 * Warns when approaching daily cost budget based on token usage.
 * Tracks cumulative costs and provides spending alerts.
 *
 * Hook type: UserPromptSubmit
 * Triggers: Before each user prompt is processed
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Cost per million tokens (approximate as of Jan 2025)
 */
const COST_PER_MILLION = {
  'claude-opus-4-5': { input: 15.0, output: 75.0 },
  'claude-sonnet-4-5': { input: 3.0, output: 15.0 },
  'claude-haiku-4': { input: 0.8, output: 4.0 },
};

/**
 * Get cost tracking file path
 */
function getCostFilePath() {
  const stateDir = join(homedir(), '.claudeops', 'state');
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  return join(stateDir, 'daily-costs.json');
}

/**
 * Load today's costs
 */
function loadTodayCosts() {
  const filePath = getCostFilePath();
  const today = new Date().toISOString().split('T')[0];

  if (!existsSync(filePath)) {
    return { date: today, totalCost: 0, sessions: [] };
  }

  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    // Reset if new day
    if (data.date !== today) {
      return { date: today, totalCost: 0, sessions: [] };
    }
    return data;
  } catch {
    return { date: today, totalCost: 0, sessions: [] };
  }
}

/**
 * Save updated costs
 */
function saveCosts(costs) {
  const filePath = getCostFilePath();
  writeFileSync(filePath, JSON.stringify(costs, null, 2), 'utf8');
}

/**
 * Estimate cost from token usage
 */
function estimateCost(inputTokens, outputTokens, model) {
  const modelKey = model.includes('opus') ? 'claude-opus-4-5'
    : model.includes('sonnet') ? 'claude-sonnet-4-5'
    : 'claude-haiku-4';

  const rates = COST_PER_MILLION[modelKey];
  const inputCost = (inputTokens / 1_000_000) * rates.input;
  const outputCost = (outputTokens / 1_000_000) * rates.output;

  return inputCost + outputCost;
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

    // Get current session stats
    const inputTokens = data.stats?.input_tokens || 0;
    const outputTokens = data.stats?.output_tokens || 0;
    const model = data.model || 'claude-sonnet-4-5';

    // Calculate session cost
    const sessionCost = estimateCost(inputTokens, outputTokens, model);

    // Load daily costs
    const costs = loadTodayCosts();
    costs.totalCost += sessionCost;
    costs.sessions.push({
      timestamp: new Date().toISOString(),
      cost: sessionCost,
      inputTokens,
      outputTokens,
      model,
    });

    // Save updated costs
    saveCosts(costs);

    // Warning thresholds
    const DAILY_BUDGET = parseFloat(process.env.CLAUDE_DAILY_BUDGET || '50.0');
    const WARNING_THRESHOLD = DAILY_BUDGET * 0.8;
    const CRITICAL_THRESHOLD = DAILY_BUDGET * 0.95;

    // Check thresholds and warn
    let warningMessage = null;

    if (costs.totalCost >= CRITICAL_THRESHOLD) {
      warningMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CRITICAL: Daily budget almost reached!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current spend: $${costs.totalCost.toFixed(2)} / $${DAILY_BUDGET.toFixed(2)}
Usage: ${((costs.totalCost / DAILY_BUDGET) * 100).toFixed(1)}%

Consider:
  - Switching to lower-tier models (sonnet/haiku)
  - Reducing context size
  - Breaking work into smaller sessions

Set custom budget: export CLAUDE_DAILY_BUDGET=100.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    } else if (costs.totalCost >= WARNING_THRESHOLD) {
      warningMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Daily budget warning
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current spend: $${costs.totalCost.toFixed(2)} / $${DAILY_BUDGET.toFixed(2)}
Usage: ${((costs.totalCost / DAILY_BUDGET) * 100).toFixed(1)}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }

    if (warningMessage) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: warningMessage,
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
