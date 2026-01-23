---
name: planner
description: Strategic planning with user interview for complex tasks
auto_trigger:
  - plan this
  - plan the
  - how should I
  - help me plan
  - what's the best way
  - broad request detected
allowed_tools:
  - Task
  - Read
  - Glob
  - Grep
  - AskUserQuestion
  - TodoWrite
  - TodoRead
---

# Planner Skill

Strategic planning through structured user interview. Converts vague requests into actionable, parallelizable task plans.

## Purpose

Planner mode ensures complex tasks are properly scoped and planned:
- Interviews user to clarify requirements
- Gathers codebase context automatically
- Creates comprehensive execution plan
- Identifies parallelization opportunities
- Produces actionable task breakdown

## When to Activate

Activate when:
- User says "plan this", "plan the [feature]"
- User asks "how should I approach..."
- User has a broad/vague request
- Task affects 3+ unrelated areas
- No clear deliverable specified

### Broad Request Detection

A request is BROAD if ANY of:
- Uses vague verbs: "improve", "enhance", "fix", "refactor" without targets
- No specific file or function mentioned
- Touches multiple unrelated areas
- Single sentence without clear deliverable

## Pre-Planning Phase

Before interviewing user, AUTOMATICALLY gather context:

1. **Explore codebase:**
   ```
   Task(subagent_type="claudeops:explore",
        prompt="Analyze codebase structure, patterns, tech stack")
   ```

2. **Find relevant code:**
   ```
   Grep(pattern="[relevant patterns]")
   Glob(pattern="**/*[relevant files]*")
   ```

3. **Read key files:**
   ```
   Read existing AGENTS.md files
   Read package.json, tsconfig.json, etc.
   ```

This happens BEFORE asking user questions.

## The Planning Interview

Ask ONLY questions about USER PREFERENCES. Never ask about codebase facts.

### Question Categories

**Preference Questions (ASK):**
- "Would you prefer [A] or [B] approach?"
- "How important is [performance/maintainability/speed]?"
- "Should we prioritize [feature X] or [feature Y] first?"
- "What's your timeline expectation?"

**Requirement Questions (ASK if unclear):**
- "What should happen when [edge case]?"
- "Who will use this feature?"
- "Any specific constraints?"

**Factual Questions (DON'T ASK - discover yourself):**
- "What framework is used?" - explore codebase
- "Where is the auth logic?" - search codebase
- "What's the folder structure?" - glob codebase

### Using AskUserQuestion Tool

For interview questions, use AskUserQuestion for better UX:

```
AskUserQuestion(
  question_type="Preference",
  question="Would you prefer a REST API or GraphQL for this feature?",
  options=["REST API - simpler, well-understood", "GraphQL - flexible queries"],
  allow_custom=true
)
```

### Interview Flow

1. **Open with context:** Show what you learned from exploration
2. **Ask 3-5 focused questions max**
3. **Propose approach based on answers**
4. **Confirm or refine**

Example:
```
Based on exploring your codebase, I see you're using:
- Express with TypeScript
- Prisma for database
- Jest for testing

For [feature], I have a few preference questions:

1. Should this be a new service or extend UserService?
   - [ ] New service (better separation)
   - [ ] Extend existing (less files)

2. How comprehensive should the testing be?
   - [ ] Essential tests only (faster delivery)
   - [ ] Full coverage (more robust)
```

## Plan Creation

After interview, create actionable plan:

### Plan Structure
```markdown
## Plan: [Feature Name]

### Overview
[1-2 sentence summary]

### Requirements
- [Explicit requirements from user]
- [Implicit requirements from context]

### Architecture
[How it fits into existing system]

### Task Breakdown

#### Phase 1: Setup (parallel)
- [ ] Create types/interfaces
- [ ] Set up folder structure

#### Phase 2: Core Implementation (parallel)
- [ ] Implement service layer
- [ ] Implement data access
- [ ] Create utilities

#### Phase 3: Integration (sequential)
- [ ] Wire into existing system
- [ ] Update routes

#### Phase 4: Testing (parallel)
- [ ] Unit tests
- [ ] Integration tests

#### Phase 5: Verification
- [ ] Full system test
- [ ] Documentation update

### Parallelization Strategy
- Phase 1 & 2 can run simultaneously
- Phase 3 must wait for Phase 2
- Phase 4 can start after Phase 2

### Risk Mitigation
- [Identified risk]: [Mitigation strategy]

### Success Criteria
- [ ] [Measurable criterion 1]
- [ ] [Measurable criterion 2]
```

## Agent Delegation for Planning

| Task | Agent | Model |
|------|-------|-------|
| Codebase exploration | explore | haiku |
| Requirement analysis | analyst | opus |
| Architecture review | architect | opus |
| Plan critique | critic | opus |

### Plan Review (Optional)

For complex plans, get critique:
```
Task(subagent_type="claudeops:critic",
     model="opus",
     prompt="Review this plan for gaps, risks, improvements: [plan]")
```

## Output Format

### During Planning
```
## Planning Session

### Context Gathered
- Codebase: Express + TypeScript + Prisma
- Related code: src/services/user.ts, src/routes/api.ts
- Patterns: Service-repository pattern

### Questions for You
[Interview questions using AskUserQuestion]

### Waiting for Input
Please answer the questions above to continue planning.
```

### Plan Complete
```
## Plan Ready

### Plan: [Feature Name]
[Full plan structure as above]

### Recommended Execution
- Use autopilot for hands-off execution
- Or use ralph for persistent execution
- Estimated time: [X minutes/hours]

### Ready to Execute?
Say "go" to start execution, or ask to modify the plan.
```

## Anti-Patterns to Avoid

1. **Asking questions you can answer yourself**
   - BAD: "What testing framework do you use?"
   - GOOD: Search codebase, find Jest, confirm with user

2. **Too many questions**
   - BAD: 15-question interview
   - GOOD: 3-5 essential preference questions

3. **Vague tasks in plan**
   - BAD: "Implement the feature"
   - GOOD: "Implement UserService.createWithProfile() method"

4. **Missing parallelization**
   - BAD: All tasks sequential
   - GOOD: Identify and mark parallel opportunities

5. **No success criteria**
   - BAD: Plan without measurable completion
   - GOOD: Clear, verifiable success criteria

6. **Ignoring existing patterns**
   - BAD: Propose new pattern when existing one works
   - GOOD: Follow codebase conventions

## Combining with Other Skills

- **autopilot**: Planner creates plan, autopilot executes
- **ralph**: Planner creates plan, ralph persists through execution
- **ralplan**: Iterative planning with Architect and Critic

## Success Criteria

Planning is complete when:
- [ ] Codebase context gathered
- [ ] User preferences clarified
- [ ] All requirements documented
- [ ] Tasks broken into actionable items
- [ ] Parallelization opportunities identified
- [ ] Success criteria defined
- [ ] User approves plan
