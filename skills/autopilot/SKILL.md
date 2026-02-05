---
description: >
  Full autonomous execution for complex, multi-step tasks. Activate when the task involves
  ANY of: building a feature spanning 3+ files, refactoring across module boundaries,
  integrating a new library/service/API throughout the codebase, changes touching multiple
  architectural layers (API + database + frontend), replacing or migrating a system,
  building anything described as a "system", "feature", "integration", or "workflow".
  Also activate on explicit keywords: "autopilot", "build me", "plan first", "full auto",
  "worktrees", "parallel branches". Key heuristic: if you would need to explore the
  codebase before knowing what files to change, use this skill.
user-invocable: true
---

# Autopilot Skill (v7.0)

Full autonomous execution from idea to working code. Gathers requirements, creates comprehensive plan, executes in parallel, verifies continuously, and self-corrects until complete.

## When to Activate

### Complexity Signals (activate on ANY)

- Spans 3+ files or crosses module boundaries
- Requires codebase exploration before you know what to change
- Involves integrating, migrating, or replacing a system/library
- Touches multiple architectural layers (API + database + UI)
- Requires coordinated changes that must be consistent across files
- Would benefit from planning before implementation
- Described as a "system", "feature", "integration", or "workflow"

### Examples (no autopilot keywords, but ARE autopilot tasks)

- "Refactor auth to use JWT tokens"
- "Add Stripe payment integration"
- "Convert the REST API to GraphQL"
- "Add role-based access control"
- "Set up CI/CD with staging and production"
- "Migrate from MongoDB to PostgreSQL"
- "Add real-time notifications with WebSockets"
- "Implement the onboarding flow"

### Explicit Keywords (always activate)

- "autopilot", "plan first", "plan mode", "full auto", "handle it all"
- "build me", "create me", "make me", "implement everything"
- "worktrees", "parallel branches"

### When NOT to Activate

- Single-file bug fixes → debug skill or direct
- Config changes, typo fixes, renames → direct
- Reviewing/explaining existing code → review skill
- Questions about the codebase → direct answer

## Execution Modes

### Decision Heuristic: Team vs Subagent vs Direct

Choose execution mode based on work characteristics:

| Mode | When to Use | Characteristics |
|------|-------------|-----------------|
| **Agent Team** | 3+ parallel work streams, competing hypotheses, cross-cutting review | Complex features with independent modules, multi-agent code review, exploratory debugging |
| **Subagent Pipeline** | Sequential pipeline, single focused task, quick exploration | Bug fixes, simple features, incremental enhancements, research tasks |
| **Direct** | Single-file changes, config tweaks | Typo fixes, variable renames, simple refactors, configuration updates |

Additional considerations:
- **Parallel Worktree** is orthogonal — use for fully independent feature tracks (different directories, no shared files)
- **Plan-first flag** can be applied to any mode when user says "plan first" or "plan before coding"

### Mode A: Agent Team

For complex parallel work requiring multiple independent work streams.

#### Phase 1: Discovery
Spawn explore + architect subagents to understand scope:
1. `Task(subagent_type="explore")` — Map codebase structure and identify relevant files
2. `Task(subagent_type="architect")` — Analyze requirements, existing patterns, and technical constraints
3. If requirements ambiguous, use AskUserQuestion (max 4 questions, 4 options each)

#### Phase 2: Planning
Create comprehensive plan with architect review:
1. Spawn architect subagent to create task breakdown and define approach
2. Spawn architect subagent (review mode) to critique as senior staff engineer:
```
Task(subagent_type="architect",
     prompt="Critique this plan as a senior staff engineer. Challenge:
     - Are the task boundaries correct?
     - Are there missing edge cases?
     - Is the architecture over-engineered or under-engineered?
     - What are the risks?
     Produce a revised plan with your recommendations...")
```
3. Finalize plan with task dependencies and file ownership boundaries

#### Phase 3: Execution
Create an agent team to execute the plan in parallel:

1. **Instruct Claude to create a team** with natural language:
   - "Create a team with [N] agents to work on this plan."
   - "The team lead should coordinate task assignment."
   - "Here is the task breakdown with file ownership boundaries:"
   - Provide the task list, noting which files/modules belong to which tasks
   - Specify verification requirements for each task

2. **Provide team context**:
   - Project structure and tech stack
   - Task dependencies and parallelization opportunities
   - File ownership boundaries (prevent conflicts)
   - Verification commands (build, test)

3. **Let the team self-organize**:
   - Team members use Claude Code's native TeammateTool to coordinate
   - Team lead assigns tasks and monitors progress
   - Workers claim tasks, implement changes, report completion
   - Team handles cross-task coordination naturally

4. **Key guidance for team**:
   - Each agent should read files before modifying
   - Match existing code patterns
   - Run verification after changes
   - Report blockers immediately
   - Never have two agents edit the same file simultaneously

#### Phase 4: Verification
After team completes, verify and fix if needed:
1. Run build: `npm run build` (or project equivalent)
2. Run tests: `npm test` (or project equivalent)
3. If failures found:
   - Instruct the team to fix issues collaboratively
   - Maximum 3 fix cycles
   - Team lead coordinates the fixes
