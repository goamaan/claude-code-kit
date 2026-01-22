<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/core/sync/

## Purpose

Bidirectional state synchronization engine. Orchestrates sync between claude-code-kit configuration and Claude Code settings (~/.claude/settings.json and CLAUDE.md), with content preservation, backup management, and diff tracking.

## Key Files

| File | Purpose |
|------|---------|
| `engine.ts` | Main sync orchestration engine (666 lines) |
| `settings-generator.ts` | Generate settings.json from merged config and hooks |
| `claudemd-generator.ts` | Generate CLAUDE.md with user content preservation |
| `backup.ts` | Backup creation before sync operations |
| `index.ts` | Public API exports |
| `engine.test.ts` | Test suite for sync engine |
| `settings-generator.test.ts` | Test suite for settings generation |
| `claudemd-generator.test.ts` | Test suite for CLAUDE.md generation |

## For AI Agents

### Working In This Directory

- **Sync targets**: `~/.claude/settings.json` (Claude Code settings), `~/.claude/CLAUDE.md` (user instructions)
- **Sync flow**: Load config/setup/addons/hooks → Generate settings/CLAUDE.md → Diff → Backup → Write
- **Content preservation**: CLAUDE.md parsing preserves user content in unmarked sections (not between `<!-- BEGIN -->` and `<!-- END -->` markers)
- **Backup strategy**: Optional timestamped backups before sync operations (default enabled)
- **Diff tracking**: Compare current vs generated state, categorize as create/modify/delete/unchanged
- **Validation**: Pre-sync validation checks config validity, required addons, profile existence
- **Dry run**: `dryRun: true` option shows changes without applying
- **Hook composition**: Combines hooks from setups and addons via `composeHooks()`
- **Settings format**: JSON with metadata (generatedAt, version, profile info)
- **Idempotency**: Sync operations safe to run multiple times (ignore volatile fields like generatedAt in comparison)

### Testing Requirements

- Test sync with temporary ~/.claude directory
- Test content preservation in CLAUDE.md (user sections not overwritten)
- Test backup creation and restoration
- Test diff detection for various change scenarios
- Test validation errors prevent sync
- Test dry-run mode doesn't modify files
- Test settings comparison ignoring volatile fields
- Mock file system operations for unit tests

### Common Patterns

- **Engine creation**: `createSyncEngine({ loadConfig, loadSetup, loadAddons })` with loader functions
- **State loading**: `loadState()` → loads config/setup/addons → composes hooks → generates settings/CLAUDE.md
- **Diff generation**: `diff()` → compare existing files with generated content → return DiffEntry[]
- **Sync operation**: `sync({ dryRun?, backup?, settingsOnly?, claudeMdOnly?, preserveUserContent? })`
- **Validation**: `validate()` → check config/setup/addons → return ValidationResult with errors/warnings
- **Comparison**: `settingsAreEqual()` strips volatile fields (generatedAt) before comparing JSON
- **Hook composition**: `composeAllHooks()` → convert setup templates to AddonHooksInput → add addon hooks → compose with priority
- **Content extraction**: Parse existing CLAUDE.md to extract user sections before regenerating

## Dependencies

### Internal
- `@/types` - MergedConfig, MergedSetup, InstalledAddon, ComposedHooks, SyncResult types
- `@/utils/fs` - File operations (readFileSafe, writeFile, exists)
- `@/utils/paths` - Path resolution (getClaudeDir, getGlobalConfigDir)
- `@/domain/hook/composer` - Hook composition (composeHooks, createEmptyHooks)
- Settings/CLAUDE.md generator modules

### External
- `node:path` - Path manipulation (join)
- `node:fs/promises` - Async file system operations
- JSON serialization for settings.json
- Markdown parsing for CLAUDE.md preservation

<!-- MANUAL -->
