---
name: help
description: Show usage guide and available commands
auto_trigger:
  - help
  - how do I
  - what can you
  - show commands
  - usage
allowed_tools:
  - Read
---

# Help Skill

Display usage guide and available features for the user.

## Purpose

Help mode provides:
- Overview of available skills
- Command reference
- Usage examples
- Quick start guide

## When to Activate

Activate when user says:
- "help"
- "how do I use this"
- "what can you do"
- "show commands"
- "usage guide"

## Output Format

When help is requested, output:

```
# ClaudeOps Help

## Quick Start

Just describe what you want to build or do. ClaudeOps will automatically:
- Detect the best approach
- Delegate to specialized agents
- Verify completion

**Examples:**
- "Build me a REST API for tasks"
- "Fix the bug in auth.ts"
- "Refactor the user service"

## Magic Keywords

| Keyword | Effect | Example |
|---------|--------|---------|
| `autopilot` | Full autonomous execution | "autopilot: build a todo app" |
| `ralph` | Persist until complete | "ralph: fix all tests" |
| `ulw` | Maximum parallelism | "ulw: update all deps" |
| `plan` | Start planning interview | "plan the new feature" |

**Combine them:** "ralph ulw: migrate database"

## Available Skills

### Execution
| Skill | Purpose |
|-------|---------|
| autopilot | Full autonomous development |
| ralph | Persistence until complete |
| ultrawork | Maximum parallel execution |

### Planning
| Skill | Purpose |
|-------|---------|
| planner | Strategic planning with interview |
| analyze | Deep debugging and investigation |
| deepsearch | Thorough codebase search |

### Quality
| Skill | Purpose |
|-------|---------|
| code-review | 6-agent parallel code review |
| tdd | Test-driven development workflow |

### Specialized
| Skill | Purpose |
|-------|---------|
| research | Parallel data analysis |
| frontend-ui-ux | UI/UX design (auto-activates) |
| git-master | Git best practices (auto-activates) |

### System
| Skill | Purpose |
|-------|---------|
| doctor | Diagnose issues |
| profile | Manage profiles |
| help | This guide |

## Agent Catalog

ClaudeOps has 28 specialized agents organized by tier:

### Execution Agents
- `executor-low` (haiku): Simple changes
- `executor` (sonnet): Standard features
- `executor-high` (opus): Complex logic

### Analysis Agents
- `architect-low/medium` (haiku/sonnet): Quick analysis
- `architect` (opus): Deep analysis, debugging

### Frontend Agents
- `designer-low/medium` (haiku/sonnet): UI components
- `designer-high` (opus): Complex UI systems

### Quality Agents
- `qa-tester` / `qa-tester-high`: Testing
- `code-reviewer-low` / `code-reviewer`: Code review
- `security-reviewer-low` / `security-reviewer`: Security

### Support Agents
- `writer`: Documentation
- `researcher`: Research tasks
- `build-fixer`: Build errors
- `tdd-guide`: TDD workflow
- `scientist`: Data analysis

## Stopping and Cancelling

Say "stop", "cancel", or "abort" to interrupt any running operation.
ClaudeOps will:
1. Note current progress
2. Stop spawning new agents
3. Report status
4. Provide resume instructions

## Tips

1. **Be specific** for faster results
2. **Use keywords** for guaranteed behavior
3. **Combine keywords** for powerful workflows
4. **Let it work** - autopilot handles complexity

## Need More Help?

- "doctor" - Diagnose installation issues
- Ask specific questions about any feature
```

## Customizing Help

Based on context, emphasize relevant sections:
- New user → Quick Start
- Asking about specific skill → Detailed skill info
- Troubleshooting → Doctor and debugging

## Additional Help Topics

### Per-Skill Help

If user asks about specific skill:
```
User: "help with ralph"
Response: [Detailed ralph explanation]
```

### Troubleshooting Help

If user seems stuck:
```
Suggest running doctor skill
Offer specific debugging steps
```

## Anti-Patterns to Avoid

1. **Information overload**
   - BAD: Dump entire manual
   - GOOD: Show relevant section

2. **Too brief**
   - BAD: "Use autopilot for autonomous execution"
   - GOOD: Include example

3. **No examples**
   - BAD: Abstract descriptions
   - GOOD: Concrete usage examples

## Success Criteria

Help is effective when:
- [ ] User understands how to proceed
- [ ] Relevant information provided
- [ ] Examples included
- [ ] Not overwhelming
- [ ] Next steps clear
