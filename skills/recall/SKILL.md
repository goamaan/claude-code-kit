---
description: >
  Retrieve relevant past learnings from .claude/learnings/ based on current context.
  Use when debugging similar issues, encountering familiar errors, or when the user
  says "have we seen this before", "recall", "remember", "past learnings", or describes
  an error pattern that might have been solved before.
user-invocable: true
allowed-tools: [Read, Glob, Grep]
---

# Learning Retrieval

Surface relevant past learnings from `.claude/learnings/` directories to avoid repeating solved problems.

## When to Use

- User pastes an error that looks familiar
- Debugging an issue in a previously-fixed area
- User explicitly asks "have we seen this before?" or "recall"
- Starting work on a component that had past issues

## Learnings Structure

Learnings are stored in `.claude/learnings/` with category subdirectories:

```
.claude/learnings/
├── build-errors/      # Build/compilation failures
├── test-failures/     # Test-related issues
├── type-errors/       # TypeScript/type system issues
├── runtime-errors/    # Runtime exceptions
├── config-issues/     # Configuration problems
├── patterns/          # Discovered patterns and idioms
├── workarounds/       # Known workarounds for limitations
└── conventions/       # Project-specific conventions learned
```

Each learning file is markdown with frontmatter:

```markdown
---
keywords: [prisma, migration, timeout, database]
files: [prisma/schema.prisma, src/db/client.ts]
date: 2024-01-15
---

# Prisma Migration Timeout on Large Tables

## Problem
Migration failed with timeout when adding index to users table (2M+ rows).

## Solution
Use `CREATE INDEX CONCURRENTLY` via raw SQL migration instead of Prisma's default.

## Files Modified
- prisma/migrations/xxx/migration.sql
```

## Execution Flow

### Step 1: Extract Keywords from Context

From the current conversation or user query, extract relevant keywords:
- Error messages and codes
- File paths and module names
- Framework/library names
- Symptom descriptions

### Step 2: Search Learnings

Search `.claude/learnings/` for matching content:

```
Glob: .claude/learnings/**/*.md
```

For each learning file:
1. Read the frontmatter `keywords` array
2. Check if file path matches any in `files` array
3. Grep the content for keyword matches

Score matches by relevance:
- Exact keyword match in frontmatter: +3
- File path match: +3
- Keyword in content: +1

### Step 3: Also Check User-Level Learnings

Check `~/.claude/learnings/` for cross-project learnings that might apply.

### Step 4: Present Findings

For top matches (up to 3), present:

```
## Relevant Past Learnings

### 1. {Learning Title}
**Relevance**: {why this matches}
**Date**: {when learned}
**Files**: {related files}

{Summary of problem and solution}

---

### 2. {Learning Title}
...
```

If no matches found:
```
No relevant past learnings found for this context.

Consider using `/claudeops:learn` after solving this issue to capture it for future reference.
```

## Integration with CLAUDE.md

For frequently-needed learnings, suggest adding to CLAUDE.md:

```markdown
## Gotchas

- Prisma migrations timeout on large tables - use CONCURRENTLY
  @.claude/learnings/build-errors/prisma-migration-timeout.md
```

The @import makes the full learning available when Claude needs it.

## Auto-Recall Pattern

Add this to CLAUDE.md to enable automatic recall:

```markdown
## Before Debugging

When encountering an error:
1. Check if similar issue exists in @.claude/learnings/
2. Search for error message patterns
3. Only after checking learnings, proceed with fresh debugging
```

## Example Session

**User**: "The Prisma migration is failing with a timeout"

**Recall finds**:
```
## Relevant Past Learnings

### 1. Prisma Migration Timeout on Large Tables
**Relevance**: Keywords match: prisma, migration, timeout
**Date**: 2024-01-15

We encountered this when adding an index to the users table.
Prisma's default migration locks the table, which times out on
large tables.

**Solution**: Use raw SQL with `CREATE INDEX CONCURRENTLY`:
1. Create a blank migration: `npx prisma migrate dev --create-only`
2. Edit the SQL to use CONCURRENTLY
3. Run migration: `npx prisma migrate deploy`

**Files**: prisma/migrations/20240115_add_user_index/
```

## Maintenance

Learnings should be:
- **Specific**: One problem per file
- **Actionable**: Clear solution, not just problem description
- **Searchable**: Good keywords in frontmatter
- **Current**: Remove outdated learnings when underlying issue is fixed

Use `/claudeops:learn` to capture new learnings in the correct format.
