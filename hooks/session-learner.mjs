#!/usr/bin/env node
/**
 * Hook: session-learner
 * Event: Stop
 * Description: Captures learnings from resolved problems in Claude Code sessions
 * Matcher: *
 * Enabled: true
 *
 * session-learner - Stop Hook
 *
 * On session end, analyzes the session context for resolved problems
 * (error messages that disappeared, fix cycles, build/test failures resolved).
 * When high-confidence resolutions are detected, outputs a learning capture
 * prompt as additionalContext asking Claude to write the learning file.
 *
 * Hook type: Stop
 * Triggers: Before session ends
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Patterns that indicate a problem was resolved during the session
 */
const RESOLUTION_SIGNALS = [
  // Error → fix patterns
  { pattern: /error.*fixed|fix.*error|resolved.*issue/i, weight: 0.8 },
  { pattern: /test.*pass|passing.*test|green.*test/i, weight: 0.7 },
  { pattern: /build.*succeed|build.*success|compilation.*clean/i, weight: 0.7 },
  // Multiple attempts
  { pattern: /try.*again|another.*approach|different.*strategy/i, weight: 0.5 },
  // Debugging
  { pattern: /root.*cause|found.*the.*problem|issue.*was/i, weight: 0.9 },
  { pattern: /workaround|work.*around/i, weight: 0.6 },
];

/**
 * Detect if the session involved resolving non-trivial problems
 */
function detectResolutions(data) {
  const message = (data.message || '').toLowerCase();
  const reason = (data.reason || '').toLowerCase();
  const combinedText = `${message} ${reason}`;

  let totalWeight = 0;
  const signals = [];

  for (const signal of RESOLUTION_SIGNALS) {
    if (signal.pattern.test(combinedText)) {
      totalWeight += signal.weight;
      signals.push(signal.pattern.source);
    }
  }

  // Check stats for indicators of complex work
  const stats = data.stats || {};
  const toolsUsed = stats.tools_used || 0;
  const tokensUsed = (stats.input_tokens || 0) + (stats.output_tokens || 0);

  // Long sessions with many tool uses suggest problem solving
  if (toolsUsed > 20) totalWeight += 0.3;
  if (tokensUsed > 50000) totalWeight += 0.2;

  return {
    detected: totalWeight >= 0.6,
    confidence: Math.min(totalWeight, 1.0),
    signals,
  };
}

/**
 * Generate the learning capture prompt
 */
function generateCapturePrompt(data, resolution) {
  const cwd = data.cwd || process.cwd();
  const learningsDir = join(cwd, '.claude', 'learnings');
  const date = new Date().toISOString().split('T')[0];

  return `
<learning_capture>
A non-trivial problem was resolved in this session (confidence: ${resolution.confidence.toFixed(2)}).

Before stopping, please capture the key learning by creating a file in ${learningsDir}/.

Use this format:
\`\`\`markdown
---
date: ${new Date().toISOString()}
category: [build-error|test-failure|type-error|runtime-error|config-issue|pattern|workaround|convention]
component: [the technology/framework involved]
symptoms:
  - "[the error message or symptom that appeared]"
root_cause: [brief identifier like "missing-dependency" or "type-mismatch"]
resolution: [code-fix|config-change|dependency-update|workaround|refactor|documentation]
tags: [relevant, searchable, tags]
confidence: ${resolution.confidence.toFixed(1)}
---

## Problem
[What went wrong — include error messages if applicable]

## Solution
[What fixed it — include code snippets if helpful]

## Why
[Root cause explanation]
\`\`\`

Place the file in the appropriate category subdirectory (e.g., build-errors/, test-failures/, patterns/).
File name format: \`<brief-slug>-${date}.md\`
</learning_capture>
`;
}

/**
 * Main hook function
 */
async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const data = JSON.parse(input);
    const resolution = detectResolutions(data);

    if (!resolution.detected) {
      // No significant resolutions detected, allow stop
      process.exit(0);
    }

    // Ensure learnings directory exists
    const cwd = data.cwd || process.cwd();
    const learningsDir = join(cwd, '.claude', 'learnings');
    if (!existsSync(learningsDir)) {
      mkdirSync(learningsDir, { recursive: true });
    }

    // Output learning capture prompt
    const prompt = generateCapturePrompt(data, resolution);

    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'Stop',
        additionalContext: prompt,
      },
    }));

    process.exit(0);
  } catch {
    // On error, don't block session end
    process.exit(0);
  }
}

main();
