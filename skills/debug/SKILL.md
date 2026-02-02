---
name: debug
description: >
  Systematic debugging with parallel hypothesis testing. Use when the user says "debug",
  "investigate", "diagnose", "fix bug", "why is X not working", reports an error, or
  describes unexpected behavior. Spawns parallel diagnostic agents, forms hypotheses,
  tests fixes, and verifies resolution.
user-invocable: true
---

# Debug Skill (v6.0)

Systematic debugging orchestration that diagnoses issues through parallel investigation, hypothesizes root causes, tests fixes, and verifies resolution.

## When to Activate

- User says "debug", "investigate", "diagnose", "fix bug"
- User asks "why is [X] not working?"
- User reports an error or unexpected behavior
- User asks to track down a bug

## Workflows

### 1. Diagnose-Hypothesize-Fix

**Pattern**: Pipeline + Speculative

The primary debugging workflow:

#### Phase 1: Diagnose (Fan-Out)
Spawn parallel diagnostic agents:

```
Task(subagent_type="explore", run_in_background=True,
     prompt="Find all files related to [feature]. Search for error patterns, recent changes...")

Task(subagent_type="architect", run_in_background=True,
     prompt="Analyze code paths that could cause [error]. Check error handling, state management...")
```

Optionally, use git history for context:
```
Task(subagent_type="architect", run_in_background=True,
     prompt="Run git log and git blame to find recent changes to files in [area] that might have introduced the bug...")
```

#### Phase 2: Hypothesize (Pipeline)
Spawn architect agent to synthesize diagnostic findings:
- Combine findings from all diagnostic agents
- Form ranked hypotheses about root cause
- Identify which hypothesis to test first

#### Phase 3: Fix (Speculative or Pipeline)

**If hypothesis is uncertain** (multiple plausible causes):
```
# Speculative pattern — test 2-3 approaches in parallel
Task(subagent_type="executor", run_in_background=True,
     prompt="Implement fix for hypothesis A: [description]...")

Task(subagent_type="executor", run_in_background=True,
     prompt="Implement fix for hypothesis B: [description]...")
```
Then evaluate which fix works and discard the other.

**If hypothesis is clear** (one obvious cause):
```
# Direct fix
Task(subagent_type="executor",
     prompt="Implement fix: [targeted description based on diagnosis]...")
```

#### Phase 4: Verify (Pipeline)
```
Task(subagent_type="tester",
     prompt="Run regression tests. Verify the bug is fixed and no new issues introduced...")
```

### 2. Reproduction-First

**Pattern**: Pipeline (strict)

For bugs that are hard to reproduce:

1. **Reproduce** — Spawn tester to create minimal reproduction
2. **Bisect** — Spawn architect to analyze git history and find the introducing commit
3. **Isolate** — Spawn architect to narrow down the root cause
4. **Fix** — Spawn executor with targeted fix
5. **Verify** — Spawn tester to confirm fix and add regression test

### 3. Performance Debugging

**Pattern**: Fan-Out (layer-by-layer)

For performance issues:

```
Task(subagent_type="architect", run_in_background=True,
     prompt="Analyze database query performance. Look for N+1, missing indexes, slow queries...")

Task(subagent_type="architect", run_in_background=True,
     prompt="Analyze API endpoint performance. Check response times, payload sizes, caching...")

Task(subagent_type="architect", run_in_background=True,
     prompt="Analyze frontend rendering performance. Check re-renders, bundle size, lazy loading...")
```

Synthesize findings and implement optimizations.

## Agent Assignment

| Phase | Agent | Purpose |
|-------|-------|---------|
| Diagnose | explore | Find relevant files and error patterns |
| Diagnose | architect | Analyze code paths, state, and git history |
| Hypothesize | architect | Synthesize and rank hypotheses |
| Fix | executor | Implement targeted fix |
| Fix (speculative) | executor x 2-3 | Parallel fix attempts |
| Verify | tester | Regression testing |

## Output Format

```
## Debug Report

### Issue
[Description of the reported problem]

### Root Cause
[Identified root cause with evidence]
- **Location**: [file:line]
- **Introducing commit**: [hash] (if found)
- **Mechanism**: [How the bug manifests]

### Fix Applied
- [file:line] — [description of change]

### Verification
- Build: Pass
- Tests: Pass
- Regression test: [Added/Updated]

### Prevention
[How to prevent similar bugs in the future]
```

## Self-Correction Loop

If the initial fix doesn't resolve the issue:

```
while (bug persists AND retries < 3):
  1. Re-diagnose with new information
  2. Form new hypothesis
  3. Apply new fix
  4. Verify
```

## Anti-Patterns
1. **Fixing without diagnosing** — Always understand the root cause first
2. **Single hypothesis** — Consider multiple possible causes
3. **No verification** — Always run tests after fix
4. **No regression test** — Add a test that would catch this bug
5. **Ignoring git history** — Recent changes are the most likely cause
