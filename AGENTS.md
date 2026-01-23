<!-- Parent: none (root) -->
<!-- Generated: 2026-01-23 -->

# claudeops

## Purpose

Multi-agent orchestration toolkit for Claude Code. Provides:
- **12 specialized agents** for delegation (executor, architect, designer, etc.)
- **Automatic mode detection** via keyword-detector hook (ultrawork, autopilot, planner)
- **Task system integration** with dependency-aware orchestration
- **Profile management** with setup templates
- **Hook system** for behavior modification
- **Cost tracking** with budgets

## Core Philosophy

```
YOU ARE A CONDUCTOR, NOT A PERFORMER

Delegate work to specialized agents. Never implement directly.
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `agents/` | 12 specialized agent definitions (executor, architect, designer, etc.) |
| `skills/` | Skill definitions (orchestrate, autopilot, planner, git-master, etc.) |
| `hooks/` | Claude Code hooks (keyword-detector, continuation-check, lint-changed, etc.) |
| `setups/` | Pre-packaged configuration templates (fullstack, backend, frontend, etc.) |
| `src/` | Main source code (CLI, domain logic, sync engine) |
| `addons/` | Safety addons (claude-ignore, rm-rf-guard, safety-net) |

## Agent Catalog

All agents use prefix `claudeops:` when delegating.

| Agent | Model | Use For |
|-------|-------|---------|
| executor | sonnet | Standard implementations, build fixes |
| executor-low | haiku | Boilerplate, simple changes |
| architect | opus | Deep analysis, debugging, code review |
| explore | haiku | File/code search, codebase discovery |
| designer | sonnet | UI/UX, components, styling |
| qa-tester | sonnet | Testing, TDD workflow |
| security | opus | Security audit, vulnerability review |
| writer | haiku | Documentation, comments |
| researcher | sonnet | External research, API analysis |
| vision | sonnet | Image/visual analysis |
| planner | opus | Strategic planning, requirements |
| critic | opus | Plan review, gap analysis |

## Delegation Examples

```python
# CRITICAL: Always pass model parameter explicitly
Task(subagent_type="claudeops:executor", model="sonnet",
     prompt="Implement the createUser function")

Task(subagent_type="claudeops:architect", model="opus",
     prompt="Debug the race condition in auth flow")

# Parallel execution (multiple calls in one message)
Task(subagent_type="claudeops:executor", model="sonnet", prompt="Create types.ts")
Task(subagent_type="claudeops:executor", model="sonnet", prompt="Create utils.ts")
```

## Automatic Mode Detection

The keyword-detector hook activates modes based on prompts:

| Keywords | Mode |
|----------|------|
| `ultrawork`, `ulw`, `uw` | Maximum parallel execution |
| `autopilot`, `build me` | 5-phase autonomous execution |
| `plan this`, `how should I` | Structured planning |

## For AI Agents

### Working In This Codebase

- **Build**: `npm run build` (tsdown bundler)
- **Test**: `npm test` (vitest)
- **Lint**: `npm run lint`
- **TypeCheck**: `npm run typecheck`

### Architecture

```
src/
├── cli.ts           # Main CLI entry (citty framework)
├── commands/        # CLI command implementations
├── core/            # Config, sync, diagnostics
├── domain/          # Business logic (addon, cost, hook, mcp, profile, setup)
├── types/           # Zod schemas and type definitions
├── ui/              # CLI output formatting
└── utils/           # Cross-cutting utilities
```

### Key Patterns

- **Factory functions**: `createProfileManager()`, `createSyncEngine()`
- **Zod schemas**: All types validated at runtime
- **Manager pattern**: Each domain has a manager class
- **Result type**: `Result<T, E>` for error handling

### Testing Requirements

- Run `npm test` before claiming completion
- Integration tests in `tests/integration/`
- Unit tests colocated with source (`.test.ts`)

### Common Tasks

| Task | Delegate To |
|------|-------------|
| Code changes | executor (sonnet) |
| Complex debugging | architect (opus) |
| UI/frontend work | designer (sonnet) |
| Documentation | writer (haiku) |
| Codebase exploration | explore (haiku) |
| Security review | security (opus) |
| Testing/QA | qa-tester (sonnet) |

## Verification Protocol

Before claiming completion:
1. Spawn architect for verification
2. Ensure build passes
3. Ensure tests pass
4. Report with evidence

## Dependencies

### Internal
- `src/core/` - Configuration, sync engine
- `src/domain/` - Business logic modules
- `agents/` - Agent definitions
- `skills/` - Skill definitions
- `hooks/` - Claude Code hooks

### External
- `citty` - CLI framework
- `zod` - Schema validation
- `@iarna/toml` - TOML parsing
- `@clack/prompts` - Interactive prompts

<!-- MANUAL -->
