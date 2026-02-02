#!/usr/bin/env node
/**
 * Hook: smart-approve
 * Event: PreToolUse
 * Description: Auto-approves safe commands, flags dangerous ones
 * Matcher: Bash
 * Enabled: true
 *
 * smart-approve - PreToolUse Hook
 *
 * Analyzes Bash commands before execution:
 * - Safe commands (read-only, git read, build/test): auto-approve
 * - Dangerous commands (rm -rf, force push, sudo, pipe-to-shell): flag with warning
 * - Everything else: pass through (no opinion)
 *
 * Hook type: PreToolUse
 * Triggers: Before Bash tool executes
 */

/**
 * Safe command patterns — auto-approve these
 */
const SAFE_PATTERNS = [
  // Read-only filesystem
  /^ls\b/,
  /^cat\b/,
  /^head\b/,
  /^tail\b/,
  /^grep\b/,
  /^rg\b/,
  /^find\b/,
  /^wc\b/,
  /^file\b/,
  /^which\b/,
  /^pwd$/,
  /^echo\b/,
  /^tree\b/,
  /^du\b/,
  /^df\b/,
  /^stat\b/,
  /^realpath\b/,
  /^readlink\b/,
  /^basename\b/,
  /^dirname\b/,

  // Git read operations
  /^git\s+status\b/,
  /^git\s+log\b/,
  /^git\s+diff\b/,
  /^git\s+branch\b/,
  /^git\s+show\b/,
  /^git\s+blame\b/,
  /^git\s+shortlog\b/,
  /^git\s+stash\s+list\b/,
  /^git\s+remote\s+-v\b/,
  /^git\s+tag\b/,
  /^git\s+worktree\s+list\b/,

  // Build and test
  /^npm\s+test\b/,
  /^npm\s+run\s+(build|test|lint|check|typecheck|format)\b/,
  /^npx\b/,
  /^yarn\s+(test|build|lint)\b/,
  /^pnpm\s+(test|build|lint|run\s+(build|test|lint))\b/,
  /^bun\s+(test|run\s+(build|test|lint))\b/,
  /^cargo\s+(test|build|check|clippy)\b/,
  /^go\s+(test|build|vet)\b/,
  /^pytest\b/,
  /^python\s+-m\s+pytest\b/,
  /^make\s+(test|build|check|lint)\b/,
  /^tsc\b/,
  /^eslint\b/,
  /^prettier\b/,

  // Package info
  /^npm\s+(list|outdated|ls|info|view)\b/,
  /^pip\s+(list|show|freeze)\b/,
  /^cargo\s+tree\b/,
  /^go\s+list\b/,

  // GitHub CLI read
  /^gh\s+(pr|issue|run|repo)\s+(list|view|status|diff)\b/,
  /^gh\s+api\b/,

  // Docker read
  /^docker\s+(ps|images|logs|inspect|compose\s+(ps|logs))\b/,

  // Node/runtime
  /^node\s+--version\b/,
  /^node\s+--check\b/,
];

/**
 * Dangerous command patterns — flag these with warnings
 */
const DANGEROUS_PATTERNS = [
  // Destructive file operations
  { pattern: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive\s+--force|-[a-zA-Z]*f[a-zA-Z]*r)\b/, reason: 'Recursive force delete can destroy data irreversibly' },
  { pattern: /\brm\s+-[a-zA-Z]*r\b/, reason: 'Recursive delete — verify target directory carefully' },

  // Destructive git operations
  { pattern: /\bgit\s+push\s+--force\b/, reason: 'Force push rewrites remote history — can destroy others\' work' },
  { pattern: /\bgit\s+push\s+-f\b/, reason: 'Force push rewrites remote history — can destroy others\' work' },
  { pattern: /\bgit\s+reset\s+--hard\b/, reason: 'Hard reset discards all uncommitted changes permanently' },
  { pattern: /\bgit\s+clean\s+-[a-zA-Z]*f\b/, reason: 'Git clean -f permanently removes untracked files' },
  { pattern: /\bgit\s+branch\s+-D\b/, reason: 'Force-deletes branch even if not merged' },

  // Permission / privilege escalation
  { pattern: /\bchmod\s+777\b/, reason: 'chmod 777 makes files world-readable/writable — security risk' },
  { pattern: /\bsudo\b/, reason: 'Running with elevated privileges — verify this is necessary' },

  // Pipe-to-shell (remote code execution)
  { pattern: /\bcurl\b.*\|\s*(ba)?sh\b/, reason: 'Piping remote content to shell executes arbitrary code' },
  { pattern: /\bwget\b.*\|\s*(ba)?sh\b/, reason: 'Piping remote content to shell executes arbitrary code' },

  // Destructive SQL
  { pattern: /\bDROP\s+(TABLE|DATABASE|INDEX|SCHEMA)\b/i, reason: 'DROP permanently deletes database objects' },
  { pattern: /\bDELETE\s+FROM\b/i, reason: 'DELETE FROM removes data — verify WHERE clause is correct' },
  { pattern: /\bTRUNCATE\b/i, reason: 'TRUNCATE removes all data from table immediately' },

  // Environment destruction
  { pattern: /\bdocker\s+system\s+prune\s+-a\b/, reason: 'Removes all unused Docker data including images' },
  { pattern: /\bkubectl\s+delete\b/, reason: 'Deletes Kubernetes resources — verify target carefully' },
];

/**
 * Check if command matches safe patterns
 */
function isSafe(command) {
  const trimmed = command.trim();
  return SAFE_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Check if command matches dangerous patterns
 */
function isDangerous(command) {
  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { dangerous: true, reason };
    }
  }
  return { dangerous: false };
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

    if (data.tool !== 'Bash') {
      process.exit(0);
      return;
    }

    const command = data.parameters?.command || '';

    // Check dangerous first (takes priority)
    const dangerCheck = isDangerous(command);
    if (dangerCheck.dangerous) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          additionalContext: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  DANGEROUS COMMAND DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: ${command.slice(0, 200)}
Reason: ${dangerCheck.reason}

Proceed with caution. Verify this is intentional.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
        },
      }));
      process.exit(0);
      return;
    }

    // Check safe patterns — auto-approve silently
    if (isSafe(command)) {
      // Safe command — no output needed, just exit cleanly
      process.exit(0);
      return;
    }

    // Everything else — no opinion, pass through
    process.exit(0);
  } catch {
    // On error, don't block
    process.exit(0);
  }
}

main();
