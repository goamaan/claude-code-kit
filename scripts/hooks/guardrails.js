#!/usr/bin/env node
/**
 * Claude Code Hook: PreToolUse
 * Guardrails for dangerous commands and secret detection
 */

import {
  readStdin,
  parseHookInput,
  outputResult,
  logWarning,
  logError,
  logInfo,
  getPackageRoot,
  tryImport,
  exit,
} from './lib/utils.js';
import { join } from 'path';

/**
 * Main hook handler
 */
async function main() {
  try {
    // Read tool info from stdin
    const input = await readStdin();
    const hookData = parseHookInput(input);

    if (!hookData) {
      logError('Failed to parse hook input');
      exit(1, 'Invalid hook input');
      return;
    }

    const { tool_name: toolName, tool_input: toolInput } = hookData;

    logInfo(`Checking ${toolName} for guardrail violations...`);

    // Get package root and try to import guardrails
    const packageRoot = await getPackageRoot();
    const modulePath = join(packageRoot, 'dist', 'index.mjs');

    const guardrails = await tryImport(modulePath);

    if (!guardrails) {
      logWarning('claudeops not available (package not built). Skipping checks.');
      exit(0, 'Guardrails not available');
      return;
    }

    // Check based on tool type
    if (toolName === 'Bash') {
      await checkBashCommand(toolInput, guardrails);
    } else if (toolName === 'Edit' || toolName === 'Write') {
      await checkFileEdit(toolInput, guardrails);
    } else {
      // No guardrails for other tools
      exit(0);
    }
  } catch (error) {
    logError(`Guardrail check failed: ${error.message}`);
    exit(1, error.message);
  }
}

/**
 * Check Bash command for dangerous operations
 */
async function checkBashCommand(toolInput, guardrails) {
  const { checkDeletionCommand, checkDangerousCommand, scanCommandForSecrets } = guardrails;

  const command = toolInput.command;

  if (!command) {
    exit(0);
    return;
  }

  // Check for deletion commands
  const deletionCheck = checkDeletionCommand(command);
  if (!deletionCheck.allowed) {
    logError('BLOCKED: Dangerous deletion command detected!');
    logError(`Command: ${command}`);
    logError(`Reason: ${deletionCheck.reason}`);

    if (deletionCheck.suggestion) {
      logWarning(`Suggestion: ${deletionCheck.suggestion}`);
    }

    outputResult({
      blocked: true,
      reason: deletionCheck.reason,
      suggestion: deletionCheck.suggestion,
    });

    exit(2, 'Deletion command blocked');
    return;
  }

  // Check for dangerous commands
  const dangerCheck = checkDangerousCommand(command);
  if (dangerCheck.action !== 'allow') {
    if (dangerCheck.action === 'block') {
      logError('BLOCKED: Dangerous command detected!');
      logError(`Command: ${command}`);
      logError(`Reason: ${dangerCheck.reason}`);

      if (dangerCheck.suggestion) {
        logWarning(`Suggestion: ${dangerCheck.suggestion}`);
      }

      outputResult({
        blocked: true,
        reason: dangerCheck.reason,
        suggestion: dangerCheck.suggestion,
      });

      exit(2, 'Dangerous command blocked');
      return;
    } else {
      // Just warn
      logWarning('Warning: Potentially dangerous command');
      logWarning(`Command: ${command}`);
      logWarning(`Reason: ${dangerCheck.reason}`);

      if (dangerCheck.suggestion) {
        logWarning(`Suggestion: ${dangerCheck.suggestion}`);
      }

      // Allow but warn
      exit(0);
      return;
    }
  }

  // Check for secrets in command
  const secretCheck = scanCommandForSecrets(command);
  if (secretCheck.hasSecrets) {
    logError('BLOCKED: Secrets detected in command!');
    logError(`Found ${secretCheck.matches.length} potential secret(s)`);

    for (const match of secretCheck.matches) {
      logError(`- ${match.type} (confidence: ${match.confidence || 'unknown'})`);
    }

    outputResult({
      blocked: true,
      reason: 'Secrets detected in command',
      secrets: secretCheck.matches,
    });

    exit(2, 'Command contains secrets');
    return;
  }

  // All checks passed
  exit(0);
}

/**
 * Check file edit for secrets
 */
async function checkFileEdit(toolInput, guardrails) {
  const { scanForSecrets } = guardrails;

  const content = toolInput.content || toolInput.new_string || '';

  if (!content) {
    exit(0);
    return;
  }

  // Scan content for secrets
  const secretCheck = scanForSecrets(content);

  if (secretCheck.hasSecrets) {
    logError('BLOCKED: Secrets detected in file content!');
    logError(`Found ${secretCheck.matches.length} potential secret(s)`);

    for (const match of secretCheck.matches) {
      logError(`- ${match.type} (confidence: ${match.confidence || 'unknown'})`);
      if (match.line) {
        logError(`  Location: line ${match.line}${match.column ? `, column ${match.column}` : ''}`);
      }
    }

    outputResult({
      blocked: true,
      reason: 'Secrets detected in file content',
      secrets: secretCheck.matches,
    });

    exit(2, 'File content contains secrets');
    return;
  }

  // All checks passed
  exit(0);
}

main();
