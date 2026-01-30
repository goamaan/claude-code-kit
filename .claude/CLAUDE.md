# claudeops

CLI toolkit that enhances Claude Code with profiles, skills, hooks, and sync.

## Build & Test

```bash
bun run build          # Build with tsdown (outputs to dist/)
bun run test           # Run vitest (400 tests)
bun run typecheck      # TypeScript type checking
bun run lint           # ESLint
bun run verify         # All three: typecheck + lint + test
```

Use `bun run test` (vitest), NOT `bun test` (bun's native runner has compatibility issues).

## Architecture

```
src/
  cli.ts                    # Entry point (citty CLI framework)
  commands/                 # CLI command handlers (6 commands)
  core/
    config/                 # TOML config loader + parser + merger
    sync/                   # Sync engine (generates CLAUDE.md + settings.json)
    scanner/                # Codebase scanner + detectors + generator
  domain/
    profile/                # Profile manager + storage (flat .toml files)
    skill/                  # Skill manager (markdown + YAML frontmatter)
    hook/                   # Hook manager (JSDoc metadata + sync to settings.json)
  types/                    # Zod schemas + TypeScript types
  utils/                    # Paths, constants, fs helpers
  ui/                       # Terminal output formatting
hooks/                      # Built-in hook scripts (.mjs)
skills/                     # Built-in skill definitions (.md)
```

## Key Concepts

- **Profiles**: Stored as `~/.claudeops/profiles/{name}.toml`. Support inheritance via `extends`. Active profile tracked in `~/.claudeops/active-profile`.
- **Config**: TOML format. Global at `~/.claudeops/config.toml`, profile-specific in profile files. Uses `@ltd/j-toml` parser (always pass `joiner: '\n'` for multiline support).
- **Sync**: `cops sync` writes skills to `~/.claude/skills/`, hooks to `~/.claude/settings.json`, and generates `~/.claude/CLAUDE.md`. Auto-runs after `bun run build` via postbuild script.
- **Hooks**: `.mjs` files with JSDoc metadata (`Event`, `Matcher`, `Enabled`, etc.). Loaded from builtin (repo `hooks/`), global (`~/.claudeops/hooks/`), and project (`.claude/hooks/`).
- **Skills**: Markdown files with YAML frontmatter. Synced to `~/.claude/skills/`.
- **Bundling**: tsdown bundles to `dist/`. `__dirname` is shimmed via ESM shims and resolves to `dist/` - use `findPackageRoot()` when needing the repo root.

## Code Style

- TypeScript strict mode, ESM (`"type": "module"`)
- Zod for all schema validation
- `@ltd/j-toml` for TOML parsing (always include `joiner: '\n'`, `bigint: false`)
- Index signature access via bracket notation (`obj['key']` not `obj.key`) for `Record<string, unknown>` types
- Tests colocated with source (`*.test.ts`) + integration tests in `tests/integration/`
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
