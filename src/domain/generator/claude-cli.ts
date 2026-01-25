/**
 * Claude CLI Wrapper
 * Invokes the claude CLI for AI-powered generation
 */

import { spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { exec as execCallback } from 'node:child_process';
import type {
  ClaudeCliOptions,
  ClaudeCliResult,
  GeneratedSkill,
  GeneratedHook,
  SkillGenerationRequest,
  HookGenerationRequest,
} from './types.js';
import { GeneratorError } from './types.js';
import { buildSkillPrompt, buildHookPrompt, fetchReferenceContent } from './prompts.js';
import type { Domain } from '../../core/classifier/types.js';
import type { HookEvent } from '../../types/hook.js';

const exec = promisify(execCallback);

// =============================================================================
// CLI Detection
// =============================================================================

/**
 * Check if claude CLI is available
 */
export async function isClaudeCliAvailable(): Promise<boolean> {
  try {
    await exec('which claude');
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Anthropic API key is available
 */
export function isAnthropicApiAvailable(): boolean {
  return !!process.env['ANTHROPIC_API_KEY'];
}

// =============================================================================
// Claude CLI Invocation
// =============================================================================

/**
 * Invoke claude CLI with a prompt
 */
export async function invokeClaudeCli(options: ClaudeCliOptions): Promise<ClaudeCliResult> {
  const timeout = options.timeout || 120000; // 2 minutes default

  // Build command arguments
  const args: string[] = ['--print'];

  if (options.model) {
    args.push('--model', options.model);
  }

  // Add the prompt as the last argument
  args.push(options.prompt);

  return new Promise((resolve) => {
    const child = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    const timeoutId = globalThis.setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        success: false,
        error: 'Claude CLI timed out',
        exitCode: -1,
      });
    }, timeout);

    child.on('close', (code) => {
      globalThis.clearTimeout(timeoutId);

      if (code === 0) {
        resolve({
          success: true,
          output: stdout.trim(),
          exitCode: 0,
        });
      } else {
        resolve({
          success: false,
          error: stderr || `Claude CLI exited with code ${code}`,
          output: stdout.trim(),
          exitCode: code ?? -1,
        });
      }
    });

    child.on('error', (err) => {
      globalThis.clearTimeout(timeoutId);
      resolve({
        success: false,
        error: err.message,
        exitCode: -1,
      });
    });
  });
}

// =============================================================================
// Skill Generation
// =============================================================================

/**
 * Parse generated skill content
 */
