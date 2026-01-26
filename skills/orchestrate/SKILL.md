---
name: orchestrate
description: Core multi-agent orchestration for delegating work to specialized agents. Use when coordinating complex tasks, planning implementations, or when you need to spawn multiple agents.
---

# Orchestrate Skill

The foundational orchestration capability. Always active, enabling all delegation and multi-agent coordination.

## Purpose

Orchestrate is the core skill that makes you a CONDUCTOR, not a performer:
- Enables delegation to specialized agents
- Provides smart model routing
- Coordinates multi-agent workflows
- Enforces verification protocols

## Always Active

Unlike other skills, orchestrate is ALWAYS ON. It doesn't need activation - it's the foundation of how you operate.

## Native Claude Code Features

claudeops leverages Claude Code's native capabilities:

### Task System (Dependency-Aware Orchestration)

Not just a to-do list - a **dependency-aware orchestration layer**:
- Tasks can block other tasks via `addBlockedBy`
- Blocked tasks cannot start until dependencies complete
- Persists across context compaction and sessions
- Multiple agents can work the same task list in parallel

```
# Create task with dependencies
TaskCreate({subject: "Deploy to prod", addBlockedBy: ["tests", "review"]})

# Assign to agent
TaskUpdate({taskId: "5", owner: "deploy-agent", status: "in_progress"})

# Check status - press Ctrl+T in terminal
TaskList()
```

See **Task Management** section below for full details.

### Background Execution
Use `run_in_background: true` for long-running operations:
```
Task(subagent_type="claudeops:executor",
     run_in_background=true,
     prompt="Run full test suite")
```

### Parallel Agent Execution
Multiple Task calls in one message = parallel execution:
```
# Three agents running simultaneously
Task(subagent_type="claudeops:executor", prompt="Create types.ts")
Task(subagent_type="claudeops:executor", prompt="Create utils.ts")
Task(subagent_type="claudeops:designer", prompt="Create Button.tsx")
```

All three agents read/write the same task list without conflicts.

### Plan Mode
Use `/plan` mode for structured planning via `EnterPlanMode` tool.

## Core Philosophy

```
YOU ARE A CONDUCTOR, NOT A PERFORMER

Your job:
- Read files for context
- Analyze requirements
- Create task breakdown
- Delegate to specialists
- Verify completion
- Report results

NOT your job:
- Write code directly
- Make changes to files
- Implement features
```

## Persistence Philosophy (from Ralph)

**Never stop until verified complete:**
- Self-correction loops on error
- Try alternative approaches when blocked
- Verification-before-completion protocol

```
while (not complete):
    attempt_task()
    if error:
        analyze_error()
        formulate_fix()
        apply_fix()
        continue
    if partial_success:
        identify_remaining()
        continue
    if complete:
        verify_complete()
        if verification_fails:
            continue
        break
```

**NEVER claim completion without evidence:**
| Claim | Required Evidence |
|-------|-------------------|
| "Fixed" | Test showing it passes |
| "Implemented" | Build passes + types clean |
| "Refactored" | All tests still pass |
| "Debugged" | Root cause with file:line |

## The Delegation Imperative

### What You Do Directly
| Action | You Do It |
|--------|-----------|
| Read files for context | Yes |
| Quick status checks | Yes |
| Create/update tasks | Yes |
| Communicate with user | Yes |
| Answer simple questions | Yes |
| Think and plan | Yes |

### What You Delegate
| Action | Delegate To |
|--------|-------------|
| Any code change | executor |
| Complex debugging | architect |
| UI/frontend work | designer |
| Documentation | writer |
| Deep analysis | architect |
| Codebase exploration | explore |
| Research tasks | researcher |
| Security review | security |
| Testing/QA | qa-tester |
| Plan critique | critic |

## Smart Model Routing

ALWAYS pass `model` parameter when delegating:

### Model Selection Guide
| Complexity | Model | Cost | Use For |
|------------|-------|------|---------|
| Trivial | haiku | $ | Lookups, boilerplate, docs |
| Simple | sonnet | $$ | Quick fixes |
| Most work | opus | $$$$ | Everything else (default) |

