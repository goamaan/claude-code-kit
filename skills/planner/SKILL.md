---
name: planner
description: Strategic planning with plan approval workflow and maximal requirement gathering
license: MIT
metadata:
  author: claudeops
  version: "4.0.0"
  claudeops:
    triggers: [plan this, how should I approach, design a plan, help me plan]
    domains: [general]
    model: opus
    userInvocable: true
    disableModelInvocation: false
---

# Planner Skill (v5.0)

Strategic planning skill that converts vague requests into actionable, executable task plans. Interviews the user, explores the codebase automatically, and produces comprehensive plans with dependency graphs and parallelization opportunities.

## When to Activate

- User says "plan this", "how should I approach", "design a plan for"
- User has a broad/vague request affecting 3+ areas
- Complex task where the approach is unclear
- Major feature or system redesign

## Execution Modes

### Mode A: Plan Approval Workflow (TeammateTool Available)

When TeammateTool is detected:

1. Spawn architect teammate with `plan_mode_required`
2. Architect explores codebase, drafts plan, submits for approval
3. Leader (you, the orchestrator) reviews and approves/rejects with feedback
4. Approved plan becomes the task graph for execution
5. Hand off to autopilot or orchestrate for execution

### Mode B: Subagent Planning (Fallback / Default)

When TeammateTool is NOT available:

1. Interview user for requirements (maximal AskUserQuestion)
2. Spawn explore + architect agents to gather codebase context
3. Synthesize plan from interview + exploration
4. Submit for user approval via plan mode or report

## Pre-Planning: Automatic Discovery

Before asking ANY questions, explore the codebase automatically:

1. **Spawn explore agent** (haiku) to:
   - Map directory structure
   - Find relevant files for the request
   - Identify existing patterns and conventions
   - Discover tech stack and dependencies

2. **Load domain guide** from `references/domains/` based on detected task type

3. **ONLY THEN** start the interview with discovered context

## The Planning Interview

### Golden Rule
> Ask ONLY preference questions. Never ask questions you can answer by exploring the codebase.

### What to Ask (Preferences & Decisions)
- "Would you prefer approach A or B?"
- "How important is X vs Y?"
- "Should we prioritize Z?"
- "What's the scope boundary?"
- "Are there constraints I should know about?"

### What NOT to Ask (Discoverable Facts)
- "What framework do you use?" → Explore and find out
- "Where are the config files?" → Use Glob/Grep to find them
- "What's the folder structure?" → Read the directory layout
- "What testing library?" → Check package.json/go.mod/etc.

## AskUserQuestion: Maximal Usage

Use AskUserQuestion with maximum richness:

```
AskUserQuestion(questions=[
  {
    question: "What's the primary goal for this feature?",
    header: "Goal",
    options: [
      {label: "User-facing functionality (Recommended)", description: "Build the feature end-to-end with full UI, API, and storage. Most value delivered."},
      {label: "Internal tooling", description: "Backend/CLI tool for internal use. Simpler UI requirements."},
      {label: "Infrastructure/foundation", description: "Lay groundwork for future features. No user-visible changes yet."},
      {label: "Proof of concept", description: "Quick prototype to validate approach. Minimal polish expected."}
    ],
    multiSelect: false
  },
  {
    question: "What quality level should we target?",
    header: "Quality",
    options: [
      {label: "Production-ready (Recommended)", description: "Full test coverage, error handling, documentation. Ready to ship."},
      {label: "Beta quality", description: "Core functionality works. Some edge cases and polish deferred."},
      {label: "MVP", description: "Happy path only. Get it working, iterate later."}
    ],
    multiSelect: false
  },
  {
    question: "Any specific constraints or requirements?",
    header: "Constraints",
    options: [
      {label: "Must be backwards compatible", description: "Cannot break existing APIs or data formats."},
      {label: "Performance-critical", description: "Must handle high load. Needs benchmarking."},
      {label: "Security-sensitive", description: "Handles sensitive data. Needs security review."},
      {label: "No special constraints", description: "Standard development practices apply."}
    ],
    multiSelect: true
  },
  {
    question: "How should we handle the existing code in this area?",
    header: "Approach",
    options: [
      {label: "Extend existing patterns (Recommended)", description: "Follow current architecture. Minimal disruption to codebase."},
      {label: "Refactor as needed", description: "Improve existing code while adding new. May change existing interfaces."},
      {label: "Greenfield implementation", description: "Build fresh, migrate later. Higher effort but cleaner result."}
    ],
    multiSelect: false
  }
])
```

