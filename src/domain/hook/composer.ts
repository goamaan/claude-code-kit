/**
 * Hook Composer - Merge hooks from multiple sources
 * Combines hooks from addons, setups, and user configurations
 */

import { resolve, isAbsolute } from 'node:path';
import type {
  AddonHooksInput,
  HookHandler,
  ComposedHooks,
  SettingsHooks,
  SettingsHookEntry,
  HookEvent,
  PreToolUseInput,
  PostToolUseInput,
  StopInput,
  SubagentStopInput,
  HookMatcherInput,
} from '@/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Source of hooks for composition
 */
export interface HookSource {
  /** Type of source */
  type: 'addon' | 'setup' | 'user';

  /** Name of the source (addon name, setup name, or 'user') */
  name: string;

  /** Hooks from this source */
  hooks: AddonHooksInput;

  /** Base path for resolving relative handler paths */
  basePath: string;
}

/**
 * Intermediate hook entry before creating HookHandler
 */
interface ResolvedHookEntry {
  name: string;
  matcher: string;
  handler: string;
  priority: number;
  enabled: boolean;
  source: string;
  basePath: string;
}

// =============================================================================
// Constants
// =============================================================================

const _HOOK_EVENTS: HookEvent[] = ['PreToolUse', 'PostToolUse', 'Stop', 'SubagentStop'];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Resolve a handler path to an absolute path
 * @param handler - Handler specification (can be relative or absolute path)
 * @param basePath - Base path for resolving relative paths
 * @returns Absolute handler path
 */
export function resolveHandlerPath(handler: string, basePath: string): string {
  // Already absolute path
  if (isAbsolute(handler)) {
    return handler;
  }

  // Relative path - resolve against base path
  return resolve(basePath, handler);
}

/**
 * Create a unique name for a hook handler
 * @param source - Source name
 * @param matcher - Matcher pattern
 * @param index - Index for disambiguation
 * @returns Unique handler name
 */
function createHandlerName(source: string, matcher: string, index: number): string {
  // Create a descriptive name from the matcher
  const matcherPart = matcher
    .replace(/[*?[\]]/g, '')  // Remove glob characters
    .replace(/[^a-zA-Z0-9_-]/g, '-')  // Replace invalid chars
    .slice(0, 32);  // Limit length

  return `${source}:${matcherPart || 'hook'}-${index}`;
}

/**
 * Convert HookMatcher entries to ResolvedHookEntry
 */
function resolveHookEntries(
  matchers: HookMatcherInput[] | undefined,
  source: string,
  basePath: string,
): ResolvedHookEntry[] {
  if (!matchers || matchers.length === 0) {
    return [];
  }

  return matchers.map((matcher, index) => ({
    name: createHandlerName(source, matcher.matcher, index),
    matcher: matcher.matcher,
    handler: resolveHandlerPath(matcher.handler, basePath),
    priority: matcher.priority ?? 0,
    enabled: matcher.enabled ?? true,
    source,
    basePath,
  }));
}

/**
 * Create a placeholder handler function
 * Real handlers are loaded at execution time
 */
function createPlaceholderHandler<T>(): (input: T) => { action: 'continue' } {
  return () => ({ action: 'continue' as const });
}

/**
 * Convert resolved entries to HookHandler objects
 */
function toHookHandlers<T>(entries: ResolvedHookEntry[]): Array<HookHandler<T>> {
  return entries.map(entry => ({
    name: entry.name,
    matcher: entry.matcher,
    matchType: detectMatchType(entry.matcher),
    priority: entry.priority,
    enabled: entry.enabled,
    source: entry.source,
    handle: createPlaceholderHandler<T>(),
  }));
}

/**
 * Detect match type from pattern
 */
function detectMatchType(pattern: string): 'glob' | 'regex' | 'exact' {
  // Regex patterns start and end with / (check first before glob)
  if (pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 2) {
    return 'regex';
  }

  // Glob patterns contain *, ?, [, ]
  if (/[*?[\]]/.test(pattern)) {
    return 'glob';
  }

  // Otherwise exact match
  return 'exact';
}

/**
 * Sort handlers by priority (lower priority runs first)
 */
