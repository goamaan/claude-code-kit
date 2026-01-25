#!/usr/bin/env node
/**
 * Claude Code Hook: UserPromptSubmit
 * Classifies user intent and provides context to Claude with matched skills
 */

import { readFileSync } from 'fs';
import { join } from 'path';
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

// Exit early if no prompt
if (!prompt.trim()) {
  process.exit(0);
}

/**
 * Main hook handler
 */
async function main() {
  try {
    // Get package root and try to import claudeops
    // From scripts/hooks/classify-intent.js -> go up 2 levels to package root
    const packageRoot = join(__dirname, '..', '..');
    const modulePath = join(packageRoot, 'dist', 'index.mjs');

    let claudeops;
    try {
      claudeops = await import(modulePath);
    } catch {
      // claudeops not available, exit cleanly
      console.error('[Hook] claudeops not available (package not built). Skipping classification.');
      process.exit(0);
    }

    // Extract needed functions
    const { createClassifier, formatClassificationContext, createSkillManager, routeIntent, saveSessionState } = claudeops;

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[Hook] ANTHROPIC_API_KEY not set, using fallback rule-based classifier');
    }

    // Create classifier and classify intent
    const intentClassifier = createClassifier({ apiKey });
    const classification = await intentClassifier.classify(prompt);

    console.error(`[Hook] Intent: ${classification.type}, Complexity: ${classification.complexity}`);

    // Format classification context
    const classificationContext = formatClassificationContext(classification);

    // Get routing decision
    const routingDecision = routeIntent(classification);

    console.error(`[Hook] Routing: ${routingDecision.agents.length} agents, ${routingDecision.primaryModel} model, ${routingDecision.parallelism} strategy`);

    // Format routing guidance
    const routingGuidance = [
      '=== Routing Guidance ===',
      `Recommended: ${routingDecision.agents.length === 0 ? 'none (conversation)' : routingDecision.agents.map(a => a.name).join(', ')}`,
      `Model: ${routingDecision.primaryModel}`,
      `Strategy: ${routingDecision.parallelism}`,
      routingDecision.verification ? 'Verification: yes' : '',
      `Reasoning: ${routingDecision.reasoning}`,
    ].filter(Boolean).join('\n');

    // Create skill manager with correct builtin skills path
    // The builtin skills are in the package root's skills/ directory
    const builtinSkillsDir = join(packageRoot, 'skills');
    const skillManager = createSkillManager({ builtinSkillsDir });
    await skillManager.loadSkills();

    // Match skills based on classification
    const matches = skillManager.matchByClassification(classification);

    console.error(`[Hook] Matched ${matches.length} skills by classification`);

    // Extract just the skills from matches
    const matchedSkills = matches.map(m => m.skill);

    // Format skill context
    const { context: skillContext, skills: includedSkills } =
      skillManager.formatSkillContext(matchedSkills, 8000);

    if (includedSkills.length > 0) {
      console.error(`[Hook] Included skills: ${includedSkills.join(', ')}`);
    }

    // Save session state after classification and routing
    saveSessionState({
      timestamp: new Date().toISOString(),
      prompt,
      classification,
      routing: {
        agents: routingDecision.agents.map(a => a.name),
        model: routingDecision.primaryModel,
        strategy: routingDecision.parallelism,
        skills: includedSkills,
        verification: routingDecision.verification,
      },
    });

    console.error('[Hook] Session state saved to .claudeops/state/session.json');

    // Combine classification, routing, and skill context
    const combinedContext = [
      '=== Intent Classification ===',
      classificationContext,
      '',
      routingGuidance,
      '',
      skillContext,
    ].join('\n');

    // Output via hookSpecificOutput.additionalContext
    const output = {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: combinedContext,
      },
    };

    console.log(JSON.stringify(output));
    process.exit(0);
  } catch (error) {
    console.error(`[Hook] Classification failed: ${error.message}`);
    // Don't block on classification failure
    process.exit(0);
  }
}

main();
