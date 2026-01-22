#!/usr/bin/env bun
/**
 * claude-ignore - PreToolUse Hook
 *
 * Respects .claudeignore files to prevent reading sensitive files.
 * Works like .gitignore but for Claude Code file access.
 *
 * Exit codes:
 *   0 = allow (continue execution)
 *   1 = error (stop with error)
 *   2 = block (skip this tool call)
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id?: string;
  agent_type?: string;
  timestamp?: string;
}

// Cache for parsed ignore files
const ignoreCache = new Map<string, string[]>();

/**
 * Find all .claudeignore files from a path up to root
 */
function findIgnoreFiles(filePath: string): string[] {
  const ignoreFiles: string[] = [];
  let dir = isAbsolute(filePath) ? dirname(filePath) : dirname(resolve(filePath));
  const root = '/';

  while (dir !== root) {
    const ignoreFile = join(dir, '.claudeignore');
    if (existsSync(ignoreFile)) {
      ignoreFiles.push(ignoreFile);
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Also check home directory
  const homeIgnore = join(process.env.HOME || '~', '.claudeignore');
  if (existsSync(homeIgnore) && !ignoreFiles.includes(homeIgnore)) {
    ignoreFiles.push(homeIgnore);
  }

  return ignoreFiles;
}

/**
 * Parse ignore patterns from a file
 */
function parseIgnoreFile(filePath: string): string[] {
  if (ignoreCache.has(filePath)) {
    return ignoreCache.get(filePath)!;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const patterns = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    ignoreCache.set(filePath, patterns);
    return patterns;
  } catch {
    return [];
  }
}

/**
 * Convert a glob pattern to a regex
 * Simplified implementation - handles basic patterns
 */
function patternToRegex(pattern: string): RegExp {
  // Handle negation (patterns starting with !)
  const isNegated = pattern.startsWith('!');
  if (isNegated) {
    pattern = pattern.slice(1);
  }

  // Escape special regex characters except * and ?
  let regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // ** matches any path segment
    .replace(/\*\*/g, '.*')
    // * matches anything except /
    .replace(/\*/g, '[^/]*')
    // ? matches single character
    .replace(/\?/g, '.');

  // If pattern starts with /, it's anchored to root
  if (pattern.startsWith('/')) {
    regex = '^' + regex.slice(1);
  } else {
    // Otherwise it can match anywhere in path
    regex = '(^|/)' + regex;
  }

  // If pattern ends with /, it only matches directories
  // For our purposes, treat it as matching the path prefix
  if (pattern.endsWith('/')) {
    regex = regex.slice(0, -1) + '(/|$)';
  } else {
    regex = regex + '(/|$)';
  }

  return new RegExp(regex);
}

/**
 * Check if a file path matches any ignore pattern
 */
function isIgnored(filePath: string, patterns: string[]): boolean {
  const absPath = isAbsolute(filePath) ? filePath : resolve(filePath);
  let ignored = false;

  for (const pattern of patterns) {
    const isNegated = pattern.startsWith('!');
    const cleanPattern = isNegated ? pattern.slice(1) : pattern;

    const regex = patternToRegex(cleanPattern);

    // Test against absolute path and relative components
    const matches = regex.test(absPath) ||
      regex.test(filePath) ||
      absPath.split('/').some(part => regex.test(part));

    if (matches) {
      ignored = !isNegated;
    }
  }

  return ignored;
}

/**
 * Check if file should be blocked based on .claudeignore files
 */
function shouldBlock(filePath: string): { blocked: boolean; reason?: string } {
  const ignoreFiles = findIgnoreFiles(filePath);

  for (const ignoreFile of ignoreFiles) {
    const patterns = parseIgnoreFile(ignoreFile);

    if (isIgnored(filePath, patterns)) {
      return {
        blocked: true,
        reason: `File matches pattern in ${ignoreFile}`,
      };
    }
  }

  return { blocked: false };
}

/**
 * Extract file paths from bash commands
 */
function extractPathsFromCommand(command: string): string[] {
  const paths: string[] = [];

  // cat command
  const catMatch = command.match(/\bcat\s+["']?([^"'\s|>]+)["']?/g);
  if (catMatch) {
    for (const match of catMatch) {
      const path = match.replace(/\bcat\s+["']?/, '').replace(/["']?$/, '');
      if (path && !path.startsWith('-')) {
        paths.push(path);
      }
    }
  }

  // head/tail commands
  const headTailMatch = command.match(/\b(head|tail)\s+.*?["']?([^"'\s|>-]+)["']?/g);
  if (headTailMatch) {
    for (const match of headTailMatch) {
      const parts = match.split(/\s+/);
      const path = parts[parts.length - 1]?.replace(/["']/g, '');
      if (path && !path.startsWith('-')) {
        paths.push(path);
      }
    }
  }

  // less/more commands
  const lessMoreMatch = command.match(/\b(less|more)\s+["']?([^"'\s|>]+)["']?/g);
  if (lessMoreMatch) {
    for (const match of lessMoreMatch) {
      const path = match.replace(/\b(less|more)\s+["']?/, '').replace(/["']?$/, '');
      if (path && !path.startsWith('-')) {
        paths.push(path);
      }
    }
  }

  return paths;
}

async function main(): Promise<void> {
  // Read input from stdin
  let rawInput: string;
  try {
    rawInput = await Bun.stdin.text();
  } catch {
    process.exit(0);
  }

  if (!rawInput.trim()) {
    process.exit(0);
  }

  let input: HookInput;
  try {
    input = JSON.parse(rawInput) as HookInput;
  } catch {
    process.exit(0);
  }

  // Handle Read tool
  if (input.tool_name === 'Read') {
    const filePath = input.tool_input.file_path as string;
    if (!filePath) {
      process.exit(0);
    }

    const result = shouldBlock(filePath);
    if (result.blocked) {
      console.error(`[claude-ignore] BLOCKED: ${result.reason}`);
      console.error(`[claude-ignore] File: ${filePath}`);
      process.exit(2);
    }

    process.exit(0);
  }

  // Handle Bash tool - check for file reading commands
  if (input.tool_name === 'Bash') {
    const command = (input.tool_input.command as string) || '';
    const paths = extractPathsFromCommand(command);

    for (const filePath of paths) {
      const result = shouldBlock(filePath);
      if (result.blocked) {
        console.error(`[claude-ignore] BLOCKED: ${result.reason}`);
        console.error(`[claude-ignore] Command tries to read: ${filePath}`);
        process.exit(2);
      }
    }

    process.exit(0);
  }

  // Allow other tools
  process.exit(0);
}

main().catch((err) => {
  console.error('[claude-ignore] Hook error:', err);
  process.exit(1);
});
