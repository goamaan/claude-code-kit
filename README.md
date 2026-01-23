# claudeops

**Multi-Agent Orchestration Toolkit for Claude Code**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js >= 20.0.0](https://img.shields.io/badge/node-%3E%3D%2020.0.0-green.svg)](https://nodejs.org)
[![npm version](https://img.shields.io/npm/v/claudeops.svg)](https://www.npmjs.com/package/claudeops)

---

## Overview

`claudeops` (`cops`, `co`) is a batteries-included enhancement toolkit for Claude Code that provides:

- **Multi-Agent Orchestration** - Delegate tasks to specialized agents (executor, architect, designer, etc.)
- **Automatic Mode Detection** - Keywords like "ultrawork" or "autopilot" trigger enhanced behaviors
- **Smart Model Routing** - Direct tasks to appropriate Claude models (Haiku, Sonnet, Opus)
- **Task System Integration** - Dependency-aware task management with parallel execution
- **Profile Management** - Switch between different configuration contexts
- **Setup Templates** - Pre-configured environments for common development scenarios
- **Hook System** - Intercept and modify Claude Code behavior at key points
- **Cost Tracking** - Monitor token usage and spending with budgets

---

## Quick Start

### Installation

```bash
npm install -g claudeops
```

### Initialize and Sync

```bash
# Initialize configuration
claudeops config init

# Create a profile with a setup template
claudeops profile create my-project --setup fullstack --activate

# Sync configuration to Claude Code
claudeops sync
```

### Verify Setup

```bash
claudeops doctor
```

---

## Multi-Agent Orchestration

The core feature of claudeops is enabling Claude Code to delegate work to specialized agents.

### Philosophy

```
YOU ARE A CONDUCTOR, NOT A PERFORMER

Your job:
- Read files for context
- Analyze requirements
- Create task breakdown with dependencies
- Delegate to specialized agents
- Verify completion
- Report results

NOT your job:
- Write code directly
- Make changes to files
- Implement features yourself
```

### Agent Catalog (12 Agents)

All agents use prefix `claudeops:` when delegating via the Task tool.

| Category | Agent | Model | Use For |
|----------|-------|-------|---------|
| **Execution** | executor | sonnet | Standard implementations, build fixes |
| | executor-low | haiku | Boilerplate, simple changes |
| **Analysis** | architect | opus | Deep analysis, debugging, code review |
| **Search** | explore | haiku | File/code search, codebase discovery |
| **Frontend** | designer | sonnet | UI/UX, components, styling |
| **Quality** | qa-tester | sonnet | Testing, TDD workflow |
| | security | opus | Security audit, vulnerability review |
| **Support** | writer | haiku | Documentation, comments |
| | researcher | sonnet | External research, API analysis |
| | vision | sonnet | Image/visual analysis |
| **Strategic** | planner | opus | Strategic planning, requirements |
| | critic | opus | Plan review, gap analysis |

### Delegation Examples

```python
# Simple lookup (cheap, fast)
Task(subagent_type="claudeops:explore", model="haiku",
     prompt="Find where UserService is defined")

# Standard implementation
Task(subagent_type="claudeops:executor", model="sonnet",
     prompt="Add validation to createUser function")

# Complex debugging
Task(subagent_type="claudeops:architect", model="opus",
     prompt="Debug the race condition in auth flow")

# Parallel execution (multiple Task calls in one message)
Task(subagent_type="claudeops:executor", model="sonnet", prompt="Create types.ts")
Task(subagent_type="claudeops:executor", model="sonnet", prompt="Create utils.ts")
Task(subagent_type="claudeops:designer", model="sonnet", prompt="Create Button.tsx")
```

**CRITICAL:** Always pass the `model` parameter explicitly. Claude Code does NOT auto-apply models from agent definitions.

---

## Automatic Mode Detection

The keyword-detector hook automatically activates enhanced modes based on your prompts:

| Keywords | Mode | Behavior |
|----------|------|----------|
| `ultrawork`, `ulw`, `uw` | **ULTRAWORK** | Maximum parallel execution, aggressive delegation, persistence until verified complete |
| `autopilot`, `build me`, `create a`, `make me` | **AUTOPILOT** | 5-phase autonomous execution (Discovery → Planning → Execution → Verification → Completion) |
| `plan this`, `plan the`, `how should I` | **PLANNER** | Structured user interview + parallelizable task breakdown |
| `investigate`, `debug`, `analyze` | **ANALYSIS** | Deep analysis via architect agent |
| `find`, `search`, `locate` | **SEARCH** | Parallel explore agents for codebase discovery |

### Example Usage

```
User: "ultrawork - implement user authentication"
→ Activates ULTRAWORK mode with maximum parallelism

User: "build me a REST API for products"
→ Activates AUTOPILOT mode with 5-phase workflow

User: "plan this feature: add payment processing"
→ Activates PLANNER mode with structured interview
```

---

## Task System

claudeops leverages Claude Code's native Task system for dependency-aware orchestration.

### Core Tools

| Tool | Purpose | Key Fields |
|------|---------|------------|
| `TaskCreate` | Create a new task | subject, description, activeForm, addBlockedBy |
| `TaskUpdate` | Modify existing task | taskId, status, owner, addBlockedBy, addBlocks |
| `TaskGet` | Get full task details | taskId |
| `TaskList` | See all tasks | (none) |

### Task Dependencies

Tasks can block other tasks - blocked tasks cannot start until dependencies complete:

```python
TaskCreate({subject: "Set up database"})           # Task #1
TaskCreate({subject: "Create user schema"})        # Task #2
TaskCreate({subject: "Implement auth", addBlockedBy: ["1", "2"]})  # Task #3 waits for both
```

### Parallel Agent Assignment

```python
# Create tasks with owners
TaskCreate({subject: "Run security audit", owner: "security-agent"})
TaskCreate({subject: "Write tests", owner: "qa-agent"})

# Spawn agents that find their work
Task(subagent_type="claudeops:security", model="opus",
     prompt="You are security-agent. Call TaskList, find your tasks, complete them.")
Task(subagent_type="claudeops:qa-tester", model="sonnet",
     prompt="You are qa-agent. Call TaskList, find your tasks, complete them.")
```

---

## Hook System

Hooks intercept and modify Claude Code behavior at key points.

### Available Hooks

| Hook | Event | Purpose |
|------|-------|---------|
| `keyword-detector` | UserPromptSubmit | Detects keywords and injects mode context |
| `continuation-check` | Stop | Blocks stopping when tasks remain pending |
| `lint-changed` | PostToolUse | Runs ESLint after Write/Edit on JS/TS files |
| `typecheck-changed` | PostToolUse | Runs TypeScript check after Write/Edit on TS files |
| `checkpoint` | Stop | Creates git stash checkpoint before session ends |
| `thinking-level` | UserPromptSubmit | Enhances reasoning for complex tasks |

### Hook Configuration

Hooks are configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "hooks": [{
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR/hooks/keyword-detector.mjs\""
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR/hooks/continuation-check.mjs\""
      }]
    }]
  }
}
```

---

## Setup Templates

Pre-built configurations for common development scenarios.

| Setup | Purpose | Key Features |
|-------|---------|--------------|
| `minimal` | Bare essentials | Default model routing only |
| `fullstack` | React + Node.js | Frontend + backend agents, git mastery |
| `frontend` | Frontend-focused | Designer agent, UI/UX skills |
| `backend` | Backend-focused | API design, database, testing |
| `data` | Data science | Python, ML, statistics |
| `devops` | Infrastructure | Docker, K8s, CI/CD |
| `enterprise` | Large teams | All skills, security reviewers |

```bash
# List available setups
claudeops setup list

