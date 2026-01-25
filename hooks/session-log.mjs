#!/usr/bin/env node
/**
 * session-log - Stop Hook
 *
 * Logs session summary when Claude stops.
 * Tracks duration, tokens used, tools invoked, and outcomes.
 *
 * Hook type: Stop
 * Triggers: Before session/conversation ends
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Get session log directory
 */
function getLogDir() {
  const logDir = join(homedir(), '.claudeops', 'logs', 'sessions');
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

/**
 * Get session state file
 */
function getSessionStateFile() {
  const stateDir = join(homedir(), '.claudeops', 'state');
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  return join(stateDir, 'current-session.json');
}

/**
 * Load or initialize session state
 */
function loadSessionState() {
  const filePath = getSessionStateFile();

  if (!existsSync(filePath)) {
    const newSession = {
      sessionId: Date.now().toString(36),
      startTime: new Date().toISOString(),
      toolsUsed: [],
      filesModified: [],
      commandsRun: 0,
    };
    writeFileSync(filePath, JSON.stringify(newSession, null, 2), 'utf8');
    return newSession;
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return {
      sessionId: Date.now().toString(36),
      startTime: new Date().toISOString(),
      toolsUsed: [],
      filesModified: [],
      commandsRun: 0,
    };
  }
}

/**
 * Calculate session duration
 */
function calculateDuration(startTime) {
  const start = new Date(startTime).getTime();
  const end = Date.now();
  const durationMs = end - start;

  const hours = Math.floor(durationMs / 3600000);
  const minutes = Math.floor((durationMs % 3600000) / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Estimate cost from tokens
 */
function estimateCost(inputTokens, outputTokens, model) {
  const rates = model.includes('opus')
    ? { input: 15, output: 75 }
    : model.includes('sonnet')
    ? { input: 3, output: 15 }
    : { input: 0.8, output: 4 };

  const cost = (inputTokens / 1_000_000) * rates.input +
               (outputTokens / 1_000_000) * rates.output;

  return cost.toFixed(3);
}

/**
 * Generate session summary
 */
function generateSummary(sessionState, hookData) {
  const duration = calculateDuration(sessionState.startTime);
  const inputTokens = hookData.stats?.input_tokens || 0;
  const outputTokens = hookData.stats?.output_tokens || 0;
  const model = hookData.model || 'claude-sonnet-4-5';
  const cost = estimateCost(inputTokens, outputTokens, model);

  const toolCounts = {};
  for (const tool of sessionState.toolsUsed) {
    toolCounts[tool] = (toolCounts[tool] || 0) + 1;
  }

  const topTools = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tool, count]) => `${tool} (${count})`)
    .join(', ');

  return {
    sessionId: sessionState.sessionId,
    startTime: sessionState.startTime,
    endTime: new Date().toISOString(),
    duration,
    model,
    tokensIn: inputTokens,
    tokensOut: outputTokens,
    estimatedCost: `$${cost}`,
    toolsInvoked: sessionState.toolsUsed.length,
    uniqueTools: Object.keys(toolCounts).length,
    topTools,
    filesModified: sessionState.filesModified.length,
    commandsRun: sessionState.commandsRun,
  };
}

/**
 * Write session log
 */
function writeLog(summary) {
  const logDir = getLogDir();
  const date = new Date().toISOString().split('T')[0];
  const logFile = join(logDir, `${date}.jsonl`);

  // Append as JSONL
  appendFileSync(logFile, JSON.stringify(summary) + '\n', 'utf8');

  // Also write human-readable summary
  const summaryFile = join(logDir, `${summary.sessionId}.txt`);
  const summaryText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SESSION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Session ID: ${summary.sessionId}
Started:    ${summary.startTime}
Ended:      ${summary.endTime}
Duration:   ${summary.duration}

Model:      ${summary.model}
Tokens In:  ${summary.tokensIn.toLocaleString()}
Tokens Out: ${summary.tokensOut.toLocaleString()}
Est. Cost:  ${summary.estimatedCost}

Tools Used: ${summary.toolsInvoked} (${summary.uniqueTools} unique)
Top Tools:  ${summary.topTools}

Files Modified: ${summary.filesModified}
Commands Run:   ${summary.commandsRun}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  writeFileSync(summaryFile, summaryText, 'utf8');
}

/**
 * Clear session state
 */
function clearSessionState() {
  const filePath = getSessionStateFile();
  if (existsSync(filePath)) {
    try {
      // Don't delete, just archive
      const archived = readFileSync(filePath, 'utf8');
      const archiveDir = join(homedir(), '.claudeops', 'state', 'archive');
      if (!existsSync(archiveDir)) {
        mkdirSync(archiveDir, { recursive: true });
      }
      const archivePath = join(archiveDir, `session-${Date.now()}.json`);
      writeFileSync(archivePath, archived, 'utf8');
    } catch {
      // Ignore errors
    }
  }
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

    // Load session state
    const sessionState = loadSessionState();

    // Generate summary
    const summary = generateSummary(sessionState, data);

    // Write logs
    writeLog(summary);

    // Clear session state
    clearSessionState();

    // Display summary
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'Stop',
        additionalContext: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SESSION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Duration: ${summary.duration}
Tokens: ${summary.tokensIn.toLocaleString()} in / ${summary.tokensOut.toLocaleString()} out
Cost: ${summary.estimatedCost}
Tools: ${summary.toolsInvoked} invocations
Files: ${summary.filesModified} modified

Log saved to: ~/.claudeops/logs/sessions/${summary.sessionId}.txt
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
      },
    }));

    process.exit(0);
  } catch {
    // On error, just continue without blocking
    process.exit(0);
  }
}

main();
