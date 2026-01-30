# Orchestration Patterns Reference

Core patterns for multi-agent task orchestration in Claude Code.

## Pattern 1: Task Graph

Dependency-aware task execution. Tasks form a directed acyclic graph where each task declares what it blocks and what blocks it.

**When to use**: Tasks have clear dependencies (e.g., explore → architect → implement → verify).

**Structure**:
- Define tasks with `blockedBy` relationships
- Use TaskCreate with dependency tracking
- Execute ready tasks as dependencies complete
- Monitor via TaskList and TaskGet

**Error recovery**: If a task fails, mark it failed and spawn a fix agent. Dependent tasks remain blocked until the fix completes.

## Pattern 2: Fan-Out

Parallel execution of independent subtasks that converge to a synthesis step.

**When to use**: Multiple independent analyses needed (e.g., security + performance + architecture review).

**Structure**:
- Spawn N background agents simultaneously using `Task(run_in_background=True)`
- Each agent works independently on its subtask
- Collect results via TaskOutput
- Synthesize findings in a final aggregation step

**Parallelization rules**:
- Maximum 5-7 concurrent background agents
- Each agent must have a clear, scoped prompt
- Include output format requirements in each prompt
- Use TaskOutput with block=true for collection

## Pattern 3: Pipeline

Sequential stages where each stage's output feeds the next.

**When to use**: Each step requires the previous step's output (e.g., diagnose → hypothesize → fix → verify).

**Structure**:
- Execute stages sequentially
- Pass results between stages via task descriptions or shared context
- Each stage can internally use fan-out for parallel work
- Gate progression on stage completion

## Pattern 4: Map-Reduce

Distribute work across agents, then aggregate results.

**When to use**: Processing multiple similar items (e.g., review each module, test each component).

**Structure**:
- Map phase: Fan-out agents with identical instructions but different inputs
- Each agent processes its partition independently
- Reduce phase: Architect agent synthesizes all partition results
- Final output combines all findings

## Pattern 5: Speculative

Run multiple approaches in parallel, pick the best result.

**When to use**: Unclear which approach will work best (e.g., different fix strategies for a bug).

**Structure**:
- Spawn 2-3 agents with different approaches simultaneously
- Each agent implements independently
- Architect evaluates all results
- Select best approach, discard others
- Higher cost but faster when approach is uncertain

## Pattern 6: Background

Long-running tasks that execute while the orchestrator continues.

**When to use**: Tasks that don't block the main workflow (e.g., running tests, generating docs).

**Structure**:
- Use `Task(run_in_background=True)`
- Continue with other work
- Check results periodically via TaskOutput with block=false
- Handle completion asynchronously

---

## Parallelization Rules

1. **Independent tasks** can always run in parallel
2. **Maximum concurrency**: 5-7 agents for stability
3. **Resource contention**: Never have two agents editing the same file simultaneously
4. **Result collection**: Always verify all background agents complete before final synthesis
5. **Error isolation**: One agent's failure should not cascade to unrelated agents

## Error Recovery Patterns

1. **Retry**: Re-spawn failed agent with same prompt (max 2 retries)
2. **Escalate**: Upgrade model tier (haiku → sonnet → opus)
3. **Alternative**: Spawn different agent type for the same task
4. **Skip**: Mark task as skipped if non-critical, continue pipeline
5. **Manual**: Flag for user intervention via AskUserQuestion

## Result Synthesis

When combining results from multiple agents:
1. Prioritize by agent authority (architect > executor > explore)
2. Resolve conflicts by evidence strength
3. Deduplicate overlapping findings
4. Structure output with clear attribution
