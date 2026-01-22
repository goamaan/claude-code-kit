#!/usr/bin/env bun
/**
 * safety-net - PreToolUse Hook
 *
 * Blocks dangerous git commands that could cause data loss or irreversible changes.
 *
 * Exit codes:
 *   0 = allow (continue execution)
 *   1 = error (stop with error)
 *   2 = block (skip this tool call)
 */

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id?: string;
  agent_type?: string;
  timestamp?: string;
}

// Patterns that indicate dangerous git commands
const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  // git reset --hard (loses uncommitted changes)
  {
    pattern: /\bgit\s+reset\s+--hard\b/,
    description: 'git reset --hard (discards all uncommitted changes)',
  },
  // git push --force without --force-with-lease (can overwrite remote history)
  {
    pattern: /\bgit\s+push\s+.*--force(?!-with-lease)\b/,
    description: 'git push --force without --force-with-lease (can overwrite remote history)',
  },
  // git push -f (short form of --force)
  {
    pattern: /\bgit\s+push\s+.*-f(?!orce-with-lease)\b/,
    description: 'git push -f (force push can overwrite remote history)',
  },
  // git clean -f (removes untracked files)
  {
    pattern: /\bgit\s+clean\s+.*-f\b/,
    description: 'git clean -f (permanently removes untracked files)',
  },
  // git stash clear (removes all stashes)
  {
    pattern: /\bgit\s+stash\s+clear\b/,
    description: 'git stash clear (removes all stashed changes)',
  },
  // git stash drop without specific stash (can be accidental)
  {
    pattern: /\bgit\s+stash\s+drop\s*$/,
    description: 'git stash drop (removes stashed changes)',
  },
  // git checkout . (discards all changes)
  {
    pattern: /\bgit\s+checkout\s+\.\s*$/,
    description: 'git checkout . (discards all uncommitted changes)',
  },
  // git restore . (discards all changes)
  {
    pattern: /\bgit\s+restore\s+\.\s*$/,
    description: 'git restore . (discards all uncommitted changes)',
  },
  // git branch -D (force delete branch)
  {
    pattern: /\bgit\s+branch\s+.*-D\b/,
    description: 'git branch -D (force deletes branch even if not merged)',
  },
  // git rebase on main/master (dangerous if pushed)
  {
    pattern: /\bgit\s+rebase\s+.*(main|master)\b/,
    description: 'git rebase on main/master (can cause issues if already pushed)',
  },
  // git push --force to main/master
  {
    pattern: /\bgit\s+push\s+.*--force.*\s+(origin\s+)?(main|master)\b/,
    description: 'git push --force to main/master (extremely dangerous)',
  },
  // git push -f to main/master
  {
    pattern: /\bgit\s+push\s+.*-f.*\s+(origin\s+)?(main|master)\b/,
    description: 'git push -f to main/master (extremely dangerous)',
  },
];

// Patterns that indicate user explicitly wants to do something safe (allow)
const SAFE_PATTERNS: RegExp[] = [
  // git push --force-with-lease (safer force push)
  /\bgit\s+push\s+.*--force-with-lease\b/,
  // git reset --soft or --mixed (safer resets)
  /\bgit\s+reset\s+--(soft|mixed)\b/,
  // git clean with -n/--dry-run (preview only)
  /\bgit\s+clean\s+.*(-n|--dry-run)\b/,
  // git stash drop with specific stash name
  /\bgit\s+stash\s+drop\s+stash@\{/,
  // git checkout specific file
  /\bgit\s+checkout\s+\S+\s+--\s+\S/,
];

function isSafePattern(command: string): boolean {
  return SAFE_PATTERNS.some(pattern => pattern.test(command));
}

function findDangerousPattern(command: string): { pattern: RegExp; description: string } | null {
  for (const { pattern, description } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { pattern, description };
    }
  }
  return null;
}

async function main(): Promise<void> {
  // Read input from stdin
  let rawInput: string;
  try {
    rawInput = await Bun.stdin.text();
  } catch {
    // No input, allow by default
    process.exit(0);
  }

  if (!rawInput.trim()) {
    process.exit(0);
  }

  let input: HookInput;
  try {
    input = JSON.parse(rawInput) as HookInput;
  } catch {
    // Invalid JSON, allow by default
    process.exit(0);
  }

  // Only check Bash commands
  if (input.tool_name !== 'Bash') {
    process.exit(0);
  }

  const command = (input.tool_input.command as string) || '';

  // Skip if no git command
  if (!/\bgit\b/.test(command)) {
    process.exit(0);
  }

  // Check if it matches a known safe pattern first
  if (isSafePattern(command)) {
    process.exit(0);
  }

  // Check for dangerous patterns
  const dangerous = findDangerousPattern(command);
  if (dangerous) {
    console.error(`[safety-net] BLOCKED: ${dangerous.description}`);
    console.error(`[safety-net] Command: ${command}`);
    process.exit(2); // Block the command
  }

  // Allow other git commands
  process.exit(0);
}

main().catch((err) => {
  console.error('[safety-net] Hook error:', err);
  process.exit(1);
});
