#!/usr/bin/env node
/**
 * Hook: rule-suggester
 * Event: Stop
 * Description: Detects corrections during session and prompts CLAUDE.md rule updates
 * Matcher: *
 * Enabled: true
 *
 * rule-suggester - Stop Hook
 *
 * On session end, scans the session transcript for correction signals
 * (user correcting Claude's behavior). When detected with high confidence,
 * outputs additionalContext prompting Claude to append a rule to
 * .claude/CLAUDE.md under a ## Rules section.
 *
 * Hook type: Stop
 * Triggers: Before session ends (placed before session-save)
 */

/**
 * Patterns that indicate the user corrected Claude's behavior
 */
const CORRECTION_PATTERNS = [
  // Explicit prohibitions
  { pattern: /don'?t do that again/i, weight: 0.9 },
  { pattern: /never do\s+\w+/i, weight: 0.9 },
  { pattern: /always use\s+\w+/i, weight: 0.8 },
  { pattern: /stop doing\s+\w+/i, weight: 0.9 },

  // Corrections
  { pattern: /that'?s wrong/i, weight: 0.7 },
  { pattern: /actually[,.]?\s+you should/i, weight: 0.8 },
  { pattern: /no[,.]?\s+you should/i, weight: 0.8 },
  { pattern: /that'?s not how/i, weight: 0.7 },
  { pattern: /wrong approach/i, weight: 0.7 },
  { pattern: /incorrect/i, weight: 0.5 },

  // Rule requests
  { pattern: /remember to/i, weight: 0.7 },
  { pattern: /update (?:the )?rules/i, weight: 0.9 },
  { pattern: /add (?:a |this )?rule/i, weight: 0.9 },
  { pattern: /add (?:this |that )?to (?:the )?rules/i, weight: 0.9 },

  // Preference statements
  { pattern: /I prefer\s+\w+/i, weight: 0.6 },
  { pattern: /in this project,?\s+we/i, weight: 0.7 },
  { pattern: /our convention is/i, weight: 0.8 },
  { pattern: /we always\s+\w+/i, weight: 0.7 },
  { pattern: /we never\s+\w+/i, weight: 0.7 },
];

/**
 * Detect correction signals in session data
 */
function detectCorrections(data) {
  const message = (data.message || '').toLowerCase();
  const reason = (data.reason || '').toLowerCase();
  const transcript = (data.transcript || '').toLowerCase();
  const combinedText = `${message} ${reason} ${transcript}`;

  let totalWeight = 0;
  const matchedPatterns = [];

  for (const signal of CORRECTION_PATTERNS) {
    if (signal.pattern.test(combinedText)) {
      totalWeight += signal.weight;
      matchedPatterns.push(signal.pattern.source);
    }
  }

  return {
    detected: totalWeight >= 0.7,
    confidence: Math.min(totalWeight, 1.0),
    patterns: matchedPatterns,
  };
}

/**
 * Generate the rule suggestion prompt
 */
function generateRulePrompt(correction) {
  const date = new Date().toISOString().split('T')[0];

  return `
<rule_suggestion>
The user corrected a behavior during this session (confidence: ${correction.confidence.toFixed(2)}).
Detected signals: ${correction.patterns.join(', ')}

Before stopping, please:

1. Identify the specific correction or preference the user expressed
2. Open \`.claude/CLAUDE.md\` (create if it doesn't exist)
3. Find or create a \`## Rules\` section
4. Append a rule in this format:

\`\`\`
- DO NOT [the mistake]. Instead, [the correct approach]. (learned ${date})
\`\`\`

Or for preferences:
\`\`\`
- ALWAYS [the preferred behavior]. (learned ${date})
\`\`\`

Keep rules concise and actionable. One rule per correction.
</rule_suggestion>
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
    const correction = detectCorrections(data);

    if (!correction.detected) {
      // No corrections detected, allow stop
      process.exit(0);
    }

    // Output rule suggestion prompt
    const prompt = generateRulePrompt(correction);

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
