/**
 * Generator Prompts
 * Prompt templates for AI-powered skill and hook generation
 */

import type { Domain } from '../../core/classifier/types.js';
import type { HookEvent } from '../../types/hook.js';

// =============================================================================
// Skill Generation Prompt
// =============================================================================

export function buildSkillPrompt(options: {
  description: string;
  name?: string;
  domains?: Domain[];
  autoTrigger?: string[];
  referenceContent?: string;
}): string {
  const parts: string[] = [];

  parts.push(`Generate a Claude Code skill based on this description:

${options.description}

The skill should be a markdown file with YAML frontmatter. Follow this exact format:

\`\`\`markdown
---
name: skill-name
description: Brief description of what this skill does
auto_trigger: ["keyword1", "keyword2"]
domains: ["domain1", "domain2"]
model: sonnet
user-invocable: true
---

# Skill Title

[Skill content with instructions for Claude]
\`\`\`

Requirements:
1. The name should be lowercase with hyphens (e.g., "code-review", "tdd-guide")
2. Description should be a single sentence
3. auto_trigger should contain keywords/phrases that activate this skill
4. domains should be from: frontend, backend, devops, database, testing, security, documentation, general
5. model should be haiku (simple), sonnet (standard), or opus (complex reasoning)
6. The content should be comprehensive instructions that Claude can follow`);

  if (options.name) {
    parts.push(`\nUse this exact name: ${options.name}`);
  }

  if (options.domains?.length) {
    parts.push(`\nUse these domains: ${options.domains.join(', ')}`);
  }

  if (options.autoTrigger?.length) {
    parts.push(`\nUse these auto-trigger keywords: ${options.autoTrigger.join(', ')}`);
  }

  if (options.referenceContent) {
    parts.push(`\n\nHere is reference content to base the skill on:\n\n${options.referenceContent}`);
  }

  parts.push(
    `\n\nOutput ONLY the complete markdown file content, starting with --- and ending after all content. No explanations or other text.`
  );

  return parts.join('');
}

// =============================================================================
// Hook Generation Prompt
// =============================================================================

export function buildHookPrompt(options: {
  description: string;
  name?: string;
  event?: HookEvent;
  matcher?: string;
  priority?: number;
  referenceContent?: string;
}): string {
  const event = options.event || 'PreToolUse';
  const priority = options.priority ?? 50;

  const parts: string[] = [];

  parts.push(`Generate a Claude Code hook handler based on this description:

${options.description}

The hook should be a JavaScript/Node.js script that handles ${event} events.

Hook handlers receive JSON input on stdin and must:
1. Parse the input JSON
2. Process according to hook logic
3. Exit with code 0 (allow), 1 (error), or 2 (block)
4. Optionally output JSON to modify behavior

Follow this template:

\`\`\`javascript
#!/usr/bin/env node
/**
 * Hook: ${options.name || 'custom-hook'}
 * Event: ${event}
 * Description: [description]
 * Priority: ${priority}
 * Matcher: ${options.matcher || '*'}
 */

import { readFileSync } from 'fs';

// Read input from stdin
let input;
try {
  const stdinData = readFileSync(0, 'utf8');
  input = JSON.parse(stdinData);
} catch (err) {
  console.error('Failed to parse input:', err.message);
  process.exit(1);
}

// Input structure for ${event}:
${getInputStructureComment(event)}

// Hook logic here
// ...

// Exit codes:
// 0 = Allow (continue)
// 1 = Error (stop with error)
// 2 = Block (skip this tool call)

process.exit(0);
\`\`\`

Requirements:
1. The script must be a valid ES module (.mjs)
2. Handle errors gracefully and exit with code 1 on error
3. Use exit code 2 to block/skip a tool call
4. Keep the script focused and efficient`);

  if (options.name) {
    parts.push(`\nUse this name: ${options.name}`);
  }

  if (options.matcher && options.matcher !== '*') {
    parts.push(`\nThis hook should only match: ${options.matcher}`);
  }

  if (options.referenceContent) {
    parts.push(`\n\nHere is reference content to base the hook on:\n\n${options.referenceContent}`);
  }

  parts.push(`\n\nOutput ONLY the complete JavaScript file content. No explanations or other text.`);

  return parts.join('');
}

function getInputStructureComment(event: HookEvent): string {
  switch (event) {
    case 'PreToolUse':
      return `// {
//   tool_name: string,      // The tool being called (e.g., "Bash", "Write")
//   tool_input: object,     // Tool parameters
//   session_id?: string,    // Session identifier
// }`;
    case 'PostToolUse':
      return `// {
//   tool_name: string,      // The tool that was called
//   tool_input: object,     // Tool parameters
//   tool_output: any,       // Tool result
//   success: boolean,       // Whether tool succeeded
//   duration_ms?: number,   // Execution time
// }`;
    case 'Stop':
      return `// {
//   reason: 'complete' | 'error' | 'user_cancel' | 'timeout',
//   message?: string,       // Final message
//   stats?: {               // Session statistics
//     duration_ms: number,
//     tools_used: number,
//     tokens_used?: number,
//     cost_usd?: number,
//   }
// }`;
    case 'SubagentStop':
      return `// {
//   agent_type: string,     // Agent type that stopped
//   reason: 'complete' | 'error' | 'user_cancel' | 'timeout',
//   result?: any,           // Agent result
//   message?: string,       // Final message
// }`;
    default:
      return '// See hook documentation for input structure';
  }
}

// =============================================================================
// Reference URL Fetching
// =============================================================================

export async function fetchReferenceContent(url: string): Promise<string> {
  try {
    // Handle GitHub URLs specially
    if (url.includes('github.com')) {
      // Convert to raw URL if it's a blob URL
      url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'claudeops-generator/1.0',
        Accept: 'text/plain, text/markdown, application/json, */*',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();

    // Truncate if too long (keep first 50KB)
    const maxLength = 50 * 1024;
    if (content.length > maxLength) {
      return content.slice(0, maxLength) + '\n\n[Content truncated...]';
    }

    return content;
  } catch (err) {
    throw new Error(
      `Failed to fetch reference URL: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
