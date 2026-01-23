<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/utils/

## Purpose

Cross-cutting utilities used throughout claudeops. Provides constants, path resolution, logging, and file system helpers.

## Key Files

| File | Purpose |
|------|---------|
| `constants.ts` | Application constants (version, directories, file names) |
| `paths.ts` | Path resolution utilities (home dir, config dirs, etc.) |
| `logger.ts` | Logging utility with levels and formatting |
| `fs.ts` | File system helpers (safe read/write, directory creation, etc.) |

## For AI Agents

### Working In This Directory

- **Path resolution**: Use `paths.ts` for all directory and file path resolution
- **Constants**: Import from `constants.ts` instead of hardcoding values
- **Logging**: Use `logger.ts` for debug and info logging (not user-facing output)
- **File operations**: Use `fs.ts` helpers for safe file system operations with error handling

### Testing Requirements

- Test path resolution on different platforms (Unix, Windows)
- Test file system operations with temporary directories
- Test logger output formatting and level filtering
- Mock file system operations for unit tests

### Common Patterns

- **Path resolution**: `paths.globalConfigDir()`, `paths.localConfigDir()`, `paths.claudeDir()`
- **Safe operations**: `fs.safeReadFile()`, `fs.safeWriteFile()` return Result types
- **Directory creation**: `fs.ensureDir()` creates directories with parents
- **Logging levels**: `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`
- **Constants**: `CONSTANTS.VERSION`, `CONSTANTS.CONFIG_FILE_NAME`

## Dependencies

### Internal
- None (utilities are foundational layer)

### External
- `node:fs` - File system operations
- `node:path` - Path manipulation
- `node:os` - OS-specific utilities (home directory)
- `picocolors` - Logger colors (if used)

<!-- MANUAL -->
