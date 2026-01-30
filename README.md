<div align="center">

# claudeops

**Batteries-Included Claude Code Enhancement**

[![npm version](https://img.shields.io/npm/v/claudeops.svg)](https://www.npmjs.com/package/claudeops)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js >= 20.0.0](https://img.shields.io/badge/node-%3E%3D%2020.0.0-green.svg)](https://nodejs.org)

Transform Claude Code with profiles, lifecycle hooks, and smart configuration sync.

[Quick Start](#quick-start) | [Hooks](#hooks) | [Commands](#cli-commands) | [Configuration](#configuration)

</div>

---

## What is claudeops?

claudeops is a lean enhancement toolkit for Claude Code that simplifies your workflow with profile-based configuration, lifecycle hooks, and automatic synchronization. Organize your projects, define custom instructions, and automate quality checks with a clean TOML-based system.

**Why claudeops?**

- **Profile-driven** -- Switch between TOML-based profiles for different projects and workflows
- **Custom instructions** -- Define per-project CLAUDE.md content and agent configuration
- **Lifecycle hooks** -- Automate quality checks and enforcement at every stage
- **Auto-sync** -- Configuration is automatically synced to `~/.claude/` after builds and profile switches
- **Skills and hooks** -- Extend functionality with built-in and custom capabilities

## Features

- **Profile System** -- TOML-based profiles with inheritance, custom content, and agent configuration
- **18 Lifecycle Hooks** -- Automated checks and enforcement at every stage of the workflow
- **Skills** -- Reusable capabilities that can be enabled and synced
- **Auto-sync** -- Configuration is automatically synced to `~/.claude/` after builds and profile switches
- **Specialized Skills** -- Built-in skills for documentation, testing, security, and more

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

Initialize claudeops and set up project artifacts, profiles, and configuration.

### Verify

```bash
cops doctor
```

### Switch Profiles

```bash
cops profile list
cops profile use fullstack
```

That's it. Start using Claude Code normally and claudeops handles configuration sync and lifecycle hooks.

### Command Aliases

| Alias | Use For |
|-------|---------|
| `claudeops` | Installation, formal contexts |
| `cops` | Day-to-day usage (recommended) |
| `co` | Quick commands |

All examples below use `cops`, but any alias works.

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

Hooks are automatically synced to `~/.claude/settings.json` via `cops sync`.

---

## CLI Commands

All commands work with `claudeops`, `cops`, or `co`.

### Getting Started

```bash
cops init                                 # Initialize claudeops
cops doctor                               # Run diagnostics
cops sync                                 # Sync configuration to ~/.claude/
```

### Profile Management

Profiles are TOML files stored at `~/.claudeops/profiles/`. They support inheritance, custom CLAUDE.md content, agent configuration, and hook/skill toggling.

```bash
cops profile list                         # List all profiles
cops profile use <name>                   # Switch active profile (auto-syncs)
cops profile create <name>                # Create a new profile
cops profile delete <name>                # Delete a profile
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
cops sync --dry-run                       # Preview sync without applying
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
