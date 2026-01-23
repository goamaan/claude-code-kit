---
name: tdd
description: Test-driven development workflow with red-green-refactor cycle
auto_trigger:
  - tdd
  - test first
  - test driven
  - write tests first
  - red green refactor
allowed_tools:
  - Task
  - Read
  - Glob
  - Grep
  - Bash
  - TodoWrite
  - TodoRead
---

# TDD Skill

Test-driven development workflow enforcing the red-green-refactor cycle for robust, well-tested code.

## Purpose

TDD mode ensures:
- Tests are written before implementation
- All code is testable by design
- Incremental, verified progress
- High confidence in correctness

## When to Activate

Activate when user says:
- "tdd: [feature]"
- "test first approach"
- "test driven development"
- "write tests first"
- "red green refactor"

## The Red-Green-Refactor Cycle

```
RED → GREEN → REFACTOR → repeat

RED:     Write failing test
GREEN:   Write minimal code to pass
REFACTOR: Improve without breaking tests
```

## Workflow

### Phase 1: Requirements Analysis

Before writing any tests:

1. **Understand the feature:**
   ```
   What should this code do?
   What are the inputs?
   What are the expected outputs?
   What are the edge cases?
   ```

2. **Identify test cases:**
   ```
   - Happy path
   - Edge cases
   - Error cases
   - Boundary conditions
   ```

3. **Create test plan:**
   ```
   TodoWrite([
     {task: "Test: valid input returns expected", status: "pending"},
     {task: "Test: empty input throws error", status: "pending"},
     {task: "Test: null input handled gracefully", status: "pending"},
     {task: "Implement: core logic", status: "pending"},
     {task: "Refactor: extract helper", status: "pending"}
   ])
   ```

### Phase 2: Red - Write Failing Test

1. **Write ONE test first:**
   ```
   Task(subagent_type="oh-my-claudecode:tdd-guide",
        prompt="Write a failing test for: [requirement]")
   ```

2. **Verify it fails:**
   ```
   Bash(command="npm test -- --testNamePattern='[test name]'")
   ```

3. **Failure must be for right reason:**
   - NOT syntax error
   - NOT missing file
   - Should fail because functionality doesn't exist

### Phase 3: Green - Minimal Implementation

1. **Implement ONLY what's needed:**
   ```
   Task(subagent_type="oh-my-claudecode:executor",
        prompt="Write minimal code to make this test pass: [test]")
   ```

2. **Verify test passes:**
   ```
   Bash(command="npm test -- --testNamePattern='[test name]'")
   ```

3. **No extra features:**
   - Only code required for THIS test
   - YAGNI: You Ain't Gonna Need It

### Phase 4: Refactor - Improve Design

1. **All tests must still pass:**
   ```
   Bash(command="npm test")
   ```

2. **Safe improvements:**
   - Extract functions
   - Rename variables
   - Remove duplication
   - Improve readability

3. **Verify after each refactor:**
   ```
   Bash(command="npm test")
   ```

### Repeat

Return to Phase 2 for next test case.

## Agent Delegation

| Phase | Agent | Model | Purpose |
|-------|-------|-------|---------|
| Planning | tdd-guide | sonnet | Identify test cases |
| Red | tdd-guide | sonnet | Write failing tests |
| Green | executor | sonnet | Minimal implementation |
| Refactor | executor | sonnet | Safe improvements |
| Verify | qa-tester | sonnet | Run and analyze tests |

### TDD Guide Agent

Specialized for TDD workflow:
```
Task(subagent_type="oh-my-claudecode:tdd-guide",
     model="sonnet",
     prompt="For [feature], suggest test cases following TDD")
```

### Quick TDD Suggestions

For simpler cases:
```
Task(subagent_type="oh-my-claudecode:tdd-guide-low",
     model="haiku",
     prompt="What test should I write first for [function]?")
```

## Test Case Categories

### Happy Path
Normal, expected usage:
```typescript
it('should return user when found', () => {
  const user = findUser('valid-id');
  expect(user).toBeDefined();
  expect(user.id).toBe('valid-id');
});
```

### Edge Cases
Boundary conditions:
```typescript
it('should handle empty string', () => {
  const result = processInput('');
  expect(result).toEqual([]);
});

it('should handle single item', () => {
  const result = processInput('one');
  expect(result).toEqual(['one']);
});
```

### Error Cases
Invalid inputs:
```typescript
it('should throw on null input', () => {
  expect(() => processInput(null)).toThrow('Input required');
});

it('should throw on invalid format', () => {
  expect(() => processInput(123)).toThrow('String expected');
});
```

### Integration
Components working together:
```typescript
it('should save and retrieve user', async () => {
  const created = await userService.create({ name: 'Test' });
  const retrieved = await userService.find(created.id);
  expect(retrieved.name).toBe('Test');
});
```

## Output Format

### During TDD
```
## TDD Progress

### Current Cycle: 3/7

### RED
Test: "should validate email format"
Status: Failing (expected)
```
npm test output showing failure
```

### GREEN (next step)
Need to implement: email validation regex
```

### Test Coverage
- [x] Valid input
- [x] Empty input
- [ ] Invalid format (current)
- [ ] Null handling
- [ ] Max length
```

### On Completion
```
## TDD Complete

### Feature: Email Validation

### Tests Written: 7
- [x] should accept valid email
- [x] should reject empty string
- [x] should reject missing @
- [x] should reject missing domain
- [x] should handle null gracefully
- [x] should handle unicode
- [x] should trim whitespace

### Implementation
Created: src/validation/email.ts (25 lines)
Test file: tests/validation/email.test.ts (120 lines)

### Refactorings Applied
1. Extracted regex to constant
2. Created reusable validation error
3. Added type definitions

### Test Results
All 7 tests passing
Coverage: 100%
```

## Test Structure Template

```typescript
describe('[Feature/Unit]', () => {
  // Setup
  beforeEach(() => {
    // Reset state
  });

  describe('[method/scenario]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange
      const input = ...;

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expected);
    });
  });

  describe('error cases', () => {
    it('should throw when [invalid condition]', () => {
      expect(() => functionUnderTest(invalid)).toThrow();
    });
  });
});
```

## Anti-Patterns to Avoid

1. **Writing implementation first**
   - BAD: Code first, tests later
   - GOOD: Test first, ALWAYS

2. **Writing multiple tests before implementation**
   - BAD: 5 failing tests at once
   - GOOD: One test at a time

3. **Over-implementing in GREEN**
   - BAD: Adding features not tested
   - GOOD: Minimal code to pass

4. **Skipping REFACTOR**
   - BAD: Move on after green
   - GOOD: Always consider improvements

5. **Testing implementation details**
   - BAD: Test private methods
   - GOOD: Test public behavior

6. **Fragile tests**
   - BAD: Tests that break on refactor
   - GOOD: Tests that verify behavior

## Combining with Other Skills

- **ralph + tdd**: Persist until all tests green
- **autopilot + tdd**: Auto-execute TDD cycles
- **code-review + tdd**: Review includes test quality

## Success Criteria

TDD complete when:
- [ ] All test cases written first
- [ ] All tests passing
- [ ] Implementation is minimal
- [ ] Refactoring complete
- [ ] No implementation without test
- [ ] Coverage adequate for feature
