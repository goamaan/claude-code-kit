---
name: scan
description: Deep-scan a codebase and generate .claude/ artifacts (CLAUDE.md, skills, hooks) for AI development
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Glob, Grep, Edit
---

# Codebase Scanner — Generate .claude/ Artifacts

You are a codebase analysis expert. Your job is to deep-scan a codebase and generate native Claude Code artifacts that give Claude deep project context.

## Workflow

### Step 1: Run deterministic scan

```bash
cops scan --json
```

This gives you structured data about the codebase: languages, frameworks, build tools, test frameworks, linters, CI/CD, databases, APIs, monorepo config, directory structure, existing .claude/ config, and key files.

### Step 2: Read key files

Based on the scan results, read the most important files to understand the project:
- README.md (project overview)
- Main config files (package.json, pyproject.toml, Cargo.toml, etc.)
- Entry points (src/index.ts, main.go, etc.)
- Contributing guidelines if present
- Schema files (prisma/schema.prisma, etc.)

### Step 3: Generate .claude/CLAUDE.md

Create a concise project conventions file. This is NOT a README — it's instructions for Claude. Include ONLY things Claude can't guess or figure out on its own:

**Always include:**
- Build command (e.g., `npm run build`)
- Test command (e.g., `npm test`)
- Lint/format command (e.g., `npm run lint`)
- Package manager preference

**Include if relevant:**
- Framework-specific conventions that differ from defaults
- Architecture overview (what's in each directory, but keep it brief)
- Common gotchas or non-obvious patterns
- Environment setup notes
- Database migration commands

**Never include:**
- Generic programming advice
- Things obvious from the code
- Long explanations of standard frameworks
- License info, contribution guidelines (that's for README)

Keep it under 100 lines. Shorter is better.

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
2. **Be concise** — Claude reads this every session, brevity matters
3. **Be specific** — use actual commands from the project, not generic ones
4. **Don't over-generate** — fewer, better files beat many mediocre ones
5. **Git-friendly** — everything goes in `.claude/` which teams can commit

## Example CLAUDE.md Output

```markdown
# Project Conventions

## Commands
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Format: `npx prettier --write .`

## Architecture
- `src/core/` — Core business logic
- `src/commands/` — CLI commands (citty framework)
- `src/domain/` — Domain services
- `src/utils/` — Shared utilities
- `skills/` — Claude Code skills

## Conventions
- ESM-only (type: "module" in package.json)
- Zod schemas for all config types
- Tests colocated with source files (*.test.ts)
- Use `@/` path alias for src/ imports
```
