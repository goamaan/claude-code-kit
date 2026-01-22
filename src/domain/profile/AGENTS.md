<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/domain/profile/

## Purpose

Profile management with inheritance. Provides CRUD operations for profiles, profile switching, inheritance chain resolution with circular detection, import/export in TOML/JSON formats, and merged configuration resolution.

## Key Files

| File | Purpose |
|------|---------|
| `manager.ts` | High-level profile management API (433 lines) |
| `storage.ts` | Profile file storage and active profile tracking |
| `index.ts` | Public API exports |

## For AI Agents

### Working In This Directory

- **Profile structure**: `{ name, description?, extends?, skills, agents, mcp, model }`
- **Storage location**: `~/.claude-code-kit/profiles/{name}/config.toml`
- **Active profile**: Tracked in `~/.claude-code-kit/profile` (single line with profile name)
- **Inheritance**: Profiles can extend other profiles via `extends` field, resolved recursively with visited set for circular detection
- **Merge strategy**: Child profile properties override parent properties, skills/mcp enabled/disabled arrays are unioned
- **Agent merge**: Per-agent property merging (child model/priority overrides parent)
- **Resolution result**: `{ config: ProfileFileConfig, resolved: { skills, agents, mcp, model }, inheritanceChain: string[] }`
- **Import sources**: File path (directory or archive), URL (HTTP/HTTPS)
- **Export formats**: YAML (TOML), JSON (with optional resolved view)
- **Validation**: Name pattern `/^[a-z][a-z0-9-]*$/` (must start with letter)

### Testing Requirements

- Test profile creation with/without inheritance
- Test inheritance chain resolution with circular detection
- Test profile switching and active profile tracking
- Test import from file path, URL, and buffer
- Test export in both TOML and JSON formats
- Test deletion protection for active profile
- Test merge logic for skills/agents/mcp/model
- Mock file system and network operations
- Test profile listing with summary info

### Common Patterns

- **Manager interface**: `list()`, `active()`, `get()`, `create()`, `use()`, `delete()`, `export()`, `import()`
- **Resolution flow**: `resolveProfile(name, visited)` → load config → check extends → recursively resolve parent → merge → return
- **Merge logic**: Skills/MCP use Set union for enabled/disabled, agents deep merge per-agent properties
- **Active check**: Load active profile name, compare with requested profile in operations
- **Error types**: `ProfileNotFoundError`, `ProfileExistsError`, `ActiveProfileDeleteError`
- **Summary info**: `{ name, description, path, active, extends, modifiedAt, skillCount, agentCount }`
- **Details info**: Summary + `{ config, resolved, inheritanceChain, createdAt }`
- **Import validation**: Parse content → validate against ProfileFileConfigSchema → check name/overwrite → write

## Dependencies

### Internal
- `@/types` - ProfileFileConfig, ProfileSummary, ProfileDetails, CreateProfileOptions types
- `@/types` - DEFAULT_MODEL, DEFAULT_MODEL_ROUTING defaults
- `@/utils/paths` - Profile directory resolution
- `storage.ts` - ProfileStorage interface for file operations

### External
- `node:fs/promises` - Async file system operations
- `node:path` - Path manipulation
- `@ltd/j-toml` - TOML parsing and stringification
- `zod` - ProfileFileConfigSchema validation
- `fetch` - URL import support

<!-- MANUAL -->
