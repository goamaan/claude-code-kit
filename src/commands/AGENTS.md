<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/commands/

## Purpose

CLI command implementations using citty framework. Each file defines a command with arguments, options, and execution logic that delegates to domain managers.

## Key Files

| File | Purpose |
|------|---------|
| `profile.ts` | Profile management commands (create, list, switch, delete) |
| `setup.ts` | Setup template commands (install, list, info) |
| `addon.ts` | Addon commands (install, list, uninstall, info) |
| `config.ts` | Configuration commands (get, set, list) |
| `mcp.ts` | MCP server commands (add, list, remove) |
| `cost.ts` | Cost tracking commands (show, reset, budget) |
| `hook.ts` | Hook management commands (list, enable, disable) |
| `sync.ts` | Sync command (sync profiles/addons to ~/.claude/) |
| `doctor.ts` | Diagnostic command (check system health) |
| `install.ts` | Install command (setup claude-code-kit) |
| `upgrade.ts` | Upgrade command (update to latest version) |

## For AI Agents

### Working In This Directory

- **CLI framework**: Commands defined using citty's `defineCommand()`
- **Command structure**: Each command has `meta`, `args`, `options`, and `run` function
- **Delegation**: Commands delegate to domain managers (don't implement logic directly)
- **Output**: Use `ui/output.ts` for consistent formatting
- **Prompts**: Use `ui/prompts.ts` for interactive input

### Testing Requirements

- Integration tests in `/Users/amaan/code/claude-kit/tests/integration/`
- Test commands with various argument combinations
- Test error handling for invalid inputs
- Test interactive prompts (use mock stdin)
- Verify output formatting

### Common Patterns

- **Factory pattern**: Instantiate managers at command start
- **Validation**: Parse args/options with Zod schemas
- **Error handling**: Catch and format errors for CLI output
- **Prompts**: Use `@clack/prompts` for interactive flows
- **Output formatting**: Use `ui/output.ts` helpers

## Dependencies

### Internal
- `domain/*` - Business logic managers
- `core/config` - Configuration access
- `core/sync` - Sync engine
- `types/*` - Type definitions
- `ui/output` - Output formatting
- `ui/prompts` - Interactive prompts

### External
- `citty` - CLI framework (defineCommand)
- `@clack/prompts` - Interactive prompts
- `zod` - Argument validation
- `picocolors` - Terminal colors

<!-- MANUAL -->
