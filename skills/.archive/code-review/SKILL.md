---
name: code-review
description: Comprehensive 6-agent parallel code review
auto_trigger:
  - review this
  - code review
  - review my code
  - check this code
  - review PR
allowed_tools:
  - Task
  - Read
  - Glob
  - Grep
  - Bash
---

# Code Review Skill

Comprehensive code review using 6 specialized agents in parallel for thorough, multi-dimensional analysis.

## Purpose

Provides professional-grade code review by:
- Running 6 specialized reviewers in parallel
- Covering correctness, security, performance, style, tests, and documentation
- Synthesizing findings into prioritized action items
- Catching issues a single reviewer might miss

## When to Activate

Activate when user says:
- "review this code"
- "code review"
- "review my PR"
- "check this code"
- "review [file/function/feature]"

## The 6-Agent Review Team

### 1. Correctness Reviewer
**Agent:** `architect-medium` (sonnet)
**Focus:**
- Logic errors
- Edge cases
- Error handling
- Control flow issues
- Data integrity

**Prompt Template:**
```
Review for CORRECTNESS:
- Logic errors or bugs
- Missing edge case handling
- Error handling gaps
- Control flow issues
- Data integrity problems

Files: [files]
Context: [context]
```

### 2. Security Reviewer
**Agent:** `security-reviewer` (opus) or `security-reviewer-low` (haiku)
**Focus:**
- Injection vulnerabilities
- Authentication/authorization
- Data exposure
- Input validation
- Secrets handling

**Prompt Template:**
```
Review for SECURITY:
- Injection vulnerabilities (SQL, XSS, command)
- Authentication/authorization issues
- Sensitive data exposure
- Input validation gaps
- Secrets/credentials in code

Files: [files]
Context: [context]
```

### 3. Performance Reviewer
**Agent:** `architect-medium` (sonnet)
**Focus:**
- Algorithm complexity
- Memory usage
- Database query efficiency
- Unnecessary operations
- Caching opportunities

**Prompt Template:**
```
Review for PERFORMANCE:
- Algorithm complexity issues
- Memory usage concerns
- Database query efficiency
- Unnecessary computations
- Missing caching opportunities

Files: [files]
Context: [context]
```

### 4. Style Reviewer
**Agent:** `code-reviewer-low` (haiku)
**Focus:**
- Code style consistency
- Naming conventions
- Code organization
- Readability
- DRY violations

**Prompt Template:**
```
Review for STYLE:
- Code style consistency
- Naming conventions
- Code organization
- Readability issues
- DRY principle violations

Files: [files]
Context: [context]
```

### 5. Test Reviewer
**Agent:** `qa-tester` (sonnet)
**Focus:**
- Test coverage gaps
- Test quality
- Edge cases in tests
- Mocking appropriateness
- Test maintainability

**Prompt Template:**
```
Review for TESTS:
- Test coverage gaps
- Test quality and assertions
- Edge cases not tested
- Mocking appropriateness
- Test maintainability

Files: [files]
Related tests: [test files]
```

### 6. Documentation Reviewer
**Agent:** `writer` (haiku)
**Focus:**
- Missing documentation
- Outdated comments
- API documentation
- README updates needed
- Type documentation

**Prompt Template:**
```
Review for DOCUMENTATION:
- Missing function/class documentation
- Outdated comments
- API documentation gaps
- README updates needed
- Type documentation

Files: [files]
Context: [context]
```

## Workflow

### Phase 1: Scope Identification

1. Identify files to review:
   ```
   # If specific files given
   files = user_specified_files

   # If PR review
   files = git diff --name-only

   # If general review
   files = recently_modified_files
   ```

2. Gather context:
   ```
   Read(each file)
   Identify test files
   Understand dependencies
   ```

### Phase 2: Parallel Review

Spawn ALL 6 reviewers simultaneously:

```
# All in parallel
Task(subagent="architect-medium", prompt="Correctness review: [files]")
Task(subagent="security-reviewer", prompt="Security review: [files]")
Task(subagent="architect-medium", prompt="Performance review: [files]")
Task(subagent="code-reviewer-low", prompt="Style review: [files]")
Task(subagent="qa-tester", prompt="Test review: [files]")
Task(subagent="writer", prompt="Documentation review: [files]")
```

