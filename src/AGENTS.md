<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/

## Purpose

Main source code for claude-code-kit. Contains CLI commands, core infrastructure, domain logic, type definitions, UI components, and utilities organized in a layered architecture.

## Key Files

| File | Purpose |
|------|---------|
| `cli.ts` | Main CLI entry point, defines all commands using citty |
| `index.ts` | Public API exports for programmatic usage |
| `index.test.ts` | Basic smoke tests for public API |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `commands/` | CLI command implementations (profile, setup, addon, config, etc.) |
| `core/` | Core infrastructure (config management, diagnostics, sync) |
| `domain/` | Business logic modules (addon, cost, hook, mcp, profile, setup) |
| `types/` | Type definitions with Zod schemas |
| `ui/` | CLI output formatting and prompts |
| `utils/` | Cross-cutting utilities (constants, paths, logger, fs) |

## For AI Agents

### Working In This Directory

- **Layered architecture**: commands → domain → core → utils
- **Entry point**: `cli.ts` uses citty to define command structure
- **Factory pattern**: Use `create*` functions from domain modules
- **Type safety**: All types defined with Zod schemas in `types/`
- **CLI framework**: citty provides command routing and argument parsing

### Testing Requirements

- Run `npm test` from project root
- Tests colocated with source files (`.test.ts`)
- Integration tests in `/Users/amaan/code/claude-kit/tests/integration/`
- Use temporary directories for file system operations

### Common Patterns

- **Factory functions**: `createProfileManager()`, `createAddonManager()`, etc.
- **Zod validation**: Parse and validate all external data
- **Result types**: Use `Result<T, E>` for error handling
- **Manager pattern**: Each domain has a manager class
- **Path resolution**: Import from `utils/paths.ts`

## Dependencies

### Internal
- `core/config` - Configuration management
- `core/sync` - Sync engine to ~/.claude/
- `domain/*` - Business logic modules
- `types/*` - Type definitions
- `ui/*` - CLI output and prompts
- `utils/*` - Shared utilities

### External
- `citty` - CLI framework
- `zod` - Schema validation
- `@clack/prompts` - Interactive prompts
- `picocolors` - Terminal colors

<!-- MANUAL -->