function parseSkillContent(content: string): GeneratedSkill {
  // Extract content between first ``` and last ```
  const codeBlockMatch = content.match(/```(?:markdown)?\n?([\s\S]*?)```/);
  const skillContent = codeBlockMatch ? (codeBlockMatch[1] ?? '').trim() : content.trim();

  // Parse frontmatter
  const frontmatterMatch = skillContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    throw new GeneratorError('Failed to parse skill frontmatter', 'PARSE_ERROR', {
      content: skillContent,
    });
  }

  const frontmatter = frontmatterMatch[1] ?? '';

  // Parse YAML frontmatter (simple key: value)
  const metadata: Record<string, unknown> = {};
  for (const line of frontmatter.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Remove quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Parse arrays
    if (value.startsWith('[')) {
      try {
        metadata[key] = JSON.parse(value.replace(/'/g, '"'));
      } catch {
        metadata[key] = value;
      }
    } else if (value === 'true') {
      metadata[key] = true;
    } else if (value === 'false') {
      metadata[key] = false;
    } else {
      metadata[key] = value;
    }
  }

  return {
    name: String(metadata['name'] || 'custom-skill'),
    description: String(metadata['description'] || ''),
    content: skillContent,
    autoTrigger: (metadata['auto_trigger'] || metadata['autoTrigger'] || []) as string[],
    domains: (metadata['domains'] || []) as Domain[],
    model: metadata['model'] as GeneratedSkill['model'],
    userInvocable: metadata['user-invocable'] !== false && metadata['userInvocable'] !== false,
  };
}

/**
 * Generate a skill using Claude CLI
 */
export async function generateSkill(request: SkillGenerationRequest): Promise<GeneratedSkill> {
  // Check if CLI is available
  const cliAvailable = await isClaudeCliAvailable();
  if (!cliAvailable) {
    throw new GeneratorError(
      'Claude CLI not found. Please install it: npm install -g @anthropic-ai/claude-code',
      'CLI_NOT_FOUND'
    );
  }

  // Fetch reference content if URL provided
  let referenceContent: string | undefined;
  if (request.referenceUrl) {
    try {
      referenceContent = await fetchReferenceContent(request.referenceUrl);
    } catch (err) {
      throw new GeneratorError(
        `Failed to fetch reference: ${err instanceof Error ? err.message : String(err)}`,
        'NETWORK_ERROR',
        { url: request.referenceUrl }
      );
    }
  }

  // Build the prompt
  const prompt = buildSkillPrompt({
    description: request.description,
    name: request.name,
    domains: request.domains,
    autoTrigger: request.autoTrigger,
    referenceContent,
  });

  // Invoke Claude CLI
  const result = await invokeClaudeCli({
    prompt,
    model: request.model || 'sonnet',
    timeout: 120000,
  });

  if (!result.success || !result.output) {
    throw new GeneratorError(result.error || 'No output from Claude CLI', 'CLI_ERROR', {
      exitCode: result.exitCode,
    });
  }

  // Parse the result
  try {
    return parseSkillContent(result.output);
  } catch (err) {
    throw new GeneratorError(
      `Failed to parse generated skill: ${err instanceof Error ? err.message : String(err)}`,
      'PARSE_ERROR',
      { output: result.output }
    );
  }
}

// =============================================================================
// Hook Generation
// =============================================================================

/**
 * Parse generated hook content
 */
function parseHookContent(content: string, request: HookGenerationRequest): GeneratedHook {
  // Extract content between first ``` and last ```
  const codeBlockMatch = content.match(/```(?:javascript|js)?\n?([\s\S]*?)```/);
  const handlerContent = codeBlockMatch ? (codeBlockMatch[1] ?? '').trim() : content.trim();

  // Try to extract metadata from comment header
  const headerMatch = handlerContent.match(/\/\*\*[\s\S]*?\*\//);
  let name = request.name || 'custom-hook';
  let description = request.description;
  let event: HookEvent = request.event || 'PreToolUse';
  let matcher = request.matcher || '*';
  let priority = request.priority ?? 50;

  if (headerMatch) {
    const header = headerMatch[0];

    const nameMatch = header.match(/Hook:\s*(.+)/);
    if (nameMatch?.[1]) name = nameMatch[1].trim();

    const descMatch = header.match(/Description:\s*(.+)/);
    if (descMatch?.[1]) description = descMatch[1].trim();

    const eventMatch = header.match(/Event:\s*(.+)/);
    if (eventMatch?.[1]) event = eventMatch[1].trim() as HookEvent;

    const matcherMatch = header.match(/Matcher:\s*(.+)/);
    if (matcherMatch?.[1]) matcher = matcherMatch[1].trim();

    const priorityMatch = header.match(/Priority:\s*(\d+)/);
    if (priorityMatch?.[1]) priority = parseInt(priorityMatch[1], 10);
  }

  return {
    name,
    description,
    event,
    matcher,
    handlerContent,
    priority,
  };
}

/**
 * Generate a hook using Claude CLI
 */
export async function generateHook(request: HookGenerationRequest): Promise<GeneratedHook> {
  // Check if CLI is available
  const cliAvailable = await isClaudeCliAvailable();
  if (!cliAvailable) {
    throw new GeneratorError(
      'Claude CLI not found. Please install it: npm install -g @anthropic-ai/claude-code',
      'CLI_NOT_FOUND'
    );
  }

  // Fetch reference content if URL provided
  let referenceContent: string | undefined;
  if (request.referenceUrl) {
    try {
      referenceContent = await fetchReferenceContent(request.referenceUrl);
    } catch (err) {
      throw new GeneratorError(
        `Failed to fetch reference: ${err instanceof Error ? err.message : String(err)}`,
        'NETWORK_ERROR',
        { url: request.referenceUrl }
      );
    }
  }

  // Build the prompt
  const prompt = buildHookPrompt({
    description: request.description,
    name: request.name,
    event: request.event,
    matcher: request.matcher,
    priority: request.priority,
    referenceContent,
  });

  // Invoke Claude CLI
  const result = await invokeClaudeCli({
    prompt,
    model: request.model || 'sonnet',
    timeout: 120000,
  });

  if (!result.success || !result.output) {
    throw new GeneratorError(result.error || 'No output from Claude CLI', 'CLI_ERROR', {
      exitCode: result.exitCode,
    });
  }

  // Parse the result
  try {
    return parseHookContent(result.output, request);
  } catch (err) {
    throw new GeneratorError(
      `Failed to parse generated hook: ${err instanceof Error ? err.message : String(err)}`,
      'PARSE_ERROR',
      { output: result.output }
    );
  }
}

// =============================================================================
// Fallback Template Generation
// =============================================================================

/**
 * Generate a skill using templates (fallback when Claude CLI unavailable)
 */
export function generateSkillTemplate(request: SkillGenerationRequest): GeneratedSkill {
  const name = request.name || 'custom-skill';
  const domains = request.domains || ['general'];
  const autoTrigger = request.autoTrigger || [];

  const content = `---
name: ${name}
description: ${request.description}
auto_trigger: ${JSON.stringify(autoTrigger)}
domains: ${JSON.stringify(domains)}
model: sonnet
user-invocable: true
---

# ${name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')}

${request.description}

## Instructions

[Add detailed instructions for Claude here]

## Examples

[Add usage examples here]
`;

  return {
    name,
    description: request.description,
    content,
    autoTrigger,
    domains: domains as Domain[],
    model: 'sonnet',
    userInvocable: true,
  };
}

/**
 * Generate a hook using templates (fallback when Claude CLI unavailable)
 */
export function generateHookTemplate(request: HookGenerationRequest): GeneratedHook {
  const name = request.name || 'custom-hook';
  const event = request.event || 'PreToolUse';
  const matcher = request.matcher || '*';
  const priority = request.priority ?? 50;

  const handlerContent = `#!/usr/bin/env node
/**
 * Hook: ${name}
 * Event: ${event}
 * Description: ${request.description}
 * Priority: ${priority}
 * Matcher: ${matcher}
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

// TODO: Implement hook logic
// ${request.description}

// Exit codes:
// 0 = Allow (continue)
// 1 = Error (stop with error)
// 2 = Block (skip this tool call)

process.exit(0);
`;

  return {
    name,
    description: request.description,
    event,
    matcher,
    handlerContent,
    priority,
  };
}