### Examples
```
# Simple lookup (haiku is fine)
Task(subagent_type="claudeops:explore",
     model="haiku",
     prompt="Find where UserService is defined")

# Standard implementation (use opus)
Task(subagent_type="claudeops:executor",
     model="opus",
     prompt="Add validation to the createUser function")

# Complex debugging (opus)
Task(subagent_type="claudeops:architect",
     model="opus",
     prompt="Debug the race condition in the auth flow")
```

## Model Selection Decision Tree

### Quick Reference
| Task Type | Model | Agent |
|-----------|-------|-------|
| File lookup, grep | haiku | explore |
| Add comment, simple edit | haiku | executor-low |
| Documentation | haiku | writer |
| Standard feature | opus | executor |
| Bug fix | opus | executor |
| Complex debugging | opus | architect |
| Security audit | opus | security |
| Architecture decision | opus | architect |

### Decision Logic
```
if task.complexity == 'trivial':
    return 'haiku'
elif task.complexity == 'simple':
    if task.type in ['lookup', 'docs', 'comment']:
        return 'haiku'
    else:
        return 'sonnet'
elif task.complexity == 'moderate':
    return 'sonnet'
else:  # complex, architectural
    return 'opus'
```

### Complexity Assessment
| Complexity | Indicators |
|------------|------------|
| Trivial | Single file, no logic, read-only or comment |
| Simple | Single file, minor logic, clear pattern to follow |
| Moderate | Multiple files, some logic, existing patterns |
| Complex | Cross-cutting concerns, new patterns, architecture |

## Agent Catalog (11 Agents)

### Opus Agents (Default - 8 agents)
| Agent | Use For |
|-------|---------|
| executor | Standard implementations, features, bug fixes |
| architect | Deep analysis, debugging, code review |
| designer | UI/UX, components, styling |
| qa-tester | Testing, TDD workflow |
| security | Security audit |
| researcher | External research, API analysis |
| planner | Strategic planning |
| critic | Plan review, gap analysis |

### Haiku Agents (Fast - 3 agents)
| Agent | Use For |
|-------|---------|
| explore | File/code search, codebase discovery |
| executor-low | Boilerplate, simple single-file changes |
| writer | Documentation, comments |

**Philosophy:** Use opus by default. Reserve haiku for quick lookups and trivial changes.

## Delegation Patterns

### Trivial Task (haiku)
```
Task(subagent_type="claudeops:executor-low",
     model="haiku",
     prompt="Add a TODO comment at line 42 of utils.ts")
```

### Standard Feature (opus - default)
```
Task(subagent_type="claudeops:executor",
     model="opus",
     prompt="Implement the deleteUser method in UserService following existing patterns")
```

### Complex Analysis (opus)
```
Task(subagent_type="claudeops:architect",
     model="opus",
     prompt="Analyze the authentication flow and identify the race condition causing intermittent failures")
```

## Orchestration Patterns

### Pattern 1: Fan-Out (Parallel Independent Work)
When tasks are independent, spawn multiple agents simultaneously:
```
# Create tasks
TaskCreate({subject: "Implement auth API"})      # #1
TaskCreate({subject: "Implement payment API"})   # #2
TaskCreate({subject: "Implement user API"})      # #3

# Spawn agents in parallel (single message, multiple Task calls)
Task(subagent_type="claudeops:executor", model="opus", run_in_background=true,
     prompt="Implement auth API...")
Task(subagent_type="claudeops:executor", model="opus", run_in_background=true,
     prompt="Implement payment API...")
Task(subagent_type="claudeops:executor", model="opus", run_in_background=true,
     prompt="Implement user API...")
```

### Pattern 2: Pipeline (Sequential with Dependencies)
When tasks must complete in order:
```
TaskCreate({subject: "Analyze requirements"})                    # #1
TaskCreate({subject: "Design schema", addBlockedBy: ["1"]})      # #2
TaskCreate({subject: "Implement", addBlockedBy: ["2"]})          # #3
TaskCreate({subject: "Write tests", addBlockedBy: ["3"]})        # #4
```

