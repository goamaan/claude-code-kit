# Claudeops: Configuration & Setup Manager for Claude Code

## Executive Summary

**claudeops** is a **self-contained configuration and setup management toolkit** for Claude Code. It provides:

1. **Setups**: Pre-configured bundles for different workflows (fullstack, frontend, backend, etc.)
2. **Add-ons Marketplace**: Easy installation of community tools (like claude-rm-rf)
3. **Profile Switching**: Seamlessly switch between configurations
4. **Team Sharing**: Org-level standards with inheritance
5. **Orchestration**: Built-in multi-agent delegation using Claude Code's native Task tool

**Philosophy**: claudeops is batteries-included. It leverages Claude Code's native features (Tasks, background execution, `/plan` mode) while providing enhanced workflows, domain-specific setups, and safety tools.

```
┌─────────────────────────────────────────────────────────┐
│                     claudeops                           │
│   (Setups + Add-ons + Profiles + Orchestration)        │
├─────────────────────────────────────────────────────────┤
│                    Claude Code                          │
│ (Native: Task tool, TaskCreate/Update, /plan, Ctrl+B)  │
└─────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Setups (Pre-Configured Bundles)

A **Setup** is a complete configuration bundle including:
- CLAUDE.md instructions
- Skills (built-in orchestration skills)
- Commands (slash commands)
- Hooks (PreToolUse, PostToolUse, etc.)
- MCP servers
- Add-ons (safety tools, utilities)

**Built-in Setups:**

| Setup | Description | Includes |
|-------|-------------|----------|
| `minimal` | Clean slate, just essentials | Basic CLAUDE.md, rm-rf protection |
| `fullstack` | Full-stack web development | React + Node patterns, TDD, git-master, security |
| `frontend` | Frontend-focused | React/Vue/Svelte skills, designer agent priority, UI patterns |
| `backend` | Backend-focused | API patterns, database skills, security review |
| `data` | Data science / ML | Python patterns, scientist agents, Jupyter support |
| `devops` | Infrastructure / CI/CD | Docker, K8s, Terraform patterns |
| `enterprise` | Strict compliance | Security scanning, audit logging, approval gates |

**Combining Setups:**

```bash
# Use fullstack as base, add data capabilities
ck setup use fullstack --extend data

# Create custom combination
ck setup create my-stack --from fullstack frontend
```

### 2. Add-ons (Community Tools)

**Add-ons** are standalone tools that enhance Claude Code:

| Add-on | Description | Source |
|--------|-------------|--------|
| `rm-rf-guard` | Prevents destructive deletions | [claude-rm-rf](https://github.com/zcaceres/claude-rm-rf) |
| `safety-net` | Blocks dangerous git operations | [claude-code-safety-net](https://github.com/kenryu42/claude-code-safety-net) |
| `claude-ignore` | .claudeignore file support | [claude-ignore](https://github.com/li-zhixin/claude-ignore) |
| `observability` | Real-time monitoring dashboard | [observability hooks](https://github.com/disler/claude-code-hooks-multi-agent-observability) |
| `codacy-guard` | Security scanning via MCP | Codacy integration |

**Installing Add-ons:**

```bash
# Install from registry
ck addon install rm-rf-guard

# Install from GitHub
ck addon install github:zcaceres/claude-rm-rf

# Install from local path
ck addon install ./my-custom-addon

# List installed
ck addon list

# Remove
ck addon remove rm-rf-guard
```

### 3. Profiles (Configuration Variants)

**Profiles** let you switch between different configurations:

```bash
# List profiles
ck profile list
# > default (active)
# > work
# > personal

# Switch profile
ck profile use work

# Create from current
ck profile create startup --from default
```

---

## Technology Stack

```
Runtime:       Bun 1.1+ (3-4x faster than Node.js, native TypeScript)
CLI Framework: Citty (TypeScript-first, zero-config subcommands)
UI/Prompts:    @clack/prompts (modern, beautiful, accessible)
Colors:        picocolors (smallest, fastest)
Progress:      listr2 (concurrent tasks, spinners)
Config:        cosmiconfig + @ltd/j-toml (TOML parsing)
Validation:    Zod (runtime type safety)
Build:         tsdown (Rolldown-powered, successor to tsup)
Test:          Vitest (Vite-native, watch mode)
Distribution:  npm + Homebrew tap + bun compile
```

### Why tsdown over tsup?

tsup is no longer actively maintained. tsdown is its official successor:

| Feature | tsdown | tsup |
|---------|--------|------|
| Bundler | Rolldown (Rust) | esbuild |
| Type gen | Oxc (much faster) | tsc |
| Maintenance | Active (Void Zero) | Abandoned |
| ESM support | First-class | Bolted-on |

**Migration**: `npx tsdown migrate` auto-converts tsup configs.

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              claudeops CLI                                   │
│                          (citty + @clack/prompts)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│   │   Setup     │   │   Addon     │   │  Profile    │   │    Sync     │    │
│   │  Manager    │   │  Registry   │   │  Manager    │   │   Engine    │    │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘    │
│          │                 │                 │                 │            │
│   ┌──────┴─────────────────┴─────────────────┴─────────────────┴──────┐    │
│   │                         Core Services                              │    │
│   ├───────────────────────────────────────────────────────────────────┤    │
│   │  Config Merger  │  Hook Composer  │  MCP Manager  │  Cost Tracker │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                     │                                       │
│   ┌─────────────────────────────────┴─────────────────────────────────┐    │
│   │                        Storage Layer                               │    │
│   │   ~/.claudeops/   │   .claudeops/   │   ~/.claude/ (generated)    │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │                    Built-in Orchestration                          │    │
│   │   12 Agents  │  6 Skills  │  CLAUDE.md Generation  │  Delegation   │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │          Claude Code              │
                    │  (Native: Task, TaskCreate, /plan)│
                    └──────────────────────────────────┘
```

