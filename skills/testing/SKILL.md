---
name: testing
description: Testing orchestration with coverage-driven generation and parallel execution
triggers:
  - test
  - coverage
  - write tests
  - fix tests
  - TDD
  - test suite
---

# Testing Skill (v5.0)

Testing orchestration that generates tests based on coverage gaps, runs suites in parallel, detects flaky tests, and maintains test health.

## When to Activate

- User says "write tests", "add tests", "improve coverage"
- User says "fix tests", "tests are failing"
- User wants TDD workflow
- User asks about test coverage

## Workflows

### 1. Coverage-Driven Generation

**Pattern**: Map-Reduce

#### Phase 1: Map (Fan-Out)
```
Task(subagent_type="explore", model="haiku", run_in_background=True,
     prompt="Identify all source files without corresponding test files. Map test coverage gaps...")

Task(subagent_type="explore", model="haiku", run_in_background=True,
     prompt="Analyze existing test patterns in this project. Find testing conventions, frameworks, helpers...")

Task(subagent_type="architect", model="opus",
     prompt="Given coverage gaps and existing patterns, prioritize which modules need tests most urgently...")
```

#### Phase 2: Generate (Fan-Out)
Spawn qa-tester agents per module in parallel:
```
Task(subagent_type="qa-tester", model="sonnet", run_in_background=True,
     prompt="Write unit tests for [module]. Follow existing test patterns. Cover: happy path, edge cases, error conditions...")

Task(subagent_type="qa-tester", model="sonnet", run_in_background=True,
     prompt="Write integration tests for [module]. Test interactions between components...")
```

#### Phase 3: Validate (Pipeline)
```
Task(subagent_type="qa-tester", model="sonnet",
     prompt="Run the full test suite. Measure coverage. Report results...")

Task(subagent_type="architect", model="opus",
     prompt="Review test quality. Check: meaningful assertions, not just coverage. Edge cases covered. No fragile tests...")
```

### 2. Parallel Test Execution

**Pattern**: Fan-Out

Run independent test suites simultaneously:

```
Task(subagent_type="qa-tester", model="sonnet", run_in_background=True,
     prompt="Run unit tests: npm test -- --testPathPattern=unit. Report results...")

Task(subagent_type="qa-tester", model="sonnet", run_in_background=True,
     prompt="Run integration tests: npm test -- --testPathPattern=integration. Report results...")

Task(subagent_type="qa-tester", model="sonnet", run_in_background=True,
     prompt="Run E2E tests: npm test -- --testPathPattern=e2e. Report results...")
```

Collect results and produce unified test report.

### 3. Flaky Test Detection

**Pattern**: Speculative (run 3x)

```
# Run same suite 3 times in parallel
Task(subagent_type="qa-tester", model="sonnet", run_in_background=True,
     prompt="Run test suite: npm test. Record ALL results including timing. Run #1...")

Task(subagent_type="qa-tester", model="sonnet", run_in_background=True,
     prompt="Run test suite: npm test. Record ALL results including timing. Run #2...")

Task(subagent_type="qa-tester", model="sonnet", run_in_background=True,
     prompt="Run test suite: npm test. Record ALL results including timing. Run #3...")
```

Compare results across runs. Tests that pass in some runs but fail in others are flaky. Report with frequency analysis.

### 4. Test Maintenance

**Pattern**: Pipeline

1. **Find** — Spawn explore to locate failing/broken tests
2. **Diagnose** — Spawn architect to determine why tests fail (code change? test assumption? environment?)
3. **Fix** — Spawn executor to update tests
4. **Verify** — Spawn qa-tester to confirm all tests pass

### 5. TDD Workflow

**Pattern**: Pipeline (iterative)

For test-driven development:

1. **Red** — Spawn qa-tester to write failing tests for the feature
2. **Green** — Spawn executor to implement minimum code to pass tests
3. **Refactor** — Spawn executor to clean up implementation while keeping tests green
4. **Verify** — Run full suite to confirm no regressions

## Agent Assignment

| Task | Agent | Model |
|------|-------|-------|
| Coverage analysis | explore | haiku |
| Test prioritization | architect | opus |
| Unit test writing | qa-tester | sonnet |
| Integration test writing | qa-tester | sonnet |
| E2E test writing | qa-tester | opus |
| Test execution | qa-tester | sonnet |
| Test quality review | architect | opus |
| Test fixing | executor | sonnet |
| Flaky detection | qa-tester | sonnet |

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
1. **Testing implementation details** — Test behavior, not internal code structure
2. **Low-value tests** — Focus on critical paths, not trivial getters/setters
3. **Fragile assertions** — Don't assert on volatile data (timestamps, random IDs)
4. **No edge cases** — Always test boundary conditions and error paths
5. **Sequential test execution** — Parallelize independent test suites
