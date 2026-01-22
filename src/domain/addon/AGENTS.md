<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/domain/addon/

## Purpose

Plugin system for extensibility. Provides addon lifecycle management with installation from multiple sources (path/GitHub/registry), manifest validation, enable/disable toggles, and addon creation scaffolding.

## Key Files

| File | Purpose |
|------|---------|
| `manager.ts` | High-level addon management interface (507 lines) |
| `installer.ts` | Install/uninstall operations from various sources |
| `manifest-parser.ts` | Addon manifest (addon.toml) parsing and validation |
| `registry.ts` | Addon registry client for browsing/discovering addons |

## For AI Agents

### Working In This Directory

- **Installation sources**: Local path, GitHub repo (`owner/repo@ref`), registry (by name)
- **Addon structure**: Directory with `addon.toml` manifest + hook scripts
- **Manifest format**: TOML with `[addon]` metadata, `[hooks]` definitions, `[install]` config
- **Hook types**: PreToolUse, PostToolUse, Stop, SubagentStop (match hook events)
- **State tracking**: JSON file at `~/.claude-code-kit/cache/addons-state.json` with installed addons
- **Enable/disable**: Toggle via state file, affects hook composition in sync engine
- **Addon creation**: `create(name)` generates scaffold with addon.toml, hook.ts, README.md
- **Hook scripts**: Executable scripts (Bun/Node/Python) that receive JSON input via stdin and return exit code (0=allow, 1=error, 2=block)
- **Update flow**: Re-install from original source (git/registry only, local addons cannot auto-update)
- **Validation**: Name pattern `/^[a-z][a-z0-9-]*$/`, must start with letter

### Testing Requirements

- Test installation from all three source types (path, GitHub, registry)
- Test enable/disable state persistence
- Test addon creation scaffold generation
- Test manifest parsing with various valid/invalid formats
- Test update flow for git and registry addons
- Test removal and cleanup
- Mock file system and network operations
- Test hook script execution with sample inputs

### Common Patterns

- **Manager interface**: `list()`, `get()`, `install()`, `update()`, `remove()`, `create()`, `enable()`, `disable()`
- **State management**: `loadState()` → modify → `saveState()` for persistence
- **Installer delegation**: Manager delegates to `AddonInstaller` for source-specific logic
- **Registry lookup**: `getRegistry()` returns `AddonRegistry` for browsing
- **Source tracking**: Each addon records `{ type: 'registry' | 'git' | 'local', url?, ref? }`
- **Error handling**: Custom `AddonManagerError` with addon name and error code
- **Scaffold template**: Generated hook.ts includes example with exit code documentation
- **Version tracking**: installedAt, updatedAt timestamps for each addon

## Dependencies

### Internal
- `@/types` - InstalledAddon, AddonManifest, AddonHooksInput types
- `@/utils/paths` - Addon installation directory resolution
- `@/utils/fs` - File operations for addon files
- Installer, registry, manifest-parser modules

### External
- `node:fs/promises` - Async file system operations
- `node:path` - Path manipulation
- `@ltd/j-toml` - TOML parsing for addon.toml
- `tar` - Archive extraction for GitHub/registry installs
- `zod` - Manifest schema validation

<!-- MANUAL -->
