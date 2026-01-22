<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/domain/hook/

## Purpose

Hook composition engine. Merges hooks from multiple sources (addons, setups, user configs) with priority ordering, matcher type detection (glob/regex/exact), and converts to Claude Code settings.json format.

## Key Files

| File | Purpose |
|------|---------|
| `composer.ts` | Hook merging and composition logic (382 lines) |
| `index.ts` | Public API exports |

## For AI Agents

### Working In This Directory

- **Hook events**: PreToolUse, PostToolUse, Stop, SubagentStop (4 lifecycle events)
- **Hook sources**: addon (from installed addons), setup (from active setup), user (from config)
- **Priority ordering**: Hooks sorted by priority (lower runs first), default priority is 0
- **Matcher types**: exact (literal string), glob (contains `*?[]`), regex (starts/ends with `/`)
- **Handler resolution**: Relative paths resolved against source basePath, absolute paths used as-is
- **Composition flow**: Collect entries from all sources → resolve handler paths → convert to HookHandler → filter disabled → sort by priority
- **Settings format**: Convert ComposedHooks to SettingsHooks for settings.json (omit default priority 0, omit enabled=true)
- **Placeholder handlers**: Composition creates placeholder `handle()` functions, real execution happens in Claude Code runtime
- **Source tracking**: Each handler tracks its source name for filtering and debugging

### Testing Requirements

- Test hook merging from multiple sources with priority ordering
- Test matcher type detection (exact/glob/regex)
- Test handler path resolution (relative vs absolute)
- Test filtering by source name
- Test conversion to settings.json format
- Test empty hooks handling
- Test hook count and source extraction utilities
- Mock file system for handler path resolution

### Common Patterns

- **Composition**: `composeHooks(sources)` → collect by event type → resolve paths → create handlers → sort by priority → return ComposedHooks
- **Source format**: `{ type: 'addon' | 'setup' | 'user', name: string, hooks: AddonHooksInput, basePath: string }`
- **Handler naming**: `${source}:${matcherPart}-${index}` (e.g., "my-addon:bash-command-0")
- **Path resolution**: `resolveHandlerPath(handler, basePath)` → absolute path for execution
- **Settings conversion**: `toSettingsFormat(hooks)` → array of `{ matcher, handler, priority?, enabled? }` per event
- **Utility functions**: `isHooksEmpty()`, `getHookCount()`, `filterHooksBySource()`, `removeHooksBySource()`, `mergeComposedHooks()`
- **Empty hooks**: `createEmptyHooks()` returns structure with empty arrays for all event types

## Dependencies

### Internal
- `@/types` - AddonHooksInput, HookHandler, ComposedHooks, SettingsHooks, HookEvent types
- `@/types` - PreToolUseInput, PostToolUseInput, StopInput, SubagentStopInput input types
- Path resolution utilities

### External
- `node:path` - Path manipulation (resolve, isAbsolute)
- No external runtime dependencies for composition (execution happens in Claude Code)

<!-- MANUAL -->