### Directory Structure

```
~/.claude-kit/                        # Global (user-level)
├── config.toml                       # Main configuration
├── active-profile                    # Current profile name
├── profiles/                         # Named profiles
│   ├── default/
│   │   ├── config.toml
│   │   ├── CLAUDE.md                 # Profile-specific instructions
│   │   └── setup.toml                # Setup configuration
│   ├── work/
│   └── personal/
├── setups/                           # Downloaded setups
│   ├── fullstack/
│   │   ├── manifest.toml
│   │   ├── CLAUDE.md
│   │   ├── skills/
│   │   ├── hooks/
│   │   └── commands/
│   └── frontend/
├── addons/                           # Installed add-ons
│   ├── rm-rf-guard/
│   │   ├── addon.toml
│   │   ├── hook.ts
│   │   └── README.md
│   └── safety-net/
├── cache/                            # Cached data
│   ├── registry.json                 # Add-on registry cache
│   └── costs/
│       └── 2026-01.jsonl
└── secrets.toml                      # API keys (gitignored)

.claude-kit/                          # Project-level
├── config.toml                       # Project overrides
├── team.toml                         # Team shared (git-tracked)
├── local.toml                        # Personal (gitignored)
└── setup.toml                        # Project setup config

~/.claude/                            # Generated by claudeops
├── settings.json                     # ← Generated from merged config
├── CLAUDE.md                         # ← Generated from setup + profile
├── skills/                           # ← Symlinked/copied from setup
└── hooks/                            # ← Merged from addons + setup
```

---

## Setups In Detail

### Setup Manifest (manifest.toml)

```toml
# ~/.claude-kit/setups/fullstack/manifest.toml

[setup]
name = "fullstack"
version = "1.0.0"
description = "Full-stack web development with React, Node.js, and modern tooling"
author = "claude-kit"
extends = []                          # Can extend other setups

[requires]
addons = ["rm-rf-guard"]              # Required add-ons

[skills]
enabled = [
    "autopilot",
    "planner",
    "git-master",
    "frontend-ui-ux"
]

[agents]
# Agent priority and model overrides
architect = { model = "opus", priority = "high" }
designer = { model = "sonnet", priority = "high" }
executor = { model = "sonnet" }
explore = { model = "haiku" }

[mcp]
# Recommended MCP servers for this setup
recommended = ["github", "context7", "supabase"]
max_enabled = 10

[hooks]
# Hooks included in this setup
templates = ["git-safety", "build-check", "tdd-enforce"]

[commands]
# Custom commands for this setup
enabled = ["plan", "tdd", "review", "deploy"]
```

### Setup CLAUDE.md

Each setup includes a CLAUDE.md with domain-specific instructions:

```markdown
# Fullstack Development Setup

You are configured for full-stack web development.

## Tech Stack Preferences
- Frontend: React 18+, Next.js 14+, TypeScript
- Backend: Node.js, Express/Fastify, Prisma
- Database: PostgreSQL, Redis
- Testing: Vitest, Playwright

## Workflow
1. Plan with `planner` before implementing
2. Write tests first (TDD)
3. Implement with `executor`
4. Review with `code-reviewer`
5. Verify with `qa-browser`

## Code Standards
- TypeScript strict mode
- ESLint + Prettier
- 80% test coverage minimum
- Conventional commits

[... more domain-specific instructions ...]
```

### Combining Setups

```bash
# Fullstack + Data science capabilities
ck setup use fullstack --extend data

# Results in merged config:
# - All fullstack skills + data skills
# - All fullstack hooks + data hooks
# - Combined CLAUDE.md instructions
# - Union of MCP servers
```

---

## Add-ons System

### Add-on Manifest (addon.toml)

```toml
# ~/.claude-kit/addons/rm-rf-guard/addon.toml

[addon]
name = "rm-rf-guard"
version = "1.2.0"
description = "Prevents destructive file deletion commands"
author = "zcaceres"
repository = "https://github.com/zcaceres/claude-rm-rf"
license = "MIT"

[hooks]
# Hooks this addon provides
PreToolUse = [
    { matcher = "Bash", handler = "./hook.ts" }
]

[install]
# Installation requirements
runtime = "bun"                       # or "node"
postinstall = "./install.sh"          # Optional setup script

[config]
# Configurable options
[config.whitelist]
type = "array"
default = ["/tmp", "node_modules"]
description = "Directories where deletion is allowed"
```

### Add-on Registry

claude-kit maintains a registry of verified add-ons:

```bash
# Search registry
ck addon search security
# > rm-rf-guard - Prevents destructive deletions
# > safety-net - Blocks dangerous git operations
# > codacy-guard - Security scanning

# Show details
ck addon info rm-rf-guard
# Name: rm-rf-guard
# Version: 1.2.0
# Author: zcaceres
# Description: Prevents destructive file deletion commands
# Repository: https://github.com/zcaceres/claude-rm-rf
# Downloads: 12,450
# Rating: 4.8/5
```

### Creating Custom Add-ons

```bash
# Scaffold new add-on
ck addon create my-guard

# Creates:
# ~/.claude-kit/addons/my-guard/
# ├── addon.toml
# ├── hook.ts
# ├── README.md
# └── test/
#     └── hook.test.ts
```

**Example hook.ts:**

