---
name: tdd
description: Test-driven development workflow enforcement. Red-Green-Refactor cycle for quality-first development.
model: sonnet
user-invocable: true
---

# TDD Skill

Enforce test-driven development workflow: write tests first, then implement.

## Purpose

The TDD skill ensures quality-first development:
- Write failing tests first (RED)
- Implement minimal code to pass (GREEN)
- Refactor for quality (REFACTOR)
- Prevent regressions
- Drive design from tests

## When to Activate

Activate TDD when:
- User says "tdd", "test first", "test-driven"
- Starting new feature development
- Refactoring critical code
- Working on bug-prone areas
- Need high confidence in changes

## TDD Protocol

### The Red-Green-Refactor Cycle

```
1. RED: Write failing test
   ↓
2. GREEN: Minimal implementation to pass
   ↓
3. REFACTOR: Clean up code
   ↓
4. REPEAT for next requirement
```

## Implementation Workflow

### Phase 1: RED (Failing Test)

```
1. Understand requirement
2. Write test that specifies behavior
3. Run test - must FAIL
4. Verify failure is for right reason
```

**Output:**
```
## RED Phase

### Test Written
File: [test-file.test.ts]
Test: [test name]

### Test Code
```typescript
test('[behavior description]', () => {
  // Arrange
  [setup]

  // Act
  [action]

  // Assert
  [expectation]
});
```

### Test Result
✗ FAIL (expected)
Reason: [e.g., "function not implemented yet"]
```

### Phase 2: GREEN (Pass Test)

```
1. Write MINIMAL code to pass test
2. No gold-plating
3. Run test - must PASS
4. Verify no other tests broken
```

**Output:**
```
## GREEN Phase

### Implementation
File: [source-file.ts]
Changes: [minimal implementation]

### Test Result
✓ PASS

### All Tests
✓ [N] tests passing
✗ 0 tests failing
```

### Phase 3: REFACTOR (Clean Code)

```
1. Improve code quality
2. Remove duplication
3. Improve naming
4. Optimize if needed
5. Run tests - must still PASS
```

**Output:**
```
## REFACTOR Phase

### Improvements Made
- [Improvement 1]
- [Improvement 2]

### Test Result
✓ All tests still passing

Ready for next requirement.
```

## Task Patterns

### New Feature Development
```
## TDD: [Feature Name]

### Requirements
1. [Requirement 1]
2. [Requirement 2]
3. [Requirement 3]

---

### Cycle 1: [Requirement 1]

#### RED
Test: [test name]
Status: ✗ FAIL (expected)

#### GREEN
Implementation: [minimal code]
Status: ✓ PASS

#### REFACTOR
Improvements: [changes]
Status: ✓ PASS

---

### Cycle 2: [Requirement 2]
[Repeat structure]

---

### Summary
- Total tests: [count]
- All passing: ✓
- Code coverage: [%]
- Ready for review: ✓
```

### Bug Fix with TDD
```
## TDD Bug Fix: [Bug Description]

### Step 1: Reproduce Bug with Test

Test written: [test-file.test.ts]
Test: "reproduces bug with [scenario]"
Status: ✗ FAIL (confirms bug exists)

### Step 2: Fix Bug

Implementation: [fix description]
Status: ✓ Test now passes

### Step 3: Verify No Regression

All tests: ✓ [N] passing
Bug: ✓ Fixed
Regression: ✓ None

### Step 4: Refactor (if needed)

[Any cleanup]
Status: ✓ All tests still passing
```

### Refactoring with TDD
```
## TDD Refactoring: [Component]

### Step 1: Ensure Tests Exist

Existing tests: ✓ [count] tests covering component
Coverage: [%]
Status: ✓ All passing

### Step 2: Refactor Code

Changes:
- [Refactoring 1]
- [Refactoring 2]

### Step 3: Verify Tests Still Pass

Status: ✓ All [count] tests passing
Behavior: ✓ Unchanged
Code quality: ✓ Improved

### Step 4: Add Tests for Gaps (if any)

New tests: [count]
Coverage improved: [old%] → [new%]
```

## TDD Rules (Strict Enforcement)

### Rule 1: No Implementation Without Test
```
❌ VIOLATION: Writing implementation first
✓ CORRECT: Write failing test, then implement
```

### Rule 2: Minimal Implementation
```
❌ VIOLATION: Implementing features not yet tested
✓ CORRECT: Only code needed to pass current test
```

### Rule 3: Refactor Only on Green
```
❌ VIOLATION: Refactoring while tests fail
✓ CORRECT: All tests green before refactoring
```

### Rule 4: One Failing Test at a Time
```
❌ VIOLATION: Multiple failing tests
✓ CORRECT: Write one test, make it pass, then next
```

## Anti-Patterns to Avoid

1. **Testing implementation details**
   - BAD: Testing internal private methods
   - GOOD: Testing public behavior/interface

2. **Skipping RED phase**
   - BAD: Writing test that passes immediately
   - GOOD: Verify test fails before implementing

3. **Over-implementing in GREEN**
   - BAD: Adding features not tested yet
   - GOOD: Minimal code for current test

4. **Skipping REFACTOR**
   - BAD: Moving to next test with messy code
   - GOOD: Clean up before next cycle

## Success Criteria

TDD cycle completes when:
- [ ] Test written and fails (RED)
- [ ] Minimal implementation passes test (GREEN)
- [ ] Code refactored while tests pass (REFACTOR)
- [ ] No regressions in existing tests
- [ ] Ready for next requirement