<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/core/config/

## Purpose

Multi-layer configuration system for claude-code-kit. Implements 4-layer config hierarchy (global → profile → project → local) with TOML parsing, Zod validation, profile inheritance, and configuration merging with precedence rules.

## Key Files

| File | Purpose |
|------|---------|
| `loader.ts` | Configuration file discovery, loading, and layer merging (554 lines) |
| `parser.ts` | TOML parsing with Zod validation and error handling (378 lines) |
| `merger.ts` | Deep merge utilities with inheritance resolution (332 lines) |
| `loader.test.ts` | Test suite for config loading and layer precedence |
| `parser.test.ts` | Test suite for TOML parsing and validation |
| `merger.test.ts` | Test suite for merge logic and inheritance chains |

## For AI Agents

### Working In This Directory

- **4-layer system**: Global (~/.claude-code-kit/config.toml) → Profile (~/.claude-code-kit/profiles/{name}/config.toml) → Project (.claude-code-kit/config.toml) → Local (.claude-code-kit/local.toml, gitignored)
- **Layer precedence**: Local > Project > Profile > Global > Defaults (later layers override earlier)
- **Profile inheritance**: Profiles can extend other profiles via `extends` field, resolved recursively with circular detection (MAX_INHERITANCE_DEPTH = 10)
- **Merge strategy**: Objects deep merge, arrays replace (not concatenate), `enabled`/`disabled` arrays have special merging logic
- **Schema validation**: All configs validated against Zod schemas from `@/types/config`
- **Active profile**: Tracked in `~/.claude-code-kit/profile` file (single line with profile name)
- **TOML format**: Uses `@ltd/j-toml` library for parsing and serialization

### Testing Requirements

- Test configuration layer precedence (global < profile < project < local)
- Test profile inheritance chains with circular reference detection
- Test merge strategies for objects, arrays, and special `enabled`/`disabled` handling
- Test validation errors for malformed configs
- Mock file system operations for unit tests
- Test edge cases: missing files, empty configs, invalid TOML syntax

### Common Patterns

- **Load flow**: `loadConfig()` → `[loadGlobalConfig(), loadProfileConfig(), loadProjectConfig(), loadLocalConfig()]` → `merge()` → `MergedConfig`
- **Error handling**: `ConfigError` class with field path, validation issues, and file path context
- **Safe loading**: `loadProfileConfigSafe()` returns `undefined` on not found instead of throwing
- **Inheritance resolution**: `resolveInheritance()` with async `InheritanceResolver` function, supports URLs and file paths
- **Hybrid resolver**: `createHybridResolver()` combines file and URL resolvers for `extends` field
- **Caching**: `createCachedResolver()` wraps resolver to avoid re-loading same parent configs
- **Metadata tracking**: `getConfigLayers()` returns array of layers with source paths for debugging

## Dependencies

### Internal
- `@/types/config` - Config schemas (MainConfigSchema, ProfileFileConfigSchema, ProjectConfigSchema)
- `@/utils/constants` - File/directory names and max inheritance depth
- `@/utils/paths` - Path resolution (getGlobalConfigDir, getProjectConfigDir, getProfilesDir)
- `@/utils/fs` - File system utilities (exists, readFileSafe, writeFile, readDirWithTypes)

### External
- `@ltd/j-toml` - TOML parsing and stringification with multiline support
- `zod` - Schema validation and type inference
- `node:path` - Path manipulation (join, resolve)
- `node:fs` - File system operations via utils

<!-- MANUAL -->
