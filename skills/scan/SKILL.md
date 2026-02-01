---
name: scan
description: AI-enhanced .claude/ artifacts with deep codebase analysis
user-invocable: true
disable-model-invocation: true
allowed-tools: [Bash, Read, Write, Glob, Grep, Edit]
---

# AI-Enhanced Codebase Analysis

You are a codebase analysis expert. Your job is to enhance the .claude/ artifacts beyond what deterministic scanning provides.

## Workflow

### Step 1: Check existing artifacts

Check if `.claude/CLAUDE.md` already exists. If not, run the scanner first:

```bash
node <plugin>/scripts/scan.mjs "$PWD"
```

Use the JSON output to generate a baseline `.claude/CLAUDE.md`. Then read the generated file to understand what the deterministic scan already captured.

### Step 2: Read key files for deeper context

Based on the project, read the most important files to understand it:
- README.md (project overview)
- Main config files (package.json, pyproject.toml, Cargo.toml, etc.)
- Entry points (src/index.ts, main.go, etc.)
- Contributing guidelines if present
- Schema files (prisma/schema.prisma, etc.)

### Step 3: Enhance CLAUDE.md

Review the existing CLAUDE.md and enhance it with insights that deterministic scanning can't provide:
- Non-obvious conventions discovered from reading code
- Architecture insights from entry point analysis
- Common gotchas or patterns
- Environment setup notes

**Important:** Preserve any existing managed sections. Add your enhancements in a way that doesn't conflict with future automated updates.

### Step 4: Generate .claude/skills/ (only if warranted)

Only create skills if the project has notable domain-specific patterns worth documenting. Most projects don't need custom skills.

Good reasons to create a skill:
- Complex API patterns (e.g., custom middleware chain, specific error handling conventions)
- Non-obvious database conventions (e.g., soft deletes, specific migration patterns)
- Custom auth flow that differs from framework defaults
- Domain-specific business logic patterns

Each skill should be:
- A directory under `.claude/skills/` with a `SKILL.md` file
- Has proper frontmatter: `name`, `description`, `user-invocable: false`
- Describes HOW things are done in THIS specific codebase
- Short and focused (under 50 lines)

### Step 5: Update .claude/settings.json

If the project has linters/formatters, add appropriate hooks:
- Auto-format on file save (if prettier/black/rustfmt detected)
- Permission allowlists for detected build tools

If settings.json already exists, MERGE — don't overwrite.

## Important Rules

1. **Preserve existing .claude/ content** — if CLAUDE.md already exists, ask the user before overwriting
2. **Preserve managed sections** — don't overwrite automated/managed content sections
3. **Be concise** — Claude reads this every session, brevity matters
4. **Be specific** — use actual commands from the project, not generic ones
5. **Don't over-generate** — fewer, better files beat many mediocre ones
6. **Git-friendly** — everything goes in `.claude/` which teams can commit

## Example Enhanced CLAUDE.md Output

```markdown
# Project Conventions

## Commands
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`

## Tech Stack
- TypeScript
- React
- Vitest for testing
- ESLint

## Architecture
- `src/core/` — Core business logic
- `src/commands/` — CLI commands

## Conventions
- ESM-only (type: "module" in package.json)
- Zod schemas for all config types
- Tests colocated with source files (*.test.ts)
- Use bracket notation for index signature access (`obj['key']` not `obj.key`)

## Gotchas
- Always pass `joiner: '\n'` when using the TOML parser
- Use `findPackageRoot()` instead of `__dirname` for repo root
```
