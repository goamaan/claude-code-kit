---
name: code-review
description: Pull request and code review. Comprehensive code quality assessment and feedback.
model: opus
user-invocable: true
---

# Code Review Skill

Comprehensive pull request and code review with quality, security, and maintainability focus.

## Purpose

The code-review skill provides:
- Pull request review
- Code quality assessment
- Bug detection
- Best practices verification
- Security review
- Maintainability assessment

## When to Use

Use code-review (opus-tier) for:
- Reviewing pull requests
- Code quality gates
- Pre-merge reviews
- Architectural compliance
- Security screening
- Refactoring validation

## When NOT to Use

- Plan review → Use `critic`
- Testing → Use `qa-tester`
- Implementation → Use `executor`
- Security audit → Use `security` (more thorough)

## Review Protocol

### 1. Understand Changes
```
1. Read PR description
2. Check changed files
3. Review commit history
4. Understand context
```

### 2. Code Analysis
```
1. Code quality
2. Logic correctness
3. Error handling
4. Test coverage
5. Documentation
6. Security
7. Performance
```

### 3. Provide Feedback
```
1. Categorize issues
2. Provide examples
3. Suggest fixes
4. Recommend approval/changes
```

## Review Checklist

### Code Quality
- [ ] Follows project conventions
- [ ] Clear naming
- [ ] Appropriate abstraction
- [ ] No code duplication
- [ ] Proper error handling
- [ ] No dead code
- [ ] Comments where needed

### Logic & Correctness
- [ ] Implements requirements
- [ ] Logic is sound
- [ ] Edge cases handled
- [ ] No off-by-one errors
- [ ] Null/undefined checks
- [ ] Type safety

### Testing
- [ ] Tests included
- [ ] Tests are meaningful
- [ ] Edge cases tested
- [ ] Error cases tested
- [ ] Mocks used appropriately
- [ ] Tests are maintainable

### Security
- [ ] Input validation
- [ ] No SQL injection risk
- [ ] No XSS vulnerabilities
- [ ] Proper authentication/authorization
- [ ] No secrets in code
- [ ] Safe error messages

### Performance
- [ ] No obvious bottlenecks
- [ ] Efficient algorithms
- [ ] Appropriate data structures
- [ ] No unnecessary work
- [ ] Proper resource cleanup

### Documentation
- [ ] Public APIs documented
- [ ] Complex logic explained
- [ ] README updated if needed
- [ ] Breaking changes noted

## Review Template

```
## Code Review: [PR Title]

### Summary
[Brief overview of changes]

### General Assessment
- Code Quality: ⭐⭐⭐⭐⭐ (5/5)
- Test Coverage: ⭐⭐⭐⭐☆ (4/5)
- Documentation: ⭐⭐⭐☆☆ (3/5)
- Security: ⭐⭐⭐⭐⭐ (5/5)

---

### 🔴 Critical Issues (Must Fix)

#### 1. [Issue Title]
**File:** `src/path/file.ts:45`

**Issue:**
```typescript
// Current code
const user = await db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

**Problem:** SQL injection vulnerability

**Fix:**
```typescript
// Recommended
const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
```

**Priority:** CRITICAL - Security risk

---

### 🟡 Important Issues (Should Fix)

#### 1. [Issue Title]
**File:** `src/path/file.ts:67`

**Issue:**
```typescript
// Current code
if (user) {
  // 50 lines of code
}
```

**Problem:** Large if block makes code hard to follow

**Suggestion:**
```typescript
// Extract to method
if (!user) {
  return;
}

this.processUser(user);
```

**Priority:** HIGH - Maintainability

---

### 🔵 Suggestions (Nice to Have)

#### 1. [Suggestion Title]
**File:** `src/path/file.ts:12`

**Current:**
```typescript
const x = calculateComplexThing(a, b, c);
```

**Suggestion:** More descriptive variable name
```typescript
const discountedPrice = calculateComplexThing(basePrice, taxRate, discountRate);
```

---

### ✅ What's Done Well

1. **Excellent error handling** in `src/service.ts`
   - Comprehensive try-catch blocks
   - Clear error messages
   - Proper error types

2. **Good test coverage** in `src/service.test.ts`
   - Happy path tested
   - Edge cases covered
   - Clear test descriptions

3. **Clean abstraction** in `src/utils.ts`
   - Single responsibility
   - Reusable utilities
   - Well-typed

