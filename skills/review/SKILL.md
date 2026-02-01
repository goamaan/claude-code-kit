---
name: review
description: Multi-specialist parallel code review with security, performance, and architecture analysis
license: MIT
metadata:
  author: claudeops
  version: "4.0.0"
  claudeops:
    triggers: [review, audit, code review, PR review, review this]
    domains: [general]
    model: opus
    userInvocable: true
    disableModelInvocation: false
---

# Review Skill

Multi-specialist parallel code review system. Spawns parallel review agents covering security, performance, architecture, and simplicity, then synthesizes findings into a unified review report.

## When to Activate

- User says "review", "audit", "code review", "PR review"
- User asks for security review, architecture review, or performance review
- User wants pre-merge validation
- User wants a plan, design, or architecture critiqued

## Review Modes

### 1. PR Review: Multi-Dimensional Analysis

**Pattern**: Fan-Out + Reduce

#### Phase 1: Context
1. Spawn explore agent (haiku) to identify all changed files
2. Gather PR context: description, commits, linked issues
3. Load `references/domains/code-review.md` domain guide

#### Phase 2: Parallel Review (Fan-Out)
Spawn 4 specialist agents simultaneously:

```
Task(subagent_type="security", model="opus", run_in_background=True,
     prompt="Review these files for security vulnerabilities: [files]. Focus on OWASP Top 10...")

Task(subagent_type="architect", model="opus", run_in_background=True,
     prompt="Review these files for performance and architecture: [files]. Check algorithms, patterns...")

Task(subagent_type="critic", model="opus", run_in_background=True,
     prompt="Review these files for over-engineering and simplicity: [files]. Check YAGNI, complexity...")

Task(subagent_type="explore", model="haiku", run_in_background=True,
     prompt="Check test coverage for changed files: [files]. Identify missing test scenarios...")
```

#### Phase 3: Synthesis (Reduce)
Collect all results, produce unified report.

### 2. Plan / Architecture Critique

For reviewing plans, designs, and architectures:

1. **Understand** — Read plan/design thoroughly, understand goals, constraints, assumptions
2. **Challenge assumptions** — For each assumption: "What if this is wrong?"
3. **Identify gaps** — Missing error handling, edge cases, security, testing, monitoring
4. **Evaluate alternatives** — Suggest better approaches where applicable
5. **Pre-mortem** — Imagine the project failed. Why?

### 3. Pre-merge Validation

**Pattern**: Pipeline (gate-based)

Gates (all must pass):
1. **Build** — `npm run build` (or equivalent) succeeds
2. **Tests** — all tests pass
3. **Review** — No critical findings from parallel review
4. **Docs** — Documentation updated if API changed

## Severity Scale

| Level | Label | Meaning |
|-------|-------|---------|
| Critical | Must Fix | Security vulnerabilities, data loss risks, breaking changes without migration |
| High | Should Fix | Maintainability issues, performance problems, missing error handling |
| Medium | Consider | Naming improvements, minor optimizations, documentation gaps |
| Low | Note | Style suggestions, optional improvements |

## Output Format

```
## Code Review Report

### Risk Level: [Low/Medium/High/Critical]

### Must Fix (Blocking)
- [Finding] — [file:line] — [severity]
  [Description and remediation]

### Should Fix (Non-blocking)
- [Finding] — [file:line]
  [Description and suggestion]

### Consider
- [Suggestion] — [file:line]
  [Trade-off analysis]

### Strengths
- [What was done well]

### Summary by Specialist
- **Security**: [N findings] ([critical/high/medium/low])
- **Architecture**: [N findings]
- **Simplicity**: [N findings]
- **Testing**: [N findings]
```

## Plan Critique Output

```
## Plan Critique: [Plan Name]

### Strengths
1. [Strength] — [why it matters]

### Weaknesses
1. [Weakness] — [impact] — [recommendation]

### Assumptions Challenged
1. [Assumption] — [challenge] — [risk if wrong]

### Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [risk] | [H/M/L] | [H/M/L] | [action] |

### Missing Elements
- [Element]: [why needed]

### Decision: [APPROVED / NEEDS REVISION / NEEDS DISCUSSION]
```

## Anti-Patterns
1. **Sequential review** — Always use parallel Fan-Out for specialists
2. **Single perspective** — Use multiple specialists for comprehensive coverage
3. **No synthesis** — Always produce a unified report from parallel findings
4. **Rubber stamping** — Deep analysis required, not "looks good"
5. **No positive feedback** — Acknowledge what's done well alongside issues
6. **Vague comments** — "This looks wrong" → "This causes X because Y, recommend Z"
7. **Bike-shedding** — Focus on critical issues first, not formatting
