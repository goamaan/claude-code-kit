<div align="center">

# claudeops

**Multi-Agent Orchestration for Claude Code**

[![npm version](https://img.shields.io/npm/v/claudeops.svg)](https://www.npmjs.com/package/claudeops)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js >= 20.0.0](https://img.shields.io/badge/node-%3E%3D%2020.0.0-green.svg)](https://nodejs.org)

Transform Claude Code into a multi-agent development powerhouse. Just describe what you want naturally - claudeops uses AI to understand your intent, delegate to specialized agents, and orchestrate complex workflows automatically.

[Getting Started](#quick-start) • [Features](#features) • [Agents](#agents) • [Pack System](#pack-system) • [Documentation](#documentation)

</div>

---

## What is claudeops?

claudeops v3 supercharges Claude Code with intelligent multi-agent orchestration, semantic intent detection, and built-in safety guardrails. Instead of memorizing keywords or commands, just describe what you need naturally and claudeops figures out the rest - routing to the right agents, using the optimal models, and keeping your code safe.

## Features

- **12 Specialized Agents** - Delegate to experts for execution, architecture, design, testing, security, and more
- **Semantic Intent Detection** - No keywords needed - just describe what you want naturally
- **Intelligent Routing** - AI automatically selects agents, models, and parallelism based on task complexity
- **AI-Powered Pack System** - Install capabilities from GitHub repos with `claudeops pack add <url>`
- **Built-in Guardrails** - Deletion protection, secret scanning, dangerous command warnings
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

claudeops provides 12 specialized agents optimized for different tasks. The system intelligently routes work to the right agents based on your request - no manual delegation needed.

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

**Usage:**

Simply describe what you need naturally:

```
You: "Add email validation to the signup form"
Claude: [Routes to executor agent automatically]

You: "Debug the race condition in the auth flow"
Claude: [Routes to architect agent for deep analysis]

You: "Build a REST API for products"
Claude: [Analyzes intent, creates plan, delegates to multiple agents in parallel]
```

---

## Semantic Intent Detection

No keywords to memorize. Just describe what you want:

- **"Build me a login page"** → Detects: feature implementation, frontend domain, moderate complexity → Routes to planner → designer → executor → qa-tester
- **"Debug this error"** → Detects: debugging task, complex → Routes to architect agent
- **"Find where UserService is used"** → Detects: research task, simple → Routes to explore agent
- **"Review security of authentication"** → Detects: security review, complex → Routes to security + architect agents

The system automatically:
- Classifies your intent (implementation, debugging, research, review, planning, refactoring)
- Assesses complexity (trivial, simple, moderate, complex, architectural)
- Selects optimal models (Haiku for speed, Sonnet for balance, Opus for depth)
- Determines parallelism strategy (sequential, parallel, or swarm)
- Routes to appropriate specialized agents

---

## Guardrails

Built-in safety protections enabled by default:

**Deletion Protection**
- Blocks dangerous commands like `rm -rf`, `shred`, `unlink`
- Suggests safe alternatives using `trash` for recoverable deletion
- Protects against accidental destructive operations

**Secret Scanning**
- Detects API keys, tokens, passwords, and secrets in code
- Blocks commits containing sensitive data
- Warns when writing secrets to files

**Dangerous Command Warnings**
- Warns on force push, hard reset, and other risky Git operations
- Blocks SQL drops and truncates by default
- Provides safe alternatives and confirmation prompts

All guardrails can be customized per project in `.claudeops.yaml`.

---

## Pack System

Extend claudeops with packs - collections of agents, skills, hooks, and capabilities. The AI analyzes repositories automatically and helps you install the components you need.

**Install a pack:**

```bash
claudeops pack add https://github.com/user/repo
```

The system will:
1. Clone and analyze the repository using AI
2. Detect components (agents, skills, hooks, rules, MCP servers)
3. Show what was found and let you select what to install
4. Install selected components to your claudeops configuration

**Supported Pack Types:**
- **Agents** - Specialized AI agents for different domains
- **Skills** - Reusable capabilities and workflows
- **Hooks** - Lifecycle hooks (pre/post tool use, prompt submit, etc.)
- **Rules** - Best practices and coding standards
- **MCP Servers** - Model Context Protocol integrations
- **Guardrails** - Safety and security protections

**Manage packs:**

```bash
claudeops pack list              # List installed packs
claudeops pack info <name>       # Show pack details
claudeops pack enable <name>     # Enable a pack
claudeops pack disable <name>    # Disable a pack
claudeops pack remove <name>     # Uninstall a pack
claudeops pack update <name>     # Update specific pack
claudeops pack update --all      # Update all packs
```

**Examples:**

```bash
# Add browser automation capabilities
claudeops pack add https://github.com/vercel-labs/agent-browser

# Add React development skills
claudeops pack add https://github.com/vercel-labs/agent-skills

# Add custom company standards
claudeops pack add https://github.com/mycompany/coding-standards
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
