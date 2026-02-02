---
description: >
  Systematic debugging with parallel hypothesis testing. Use when the user says "debug",
  "investigate", "diagnose", "fix bug", "why is X not working", "fix CI", "CI is broken",
  "pipeline failed", "build failed", "fix containers", "docker not working", "compose failing",
  reports an error, describes unexpected behavior, or pastes an error/stack trace with no context.
  Spawns parallel diagnostic agents, forms hypotheses, tests fixes, and verifies resolution.
user-invocable: true
---

# Debug Skill (v6.0)

Systematic debugging orchestration that diagnoses issues through parallel investigation, hypothesizes root causes, tests fixes, and verifies resolution.

## When to Activate

- User says "debug", "investigate", "diagnose", "fix bug"
- User asks "why is [X] not working?"
- User reports an error or unexpected behavior
- User asks to track down a bug
- User says "fix CI", "CI is broken", "pipeline failed", "build failed"
- User says "fix containers", "docker not working", "compose failing"
- User pastes an error or stack trace with no additional context

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

### 4. CI/Pipeline Debugging

**Pattern**: Pipeline (zero-context)

Triggered by: "fix CI", "CI is broken", "pipeline failed", "build failed"

The user provides zero context — pull everything from CI automatically.

#### Phase 1: Gather CI Context
```
Bash: gh run list --status failure --limit 5
Bash: gh run view <latest-failed-run-id> --log-failed
```

#### Phase 2: Diagnose
```
Task(subagent_type="architect",
     prompt="Analyze these CI failure logs. Identify root cause, distinguish between:
     - Code errors (test failures, lint errors, type errors)
     - Environment issues (missing deps, version mismatches)
     - Infra issues (timeouts, OOM, rate limits, flaky tests)
     Provide ranked hypotheses with evidence from the logs...")
```

#### Phase 3: Fix
```
Task(subagent_type="executor",
     prompt="Implement fix for CI failure: [diagnosis]. Read the relevant files first,
     apply the fix, and run the same check locally to verify...")
```

#### Phase 4: Verify
```
Task(subagent_type="tester",
     prompt="Run the failing CI checks locally. Verify the fix resolves the issue
     without introducing new failures...")
```

### 5. Container/Docker Debugging

**Pattern**: Pipeline (environment-focused)

Triggered by: "fix containers", "docker not working", "compose failing"

#### Phase 1: Gather Container Context
```
Bash: cat Dockerfile docker-compose.yml docker-compose.yaml 2>/dev/null
Bash: docker compose logs --tail=200 2>/dev/null || docker logs --tail=200 $(docker ps -lq) 2>/dev/null
Bash: docker compose ps 2>/dev/null
```

#### Phase 2: Diagnose
```
Task(subagent_type="architect",
     prompt="Analyze these Docker/container logs and config. Common patterns to check:
     - Port conflicts (EADDRINUSE, port already allocated)
     - Volume mount issues (permission denied, path not found)
     - Environment variable problems (missing vars, wrong values)
     - Network issues (connection refused between services, DNS)
     - Build failures (missing deps, wrong base image, layer caching)
     - Health check failures
     Identify root cause and suggest fix...")
```

#### Phase 3: Fix and Verify
```
Task(subagent_type="executor",
     prompt="Apply the fix to [Dockerfile/docker-compose.yml/etc].
     Then run: docker compose up --build -d && docker compose ps
     Verify all services are healthy...")
```

### 6. Paste-and-Fix (Quick Mode)

**Pattern**: Minimal-interaction speed run

Triggered by: user pastes an error or stack trace with no additional context.

**Detection heuristic**: Message contains file paths + line numbers + error codes/messages but no question or instruction.

#### Steps:
1. **Parse** — Extract file paths, line numbers, error codes, and error messages from the pasted text
2. **Skip interview** — Do NOT ask clarifying questions
3. **Diagnose** — Read the referenced files directly
4. **Fix** — Apply targeted fix based on error type
5. **Verify** — Run build/tests to confirm

```
# No fan-out needed — go straight to the source
Task(subagent_type="executor",
     prompt="The user pasted this error:
     [error text]

     Files referenced: [extracted file:line pairs]

     Read the files, understand the error, fix it, and verify with build/tests.
     Do not ask questions — just fix it.")
```

## Agent Assignment

| Phase | Agent | Purpose |
|-------|-------|---------|
| Diagnose | explore | Find relevant files and error patterns |
| Diagnose | architect | Analyze code paths, state, and git history |
| Hypothesize | architect | Synthesize and rank hypotheses |
| Fix | executor | Implement targeted fix |
| Fix (speculative) | executor x 2-3 | Parallel fix attempts |
| Verify | tester | Regression testing |
| CI Diagnose | architect | Analyze CI failure logs |
| Container Diagnose | architect | Analyze Docker/compose logs and config |
| Paste-and-Fix | executor | Direct fix from error context |

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
