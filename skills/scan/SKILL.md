---
description: >
  Ongoing codebase health analysis and context refresh. Use after initial setup for
  tech debt analysis, context dumps, project summaries, or to refresh CLAUDE.md with
  new discoveries. Triggers on "scan", "tech debt", "dead code", "find TODOs",
  "code quality", "context dump", "summarize project", "onboard me", or "refresh context".
user-invocable: true
allowed-tools: [Bash, Read, Write, Glob, Grep, Edit, Task]
---

# Codebase Health & Context Analysis

Analyze codebase health and refresh project context. Complements `/claudeops:init` by providing ongoing analysis after initial setup.

## When to Use

- **Tech debt analysis**: Find TODOs, dead code, missing tests
- **Context refresh**: Update CLAUDE.md with new discoveries
- **Onboarding**: Generate comprehensive context dump for new team members
- **Health check**: Periodic codebase quality assessment

## Workflows

### 1. Tech Debt Analysis

Triggered by: "tech debt", "find dead code", "find duplicated code", "missing tests", "find TODOs", "code quality"

#### Step 1: Scan for Markers

```
Grep: pattern="TODO|FIXME|HACK|XXX|DEPRECATED|WORKAROUND"
      output_mode="content"
```

#### Step 2: Parallel Analysis

Create an agent team with 3 specialists:

- **Dead Code Finder** (explore agent): Find exported functions/classes never imported elsewhere, unused variables and parameters, unreachable code paths, and files with no imports. List each with file:line and confidence level.

- **Duplication Finder** (architect agent): Identify duplicated logic patterns including functions doing similar things, copy-pasted code blocks, repeated error handling patterns, and similar data transformations. Group by similarity and suggest consolidation.

- **Test Gap Finder** (tester agent): Find test coverage gaps including source files without corresponding tests, critical paths without tests (auth, payments, data mutations), and complex functions without unit tests. Rate each by priority (Critical/High/Medium/Low).

Team members should share findings - dead code candidates may also be untested, duplicated patterns may warrant shared test utilities.

#### Step 3: Generate Report

```markdown
# Tech Debt Report
Generated: {date}

## Summary
| Category | Count | Priority Items |
|----------|-------|----------------|
| TODO/FIXME | {N} | {N critical} |
| Dead Code | {N} | {N high-confidence} |
| Duplicated Logic | {N} | {N patterns} |
| Missing Tests | {N} | {N critical paths} |

## Critical Priority (Fix These First)

| # | Type | Location | Description |
|---|------|----------|-------------|
| 1 | {type} | {file:line} | {description} |

## TODO/FIXME Comments

| File:Line | Comment | Age |
|-----------|---------|-----|
| {loc} | {text} | {git blame date} |

## Dead Code Candidates

- `{file:line}` - {symbol} (confidence: {high/medium})

## Duplicated Patterns

### Pattern: {description}
- `{file1:line}`
- `{file2:line}`
Suggested: {consolidation approach}

## Missing Test Coverage

| Source File | Priority | Reason |
|-------------|----------|--------|
| {file} | Critical | Handles authentication |
| {file} | High | Complex business logic |
```

---

### 2. Context Dump / Onboarding

Triggered by: "context dump", "summarize project", "project summary", "onboard me"

#### Step 1: Gather Metadata

```bash
git log --oneline -20
git shortlog -sn --since="30 days ago"
gh pr list --state open --limit 5 2>/dev/null || true
gh issue list --state open --limit 5 2>/dev/null || true
```

Read: README.md, CONTRIBUTING.md, .claude/CLAUDE.md

#### Step 2: Architecture Analysis

```
Task(subagent_type="claudeops:architect",
     prompt="Create a high-level architecture overview:
     1. Main components and their responsibilities
     2. Data flow through the system
     3. External dependencies and integrations
     4. Key abstractions and patterns
     Include an ASCII diagram if helpful.")
```

#### Step 3: Generate Context Document

```markdown
# Project Context: {Project Name}
Generated: {date}

## Overview
{From README - 2-3 sentences}

## Tech Stack
- **Language**: {lang} {version}
- **Framework**: {framework}
- **Database**: {db}
- **Key Dependencies**: {top 5}

## Architecture
```
{ASCII diagram from architect agent}
```

## Directory Guide
| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| {dir} | {purpose} | {files} |

## Active Development
### Open PRs
{list with titles and authors}

### Open Issues
{list with titles and labels}

### Recent Commits (Last 20)
{commit list with messages}

## Top Contributors (30 days)
| Author | Commits |
|--------|---------|
| {name} | {count} |

## Quick Commands
```bash
{build}   # Build
{test}    # Test
{dev}     # Dev server
```

## Known Issues / Tech Debt
{Summary from previous tech debt scan if exists}

## Key Contacts
{From CONTRIBUTING.md if exists}
```

Option to save: "Write to `.claude/context-dump.md` for sharing?"

---

### 3. Context Refresh

Triggered by: "refresh context", "update CLAUDE.md", "rescan"

Update existing CLAUDE.md with new discoveries without full re-init.

#### Step 1: Compare Current State

```
Task(subagent_type="claudeops:explore",
     prompt="Compare current codebase to what's documented in .claude/CLAUDE.md:
     - New directories/files not documented
     - Documented paths that no longer exist
     - New dependencies added
     - Changed patterns or conventions")
```

#### Step 2: Generate Diff

```markdown
## CLAUDE.md Refresh Suggestions

### New Content to Add
- Directory `src/new-feature/` - {discovered purpose}
- Dependency `{new-dep}` - {what it's used for}

### Outdated Content to Remove
- `src/old-module/` no longer exists
- `{old-pattern}` no longer used

### Updates Needed
- Build command changed from `{old}` to `{new}`
- Test command now includes `{new-flags}`
```

#### Step 3: Apply Changes (with confirmation)

Ask user: "Apply these updates to CLAUDE.md?"
- If yes: Edit CLAUDE.md with changes
- If no: Save suggestions to `.claude/refresh-suggestions.md`

---

## Output Locations

| Workflow | Default Output |
|----------|----------------|
| Tech Debt | Display in chat |
| Context Dump | Display, optional save to `.claude/context-dump.md` |
| Refresh | Edits `.claude/CLAUDE.md` (with confirmation) |

## Scheduling Suggestions

Add to CLAUDE.md for periodic health checks:

```markdown
## Maintenance

Consider running periodically:
- `/claudeops:scan tech debt` - Monthly
- `/claudeops:scan refresh` - After major changes
- `/claudeops:scan context` - Before onboarding new team members
```
