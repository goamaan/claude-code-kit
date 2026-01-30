# Getting Started with claudeops

Welcome to claudeops, a CLI toolkit for managing Claude Code configuration. This guide will help you get up and running in minutes.

## Prerequisites

Before you begin, make sure you have:

- **Node.js 20 or later** - Check your version with `node --version`
- **Claude Code CLI installed** - Download from [Anthropic](https://www.anthropic.com)
- **Basic terminal knowledge** - You should be comfortable opening a terminal and running commands

Don't have Node.js? Download it from [nodejs.org](https://nodejs.org/). We recommend the LTS version.

## Installation

### Step 1: Install claudeops

Install the package globally using npm:

```bash
npm install -g claudeops
```

### Step 2: Verify Installation

Confirm it's installed correctly:

```bash
claudeops --version
```

You should see the version number displayed. Great! You now have three ways to run the toolkit:

- `claudeops` - Full name
- `cops` - Short alias
- `co` - Ultra-short alias

For the rest of this guide, we'll use `claudeops` for clarity, but feel free to use any of them.

## Initial Setup

Initialize claudeops in your project:

```bash
cops init
```

This scans your codebase, detects your tech stack, and configures claudeops automatically. It creates:

- **`~/.claudeops/`** - Your configuration directory
- **`~/.claudeops/profiles/`** - Stores your profiles
- **`~/.claudeops/config.toml`** - Main configuration file (TOML format)
- **Your first profile** - Usually named "default"

## Understanding Profiles

Profiles are configurations tailored to different projects or use cases. Each profile stores:

- **Skills** - Custom AI skills and behaviors
- **Agents** - Multi-agent orchestration settings
- **Model configuration** - Which Claude model to use

### View Your Profiles

See all available profiles:

```bash
claudeops profile list
```

Example output:

```
Profiles
┌──────────────┬─────────────────────┬─────────┬────────┬──────────┐
│ Name         │ Description         │ Extends │ Skills │ Agents   │
├──────────────┼─────────────────────┼─────────┼────────┼──────────┤
│ * default    │ Default profile     │ -       │ 8      │ 4        │
│   backend    │ Backend development │ default │ 12     │ 6        │
└──────────────┴─────────────────────┴─────────┴────────┴──────────┘
```

The `*` marks your currently active profile.

### Create a New Profile

Create a profile for a different project:

```bash
claudeops profile create my-project
```

Answer the prompts to customize it. You can also extend from existing profiles:

```bash
claudeops profile create api-server --description "REST API server"
```

### Switch Between Profiles

Switch to a different profile:

```bash
claudeops profile use backend
```

After switching, your configuration changes to match that profile.

## Syncing to Claude Code

After configuring your profiles, sync everything to Claude Code:

### Run Sync

```bash
claudeops sync
```

This generates:

- **`~/.claude/settings.json`** - Claude Code settings with your hooks and MCP servers
- **`~/.claude/CLAUDE.md`** - Your Claude Code instructions

The sync process:

1. Reads your active profile configuration
2. Merges in enabled addons
3. Generates settings and instructions
4. **Preserves user content** outside managed sections
5. Creates backups of existing files

### Dry Run (Preview Changes)

See what would be synced without making changes:

```bash
claudeops sync --dry-run
```

### Force Sync

Overwrite existing files without confirmation:

```bash
claudeops sync --force
```

## Basic Workflow

Here's a typical workflow for managing your Claude Code configuration:

### 1. Initial Setup (One Time)

```bash
# Auto-detect your project and configure
cops init
```

### 2. Create Project-Specific Profiles

```bash
# Create a profile for your current project
cops profile create my-api-server

# View all profiles
cops profile list
```

### 3. Configure Profiles

Edit your profile TOML file to add skills, agents, and settings. Open it in your preferred editor:

```bash
# Edit profile configuration (replace 'default' with your profile name)
$EDITOR ~/.claudeops/profiles/default.toml
```

### 4. Sync to Claude Code

```bash
# Switch to your desired profile
cops profile use my-api-server

# Sync the configuration
cops sync

# Verify everything is correct
cops doctor
```

### 5. Work with Claude Code

Now Claude Code will use your synced configuration:

- Your CLAUDE.md instructions will be available
- Your skills and agents will be configured
- Your model preferences will be applied

### 6. Update Configuration as Needed

Make changes to your profile:

```bash
# Edit profile TOML file
$EDITOR ~/.claudeops/profiles/default.toml

# Sync again
cops sync
```

## Checking Your Installation

Use the doctor command to verify everything is working:

```bash
claudeops doctor
```

This checks:

- claudeops directory exists
- Claude Code directory exists
- Configuration is valid
- Profiles are configured correctly

Example output:

```
claudeops Doctor Report

Installation
✓ claudeops directory
✓ Claude directory
✓ Configuration file

Configuration
✓ Configuration is valid
✓ Default profile exists
✓ 2 profiles installed

Status
✓ Sync up to date
✓ All checks passed
```

If there are issues, the doctor command will suggest fixes:

```bash
claudeops doctor --fix
```

## Next Steps

### Learn More About Features

- **[Profiles Guide](./profiles.md)** - Deep dive into profile management
- **[Hooks Guide](./hooks.md)** - Workflow automation and safety checks

### Common Tasks

**Reset claudeops artifacts:**
```bash
cops reset           # Remove project-level artifacts
cops reset --global  # Remove global artifacts
```

## Troubleshooting

### "Command not found: claudeops"

Make sure Node.js 20+ is installed and npm is in your PATH:

```bash
node --version
npm --version
```

Then reinstall:

```bash
npm install -g claudeops
```

### "~/.claude directory not found"

Run Claude Code at least once to create its configuration directory. Then run:

```bash
cops init
```

### Configuration issues

Run the doctor command to diagnose problems:

```bash
cops doctor --fix
```

This will attempt to fix common configuration issues automatically.

### Need help?

Check specific command help:

```bash
cops <command> --help
```

Examples:

```bash
cops profile --help
cops sync --help
```

## What's Next?

Now that you're set up, you can:

1. **Customize your profile** - Add skills and agents
2. **Automate workflows** - Set up hooks for common tasks
3. **Reset when needed** - Use `cops reset` to clean up artifacts

Happy coding with claudeops!
