#!/usr/bin/env bun
/**
 * rm-rf-guard - PreToolUse Hook
 *
 * Blocks dangerous rm commands that could cause catastrophic data loss.
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

// Patterns that indicate dangerous rm commands
const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  // rm with recursive/force flags targeting root
  {
    pattern: /\brm\s+(-[rf]+\s+)*\//,
    description: 'rm targeting root directory (/)',
  },
  // rm with recursive/force flags targeting home
  {
    pattern: /\brm\s+(-[rf]+\s+)*~\//,
    description: 'rm targeting home directory (~)',
  },
  // rm with recursive/force flags targeting $HOME
  {
    pattern: /\brm\s+(-[rf]+\s+)*\$HOME\//,
    description: 'rm targeting $HOME directory',
  },
  // rm -rf * or rm -rf .
  {
    pattern: /\brm\s+(-[rf]+\s+)+(\*|\.)\s*$/,
    description: 'rm -rf * or rm -rf . (removes all files)',
  },
  // sudo rm (any sudo rm is suspicious)
  {
    pattern: /\bsudo\s+rm\b/,
    description: 'sudo rm (elevated privileges)',
  },
  // rm targeting common critical directories
  {
    pattern: /\brm\s+(-[rf]+\s+)*(\/usr|\/var|\/etc|\/bin|\/sbin|\/lib|\/boot|\/sys|\/proc)\b/,
    description: 'rm targeting system directories',
  },
  // rm with --no-preserve-root
  {
    pattern: /\brm\b.*--no-preserve-root/,
    description: 'rm with --no-preserve-root flag',
  },
  // Overly broad rm patterns
  {
    pattern: /\brm\s+(-[rf]+\s+)*\.\.\/\.\.\//,
    description: 'rm with parent directory traversal',
  },
];

// Patterns that indicate user explicitly wants to remove something specific (allow)
const SAFE_PATTERNS: RegExp[] = [
  // rm targeting node_modules
  /\brm\s+(-[rf]+\s+)*.*node_modules/,
  // rm targeting .git (but not root .git)
  /\brm\s+(-[rf]+\s+)*\w+.*\/\.git\b/,
  // rm targeting dist/build directories
  /\brm\s+(-[rf]+\s+)*(dist|build|\.cache|\.next|\.nuxt|__pycache__|\.pytest_cache)\b/,
  // rm targeting tmp/temp files
  /\brm\s+(-[rf]+\s+)*(\/tmp\/|\.tmp|\.temp)/,
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

  // Skip if no rm command
  if (!/\brm\b/.test(command)) {
    process.exit(0);
  }

  // Check if it matches a known safe pattern
  if (isSafePattern(command)) {
    process.exit(0);
  }

  // Check for dangerous patterns
  const dangerous = findDangerousPattern(command);
  if (dangerous) {
    console.error(`[rm-rf-guard] BLOCKED: ${dangerous.description}`);
    console.error(`[rm-rf-guard] Command: ${command}`);
    process.exit(2); // Block the command
  }

  // Allow other rm commands
  process.exit(0);
}

main().catch((err) => {
  console.error('[rm-rf-guard] Hook error:', err);
  process.exit(1);
});
