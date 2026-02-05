---
description: >
  Multi-specialist parallel code review. Use when the user says "review", "audit", "code review",
  "PR review", "grill me", "challenge this", "prove it works", "adversarial", "devil's advocate",
  "poke holes", "explain", "how does this work", "walk me through", "teach me", "create a diagram",
  "visualize", asks for security/architecture/performance review, wants pre-merge validation,
  or wants a plan/design critiqued. Spawns parallel security, architecture, and testing agents
  then synthesizes findings into a unified report. Prefer this over autopilot when the user wants
  analysis or evaluation of existing code, not building or changing it.
user-invocable: true
---

# Review Skill

Multi-specialist parallel code review system. Spawns parallel review agents covering security, architecture, and testing, then synthesizes findings into a unified review report.

## When to Activate

- User says "review", "audit", "code review", "PR review"
- User asks for security review, architecture review, or performance review
- User wants pre-merge validation
- User wants a plan, design, or architecture critiqued
- User says "grill me", "challenge this", "prove it works", "poke holes", "devil's advocate"
- User says "explain", "how does this work", "walk me through", "teach me"
- User says "create a diagram", "visualize"

## Review Modes

### 1. PR Review: Multi-Dimensional Analysis

**Pattern**: Agent Team + Synthesis

#### Phase 1: Context
1. Spawn explore agent to identify all changed files
2. Gather PR context: description, commits, linked issues

#### Phase 2: Parallel Review (Agent Team)
Create an agent team with three reviewer teammates to analyze the changed files in parallel:

1. **Security reviewer** — Analyze the changed files for security vulnerabilities, focusing on OWASP Top 10 issues, authentication/authorization flaws, injection vulnerabilities, data exposure risks, and cryptographic weaknesses. Review input validation, session handling, and sensitive data flows.

2. **Architecture reviewer** — Evaluate the changed files for architecture quality, performance implications, design patterns, and code simplicity. Check for proper abstractions, YAGNI violations, unnecessary complexity, algorithm efficiency, scalability concerns, and adherence to established patterns.

3. **Testing reviewer** — Assess test coverage for the changed files. Identify missing test scenarios, edge cases that aren't covered, error conditions that should be tested, and integration test gaps.

As team lead, collect findings from all three reviewers and ensure comprehensive coverage across security, architecture, and testing dimensions.

#### Phase 3: Synthesis
Synthesize all reviewer findings into a unified Code Review Report. Organize findings by severity (Must Fix, Should Fix, Consider), highlight strengths, and provide a summary by specialist. Clean up the agent team.

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

### 4. Adversarial / Challenge

**Pattern**: Adversarial Agent Team

Triggered by: "grill me", "challenge this", "prove it works", "poke holes", "devil's advocate"

#### Phase 1: Understand Claims
Identify the claims being made (from PR description, code comments, or user's explanation).

#### Phase 2: Adversarial Review (Agent Team)
Create an agent team with two adversarial reviewers who will challenge the code and each other's findings:

1. **Hostile architect** — Act as a hostile staff engineer reviewing this code. For every claim, demand evidence and test assumptions. Ask "How do you know this works?" and "What if [dependency] fails or [input] is malformed?" Challenge scalability: "Does this work with 10x load? 100x?" Question necessity: "Why not [simpler approach]?" Be rigorous and thorough, not polite. No rubber stamps. Push back on unproven claims and identify architectural weaknesses.

2. **Red-team security** — Red-team this code as if you're trying to exploit it. Find attack vectors, injection points, authentication bypasses, authorization flaws, data leaks, and privilege escalation paths. Assume adversarial input everywhere. Look for race conditions, resource exhaustion vulnerabilities, and side-channel attacks. Challenge the security reviewer's findings to ensure nothing is missed.

As team lead, synthesize the adversarial findings and ensure both reviewers have challenged each other's assumptions to produce the most rigorous analysis possible.

#### Phase 3: "Prove It Works" Variant
If triggered by "prove it works":
```
Bash: git diff main...HEAD --stat
Task(subagent_type="tester",
     prompt="Diff behavior between main and current branch. For each changed behavior:
     - Does it have a test?
     - Can you break it with edge case input?
     - What happens under failure conditions?")
```

#### Phase 4: Challenge Report
Produce a challenge report. Won't approve until all critical concerns are addressed.

```
## Challenge Report

### Claims vs Evidence
| # | Claim | Evidence | Verdict |
|---|-------|----------|---------|
| 1 | [claim] | [evidence or lack thereof] | Proven / Unproven / Disproven |

### Attack Surface
- [vulnerability or attack vector]

### Failure Modes
- [what happens when X fails]

### Unaddressed Concerns
- [concern that needs resolution before approval]

### Decision: [APPROVED / NOT PROVEN / REJECTED]
```

### 5. Explain / Teach

**Pattern**: Guided Exploration + Synthesis

Triggered by: "explain", "how does this work", "walk me through", "teach me", "create a diagram", "visualize"

#### Phase 1: Map the Territory
```
Task(subagent_type="explore", run_in_background=True,
     prompt="Map all files, functions, and data flows related to [topic]. Build a dependency graph...")

Task(subagent_type="architect", run_in_background=True,
     prompt="Trace the code paths for [topic] from entry point to final output.
     Identify the key abstractions, data transformations, and control flow decisions...")
```

#### Phase 2: Build Explanation (Simple → Complex)
Synthesize findings into a layered explanation:

1. **High-level overview** — What does this system/feature do? (1-2 sentences)
2. **ASCII architecture diagram** — Visual map of components and data flow
3. **Step-by-step walkthrough** — Trace a request/operation through the code
4. **Key file annotations** — What each important file does and why

#### Phase 3: Output Format

```
## How [Topic] Works

### Overview
[1-2 sentence summary]

### Architecture
```
[ASCII diagram showing components, data flow, and relationships]
```

### Walkthrough
1. [Step 1]: [file:line] — [what happens and why]
2. [Step 2]: [file:line] — [what happens and why]
...

### Key Files
| File | Purpose | Key Functions |
|------|---------|---------------|
| [file] | [purpose] | [function1, function2] |

### Concepts to Understand
- **[Concept 1]**: [explanation]
- **[Concept 2]**: [explanation]
```

#### Optional: HTML Presentation
If user asks for a presentation or visualization, generate a self-contained HTML file with:
- Code highlights with syntax coloring
- Interactive expandable sections
- Architecture diagrams using ASCII or SVG
- Step-by-step animation of data flow

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
1. **Sequential review** — Always use parallel agent teams for specialists
2. **Single perspective** — Use multiple specialists for comprehensive coverage
3. **No synthesis** — Always produce a unified report from parallel findings
4. **Rubber stamping** — Deep analysis required, not "looks good"
5. **No positive feedback** — Acknowledge what's done well alongside issues
6. **Vague comments** — "This looks wrong" → "This causes X because Y, recommend Z"
7. **Bike-shedding** — Focus on critical issues first, not formatting
8. **Forgetting cleanup** — Always clean up agent teams after synthesis