function sortByPriority<T>(handlers: Array<HookHandler<T>>): Array<HookHandler<T>> {
  return [...handlers].sort((a, b) => a.priority - b.priority);
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Compose hooks from multiple sources
 * Merges hooks by event type and sorts by priority
 *
 * @param sources - Array of hook sources to compose
 * @returns Composed hooks with all handlers merged and sorted
 */
export function composeHooks(sources: HookSource[]): ComposedHooks {
  // Collect all resolved entries by event type
  const preToolUseEntries: ResolvedHookEntry[] = [];
  const postToolUseEntries: ResolvedHookEntry[] = [];
  const stopEntries: ResolvedHookEntry[] = [];
  const subagentStopEntries: ResolvedHookEntry[] = [];

  // Process each source
  for (const source of sources) {
    const { hooks, name, basePath } = source;

    if (hooks.PreToolUse) {
      preToolUseEntries.push(...resolveHookEntries(hooks.PreToolUse, name, basePath));
    }

    if (hooks.PostToolUse) {
      postToolUseEntries.push(...resolveHookEntries(hooks.PostToolUse, name, basePath));
    }

    if (hooks.Stop) {
      stopEntries.push(...resolveHookEntries(hooks.Stop, name, basePath));
    }

    if (hooks.SubagentStop) {
      subagentStopEntries.push(...resolveHookEntries(hooks.SubagentStop, name, basePath));
    }
  }

  // Convert to HookHandler objects and filter disabled
  const preToolUse = toHookHandlers<PreToolUseInput>(preToolUseEntries)
    .filter(h => h.enabled);
  const postToolUse = toHookHandlers<PostToolUseInput>(postToolUseEntries)
    .filter(h => h.enabled);
  const stop = toHookHandlers<StopInput>(stopEntries)
    .filter(h => h.enabled);
  const subagentStop = toHookHandlers<SubagentStopInput>(subagentStopEntries)
    .filter(h => h.enabled);

  // Sort by priority and return
  return {
    PreToolUse: sortByPriority(preToolUse),
    PostToolUse: sortByPriority(postToolUse),
    Stop: sortByPriority(stop),
    SubagentStop: sortByPriority(subagentStop),
  };
}

/**
 * Convert composed hooks to Claude Code settings.json format
 *
 * @param hooks - Composed hooks to convert
 * @returns Settings hooks format for settings.json
 */
export function toSettingsFormat(hooks: ComposedHooks): SettingsHooks {
  const result: SettingsHooks = {};

  // Helper to convert HookHandler array to SettingsHookEntry array
  const toEntries = <T>(handlers: Array<HookHandler<T>>): SettingsHookEntry[] | undefined => {
    if (handlers.length === 0) {
      return undefined;
    }

    return handlers.map(h => {
      const handlerPath = h.source === 'built-in' ? h.name : (h as unknown as { handlerPath?: string }).handlerPath ?? h.name;

      const entry: SettingsHookEntry = {
        hooks: [
          {
            type: 'command',
            command: `node "${handlerPath}"`,
          },
        ],
      };

      // Add string matcher if not wildcard
      if (h.matcher && h.matcher !== '*') {
        entry.matcher = h.matcher;
      }

      return entry;
    });
  };

  // Convert each event type
  if (hooks.PreToolUse.length > 0) {
    result.PreToolUse = toEntries(hooks.PreToolUse);
  }

  if (hooks.PostToolUse.length > 0) {
    result.PostToolUse = toEntries(hooks.PostToolUse);
  }

  if (hooks.Stop.length > 0) {
    result.Stop = toEntries(hooks.Stop);
  }

  if (hooks.SubagentStop.length > 0) {
    result.SubagentStop = toEntries(hooks.SubagentStop);
  }

  return result;
}

/**
 * Check if composed hooks are empty (no handlers in any category)
 */
export function isHooksEmpty(hooks: ComposedHooks): boolean {
  return (
    hooks.PreToolUse.length === 0 &&
    hooks.PostToolUse.length === 0 &&
    hooks.Stop.length === 0 &&
    hooks.SubagentStop.length === 0
  );
}

/**
 * Merge two ComposedHooks objects
 * Handlers from the second object are appended and re-sorted
 */
export function mergeComposedHooks(a: ComposedHooks, b: ComposedHooks): ComposedHooks {
  return {
    PreToolUse: sortByPriority([...a.PreToolUse, ...b.PreToolUse]),
    PostToolUse: sortByPriority([...a.PostToolUse, ...b.PostToolUse]),
    Stop: sortByPriority([...a.Stop, ...b.Stop]),
    SubagentStop: sortByPriority([...a.SubagentStop, ...b.SubagentStop]),
  };
}

/**
 * Create empty composed hooks
 */
export function createEmptyHooks(): ComposedHooks {
  return {
    PreToolUse: [],
    PostToolUse: [],
    Stop: [],
    SubagentStop: [],
  };
}

/**
 * Get total hook count across all event types
 */
export function getHookCount(hooks: ComposedHooks): number {
  return (
    hooks.PreToolUse.length +
    hooks.PostToolUse.length +
    hooks.Stop.length +
    hooks.SubagentStop.length
  );
}

/**
 * Filter hooks by source name
 */
export function filterHooksBySource(
  hooks: ComposedHooks,
  sourceName: string,
): ComposedHooks {
  return {
    PreToolUse: hooks.PreToolUse.filter(h => h.source === sourceName),
    PostToolUse: hooks.PostToolUse.filter(h => h.source === sourceName),
    Stop: hooks.Stop.filter(h => h.source === sourceName),
    SubagentStop: hooks.SubagentStop.filter(h => h.source === sourceName),
  };
}

/**
 * Remove hooks by source name
 */
export function removeHooksBySource(
  hooks: ComposedHooks,
  sourceName: string,
): ComposedHooks {
  return {
    PreToolUse: hooks.PreToolUse.filter(h => h.source !== sourceName),
    PostToolUse: hooks.PostToolUse.filter(h => h.source !== sourceName),
    Stop: hooks.Stop.filter(h => h.source !== sourceName),
    SubagentStop: hooks.SubagentStop.filter(h => h.source !== sourceName),
  };
}

/**
 * Get all unique source names from composed hooks
 */
export function getHookSources(hooks: ComposedHooks): string[] {
  const sources = new Set<string>();

  for (const handler of hooks.PreToolUse) {
    sources.add(handler.source);
  }
  for (const handler of hooks.PostToolUse) {
    sources.add(handler.source);
  }
  for (const handler of hooks.Stop) {
    sources.add(handler.source);
  }
  for (const handler of hooks.SubagentStop) {
    sources.add(handler.source);
  }

  return Array.from(sources).sort();
}
