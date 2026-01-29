# Software Development Orchestration

Domain-specific orchestration recipes for software development tasks.

## Feature Implementation: Plan-Parallel-Integrate

**Pattern**: Pipeline + Fan-Out

### Phases

1. **Discovery** (Pipeline)
   - Spawn explore agent to map codebase structure
   - Spawn architect agent to analyze requirements and design approach
   - Gate: Architecture plan approved

2. **Parallel Implementation** (Fan-Out)
   - Spawn executor agents for independent code components
   - Spawn qa-tester agent for test writing (parallel with implementation)
   - Each agent gets specific file scope to avoid conflicts
   - Gate: All executors complete

3. **Integration** (Pipeline)
   - Spawn executor to integrate components and resolve conflicts
   - Spawn qa-tester to run full test suite
   - Spawn architect to verify implementation matches design
   - Gate: Build passes, tests pass, architect approves

### Agent Assignment
| Phase | Agent | Model | Scope |
|-------|-------|-------|-------|
| Discovery | explore | haiku | File discovery |
| Discovery | architect | opus | Design decisions |
| Implementation | executor | sonnet-opus | Code changes |
| Implementation | qa-tester | sonnet | Test writing |
| Integration | executor | sonnet | Conflict resolution |
| Verification | qa-tester | sonnet | Test execution |
| Verification | architect | opus | Final review |

## Bug Fix: Diagnose-Hypothesize-Fix

**Pattern**: Pipeline

### Phases

1. **Diagnose**
   - Spawn explore agent to gather error context, logs, stack traces
   - Spawn architect agent to analyze findings and form hypotheses
   - Gate: Root cause hypothesis identified

2. **Hypothesize and Fix**
   - If hypothesis is uncertain: Spawn speculative agents with different fix approaches
   - If hypothesis is clear: Spawn executor with targeted fix
   - Gate: Fix implemented

3. **Verify**
   - Spawn qa-tester to run regression tests
   - Spawn architect to verify fix addresses root cause
   - Gate: Tests pass, no regressions

## Refactoring: Map-Analyze-Transform

**Pattern**: Map-Reduce

### Phases

1. **Map** (Fan-Out)
   - Spawn explore agents to identify all affected code locations
   - Each agent maps a different aspect (usage patterns, dependencies, tests)

2. **Analyze** (Pipeline)
   - Spawn architect to synthesize mapping results
   - Produce refactoring plan with ordered steps and risk assessment

3. **Transform** (Pipeline or Fan-Out if independent)
   - Spawn executor(s) to apply refactoring changes
   - If changes are in independent files, parallelize
   - If changes are coupled, sequence them

4. **Validate** (Pipeline)
   - Spawn qa-tester: Run full test suite
   - Spawn architect: Verify behavior preservation

## Migration: Schema-Data-Code

**Pattern**: Pipeline (strict ordering)

### Phases (strictly sequential)

1. **Schema** - Spawn executor to create schema migration scripts
2. **Data** - Spawn executor to write data migration logic
3. **Code** - Spawn executor(s) to update application code
4. **Test** - Spawn qa-tester for migration testing
5. **Rollback** - Spawn executor to write rollback scripts

## Greenfield: Scaffold-Parallel-Integrate

**Pattern**: Pipeline + Fan-Out

### Phases

1. **Scaffold** - Spawn architect to define project structure and patterns
2. **Parallel Build** - Fan-out executors for independent modules
3. **Integrate** - Spawn executor to wire modules together
4. **Verify** - Spawn qa-tester + architect for comprehensive review
