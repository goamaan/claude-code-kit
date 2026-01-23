<div align="center">

# claudeops

**Multi-Agent Orchestration for Claude Code**

[![npm version](https://img.shields.io/npm/v/claudeops.svg)](https://www.npmjs.com/package/claudeops)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js >= 20.0.0](https://img.shields.io/badge/node-%3E%3D%2020.0.0-green.svg)](https://nodejs.org)

Transform Claude Code into a multi-agent development powerhouse. Delegate tasks to specialized agents, activate smart modes with keywords, and orchestrate complex workflows with ease.

[Getting Started](#quick-start) • [Features](#features) • [Agents](#agents) • [Modes](#modes) • [Documentation](#documentation)

</div>

---

## What is claudeops?

claudeops supercharges Claude Code with multi-agent orchestration, automatic mode detection, and intelligent task routing. Instead of Claude doing everything itself, it can delegate work to specialized agents optimized for specific tasks - from architecture analysis to UI design to security audits.

## Features

- **12 Specialized Agents** - Delegate to experts for execution, architecture, design, testing, security, and more
- **Smart Mode Detection** - Type `autopilot` or `ultrawork` to activate enhanced workflows
- **Intelligent Model Routing** - Automatically use Haiku for simple tasks, Opus for complex analysis
- **Setup Templates** - Pre-configured profiles for fullstack, frontend, backend, devops, and enterprise
- **Profile Management** - Switch between project configurations instantly
- **Hook System** - Auto-lint, type-check, and checkpoint your code
- **Cost Tracking** - Monitor spending with configurable budgets

---

## Quick Start

Install claudeops globally:

```bash
npm install -g claudeops
```

Initialize with a setup template:

```bash
claudeops config init
claudeops profile create my-project --setup fullstack --activate
claudeops sync
```

Verify everything is working:

```bash
claudeops doctor
```

That's it! You can now use enhanced modes and agents in Claude Code.

---

## Agents

claudeops provides 12 specialized agents optimized for different tasks. Each agent runs on the most cost-effective model for its workload.

**Execution & Implementation**
- `executor` - Standard features and bug fixes (Sonnet)
- `executor-low` - Simple boilerplate and refactoring (Haiku)

**Analysis & Planning**
- `architect` - Deep debugging and code review (Opus)
- `planner` - Strategic planning and requirements (Opus)
- `critic` - Plan review and gap analysis (Opus)

**Specialized Domains**
- `designer` - UI/UX, components, styling (Sonnet)
- `qa-tester` - Testing and TDD workflows (Sonnet)
- `security` - Security audits and reviews (Opus)

**Support & Research**
- `explore` - Fast codebase search (Haiku)
- `writer` - Documentation and comments (Haiku)
- `researcher` - External research and API analysis (Sonnet)
- `vision` - Image and visual analysis (Sonnet)

**Usage Example:**

```bash
# In Claude Code, delegate tasks to agents:
Task(subagent_type="claudeops:executor", model="sonnet",
     prompt="Add email validation to the signup form")

Task(subagent_type="claudeops:architect", model="opus",
     prompt="Debug the race condition in the auth flow")
```

---

## Modes

Type keywords to activate enhanced workflows automatically.

**ULTRAWORK** (`ultrawork`, `ulw`, `uw`)
- Maximum parallel execution
- Aggressive task delegation
- Persistent until verified complete

**AUTOPILOT** (`autopilot`, `build me`, `create a`, `make me`)
- 5-phase autonomous workflow
- Discovery → Planning → Execution → Verification → Completion

**PLANNER** (`plan this`, `plan the`, `how should I`)
- Structured user interview
- Parallelizable task breakdown

**ANALYSIS** (`investigate`, `debug`, `analyze`)
- Deep analysis via architect agent
- Root cause identification

**SEARCH** (`find`, `search`, `locate`)
- Parallel codebase exploration
- Fast pattern matching

**Example:**

```
You: "ultrawork - implement user authentication with JWT"
Claude: [Activates ULTRAWORK mode, spawns multiple agents in parallel]

You: "build me a REST API for products"
Claude: [Activates AUTOPILOT mode, runs 5-phase workflow]
```

---

## Setup Templates

Pre-built configurations for common development scenarios.

```bash
# List available templates
claudeops setup list

# Use a template
claudeops setup use fullstack
```

**Available Templates:**
- `minimal` - Bare essentials with model routing
- `fullstack` - React + Node.js with all agents
- `frontend` - UI/UX focused with designer agent
- `backend` - API design, database, testing
- `data` - Python, ML, data science workflows
- `devops` - Docker, K8s, CI/CD automation
- `enterprise` - Full agent suite with security

---

## Common Commands

**Sync & Diagnostics**

```bash
claudeops sync              # Sync configuration to Claude Code
claudeops doctor            # Run diagnostics
claudeops upgrade --check   # Check for updates
```

**Profile Management**

```bash
claudeops profile list                                      # List profiles
claudeops profile create client-a --setup fullstack         # Create profile
claudeops profile use client-a                              # Switch profiles
```

**Cost Tracking**

```bash
claudeops cost today               # View today's spending
claudeops cost budget --set 10     # Set daily budget to $10
```

**Hooks**

```bash
claudeops hook list      # List active hooks
claudeops hook debug     # Debug hook execution
```

---

## Configuration

**Global Config** (`~/.claudeops/config.toml`)

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
```

**Project Config** (`.claudeops.yaml`)

```yaml
profiles:
  - name: development
    extends: fullstack

activeProfile: development
```

---

## Documentation

For detailed documentation on agents, modes, hooks, and advanced usage, run `claudeops --help` or see the sections above.

**Troubleshooting:**

```bash
# Command not found
npm list -g claudeops
export PATH="$(npm config get prefix)/bin:$PATH"

# Config not syncing
claudeops doctor --fix
claudeops sync --dry-run

# Hooks not working
claudeops hook list
claudeops hook debug --verbose
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and test: `npm run verify`
4. Commit with conventional messages: `git commit -m "feat: add feature"`
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details
