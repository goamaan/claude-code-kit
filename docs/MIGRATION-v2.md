# Migration Guide: claudeops v1.x to v2.0

This guide helps you migrate from claudeops v1.x (with oh-my-claudecode dependency) to v2.0 (self-contained).

## Overview

claudeops v2.0 is a major release that:

1. **Removes oh-my-claudecode dependency** - claudeops is now self-contained
2. **Consolidates agents** from 35 to 12 focused specialists
3. **Consolidates skills** from 15 to 6 core capabilities
4. **Leverages Claude Code native features** - Task tool, background execution, /plan mode

## Quick Migration Checklist

- [ ] Update agent prefix from `oh-my-claudecode:` to `claudeops:`
- [ ] Update agent references for renamed/merged agents
- [ ] Update skill references for merged skills
- [ ] Remove `requires.oh-my-claudecode` from custom setup manifests (optional, field is ignored)
- [ ] Run `co doctor` to verify configuration

## Agent Migration

### Prefix Change

All agent references must use the new `claudeops:` prefix:

```typescript
// v1.x
Task(subagent_type="oh-my-claudecode:architect", model="opus", prompt="...")

// v2.0
Task(subagent_type="claudeops:architect", model="opus", prompt="...")
```

### Agent Mapping

| v1.x Agent | v2.0 Agent | Notes |
|------------|------------|-------|
| `architect` | `architect` | Now includes code review |
| `architect-low` | `architect` | Use with `model="haiku"` |
| `architect-medium` | `architect` | Use with `model="sonnet"` |
| `executor` | `executor` | Now includes build fixing |
| `executor-low` | `executor-low` | Unchanged |
| `executor-high` | `executor` | Use with `model="opus"` |
| `explore` | `explore` | Unchanged |
| `explore-medium` | `explore` | Use with `model="sonnet"` |
| `designer` | `designer` | Unchanged |
| `designer-low` | `designer` | Use with `model="haiku"` |
| `designer-high` | `designer` | Use with `model="opus"` |
| `qa-tester` | `qa-tester` | Now includes TDD |
| `security-reviewer` | `security` | **Renamed** |
| `security-reviewer-low` | `security` | Use with `model="haiku"` |
| `planner` | `planner` | Unchanged |
| `critic` | `critic` | Unchanged |
| `writer` | `writer` | Unchanged |
| `researcher` | `researcher` | Unchanged |
| `researcher-low` | `researcher` | Use with `model="haiku"` |
| `vision` | `vision` | Unchanged |

### Archived Agents

These agents were removed and their capabilities absorbed:

| Archived Agent | Replacement |
|----------------|-------------|
| `analyst` | `architect` with analysis prompt |
| `build-fixer` | `executor` (capability merged) |
| `build-fixer-low` | `executor-low` (capability merged) |
| `code-reviewer` | `architect` (capability merged) |
| `code-reviewer-low` | `architect` with `model="haiku"` |
| `tdd-guide` | `qa-tester` (capability merged) |
| `tdd-guide-low` | `qa-tester` with `model="haiku"` |
| `scientist-*` | `researcher` with data analysis prompt |
| `oracle` | `architect` with debugging prompt |
| `*-expert` | Absorbed into primary agents |

### Example Migration

**v1.x code:**
```typescript
// Using build-fixer for TypeScript errors
Task(subagent_type="oh-my-claudecode:build-fixer", prompt="Fix the type errors in src/")

// Using code-reviewer
Task(subagent_type="oh-my-claudecode:code-reviewer", model="opus", prompt="Review this PR")

// Using tdd-guide
Task(subagent_type="oh-my-claudecode:tdd-guide", prompt="Guide TDD for new feature")
```

**v2.0 code:**
```typescript
// executor now handles build fixing
Task(subagent_type="claudeops:executor", prompt="Fix the type errors in src/")

// architect now handles code review
Task(subagent_type="claudeops:architect", model="opus", prompt="Review this PR")

// qa-tester now handles TDD
Task(subagent_type="claudeops:qa-tester", prompt="Guide TDD for new feature")
```

## Skill Migration

### Skill Mapping