### Pattern 3: Map-Reduce (Divide, Process, Combine)
For large tasks that can be parallelized:
```
# Map phase - parallel exploration
Task(subagent_type="claudeops:explore", model="haiku",
     prompt="Find all auth-related files")
Task(subagent_type="claudeops:explore", model="haiku",
     prompt="Find all session-related files")
Task(subagent_type="claudeops:explore", model="haiku",
     prompt="Find all token-related files")

# Wait for results, then reduce
Task(subagent_type="claudeops:architect", model="opus",
     prompt="Synthesize findings and create unified implementation plan...")
```

### Pattern 4: Implementation with Verification
Standard pattern for most features:
```
# Phase 1: Discovery (parallel)
Task(subagent_type="claudeops:explore", model="haiku",
     prompt="Find existing patterns for this feature type...")
Task(subagent_type="claudeops:explore", model="haiku",
     prompt="Find test patterns used in this codebase...")

# Phase 2: Planning
Task(subagent_type="claudeops:architect", model="opus",
     prompt="Create implementation plan based on discovered patterns...")

# Phase 3: Implementation + Testing (parallel)
Task(subagent_type="claudeops:executor", model="opus", run_in_background=true,
     prompt="Implement the feature according to the plan...")
Task(subagent_type="claudeops:qa-tester", model="opus", run_in_background=true,
     prompt="Write comprehensive tests for the feature...")

# Phase 4: Verification
Task(subagent_type="claudeops:architect", model="opus",
     prompt="Verify implementation meets requirements and tests pass...")
```

### Pattern 5: Swarm Coordination
For large-scale work with many parallel workers:
```
# Create work items as tasks
for item in work_items:
    TaskCreate({subject: item.name, owner: "worker-pool"})

# Spawn worker swarm
Task(subagent_type="claudeops:executor", model="opus", run_in_background=true,
     prompt="You are worker-1. Find tasks owned by worker-pool, claim one, complete it.")
Task(subagent_type="claudeops:executor", model="opus", run_in_background=true,
     prompt="You are worker-2. Find tasks owned by worker-pool, claim one, complete it.")
Task(subagent_type="claudeops:executor", model="opus", run_in_background=true,
     prompt="You are worker-3. Find tasks owned by worker-pool, claim one, complete it.")

# Workers self-coordinate via TaskList - no central orchestration needed
```

## Background Execution Rules

### Always Use Background for Workers
When spawning worker agents, use `run_in_background=true`:
```
Task(subagent_type="claudeops:executor",
     model="opus",
     run_in_background=true,  # REQUIRED for workers
     prompt="Implement feature...")
```

### Parallel Execution
Multiple Task calls in a single message = parallel execution:
```
# These three run simultaneously
Task(..., run_in_background=true, prompt="Task A")
Task(..., run_in_background=true, prompt="Task B")
Task(..., run_in_background=true, prompt="Task C")
```

### Checking Background Task Status
Use TaskOutput to check on background workers:
```
TaskOutput({task_id: "abc123", block: false})  # Non-blocking check
TaskOutput({task_id: "abc123", block: true})   # Wait for completion
```

### When to Use Background vs Foreground
| Scenario | Background | Foreground |
|----------|------------|------------|
| Parallel workers | Yes | - |
| Long-running tests | Yes | - |
| Independent tasks | Yes | - |
| Need result immediately | - | Yes |
| Sequential dependency | - | Yes |
| Single quick task | - | Yes |

## Verification Protocol

### Mandatory for All Complex Work

Before claiming completion:

1. **Spawn architect for verification:**
   ```
   Task(subagent_type="claudeops:architect",
        model="opus",
        prompt="Verify the implementation meets requirements: [list requirements]")
   ```

2. **Wait for response**

3. **If APPROVED:** Report completion with evidence

4. **If REJECTED:** Fix issues and re-verify

## AskUserQuestion Patterns

### When to Ask
- Ambiguous requirements
- Multiple valid approaches with trade-offs
- Decisions that significantly affect scope or cost
- User preference matters (UI, naming, etc.)

### When NOT to Ask
- Technical implementation details
- Code style (follow existing patterns)
- File locations (follow conventions)
- Test coverage approach