# Use a setup
claudeops setup use fullstack

# Get setup info
claudeops setup info backend
```

---

## Profile Management

Profiles are named configuration contexts for different projects or work modes.

```bash
# List all profiles
claudeops profile list

# Create profile with setup template
claudeops profile create client-a --setup fullstack --activate

# Switch profiles
claudeops profile use client-a

# Export/import profiles
claudeops profile export client-a --format json --output client-a.json
claudeops profile import client-a.json --name client-a-copy
```

---

## Commands Reference

### Core Commands

```bash
# Sync configuration to Claude Code
claudeops sync [--dry-run] [--force] [--backup]

# Run diagnostics
claudeops doctor [--fix] [--verbose]

# Check for updates
claudeops upgrade [--check]
```

### Profile Management

```bash
claudeops profile list [--json]
claudeops profile use <name>
claudeops profile create <name> [--from <base>] [--setup <setup>] [--activate]
claudeops profile delete <name> [--force]
claudeops profile export <name> [--format toml|json]
claudeops profile import <source> [--name <name>]
claudeops profile show [name] [--json]
```

### Setup Management

```bash
claudeops setup list [--json]
claudeops setup info <name> [--json]
claudeops setup use <name>
claudeops setup create <name> [--description <text>]
claudeops setup export <name> [--output <path>]
claudeops setup import <source> [--name <name>]
```

### Addon Management

```bash
claudeops addon list [--json]
claudeops addon search <query>
claudeops addon install <source> [--version <version>]
claudeops addon update <name>
claudeops addon remove <name> [--force]
```

### MCP Server Management

```bash
claudeops mcp list [--json] [--status]
claudeops mcp add <server> [--config <json>]
claudeops mcp remove <server>
claudeops mcp enable <server>
claudeops mcp disable <server>
```

### Cost Tracking

```bash
claudeops cost today [--format table|json]
claudeops cost week [--format table|json]
claudeops cost budget [--set <usd>] [--period daily|weekly|monthly]
claudeops cost export [--format csv|json] [--period <period>]
```

### Hook Management

```bash
claudeops hook list [--json]
claudeops hook debug [--event <event>] [--verbose]
claudeops hook test <hook-name> [--event <event>] [--input <json>]
```

---

## Configuration

### Global Configuration (`~/.claudeops/config.toml`)

```toml
[model]
default = "sonnet"

