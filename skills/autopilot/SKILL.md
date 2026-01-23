---
name: autopilot
description: Full autonomous execution from idea to working, tested code
auto_trigger:
  - autopilot
  - build me
  - I want a
  - create a
  - make me
allowed_tools:
  - Task
  - Read
  - Glob
  - Grep
  - Bash
  - TaskCreate
  - TaskUpdate
  - TaskGet
  - TaskList
---

# Autopilot Skill

Full autonomous execution from high-level idea to working, tested code. No manual intervention required.

## Purpose

Autopilot is the flagship feature for autonomous development. When activated, it:
- Gathers requirements automatically
- Creates a comprehensive plan
- Executes in parallel with specialized agents
- Verifies and tests continuously
- Self-corrects until complete

## When to Activate

Activate when user says:
- "autopilot: [description]"
- "build me a [thing]"
- "I want a [thing]"
- "create a [system/feature]"
- "make me a [application]"

## The 5-Phase Workflow

### Phase 1: Discovery (1-2 minutes)

**Objective:** Understand what needs to be built.

1. Parse user's request for explicit requirements
2. Spawn `explore` agent to understand existing codebase:
   ```
   Task(subagent_type="claudeops:explore",
        prompt="Analyze codebase structure, patterns, and conventions")
   ```
3. Spawn `architect` agent for requirement analysis:
   ```
   Task(subagent_type="claudeops:architect",
        model="opus",
        prompt="Analyze requirements and identify gaps, risks, dependencies")
   ```
4. Identify implicit requirements based on context
5. Determine success criteria

**Output:** Requirements document with explicit and implicit needs.

### Phase 2: Planning (2-3 minutes)

**Objective:** Create an executable plan.

1. Spawn `planner` agent to create strategic plan:
   ```
   Task(subagent_type="claudeops:planner",
        model="opus",
        prompt="Create implementation plan for: [requirements]")
   ```
2. Spawn `architect` agent to design architecture:
   ```
   Task(subagent_type="claudeops:architect",
        model="opus",
        prompt="Design system architecture for: [requirements]")
   ```
3. Break down into parallelizable work streams
4. Create comprehensive task list with TaskCreate for all tasks
5. Identify critical path and dependencies

**Output:**
- Architecture diagram/description
- Task breakdown with dependencies
- Parallel execution strategy

### Phase 3: Execution (parallel)

**Objective:** Build everything in parallel.

1. Activate ultrawork mode for maximum parallelism
2. Spawn multiple executor agents in parallel:
   ```
   # For each independent work stream:
   Task(subagent_type="claudeops:executor",
        model="sonnet",
        prompt="Implement [specific component]")
   ```
3. Use appropriate model tiers:
   - `executor-low` with `model="haiku"` for simple files/boilerplate
   - `executor` with `model="sonnet"` for standard features
   - `executor` with `model="opus"` for complex logic
4. Coordinate shared resources/interfaces
5. Track progress via TaskUpdate

**Parallelization Strategy:**
- Group tasks by domain (frontend, backend, tests)
- Run independent domains in parallel
- Within domains, run independent files in parallel
- Sequential only for true dependencies

### Phase 4: Verification (continuous)

**Objective:** Ensure everything works.

1. After each component, spawn verification:
   ```
   Task(subagent_type="claudeops:qa-tester",
        prompt="Test [component] functionality")
   ```
2. Run build after significant changes:
   ```
   Bash(command="npm run build", run_in_background=true)
   ```
3. Run tests continuously:
   ```
   Bash(command="npm test", run_in_background=true)
   ```
4. Check for type errors:
   ```
   Bash(command="npm run typecheck", run_in_background=true)
   ```
5. If errors found, spawn fix agents immediately

**Self-Correction Loop:**
```
while (errors_exist):
    identify_error_type()
    spawn_appropriate_fixer()
    verify_fix()
```

### Phase 5: Completion