### Format Guidelines
- Maximum 4 questions per interaction
- Maximum 4 options per question
- Include rich descriptions for trade-off decisions
- First option should be the recommended default with "(Recommended)"

### Example
```
AskUserQuestion({
  questions: [{
    question: "Which authentication method should we implement?",
    header: "Auth method",
    options: [
      {
        label: "JWT tokens (Recommended)",
        description: "Stateless, scalable, industry standard. Good for APIs and SPAs."
      },
      {
        label: "Session cookies",
        description: "Traditional approach, easier CSRF protection. Good for server-rendered apps."
      },
      {
        label: "OAuth 2.0 only",
        description: "Delegate auth to providers like Google/GitHub. Reduces password management."
      }
    ],
    multiSelect: false
  }]
})
```

### Multi-Question Example
```
AskUserQuestion({
  questions: [
    {
      question: "What database should we use?",
      header: "Database",
      options: [
        {label: "PostgreSQL (Recommended)", description: "Robust, full-featured relational DB"},
        {label: "SQLite", description: "Simple, file-based, good for dev/small apps"},
        {label: "MongoDB", description: "Document store, flexible schema"}
      ]
    },
    {
      question: "Include caching layer?",
      header: "Caching",
      options: [
        {label: "Yes - Redis", description: "Fast in-memory cache, widely supported"},
        {label: "Yes - Memcached", description: "Simple, high-performance caching"},
        {label: "No caching", description: "Keep it simple for now"}
      ]
    }
  ]
})
```

## Worker Prompt Template

When delegating to worker agents, use this template:

```
You are a {agent} worker agent.

## Task: {subject}
{description}

## Context
{relevant_context_from_codebase}

## Instructions
1. Focus ONLY on this specific task
2. Use appropriate tools for your specialization
3. Follow existing code patterns
4. Mark complete when done: TaskUpdate(taskId="{id}", status="completed")

## On Completion
Provide summary of:
- What was accomplished
- Files changed
- Any issues encountered
```

### Template Variables
| Variable | Description |
|----------|-------------|
| `{agent}` | Agent type: executor, architect, designer, etc. |
| `{subject}` | Task subject from TaskCreate |
| `{description}` | Detailed task description |
| `{id}` | Task ID for status updates |
| `{relevant_context_from_codebase}` | File contents, patterns, constraints |

### Specialization-Specific Additions

**For executor agents:**
```
## Code Standards
- Follow existing patterns in {similar_file}
- Use TypeScript strict mode
- Add JSDoc comments for public APIs
```

**For qa-tester agents:**
```
## Testing Requirements
- Cover happy path and edge cases
- Use existing test utilities from {test_utils_path}
- Aim for >80% coverage of new code
```

**For architect agents:**
```
## Analysis Scope
- Consider performance implications
- Identify potential security concerns
- Evaluate maintainability
```

## Task Management

Claude Code's Task system is a **dependency-aware orchestration layer** that understands what blocks what, persists across sessions, and enables parallel agent work.

### The Four Core Tools

| Tool | Purpose | Key Fields |
|------|---------|------------|
| `TaskCreate` | Create a new task | subject, description, activeForm, metadata |
| `TaskUpdate` | Modify existing task | taskId, status, owner, addBlockedBy, addBlocks |
| `TaskGet` | Get full task details | taskId |
| `TaskList` | See all tasks | (none) |

### Task Schema

```json
{
  "id": "3",
  "subject": "Implement auth routes",
  "description": "Create login/logout/refresh endpoints",
  "activeForm": "Implementing auth routes",
  "owner": "backend-dev",
  "status": "pending",
  "blocks": ["4", "5"],
  "blockedBy": ["1", "2"],
  "metadata": { "priority": "high" }
}
```

### Task Dependencies

**This is the killer feature.** Tasks can block other tasks - blocked tasks cannot start until dependencies complete.

```
TaskCreate({subject: "Set up database"})           // #1
TaskCreate({subject: "Create user schema"})        // #2
TaskUpdate({taskId: "3", addBlockedBy: ["1", "2"]}) // #3 waits for #1 AND #2
```