[model.routing]
simple = "haiku"
standard = "sonnet"
complex = "opus"

[cost]
enabled = true
dailyBudget = 10.0
weeklyBudget = 50.0

[sync]
autoSync = true
backupBeforeSync = true
```

### Project Configuration (`.claudeops.yaml`)

```yaml
profiles:
  - name: development
    description: Development environment
    extends: fullstack

  - name: production
    description: Production configuration
    extends: enterprise

activeProfile: development

cost:
  dailyBudget: 5.0
```

---

## Skills

Skills are specialized capabilities that can be activated manually or via keyword detection.

| Skill | Description |
|-------|-------------|
| `orchestrate` | Core multi-agent orchestration (always conceptually active) |
| `autopilot` | Autonomous execution from idea to working code |
| `planner` | Strategic planning with structured user interview |
| `git-master` | Git expertise for commits, branches, history |
| `frontend-ui-ux` | UI/UX design principles for frontend work |
| `doctor` | Diagnose and fix configuration issues |

---

## Verification Protocol

Before claiming completion on complex work:

1. **Spawn architect for verification:**
   ```python
   Task(subagent_type="claudeops:architect", model="opus",
        prompt="Verify the implementation meets requirements...")
   ```

2. **Wait for response**

3. **If APPROVED:** Report completion with evidence

4. **If REJECTED:** Fix issues and re-verify

### Required Evidence

| Claim | Required Evidence |
|-------|-------------------|
| "Fixed" | Test showing it passes |
| "Implemented" | Build passes + types clean |
| "Refactored" | All tests still pass |

---

## Troubleshooting

### "Command not found: claudeops"

```bash
# Verify installation
npm list -g claudeops

# Add npm bin to PATH if needed
export PATH="$(npm config get prefix)/bin:$PATH"
```

### Configuration not syncing

```bash
claudeops doctor --fix
claudeops sync --dry-run  # See what would be synced
claudeops sync --backup   # Sync with backup
```

### Hooks not executing

```bash
claudeops hook list
claudeops hook debug --verbose
```

### Mode not activating

Ensure keyword-detector hook is enabled in `.claude/settings.json` and the hooks directory contains `keyword-detector.mjs`.

---

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and test thoroughly
4. Run `npm run verify` to check code quality
5. Commit with conventional messages: `git commit -m "feat: add my feature"`
6. Push and create a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Support

- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section above
