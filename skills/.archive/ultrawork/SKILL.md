---
name: ultrawork
description: Maximum parallel execution mode for fastest possible completion
auto_trigger:
  - ultrawork
  - ulw
  - fast
  - parallel
  - quickly
  - speed
allowed_tools:
  - Task
  - Read
  - Glob
  - Grep
  - Bash
  - TodoWrite
  - TodoRead
---

# Ultrawork Skill

Maximum parallelism for fastest possible task completion. When activated, Ultrawork spawns as many agents as safely possible to work simultaneously.

## Purpose

Ultrawork mode optimizes for speed by:
- Maximizing parallel agent execution
- Minimizing sequential bottlenecks
- Running background tasks concurrently
- Coordinating multiple work streams

## When to Activate

Activate when user says:
- "ultrawork: [task]"
- "ulw [task]"
- "do this fast"
- "parallel"
- "quickly"
- "speed is important"

## Core Principles

```
ULTRAWORK PRINCIPLES:
1. If two tasks CAN run in parallel, they SHOULD
2. Never wait for one task when another could start
3. Background long-running operations
4. Batch similar operations
5. Only sequence when truly dependent
```

## Parallelization Categories

### Always Parallel (Independent)
- Different files in different domains
- Read operations (all reads)
- Independent feature implementations
- Multiple test files
- Documentation for different components

### Always Sequential (Dependent)
- Create file → edit same file
- Install deps → use deps
- Define interface → implement interface
- Write code → test code (same file)

### Conditional
- Multiple edits to same file → batch into one edit
- Related features → parallel if no shared state
- Tests → parallel if no shared fixtures

## The Ultrawork Pattern

### Phase 1: Task Decomposition

```
Given task T:
1. Break into subtasks [T1, T2, T3, ...]
2. Build dependency graph
3. Identify parallel groups:
   - Group A: [T1, T2] - no dependencies, run parallel
   - Group B: [T3] - depends on A, run after
   - Group C: [T4, T5] - no dependencies, run parallel with A
4. Execute groups
```

### Phase 2: Parallel Execution

```
# Execute all independent tasks simultaneously
parallel_spawn([
    Task(subagent_type="executor", prompt="Task 1"),
    Task(subagent_type="executor", prompt="Task 2"),
    Task(subagent_type="designer", prompt="Task 3"),
    Task(subagent_type="writer", prompt="Task 4"),
])

# Background long operations
Bash(command="npm install", run_in_background=true)
Bash(command="npm run build", run_in_background=true)

# Continue with non-dependent work while background runs
parallel_spawn([...more tasks...])
```

### Phase 3: Synchronization Points

At dependency boundaries:
1. Wait for required parallel tasks to complete
2. Collect outputs
3. Spawn next wave of parallel tasks

## Execution Strategies

### Multi-File Feature Implementation
```
# Identify all files needed
files_to_create = [
    "src/service.ts",
    "src/types.ts",
    "src/utils.ts",
    "tests/service.test.ts"
]

# Spawn all in parallel
parallel_spawn([
    Task(executor, "Create src/types.ts with interfaces"),
    Task(executor, "Create src/utils.ts with helpers"),
])

# Wait for interfaces, then:
parallel_spawn([
    Task(executor, "Create src/service.ts using types"),
    Task(executor, "Create tests/service.test.ts"),
])
```

### Code Review
```
# Review all files in parallel
parallel_spawn([
    Task(code-reviewer-low, "Review file1.ts"),
    Task(code-reviewer-low, "Review file2.ts"),
    Task(code-reviewer-low, "Review file3.ts"),
    Task(security-reviewer-low, "Security review all files"),
])
```

### Bug Fixing Multiple Issues
```
# Analyze all bugs in parallel
parallel_spawn([
    Task(architect-low, "Analyze bug #1"),
    Task(architect-low, "Analyze bug #2"),
    Task(architect-low, "Analyze bug #3"),
])

# Collect analyses, then fix in parallel
parallel_spawn([
    Task(executor, "Fix bug #1: [analysis]"),
    Task(executor, "Fix bug #2: [analysis]"),
    Task(executor, "Fix bug #3: [analysis]"),
])
```

