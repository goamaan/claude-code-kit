---
description: Interactive project setup — scan codebase and generate .claude/CLAUDE.md with orchestration instructions and .claude/settings.json with permissions.
user-invocable: true
disable-model-invocation: true
allowed-tools: [Bash, Read, Write, Glob, Grep, Edit, AskUserQuestion]
---

# Project Initialization Skill

Initialize a project with claudeops by scanning the codebase and generating `.claude/` configuration files with embedded orchestration.

## Execution Steps

### 1. Run the Scanner

Execute the deterministic scanner to detect project characteristics:

```bash
node scripts/scan.mjs "$PWD"
```

Note: `scripts/scan.mjs` is bundled alongside this skill file.

The scanner outputs JSON containing:
- Detected languages and frameworks
- Build tools and package managers
- Test frameworks
- Project structure
- Configuration files
- Common commands

### 2. Parse Scanner Output

Extract the following from the JSON:
- `projectName`: from package.json or directory name
- `languages`: detected programming languages
- `frameworks`: web frameworks, test frameworks, build tools
- `buildCommands`: detected build/test/dev commands
- `structure`: key directories and their purposes
- `configFiles`: important configuration files
- `packageManager`: npm, yarn, pnpm, bun, etc.

### 3. Filter Agent Catalog

Based on scan results, determine which agents are relevant to this project:

| Scan Signal | Agents Included |
|-------------|----------------|
| Always | `architect`, `executor`, `explore` |
| Frontend detected (React/Vue/Svelte/Angular/CSS/Tailwind) | + `designer` |
| Test framework or test scripts detected | + `tester` |
| Web framework, API, auth deps detected | + `security` |
| Complex project (>3 languages, monorepo, large) | + `researcher` |

**Detection heuristics:**
- **Frontend**: Look for React, Vue, Svelte, Angular, Next.js, Nuxt, SvelteKit, Remix, Astro in dependencies; CSS/SCSS/Tailwind files; `src/components/` or similar directories
- **Test framework**: Look for jest, vitest, mocha, pytest, go test, cargo test, JUnit in dependencies or config; `test/`, `tests/`, `__tests__/`, `*.test.*`, `*.spec.*` directories/files; test scripts in package.json
- **Web/API/Security**: Look for express, fastify, koa, django, flask, gin, actix, spring in dependencies; auth libraries (passport, next-auth, clerk, auth0); API route directories
- **Complex**: More than 3 languages detected; monorepo tools (nx, turborepo, lerna, pnpm workspaces); large file count (>500 source files)

### 4. Clarify with User

Use AskUserQuestion to resolve ambiguities and gather preferences:

- If multiple build commands detected: "Which is your primary build command?"
- If multiple test runners: "Which test framework should I prioritize?"
- "Are there any code conventions or patterns I should enforce?"
- "Any critical files or directories I should highlight?"
- "Should I add any custom build permissions to settings.json?"

**Anti-pattern**: Do NOT ask questions the scanner already answered (e.g., "what package manager do you use?" when package.json exists).

### 5. Check for Existing Configuration

Before generating files, check if `.claude/CLAUDE.md` exists using the Read tool or Glob tool (cross-platform). Do NOT use shell commands with `2>/dev/null` as they don't work on Windows.

If it exists:
- Read the current file
- Ask: "A .claude/CLAUDE.md already exists. Should I (o)verwrite, (m)erge, or (c)ancel?"
- If merge: preserve user-added sections, update detected content

### 6. Generate .claude/CLAUDE.md with Orchestration

Create a concise, scannable reference document with embedded orchestration instructions. Claude reads this every session, so brevity is critical.

**Template**:

````markdown
# {Project Name}

{One-line description from package.json or user input}

## Build & Test

```bash
{primary-build-command}    # Build description
{primary-test-command}     # Test description
{dev-command}              # Dev server (if applicable)
```

## Tech Stack

- **Language**: {detected language + version}
- **Framework**: {primary framework}
- **Build Tool**: {build tool}
- **Test Framework**: {test framework}
- **Package Manager**: {npm/yarn/pnpm/bun}

## Architecture

```
{key directories from scanner with brief descriptions}
```

## Code Style

- {convention 1}
- {convention 2}
- {detected linter config, e.g., "ESLint + Prettier"}

## Important Files

- `{file}`: {purpose}
- `{file}`: {purpose}

## Orchestration

You are a conductor. Delegate all implementation work to specialized agents.

### Available Agents

{Generate a table with ONLY the agents included by the filter in step 3}

| Agent | Model | Use For |
|-------|-------|---------|
| architect | opus | Deep analysis, debugging, system design, performance review, plan critique |
| executor | sonnet | Code changes of any complexity, bug fixes, refactoring |
| explore | haiku | File search, codebase discovery, structure mapping |
{if designer included:}
| designer | sonnet | UI/UX, component creation, styling, responsive layouts |
{if tester included:}
| tester | sonnet | Test planning, TDD workflow, test writing, quality assurance |
{if security included:}
| security | opus | Security audit, threat modeling, vulnerability assessment |
{if researcher included:}
| researcher | sonnet | Technology evaluation, best practices, API analysis |