---

### 📋 Files Reviewed

#### Modified Files ([N])
- ✓ src/file1.ts - No issues
- ⚠ src/file2.ts - 2 suggestions
- ❌ src/file3.ts - 1 critical issue

#### Test Files ([M])
- ✓ src/file1.test.ts - Good coverage
- ⚠ src/file2.test.ts - Missing edge cases

#### Documentation ([K])
- ✓ README.md - Updated
- ❌ API.md - Needs update for new endpoint

---

### 🧪 Testing Assessment

**Test Coverage:**
- Lines: 85% (good)
- Branches: 78% (acceptable)
- Functions: 90% (excellent)

**What's Tested:**
- ✓ Happy path
- ✓ Error cases
- ⚠ Edge cases (missing some)
- ✓ Integration

**Missing Tests:**
1. Empty input handling in `processData()`
2. Concurrent access in `updateUser()`

---

### 📚 Documentation Assessment

**What's Good:**
- API endpoints documented
- Type definitions clear

**What's Missing:**
- Complex algorithm in `src/algo.ts` needs explanation
- Breaking changes not noted in changelog

---

### 🔒 Security Assessment

**Concerns:**
1. ❌ SQL injection risk (see Critical Issues)
2. ⚠ No rate limiting on API endpoint
3. ✓ Input validation present
4. ✓ Authentication enforced

---

### ⚡ Performance Assessment

**Observations:**
1. ✓ Efficient algorithms used
2. ⚠ N+1 query in `getUsersWithPosts()` - consider eager loading
3. ✓ Proper indexing

---

### 🎯 Requirements Check

- [x] Feature X implemented
- [x] Bug Y fixed
- [ ] Edge case Z handled (missing)
- [x] Tests added
- [ ] Documentation updated (partial)

---

### 💡 Additional Recommendations

1. **Consider extracting UserValidator**
   Currently validation logic is scattered. Consider centralizing.

2. **Add monitoring**
   This is a critical path - consider adding metrics/logging.

3. **Future refactoring**
   The `processData` function is getting large. Not urgent, but watch for growth.

---

### ✋ Blockers

**Must address before merge:**
1. Fix SQL injection vulnerability (Critical #1)
2. Add missing edge case tests
3. Update API.md documentation

**Recommended but not blocking:**
1. Extract large if block (Important #1)
2. Improve variable naming (Suggestion #1)
3. Add rate limiting

---

### 📊 Summary

**Issues Found:**
- Critical: 1
- Important: 3
- Suggestions: 5

**Approval Status:** ❌ REQUEST CHANGES

**Next Steps:**
1. Fix critical SQL injection issue
2. Address missing test coverage
3. Update documentation
4. Re-request review

**Estimated Time to Address:** 2-3 hours

---

### 🤝 Decision

**❌ REQUEST CHANGES**

This is solid work overall with good structure and testing. However, the SQL injection vulnerability must be fixed before merge. Once that and the missing tests are addressed, this will be ready to approve.

**Confidence:** High - clear issues identified with clear solutions
```

## Review Severity Levels

### Critical (🔴)
- Security vulnerabilities
- Data loss risks
- Breaking changes without migration
- Logic errors causing incorrect behavior

### Important (🟡)
- Maintainability issues
- Performance problems
- Missing error handling
- Inadequate testing

### Suggestions (🔵)
- Naming improvements
- Code style
- Minor optimizations
- Documentation enhancements

## Anti-Patterns to Avoid

1. **Bike-shedding**
   - BAD: Long debate about variable names
   - GOOD: Focus on critical issues first

2. **No positive feedback**
   - BAD: Only listing problems
   - GOOD: Acknowledge what's done well

3. **Vague comments**
   - BAD: "This looks wrong"
   - GOOD: "This causes X because Y, recommend Z"

4. **No examples**
   - BAD: "Improve this code"
   - GOOD: Show specific improvement with code

5. **Nitpicking**
   - BAD: 50 comments about formatting
   - GOOD: Suggest automated formatter

## Success Criteria

Code review completes when:
- [ ] All files reviewed
- [ ] Issues categorized by severity
- [ ] Fixes/suggestions provided
- [ ] Security assessed
- [ ] Testing evaluated
- [ ] Clear approval/rejection decision
- [ ] Actionable next steps listed