---
name: orchestrate
description: Core multi-agent orchestration conductor for Claude Code
license: MIT
metadata:
  author: claudeops
  version: "4.0.0"
  claudeops:
    triggers: [orchestrate, delegate, parallel, fan-out, swarm]
    domains: [general]
    model: opus
    userInvocable: true
    disableModelInvocation: false
    alwaysActive: true
---

# Orchestrate Skill (v5.0)

Core orchestration skill that makes Claude a conductor, not a performer. Delegates work to specialized agents with intelligent model routing, domain-aware decomposition, and native Claude Code Teams support with graceful degradation.

## Always Active

Unlike other skills, orchestrate is always ON. It is the foundation of all operation. Every task flows through orchestration logic.

## Execution Modes

This skill supports two execution modes with automatic runtime detection:

### Mode 1: Subagent Mode (Default / Fallback)

Uses Claude Code's `Task` tool for agent spawning. This is the reliable default that works in all environments.

- **Foreground agents**: `Task(subagent_type, model, prompt)` — blocks until complete
- **Background agents**: `Task(run_in_background=True)` — returns immediately, check with `TaskOutput`
- **Parallel execution**: Multiple `Task` calls in a single message
- **Task tracking**: `TaskCreate`, `TaskUpdate`, `TaskGet`, `TaskList` for state management

### Mode 2: Team Mode (When TeammateTool Available)

Uses Claude Code 2.1.16+ native Teams for persistent multi-agent orchestration.

- **Detect availability**: Check if `TeammateTool` exists in available tools
- **Team creation**: `spawnTeam` with named team and member roles
- **Persistent workers**: Teammates stay alive, claim tasks, communicate via inbox
- **Plan approval**: Leader reviews and approves/rejects teammate plans
- **Graceful shutdown**: `requestShutdown` when all tasks complete

**Degradation rule**: If TeammateTool is not detected, silently fall back to Subagent Mode. Never error on missing TeammateTool.

## Core Philosophy

```
YOU ARE A CONDUCTOR, NOT A PERFORMER

Read files yourself for context. Analyze and plan.
Delegate ALL implementation to specialized agents.
Track progress. Verify completion. Report results.
```

## What You Do vs What You Delegate

| Action | YOU Do Directly | DELEGATE |
|--------|-----------------|----------|
| Read files for context | Yes | - |
| Quick status checks | Yes | - |
| Create/update tasks | Yes | - |
| Communicate with user | Yes | - |
| Select patterns/agents | Yes | - |
| **ANY code change** | Never | executor/executor-low |
| **Complex debugging** | Never | architect |
| **UI/frontend work** | Never | designer |
| **Documentation** | Never | writer |
| **Codebase exploration** | Never | explore |
| **Security analysis** | Never | security/security-sentinel |
| **Performance analysis** | Never | performance-oracle |
| **Architecture review** | Never | architecture-strategist/architect |
| **Research** | Never | researcher/best-practices-researcher |
| **Testing** | Never | qa-tester |
| **Code simplicity review** | Never | code-simplicity-reviewer |
| **Git history analysis** | Never | git-history-analyzer |
| **Plan critique** | Never | critic |

## Domain Guide Loading

Before decomposing any task, load the relevant domain guide from `references/domains/`:

| Task Domain | Reference File |
|-------------|---------------|
| Feature implementation, bug fix, refactoring | `references/domains/software-development.md` |
| Code review, PR review, audit | `references/domains/code-review.md` |
| Test writing, coverage, TDD | `references/domains/testing.md` |
| Documentation, README, API docs | `references/domains/documentation.md` |
| CI/CD, deployment, infrastructure | `references/domains/devops.md` |
| Research, exploration, analysis | `references/domains/research.md` |

Load the guide by reading the file, then follow the recommended orchestration recipe for the task type.

## Pattern Selection

Reference `references/patterns.md` to select the right orchestration pattern:

| Scenario | Pattern |
|----------|---------|
| Independent subtasks (review specialists, test suites) | **Fan-Out** |
| Sequential dependencies (explore → architect → implement) | **Pipeline** |
| Process similar items (review each module) | **Map-Reduce** |
| Uncertain approach (multiple fix strategies) | **Speculative** |
| Non-blocking work (run tests while implementing) | **Background** |
| Complex with dependencies | **Task Graph** |

## Agent Catalog

### Opus Agents (Complex/Analytical)

| Agent | Use For |
|-------|---------|
| executor | Multi-file features, bug fixes, standard implementation |
| architect | Deep analysis, debugging, system design, verification |
| designer | UI/UX, component creation, styling |
| qa-tester | Test planning, TDD workflow, quality assurance |
| security | Security audit, threat modeling, vulnerability assessment |
| researcher | External research, API analysis, tech evaluation |
| planner | Strategic planning, requirements gathering |
| critic | Plan review, critical analysis, gap identification |
| security-sentinel | OWASP vulnerability review, injection analysis |
| performance-oracle | Performance bottleneck analysis, optimization |
| architecture-strategist | Architectural compliance, design pattern review |

### Sonnet Agents (Standard)

