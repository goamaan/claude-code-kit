---
description: >
  Deep project initialization that creates comprehensive CLAUDE.md context. Analyzes codebase with
  multiple specialized agents, interviews user for tacit knowledge, and generates project-level context
  that enables paste-a-bug-and-fix workflows. Use when the user says "init", "initialize",
  "setup claude", "configure project", or wants to improve their CLAUDE.md.
user-invocable: true
disable-model-invocation: true
allowed-tools: [Read, Write, Glob, Grep, Edit, AskUserQuestion, Task]
---

# Deep Project Initialization

Initialize a project with comprehensive context that enables Claude to understand and fix issues with minimal back-and-forth.

## Philosophy

The goal is to create a CLAUDE.md that contains everything Claude needs to:
1. Understand what this project does
2. Know where to look for any given issue
3. Understand patterns, conventions, and gotchas
4. Execute common workflows without asking

**Keep it scannable**: Claude reads this every session. Brevity with density is the goal.

## Execution Flow

### Step 1: Check for Existing CLAUDE.md

Search for existing CLAUDE.md files in priority order:

```
./.claude/CLAUDE.md          # Project (preferred location)
./CLAUDE.md                   # Project root
~/.claude/CLAUDE.md           # User-level (don't modify)
```

Use Glob and Read tools (NOT shell commands) for cross-platform compatibility.

### Step 2: Present Options to User

Use AskUserQuestion with these options:

**If CLAUDE.md exists:**
```
question: "Found existing CLAUDE.md. How should we proceed?"
options:
  - label: "Enhance (Recommended)"
    description: "Deep dive with multiple agents, add comprehensive context while preserving your existing content"
  - label: "Minimal"
    description: "Quick analysis, essential commands and routing table only"
  - label: "Fresh Start"
    description: "Replace with new comprehensive CLAUDE.md (backs up existing)"
```

**If no CLAUDE.md exists:**
```
question: "No CLAUDE.md found. How comprehensive should the setup be?"
options:
  - label: "Full Deep Dive (Recommended)"
    description: "Multiple agents analyze codebase, interview you for tacit knowledge"
  - label: "Quick Setup"
    description: "Fast analysis, minimal questions, basic initialization"
```

### Step 3: Foundation Analysis (Always Runs First)

Spawn the foundation agent to gather essential project metadata. This agent extracts what a deterministic scanner would find, but with semantic understanding.

```
Task(subagent_type="claudeops:explore",
     prompt="Analyze this project's foundation. Output ONLY a structured report with these exact sections:

## Project Identity
- **Name**: (from package.json, Cargo.toml, go.mod, pyproject.toml, or directory name)
- **Description**: (from README first line or package description)

## Languages
List each language found with file count (scan top 5 directory levels, skip node_modules/.git/dist/build/vendor):
- TypeScript: N files (.ts, .tsx)
- Python: N files (.py)
(etc.)

## Package Manager
Identify: npm | yarn | pnpm | bun | pip | poetry | cargo | go | maven | gradle | dotnet | composer | bundler | mix
Evidence: (which lockfile or config found)

## Commands
Extract from package.json scripts, Makefile, pyproject.toml, Cargo.toml, etc:
- **Build**: command or 'none'
- **Test**: command or 'none'
- **Dev**: command or 'none'
- **Lint**: command or 'none'
- **Typecheck**: command or 'none'

## Frameworks Detected
List frameworks found in dependencies/imports:
- React (from package.json)
- FastAPI (from requirements.txt)
(etc.)

## Project Type Signals
Answer yes/no with evidence:
- **Has Frontend**: yes/no (React/Vue/Svelte/Angular/CSS files)
- **Has Backend/API**: yes/no (Express/FastAPI/Rails/API routes)
- **Has Tests**: yes/no (test files, jest/pytest/etc config)
- **Has Auth**: yes/no (auth libraries, login routes)
- **Is Monorepo**: yes/no (workspaces, lerna, turborepo, nx)

## Config Files Found
List key config files:
- tsconfig.json
- .eslintrc
- docker-compose.yml
(etc.)

## Directory Structure
Show top-level directories with one-line purpose:
```
src/        # Main source code
tests/      # Test files
docs/       # Documentation
```

Be thorough but concise. This forms the foundation for deeper analysis.")
```

Wait for this agent to complete before proceeding. Parse its output to determine which specialist agents to spawn.

### Step 4: Generate/Merge settings.json (REQUIRED — do this immediately)

Using the package manager and build tool from the foundation analysis, create or merge `.claude/settings.json` NOW, before spawning deep-dive agents. This step is critical — without the env var, agent teams will not work.