### Delegation Rules

- Code changes → executor
- Deep analysis, debugging, architecture review → architect
- Codebase search and discovery → explore
{if designer included:}
- UI/frontend work → designer
{if tester included:}
- Test writing and execution → tester
{if security included:}
- Security analysis and auditing → security
{if researcher included:}
- Research and technology evaluation → researcher
- Plan and decision review → architect (review mode)

### Orchestration Patterns

- **Independent subtasks** → spawn agents in parallel (fan-out)
- **Sequential dependencies** → pipeline (pass results forward)
- **Complex dependencies** → task graph (TaskCreate with blockedBy)
- **Uncertain approach** → speculative (try 2-3 approaches, pick best)

### Worker Prompt Template

Structure every agent prompt with 5 elements:

1. **Preamble**: "You are a [agent-type] agent working on a specific subtask."
2. **Context**: Project description, tech stack, previous results, relevant files
3. **Scope**: Precise task description + DO/DO NOT boundaries
4. **Constraints**: Read before modify, match patterns, verify after changes
5. **Expected Output**: Files modified, changes made, verification results

### Subagent Context Management

- **Direct** (no subagent): Single-file changes under ~20 lines, simple renames, config tweaks
- **Delegate**: Multi-file changes, anything requiring exploration, changes needing verification
- **Context budget**: Only include files the agent needs to touch — less is more
- **Explore first**: Always use explore agent to identify relevant files before passing to executor
- **Keep main context clean**: Orchestrator context is for coordination, not implementation

### Intent Routing

| User Says | Skill | Mode |
|-----------|-------|------|
| "build me X", "autopilot", "full auto" | autopilot | Pipeline/Swarm |
| "plan first", "plan before coding" | autopilot | Plan-First |
| "worktrees", "parallel branches" | autopilot | Parallel Worktree |
| "debug", "fix bug", "why is X broken" | debug | Diagnose-Hypothesize-Fix |
| "fix CI", "pipeline failed" | debug | CI/Pipeline |
| "fix containers", "docker broken" | debug | Container |
| [pastes error with no context] | debug | Paste-and-Fix |
| "review", "audit", "PR review" | review | PR Review |
| "grill me", "challenge", "prove it works" | review | Adversarial |
| "explain", "how does this work", "teach me" | review | Explain |
| "scan", "analyze codebase" | scan | Full Scan |
| "tech debt", "find dead code", "TODOs" | scan | Tech Debt |
| "context dump", "summarize project" | scan | Context Aggregation |
| "query", "SQL", "analytics" | query | Query |
| "capture learning", "save this" | learn | Capture |

## Rules

<!-- Rules are auto-captured from corrections. Run corrections naturally and they'll appear here. -->
````

**Guidelines**:
- Keep total length under 120 lines
- Use bullet points, not paragraphs
- Highlight only critical information
- Skip empty sections
- Focus on what Claude needs to know to make code changes
- The orchestration section is always included

### 7. Generate/Merge .claude/settings.json

Create or update settings.json with appropriate permissions for detected tools.

**Example structure**:

```json
{
  "allowedCommands": {
    "{packageManager} install": "allow",
    "{packageManager} run build": "allow",
    "{packageManager} run test": "allow",
    "{buildTool}": "allow"
  },
  "allowedPaths": {
    "read": ["**/*"],
    "write": [
      "src/**/*",
      "tests/**/*",
      "{other-source-dirs}/**/*"
    ]
  }
}
```

If settings.json exists, merge the allowedCommands and allowedPaths arrays intelligently:
- Read existing file
- Add new detected commands that aren't already present
- Preserve user-added custom commands
- Sort alphabetically for consistency

### 8. Verify and Report

After generation:
- Confirm files were written
- Show the user where files were created
- List the key detected features
- List which agents were included and why
- Suggest next steps (e.g., "Review and customize `.claude/CLAUDE.md`")

## Anti-Patterns

- Don't ask the user to confirm information the scanner already detected
- Don't generate verbose documentation - this is a reference, not a tutorial
- Don't add speculative sections (e.g., "Deployment" if no deploy config exists)
- Don't overwrite user content without asking
- Don't add commands to allowedCommands that weren't actually detected
- Don't include agents that aren't relevant to the detected project

## Example Output

```
Project initialized successfully.

Created:
- .claude/CLAUDE.md (98 lines)
- .claude/settings.json (merged with existing)

Detected:
- TypeScript + Node.js project
- Bun package manager
- Vitest test framework
- Express API framework

Agents included:
- architect, executor, explore (always)
- tester (vitest detected)
- security (express API detected)

Excluded:
- designer (no frontend detected)
- researcher (single language, not complex)

Next steps:
1. Review .claude/CLAUDE.md and customize as needed
2. Run `/claudeops:scan` for AI-enhanced analysis
```
