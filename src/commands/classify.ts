/**
 * Classify command - Test intent classification and routing
 * cops classify "prompt"
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import { createClassifier } from '../core/classifier/index.js';
import { routeIntent } from '../core/router/index.js';
import { createSkillManager } from '../domain/skill/index.js';

const classifyCommand = defineCommand({
  meta: {
    name: 'classify',
    description: 'Test intent classification and routing for a prompt',
  },
  args: {
    prompt: {
      type: 'positional',
      description: 'Prompt to classify',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
    verbose: {
      type: 'boolean',
      alias: 'v',
      description: 'Show detailed classification',
      default: false,
    },
  },
  async run({ args }) {
    try {
      // Initialize classifier
      const classifier = createClassifier();

      // Classify the prompt
      const classification = await classifier.classify(args.prompt);

      // Route the intent
      const routing = routeIntent(classification);

      // Initialize skill manager and match skills
      const skillManager = createSkillManager();
      await skillManager.loadSkills();
      const skillMatches = skillManager.matchByClassification(classification);

      if (args.json) {
        // JSON output
        output.json({
          classification,
          routing,
          skills: skillMatches.map(m => ({
            name: m.skill.metadata.name,
            score: m.score,
            reason: m.matchReason,
          })),
        });
        return;
      }

      // Human-readable output
      output.header('Intent Classification');

      // Basic classification
      output.kv('Intent', classification.type);
      output.kv('Complexity', classification.complexity);
      output.kv('Confidence', `${Math.round(classification.confidence * 100)}%`);

      if (classification.domains.length > 0) {
        output.kv('Domains', classification.domains.join(', '));
      }

      // User signals
      const activeSignals = Object.entries(classification.signals)
        .filter(([, value]) => value)
        .map(([key]) => key.replace('wants', ''));

      if (activeSignals.length > 0) {
        output.kv('Signals', activeSignals.join(', '));
      }

      // Routing decision
      console.log();
      output.header('Routing Decision');

      if (routing.agents.length === 0) {
        output.info('No agents needed (conversation)');
      } else {
        output.kv('Agents', routing.agents.map(a => a.name).join(', '));
        output.kv('Primary Model', routing.primaryModel);
        output.kv('Execution', routing.parallelism);
        output.kv('Verification', routing.verification ? 'yes' : 'no');
      }

      // Matched skills
      if (skillMatches.length > 0) {
        console.log();
        output.header('Matched Skills');

        for (const match of skillMatches.slice(0, 5)) {
          const scorePercent = Math.round(match.score * 100);
          console.log(
            `  ${match.skill.metadata.name.padEnd(25)} ${scorePercent}% (${match.matchReason})`
          );
        }

        if (skillMatches.length > 5) {
          console.log(`  ... and ${skillMatches.length - 5} more`);
        }
      }

      // Verbose output
      if (args.verbose) {
        console.log();
        output.header('Reasoning');

        if (classification.reasoning) {
          console.log(classification.reasoning);
        }

        console.log();
        console.log('Routing:', routing.reasoning);

        // Show recommendation
        console.log();
        output.header('AI Recommendation');
        console.log('Agents:', classification.recommendation.agents.join(', ') || 'none');
        console.log('Model Tier:', classification.recommendation.modelTier);
        console.log('Parallelism:', classification.recommendation.parallelism);
        console.log('Verification:', classification.recommendation.verification ? 'yes' : 'no');
      }

      // Example command
      console.log();
      output.header('Example Usage');

      if (routing.agents.length > 0) {
        const primaryAgent = routing.agents[0]!;
        console.log(`Task(subagent_type="oh-my-claudecode:${primaryAgent.name}",`);
        console.log(`     model="${routing.primaryModel}",`);
        console.log(`     prompt="${args.prompt}")`);
      } else {
        console.log('Direct conversation - no delegation needed');
      }

    } catch (err) {
      output.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});

export default classifyCommand;