4. Once verified, request team shutdown

#### Phase 5: Completion
1. Clean up team resources
2. Generate completion report with:
   - What was built
   - Files created/modified
   - Verification results
   - Usage instructions
   - Architecture notes

**Team Pattern Advantages**:
- Natural task coordination without rigid orchestration
- Agents self-organize around file ownership
- Reduced context overhead on orchestrator
- Built-in peer review through team communication

### Mode B: Subagent Pipeline

For sequential or simple work. Default mode when team coordination isn't needed.

#### Optional: Plan-First Gate

Triggered by: "plan first", "plan before coding", "plan mode"

When activated, add an explicit user approval gate between planning and execution:

1. **Discovery** — Same as Phase 1 below
2. **Planning (BLOCKING)** — Create plan, critique it, then present to user with `AskUserQuestion`:
   - Option 1: "Approve plan — proceed to execution"
   - Option 2: "Revise plan — address these concerns: [user input]"
   - Option 3: "Reject — start over with different approach"
3. **No execution until user explicitly approves**
4. If execution diverges significantly → re-enter planning with failure context (max 2 re-plan cycles)

#### Phase 1: Discovery

Understand what needs to be built.

**Actions**:
1. Spawn explore agent to map codebase structure
2. Spawn architect agent to analyze requirements and existing patterns
3. If requirements are ambiguous, use AskUserQuestion (max 4 questions, 4 options each, rich descriptions)

**Interview Methodology**:

Before asking ANY questions, explore the codebase automatically:
- Map directory structure
- Find relevant files for the request
- Identify existing patterns and conventions
- Discover tech stack and dependencies

**Golden Rule**: Ask ONLY preference questions. Never ask questions you can answer by exploring the codebase.

What to ask (preferences & decisions):
- "Would you prefer approach A or B?"
- "How important is X vs Y?"
- "What's the scope boundary?"
- "Are there constraints I should know about?"

What NOT to ask (discoverable facts):
- "What framework do you use?" → Explore and find out
- "Where are the config files?" → Use Glob/Grep to find them
- "What testing library?" → Check package.json/go.mod/etc.

**Gate**:
- Codebase structure understood
- Requirements clear
- Relevant files identified

**Output**:
```
[Phase 1] Discovery complete
  → Codebase: [language/framework]
  → Structure: [key directories]
  → Relevant files: [N files identified]
  → Requirements: [summary]
```

#### Phase 2: Planning

Create strategic plan and architecture.

**Actions**:
1. Spawn architect agent to create task breakdown and define technical approach
2. Spawn architect agent (in review mode) to critique the plan
3. Create all tasks with TaskCreate, including dependencies
4. Identify parallelization opportunities

**Gate**:
- Plan reviewed and approved
- All tasks created with clear dependencies
- Parallelization opportunities identified

**Output**:
```
[Phase 2] Planning complete
  → Tasks: [N] total ([M] parallelizable)
  → Architecture: [approach summary]
  → Risk areas: [identified risks]
```

#### Phase 3: Execution

Execute the plan with maximum parallelism.

**Actions**:
1. Check TaskList for ready tasks (pending, no blockers)
2. Spawn executor agents for independent tasks in parallel:
   - Use `Task(run_in_background=True)` for parallel execution
   - Use the 5-element worker prompt template
3. As tasks complete, check for newly unblocked tasks
4. Spawn additional agents for newly ready tasks
5. Continue until all execution tasks complete

**Agent Assignment for Execution**:
| Task Type | Agent |
|-----------|-------|
| Code changes (any complexity) | executor |
| UI/frontend work | designer |
| Test writing | tester |

**Parallel Execution Rules**:
- Maximum 5-7 agents running simultaneously
- Never have two agents editing the same file
- Group related file changes to single agents
- Include verification in each agent's prompt

**Gate**:
- All execution tasks completed
- No critical failures

#### Phase 4: Verification

Continuous testing and self-correction.

**Actions**:
1. Spawn tester agent to run full test suite
2. Spawn architect agent to verify implementation matches plan
3. Run build: `npm run build` (or project equivalent)
4. Run tests: `npm test` (or project equivalent)
5. If failures found:
   - Create fix tasks with TaskCreate
   - Spawn executor agents to fix issues
   - Re-run verification (max 3 cycles)

**Self-Correction Loop**:
```
while (failures exist AND retries < 3):
  1. Analyze failure (architect agent)
  2. Create fix task (TaskCreate)
  3. Execute fix (executor agent)
  4. Re-verify (tester agent)
```

**Gate**:
- Build compiles successfully
- All tests pass
- Architect approves implementation

#### Phase 5: Completion

Final review and user handoff.

**Actions**:
1. Spawn architect agent for final verification (if not done in Phase 4)
2. Generate completion report
3. Provide usage instructions to user

**Output**:
```
## Autopilot Complete

### What Was Built
[Description of the feature/system]

### Files Created/Modified
- [file:line] — [description]

### Verification Results
- Build: Pass
- Tests: Pass ([N] tests)

### How to Use
[Usage instructions, examples, or next steps]

### Architecture Notes
[Key architectural decisions and their rationale]
```

