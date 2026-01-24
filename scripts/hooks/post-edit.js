#!/usr/bin/env node
/**
 * Claude Code Hook: PostToolUse (for Edit/Write)
 * Post-edit checks for secrets and code quality warnings
 */

import {
  readStdin,
  parseHookInput,
  logWarning,
  logInfo,
  getPackageRoot,
  tryImport,
  exit,
} from './lib/utils.js';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

/**
 * Main hook handler
 */
async function main() {
  try {
    // Read tool info from stdin
    const input = await readStdin();
    const hookData = parseHookInput(input);

    if (!hookData) {
      logWarning('Failed to parse hook input');
      exit(0);
      return;
    }

    const { tool_name: toolName, tool_input: toolInput } = hookData;

    // Only run for Edit/Write tools
    if (toolName !== 'Edit' && toolName !== 'Write') {
      exit(0);
      return;
    }

    const filePath = toolInput.file_path;

    if (!filePath) {
      exit(0);
      return;
    }

    logInfo(`Post-edit check for: ${filePath}`);

    // Get package root and try to import guardrails
    const packageRoot = await getPackageRoot();
    const modulePath = join(packageRoot, 'dist', 'index.mjs');

    const guardrails = await tryImport(modulePath);

    if (!guardrails) {
      logWarning('claudeops not available. Skipping post-edit checks.');
      exit(0);
      return;
    }

    // Read the file that was just edited
    if (!existsSync(filePath)) {
      logWarning(`File not found: ${filePath}`);
      exit(0);
      return;
    }

    const fileContent = readFileSync(filePath, 'utf8');

    // Scan for secrets
    const { scanForSecrets } = guardrails;
    const secretCheck = scanForSecrets(fileContent);

    if (secretCheck.hasSecrets) {
      logWarning('WARNING: Potential secrets detected in edited file!');
      logWarning(`File: ${filePath}`);
      logWarning(`Found ${secretCheck.matches.length} potential secret(s):`);

      for (const match of secretCheck.matches) {
        logWarning(`  - ${match.type} (confidence: ${match.confidence || 'unknown'})`);
        if (match.line) {
          logWarning(`    Location: line ${match.line}${match.column ? `, column ${match.column}` : ''}`);
        }
      }

      logWarning('Please review these potential secrets before committing.');
    }

    // Check for console.log in JS/TS files
    if (filePath.match(/\.(js|jsx|ts|tsx|mjs|cjs)$/)) {
      checkForConsoleLog(filePath, fileContent);
    }

    exit(0);
  } catch (error) {
    logWarning(`Post-edit check failed: ${error.message}`);
    // Don't block on post-edit check failure
    exit(0);
  }
}

/**
 * Check for console.log statements
 */
function checkForConsoleLog(filePath, content) {
  const lines = content.split('\n');
  const consoleLogLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Simple check for console.log (not in comments)
    if (line.includes('console.log') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      consoleLogLines.push(i + 1);
    }
  }

  if (consoleLogLines.length > 0) {
    logWarning(`Found ${consoleLogLines.length} console.log statement(s) in ${filePath}`);
    logWarning(`Lines: ${consoleLogLines.join(', ')}`);
    logWarning('Consider removing console.log statements before committing.');
  }
}

main();
