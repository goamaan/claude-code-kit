<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/domain/

## Purpose

Business logic modules for claude-code-kit. Each subdirectory implements a specific domain concept (addon, cost, hook, mcp, profile, setup) following a consistent manager pattern.

## Key Files

| File | Purpose |
|------|---------|
| `addon/manager.ts` | Addon lifecycle management (load, install, uninstall) |
| `cost/tracker.ts` | Cost tracking and budget management |
| `hook/executor.ts` | Hook execution engine (pre/post command hooks) |
| `mcp/manager.ts` | MCP server configuration management |
| `profile/manager.ts` | Profile management with inheritance |
| `setup/installer.ts` | Setup template installation |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `addon/` | Addon system (claude-ignore, rm-rf-guard, safety-net) |
| `cost/` | Cost tracking and budget management |
| `hook/` | Hook system for pre/post command execution |
| `mcp/` | MCP server management |
| `profile/` | Profile management with inheritance |
| `setup/` | Setup template installation and management |

## For AI Agents

### Working In This Directory

- **Manager pattern**: Each domain has a manager class (ProfileManager, AddonManager, etc.)
- **Factory functions**: Use `create*Manager()` functions for instantiation
- **Hook system**: Addons can register pre/post command hooks
- **Profile inheritance**: Profiles can inherit from base profiles
- **Template system**: Setups provide pre-packaged configurations

### Testing Requirements

- Test manager lifecycle operations (create, read, update, delete)
- Test inheritance chains for profiles
- Test hook execution order and error handling
- Use temporary directories for file system operations
- Mock external dependencies (MCP servers, network calls)

### Common Patterns

- **Manager pattern**: Central coordinator for each domain
- **Factory pattern**: `create*` functions hide implementation details
- **Hook lifecycle**: `pre*`, `post*` hooks for extensibility
- **Validation**: Use Zod schemas from `types/`
- **Path resolution**: Use `utils/paths.ts` for consistent paths

## Dependencies

### Internal
- `core/config` - Configuration management
- `types/*` - Domain type definitions
- `utils/paths` - Path resolution
- `utils/fs` - File system utilities
- `utils/logger` - Logging

### External
- `zod` - Schema validation
- `@iarna/toml` - TOML parsing
- `node:fs` - File system operations
- `node:path` - Path manipulation

<!-- MANUAL -->