### Phase 3: Synthesis

Collect all findings and synthesize:

1. **Categorize by severity:**
   - CRITICAL: Security issues, data loss bugs
   - HIGH: Logic errors, performance problems
   - MEDIUM: Missing tests, style issues
   - LOW: Documentation, minor style

2. **Deduplicate:**
   - Multiple reviewers may catch same issue
   - Keep most detailed description

3. **Prioritize:**
   - Security before features
   - Correctness before style
   - Tests before docs

## Output Format

### Review Summary
```
## Code Review: [Scope]

### Overview
Reviewed [N] files across [M] areas.
Found [X] issues: [critical] critical, [high] high, [medium] medium, [low] low

### Critical Issues
These MUST be fixed before merge:

1. **[Security] SQL Injection in user.ts:42**
   Direct string interpolation in SQL query allows injection.
   ```typescript
   // Problem
   query(`SELECT * FROM users WHERE id = ${userId}`)

   // Fix
   query(`SELECT * FROM users WHERE id = $1`, [userId])
   ```

### High Priority
These SHOULD be fixed:

2. **[Correctness] Missing null check in order.ts:88**
   `user.profile.settings` accessed without checking if profile exists.

3. **[Performance] N+1 query in report.ts:120**
   Loading users in loop instead of batch query.

### Medium Priority
Consider fixing:

4. **[Tests] No tests for edge cases in auth.ts**
   Missing tests for: expired token, invalid format, rate limiting.

5. **[Style] Inconsistent error handling**
   Mix of try/catch and .catch() patterns.

### Low Priority
Nice to have:

6. **[Documentation] Missing JSDoc for public API**
   `createOrder`, `updateOrder`, `cancelOrder` lack documentation.

### Positive Notes
- Good separation of concerns in service layer
- Comprehensive logging throughout
- Clean async/await usage

### Recommended Actions
1. [ ] Fix SQL injection (critical)
2. [ ] Add null checks (high)
3. [ ] Optimize N+1 query (high)
4. [ ] Add missing tests (medium)
5. [ ] Document public API (low)
```

## Severity Definitions

### Critical
- Security vulnerabilities
- Data loss/corruption potential
- System crashes
- Must fix before merge

### High
- Logic bugs
- Performance issues
- Missing error handling
- Should fix before merge

### Medium
- Missing tests
- Style inconsistencies
- Minor edge cases
- Fix in same PR or follow-up

### Low
- Documentation gaps
- Minor style issues
- Optimization opportunities
- Track for later

## Agent Selection by Scope

### Quick Review (3 agents)
For small changes:
```
- correctness: architect-low (haiku)
- security: security-reviewer-low (haiku)
- style: code-reviewer-low (haiku)
```

### Standard Review (6 agents)
For most PRs:
```
- correctness: architect-medium (sonnet)
- security: security-reviewer-low (haiku)
- performance: architect-medium (sonnet)
- style: code-reviewer-low (haiku)
- tests: qa-tester (sonnet)
- docs: writer (haiku)
```

### Deep Review (6 agents, high tier)
For critical code:
```
- correctness: architect (opus)
- security: security-reviewer (opus)
- performance: architect (opus)
- style: code-reviewer (opus)
- tests: qa-tester-high (opus)
- docs: writer (haiku)
```

## Anti-Patterns to Avoid

1. **Sequential reviews**
   - BAD: Run one reviewer, wait, run next
   - GOOD: All 6 in parallel

2. **Missing context**
   - BAD: Review file in isolation
   - GOOD: Include related files, dependencies

3. **No prioritization**
   - BAD: List all issues equally
   - GOOD: Categorize by severity

4. **Only negative feedback**
   - BAD: Just listing problems
   - GOOD: Include positive notes and good patterns

5. **Vague suggestions**
   - BAD: "Consider improving this"
   - GOOD: Specific issue with code example fix

## Success Criteria

Code review complete when:
- [ ] All 6 reviewers have reported
- [ ] Findings synthesized and deduplicated
- [ ] Issues prioritized by severity
- [ ] Actionable recommendations provided
- [ ] Positive patterns acknowledged