```typescript
import type { PreToolUseHook } from 'claude-kit';

export default async function handler(input: PreToolUseHook): Promise<void> {
  const { tool_name, tool_input } = input;

  if (tool_name === 'Bash') {
    const command = tool_input.command;

    // Check for dangerous patterns
    if (isDangerous(command)) {
      console.error(`Blocked: ${command}`);
      process.exit(2); // Exit code 2 = blocked
    }
  }

  process.exit(0); // Exit code 0 = allowed
}
```

---

## CLI Commands

### Command Reference

```bash
claude-kit                           # Alias: ck

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SETUPS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ck setup list                        # List available setups
ck setup info <name>                 # Show setup details
ck setup use <name>                  # Apply a setup
ck setup use <name> --extend <other> # Apply with extensions
ck setup create <name>               # Create custom setup
ck setup create <name> --from <a> <b> # Combine setups
ck setup export <name>               # Export for sharing
ck setup import <url|file>           # Import setup

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ADD-ONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ck addon list                        # List installed add-ons
ck addon search <query>              # Search registry
ck addon info <name>                 # Show add-on details
ck addon install <name>              # Install from registry
ck addon install github:<repo>       # Install from GitHub
ck addon install <path>              # Install from local path
ck addon update <name>               # Update add-on
ck addon update --all                # Update all
ck addon remove <name>               # Uninstall add-on
ck addon create <name>               # Scaffold new add-on
ck addon publish <name>              # Publish to registry

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PROFILES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ck profile list                      # List all profiles
ck profile use <name>                # Switch active profile
ck profile create <name>             # Create new profile
ck profile create <name> --from <base>  # Create from existing
ck profile delete <name>             # Delete profile
ck profile export <name>             # Export for sharing
ck profile import <url|file>         # Import profile

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CONFIGURATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ck config init                       # Interactive setup wizard
ck config edit                       # Open config in $EDITOR
ck config show                       # Display merged config
ck config validate                   # Validate all configs
ck config export --format json       # Export merged config

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SKILLS (built-in orchestration)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ck skill list                        # List skills with state
ck skill enable <name>               # Enable a skill
ck skill disable <name>              # Disable a skill
ck skill info <name>                 # Show skill details

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AGENTS (built-in orchestration)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ck agent list                        # List available agents
ck agent info <name>                 # Show agent details
ck agent suggest "<task>"            # Recommend agent for task

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MCP SERVERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ck mcp list                          # List MCP servers
ck mcp enable <name>                 # Enable MCP server
ck mcp disable <name>                # Disable MCP server
ck mcp install <package>             # Install new MCP
ck mcp budget                        # Show context budget

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COST TRACKING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ck cost                              # Today's summary
ck cost today                        # Detailed today's usage
ck cost week                         # Weekly breakdown
ck cost budget set <amount>          # Set daily budget
ck cost export --format csv          # Export cost data

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HOOKS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ck hook list                         # List active hooks
ck hook debug <event>                # Debug hook execution
ck hook template list                # List hook templates
ck hook template apply <name>        # Apply template

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SYNC & DIAGNOSTICS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ck sync                              # Sync config to ~/.claude
ck doctor                            # Full diagnostic check
ck doctor --fix                      # Auto-fix issues

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# INSTALLATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ck install                           # Full installation
ck upgrade                           # Upgrade claude-kit
ck uninstall                         # Clean uninstall
```

---

## Sample Workflows

### New Developer Onboarding

```bash
# 1. Install claude-kit
npm install -g claude-kit

# 2. Run setup wizard
ck install

# 3. Choose a setup
? What type of development do you primarily do?
  > Full-stack web development
    Frontend only
    Backend only
    Data science / ML
    DevOps / Infrastructure
    Custom

# 4. Select add-ons
? Which safety add-ons would you like? (recommended: all)
  [x] rm-rf-guard - Prevents destructive deletions
  [x] safety-net - Blocks dangerous git operations
  [x] claude-ignore - .claudeignore support

# 5. Done!
✓ Setup 'fullstack' applied
✓ 3 add-ons installed
✓ 12 agents + 6 skills configured
✓ Synced to ~/.claude

Run 'claude' to start coding!
```

### Switching Contexts

```bash
# At work: strict enterprise setup
ck profile use work
# > Switched to 'work' profile
# > Setup: enterprise
# > Add-ons: rm-rf-guard, safety-net, audit-logger, codacy-guard

# Personal project: minimal setup
ck profile use personal
# > Switched to 'personal' profile
# > Setup: fullstack
# > Add-ons: rm-rf-guard

# New experimental project
ck profile create experiment --from minimal
ck setup use data --extend fullstack
# > Created profile 'experiment'
# > Applied setup: data + fullstack
```

### Team Sharing

```bash
# 1. Team lead creates team config
ck setup create acme-stack --from fullstack
ck addon install codacy-guard
ck config set standards.test_coverage 80
ck profile export acme-team > acme-team.toml

# 2. Host config (GitHub, internal server, etc.)
# https://config.acme.com/claude-kit/team.toml

# 3. Team members import
ck profile import https://config.acme.com/claude-kit/team.toml
# > Imported profile 'acme-team'
# > Setup: acme-stack
# > Add-ons: rm-rf-guard, safety-net, codacy-guard
# > Standards: 80% test coverage required
```

---

## Configuration

### Main Config (config.toml)

```toml
# ~/.claude-kit/config.toml

[profile]
active = "default"

[model]
default = "sonnet"
routing = true

[cost]
tracking = true
budget_daily = 50.00
budget_weekly = 200.00

[sync]
auto = true                           # Auto-sync on profile change
watch = false                         # Watch for changes
```

