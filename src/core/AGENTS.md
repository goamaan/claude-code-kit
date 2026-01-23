<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/core/

## Purpose

Core infrastructure for claudeops. Provides multi-layer configuration management (global/local/runtime), diagnostic checks for system health, and sync engine to propagate configurations to `~/.claude/`.

## Key Files

| File | Purpose |
|------|---------|
| `config/manager.ts` | Multi-layer configuration manager (global, local, runtime) |
| `config/loader.ts` | Configuration file loading and validation |
| `config/writer.ts` | Configuration file writing and persistence |
| `doctor/checker.ts` | System diagnostic checks (directories, permissions, conflicts) |
| `doctor/reporter.ts` | Diagnostic report formatting and output |
| `sync/engine.ts` | Sync profiles and addons to ~/.claude/ |
| `sync/operations.ts` | File system operations for syncing |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `config/` | Multi-layer configuration management |
| `doctor/` | System diagnostics and health checks |
| `sync/` | Configuration sync to ~/.claude/ |

## For AI Agents

### Working In This Directory

- **Configuration layers**: Global (~/.claudeops/) → Local (.claude-kit/) → Runtime (in-memory)
- **Sync engine**: Propagates active profile to `~/.claude/CLAUDE.md` and addons to `~/.claude/addons/`
- **Diagnostics**: Check directory structure, file permissions, configuration conflicts
- **TOML format**: All config files use TOML serialization

### Testing Requirements

- Test configuration layer precedence (global < local < runtime)
- Test sync operations with temporary directories
- Verify diagnostic checks detect common issues
- Mock file system operations for unit tests

### Common Patterns

- **Manager pattern**: `ConfigManager`, `SyncEngine` coordinate operations
- **Layer precedence**: Runtime overrides local overrides global
- **Validation**: Use Zod schemas from `types/config.ts`
- **Error handling**: Return Result types for recoverable errors
- **Idempotency**: Sync operations safe to run multiple times

## Dependencies

### Internal
- `types/config` - Config schema definitions
- `types/diagnostic` - Diagnostic check types
- `utils/paths` - Path resolution
- `utils/fs` - File system utilities
- `utils/logger` - Logging

### External
- `@iarna/toml` - TOML parsing and serialization
- `zod` - Schema validation
- `node:fs` - File system operations
- `node:path` - Path manipulation

<!-- MANUAL -->
