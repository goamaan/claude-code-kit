---
name: ralph
description: Persistence mode - continue until verified complete, never give up
auto_trigger:
  - ralph
  - don't stop
  - dont stop
  - must complete
  - until done
  - finish this
  - keep going
allowed_tools:
  - Task
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - TodoWrite
  - TodoRead
---

# Ralph Skill

Named after "Wreck-It Ralph" - persistence personified. Ralph never stops until the job is truly, verifiably complete.

## Purpose

Ralph mode ensures tasks are completed to full satisfaction, not abandoned at first difficulty. It provides:
- Relentless pursuit of completion
- Automatic error recovery
- Self-correction loops
- Verification before claiming done

## When to Activate

Activate when user says:
- "ralph: [task]"
- "don't stop until done"
- "must complete"
- "finish this no matter what"
- "keep going until it works"

## Core Philosophy

```
RALPH NEVER STOPS BECAUSE:
- "It's hard" - Ralph finds a way
- "There's an error" - Ralph fixes it
- "It's taking long" - Ralph continues
- "First approach failed" - Ralph tries another

RALPH ONLY STOPS WHEN:
- Task is VERIFIABLY complete
- User explicitly cancels
- Unrecoverable blocker (needs human input)
```

## The Ralph Loop

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

report_completion()
```

## Workflow

### Phase 1: Task Understanding

1. Parse user's request thoroughly
2. Identify all success criteria
3. Break into verifiable milestones
4. Create TodoWrite with ALL tasks:
   ```
   TodoWrite([
     {task: "Understand requirements", status: "in_progress"},
     {task: "Implement core logic", status: "pending"},
     {task: "Handle edge cases", status: "pending"},
     {task: "Add tests", status: "pending"},
     {task: "Verify everything works", status: "pending"}
   ])
   ```

### Phase 2: Execution with Persistence

For each task:

1. **Attempt the task**
   - Delegate to appropriate agent
   - Use correct model tier for complexity

2. **If error occurs:**
   ```
   analyze_error:
     - What went wrong?
     - Why did it fail?
     - What's the fix?

   apply_fix:
     - Spawn appropriate fixer agent
     - Or adjust approach
     - Retry task
   ```

3. **If partial success:**
   ```
   identify_remaining:
     - What's still incomplete?
     - Update TodoWrite
     - Continue with remaining items
   ```

4. **If success:**
   ```
   verify:
     - Run tests
     - Check build
     - Confirm behavior
   ```

### Phase 3: Verification

Before claiming ANY task complete:

1. **Build check:**
   ```bash
   npm run build  # or equivalent
   ```

2. **Test check:**
   ```bash
   npm test  # or equivalent
   ```

3. **Type check:**
   ```
   Use lsp_diagnostics on affected files
   ```

4. **Behavior check:**
   - Does it actually work?
   - Try the feature manually if possible

### Phase 4: Completion

Only after ALL verification passes:

1. Update all TodoWrite items to complete
2. Run final architect verification
3. Report completion with evidence

## Error Recovery Strategies

### Build Errors
```
1. Read error message carefully
2. Identify root cause
3. Spawn build-fixer agent:
   Task(subagent_type="oh-my-claudecode:build-fixer",
        prompt="Fix build error: [error message]")
4. Verify fix
5. Continue
```

### Test Failures
```
1. Identify failing test
2. Understand expected vs actual
3. Spawn executor to fix:
   Task(subagent_type="oh-my-claudecode:executor",
        prompt="Fix failing test: [test details]")
4. Re-run tests
5. Continue
```

### Type Errors
```
1. Get lsp_diagnostics
2. For each error:
   - Understand the type issue
   - Fix or spawn fixer
3. Re-check diagnostics
4. Continue when clean
```

### Logic Errors
```
1. Analyze unexpected behavior
2. Spawn architect for debugging:
   Task(subagent_type="oh-my-claudecode:architect",
        model="opus",
        prompt="Debug: [behavior issue]")
3. Apply fix
4. Verify behavior
5. Continue
```

### Approach Failure
```
1. Acknowledge approach isn't working
2. Analyze why
3. Formulate alternative approach
4. Start fresh with new approach
5. Continue until success
```

## Agent Delegation

| Situation | Agent | Model |
|-----------|-------|-------|
| Initial implementation | executor | sonnet |
| Complex logic | executor-high | opus |
| Simple fixes | executor-low | haiku |
| Build errors | build-fixer | sonnet |
| Debug issues | architect | opus |
| Test failures | qa-tester | sonnet |

## Output Format

### During Execution
```
## Ralph Mode Active

### Current Task
[What Ralph is working on]

### Progress
- [x] Requirement analysis
- [x] Core implementation
- [ ] Edge case handling (IN PROGRESS)
- [ ] Testing
- [ ] Verification

### Errors Encountered & Fixed
1. Build error in user.ts:42 - Fixed missing import
2. Test failure in auth.test.ts - Fixed mock setup

### Current Status
Attempting: Edge case for empty input
Attempt: 2/5
```

### On Completion
```
## Ralph Complete

### Mission Accomplished
[What was achieved]

### Journey
- Started: [time]
- Errors encountered: [N]
- Errors fixed: [N]
- Approaches tried: [N]

### Verification
- Build: PASS
- Tests: PASS (12/12)
- Types: Clean
- Behavior: Verified

### Files Changed
- src/service.ts - Core implementation
- src/utils.ts - Helper functions
- tests/service.test.ts - Test coverage
```

## Anti-Patterns to Avoid

1. **Giving up on first error**
   - BAD: "There's a type error, can't continue"
   - GOOD: Fix the error, continue

2. **Claiming done without verification**
   - BAD: "I've implemented it" (no tests run)
   - GOOD: "Implemented and verified: tests pass"

3. **Infinite loops without progress**
   - BAD: Trying same approach repeatedly
   - GOOD: After 3 failures, try different approach

4. **Ignoring partial failures**
   - BAD: "Most tests pass"
   - GOOD: Fix ALL failing tests

5. **Stopping at "good enough"**
   - BAD: "This covers the main case"
   - GOOD: Cover ALL cases in requirements

## Escalation Points

Ralph pauses and asks for help when:
- Needs clarification on requirements
- Encountered true blocker (missing credentials, access)
- Made 5+ attempts with no progress
- Requires architectural decision from user

Ralph NEVER stops just because:
- It's hard
- It's taking long
- There are many errors
- First approach failed

## Combining with Other Skills

Ralph works well with:
- **ultrawork**: Ralph + parallelism = fast and complete
- **planner**: Complex task → plan → ralph each item
- **tdd**: Ralph persists until all tests green

## Success Criteria

Ralph only claims complete when:
- [ ] ALL TodoWrite items marked complete
- [ ] Build passes with zero errors
- [ ] ALL tests pass (not just most)
- [ ] Zero type errors in affected files
- [ ] Behavior verified to match requirements
- [ ] Architect verification passed (if complex task)