### Profile Config

```toml
# ~/.claude-kit/profiles/work/config.toml

[profile]
name = "work"
description = "Work configuration with enterprise compliance"

[setup]
name = "enterprise"
extends = ["fullstack"]

[addons]
enabled = ["rm-rf-guard", "safety-net", "audit-logger", "codacy-guard"]

[model]
default = "sonnet"
[model.overrides]
security-reviewer = "opus"
architect = "opus"

[cost]
budget_daily = 100.00

[team]
extends = "https://config.acme.com/claude-kit/base.toml"
```

### Project Config

```toml
# .claude-kit/config.toml

[project]
name = "my-app"

[setup]
extends = ["fullstack", "data"]       # Combine setups

[mcp.servers.supabase]
enabled = true
env = { PROJECT_REF = "abc123" }

[addons]
# Project-specific addons
extra = ["playwright-helper"]
```

---

## Safety Tools (Built-in Add-ons)

claude-kit ships with essential safety add-ons enabled by default:

### rm-rf-guard
Prevents destructive file deletion commands:
- Blocks `rm -rf`, `shred`, `unlink`, `find -delete`
- Detects bypass attempts (`sudo rm`, `\rm`, subshells)
- Suggests `trash` CLI as alternative
- Whitelist support for safe directories

### safety-net
Blocks dangerous git operations:
- `git reset --hard`
- `git push --force` (without lease)
- `git clean -f`
- `git stash clear`

### claude-ignore
Respects `.claudeignore` files:
- Prevents Claude from reading sensitive files
- Works like `.gitignore` syntax
- Hierarchical (checks parent directories)

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Self-Contained** | No external dependencies - claudeops provides everything |
| **Setups** | Pre-configured bundles (fullstack, frontend, backend, etc.) |
| **Add-ons** | Registry + CLI for community tools (rm-rf-guard, etc.) |
| **Profiles** | Named, switchable configurations for different contexts |
| **Team Sharing** | URL-based inheritance for org-wide standards |
| **Safety Tools** | Built-in add-ons for safe operation |
| **Smart Agents** | 12 specialized agents for delegation |
| **Native Features** | Leverages Claude Code's Tasks, /plan, background execution |

---

## Testing Strategy

### Core Principles

1. **Test-Driven Development (TDD)**: Write tests BEFORE implementation
2. **Isolated Deliverables**: Each module is independently testable
3. **Gate Enforcement**: No merge without passing tests + coverage threshold
4. **Continuous Verification**: Tests run on every change

### Testing Stack

```
Unit Tests:        Vitest (fast, native ESM, watch mode)
Integration Tests: Vitest + temp directories
E2E Tests:         Vitest + actual CLI execution
Snapshot Tests:    Vitest snapshots for config/output
Mocking:           Vitest mocks + msw for HTTP
Coverage:          @vitest/coverage-v8 (80% minimum)
CI:                GitHub Actions (matrix: macOS, Linux, Windows)
```

### Test Types by Module

| Module | Unit | Integration | E2E | Coverage Target |
|--------|------|-------------|-----|-----------------|
| Config Parser | ✓ | ✓ | - | 95% |
| Config Merger | ✓ | ✓ | - | 95% |
| Profile Manager | ✓ | ✓ | ✓ | 90% |
| Setup Manager | ✓ | ✓ | ✓ | 90% |
| Add-on Manager | ✓ | ✓ | ✓ | 85% |
| Sync Engine | ✓ | ✓ | ✓ | 90% |
| CLI Commands | - | ✓ | ✓ | 80% |
| Hook Composer | ✓ | ✓ | - | 90% |
| MCP Manager | ✓ | ✓ | - | 85% |
| Cost Tracker | ✓ | ✓ | - | 90% |

### Test Directory Structure

```
src/
├── config/
│   ├── parser.ts
│   ├── parser.test.ts          # Unit tests co-located
│   ├── merger.ts
│   └── merger.test.ts
├── profile/
│   ├── manager.ts
│   └── manager.test.ts
└── ...

tests/
├── integration/
│   ├── config.integration.test.ts
│   ├── profile.integration.test.ts
│   ├── setup.integration.test.ts
│   └── addon.integration.test.ts
├── e2e/
│   ├── cli.e2e.test.ts
│   ├── install.e2e.test.ts
│   └── workflow.e2e.test.ts
├── fixtures/
│   ├── configs/
│   │   ├── valid-minimal.toml
│   │   ├── valid-full.toml
│   │   ├── invalid-schema.toml
│   │   └── invalid-syntax.toml
│   ├── setups/
│   │   └── test-setup/
│   └── addons/
│       └── test-addon/
└── helpers/
    ├── temp-dir.ts             # Isolated temp directories
    ├── mock-fs.ts              # Filesystem mocking
    └── cli-runner.ts           # CLI execution helper
```

### Testing Patterns

#### Unit Test Example

```typescript
// src/config/parser.test.ts
import { describe, it, expect } from 'vitest'
import { parseConfig, ConfigError } from './parser'

describe('parseConfig', () => {
  describe('valid configs', () => {
    it('parses minimal config', () => {
      const toml = `
        [profile]
        name = "default"
      `
      const result = parseConfig(toml)
      expect(result.profile.name).toBe('default')
    })

    it('parses full config with all fields', () => {
      const toml = readFixture('configs/valid-full.toml')
      const result = parseConfig(toml)
      expect(result).toMatchSnapshot()
    })
  })

  describe('invalid configs', () => {
    it('throws on invalid TOML syntax', () => {
      const toml = 'invalid = ['
      expect(() => parseConfig(toml)).toThrow(ConfigError)
    })

    it('throws on schema violation', () => {
      const toml = '[profile]\nname = 123'  // should be string
      expect(() => parseConfig(toml)).toThrow(ConfigError)
    })
  })
})
```

