---
description: >
  Capture valuable learnings from the current session for future retrieval. Use when a
  non-trivial problem was resolved, a framework gotcha was discovered, a flaky test was
  debugged, a tooling limitation was worked around, or an important pattern decision was made.
  Saves structured learning files to .claude/learnings/ for future context.
user-invocable: true
allowed-tools: [Read, Write, Glob]
---

# Learning Capture Skill

Capture valuable insights from the current session to help future debugging and development.

## Purpose

When you resolve a non-trivial problem, discover a gotcha, or make an important architectural decision, this skill helps you document it for future reference. These learnings become searchable knowledge that prevents repeating the same debugging sessions.

## When to Use

Capture learnings when you've:
- Fixed a confusing build or runtime error
- Discovered a framework-specific gotcha
- Debugged a flaky test
- Worked around a tooling limitation
- Made a pattern decision that affects future code
- Found an undocumented behavior or edge case

**Don't capture**:
- Routine fixes with obvious causes
- Simple typos or syntax errors
- Changes that are well-documented elsewhere
- Speculative information you're not confident about

## Execution Steps

### 1. Review the Current Session

Analyze the conversation to identify:
- What problem were we trying to solve?
- What symptoms appeared? (error messages, unexpected behavior)
- What did we try that didn't work?
- What was the root cause?
- What ultimately fixed it?
- Are there preventive measures or patterns to adopt?

If the session was routine work without notable learnings, respond: "No significant learnings from this session - everything worked as expected."

### 2. Determine Category and Metadata

**Categories**:
- `build-errors`: Compilation, bundling, transpilation failures
- `test-failures`: Test setup, framework issues, flaky tests
- `type-errors`: TypeScript, type system, inference issues
- `runtime-errors`: Crashes, exceptions, unexpected behavior at runtime
- `config-issues`: Configuration file problems, tool setup
- `patterns`: Architectural decisions, code patterns, best practices
- `workarounds`: Known limitations requiring non-standard solutions
- `conventions`: Project-specific rules or style decisions

**Metadata to extract**:
- `component`: Which module/file/system was affected? (e.g., "sync engine", "profile loader", "vitest config")
- `symptoms`: List of observable problems (error messages, failed behaviors)
- `root_cause`: Why the problem occurred
- `resolution`: What fixed it
- `tags`: Relevant keywords for searching (e.g., ["esm", "zod", "validation"])
- `confidence`: How certain are you this is the right explanation?
  - `high`: Root cause definitively identified, solution verified
  - `medium`: Likely cause, solution works but mechanism unclear
  - `low`: Speculative, worked around but didn't fully understand

### 3. Generate Filename

Format: `<slug>-<date>.md`

- **Slug**: 3-5 word kebab-case summary (e.g., `vitest-esm-import-error`, `zod-schema-type-inference`)
- **Date**: YYYY-MM-DD (today's date)

Examples:
- `config-toml-multiline-parsing-2026-02-01.md`
- `tsdown-dirname-shim-workaround-2026-01-15.md`
- `profile-inheritance-merge-order-2025-12-10.md`

### 4. Create Learning File

Path: `.claude/learnings/<category>/<slug>-<date>.md`

**Frontmatter template**:

```yaml
---
date: YYYY-MM-DD
category: <category>
component: <affected-component>
symptoms:
  - "exact error message or behavior description"
  - "additional symptom if applicable"
root_cause: "concise explanation of why it happened"
resolution: "what fixed it"
tags: [tag1, tag2, tag3]
confidence: high|medium|low
---
```

**Body template**:

```markdown
# Brief Title

## Problem

Describe what went wrong. Include:
- What you were trying to do
- What happened instead
- Any relevant error messages (in code blocks)

## Investigation

What did you try?
- Attempt 1: what you tried and why it didn't work
- Attempt 2: another approach and its outcome
- etc.

## Solution

What ultimately worked and why:
- The fix that resolved the issue
- Explanation of why this works
- Any trade-offs or caveats

## Prevention

How to avoid this in the future:
- Patterns to follow
- Things to watch for
- Possible improvements to tooling/config
```

**Guidelines**:
- Be specific: Include actual error messages, file paths, line numbers
- Be concise: Future readers need facts, not narrative
- Be honest: If you're not sure why something worked, say so (and set confidence: low)
- One learning per file: Don't combine unrelated issues

### 5. Verify and Report

After creating the file:
- Confirm the file was written
- Show the user the path and category
- Suggest they can review/edit if needed

## Example Output

```
Learning captured successfully.

File: .claude/learnings/build-errors/vitest-esm-dynamic-import-2026-02-01.md
Category: build-errors
Component: test infrastructure

Summary: Vitest was failing to import ESM modules dynamically due to missing file extensions in import paths. Fixed by adding explicit .js extensions to all dynamic imports.

You can review or edit this learning at:
.claude/learnings/build-errors/vitest-esm-dynamic-import-2026-02-01.md
```

## Anti-Patterns

- Don't create learnings for every small fix - focus on non-obvious insights
- Don't write vague descriptions like "fixed a bug" - be specific
- Don't speculate wildly - if you're unsure, acknowledge it
- Don't duplicate existing learnings - search first if implementing search functionality
- Don't make learnings too long - aim for under 100 lines

## Future Enhancements

These learnings can later be indexed and searched, potentially integrated into Claude's context when it encounters similar errors or works on related components.