## Plan Creation Process

### Step 1: Gather Context (Automatic)
- Explore codebase structure
- Identify relevant files and patterns
- Load domain guide

### Step 2: Interview User
- Ask 3-4 focused preference questions (not factual questions)
- Use AskUserQuestion with rich options and descriptions
- Show discovered context to demonstrate understanding

### Step 3: Draft Plan
Based on interview + exploration, create structured plan:

```markdown
## Plan: [Title]

### Overview
[2-3 sentence description of what will be built and the approach]

### Requirements
1. [Requirement from user interview]
2. [Requirement derived from exploration]
3. [Technical requirement from constraints]

### Architecture
[Technical approach, key design decisions, patterns to follow]

### Task Breakdown

#### Phase 1: Foundation
| # | Task | Agent | Model | Blocked By |
|---|------|-------|-------|------------|
| 1 | [task description] | executor | sonnet | - |
| 2 | [task description] | executor | sonnet | - |

#### Phase 2: Implementation
| # | Task | Agent | Model | Blocked By |
|---|------|-------|-------|------------|
| 3 | [task description] | executor | opus | 1, 2 |
| 4 | [task description] | designer | sonnet | 1 |

#### Phase 3: Verification
| # | Task | Agent | Model | Blocked By |
|---|------|-------|-------|------------|
| 5 | [task description] | qa-tester | sonnet | 3, 4 |
| 6 | [task description] | architect | opus | 5 |

### Parallelization
- Tasks [X] and [Y] can run in parallel (no dependencies)
- Phase 2 has [N] parallelizable tasks

### Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| [risk] | [High/Medium/Low] | [mitigation strategy] |

### Success Criteria
1. [Measurable criterion]
2. [Measurable criterion]
3. Build compiles, tests pass
```

### Step 4: Review
- Spawn critic agent (opus) to review the plan for gaps
- Address critic feedback
- Present final plan to user

### Step 5: Handoff
- If user approves, hand off to autopilot for execution
- Or create tasks with TaskCreate for manual orchestration

## Agent Delegation for Planning

| Phase | Agent | Model | Purpose |
|-------|-------|-------|---------|
| Discovery | explore | haiku | Codebase mapping |
| Discovery | architect | opus | Technical analysis |
| Interview | (you) | - | Direct user questions |
| Plan Draft | architect | opus | Technical plan |
| Review | critic | opus | Gap analysis |

## Anti-Patterns to Avoid

1. **Asking discoverable questions** — Explore first, ask preferences only
2. **Too many questions** — Maximum 4 questions, each with clear purpose
3. **Vague task descriptions** — Each task must be atomic and actionable
4. **Missing dependencies** — All task relationships must be explicit
5. **No risks section** — Every plan should identify potential risks
6. **No success criteria** — Define how to know when the plan is complete

## Combining with Other Skills

- **Plan → Autopilot**: After plan approval, hand off to autopilot for execution
- **Plan → Orchestrate**: For smaller plans, hand off to orchestrate directly
- **Plan → Review**: After implementation, trigger review for quality check

## Success Criteria for Planning

- [ ] User requirements captured via interview
- [ ] Codebase explored automatically (no factual questions asked)
- [ ] Domain guide loaded and applied
- [ ] Plan includes all tasks with dependencies
- [ ] Parallelization opportunities identified
- [ ] Risks documented with mitigations
- [ ] Success criteria defined
- [ ] Critic has reviewed the plan
- [ ] User has approved the plan