#### Integration Test Example

```typescript
// tests/integration/profile.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTempDir, cleanupTempDir } from '../helpers/temp-dir'
import { ProfileManager } from '../../src/profile/manager'

describe('ProfileManager (integration)', () => {
  let tempDir: string
  let manager: ProfileManager

  beforeEach(async () => {
    tempDir = await createTempDir()
    manager = new ProfileManager({ root: tempDir })
  })

  afterEach(async () => {
    await cleanupTempDir(tempDir)
  })

  it('creates and switches profiles', async () => {
    // Create profile
    await manager.create('work', { setup: 'enterprise' })
    expect(await manager.list()).toContain('work')

    // Switch to it
    await manager.use('work')
    expect(await manager.active()).toBe('work')

    // Verify files exist
    expect(await fileExists(`${tempDir}/profiles/work/config.toml`)).toBe(true)
  })

  it('extends from base profile', async () => {
    await manager.create('base', { model: { default: 'opus' } })
    await manager.create('derived', { extends: 'base' })

    const config = await manager.getConfig('derived')
    expect(config.model.default).toBe('opus')  // Inherited
  })
})
```

#### E2E Test Example

```typescript
// tests/e2e/cli.e2e.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { runCLI, setupTestEnv, cleanupTestEnv } from '../helpers/cli-runner'

describe('CLI E2E', () => {
  let env: TestEnv

  beforeAll(async () => {
    env = await setupTestEnv()
  })

  afterAll(async () => {
    await cleanupTestEnv(env)
  })

  describe('ck profile', () => {
    it('lists profiles', async () => {
      const result = await runCLI(['profile', 'list'], env)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('default')
    })

    it('creates new profile', async () => {
      const result = await runCLI(['profile', 'create', 'test-profile'], env)
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Created profile')

      // Verify it exists
      const list = await runCLI(['profile', 'list'], env)
      expect(list.stdout).toContain('test-profile')
    })

    it('switches profile and syncs', async () => {
      await runCLI(['profile', 'create', 'work'], env)
      const result = await runCLI(['profile', 'use', 'work'], env)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Switched to')

      // Verify sync happened
      expect(await fileExists(`${env.claudeDir}/settings.json`)).toBe(true)
    })
  })

  describe('ck setup', () => {
    it('applies setup and verifies output', async () => {
      const result = await runCLI(['setup', 'use', 'fullstack'], env)
      expect(result.exitCode).toBe(0)

      // Verify CLAUDE.md generated
      const claudeMd = await readFile(`${env.claudeDir}/CLAUDE.md`)
      expect(claudeMd).toContain('Fullstack')
    })
  })

  describe('ck addon', () => {
    it('installs addon from registry', async () => {
      const result = await runCLI(['addon', 'install', 'rm-rf-guard'], env)
      expect(result.exitCode).toBe(0)

      // Verify hook registered
      const settings = await readJSON(`${env.claudeDir}/settings.json`)
      expect(settings.hooks).toBeDefined()
    })
  })
})
```

### Verification Gates

Every deliverable must pass these gates before completion:

```
┌─────────────────────────────────────────────────────────────┐
│                    VERIFICATION GATES                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. UNIT TESTS                                               │
│     ├─ All tests pass: bun test src/                         │
│     └─ Coverage >= threshold: bun test --coverage            │
│                                                              │
│  2. INTEGRATION TESTS                                        │
│     ├─ All tests pass: bun test tests/integration/           │
│     └─ No file system leaks (temp dirs cleaned)              │
│                                                              │
│  3. E2E TESTS (if applicable)                                │
│     ├─ CLI commands work: bun test tests/e2e/                │
│     └─ Cross-platform verified (CI matrix)                   │
│                                                              │
│  4. TYPE CHECK                                               │
│     └─ Zero errors: bun run typecheck                        │
│                                                              │
│  5. LINT                                                     │
│     └─ Zero errors: bun run lint                             │
│                                                              │
│  6. BUILD                                                    │
│     └─ Successful: bun run build                             │
│                                                              │
│  7. MANUAL VERIFICATION                                      │
│     └─ Feature works as documented                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install

      - name: Type Check
        run: bun run typecheck

      - name: Lint
        run: bun run lint

      - name: Unit Tests
        run: bun test src/ --coverage

      - name: Integration Tests
        run: bun test tests/integration/

      - name: E2E Tests
        run: bun test tests/e2e/

      - name: Build
        run: bun run build

      - name: Upload Coverage
        uses: codecov/codecov-action@v4
```

---

## Implementation Roadmap (Test-Driven)

Each phase produces **isolated, testable deliverables**. No phase is complete until all tests pass.

### Phase 1: Foundation (Week 1-2)

#### Deliverable 1.1: Project Scaffold
**Output**: Empty project with build/test infrastructure working

```bash
# Acceptance Criteria
bun install        # ✓ Dependencies install
bun run build      # ✓ Builds successfully
bun test           # ✓ Example test passes
bun run typecheck  # ✓ No type errors
bun run lint       # ✓ No lint errors
```

**Tests**:
- [ ] Smoke test: import main module
- [ ] Build output exists in `dist/`
- [ ] CLI entry point executable

---

#### Deliverable 1.2: Config Parser
**Output**: TOML parser with Zod validation

