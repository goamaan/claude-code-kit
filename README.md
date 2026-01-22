# claude-code-kit

**CLI toolkit for Claude Code configuration management**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js >= 20.0.0](https://img.shields.io/badge/node-%3E%3D%2020.0.0-green.svg)](https://nodejs.org)
[![Version 0.1.0](https://img.shields.io/badge/version-0.1.0-blue.svg)](package.json)

---

## Overview

`claude-code-kit` (`cck`, `ck`) is a command-line toolkit for managing Claude Code configurations, profiles, and integrations. It provides a unified way to:

- **Manage profiles** - Create and switch between different configuration contexts
- **Use setup templates** - Pre-configured environments for common development scenarios
- **Install addons** - Extend functionality with hooks and plugins
- **Configure MCP servers** - Model Context Protocol server management
- **Track costs** - Monitor token usage and spending with budgets
- **Manage hooks** - Control PreToolUse, PostToolUse, Stop, and SubagentStop events
- **Sync configurations** - Automatically propagate settings to Claude Code
- **Route models intelligently** - Direct tasks to appropriate Claude models (Haiku, Sonnet, Opus)

---

## Installation

### Prerequisites

- **Node.js**: >= 20.0.0
- **npm**: Latest stable version

### Install Globally

Install `claude-code-kit` globally to use `cck`, `ck`, or `claude-code-kit` commands anywhere:

```bash
npm install -g claude-code-kit
```

Verify installation:

```bash
cck --version
```

### Install Locally (Development)

Clone and install for local development:

```bash
git clone <repository-url>
cd claude-kit
npm install
npm run build
npm link  # Optional: makes cck available globally
```

---

## Quick Start

### 1. Initialize Configuration

Start an interactive setup wizard:

```bash
cck config init
```

This will prompt you to configure:
- Default model (Haiku, Sonnet, or Opus)
- Cost tracking preferences
- Daily budget limits (optional)

### 2. Create Your First Profile

Create a new profile (optionally based on a setup template):

```bash
cck profile create my-project --setup fullstack --activate
```

This creates a new profile called `my-project` based on the fullstack template and activates it.

### 3. List Available Setups

See all pre-configured templates:

```bash
cck setup list
```

### 4. Sync to Claude Code

Apply your configuration to Claude Code:

```bash
cck sync
```

This updates:
- `~/.claude/settings.json` with hook configuration
- `~/.claude/CLAUDE.md` with profile instructions
- MCP server configuration

### 5. Verify Setup

Run diagnostics to ensure everything is configured correctly:

```bash
cck doctor
```

---

## Core Concepts

### Profiles

Profiles are named configuration contexts. Use them to maintain separate settings for different projects, clients, or work modes.

**Key capabilities:**
- Switch between profiles instantly
- Inherit settings from base profiles
- Override specific configurations
- Export and import profile configurations

**Example:**

```bash
# List all profiles
cck profile list

# Create profile extending another
cck profile create client-a --from my-project

# Switch active profile
cck profile use client-a

# Show detailed profile info
cck profile show client-a
```

### Setup Templates

Pre-built configurations for common development scenarios. Setups define which skills, agents, MCP servers, and hooks are enabled.

**Available setups:**

| Setup | Purpose |
|-------|---------|
| `minimal` | Bare essentials (skills, default model routing) |
| `fullstack` | React + Node.js development |
| `frontend` | Frontend-focused (React, styling, component systems) |
| `backend` | Backend-focused (APIs, databases, testing) |
| `data` | Data science and analysis (Python, ML, statistics) |
| `devops` | Infrastructure and deployment (Docker, Kubernetes, CI/CD) |
| `enterprise` | Full-featured for large teams (all skills, security reviewers) |

**Use a setup:**

```bash
cck setup use fullstack
cck setup info backend
```

### Addon System

Addons extend functionality through hooks and plugins. Install from local paths, GitHub, or a registry.

**Install an addon:**

```bash
# From local directory
cck addon install ./my-addon

# From GitHub
cck addon install github:username/addon-name

# From registry
cck addon install addon-name
```

**Manage addons:**

```bash
cck addon list
cck addon update addon-name
cck addon remove addon-name
```

### MCP Servers

Model Context Protocol servers provide tools and resources to Claude Code. Common servers: `filesystem`, `git`, `fetch`, `github`.

**Manage MCP servers:**

```bash
cck mcp list
cck mcp add filesystem
cck mcp enable github
cck mcp disable fetch
```

### Cost Tracking

Monitor token usage and spending with optional daily/weekly budgets.

**View costs:**

```bash
# Today's usage
cck cost today

# This week
cck cost week

# Check against budget
cck cost budget

# Export for analysis
cck cost export --format csv
```

### Hook System

Hooks intercept and modify Claude Code behavior at key points:

- **PreToolUse** - Before any tool is executed
- **PostToolUse** - After tool execution completes
- **Stop** - When Claude Code session stops
- **SubagentStop** - When a subagent session stops

Hooks are composed from installed addons and executed in priority order.

**Debug hooks:**

```bash
cck hook list
cck hook debug
cck hook test <hook-name>
```

### Configuration Layers

Configurations merge in priority order (highest to lowest):

1. **Default hardcoded** - Built-in defaults
2. **Global** - `~/.claude-code-kit/config.toml`
3. **Profile** - `~/.claude-code-kit/profiles/{name}.toml`
4. **Setup** - Configuration from active setup
5. **Team** - Remote team configuration (URL)
6. **Project** - `.claude-code-kit.yaml` in project root

Later layers override earlier ones. Inspect the merge order:

```bash
cck config show --layers
```

### Model Routing

Route tasks to appropriate Claude models based on complexity:

- **Simple** tasks → Haiku (fast, cost-effective)
- **Standard** tasks → Sonnet (balanced)
- **Complex** tasks → Opus (most capable)

Configure routing per profile:

```bash
cck profile show
# Shows routing configuration under "Model Configuration"
```

---

## Commands Reference

### Profile Management

```bash
# List all profiles
cck profile list [--json]

# Switch active profile
cck profile use <name>

# Create new profile
cck profile create <name> [--from <base>] [--setup <setup>] [--description <text>] [--activate]

# Delete profile
cck profile delete <name> [--force]

# Export profile
cck profile export <name> [--format toml|json] [--output <path>] [--resolved]

# Import profile
cck profile import <source> [--name <name>] [--merge] [--activate]

# Show profile details
cck profile show [name] [--json]
```

### Setup Management

```bash
# List available setups
cck setup list [--json]

# Get setup information
cck setup info <name> [--json]

# Apply setup to current profile
cck setup use <name>

# Create custom setup
cck setup create <name> [--description <text>] [--author <name>]

# Export setup
cck setup export <name> [--output <path>]

# Import setup
cck setup import <source> [--name <name>]
```

### Addon Management

```bash
# List installed addons
cck addon list [--json]

# Search registry
cck addon search <query>

# Install addon
cck addon install <source> [--version <version>] [--config <json>]

# Update addon
cck addon update <name> [--version <version>]

# Remove addon
cck addon remove <name> [--force]

# Create custom addon
cck addon create <name> [--description <text>]
```

### Configuration Management

```bash
# Initialize configuration (interactive)
cck config init [--global] [--force]

# Edit configuration
cck config edit [--global] [--project]

# Show configuration
cck config show [--layers] [--resolved] [--format toml|json]

# Validate configuration
cck config validate [--fix]

# Export configuration
cck config export [--format toml|json] [--output <path>]
```

### MCP Server Management

```bash
# List MCP servers
cck mcp list [--json] [--status]

# Add MCP server
cck mcp add <server> [--config <json>]

# Remove MCP server
cck mcp remove <server>

# Enable MCP server
cck mcp enable <server>

# Disable MCP server
cck mcp disable <server>
```

### Cost Tracking

```bash
# Today's usage
cck cost today [--format table|json]

# This week's usage
cck cost week [--format table|json]

# Check budget status
cck cost budget [--set <usd>] [--period daily|weekly|monthly]

# Export cost data
cck cost export [--format csv|json] [--period <period>] [--output <path>]

# Show pricing information
cck cost pricing [--model <haiku|sonnet|opus>]
```

### Hook Management

```bash
# List all hooks
cck hook list [--json]

# Debug hook execution
cck hook debug [--event <event>] [--verbose]

# Test a specific hook
cck hook test <hook-name> [--event <event>] [--input <json>]
```

### System Commands

```bash
# Sync configuration to Claude Code
cck sync [--dry-run] [--force] [--backup]

# Run diagnostics
cck doctor [--fix] [--verbose]

# Installation wizard
cck install

# Check for updates and upgrade
cck upgrade [--check] [--force]
```

---

## Configuration

### Global Configuration

Global configuration lives in `~/.claude-code-kit/config.toml`:

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

### Project Configuration

Project-level configuration lives in `.claude-code-kit.yaml`:

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

### Profile Configuration

Profile files live in `~/.claude-code-kit/profiles/{name}.toml`:

```toml
[setup]
name = "fullstack"
version = "1.0.0"

[skills]
enabled = ["autopilot", "ralph", "ultrawork", "planner"]
disabled = []

[agents.designer]
model = "sonnet"
priority = 70

[mcp]
enabled = ["filesystem", "git", "fetch"]
disabled = []
```

---

## Setups Overview

### Minimal Setup

Bare essentials for getting started:

```bash
cck setup use minimal
```

Includes:
- Default model routing (Haiku/Sonnet/Opus)
- Basic skills (no specialized abilities)
- No MCP servers

### Fullstack Setup

Full-stack web development (React + Node.js):

```bash
cck setup use fullstack
```

Includes:
- Frontend UI/UX expertise
- Backend development skills
- Git mastery and code review
- TDD and security review
- Agents: designer (Sonnet), executor (Sonnet), architect (Opus), QA tester (Sonnet)
- MCP: filesystem, git, fetch

### Frontend Setup

Frontend-focused development:

```bash
cck setup use frontend
```

Optimized for:
- React and component systems
- Styling and design systems
- Frontend testing and debugging
- Browser compatibility

### Backend Setup

Backend-focused development:

```bash
cck setup use backend
```

Optimized for:
- API design and implementation
- Database schema and queries
- Server performance and security
- Backend testing and debugging

### Data Setup

Data science and analysis:

```bash
cck setup use data
```

Optimized for:
- Data analysis and visualization
- Machine learning workflows
- Statistical analysis
- Data pipeline development

### DevOps Setup

Infrastructure and deployment:

```bash
cck setup use devops
```

Optimized for:
- Docker and containerization
- Kubernetes orchestration
- CI/CD pipelines
- Infrastructure as Code
- Monitoring and logging

### Enterprise Setup

Full-featured for large teams:

```bash
cck setup use enterprise
```

Includes:
- All skills enabled
- Security reviewer (Opus)
- Code reviewer (Opus)
- Team collaboration features
- Advanced cost tracking
- Full MCP ecosystem

---

## Addon Development

Create custom addons to extend claude-code-kit with hooks and plugins.

### Addon Structure

```
my-addon/
├── manifest.toml
├── hooks/
│   ├── pre-tool-use.js
│   └── post-tool-use.js
├── plugins/
└── README.md
```

### Manifest Format (manifest.toml)

```toml
[addon]
name = "my-addon"
version = "1.0.0"
description = "My custom addon"
author = "Your Name"

[hooks]
# Declare which hooks this addon implements
preToolUse = "hooks/pre-tool-use.js"
postToolUse = "hooks/post-tool-use.js"

[config]
# Optional: configuration options for the addon
[[config.options]]
name = "timeout"
type = "number"
default = 5000
description = "Hook timeout in ms"
```

### Hook Implementation

```javascript
// hooks/pre-tool-use.js
export default async function preToolUse(input, context) {
  const { tool, args, profile } = input;

  // Your hook logic here
  console.log(`About to use tool: ${tool}`);

  return {
    allowed: true,
    modified: false,
    tool,
    args,
  };
}
```

### Publish Addon

1. Create addon in local directory
2. Test with `cck addon install ./my-addon`
3. Once working, push to GitHub or registry
4. Share with community!

---

## Examples

### Example 1: Switch Between Client Projects

```bash
# Create profile for Client A
cck profile create client-a --setup fullstack --description "Client A project"
cck profile use client-a

# Create profile for Client B
cck profile create client-b --setup fullstack --description "Client B project"

# Switch between clients
cck profile use client-a
cck sync

cck profile use client-b
cck sync
```

### Example 2: Set Up Cost Tracking

```bash
# Initialize with cost tracking
cck config init

# Set weekly budget
cck cost budget --set 75 --period weekly

# Check current usage
cck cost today

# Export weekly report
cck cost export --period weekly --format csv --output weekly-costs.csv
```

### Example 3: Custom Setup with Specific Agents

Create a custom setup optimized for security work:

```bash
cck setup create security-audit \
  --description "Security audit configuration" \
  --author "My Team"

# Then configure via profile
cck profile create security-work --setup security-audit
```

### Example 4: Install and Configure MCP Servers

```bash
# Add multiple MCP servers
cck mcp add filesystem
cck mcp add github --config '{"token": "ghp_..."}'
cck mcp add fetch

# Disable specific server
cck mcp disable fetch

# List current configuration
cck mcp list --status

# Sync to Claude Code
cck sync
```

### Example 5: Debug Hook Issues

```bash
# List all active hooks
cck hook list

# Debug hook execution in detail
cck hook debug --verbose

# Test a specific hook with sample data
cck hook test my-addon.preToolUse \
  --event preToolUse \
  --input '{"tool":"bash","args":{"command":"ls"}}'
```

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and test thoroughly
4. Run `npm run verify` to check code quality
5. Commit with clear messages: `git commit -m "feat: add my feature"`
6. Push to your fork and create a Pull Request

### Development Setup

```bash
# Install dependencies
npm install

# Start development watcher
npm run dev

# Run tests
npm run test:watch

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## Troubleshooting

### "Command not found: cck"

Ensure installation completed and npm bin is in PATH:

```bash
# Verify installation
npm list -g claude-code-kit

# Add npm bin to PATH if needed
export PATH="$(npm config get prefix)/bin:$PATH"
```

### Configuration not syncing to Claude Code

Check sync status and fix issues:

```bash
cck doctor --fix
cck sync --dry-run  # See what would be synced
cck sync --backup   # Sync with backup
```

### Hook not executing

Debug hook configuration:

```bash
cck hook list
cck hook debug --verbose
cck config show --resolved  # Check merged configuration
```

### Cost tracking shows zero usage

Cost data is populated when Claude Code API calls are made. Verify:

```bash
cck cost pricing        # Check pricing configuration
cck doctor              # Run diagnostics
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Support

For issues, questions, or feature requests:

- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section above

---

## Changelog

### Version 0.1.0 (Initial Release)

- Profile management (create, switch, export, import)
- Setup templates (minimal, fullstack, frontend, backend, data, devops, enterprise)
- Addon installation and management
- MCP server configuration
- Cost tracking with budgets
- Hook system (PreToolUse, PostToolUse, Stop, SubagentStop)
- Configuration sync to Claude Code
- Model routing (Haiku/Sonnet/Opus)
- Diagnostics and doctor command
