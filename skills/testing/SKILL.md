---
name: testing
description: Testing orchestration with TDD workflow, coverage-driven generation, and parallel execution
license: MIT
metadata:
  author: claudeops
  version: "4.0.0"
  claudeops:
    triggers: [test, coverage, write tests, fix tests, TDD, test suite]
    domains: [testing]
    model: sonnet
    userInvocable: true
    disableModelInvocation: false
---

# Testing Skill

Testing orchestration that generates tests based on coverage gaps, enforces TDD workflow, runs suites in parallel, and maintains test health.

## When to Activate

- User says "write tests", "add tests", "improve coverage"
- User says "fix tests", "tests are failing"
- User wants TDD workflow ("test first", "red-green-refactor")
- User asks about test coverage

## Workflows

### 1. TDD: Red-Green-Refactor

For test-driven development:

1. **RED** — Write failing test that specifies the desired behavior
   - Run test, confirm it fails
   - Verify failure is for the right reason (not syntax error)
2. **GREEN** — Write minimal code to make the test pass
   - No gold-plating — only what's needed to pass
   - Run test, confirm it passes
3. **REFACTOR** — Improve code quality while keeping tests green
   - Remove duplication, improve naming, optimize
   - Run all tests, confirm nothing broke
4. **REPEAT** — Next requirement

Rules:
- No implementation without a failing test first
- Minimal implementation only — no features not yet tested
- Only refactor when all tests are green
- One failing test at a time

### 2. Coverage-Driven Generation

**Pattern**: Map-Reduce

#### Phase 1: Map (Fan-Out)
```
Task(subagent_type="explore", model="haiku", run_in_background=True,
     prompt="Identify all source files without corresponding test files. Map test coverage gaps...")

Task(subagent_type="explore", model="haiku", run_in_background=True,
     prompt="Analyze existing test patterns. Find testing conventions, frameworks, helpers...")

Task(subagent_type="architect", model="opus",
     prompt="Given coverage gaps and existing patterns, prioritize which modules need tests most...")
```

#### Phase 2: Generate (Fan-Out)
Spawn test-writing agents per module in parallel:
```
Task(subagent_type="qa-tester", model="sonnet", run_in_background=True,
     prompt="Write unit tests for [module]. Follow existing patterns. Cover: happy path, edge cases, errors...")

Task(subagent_type="qa-tester", model="sonnet", run_in_background=True,
     prompt="Write integration tests for [module]. Test component interactions...")
```

#### Phase 3: Validate (Pipeline)
```
Task(subagent_type="qa-tester", model="sonnet",
     prompt="Run the full test suite. Measure coverage. Report results...")

Task(subagent_type="architect", model="opus",
     prompt="Review test quality. Check: meaningful assertions, edge cases, no fragile tests...")
```

### 3. Parallel Test Execution

Run independent test suites simultaneously:

```
Task(subagent_type="qa-tester", model="sonnet", run_in_background=True,
     prompt="Run unit tests. Report results...")

Task(subagent_type="qa-tester", model="sonnet", run_in_background=True,
     prompt="Run integration tests. Report results...")
```

Collect results and produce unified test report.

### 4. Test Maintenance

1. **Find** — Locate failing/broken tests
2. **Diagnose** — Determine why tests fail (code change? test assumption? environment?)
3. **Fix** — Update tests to match current behavior or fix the code
4. **Verify** — Confirm all tests pass

### 5. Flaky Test Detection

Run same suite 3 times in parallel. Tests that pass in some runs but fail in others are flaky. Report with frequency analysis.

## Test Quality Standards

### What to Test
- **Happy path** — Standard use case works
- **Edge cases** — Boundary conditions, empty inputs, limits
- **Error cases** — Invalid inputs, network failures, missing data
- **Integration** — Component interactions work correctly
- **Regression** — Previously fixed bugs stay fixed

### What NOT to Test
- Implementation details (private methods, internal state)
- Trivial getters/setters with no logic
- Third-party library internals
- Volatile data (timestamps, random IDs) — use matchers instead

## Output Format

```
## Test Report

### Coverage
- Lines: [X]%
- Branches: [X]%
- Functions: [X]%

### Results
- Total: [N] tests
- Passed: [N]
- Failed: [N]
- Skipped: [N]

### Tests Created
- [test-file.test.ts] — [N] tests for [module]

### Issues Found
- [Flaky tests, if any]
- [Coverage gaps remaining]
```

## Anti-Patterns
1. **Testing implementation details** — Test behavior, not internal structure
2. **Skipping RED phase in TDD** — Verify test fails before implementing
3. **Over-implementing in GREEN** — Only code needed for current test
4. **Low-value tests** — Focus on critical paths, not trivial accessors
5. **Fragile assertions** — Don't assert on volatile data
6. **No edge cases** — Always test boundary conditions and error paths
7. **Sequential test execution** — Parallelize independent test suites
8. **Ignoring failures** — Investigate every failure, don't skip flaky tests