**Objective:** Confirm done and report.

1. Final architect verification:
   ```
   Task(subagent_type="claudeops:architect",
        model="opus",
        prompt="Verify complete implementation meets all requirements")
   ```
2. Generate completion report
3. List all created/modified files
4. Provide usage instructions
5. Suggest next steps

## Agent Delegation Patterns

### Discovery Phase
| Task | Agent | Model |
|------|-------|-------|
| Codebase analysis | explore | haiku |
| Requirement analysis | architect | opus |
| Risk assessment | architect | opus |

### Planning Phase
| Task | Agent | Model |
|------|-------|-------|
| Strategic planning | planner | opus |
| Architecture design | architect | opus |
| Task breakdown | architect | opus |

### Execution Phase
| Task | Agent | Model |
|------|-------|-------|
| Boilerplate/simple | executor-low | haiku |
| Standard features | executor | sonnet |
| Complex logic | executor | opus |
| UI components | designer | sonnet |
| Documentation | writer | haiku |

### Verification Phase
| Task | Agent | Model |
|------|-------|-------|
| Testing | qa-tester | sonnet |
| Code review | architect | haiku |
| Build fixes | executor | sonnet |

## Output Format

### During Execution
```
## Autopilot Status

### Phase: [Current Phase]
Progress: [X/Y tasks complete]

### Active Agents
- executor: Implementing user service
- designer: Creating dashboard component
- qa-tester: Testing auth flow

### Completed
- [x] Project structure
- [x] Database schema
- [x] API routes

### In Progress
- [ ] Frontend components
- [ ] Integration tests
```

### On Completion
```
## Autopilot Complete

### Summary
Built [description] with [N] files across [M] components.

### Files Created
- src/services/user.ts - User service with CRUD operations
- src/components/Dashboard.tsx - Main dashboard view
- src/api/routes.ts - API route definitions
- tests/user.test.ts - User service tests

### Files Modified
- src/index.ts - Added new routes
- package.json - Added dependencies

### Verification
- Build: PASS
- Tests: 15/15 passing
- Types: No errors
- Architect: APPROVED

### Usage
[How to use what was built]

### Next Steps
- Consider adding [enhancement]
- May want to [optimization]
```

## Anti-Patterns to Avoid

1. **Starting without discovery**
   - BAD: Immediately coding based on vague request
   - GOOD: Always run discovery phase first

2. **Sequential execution**
   - BAD: Waiting for one task before starting another
   - GOOD: Parallelize everything possible

3. **Skipping verification**
   - BAD: Claiming done without testing
   - GOOD: Continuous verification throughout

4. **Ignoring errors**
   - BAD: Continuing past build/test failures
   - GOOD: Self-correct immediately when errors detected

5. **Doing work directly**
   - BAD: Writing code yourself
   - GOOD: Delegate ALL code changes to executor agents

6. **No progress tracking**
   - BAD: Losing track of what's done
   - GOOD: TaskCreate for everything, TaskUpdate continuously

7. **Over-planning**
   - BAD: Spending 30 minutes planning a 10-minute task
   - GOOD: Scale planning to task complexity

8. **Under-parallelizing**
   - BAD: Running 5 agents when 15 could run
   - GOOD: Maximize parallel execution

## Interruption Handling

If user says "stop", "cancel", or "pause":
1. Note current state via TaskUpdate
2. Stop spawning new agents
3. Wait for active agents to complete or timeout
4. Report current progress
5. Provide resume instructions

## Resume Capability

To resume an interrupted autopilot session:
1. Read existing task state via TaskList
2. Identify incomplete tasks
3. Re-enter at appropriate phase
4. Continue execution

## Success Criteria

Autopilot is complete when:
- [ ] All tasks marked complete via TaskUpdate
- [ ] Build passes
- [ ] Tests pass (or no test failures introduced)
- [ ] No type errors
- [ ] Architect verification passed
- [ ] User's original request fully addressed
