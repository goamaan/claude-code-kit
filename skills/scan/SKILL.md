---
description: >
  AI-enhanced codebase analysis that goes beyond deterministic scanning. Reads key files,
  discovers non-obvious conventions, and enhances .claude/CLAUDE.md with architecture insights,
  gotchas, and patterns. Use when the user wants deeper codebase analysis, asks to improve
  their project configuration, says "tech debt", "find dead code", "find duplicated code",
  "missing tests", "find TODOs", "code quality", "context dump", "summarize project",
  "project summary", or "onboard me".
user-invocable: true
allowed-tools: [Bash, Read, Write, Glob, Grep, Edit]
---

# AI-Enhanced Codebase Analysis

You are a codebase analysis expert. Your job is to enhance the .claude/ artifacts beyond what deterministic scanning provides.

## Workflow

### Step 1: Check existing artifacts

Check if `.claude/CLAUDE.md` already exists. If not, run the scanner first:

```bash
node scripts/scan.mjs "$PWD"
```

Note: `scripts/scan.mjs` is bundled alongside this skill file.

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

## Additional Workflows

### Tech Debt Analysis

Triggered by: "tech debt", "find dead code", "find duplicated code", "missing tests", "find TODOs", "code quality"

#### Step 1: Scan for Markers
```
# Find all TODO/FIXME/HACK/XXX comments
Grep: pattern="TODO|FIXME|HACK|XXX|DEPRECATED|WORKAROUND" (all source files)
```

#### Step 2: Identify Dead Code and Duplication
```
Task(subagent_type="explore", run_in_background=True,
     prompt="Find dead code: exported functions/classes that are never imported elsewhere,
     unused variables, unreachable code paths. List each with file:line...")

Task(subagent_type="architect", run_in_background=True,
     prompt="Identify duplicated logic patterns: functions that do similar things,
     copy-pasted code blocks, repeated error handling patterns. Group by similarity...")
```

#### Step 3: Find Missing Test Coverage
```
Task(subagent_type="tester",
     prompt="Find source files without corresponding test files. Check:
     - src/foo.ts → test for foo.test.ts or __tests__/foo.test.ts
     - Identify critical paths (auth, payments, data mutations) without tests
     List each untested file with a priority rating...")
```

#### Step 4: Output Report
```
## Tech Debt Report

### Summary
- TODO/FIXME comments: [N]
- Dead exports: [N]
- Duplicated patterns: [N]
- Untested source files: [N] of [M]

### Priority Items (Fix These First)
| # | Type | Location | Description | Priority |
|---|------|----------|-------------|----------|
| 1 | [type] | [file:line] | [description] | Critical |

### TODO/FIXME Comments
| File:Line | Comment | Age (git blame) |
|-----------|---------|-----------------|
| [file:line] | [comment text] | [date] |

### Dead Code
- [file:line] — [exported symbol never imported]

### Duplicated Logic
- Pattern: [description]
  - [file1:line] and [file2:line]

### Missing Tests
| Source File | Priority | Reason |
|-------------|----------|--------|
| [file] | High | Critical auth path |
```

### Context Aggregation

Triggered by: "context dump", "summarize project", "project summary", "onboard me"

Produces a single structured context document for onboarding or handoff.

#### Step 1: Gather Project Metadata
```bash
# Read project docs
cat README.md CONTRIBUTING.md .claude/CLAUDE.md 2>/dev/null

# Recent activity
git log --oneline -30
git shortlog -sn --since="30 days ago"

# Open work
gh pr list --state open --limit 10 2>/dev/null
gh issue list --state open --limit 10 2>/dev/null
```

#### Step 2: Analyze Architecture
```
Task(subagent_type="explore",
     prompt="Map the project's high-level architecture: entry points, key modules,
     data flow, external dependencies. Produce an ASCII diagram...")
```

#### Step 3: Output Context Document
```
## Project Context: [Project Name]
Generated: [date]

### Overview
[1-2 sentences from README]

### Tech Stack
- [language] + [framework] + [build tool]

### Architecture
```
[ASCII diagram of key components]
```

### Key Directories
| Directory | Purpose |
|-----------|---------|
| [dir] | [purpose] |

### Active Development
- Open PRs: [list with titles]
- Open Issues: [list with titles]
- Recent commits: [last 10 with short descriptions]

### Top Contributors (Last 30 Days)
| Author | Commits |
|--------|---------|
| [name] | [count] |

### Build & Test
```bash
[build command]
[test command]
[dev command]
```

### Known Issues / Tech Debt
[Summary from TODO/FIXME scan if available]
```

#### Optional: Save to File
If user asks, write the output to `.claude/context-dump.md` for sharing.

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
