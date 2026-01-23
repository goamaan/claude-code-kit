<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# addons/

## Purpose

Safety addons for Claude Code. Each addon provides specialized safety features through hooks that execute before/after CLI commands to prevent common mistakes and enhance security.

## Key Files

| File | Purpose |
|------|---------|
| `.gitkeep` | Placeholder to ensure directory exists in git |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `claude-ignore/` | Respects .claudeignore files to prevent accidental access to sensitive files |
| `rm-rf-guard/` | Prevents destructive `rm -rf` commands on critical directories |
| `safety-net/` | Backup and recovery system for file operations |

## For AI Agents

### Working In This Directory

- **Addon structure**: Each addon contains `addon.toml` (metadata) + `hook.ts` (implementation) + optional README
- **Hook types**: `pre-command` (before execution), `post-command` (after execution)
- **Hook interface**: Hooks receive context object with command, args, and environment
- **Installation**: Addons installed via `claudeops addon install <name>`
- **Activation**: Hooks activated when addon is enabled in profile

### Testing Requirements

- Test hook execution in isolation
- Test hook interaction with CLI commands
- Test addon enable/disable behavior
- Verify addon metadata parsing from TOML
- Test error handling in hooks (should not crash CLI)

### Common Patterns

- **Addon manifest**: `addon.toml` with name, version, description, hooks
- **Hook implementation**: Export function matching hook signature
- **Safety checks**: Validate context before executing destructive operations
- **User prompts**: Ask for confirmation before blocking operations
- **Logging**: Use logger for debugging, output for user messages

## Dependencies

### Internal
- `src/domain/addon` - Addon manager
- `src/domain/hook` - Hook executor
- `src/types/addon` - Addon schema
- `src/types/hook` - Hook schema

### External
- `@iarna/toml` - TOML parsing for addon.toml
- `zod` - Schema validation

<!-- MANUAL -->
