#!/usr/bin/env node
/**
 * Claude Code Hook: UserPromptSubmit
 * Classifies user intent and provides context to Claude
 */

import { readStdin, logWarning, logInfo, getPackageRoot, tryImport } from './lib/utils.js';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';

/**
 * Main hook handler
 */
async function main() {
  try {
    // Read user prompt from stdin
    const input = await readStdin();
    const userPrompt = input.trim();

    if (!userPrompt) {
      logWarning('No user prompt provided');
      process.exit(0);
    }

    logInfo('Classifying user intent...');

    // Get package root and try to import classifier
    const packageRoot = await getPackageRoot();
    const modulePath = join(packageRoot, 'dist', 'index.mjs');

    const claudeops = await tryImport(modulePath);

    if (!claudeops) {
      logWarning('claudeops not available (package not built). Skipping classification.');
      process.exit(0);
    }

    // Create classifier instance
    const { createClassifier, formatClassificationContext } = claudeops;

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logInfo('ANTHROPIC_API_KEY not set, using fallback rule-based classifier');
    }

    const intentClassifier = createClassifier({ apiKey });

    // Classify the intent
    const classification = await intentClassifier.classify(userPrompt);

    // Format context for Claude
    const context = formatClassificationContext(classification);

    // Output classification context to stdout for Claude to see
    console.log('\n=== Intent Classification ===');
    console.log(context);
    console.log('============================\n');

    // Write classification to temp file for other hooks to use
    const tempDir = join(tmpdir(), 'claudeops-hooks');
    mkdirSync(tempDir, { recursive: true });

    const classificationFile = join(tempDir, 'last-classification.json');
    writeFileSync(
      classificationFile,
      JSON.stringify(classification, null, 2),
      'utf8'
    );

    logInfo(`Classification saved to: ${classificationFile}`);
    logInfo(`Intent: ${classification.type}, Complexity: ${classification.complexity}`);

    if (classification.recommendation.agents.length > 0) {
      logInfo(`Recommended agents: ${classification.recommendation.agents.join(', ')}`);
    }

    process.exit(0);
  } catch (error) {
    logWarning(`Classification failed: ${error.message}`);
    // Don't block on classification failure
    process.exit(0);
  }
}

main();