**Interface**:
```typescript
interface ConfigParser {
  parse(toml: string): Config
  validate(config: unknown): Config
  stringify(config: Config): string
}
```

**Tests**:
- [ ] Unit: Parse minimal config
- [ ] Unit: Parse full config with all fields
- [ ] Unit: Reject invalid TOML syntax
- [ ] Unit: Reject schema violations (wrong types)
- [ ] Unit: Reject unknown fields (strict mode)
- [ ] Unit: Handle optional fields with defaults
- [ ] Snapshot: Config schema matches expected structure
- [ ] Coverage: >= 95%

**Verification**:
```bash
bun test src/config/parser.test.ts
bun test src/config/parser.test.ts --coverage  # >= 95%
```

---

#### Deliverable 1.3: Config Merger
**Output**: Merge configs with inheritance

**Interface**:
```typescript
interface ConfigMerger {
  merge(configs: Config[]): Config
  resolveInheritance(config: Config, resolver: ConfigResolver): Config
}
```

**Tests**:
- [ ] Unit: Merge two configs (later overrides earlier)
- [ ] Unit: Deep merge nested objects
- [ ] Unit: Array replacement (not concat)
- [ ] Unit: Resolve single inheritance
- [ ] Unit: Resolve chain inheritance (A extends B extends C)
- [ ] Unit: Detect circular inheritance
- [ ] Unit: Handle missing parent gracefully
- [ ] Integration: Load and merge file-based configs
- [ ] Coverage: >= 95%

**Verification**:
```bash
bun test src/config/merger.test.ts
bun test tests/integration/config.integration.test.ts
```

---

#### Deliverable 1.4: Profile Manager
**Output**: Create, list, switch, delete profiles

**Interface**:
```typescript
interface ProfileManager {
  list(): Promise<string[]>
  active(): Promise<string>
  create(name: string, options?: CreateOptions): Promise<void>
  use(name: string): Promise<void>
  delete(name: string): Promise<void>
  export(name: string): Promise<string>
  import(source: string): Promise<void>
}
```

**Tests**:
- [ ] Unit: List returns profile names
- [ ] Unit: Active returns current profile
- [ ] Unit: Create adds profile directory
- [ ] Unit: Create with --from copies base
- [ ] Unit: Use updates active-profile file
- [ ] Unit: Delete removes profile directory
- [ ] Unit: Delete rejects active profile
- [ ] Unit: Export generates valid TOML
- [ ] Unit: Import from file path
- [ ] Unit: Import from URL (mocked)
- [ ] Integration: Full create → use → delete cycle
- [ ] Integration: Profile persists across instances
- [ ] E2E: `ck profile list` outputs correctly
- [ ] E2E: `ck profile create test` creates files
- [ ] E2E: `ck profile use test` switches
- [ ] Coverage: >= 90%

**Verification**:
```bash
bun test src/profile/
bun test tests/integration/profile.integration.test.ts
bun test tests/e2e/profile.e2e.test.ts
```

---

#### Deliverable 1.5: Sync Engine
**Output**: Sync claude-kit config to ~/.claude/

**Interface**:
```typescript
interface SyncEngine {
  sync(options?: SyncOptions): Promise<SyncResult>
  diff(): Promise<DiffResult>
  validate(): Promise<ValidationResult>
}
```

**Tests**:
- [ ] Unit: Generate settings.json from config
- [ ] Unit: Generate CLAUDE.md from setup
- [ ] Unit: Merge hooks from addons
- [ ] Unit: Diff detects changes
- [ ] Unit: Validate checks ~/.claude structure
- [ ] Integration: Full sync creates expected files
- [ ] Integration: Sync is idempotent
- [ ] Integration: Sync preserves user modifications (marked sections)
- [ ] E2E: `ck sync` creates ~/.claude files
- [ ] E2E: `ck sync` with --dry-run shows changes only
- [ ] Coverage: >= 90%

**Verification**:
```bash
bun test src/sync/
bun test tests/integration/sync.integration.test.ts
bun test tests/e2e/sync.e2e.test.ts
```

---

#### Deliverable 1.6: Doctor Command
**Output**: Diagnose and fix common issues

**Interface**:
```typescript
interface Doctor {
  diagnose(): Promise<DiagnosticResult[]>
  fix(issues: DiagnosticResult[]): Promise<FixResult[]>
}
```

**Tests**:
- [ ] Unit: Detect missing ~/.claude-kit
- [ ] Unit: Detect invalid config syntax
- [ ] Unit: Detect version mismatches
- [ ] Unit: Fix creates missing directories
- [ ] Unit: Fix repairs invalid configs (backup first)
- [ ] Integration: Full diagnostic on fresh system
- [ ] E2E: `ck doctor` outputs diagnostic
- [ ] E2E: `ck doctor --fix` repairs issues
- [ ] Coverage: >= 85%

**Verification**:
```bash
bun test src/doctor/
bun test tests/e2e/doctor.e2e.test.ts
```

---

**Phase 1 Gate**:
```bash
# All must pass before Phase 2
bun test src/                              # All unit tests
bun test tests/integration/                # All integration tests
bun test tests/e2e/                        # All E2E tests
bun test --coverage                        # Coverage >= 80% overall
bun run typecheck                          # Zero type errors
bun run lint                               # Zero lint errors
bun run build                              # Build succeeds
```

---

### Phase 2: Setups (Week 3-4)

#### Deliverable 2.1: Setup Manifest Parser
**Output**: Parse and validate setup manifest.toml

