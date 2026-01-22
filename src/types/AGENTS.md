<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/types/

## Purpose

Type definitions with Zod schemas for runtime validation. All domain types (config, setup, addon, hook, profile, mcp, cost, diagnostic) are defined here with TypeScript types inferred from Zod schemas.

## Key Files

| File | Purpose |
|------|---------|
| `config.ts` | Configuration file schemas (global, local, runtime) |
| `setup.ts` | Setup template manifest schema |
| `addon.ts` | Addon manifest and metadata schema |
| `hook.ts` | Hook definition and execution context schema |
| `profile.ts` | Profile schema with inheritance support |
| `mcp.ts` | MCP server configuration schema |
| `cost.ts` | Cost tracking and budget schema |
| `diagnostic.ts` | System diagnostic check result schema |

## For AI Agents

### Working In This Directory

- **Zod-first**: Define schemas with Zod, infer TypeScript types with `z.infer<>`
- **Validation**: Use `.parse()` for strict validation, `.safeParse()` for error handling
- **Type inference**: Export both schema and inferred type (e.g., `ConfigSchema` and `Config`)
- **Composition**: Compose complex schemas from simpler ones using `.extend()`, `.merge()`, `.pick()`, etc.

### Testing Requirements

- Test schema validation with valid and invalid inputs
- Test edge cases (optional fields, defaults, unions)
- Test schema composition and extension
- Verify error messages are helpful for debugging

### Common Patterns

- **Schema naming**: `*Schema` for Zod schema, plain name for inferred type
- **Export both**: `export const ConfigSchema = z.object(...)` and `export type Config = z.infer<typeof ConfigSchema>`
- **Defaults**: Use `.default()` for optional fields with defaults
- **Transforms**: Use `.transform()` to normalize data (e.g., path expansion)
- **Refinements**: Use `.refine()` for cross-field validation

## Dependencies

### Internal
- None (types are foundational layer)

### External
- `zod` - Schema validation and type inference

<!-- MANUAL -->
