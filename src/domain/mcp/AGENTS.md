<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/domain/mcp/

## Purpose

MCP (Model Context Protocol) server management. Provides CRUD operations for MCP servers, enable/disable controls, configuration management, and context budget calculation for server allocations.

## Key Files

| File | Purpose |
|------|---------|
| `manager.ts` | High-level MCP server management API (381 lines) |
| `budget.ts` | Context budget calculation for MCP servers |
| `index.ts` | Public API exports |

## For AI Agents

### Working In This Directory

- **Server config**: `{ command: string, args: string[], env?: Record<string, string> }`
- **Server state**: `{ name, status: 'running' | 'stopped' | 'disabled' | 'error', requestCount, pid?, startedAt?, error?, lastRequestAt?, uptimeMs? }`
- **Storage locations**: Settings in `~/.claude/settings.json` (mcpServers section), state tracking in `~/.claudeops/cache/mcp-servers.json`
- **Status lifecycle**: stopped → running (started by Claude Code) → error (if failed), or manually set to disabled
- **Budget calculation**: Estimates context window usage per server, aggregates total budget
- **Enable/disable**: State tracking separate from config, allows toggling without removing server definition
- **Configuration**: Add/remove/configure servers in settings.json, sync required to propagate changes
- **Request tracking**: Count requests per server, track last request timestamp

### Testing Requirements

- Test CRUD operations (add, get, remove, configure)
- Test enable/disable state persistence
- Test budget calculation with various server configs
- Test state tracking across restarts
- Test error handling for missing servers
- Mock settings.json and state file operations
- Test concurrent state updates
- Test budget aggregation for multiple servers

### Common Patterns

- **Manager interface**: `list()`, `get()`, `enable()`, `disable()`, `configure()`, `add()`, `remove()`, `budget()`, `budgetPerServer()`
- **State building**: `buildServerState(name, config, trackedState)` merges config with runtime state
- **Settings loading**: `loadSettings()` → parse `~/.claude/settings.json` → extract mcpServers section
- **State persistence**: `loadState()` / `saveState()` manage `~/.claudeops/cache/mcp-servers.json`
- **Error types**: `McpServerNotFoundError`, `McpServerExistsError`, `McpConfigError`
- **Status override**: Tracked state status overrides default "stopped" from config
- **Budget summary**: `{ totalBudget, perServerBudgets: { name, budget }[] }`

## Dependencies

### Internal
- `@/types` - McpServerState, McpServerConfig, McpBudgetSummary, McpSettings types
- `@/utils/paths` - Path resolution (getClaudeDir, getGlobalConfigDir)
- `@/utils/fs` - File operations (readJsonSafe, writeJson, exists)
- `@/utils/constants` - CLAUDE_SETTINGS_FILE, MCP_SERVERS_FILE
- `budget.ts` - Budget calculation functions

### External
- `node:path` - Path manipulation (join)
- `node:fs/promises` - Async file system operations
- JSON parsing/serialization for settings and state

<!-- MANUAL -->