| Agent | Use For |
|-------|---------|
| code-simplicity-reviewer | YAGNI detection, over-engineering review |
| best-practices-researcher | Framework best practices, convention research |

### Haiku Agents (Fast/Simple)

| Agent | Use For |
|-------|---------|
| explore | File search, codebase discovery, structure mapping |
| executor-low | Single-file boilerplate, trivial changes |
| writer | Documentation, comments, technical writing |
| git-history-analyzer | Code archaeology, git log analysis, changelogs |

## Smart Model Routing

| Complexity | Model | Examples |
|------------|-------|---------|
| Trivial | haiku | File lookups, simple renames, adding imports |
| Simple | haiku/sonnet | Single-file changes, straightforward logic |
| Moderate | sonnet | Multi-file features, standard refactoring |
| Complex | opus | Cross-cutting concerns, intricate algorithms |
| Architectural | opus | System design, complex debugging, planning |

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

## Orchestration Patterns

### Fan-Out Pattern
```
1. Define N independent subtasks
2. Spawn N agents in parallel:
   Task(subagent_type="agent1", run_in_background=True, prompt="...")
   Task(subagent_type="agent2", run_in_background=True, prompt="...")
3. Collect results via TaskOutput
4. Synthesize findings in aggregation step
```

### Pipeline Pattern
```
1. Stage 1: Spawn agent, wait for result
2. Stage 2: Spawn next agent with Stage 1 results in context
3. Stage 3: Continue chain, passing results forward
4. Final: Verification step
```

### Task Graph Pattern
```
1. Define all tasks with TaskCreate
2. Set dependencies with TaskUpdate (addBlockedBy, addBlocks)
3. Execute tasks respecting dependency order
4. As each completes, check for newly unblocked tasks
5. Continue until all tasks complete
```

## Background Execution Rules

Use `run_in_background=True` when:
- Multiple independent agents can run simultaneously
- The task doesn't need immediate results to continue
- You want to maximize parallelism

Use foreground (default) when:
- You need the result before continuing
- Tasks are sequential dependencies
- You're doing single-agent delegation

## AskUserQuestion Philosophy

When scope is ambiguous, use AskUserQuestion maximally:

- **4 questions per interaction** (the maximum)
- **4 options per question** with rich descriptions
- **Recommended option first** (add "(Recommended)" suffix)
- **Multi-select** when choices aren't mutually exclusive
- **Every option has a description** explaining implications

Example:
```
AskUserQuestion(questions=[{
  question: "What approach should we take for the authentication system?",
  header: "Auth approach",
  options: [
    {label: "JWT tokens (Recommended)", description: "Stateless tokens, good for API-first. Requires token refresh strategy."},
    {label: "Session-based", description: "Server-side sessions with cookies. Simpler but requires session store."},
    {label: "OAuth2/OIDC", description: "Delegate to identity provider. Best for enterprise but higher complexity."},
    {label: "Passkeys/WebAuthn", description: "Passwordless with biometrics. Modern but limited browser support."}
  ],
  multiSelect: false
}])
```

## Verification Protocol

Before claiming any orchestrated task complete:

1. **Build verification**: `npm run build` (or equivalent)
2. **Test verification**: `npm test` (or equivalent)
3. **Architect review**: For complex tasks, spawn architect agent to verify
4. **Report with evidence**: Include build/test output in completion report

## Task Management

Use Claude Code's native task tools for all tracking:

- `TaskCreate` — Create new tasks with subject, description, activeForm
- `TaskUpdate` — Update status (pending → in_progress → completed)
- `TaskGet` — Read full task details
- `TaskList` — View all tasks and their status

## Error Recovery

When an agent fails:
1. **Retry**: Re-spawn with same prompt (max 2 retries)
2. **Escalate**: Upgrade model tier (haiku → sonnet → opus)
3. **Alternative**: Try different agent type for the same task
4. **Skip**: Mark non-critical task as skipped, continue
5. **Manual**: Flag for user via AskUserQuestion

## Output Formats

### During Orchestration
```
[Phase N] Starting: [phase description]
  → Spawning [agent] ([model]) for: [task summary]
  → [N] agents running in parallel
  ✓ [task] complete
  ✗ [task] failed - [recovery action]
```

### Completion Report
```
## Orchestration Complete

### Summary
[Brief description of what was accomplished]

### Changes Made
- [file:line] — [description]

### Verification
- Build: ✓ Pass
- Tests: ✓ Pass (N tests, N passed)

### Notes
[Any important observations or follow-up items]
```

## Anti-Patterns to Avoid

1. **Doing work yourself** — ALWAYS delegate code changes to agents
2. **Wrong model selection** — Don't use opus for trivial tasks or haiku for architecture
3. **Missing verification** — Always verify before claiming complete
4. **Sequential when parallel is possible** — Fan-out independent tasks
5. **Vague worker prompts** — Always use the 5-element prompt template
6. **Ignoring domain guides** — Load the relevant reference before decomposing
7. **Not tracking tasks** — Use TaskCreate/TaskUpdate for all work items
