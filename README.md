<div align="center">

# claudeops

**Batteries-Included Claude Code Enhancement**

[![npm version](https://img.shields.io/npm/v/claudeops.svg)](https://www.npmjs.com/package/claudeops)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js >= 20.0.0](https://img.shields.io/badge/node-%3E%3D%2020.0.0-green.svg)](https://nodejs.org)

Transform Claude Code into an intelligent development powerhouse with specialized agents,
smart model routing, lifecycle hooks, and profile-based configuration.

[Quick Start](#quick-start) | [Features](#features) | [Agents](#agents) | [Hooks](#hooks) | [Commands](#cli-commands) | [Configuration](#configuration)

</div>

---

## What is claudeops?

claudeops v3.2 is a batteries-included enhancement toolkit for Claude Code. It adds intelligent orchestration, semantic intent classification, lifecycle hooks, and profile-based configuration management. Describe what you need naturally and claudeops handles the rest -- selecting the right agents, choosing optimal models, managing costs, and enforcing best practices.

**Why claudeops?**

- **Reduce cognitive load** -- Stop thinking about implementation details, focus on outcomes
- **Intelligent defaults** -- AI-powered intent classification routes tasks to the best agents
- **Profile-driven** -- Switch between TOML-based profiles for different projects and workflows
- **Cost aware** -- Track spending and set daily budgets automatically
- **Extensible** -- 25 skills, 18 hooks, and an addon system for installing capabilities from GitHub

## Features

- **11 Specialized Agents** -- Opus, Sonnet, and Haiku agents for execution, architecture, design, testing, security, research, and more
- **Semantic Intent Detection** -- Describe what you want naturally; no keywords required
- **Intelligent Model Routing** -- AI selects agents and models based on task complexity
- **Profile System** -- TOML-based profiles with inheritance, custom content, and per-agent configuration
- **Addon System** -- Install and manage capabilities from GitHub repositories
- **18 Lifecycle Hooks** -- Automated checks and enforcement at every stage of the workflow
- **25 Skills** -- Reusable capabilities that can be installed, enabled, and synced
- **Cost Tracking** -- Monitor spending, set budgets, and view usage history
- **Swarm Orchestration** -- Coordinate multiple agents working in parallel
- **Auto-sync** -- Configuration is automatically synced to `~/.claude/` after builds and profile switches

---

## Quick Start

### Installation

```bash
npm install -g claudeops
```

### Initialize

```bash
cops init
```

This runs zero-config swarm setup: detects your environment, creates a profile, and syncs configuration to Claude Code.

### Verify

```bash
cops doctor
```

### Switch Profiles

```bash
cops profile list
cops profile use fullstack
```

That's it. Start using Claude Code normally and claudeops handles agent routing, hooks, and model selection.

### Command Aliases

| Alias | Use For |
|-------|---------|
| `claudeops` | Installation, formal contexts |
| `cops` | Day-to-day usage (recommended) |
| `co` | Quick commands |

All examples below use `cops`, but any alias works.

---

## Agents

claudeops includes 11 specialized agents across three model tiers. The system analyzes your request and routes work to the best agent automatically.

### Opus Agents

| Agent | Purpose |
|-------|---------|
| `executor` | Standard implementations, features, bug fixes |
| `architect` | Deep analysis, debugging, architecture decisions |
| `designer` | UI/UX, components, styling |
| `qa-tester` | Testing, TDD workflow |
| `security` | Security audit, vulnerability review |
| `researcher` | External research, API analysis |
| `planner` | Strategic planning, requirements |
| `critic` | Plan review, gap analysis |

### Haiku Agents

| Agent | Purpose |
|-------|---------|
| `explore` | File/code search, codebase discovery |
| `executor-low` | Boilerplate, simple single-file changes |
| `writer` | Documentation, comments |

### How Intent Classification Works

You do not need to specify which agent to use. Describe what you need:

```
You: "Add email validation to the signup form"
claudeops: [Analyzes: implementation + frontend + moderate complexity]
           [Routes to: executor agent with designer for UI review]

You: "Debug the race condition in the auth flow"
claudeops: [Analyzes: debugging + backend + complex]
           [Routes to: architect agent with verification required]

You: "Build a REST API for products"
claudeops: [Analyzes: feature + backend + complex]
           [Routes to: planner -> executor -> qa-tester]
```

The classifier considers intent type, complexity, domain, user signals, and task scope to make routing decisions. You can test it directly:

```bash
cops classify "add email validation"
```

---

## Hooks

claudeops includes 18 lifecycle hooks. Eight are enabled by default; the rest can be enabled per-profile.

### Enabled by Default

| Hook | Trigger | Purpose |
|------|---------|---------|
| `continuation-check` | Stop | Evaluates completion status, blocks premature stopping |
| `checkpoint` | Stop | Creates incremental code checkpoints |
| `version-bump-prompt` | Stop | Suggests version bump per semver |
| `lint-changed` | PostToolUse:Write | Runs ESLint after Write/Edit operations |
| `typecheck-changed` | PostToolUse:Write | Type-checks after Write/Edit operations |
| `keyword-detector` | UserPromptSubmit | Detects keywords for mode activation |
| `thinking-level` | UserPromptSubmit | Sets extended thinking budget by complexity |
| `swarm-lifecycle` | SubagentStop | Manages swarm agent lifecycle |

### Disabled by Default

Enable these in your profile's `[hooks]` section:

| Hook | Trigger | Purpose |
|------|---------|---------|
| `cost-warning` | UserPromptSubmit | Alerts when approaching daily budget |
| `security-scan` | PreToolUse | Scans for secrets before git commits |
| `test-reminder` | PostToolUse | Reminds to run tests after code changes |
| `format-on-save` | PostToolUse | Auto-formats files after Write/Edit |
| `git-branch-check` | PreToolUse | Warns on commits to main/master |
| `todo-tracker` | UserPromptSubmit | Tracks TODO items mentioned in prompts |
| `session-log` | Stop | Logs session summary when Claude stops |
| `large-file-warning` | PreToolUse | Warns before reading large files |
| `swarm-cost-tracker` | PostToolUse | Tracks per-agent costs during orchestration |
| `team-lifecycle` | SubagentStop | Logs team creation and shutdown events |

### Managing Hooks

```bash
cops hook list                            # List all hooks and their status
cops hook debug                           # Debug hook execution
cops hook test checkpoint                 # Test a specific hook
cops hook add <name>                      # Add a hook
cops hook sync                            # Sync hooks to Claude Code
```

---

## CLI Commands

All commands work with `claudeops`, `cops`, or `co`.

### Getting Started

```bash
cops init                                 # Zero-config swarm setup
cops scan                                 # Analyze codebase, output structured results
cops install                              # Install claudeops
cops config init                          # Initialize global configuration
cops doctor                               # Run diagnostics
cops sync                                 # Sync configuration to ~/.claude/
```

### Profile Management

Profiles are TOML files stored at `~/.claudeops/profiles/`. They support inheritance, custom CLAUDE.md content, agent configuration, model routing, and hook/skill toggling.

```bash
cops profile list                         # List all profiles
cops profile use <name>                   # Switch active profile (auto-syncs)
cops profile create <name>                # Create a new profile
cops profile delete <name>                # Delete a profile
```

### Addon Management

Install capabilities from GitHub repositories.

```bash
cops addon search <query>                 # Search for addons
cops addon install <name>                 # Install an addon
cops addon update <name>                  # Update an addon
cops addon remove <name>                  # Uninstall an addon
cops addon list                           # List installed addons
cops addon info <name>                    # Show addon details
cops addon enable <name>                  # Enable an addon
cops addon disable <name>                 # Disable an addon
```

### Skill Management

Skills are reusable capabilities that can be installed and toggled.

```bash
cops skill list                           # List available skills
cops skill info <name>                    # Show skill details
cops skill install <name>                 # Install a skill
cops skill sync                           # Sync skills to Claude Code
```

### MCP Server Management

```bash
cops mcp list                             # List MCP servers
cops mcp add <name>                       # Add an MCP server
cops mcp enable <name>                    # Enable an MCP server
cops mcp disable <name>                   # Disable an MCP server
```

### AI Features

```bash
cops classify "<prompt>"                  # Test intent classification
```

### Cost Tracking

```bash
cops cost today                           # View today's costs
cops cost week                            # View this week's costs
cops cost budget                          # View or set daily budget
cops cost pricing                         # View model pricing
```

### Swarm Orchestration

```bash
cops swarm status                         # View swarm status
cops swarm tasks                          # View active tasks
cops swarm init                           # Initialize a swarm
cops swarm stop                           # Stop the swarm
```

### Configuration

```bash
cops config init                          # Initialize config
cops config show                          # Display current config
cops config edit                          # Edit with $EDITOR
cops config validate                      # Validate syntax
```

### Utilities

```bash
cops sync                                 # Sync to ~/.claude/
cops doctor                               # Run diagnostics
cops reset                                # Remove claudeops artifacts from ~/.claude/
cops reset --global                       # Reset global config
cops reset --all                          # Reset everything
cops reset --dry-run                      # Preview what would be removed
cops reset --force                        # Skip confirmation
cops upgrade                              # Check and install updates
cops --version                            # Show installed version
```

---

## Configuration

### Global Configuration

Location: `~/.claudeops/config.toml`

```toml
[model]
default = "sonnet"

[model.routing]
simple = "haiku"
standard = "sonnet"
complex = "opus"

[cost]
tracking = true
budget_daily = 20.0

[sync]
auto = true
watch = false

packageManager = "bun"
```

### Profile Configuration

Location: `~/.claudeops/profiles/<name>.toml`

Profiles define agent configuration, model routing, skills, hooks, and custom CLAUDE.md content. They support single inheritance via the `extends` field.

```toml
name = "my-profile"
description = "Custom development profile"
extends = "fullstack"
content = """
Custom instructions that get written to CLAUDE.md.
These are injected when the profile is active.
"""

[model]
default = "opus"

[model.routing]
simple = "haiku"
standard = "sonnet"
complex = "opus"

[agents.executor]
model = "opus"
priority = 80

[agents.architect]
model = "opus"
priority = 80

[skills]
enabled = ["typescript-expert", "tdd"]
disabled = ["deepsearch"]

[hooks]
enabled = ["security-scan", "test-reminder"]
disabled = ["format-on-save"]

[cost]
tracking = true
budget_daily = 10.0
```

### Built-in Profiles

claudeops ships with several ready-to-use profiles:

| Profile | Description |
|---------|-------------|
| `minimal` | Bare-bones configuration |
| `fullstack` | Full-stack development (extends frontend) |
| `frontend` | Frontend-focused with designer agent |
| `backend` | Backend-focused with architect agent |
| `typescript` | TypeScript-heavy projects |
| `security` | Security-focused with audit hooks |
| `devops` | Infrastructure and deployment |
| `python` | Python development |

### Auto-sync

Configuration is automatically synced to `~/.claude/` in two ways:

1. **postbuild** -- The `postbuild` script runs `cops sync` after every build
2. **Profile switch** -- `cops profile use <name>` syncs immediately

You can also sync manually at any time with `cops sync`.

---

## Troubleshooting

### Command Not Found

If `cops` is not found after installation:

```bash
# Check installation
npm list -g claudeops

# Add npm bin to PATH
export PATH="$(npm config get prefix)/bin:$PATH"

# Add to shell profile for persistence
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc
```

### Configuration Issues

```bash
cops doctor                               # Diagnose all issues
cops config validate                      # Validate TOML syntax
cops sync --dry-run                       # Preview sync without applying
```

### Hooks Not Executing

```bash
cops hook list                            # List active hooks
cops hook debug                           # Debug execution
cops hook test lint-changed               # Test specific hook
```

### Reset to Clean State

```bash
cops reset --dry-run                      # Preview what gets removed
cops reset                                # Remove claudeops artifacts from ~/.claude/
cops reset --all --force                  # Full reset, skip confirmation
```

---

## Contributing

Contributions are welcome. This project uses [Bun](https://bun.sh/) as its package manager and runtime.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and verify: `bun run verify`
4. Commit with conventional messages: `git commit -m "feat: add feature"`
5. Submit a Pull Request

When contributing:

- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed
- Ensure `bun run verify` passes (typecheck, lint, test)

## Resources

- **Repository:** https://github.com/goamaan/claudeops
- **Issues:** https://github.com/goamaan/claudeops/issues
- **Discussions:** https://github.com/goamaan/claudeops/discussions

## License

MIT License - see [LICENSE](LICENSE) for details.