| v1.x Skill | v2.0 Skill | Notes |
|------------|------------|-------|
| `orchestrate` | `orchestrate` | Now includes ralph philosophy |
| `autopilot` | `autopilot` | Unchanged |
| `planner` | `planner` | Unchanged |
| `git-master` | `git-master` | Unchanged |
| `frontend-ui-ux` | `frontend-ui-ux` | Unchanged |
| `doctor` | `doctor` | Unchanged |
| `ralph` | `orchestrate` | Merged - use verification-before-completion protocol |
| `ultrawork` | `orchestrate` | Merged - use parallel Task calls |
| `analyze` | Delegated | Use `architect` agent directly |
| `deepsearch` | Delegated | Use `explore` agent directly |
| `code-review` | Delegated | Use `architect` agent directly |
| `research` | Delegated | Use `researcher` agent directly |
| `tdd` | Delegated | Use `qa-tester` agent directly |
| `profile` | CLI | Use `co profile` commands |
| `help` | CLI | Use `co --help` |

### Ralph Philosophy in Orchestrate

The `ralph` skill's verification philosophy is now built into `orchestrate`:

```markdown
## Verification-Before-Completion Protocol

Before claiming any task is complete:
1. IDENTIFY: What command proves this claim?
2. RUN: Execute verification command
3. READ: Check output - did it pass?
4. CLAIM: Make claim WITH evidence

Never use "should", "probably", "seems to" without verification.
```

### Ultrawork Parallelism

Use Claude Code's native parallel Task calls instead of the `ultrawork` skill:

```typescript
// v1.x - using ultrawork skill
/oh-my-claudecode:ultrawork "run all tests and lint"

// v2.0 - native parallel Task calls
Task(subagent_type="claudeops:qa-tester", run_in_background=true, prompt="Run tests")
Task(subagent_type="claudeops:executor", run_in_background=true, prompt="Run lint")
```

## Setup Manifest Migration

### Minimal Changes Required

The `requires.oh-my-claudecode` field is ignored in v2.0 but kept for backward compatibility:

```toml
# This still works (field is ignored)
[requires]
oh-my-claudecode = ">=3.3.0"
addons = ["rm-rf-guard"]

# Recommended v2.0 format
[requires]
addons = ["rm-rf-guard"]
```

### Update Skills List

```toml
# v1.x
[skills]
enabled = [
    "autopilot",
    "ralph",           # Merged into orchestrate
    "ultrawork",       # Merged into orchestrate
    "planner",
    "git-master",
    "frontend-ui-ux",
    "tdd",             # Use qa-tester agent
    "code-review",     # Use architect agent
    "security-review"  # Use security agent
]

# v2.0
[skills]
enabled = [
    "autopilot",
    "planner",
    "git-master",
    "frontend-ui-ux"
]
```

### Update Agent References

```toml
# v1.x
[agents.security-reviewer]
model = "opus"
priority = 90

# v2.0
[agents.security]
model = "opus"
priority = 90
```

## Verification

After migration, run the doctor to verify:

```bash
co doctor
```

Expected output:
```
Checking configuration...
  [pass] Config files valid
  [pass] Agents configured (12 available)
  [pass] Skills configured (6 available)
  [pass] Setups valid
  [pass] Addons installed

All checks passed!
```

## Troubleshooting

### "Agent not found: oh-my-claudecode:X"

Update the agent prefix:
```typescript
// Change this
Task(subagent_type="oh-my-claudecode:architect", ...)

// To this
Task(subagent_type="claudeops:architect", ...)
```

### "Skill not found: ralph"

The ralph philosophy is now built into orchestrate. Use the verification-before-completion protocol directly in your workflow.

### "Agent not found: security-reviewer"

The agent was renamed:
```typescript
// Change this
Task(subagent_type="claudeops:security-reviewer", ...)

// To this
Task(subagent_type="claudeops:security", ...)
```

### Missing Specialized Agent

If you relied on a specific agent tier (e.g., `architect-low`), use the base agent with explicit model:
```typescript
// Instead of architect-low
Task(subagent_type="claudeops:architect", model="haiku", ...)
```

## Need Help?

- Run `co doctor --verbose` for detailed diagnostics
- Check `.archive/agents/` for archived agent definitions (reference only)
- Check `.archive/skills/` for archived skill definitions (reference only)
- File issues at https://github.com/claudeops/claudeops/issues
