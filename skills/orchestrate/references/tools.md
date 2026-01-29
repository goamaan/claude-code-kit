# Tools Reference

Reference for orchestration tools, agent types, and prompt engineering.

## Agent Types and Model Selection

### Opus Agents (Complex/Analytical Work)

| Agent | Best For | Spawn As |
|-------|----------|----------|
| executor | Multi-file features, bug fixes, refactoring | `Task(subagent_type="executor", model="opus")` |
| architect | Architecture, debugging, system design | `Task(subagent_type="architect", model="opus")` |
| designer | UI/UX, components, styling | `Task(subagent_type="designer", model="opus")` |
| qa-tester | Test planning, TDD, coverage | `Task(subagent_type="qa-tester", model="opus")` |
| security | Security audit, threat modeling | `Task(subagent_type="security", model="opus")` |
| researcher | API analysis, tech evaluation | `Task(subagent_type="researcher", model="opus")` |
| planner | Strategic planning, requirements | `Task(subagent_type="planner", model="opus")` |
| critic | Plan review, gap analysis | `Task(subagent_type="critic", model="opus")` |

### Sonnet Agents (Standard Work)

Use `model="sonnet"` for any opus agent when the task is moderate complexity.

### Haiku Agents (Quick/Simple Work)

| Agent | Best For | Spawn As |
|-------|----------|----------|
| explore | File search, codebase discovery | `Task(subagent_type="explore", model="haiku")` |
| executor-low | Single-file boilerplate, trivial changes | `Task(subagent_type="executor-low", model="haiku")` |
| writer | Documentation, comments | `Task(subagent_type="writer", model="haiku")` |

### New Specialist Agents

| Agent | Best For | Model |
|-------|----------|-------|
| security-sentinel | Vulnerability review | opus |
| performance-oracle | Performance bottleneck analysis | opus |
| architecture-strategist | Architectural compliance | opus |
| code-simplicity-reviewer | YAGNI/over-engineering detection | sonnet |
| best-practices-researcher | External best practices | sonnet |
| git-history-analyzer | Code archaeology via git log | haiku |

## Model Selection Guide

| Complexity | Model | When |
|------------|-------|------|
| Trivial | haiku | Lookups, boilerplate, simple renames |
| Simple | haiku/sonnet | Single-file changes, straightforward logic |
| Moderate | sonnet | Multi-file features, standard refactoring |
| Complex | opus | Cross-cutting concerns, intricate algorithms |
| Architectural | opus | System design, complex debugging, planning |

## Task Tool Parameters

```
Task(
  subagent_type: string,     # Agent type from catalog
  model: "haiku"|"sonnet"|"opus",  # Model tier
  prompt: string,            # Detailed task prompt
  run_in_background: bool,   # True for async execution
  description: string,       # Short 3-5 word summary
)
```

## Worker Prompt Template

Structure every worker prompt with these 5 elements:

### 1. Preamble
State who the agent is and what mode it operates in.
```
You are a [agent-type] agent working on a specific subtask within a larger orchestrated workflow.
```

### 2. Context
Provide codebase context, previous results, and relevant file paths.
```
## Context
- Project: [project description]
- Codebase: [language/framework]
- Previous findings: [results from prior agents]
- Relevant files: [file paths]
```

### 3. Scope
Define exactly what this agent should do and the boundaries.
```
## Your Task
[Precise description of what to do]

## Scope
- DO: [explicit list]
- DO NOT: [explicit list]
```

### 4. Constraints
Time, quality, and behavioral constraints.
```
## Constraints
- Read files before modifying them
- Match existing code patterns and style
- Do not modify files outside scope
- Run verification after changes
```

### 5. Output
Define expected output format.
```
## Expected Output
Report your findings/changes in this format:
- Files modified: [list]
- Changes made: [description]
- Verification: [results]
- Issues found: [if any]
```

## TaskOutput Usage

```
# Blocking wait for completion
TaskOutput(task_id="abc", block=true, timeout=300000)

# Non-blocking check
TaskOutput(task_id="abc", block=false, timeout=5000)
```

## AskUserQuestion Philosophy

Use AskUserQuestion maximally when scope is ambiguous:
- Ask up to 4 questions per interaction
- Provide 2-4 options per question with rich descriptions
- Include a recommended option (first in list, marked with "(Recommended)")
- Use multiSelect when choices aren't mutually exclusive
- Every option should have a description explaining implications

## Graceful Degradation: TeammateTool

Claude Code 2.1.16+ includes native TeammateTool for persistent multi-agent teams.

**Detecting availability**: Check if `TeammateTool` is available in the tool list. If present, you can use native teams. If absent, fall back to Task-based subagent orchestration.

**When TeammateTool is available**:
- Use `spawnTeam` for persistent worker teams
- Workers communicate via inbox messaging
- Leader approves/rejects teammate plans
- Graceful shutdown with `requestShutdown`

**When TeammateTool is NOT available** (fallback):
- Use `Task(run_in_background=True)` for parallel execution
- Use `TaskOutput` for result collection
- Use TaskCreate/TaskUpdate for task tracking
- All patterns in patterns.md work with this fallback

Both modes produce equivalent results. The Task-based approach is the reliable default.