### Mode C: Parallel Worktree

Triggered by: "worktrees", "parallel branches", "work on multiple features"

For fully independent feature tracks that don't share files.

#### Decision Heuristic
- **Use subagents** when tasks share files or have dependencies
- **Use worktrees** when tasks are fully independent feature tracks (different directories, no shared state)

#### Steps

1. **Identify independent tracks**
```
Task(subagent_type="architect",
     prompt="Analyze these tasks and identify which are fully independent (no shared files).
     Group into independent tracks. Flag any that share files — those should use subagents instead...")
```

2. **Create worktrees**
```
# For each independent track:
Bash: git worktree add ../<project>-wt-<name> -b feat/<name>
```

3. **Spawn scoped agents**
```
# Each executor works in its own worktree
Task(subagent_type="executor", run_in_background=True,
     prompt="Work in directory ../<project>-wt-<name>.
     Implement [feature]. Stay within your worktree. Do not touch files outside it...")
```

4. **Output ready-to-use commands**
```
## Worktree Setup Complete

### Active Worktrees
| Worktree | Branch | Feature |
|----------|--------|---------|
| ../<project>-wt-auth | feat/auth | Authentication system |
| ../<project>-wt-api | feat/api | API endpoints |

### Quick Access
```bash
# Launch Claude in each worktree:
claude --plugin-dir <plugin-path> ../<project>-wt-auth
claude --plugin-dir <plugin-path> ../<project>-wt-api

# Suggested aliases:
alias za='cd ../<project>-wt-auth && claude --plugin-dir <plugin-path>'
alias zb='cd ../<project>-wt-api && claude --plugin-dir <plugin-path>'
```

### Merging
When ready: `git worktree remove ../<project>-wt-<name>` after merging branch.
```

## Subagent Context Management

Guidelines for efficient delegation to subagents.

### When to Delegate vs Do Directly
- **Direct** (no subagent): Single-file changes under ~20 lines, simple renames, config tweaks
- **Delegate**: Multi-file changes, anything requiring exploration, changes needing verification

### Context Budget

With 1M context windows, agents can handle more context than before, but scoping is still recommended for quality. Only include files the agent actually needs to touch or reference. Overloading agents with irrelevant context still degrades focus and decision quality.

```
# BAD: Dumping everything
Task(prompt="Here are 50 files... fix the bug somewhere in here")

# GOOD: Scoped context
Task(subagent_type="explore", prompt="Find files related to [feature]...")
# Then pass only the relevant files to executor
Task(subagent_type="executor", prompt="Fix [bug] in src/auth/login.ts and src/auth/session.ts...")
```

### Pattern: Explore First
Always use explore agent to identify relevant files before passing to executor:
1. `explore` → identifies files
2. `architect` → analyzes and plans (if complex)
3. `executor` → implements with scoped file list

### Keep Main Context Clean
The orchestrator's context is for coordination decisions, not implementation details. Delegate all file reading and code changes to subagents.

## Worker Prompt Template

Structure every worker prompt with 5 elements:

### 1. Preamble
```
You are a [agent-type] agent working on a specific subtask within a larger orchestrated workflow.
```

### 2. Context
```
## Context
- Project: [brief project description]
- Language/Framework: [tech stack]
- Previous results: [any results from prior agents]
- Relevant files: [specific file paths to examine]
```

### 3. Scope
```
## Your Task
[Precise description of what to accomplish]

## Scope Boundaries
- DO: [explicit inclusions]
- DO NOT: [explicit exclusions]
```

### 4. Constraints
```
## Constraints
- Read files before modifying them
- Match existing code patterns and style
- Do not modify files outside your scope
- Run verification commands after changes
```

### 5. Expected Output
```
## Expected Output
Report your results in this format:
- Files modified: [list with line references]
- Changes made: [description of each change]
- Verification: [build/test results]
- Issues found: [any blockers or concerns]
```

## Resume Capability

If autopilot is interrupted:
1. TaskList state persists across sessions
2. On resume, check TaskList for incomplete tasks
3. Skip completed tasks, resume from last incomplete
4. Re-run verification on completed work before continuing

To resume: "resume autopilot" or "continue where you left off"

## Anti-Patterns to Avoid

1. **Starting without discovery** — Always explore the codebase first
2. **Sequential execution** — Parallelize independent tasks
3. **Skipping verification** — Always run build and tests
4. **Ignoring review feedback** — Address plan review findings
5. **No self-correction** — Retry failed tasks, don't give up
6. **Implementing directly** — ALWAYS delegate to agents or teams
7. **Missing task tracking** — Use TaskCreate for every work item
8. **Vague agent prompts** — Use 5-element prompt template
9. **Over-coordinating teams** — Let teams self-organize, don't micromanage

## Interruption Handling

- **"stop autopilot"** — Stop execution, save state, report progress
- **"pause"** — Stop spawning new agents/team members, wait for running ones
- **"skip to phase N"** — Jump to specified phase
- **"change plan"** — Re-enter Phase 2 with new requirements
