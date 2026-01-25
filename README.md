<div align="center">

# claudeops

**Batteries-Included Claude Code Enhancement**

[![npm version](https://img.shields.io/npm/v/claudeops.svg)](https://www.npmjs.com/package/claudeops)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js >= 20.0.0](https://img.shields.io/badge/node-%3E%3D%2020.0.0-green.svg)](https://nodejs.org)

Transform Claude Code into an intelligent development powerhouse. Just describe what you want—claudeops uses AI to understand your intent, automatically route to specialized agents, and orchestrate complex workflows with smart guardrails.

[Quick Start](#quick-start) • [Features](#features) • [Agents](#agents) • [Commands](#cli-commands) • [Configuration](#configuration)

</div>

---

## What is claudeops?

claudeops v3.1 is a batteries-included enhancement toolkit for Claude Code that adds intelligent orchestration, semantic intent classification, and built-in safety guardrails. Instead of memorizing commands or keywords, simply describe what you need naturally and claudeops figures out the rest—selecting the right agents, choosing optimal models, managing costs, and keeping your work safe.

**Why claudeops?**
- **Reduce cognitive load** - Stop thinking about implementation details, focus on outcomes
- **Intelligent defaults** - AI-powered intent classification routes tasks to best agents
- **Safety first** - Built-in guardrails protect against accidental deletion, secret leaks, and risky operations
- **Cost aware** - Track spending and set budgets automatically
- **Highly extensible** - Install capabilities via packs, hooks, and skills from GitHub

## Features

- **12 Specialized Agents** - Execution, architecture, design, testing, security, research, and more
- **Semantic Intent Detection** - Describe what you want naturally—no keywords required
- **Intelligent Routing** - AI selects agents, models, and parallelism based on task complexity
- **AI-Powered Pack System** - Extend claudeops by installing packs from GitHub repositories
- **Built-in Guardrails** - Deletion protection, secret scanning, dangerous command warnings
- **Setup Templates** - Pre-configured profiles for fullstack, frontend, backend, devops, and enterprise
- **Profile Management** - Switch between project configurations instantly
- **Hook System** - 13 battle-tested lifecycle hooks for automated checks and enforcement
- **Cost Tracking** - Monitor spending, set budgets, and view spending history

---

## Quick Start

### Installation

```bash
npm install -g claudeops
```

Verify the installation:

```bash
claudeops doctor
```

### Initialize Your Project

```bash
# Choose a setup template (fullstack, backend, frontend, data, devops, enterprise, minimal)
claudeops setup use fullstack

# Sync configuration to Claude Code
claudeops sync
```

That's it! Start using claudeops by describing what you want naturally in Claude Code.

---

## Agents

claudeops includes 12 specialized agents. The system automatically analyzes your request and routes work to the best agent—no manual delegation required.

### Agent Overview

| Agent | Model | Purpose |
|-------|-------|---------|
| `executor` | Sonnet | Feature implementation, bug fixes, and standard changes |
| `executor-low` | Haiku | Simple boilerplate, quick changes, and refactoring |
| `architect` | Opus | Deep debugging, architecture decisions, code review |
| `planner` | Opus | Strategic planning, requirements breakdown |
| `critic` | Opus | Plan review, gap analysis, risk assessment |
| `designer` | Sonnet | UI/UX design, component creation, styling |
| `qa-tester` | Sonnet | Test writing, TDD workflows, quality assurance |
| `security` | Opus | Security audits, vulnerability analysis |
| `explore` | Haiku | Fast codebase search and file discovery |
| `writer` | Haiku | Documentation writing and maintenance |
| `researcher` | Sonnet | External research, API analysis, documentation |
| `vision` | Sonnet | Image and visual analysis |

### How Intent Classification Works

You don't need to tell claudeops which agent to use. Just describe what you need:

```
You: "Add email validation to the signup form"
claudeops: [Analyzes: implementation + frontend + moderate complexity]
           [Routes to: executor agent with designer for UI review]

You: "Debug the race condition in the auth flow"
claudeops: [Analyzes: debugging + backend + complex]
           [Routes to: architect agent with verification required]

You: "Build a REST API for products"
claudeops: [Analyzes: feature + backend + complex]
           [Routes to: planner → executor → qa-tester]
```

The classification considers:
- **Intent type** - Implementation, debugging, research, review, planning, maintenance
- **Complexity** - Trivial, simple, moderate, complex, or architectural
- **Domain** - Frontend, backend, database, devops, security, testing, documentation
- **User signals** - Wants speed? thoroughness? autonomy? planning?
- **Task scope** - Single file change vs. multi-component system

---

## Built-in Guardrails

Safety protections are enabled by default to prevent common mistakes:

### Deletion Protection
- Blocks dangerous commands like `rm -rf`, `shred`, `unlink`
- Suggests safe alternatives using `trash` for recoverable deletion
- Prevents accidental destructive operations

### Secret Scanning
- Detects API keys, tokens, passwords, and secrets in code
- Blocks commits containing sensitive data
- Warns before writing secrets to files

### Dangerous Command Warnings
- Warns on risky Git operations (force push, hard reset)
- Blocks SQL drops and truncates by default
- Provides safe alternatives and requires confirmation

All guardrails can be customized or disabled in `.claudeops.yaml`.

---

## CLI Commands

### Profile Management

Profiles let you switch between different project configurations instantly.

```bash
claudeops profile list                    # List all profiles
claudeops profile create <name>           # Create new profile
claudeops profile use <name>              # Switch active profile
claudeops profile delete <name>           # Delete profile
```

### Setup Templates

Pre-configured templates for common development scenarios.

```bash
claudeops setup list                      # Show available templates
claudeops setup use fullstack             # Use a template
claudeops setup info <name>               # Get template details
```

**Available templates:** `minimal`, `fullstack`, `frontend`, `backend`, `data`, `devops`, `enterprise`

### Pack Management

Install capabilities from GitHub repositories. The AI analyzes the repo and auto-detects components.

```bash
claudeops pack add <github-url>           # Install pack from GitHub
claudeops pack list                       # List installed packs
claudeops pack info <name>                # Show pack details
claudeops pack enable <name>              # Enable pack
claudeops pack disable <name>             # Disable pack
claudeops pack remove <name>              # Uninstall pack
claudeops pack update --all               # Update all packs
```

### Skill Management

Skills are reusable capabilities that can be installed and toggled.

```bash
claudeops skill list                      # List available skills
claudeops skill info <name>               # Show skill details
claudeops skill install <name>            # Install skill
claudeops skill enable <name>             # Enable skill
claudeops skill disable <name>            # Disable skill
claudeops skill sync                      # Sync skills to Claude Code
```

### Hook Management

Hooks are lifecycle triggers for automated checks and enforcement.

```bash
claudeops hook list                       # List installed hooks
claudeops hook debug                      # Debug hook execution
claudeops hook test <name>                # Test a specific hook
```

### Intent Classification

Test the semantic classifier to see how claudeops analyzes your requests.

```bash
claudeops classify "add email validation"
```

Output shows:
- Intent type (implementation, debugging, research, etc.)
- Complexity level
- Domain detection
- Recommended agents
- Suggested model tier and parallelism

### Cost Tracking

Monitor your API spending.

```bash
claudeops cost today                      # View today's costs
claudeops cost week                       # View this week's costs
claudeops cost budget --set 20            # Set daily budget to $20
claudeops cost export --format json       # Export spending history
```

### Configuration

Manage global and project-specific settings.

```bash
claudeops config init                     # Initialize config
claudeops config show                     # Display current config
claudeops config edit                     # Edit with $EDITOR
claudeops config validate                 # Validate syntax
```

### Synchronization & Diagnostics

```bash
claudeops sync                            # Sync to Claude Code
claudeops sync --dry-run                  # Preview changes
claudeops doctor                          # Run diagnostics
claudeops doctor --fix                    # Auto-fix issues
claudeops upgrade                         # Check and install updates
```

## Hooks

claudeops includes 13 battle-tested hooks that run automatically to enforce best practices and catch issues early.

### Built-in Hooks

| Hook | Trigger | Purpose |
|------|---------|---------|
| `classify-intent` | Before prompt submission | Semantic intent classification and agent routing |
| `keyword-detector` | Before prompt submission | Deprecated: use classify-intent instead |
| `cost-warning` | Before prompt submission | Alerts when approaching daily budget |
| `checkpoint` | After file save | Creates incremental code checkpoints |
| `thinking-level` | Before model call | Sets extended thinking budget by complexity |
| `lint-changed` | Before commit | Runs linting on changed files |
| `typecheck-changed` | Before commit | Type-checks changed files |
| `continuation-check` | Before prompt | Warns if continuing unfinished task |
| `version-bump-prompt` | Before commit | Suggests version bump per semver |
| `security-scan` | Before commit | Scans for secrets and vulnerabilities |
| `test-reminder` | At intervals | Reminds to run tests |
| `format-on-save` | After file save | Auto-formats code with Prettier |
| `git-branch-check` | Before commit | Warns on commits to main/master |
| `session-log` | Session start | Logs session metadata for analysis |
| `todo-tracker` | Per prompt | Tracks and reminds about open TODOs |
| `large-file-warning` | Before upload | Warns when editing large files |

Manage hooks:

```bash
claudeops hook list                    # List all hooks
claudeops hook debug                   # Debug execution
claudeops hook test checkpoint         # Test specific hook
```

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
enabled = true
dailyBudget = 20.0

[guardrails]
deleteProtection = true
secretScanning = true
dangerousCommands = true

[hooks]
enabled = true
autoClassify = true
```

### Project Configuration

Location: `.claudeops.yaml` in your project root

```yaml
# Active profile
activeProfile: development

# Profiles for different contexts
profiles:
  - name: development
    setup: fullstack
    hooks:
      enabled: true

  - name: production
    setup: enterprise
    guardrails:
      deleteProtection: true
      dangerousCommands: true

# Customizations
guardrails:
  deleteProtection: true
  secretScanning: true
  dangerousCommands: true

hooks:
  enabled: true
  customHooks:
    - path: ./scripts/my-custom-hook.js
```

### Environment Variables

```bash
# Set default model
export CLAUDEOPS_MODEL=opus

# Set daily budget
export CLAUDEOPS_DAILY_BUDGET=20.0

# Disable guardrails
export CLAUDEOPS_GUARDRAILS_ENABLED=false

# Set custom config location
export CLAUDEOPS_CONFIG_PATH=~/.claudeops/config.toml
```

## Troubleshooting

### Command Not Found

If `claudeops` command isn't found after installation:

```bash
# Check installation
npm list -g claudeops

# Add npm bin to PATH
export PATH="$(npm config get prefix)/bin:$PATH"

# Add to ~/.zshrc or ~/.bash_profile for persistence
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc
```

### Configuration Issues

```bash
# Diagnose all issues
claudeops doctor

# Auto-fix common issues
claudeops doctor --fix

# Preview sync without applying
claudeops sync --dry-run

# Validate configuration syntax
claudeops config validate
```

### Hooks Not Executing

```bash
# List active hooks
claudeops hook list

# Debug specific hook
claudeops hook debug

# Test hook execution
claudeops hook test lint-changed

# Check hook logs
tail -f ~/.claudeops/logs/hooks.log
```

### Cost Tracking Issues

```bash
# View all costs
claudeops cost export --format json

# Reset daily counter
rm ~/.claudeops/state/daily-costs.json

# Set new budget
claudeops cost budget --set 30.0
```

## Examples

### Example 1: Build a Feature with Verification

```bash
# Describe what you need in Claude Code
You: "Add two-factor authentication to user signup"

# claudeops automatically:
claudeops: [Analyzes: implementation + security + complex]
claudeops: [Classifies intent, routes to planner]
claudeops: [Planner interviews you on approach]
claudeops: [Routes to executor + security agent]
claudeops: [Runs tests and verifies completion]
```

### Example 2: Debug a Race Condition

```bash
You: "There's a race condition when users log in simultaneously"

# claudeops automatically:
claudeops: [Analyzes: debugging + backend + complex]
claudeops: [Routes to architect agent]
claudeops: [Gathers context with parallel explore agents]
claudeops: [Provides root cause analysis with file:line references]
```

### Example 3: Install Custom Capabilities

```bash
# Add React development helpers from a pack
claudeops pack add https://github.com/vercel-labs/react-pack

# Enable specific skills
claudeops skill enable react-best-practices
claudeops skill enable tailwind-expert

# Sync to Claude Code
claudeops sync
```

## Advanced Usage

### Custom Setup

Create a custom setup for your organization:

```bash
# Start from fullstack template
claudeops setup use fullstack

# Customize the CLAUDE.md
$EDITOR setups/my-company/CLAUDE.md

# Use your setup
claudeops setup use my-company
```

### Model Routing Strategy

Configure which model to use for different complexity levels:

```toml
# In ~/.claudeops/config.toml
[model.routing]
trivial = "haiku"      # Quick lookups
simple = "haiku"       # Simple changes
moderate = "sonnet"    # Standard features
complex = "opus"       # Deep analysis
architectural = "opus" # System design
```

### Guardrail Customization

```yaml
# In .claudeops.yaml
guardrails:
  deleteProtection: true
  secretScanning: true
  dangerousCommands: true
  customRules:
    - pattern: "DELETE FROM.*WHERE"
      action: block
      message: "Raw SQL deletes require approval"
    - pattern: "rm -rf"
      action: block
      message: "Use 'trash' for recoverable deletion"
```

## Resources

- **Repository:** https://github.com/goamaan/claudeops
- **Issues:** https://github.com/goamaan/claudeops/issues
- **Discussions:** https://github.com/goamaan/claudeops/discussions

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and test: `npm run verify`
4. Commit with conventional messages: `git commit -m "feat: add feature"`
5. Submit a Pull Request

When contributing:
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed
- Ensure `npm run verify` passes (typecheck, lint, test)

## License

MIT License - see [LICENSE](LICENSE) for details