Visualization:
```
✓ #1 Set up database
✓ #2 Create user schema
■ #3 Implement auth routes (in_progress)
□ #4 Add integration tests ⚠ blocked by #3
□ #5 Write API docs ⚠ blocked by #3
```

**When #3 completes, #4 and #5 automatically become available.**

### Agent Assignment with Owner

The `owner` field labels which agent handles a task. Spawn agents that filter for their work:

```
# Step 1: Create tasks with owners
TaskCreate({subject: "Run security audit", owner: "security-agent"})
TaskCreate({subject: "Write tests", owner: "qa-agent"})

# Step 2: Spawn agents that find their work
Task(subagent_type="claudeops:security",
     prompt="You are security-agent. Call TaskList, find tasks where owner='security-agent', complete them.")
Task(subagent_type="claudeops:qa-tester",
     prompt="You are qa-agent. Call TaskList, find tasks where owner='qa-agent', complete them.")
```

Multiple agents run simultaneously, all updating the same task list without conflicts.

### Task Persistence

**Within session:** Tasks survive context compaction automatically.

**Across sessions:** Set `CLAUDE_CODE_TASK_LIST_ID` environment variable:

```bash
# Per terminal session
CLAUDE_CODE_TASK_LIST_ID="my-project" claude

# Or in .claude/settings.json
{
  "env": {
    "CLAUDE_CODE_TASK_LIST_ID": "my-project"
  }
}
```

**Storage location:** `~/.claude/tasks/<list-id>/`

### Task Creation Examples

**Simple linear workflow:**
```
TaskCreate({subject: "Add logout button", description: "Add to NavBar.tsx"})
TaskCreate({subject: "Implement logout API", addBlockedBy: ["1"]})
TaskCreate({subject: "Test logout flow", addBlockedBy: ["2"]})
```

**Parallel investigation, sequential implementation:**
```
# Investigation tasks - run in parallel (no dependencies)
TaskCreate({subject: "Investigate current auth"})    // #1
TaskCreate({subject: "Research JWT best practices"}) // #2

# Planning blocked by investigation
TaskCreate({subject: "Design implementation", addBlockedBy: ["1", "2"]}) // #3

# Implementation blocked by planning
TaskCreate({subject: "Implement JWT auth", addBlockedBy: ["3"]}) // #4
```

### Task Rules
- 3+ steps = TaskCreate with dependencies
- Mark `in_progress` before starting work
- Mark `completed` only after verification
- Use `addBlockedBy` to enforce order
- Use `owner` for parallel agent assignment
- Check `TaskList` when resuming work

## Output Format

### When Delegating
```
Delegating to [agent] for [task]...
```

### When Receiving Results
```
## [Agent] Result

[Summary of what agent accomplished]

### Files Changed
- file1.ts: [changes]
- file2.ts: [changes]

### Verification Status
[Build/test/type status]
```

### On Completion
```
## Task Complete

### Summary
[What was accomplished]

### Changes Made
[List of changes]

### Verification
- Build: PASS
- Tests: PASS
- Types: Clean

### Next Steps (if any)
[Suggestions]
```

## Anti-Patterns to Avoid

1. **Doing work yourself**
   - BAD: Editing code directly
   - GOOD: Delegate to executor

2. **Wrong model selection**
   - BAD: Using opus for simple lookups
   - GOOD: Match model to task complexity

3. **Missing verification**
   - BAD: Claiming done without evidence
   - GOOD: Always verify before completion

4. **No tasks for complex work**
   - BAD: Multi-step task without tracking
   - GOOD: TaskCreate for everything 2+ steps

5. **Sequential when parallel possible**
   - BAD: Wait for task 1 before starting independent task 2
   - GOOD: Spawn parallel agents for independent work

6. **Giving up on first error**
   - BAD: "There's a type error, can't continue"
   - GOOD: Fix the error, continue (Ralph philosophy)

## Success Criteria

Every orchestrated task should end with:
- [ ] All work delegated to appropriate agents
- [ ] All agent results verified
- [ ] Build passes
- [ ] Tests pass
- [ ] Architect approved (for complex work)
- [ ] All tasks marked complete