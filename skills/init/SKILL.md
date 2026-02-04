---
description: >
  Deep project initialization that creates comprehensive CLAUDE.md context. Scans codebase with
  multiple agents, interviews user for tacit knowledge, and generates project-level context
  that enables paste-a-bug-and-fix workflows. Use when the user says "init", "initialize",
  "setup claude", "configure project", or wants to improve their CLAUDE.md.
user-invocable: true
disable-model-invocation: true
allowed-tools: [Bash, Read, Write, Glob, Grep, Edit, AskUserQuestion, Task]
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
    description: "Just add claudeops routing table and essential commands"
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
    description: "Basic scanning, minimal questions, fast initialization"
```

### Step 3: Run Deterministic Scanner

Execute the scanner to get baseline project info:

```bash
node scripts/scan.mjs "$PWD"
```

Parse the JSON output to extract:
- `projectName`, `languages`, `frameworks`
- `buildCommands`, `testCommands`, `devCommands`
- `structure` (key directories)
- `packageManager`
- `configFiles`

### Step 4: Deep Dive with Parallel Agents (if Enhance/Full mode)

Spawn multiple agents in parallel to analyze different aspects:

```
Task(subagent_type="claudeops:explore", run_in_background=true,
     prompt="Map this codebase comprehensively:
     1. List ALL top-level directories with their purpose
     2. Identify entry points (main files, index files, app entry)
     3. Find configuration files and what they configure
     4. Map the test structure (where tests live, naming conventions)
     5. Identify any monorepo structure (workspaces, packages)
     Output as structured markdown.")

Task(subagent_type="claudeops:architect", run_in_background=true,
     prompt="Analyze the architecture:
     1. Read main entry points and trace the application flow
     2. Identify key abstractions and patterns used
     3. Find the data layer (database, API clients, state management)
     4. Identify external service integrations
     5. Note any unusual or clever patterns
     Output as structured markdown with file:line references.")

Task(subagent_type="claudeops:researcher", run_in_background=true,
     prompt="Understand the project context:
     1. Read README.md thoroughly - extract product description, setup instructions
     2. Read CONTRIBUTING.md if exists - extract workflow expectations
     3. Read any docs/ directory for architecture decisions
     4. Check package.json/pyproject.toml for project metadata
     5. Look for ADRs (Architecture Decision Records)
     Output key findings as structured markdown.")
```

**Conditionally spawn based on scanner results:**

```
# If frontend detected (React/Vue/Svelte/Angular/CSS)
Task(subagent_type="claudeops:designer", run_in_background=true,
     prompt="Analyze the frontend:
     1. Identify component library/framework patterns
     2. Find styling approach (CSS modules, Tailwind, styled-components)
     3. Map component hierarchy and shared components
     4. Identify state management patterns
     5. Find any design system or theme configuration
     Output as structured markdown.")

# If test framework detected
Task(subagent_type="claudeops:tester", run_in_background=true,
     prompt="Analyze testing patterns:
     1. Find test configuration files
     2. Identify testing patterns (unit, integration, e2e)
     3. Find test utilities, fixtures, mocks
     4. Check coverage configuration
     5. Note any testing conventions (naming, organization)
     Output as structured markdown.")

# If web framework/API/auth detected
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

### Step 5: User Interview

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

### Step 6: Generate CLAUDE.md

Create `.claude/CLAUDE.md` with this structure (keep under 400 lines):

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

{From scanner + user interview}
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

## Agent Routing

When delegating work, use these specialized agents:

| Agent | Use For |
|-------|---------|
| `claudeops:architect` | Deep analysis, debugging, system design, plan review |
| `claudeops:executor` | Code changes, bug fixes, refactoring, implementation |
| `claudeops:explore` | File search, codebase discovery, structure mapping |
{if designer relevant:}
| `claudeops:designer` | UI/UX, components, styling, responsive layouts |
{if tester relevant:}
| `claudeops:tester` | Test writing, TDD workflow, coverage improvement |
{if security relevant:}
| `claudeops:security` | Security audit, auth review, vulnerability assessment |
| `claudeops:researcher` | Technology evaluation, best practices, API analysis |

### Delegation Patterns
- **Code changes** → executor
- **Deep debugging** → architect
- **Find files/code** → explore
- **Multiple independent tasks** → spawn agents in parallel

## Rules

- Always run `{lint_cmd}` after modifying code
- Always run `{typecheck_cmd}` after TypeScript changes
- Never commit directly to main/master
- Never commit .env, credentials, or secrets
- Complete all tasks before ending session

<!-- Additional rules will be added here as corrections are made -->
````

### Step 7: Generate Path-Specific Rules (if warranted)

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

### Step 8: Generate/Merge settings.json

Create or merge `.claude/settings.json`:

```json
{
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

If settings.json exists, merge intelligently - preserve user permissions, add detected ones.

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
- explore: directory mapping
- architect: architecture analysis
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

1. Run scanner only (no agents)
2. Skip user interview
3. Generate basic CLAUDE.md with:
   - Commands
   - Tech stack
   - Basic structure
   - Agent routing table
   - Standard rules

Keep it under 100 lines.

## Anti-Patterns

- Don't ask questions the scanner already answered
- Don't generate verbose prose - use bullets and tables
- Don't add speculative sections
- Don't overwrite without backup
- Don't create rules files unless genuinely needed
- Don't exceed 400 lines in CLAUDE.md (use @imports for more)
- Don't include agents that aren't relevant to the project

## Using @imports for Large Projects

If the project needs more documentation than fits in 400 lines, use @imports:

```markdown
## Architecture
@docs/architecture.md

## API Patterns
@docs/api-guide.md
```

This keeps CLAUDE.md lean while providing access to detailed reference material.
