# Testing Orchestration

Domain-specific orchestration recipes for testing workflows.

## Coverage-Driven Generation

**Pattern**: Map-Reduce

### Phases

1. **Map** (Fan-Out)
   - Spawn explore agent to identify untested code paths
   - Spawn explore agent to map existing test patterns
   - Spawn architect agent to prioritize coverage gaps

2. **Generate** (Fan-Out)
   - Spawn qa-tester agents per module (parallel)
   - Each agent generates tests for its assigned module
   - Include unit tests, integration tests, and edge cases

3. **Validate** (Pipeline)
   - Spawn qa-tester to run full suite and measure coverage
   - Spawn architect to review test quality (not just coverage)

## Parallel Test Execution

**Pattern**: Fan-Out

### Agent Assignments
- Agent 1: Unit tests (`npm test -- --testPathPattern=unit`)
- Agent 2: Integration tests (`npm test -- --testPathPattern=integration`)
- Agent 3: E2E tests (`npm test -- --testPathPattern=e2e`)

### Benefits
- Tests run concurrently for faster feedback
- Failures are isolated by test type
- Each agent reports independently

## Flaky Test Detection

**Pattern**: Speculative (run same suite 3x)

### Phases
1. Run test suite 3 times in parallel (3 background agents)
2. Compare results across runs
3. Tests that pass in some runs but fail in others are flaky
4. Report flaky tests with frequency analysis

## Test Maintenance

**Pattern**: Pipeline

### Phases
1. **Find** - Spawn explore to locate failing/broken tests
2. **Diagnose** - Spawn architect to determine why tests fail
3. **Fix** - Spawn executor to update tests
4. **Verify** - Spawn qa-tester to confirm all tests pass
