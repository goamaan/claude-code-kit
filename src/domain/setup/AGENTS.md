<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/domain/setup/

## Purpose

Setup template management. Pre-packaged configurations combining skills, agents, hooks, and CLAUDE.md content. Supports builtin and user-created setups, import/export as tar.gz archives, setup extension/merging, and scaffold generation.

## Key Files

| File | Purpose |
|------|---------|
| `manager.ts` | High-level setup management API (538 lines) |
| `loader.ts` | Setup loading from directories, archives, and URLs |
| `merger.ts` | Setup merging with precedence rules |
| `manifest-parser.ts` | Setup manifest (manifest.toml) parsing and validation |
| `index.ts` | Public API exports |

## For AI Agents

### Working In This Directory

- **Setup structure**: Directory with `manifest.toml` + `CLAUDE.md` + optional hook scripts
- **Manifest format**: TOML with `[setup]` metadata, `[skills]`, `[hooks]`, `[requires]` sections
- **Builtin location**: `<project-root>/setups/` (shipped with package)
- **User location**: `~/.claude-code-kit/setups/` (user-created)
- **Setup types**: builtin (immutable, shipped), user (mutable, can be deleted)
- **Extension**: Setups can extend other setups, merged with `mergeSetups()` (array order = precedence)
- **Merge strategy**: Later setups override earlier, skills/hooks are appended and deduplicated
- **Hook templates**: Setup hooks are templates with `{ name, matcher, handler, priority }`, converted to actual hooks during composition
- **Archive format**: tar.gz with single top-level directory containing setup files
- **CLAUDE.md**: Markdown content loaded as setup `content` field
- **Requires**: Can specify required addons in manifest

### Testing Requirements

- Test setup loading from builtin/user directories
- Test setup creation with/without base setup
- Test setup import from file path, URL, and buffer
- Test setup export as tar.gz archive
- Test setup merging with multiple bases
- Test manifest parsing with various valid/invalid formats
- Test setup deletion (user only, not builtin)
- Mock file system and network operations
- Test archive extraction and directory copying

### Common Patterns

- **Manager interface**: `list()`, `get()`, `apply()`, `create()`, `export()`, `import()`, `delete()`, `exists()`
- **Loading precedence**: Try user directory first, then builtin
- **Apply flow**: `apply(name, extends_)` → load all setups → `mergeSetups()` → return MergedSetup
- **Merge order**: extends_[0], extends_[1], ..., name (later overrides earlier)
- **Creation**: `create(name, from?)` → load base setups → merge → generate manifest → write CLAUDE.md
- **Export**: Find setup directory → `tar.create()` → read buffer → return Uint8Array
- **Import**: Extract archive/read directory → load manifest → validate name → copy to user directory
- **Error types**: `SetupManagerError` with code ('SETUP_NOT_FOUND', 'SETUP_EXISTS', 'INVALID_NAME', 'CREATE_FAILED', 'CANNOT_DELETE_BUILTIN')
- **Manifest generation**: `generateManifestToml(name, version, merged?)` creates TOML string

## Dependencies

### Internal
- `@/types` - SetupMetadata, LoadedSetup, MergedSetup types
- loader, merger, manifest-parser modules
- Path resolution utilities

### External
- `node:fs/promises` - Async file system operations
- `node:path` - Path manipulation
- `node:os` - Temp directory access (tmpdir)
- `tar` - Archive creation and extraction (from 'tar' package)
- `@ltd/j-toml` - TOML parsing for manifest.toml
- `zod` - Manifest schema validation

<!-- MANUAL -->
