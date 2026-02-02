---
description: >
  Full autonomous execution from idea to working code. Use when the user says "autopilot",
  "build me", "create me", "make me", "implement everything", "full auto", "handle it all",
  "plan first", "plan before coding", "plan mode", "review the plan", "work on features in
  parallel", "worktrees", "parallel branches", or describes a complete feature/system to build
  end-to-end. Gathers requirements, plans, executes in parallel with specialized agents,
  verifies, and self-corrects.
user-invocable: true
---

# Autopilot Skill (v6.0)

Full autonomous execution from idea to working code. Gathers requirements, creates comprehensive plan, executes in parallel, verifies continuously, and self-corrects until complete.

## When to Activate

User says one of:
- "autopilot: [task]"
- "build me a [feature]"
- "create a complete [system]"
- "make me a [thing]"
- "implement everything for [feature]"
- "plan first", "plan before coding", "plan mode"
- "worktrees", "parallel branches", "work on multiple features"

## Execution Modes

### Mode A: Self-Organizing Swarm (TeammateTool Available)

When TeammateTool is detected in available tools:

1. **Discovery** — Spawn explore + architect agents to understand scope
2. **Plan** — Create task pool with all tasks and dependencies up front
3. **Swarm** — Create team via `spawnTeam`, spawn N worker teammates that race to claim tasks
4. **Monitor** — Workers self-report via inbox messaging. Orchestrator monitors, spawns additional workers if throughput stalls
5. **Shutdown** — Graceful shutdown via `requestShutdown` when all tasks complete
6. **Verify** — Architect teammate does final review

### Mode B: Pipeline (Fallback / Default)

When TeammateTool is NOT available, use the 5-phase pipeline.

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

### Mode D: Plan-First (Strict Planning Gate)

Triggered by: "plan first", "plan before coding", "plan mode"

Same as Pipeline mode but with an **explicit user approval gate** between planning and execution.

#### Phase 1: Discovery
Same as Pipeline Phase 1.

#### Phase 2: Planning (BLOCKING)
1. Spawn architect to create comprehensive plan
2. Spawn architect (review mode) as staff engineer critic:
```
Task(subagent_type="architect",
     prompt="Critique this plan as a senior staff engineer. Challenge:
     - Are the task boundaries correct?
     - Are there missing edge cases?
     - Is the architecture over-engineered or under-engineered?
     - What are the risks?
     Produce a revised plan with your recommendations...")
```
3. Present plan to user with `AskUserQuestion`:
   - Option 1: "Approve plan — proceed to execution"
   - Option 2: "Revise plan — address these concerns: [user input]"
   - Option 3: "Reject — start over with different approach"

**No execution until user explicitly approves.**

#### Phase 3-5: Execution, Verification, Completion
Same as Pipeline, but with a re-planning safety valve:
- If execution diverges significantly from plan → re-enter Phase 2 with failure context
- Maximum 2 re-plan cycles before escalating to user

## Subagent Context Management

Guidelines for efficient delegation to subagents.

### When to Delegate vs Do Directly
- **Direct** (no subagent): Single-file changes under ~20 lines, simple renames, config tweaks
- **Delegate**: Multi-file changes, anything requiring exploration, changes needing verification

### Context Budget
Only include files the agent actually needs to touch. Overloading agents with irrelevant context degrades quality.

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

## Phase 1: Discovery

Understand what needs to be built.

### Actions
1. Spawn explore agent to map codebase structure
2. Spawn architect agent to analyze requirements and existing patterns
3. If requirements are ambiguous, use AskUserQuestion (max 4 questions, 4 options each, rich descriptions)

### Interview Methodology

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

### Gate
- Codebase structure understood
- Requirements clear
- Relevant files identified

### Output
```
[Phase 1] Discovery complete
  → Codebase: [language/framework]
  → Structure: [key directories]
  → Relevant files: [N files identified]
  → Requirements: [summary]
```

## Phase 2: Planning

Create strategic plan and architecture.

### Actions
1. Spawn architect agent to create task breakdown and define technical approach
2. Spawn architect agent (in review mode) to critique the plan
3. Create all tasks with TaskCreate, including dependencies
4. Identify parallelization opportunities

### Gate
- Plan reviewed and approved
- All tasks created with clear dependencies
- Parallelization opportunities identified

### Output
```
[Phase 2] Planning complete
  → Tasks: [N] total ([M] parallelizable)
  → Architecture: [approach summary]
  → Risk areas: [identified risks]
```

## Phase 3: Execution

Execute the plan with maximum parallelism.

### Actions
1. Check TaskList for ready tasks (pending, no blockers)
2. Spawn executor agents for independent tasks in parallel:
   - Use `Task(run_in_background=True)` for parallel execution
   - Use the 5-element worker prompt template
3. As tasks complete, check for newly unblocked tasks
4. Spawn additional agents for newly ready tasks
5. Continue until all execution tasks complete

### Agent Assignment for Execution
| Task Type | Agent |
|-----------|-------|
| Code changes (any complexity) | executor |
| UI/frontend work | designer |
| Test writing | tester |

### Parallel Execution Rules
- Maximum 5-7 agents running simultaneously
- Never have two agents editing the same file
- Group related file changes to single agents
- Include verification in each agent's prompt

### Gate
- All execution tasks completed
- No critical failures

## Phase 4: Verification

Continuous testing and self-correction.

### Actions
1. Spawn tester agent to run full test suite
2. Spawn architect agent to verify implementation matches plan
3. Run build: `npm run build` (or project equivalent)
4. Run tests: `npm test` (or project equivalent)
5. If failures found:
   - Create fix tasks with TaskCreate
   - Spawn executor agents to fix issues
   - Re-run verification (max 3 cycles)

### Self-Correction Loop
```
while (failures exist AND retries < 3):
  1. Analyze failure (architect agent)
  2. Create fix task (TaskCreate)
  3. Execute fix (executor agent)
  4. Re-verify (tester agent)
```

### Gate
- Build compiles successfully
- All tests pass
- Architect approves implementation

## Phase 5: Completion

Final review and user handoff.

### Actions
1. Spawn architect agent for final verification (if not done in Phase 4)
2. Generate completion report
3. Provide usage instructions to user

### Output
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

## Agent Delegation by Phase

| Phase | Agent | Purpose |
|-------|-------|---------|
| Discovery | explore | File discovery, structure mapping |
| Discovery | architect | Requirements analysis |
| Planning | architect | Task decomposition + technical approach |
| Planning | architect (review mode) | Plan review |
| Execution | executor | Code implementation |
| Execution | designer | UI components |
| Execution | tester | Test writing |
| Verification | tester | Test execution |
| Verification | architect | Implementation review |
| Completion | architect | Final verification |

## Anti-Patterns to Avoid

1. **Starting without discovery** — Always explore the codebase first
2. **Sequential execution** — Parallelize independent tasks
3. **Skipping verification** — Always run build and tests
4. **Ignoring review feedback** — Address plan review findings
5. **No self-correction** — Retry failed tasks, don't give up
6. **Implementing directly** — ALWAYS delegate to agents
7. **Missing task tracking** — Use TaskCreate for every work item
8. **Vague agent prompts** — Use 5-element prompt template

## Interruption Handling

- **"stop autopilot"** — Stop execution, save state, report progress
- **"pause"** — Stop spawning new agents, wait for running ones
- **"skip to phase N"** — Jump to specified phase
- **"change plan"** — Re-enter Phase 2 with new requirements
