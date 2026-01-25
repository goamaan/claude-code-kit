#!/usr/bin/env node
/**
 * git-branch-check - PreToolUse Hook
 *
 * Warns when attempting to commit or push to main/master branches.
 * Helps prevent accidental commits to protected branches.
 *
 * Hook type: PreToolUse
 * Triggers: Before Bash tool executes git commands
 */

import { execSync } from 'child_process';

/**
 * Protected branch names
 */
const PROTECTED_BRANCHES = ['main', 'master', 'production', 'prod'];

/**
 * Get current git branch
 */
function getCurrentBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return branch.trim();
  } catch {
    return null;
  }
}

/**
 * Check if command affects git branch
 */
function isDangerousGitCommand(command) {
  return (
    command.includes('git commit') ||
    command.includes('git push') ||
    command.includes('git merge') ||
    command.includes('git rebase')
  );
}

/**
 * Check if command has force flag
 */
function hasForceFlag(command) {
  return command.includes('--force') || command.includes('-f');
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

    // Only check Bash tool
    if (data.tool !== 'Bash') {
      process.exit(0);
      return;
    }

    const command = data.parameters?.command || '';

    // Only check dangerous git commands
    if (!isDangerousGitCommand(command)) {
      process.exit(0);
      return;
    }

    const currentBranch = getCurrentBranch();

    if (!currentBranch) {
      process.exit(0);
      return;
    }

    // Check if on protected branch
    if (PROTECTED_BRANCHES.includes(currentBranch)) {
      const isForce = hasForceFlag(command);
      const severity = isForce ? '🚨 CRITICAL' : '⚠️  WARNING';

      const warningMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${severity}: Protected Branch Operation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current branch: ${currentBranch}
Command: ${command.slice(0, 60)}${command.length > 60 ? '...' : ''}

This branch is protected. Consider:
  1. Create a feature branch: git checkout -b feature/my-change
  2. Make changes on feature branch
  3. Create pull request for review

If you must proceed:
  - Ensure you have proper authorization
  - Review changes carefully: git diff --staged
  - Consider: git stash && git checkout -b temp-branch

To bypass: export SKIP_BRANCH_CHECK=1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

      // Check if user wants to skip
      if (process.env.SKIP_BRANCH_CHECK !== '1') {
        console.log(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            additionalContext: warningMessage,
          },
        }));
      }
    }

    process.exit(0);
  } catch {
    // On error, just continue without blocking
    process.exit(0);
  }
}

main();
