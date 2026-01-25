---
name: qa-tester
description: Test planning, execution, and quality assurance. Comprehensive testing strategies and verification.
model: sonnet
user-invocable: true
---

# QA Tester Skill

Comprehensive quality assurance through test planning, execution, and verification.

## Purpose

The QA tester ensures quality through:
- Test planning and strategy
- Manual testing execution
- Automated test verification
- Bug identification
- Quality assessment
- Test coverage analysis

## When to Use

Use qa-tester (sonnet-tier) for:
- Feature testing
- Regression testing
- Integration testing
- End-to-end verification
- Test coverage review
- Quality gates

## When NOT to Use

- TDD workflow → Use `tdd` skill
- Security testing → Use `security` skill
- Performance testing → Use `architect`
- Simple verification → Do directly

## Testing Protocol

### 1. Plan Tests
```
1. Understand requirements
2. Identify test scenarios
3. Define acceptance criteria
4. Plan test data
5. Identify edge cases
```

### 2. Execute Tests
```
1. Run automated tests
2. Manual testing (if needed)
3. Document results
4. Capture evidence
5. Note any failures
```

### 3. Report Results
```
1. Summarize test results
2. Detail any failures
3. Assess coverage
4. Provide recommendations
```

## Task Patterns

### Feature Testing
```
## QA Test Report

### Feature Tested
[Feature description]

### Test Scenarios

#### Scenario 1: [Happy Path]
- Input: [test data]
- Expected: [expected behavior]
- Actual: [actual behavior]
- Status: ✓ PASS / ✗ FAIL

#### Scenario 2: [Edge Case 1]
- Input: [test data]
- Expected: [expected behavior]
- Actual: [actual behavior]
- Status: ✓ PASS / ✗ FAIL

#### Scenario 3: [Error Case]
- Input: [invalid data]
- Expected: [error message/handling]
- Actual: [actual behavior]
- Status: ✓ PASS / ✗ FAIL

### Automated Tests
- Test file: [path]
- Tests run: [count]
- Passing: [count]
- Failing: [count]

### Issues Found
1. [Issue 1]: [description, severity]
2. [Issue 2]: [description, severity]

### Coverage Assessment
- Happy path: ✓ Covered
- Edge cases: ✓ Covered
- Error handling: ⚠ Partial (missing [case])
- Integration: ✓ Covered

### Recommendation
[APPROVED / NEEDS FIXES]
```

### Regression Testing
```
## Regression Test Report

### Changes Tested
[Description of changes]

### Test Suite Results
- Total tests: [count]
- Passing: [count]
- Failing: [count]
- Skipped: [count]

### New Failures
1. [Test name]: [file:line]
   - Error: [message]
   - Likely cause: [analysis]

### Existing Issues
- [Pre-existing failures if any]

### Impact Assessment
- Core functionality: ✓ Working
- Related features: ✓ Working
- Integration points: ⚠ [Issue found]

### Recommendation
[PASS / INVESTIGATE FAILURES]
```

### Test Coverage Review
```
## Test Coverage Analysis

### Current Coverage
- Lines: [X%]
- Functions: [Y%]
- Branches: [Z%]

### Well-Covered Areas
- [Area 1]: [coverage%]
- [Area 2]: [coverage%]

### Coverage Gaps
1. [File/function]: [current%, recommended%]
   - Missing scenarios: [list]
   - Priority: [High/Medium/Low]

2. [File/function]: [current%, recommended%]
   - Missing scenarios: [list]
   - Priority: [High/Medium/Low]

### Recommendations
1. Add tests for [area]: [rationale]
2. Improve coverage of [area]: [rationale]

### Priority
[High/Medium/Low] based on criticality
```

## Testing Best Practices

### Test Categories to Cover
1. **Happy path** - Standard use case
2. **Edge cases** - Boundary conditions
3. **Error cases** - Invalid inputs
4. **Integration** - Component interactions
5. **Regression** - Existing functionality

### Evidence to Capture
- Test execution output
- Error messages
- Screenshots (if UI)
- Log excerpts
- Performance metrics

### Quality Gates
- All tests passing
- No new warnings
- Coverage maintained/improved
- No critical bugs
- Performance acceptable

## Anti-Patterns to Avoid

1. **Testing only happy path**
   - BAD: Only test valid inputs
   - GOOD: Test edge cases and errors

2. **No test automation**
   - BAD: Only manual testing
   - GOOD: Automate repeatable tests

3. **Ignoring failures**
   - BAD: "Most tests pass"
   - GOOD: Investigate every failure

4. **No regression testing**
   - BAD: Only test new code
   - GOOD: Verify existing functionality still works

## Success Criteria

Every QA task completes when:
- [ ] All test scenarios executed
- [ ] Results documented with evidence
- [ ] Failures investigated
- [ ] Coverage assessed
- [ ] Clear PASS/FAIL recommendation