### Testing
```
# Run all test suites in parallel
parallel_spawn([
    Bash("npm run test:unit", run_in_background=true),
    Bash("npm run test:integration", run_in_background=true),
    Bash("npm run test:e2e", run_in_background=true),
])
```

## Agent Coordination

### Work Stream Assignment
```
For feature with frontend + backend + tests:

Stream 1 (Backend):
  - executor: API routes
  - executor: Service layer
  - executor: Database queries

Stream 2 (Frontend):
  - designer: Components
  - executor: State management
  - executor: API integration

Stream 3 (Testing):
  - executor: Unit tests
  - qa-tester: Integration tests
```

### Shared Interface Protocol
When parallel tasks need to coordinate:
1. Define interfaces FIRST (synchronization point)
2. Share interface definition with all parallel tasks
3. Each task implements against interface
4. Integrate at completion

## Background Task Management

### Start Background Tasks
```bash
# Long-running builds
Bash(command="npm run build:prod", run_in_background=true)

# Dependency installation
Bash(command="npm install", run_in_background=true)

# Large test suites
Bash(command="npm test -- --coverage", run_in_background=true)
```

### Maximum Concurrent Background: 5
Don't exceed 5 background tasks to avoid resource exhaustion.

### Monitor Background Tasks
Use TaskOutput tool to check status and retrieve results.

## Output Format

### During Execution
```
## Ultrawork Active

### Parallel Waves
Wave 1 (executing):
  - [executor] Creating types.ts
  - [executor] Creating utils.ts
  - [designer] Creating Button.tsx

Wave 2 (pending):
  - [executor] Creating service.ts (needs types.ts)
  - [executor] Creating tests (needs service.ts)

### Background Tasks
  - npm install: running (45s)
  - npm build: queued

### Completed
  - [x] Project setup
  - [x] Dependency analysis
```

### On Completion
```
## Ultrawork Complete

### Performance
- Total tasks: 15
- Parallel waves: 4
- Time saved: ~60% vs sequential
- Peak concurrency: 8 agents

### Wave Summary
1. Wave 1: 3 agents, 2 min (setup)
2. Wave 2: 5 agents, 3 min (core)
3. Wave 3: 5 agents, 2 min (features)
4. Wave 4: 2 agents, 1 min (integration)

### All Tasks Complete
[List of completed tasks]
```

## Anti-Patterns to Avoid

1. **Sequential when parallel is possible**
   - BAD: Create file1, wait, create file2, wait, create file3
   - GOOD: Create file1, file2, file3 in parallel

2. **Waiting unnecessarily**
   - BAD: Wait for npm install to finish before coding
   - GOOD: Background npm install, start coding

3. **Over-serializing dependencies**
   - BAD: "I need to finish X before starting Y" (when not true)
   - GOOD: Identify TRUE dependencies only

4. **Ignoring background task completion**
   - BAD: Forget about background npm build
   - GOOD: Check background tasks at synchronization points

5. **Too many background tasks**
   - BAD: 10 concurrent background tasks
   - GOOD: Max 5, queue the rest

6. **No coordination for shared resources**
   - BAD: Two agents editing same file simultaneously
   - GOOD: Batch edits or sequence same-file operations

## Combining with Other Skills

- **ralph + ultrawork**: Fast AND persistent - best combo
- **autopilot**: Inherently uses ultrawork patterns
- **code-review**: Parallel review of all files

## Resource Management

### CPU/Memory Considerations
- Each agent consumes context window
- Background tasks consume system resources
- Balance parallelism with system capacity

### Token Efficiency
- Haiku agents for simple parallel tasks
- Reserve Opus for critical path items
- Batch similar operations

## Success Criteria

Ultrawork is complete when:
- [ ] All parallel waves complete
- [ ] All background tasks finished
- [ ] All tasks verified
- [ ] No resource conflicts occurred
- [ ] Faster than sequential would have been
