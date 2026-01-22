<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/ui/

## Purpose

CLI output formatting and interactive prompts. Provides consistent terminal output with colors, tables, and structured formatting, plus interactive prompt utilities.

## Key Files

| File | Purpose |
|------|---------|
| `output.ts` | Output formatting utilities (success, error, info, tables, lists) |
| `prompts.ts` | Interactive prompt wrappers around @clack/prompts |

## For AI Agents

### Working In This Directory

- **Output consistency**: Use `output.ts` helpers for all CLI output to ensure consistent styling
- **Color usage**: Use `picocolors` for terminal colors (already wrapped in output helpers)
- **Tables**: Use `output.table()` for tabular data display
- **Prompts**: Use `prompts.ts` wrappers for interactive input (confirmation, selection, text input)
- **Error formatting**: Use `output.error()` for error messages with stack traces

### Testing Requirements

- Test output formatting with snapshot tests
- Test prompt flows with mocked stdin/stdout
- Verify color codes are applied correctly
- Test table alignment and padding
- Test error message formatting

### Common Patterns

- **Output helpers**: `output.success()`, `output.error()`, `output.info()`, `output.warn()`
- **Structured output**: `output.table()`, `output.list()`, `output.json()`
- **Interactive prompts**: `prompts.confirm()`, `prompts.select()`, `prompts.text()`
- **Conditional colors**: Detect CI environment and disable colors if needed
- **Spinner**: Use `@clack/prompts` spinner for long-running operations

## Dependencies

### Internal
- `utils/logger` - Logging integration

### External
- `picocolors` - Terminal colors
- `@clack/prompts` - Interactive CLI prompts
- `cli-table3` - Table formatting (if used)

<!-- MANUAL -->
