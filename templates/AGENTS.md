<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# templates/

## Purpose

Templates for creating new addons. Provides starter files with boilerplate code and documentation to help developers create custom safety addons for Claude Code.

## Key Files

| File | Purpose |
|------|---------|
| `addon.toml.template` | Template for addon manifest (metadata, hooks, dependencies) |
| `hook.ts.template` | Template for hook implementation (TypeScript) |
| `README.md.template` | Template for addon documentation |

## For AI Agents

### Working In This Directory

- **Template placeholders**: Use `{{name}}`, `{{version}}`, `{{description}}` for substitution
- **Hook signature**: Templates show correct TypeScript interface for hook functions
- **Documentation**: README template includes sections for usage, configuration, examples
- **Copy and customize**: Users copy templates to create new addons

### Testing Requirements

- Test template variable substitution
- Verify generated addon structure is valid
- Test that template hook compiles with TypeScript
- Verify README includes all necessary sections

### Common Patterns

- **Variable substitution**: Replace `{{variable}}` with actual values
- **Type safety**: Templates use proper TypeScript types from `src/types/`
- **Error handling**: Template hooks show proper error handling patterns
- **Documentation**: Include usage examples and configuration options

## Dependencies

### Internal
- `src/types/addon` - Addon type definitions
- `src/types/hook` - Hook type definitions

### External
- None (templates are static files)

<!-- MANUAL -->