Read existing `.claude/settings.json` if it exists. Merge the following, preserving any existing user permissions:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "permissions": {
    "allow": [
      "Bash({packageManager} install*)",
      "Bash({packageManager} run *)",
      "Bash({packageManager} test*)",
      "Bash({buildTool} *)",
      "Bash(git status)",
      "Bash(git diff*)",
      "Bash(git log*)"
    ]
  }
}
```

Replace `{packageManager}` and `{buildTool}` with values from the foundation analysis. Omit lines where the value is "none". If settings.json already has the `env` and `permissions` keys, merge — do not overwrite existing entries.

Write the file with the Write tool. Confirm it was written before proceeding.

### Step 5: Deep Dive with Parallel Agents (if Enhance/Full mode)

Based on the foundation analysis, spawn specialist agents in parallel:

**Always spawn (for Full/Enhance mode):**

```
Task(subagent_type="claudeops:architect", run_in_background=true,
     prompt="Analyze the architecture deeply:
     1. Read main entry points and trace the application flow
     2. Identify key abstractions and patterns used
     3. Find the data layer (database, API clients, state management)
     4. Identify external service integrations
     5. Note any unusual or clever patterns
     6. Find where errors are handled and logged
     Output as structured markdown with file:line references.")

Task(subagent_type="claudeops:researcher", run_in_background=true,
     prompt="Extract project context from documentation:
     1. Read README.md thoroughly - extract product description, setup instructions
     2. Read CONTRIBUTING.md if exists - extract workflow expectations
     3. Read any docs/ directory for architecture decisions
     4. Look for ADRs (Architecture Decision Records)
     5. Find any API documentation or OpenAPI specs
     Output key findings as structured markdown.")
```

**Conditionally spawn based on foundation analysis:**

```
# If frontend detected (Has Frontend: yes)
Task(subagent_type="claudeops:designer", run_in_background=true,
     prompt="Analyze the frontend:
     1. Identify component library/framework patterns
     2. Find styling approach (CSS modules, Tailwind, styled-components)
     3. Map component hierarchy and shared components
     4. Identify state management patterns
     5. Find any design system or theme configuration
     Output as structured markdown.")

# If tests detected (Has Tests: yes)
Task(subagent_type="claudeops:tester", run_in_background=true,
     prompt="Analyze testing patterns:
     1. Find test configuration files
     2. Identify testing patterns (unit, integration, e2e)
     3. Find test utilities, fixtures, mocks
     4. Check coverage configuration
     5. Note any testing conventions (naming, organization)
     Output as structured markdown.")

# If backend/API or auth detected
Task(subagent_type="claudeops:security", run_in_background=true,
     prompt="Analyze security-sensitive areas:
     1. Find authentication implementation
     2. Identify authorization patterns
     3. Locate API route definitions
     4. Find input validation patterns
     5. Check for secrets management approach
     Output as structured markdown with sensitivity notes.")
```

Wait for all background agents to complete, then collect their findings.

### Step 6: User Interview

Based on agent findings, ask targeted questions. Use AskUserQuestion for each.

**Always ask:**

```
question: "In 1-2 sentences, what does this product do?"
header: "Product"
options:
  - label: "Let me type it"
    description: "I'll provide a custom description"
  - label: "Skip"
    description: "Use what was found in README"
```

```
question: "Any gotchas or footguns that trip people up?"
header: "Gotchas"
options:
  - label: "Yes, let me list them"
    description: "I know some pain points"
  - label: "None that I know of"
    description: "Skip this section"
```

```
question: "Any unwritten coding rules not captured in linter configs?"
header: "Conventions"
options:
  - label: "Yes, I have some"
    description: "Things like naming conventions, patterns to follow"
  - label: "Just follow the linter"
    description: "No additional conventions"
```

```
question: "Which parts of the codebase need extra care when modifying?"
header: "Sensitive Areas"
options:
  - label: "Let me specify"
    description: "Auth, payments, critical paths, etc."
  - label: "Nothing special"
    description: "Standard care everywhere"
```

**Ask based on findings:**

- If complex auth found: "We found auth in {path}. Anything tricky about it?"
- If multiple databases: "We found {db1} and {db2}. When should each be used?"
- If monorepo: "Which packages are most actively developed?"

### Step 7: Generate CLAUDE.md

Create `.claude/CLAUDE.md` with this structure (keep under 600 lines):

````markdown
# {Project Name}

{One-line product description from user or README}

## Quick Reference

```bash
{build_cmd}    # Build
{test_cmd}     # Test
{dev_cmd}      # Dev server
{lint_cmd}     # Lint
```

## Architecture

```
{ASCII diagram or directory tree from explore agent}
```

### Key Entry Points
- `{main_entry}` - {description}
- `{api_entry}` - {description}

### Data Layer
- {database/ORM info from architect agent}
- {API clients, external services}

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | {lang + version} |
| Framework | {framework} |
| Database | {db} |
| Testing | {test framework} |
| Build | {build tool} |

## Conventions

{From foundation analysis + user interview}
- {convention 1}
- {convention 2}

## Gotchas

{From user interview + agent discoveries}
- {gotcha 1}
- {gotcha 2}

## Feature Map

| Feature | Location | Notes |
|---------|----------|-------|
| {feature} | `{path}` | {notes} |

## Common Workflows

### Add a new API endpoint
{Steps specific to this project}

### Add a database migration
{Steps specific to this project}

### Run specific tests
{Commands specific to this project}

## Sensitive Areas

{From security agent + user interview}
- `{path}` - {why it's sensitive}

## Task Routing

**Plan first, code second.** For any non-trivial change, create a plan and get user approval before writing code. Only skip planning for truly trivial tasks (typos, config tweaks, single-line fixes). Say "skip planning" or "just do it" to bypass.

| Complexity | Signals | Strategy |
|------------|---------|----------|
| **High** | 3+ files, cross-module, integration/migration, needs exploration | `/claudeops:autopilot` — discovery, architect-reviewed plan (user approves), agent teams, verification |
| **Medium** | 2-3 files, single module, clear scope | Use plan mode (`Shift+Tab` or `EnterPlanMode`) → explore, write plan → user approves → implement |
| **Low** | Single file, config tweak, typo, rename | Direct execution (no plan needed) |

Key heuristics:
- If you need to explore the codebase before knowing what to change → autopilot
- If you know what to change but it touches 2+ files → enter plan mode, plan, get approval, then implement
- If it's a single obvious change → just do it

### Execution Strategies

| Strategy | When to Use |
|----------|-------------|
| **Agent Team** | 3+ parallel work streams, competing hypotheses, cross-cutting review |
| **Subagent** | Focused single task, sequential pipeline |
| **Direct** | Single-file changes, known fixes |

## Rules

- **Always plan before coding** — For any non-trivial change (2+ files, new feature, refactor), use plan mode (`Shift+Tab` or `EnterPlanMode`) to explore and create a plan, then get user approval before writing code. For high-complexity tasks, use `/claudeops:autopilot` which has its own planning phase. Only skip for truly trivial tasks (typos, config tweaks, single-line fixes). Say "skip planning" or "just do it" to bypass.
- Always run `{lint_cmd}` after modifying code
- Always run `{typecheck_cmd}` after TypeScript changes
- Never commit directly to main/master
- Never commit .env, credentials, or secrets
- Complete all tasks before ending session

<!-- Additional rules will be added here as corrections are made -->
````

### Step 8: Generate Path-Specific Rules (if warranted)

If the project has distinct areas with different conventions, create `.claude/rules/` files:

```markdown
# .claude/rules/api.md
---
paths:
  - "src/api/**"
  - "src/routes/**"
---

# API Development Rules

- All endpoints must validate input with {validation_lib}
- Use {error_format} for error responses
- Include OpenAPI comments for documentation
```

```markdown
# .claude/rules/testing.md
---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "tests/**"
---

# Testing Conventions

- Use {describe/it pattern or other}
- Mock external services with {mocking approach}
- Test files live {colocated or in tests/}
```

Only create rules files if there are genuinely different conventions for different paths.

### Step 9: Backup and Write

If replacing existing CLAUDE.md:
1. Copy existing to `.claude/CLAUDE.md.backup.{timestamp}`
2. Write new CLAUDE.md

### Step 10: Summary Report

Output a summary:

```
Project initialized successfully.

Created/Updated:
- .claude/CLAUDE.md ({N} lines)
- .claude/settings.json (merged)
{if rules created:}
- .claude/rules/api.md
- .claude/rules/testing.md

Analysis Summary:
- {language} + {framework} project
- {N} key directories mapped
- {N} entry points identified
- {N} conventions documented
- {N} gotchas captured

Agents used:
- explore: foundation analysis
- architect: architecture deep dive
- researcher: documentation review
{conditional agents}

Your CLAUDE.md is now optimized for:
- Paste a bug → Claude knows where to look
- Request a feature → Claude knows patterns to follow
- Ask about anything → Claude has context

Next: Review .claude/CLAUDE.md and customize as needed.
```

## Minimal Mode

If user selects "Minimal" or "Quick Setup":

1. Run foundation analysis only (single explore agent)
2. Generate/merge settings.json immediately (same as Step 4 above — this is REQUIRED even in minimal mode)
3. Skip user interview (or ask only product description)
4. Generate basic CLAUDE.md with:
   - Commands
   - Tech stack
   - Basic structure
   - Agent routing table
   - Standard rules

Keep it under 100 lines.

```
Task(subagent_type="claudeops:explore",
     prompt="Quick project scan. Output:
     1. Project name and one-line description
     2. Main language and framework
     3. Package manager and key commands (build/test/dev/lint)
     4. Top-level directory structure with purposes
     5. Key entry points
     Keep it brief - this is for minimal setup.")
```

## Anti-Patterns

- Don't generate verbose prose - use bullets and tables
- Don't add speculative sections
- Don't overwrite without backup
- Don't create rules files unless genuinely needed
- Don't exceed 600 lines in CLAUDE.md (use @imports for more)
- Don't include agents that aren't relevant to the project
- Don't ask questions the agents already answered definitively

## Using @imports for Large Projects

If the project needs more documentation than fits in 600 lines, use @imports:

```markdown
## Architecture
@docs/architecture.md

## API Patterns
@docs/api-guide.md
```

This keeps CLAUDE.md lean while providing access to detailed reference material.