**Tests**:
- [ ] Unit: Parse minimal manifest
- [ ] Unit: Parse full manifest with all sections
- [ ] Unit: Validate required fields
- [ ] Unit: Validate version constraints
- [ ] Unit: Handle extends field
- [ ] Snapshot: Manifest schema
- [ ] Coverage: >= 95%

---

#### Deliverable 2.2: Setup Loader
**Output**: Load setup from directory or archive

**Tests**:
- [ ] Unit: Load from local directory
- [ ] Unit: Load from .tar.gz archive
- [ ] Unit: Load from URL (mocked)
- [ ] Unit: Validate setup structure
- [ ] Unit: Handle missing optional files
- [ ] Integration: Load built-in setups
- [ ] Coverage: >= 90%

---

#### Deliverable 2.3: Setup Merger
**Output**: Combine multiple setups with extends

**Tests**:
- [ ] Unit: Merge two setups
- [ ] Unit: Skills are unioned
- [ ] Unit: Hooks are merged
- [ ] Unit: CLAUDE.md sections combined
- [ ] Unit: Later setup overrides earlier
- [ ] Integration: Extend chain (A extends B extends C)
- [ ] Coverage: >= 90%

---

#### Deliverable 2.4: Built-in Setups
**Output**: minimal, fullstack, frontend, backend, data, devops, enterprise

**Tests**:
- [ ] Unit: Each setup has valid manifest
- [ ] Unit: Each setup has CLAUDE.md
- [ ] Integration: Each setup loads successfully
- [ ] Integration: Each setup syncs without error
- [ ] E2E: `ck setup use fullstack` works
- [ ] E2E: `ck setup use frontend --extend backend` works
- [ ] Snapshot: Each setup's merged config

---

#### Deliverable 2.5: Setup Commands
**Output**: CLI commands for setup management

**Tests**:
- [ ] E2E: `ck setup list` shows all setups
- [ ] E2E: `ck setup info fullstack` shows details
- [ ] E2E: `ck setup use fullstack` applies setup
- [ ] E2E: `ck setup create custom --from fullstack` works
- [ ] E2E: `ck setup export custom` generates file
- [ ] E2E: `ck setup import ./custom.tar.gz` works

---

**Phase 2 Gate**: All Phase 1 + Phase 2 tests pass, coverage >= 85%

---

### Phase 3: Add-ons (Week 5-6)

#### Deliverable 3.1: Add-on Manifest Parser
**Tests**:
- [ ] Unit: Parse addon.toml
- [ ] Unit: Validate hooks section
- [ ] Unit: Validate install requirements
- [ ] Unit: Handle config options
- [ ] Coverage: >= 95%

---

#### Deliverable 3.2: Add-on Installer
**Tests**:
- [ ] Unit: Install from local path
- [ ] Unit: Install from GitHub URL
- [ ] Unit: Run postinstall script
- [ ] Unit: Register hooks in settings
- [ ] Unit: Handle install failure (rollback)
- [ ] Integration: Install rm-rf-guard
- [ ] Coverage: >= 90%

---

#### Deliverable 3.3: Add-on Registry
**Tests**:
- [ ] Unit: Search local registry
- [ ] Unit: Fetch remote registry (mocked)
- [ ] Unit: Cache registry with TTL
- [ ] Unit: Parse registry entries
- [ ] Integration: Search returns expected results
- [ ] Coverage: >= 85%

---

#### Deliverable 3.4: Built-in Add-ons
**Output**: rm-rf-guard, safety-net, claude-ignore

**Tests**:
- [ ] Unit: rm-rf-guard blocks `rm -rf /`
- [ ] Unit: rm-rf-guard allows whitelisted paths
- [ ] Unit: safety-net blocks `git push --force`
- [ ] Unit: safety-net allows `--force-with-lease`
- [ ] Unit: claude-ignore respects patterns
- [ ] Integration: Each addon installs correctly
- [ ] Integration: Hooks fire on matching commands
- [ ] E2E: Addon actually blocks dangerous command

---

#### Deliverable 3.5: Add-on Commands
**Tests**:
- [ ] E2E: `ck addon list` shows installed
- [ ] E2E: `ck addon search security` finds addons
- [ ] E2E: `ck addon install rm-rf-guard` works
- [ ] E2E: `ck addon remove rm-rf-guard` works
- [ ] E2E: `ck addon create my-addon` scaffolds

---

**Phase 3 Gate**: All Phase 1-3 tests pass, coverage >= 85%

---

### Phase 4: Integration (Week 7-8)

#### Deliverable 4.1: MCP Manager
**Tests**:
- [ ] Unit: Parse MCP server configs
- [ ] Unit: Enable/disable servers
- [ ] Unit: Calculate context budget
- [ ] Unit: Validate max enabled limit
- [ ] Integration: Sync MCP to settings.json
- [ ] E2E: `ck mcp list`, `enable`, `disable`
- [ ] Coverage: >= 85%

---

#### Deliverable 4.2: Cost Tracker
**Tests**:
- [ ] Unit: Parse API response for tokens
- [ ] Unit: Calculate cost from tokens
- [ ] Unit: Aggregate by day/week/month
- [ ] Unit: Check budget thresholds
- [ ] Unit: Generate alerts
- [ ] Integration: Store costs in JSONL
- [ ] Integration: Query cost history
- [ ] E2E: `ck cost`, `ck cost today`, `ck cost week`
- [ ] Coverage: >= 90%

---

#### Deliverable 4.3: Hook Composer
**Tests**:
- [ ] Unit: Merge hooks from multiple sources
- [ ] Unit: Order hooks by priority
- [ ] Unit: Validate hook format
- [ ] Unit: Generate settings.json hooks section
- [ ] Integration: Compose addon + setup hooks
- [ ] Coverage: >= 90%

