#!/usr/bin/env node
/**
 * Keyword Detector Hook - UserPromptSubmit
 *
 * Detects keywords in user prompts and injects mode-specific context.
 * This enables automatic skill activation based on natural language patterns.
 *
 * Claude Code Hook Events:
 * - Reads JSON from stdin with { prompt, session_id, ... }
 * - Outputs JSON to stdout for additionalContext injection
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read input from stdin
let input;
try {
  const stdinData = readFileSync(0, 'utf8'); // fd 0 = stdin
  input = JSON.parse(stdinData);
} catch {
  // If no input or invalid JSON, exit cleanly
  process.exit(0);
}

const prompt = input.prompt || '';
const promptLower = prompt.toLowerCase();

// Remove code blocks to avoid false positives from code examples
const promptWithoutCode = promptLower.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '');

/**
 * Keyword patterns and their associated modes
 * Priority order: first match wins
 */
const KEYWORD_PATTERNS = [
  {
    name: 'ultrawork',
    patterns: [/\b(ultrawork|ulw|uw)\b/i],
    context: `[ULTRAWORK MODE ACTIVATED]

You are now in ULTRAWORK mode - maximum performance with parallel agent orchestration.

ULTRAWORK RULES:
1. PARALLEL EXECUTION: Spawn multiple agents simultaneously for independent work
2. AGGRESSIVE DELEGATION: Route ALL implementation to specialized agents immediately
3. BACKGROUND OPERATIONS: Use run_in_background=true for builds, tests, installs
4. PERSISTENCE: Continue until ALL tasks verified complete - no partial completion
5. SMART MODEL ROUTING: Use haiku for simple, sonnet for standard, opus for complex

CRITICAL: Always pass model parameter explicitly:
- Task(subagent_type="claudeops:executor", model="sonnet", prompt="...")
- Task(subagent_type="claudeops:architect", model="opus", prompt="...")

DO NOT stop until:
- All tasks marked complete
- Build passes
- Tests pass
- Architect verification passed`
  },
  {
    name: 'autopilot',
    patterns: [/\b(autopilot)\b/i, /\bbuild me\b/i, /\bI want a\b/i, /\bcreate a\b/i, /\bmake me a?\b/i],
    context: `[AUTOPILOT MODE ACTIVATED]

Full autonomous execution from idea to working code. 5-phase workflow:

PHASE 1 - DISCOVERY: Explore codebase, analyze requirements
PHASE 2 - PLANNING: Create architecture, break into parallel tasks
PHASE 3 - EXECUTION: Spawn parallel executor agents
PHASE 4 - VERIFICATION: Continuous testing and self-correction
PHASE 5 - COMPLETION: Architect approval required

RULES:
- Delegate ALL code changes to executor agents
- Use TaskCreate for every work item
- Run independent tasks in parallel
- Verify with architect before claiming complete

Start immediately with Phase 1 discovery.`
  },
  {
    name: 'planner',
    patterns: [/\bplan this\b/i, /\bplan the\b/i, /\bhow should I\b/i, /\bhelp me plan\b/i, /\bwhat's the best way\b/i],
    context: `[PLANNER MODE ACTIVATED]

Strategic planning with structured interview. Your workflow:

1. PRE-PLANNING (automatic):
   - Explore codebase structure and patterns
   - Find relevant code with Glob/Grep
   - Understand existing conventions

2. INTERVIEW (ask user):
   - Only ask PREFERENCE questions (approach A vs B?)
   - Never ask factual questions you can discover
   - Max 3-5 focused questions
   - Use AskUserQuestion tool for better UX

3. PLAN CREATION:
   - Break into parallelizable phases
   - Define dependencies between tasks
   - Include success criteria
   - Identify risks

Start by exploring the codebase, then interview the user.`
  },
  {
    name: 'analyze',
    patterns: [/\b(investigate|examine|debug|analyze|diagnose)\b/i],
    context: `[ANALYSIS MODE]

Deep analysis requested. Delegate to architect agent:

Task(subagent_type="claudeops:architect", model="opus",
     prompt="Perform deep analysis: [topic]. Investigate root causes, trace execution paths, provide evidence-based conclusions.")

Gather context with parallel explore agents first if needed.`
  },
  {
    name: 'search',
    patterns: [/\b(find|locate|search for|scan|look for|where is)\b/i],
    context: `[SEARCH MODE]

Codebase search requested. Use explore agent:

Task(subagent_type="claudeops:explore", model="haiku",
     prompt="Search codebase for: [target]. Check multiple patterns and locations.")

For comprehensive searches, spawn multiple explore agents in parallel with different search strategies.`
  }
];

// Check for keyword matches
let matchedMode = null;
let additionalContext = '';

for (const mode of KEYWORD_PATTERNS) {
  for (const pattern of mode.patterns) {
    if (pattern.test(promptWithoutCode)) {
      matchedMode = mode.name;
      additionalContext = mode.context;
      break;
    }
  }
  if (matchedMode) break;
}

// Output result
if (additionalContext) {
  const output = {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext
    }
  };
  console.log(JSON.stringify(output));
}

// Exit cleanly (exit code 0 = success, don't block)
process.exit(0);