---

#### Deliverable 4.4: Team Config Sharing
**Tests**:
- [ ] Unit: Fetch config from URL
- [ ] Unit: Validate remote config
- [ ] Unit: Merge team config with local
- [ ] Unit: Enforce team requirements
- [ ] Integration: Full team config flow
- [ ] E2E: Profile with team extends works
- [ ] Coverage: >= 85%

---

**Phase 4 Gate**: All Phase 1-4 tests pass, coverage >= 85%

---

### Phase 5: Polish (Week 9-10)

#### Deliverable 5.1: Interactive Wizard
**Tests**:
- [ ] Unit: Wizard state machine
- [ ] Unit: Question rendering
- [ ] Unit: Answer validation
- [ ] Integration: Full wizard flow (mocked input)
- [ ] E2E: `ck install` interactive mode

---

#### Deliverable 5.2: Documentation
**Tests**:
- [ ] All code examples compile
- [ ] All CLI examples run successfully
- [ ] README badges show passing

---

#### Deliverable 5.3: Distribution
**Tests**:
- [ ] npm pack creates valid package
- [ ] Homebrew formula installs
- [ ] Binary works on macOS/Linux/Windows
- [ ] Version command shows correct version

---

**Phase 5 Gate**: All tests pass, coverage >= 80%, binary tested on all platforms

---

## Test Execution Commands

```bash
# Run all tests
bun test

# Run specific test file
bun test src/config/parser.test.ts

# Run tests matching pattern
bun test --grep "profile"

# Run with coverage
bun test --coverage

# Run in watch mode (development)
bun test --watch

# Run only unit tests
bun test src/

# Run only integration tests
bun test tests/integration/

# Run only E2E tests
bun test tests/e2e/

# Run type check
bun run typecheck

# Run lint
bun run lint

# Full verification (CI)
bun run verify  # runs: typecheck + lint + test + build
```

---

## Coverage Requirements

| Scope | Minimum | Target |
|-------|---------|--------|
| Overall | 80% | 90% |
| Core modules (config, profile, sync) | 90% | 95% |
| CLI commands | 75% | 85% |
| Utilities | 80% | 90% |

**Enforcement**:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
})

---

## Installation (Future)

```bash
# Via npm (recommended)
npm install -g claude-kit

# Via Homebrew
brew install claude-kit

# Via binary (no runtime needed)
curl -fsSL https://claude-kit.dev/install.sh | bash
```

---

## Quick Start (Future)

### For Users

```bash
# Full installation with wizard
ck install

# Or quick start with fullstack setup
ck install --setup fullstack

# Or minimal for existing oh-my-claudecode users
ck install --minimal

# Check everything works
ck doctor

# Start using Claude Code
claude
```

### For Developers

```bash
# Clone and install dependencies
git clone https://github.com/yourorg/claude-kit
cd claude-kit
bun install

# Run tests in watch mode
bun test --watch

# Run full verification
bun run verify

# Build
bun run build

# Test the CLI locally
bun run dev profile list
```

---

## Development Workflow

### Working on a Deliverable

```bash
# 1. Create feature branch
git checkout -b feat/config-parser

# 2. Write tests FIRST (TDD)
# Create src/config/parser.test.ts with failing tests

# 3. Run tests in watch mode
bun test src/config/parser.test.ts --watch

# 4. Implement until tests pass
# Edit src/config/parser.ts

# 5. Check coverage
bun test src/config/parser.test.ts --coverage
# Must meet threshold (95% for core modules)

# 6. Run full verification
bun run verify

# 7. Commit with conventional commit
git commit -m "feat(config): add TOML parser with Zod validation"

# 8. Create PR (tests run in CI)
```

### Definition of Done

A deliverable is **DONE** when:

- [ ] All unit tests pass
- [ ] All integration tests pass (if applicable)
- [ ] All E2E tests pass (if applicable)
- [ ] Coverage meets threshold
- [ ] Type check passes
- [ ] Lint passes
- [ ] Build succeeds
- [ ] Documentation updated
- [ ] PR approved
- [ ] CI green on all platforms

---

## References

### Core Dependencies
- [Claude Code](https://claude.ai/code) - Core runtime with native Task tool

### Research Sources
- [everything-claude-code](https://github.com/affaan-m/everything-claude-code) - Production configs
- [agent-browser](https://github.com/vercel-labs/agent-browser) - Browser automation
- [agent-skills](https://github.com/vercel-labs/agent-skills) - Skill specification

### Safety Tools
- [claude-rm-rf](https://github.com/zcaceres/claude-rm-rf) - Destructive command prevention
- [claude-code-safety-net](https://github.com/kenryu42/claude-code-safety-net) - Git safety
- [claude-ignore](https://github.com/li-zhixin/claude-ignore) - File ignore patterns

### Technologies
- [Bun](https://bun.sh/) - JavaScript runtime
- [Citty](https://github.com/unjs/citty) - CLI framework
- [@clack/prompts](https://github.com/natemoo-re/clack) - CLI prompts
- [tsdown](https://tsdown.dev/) - TypeScript bundler
- [Vitest](https://vitest.dev/) - Test framework
- [@vitest/coverage-v8](https://vitest.dev/guide/coverage) - Code coverage

---

## License

MIT

---

## Contributing

Contributions welcome! See CONTRIBUTING.md for guidelines.

### Add-on Submissions

Want to add your tool to the registry? See [ADDON_GUIDELINES.md](./ADDON_GUIDELINES.md).
