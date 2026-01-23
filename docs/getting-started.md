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

### Run the Installation Wizard

Start the interactive setup process:

```bash
claudeops install
```

This wizard will guide you through:

1. **Checking prerequisites** - Verifies Node.js version and Claude directory
2. **Selecting a setup** - Chooses your base configuration (e.g., fullstack, backend, frontend)
3. **Configuring models** - Picks your default Claude model (Haiku, Sonnet, or Opus)
4. **Setting up cost tracking** - Optionally enables spending limits
5. **Creating your first profile** - Names your default configuration

Here's what happens under the hood:

- **Creates `~/.claudeops/`** - Your configuration directory
- **Creates `~/.claudeops/profiles/`** - Stores your profiles
- **Creates `~/.claudeops/config.toml`** - Main configuration file
- **Creates your first profile** - Usually named "default"

### Installation Options

If you prefer a minimal setup without prompts:

```bash
claudeops install --minimal
```

Or use a specific setup directly:

```bash
claudeops install --setup fullstack
```

## Understanding Profiles

Profiles are configurations tailored to different projects or use cases. Each profile stores:

- **Skills** - Custom AI skills and behaviors
- **Agents** - Multi-agent orchestration settings
- **MCP Servers** - Model Context Protocol integrations
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

## Understanding Setups

Setups are pre-built configurations for common scenarios. They include:

- **CLAUDE.md content** - Your Claude Code instructions
- **Skill configurations** - Pre-enabled/disabled skills
- **Agent configurations** - Multi-agent settings
- **Hook templates** - Event handlers and automation

### View Available Setups

See what setups are available:

```bash
claudeops setup list
```

Example output showing built-in setups:

```
Available Setups
┌────────────┬─────────┬──────────────────────────┬──────────┬────────┐
│ Name       │ Version │ Description              │ Author   │ Source │
├────────────┼─────────┼──────────────────────────┼──────────┼────────┤
│ minimal    │ 1.0.0   │ Bare-bones configuration │ Anthropic│ builtin│
│ fullstack  │ 1.0.0   │ Full-stack development   │ Anthropic│ builtin│
│ frontend   │ 1.0.0   │ Frontend-focused         │ Anthropic│ builtin│
│ backend    │ 1.0.0   │ Backend-focused          │ Anthropic│ builtin│
│ data       │ 1.0.0   │ Data science & ML        │ Anthropic│ builtin│
│ devops     │ 1.0.0   │ DevOps & infrastructure  │ Anthropic│ builtin│
│ enterprise │ 1.0.0   │ Enterprise setup         │ Anthropic│ builtin│
└────────────┴─────────┴──────────────────────────┴──────────┴────────┘
```

### Get Setup Details

Learn more about a specific setup:

```bash
claudeops setup info fullstack
```

Shows the setup's skills, agents, hooks, and a preview of its CLAUDE.md content.

### Apply a Setup

Generate a CLAUDE.md file from a setup:

```bash
claudeops setup use fullstack
```

This creates a `CLAUDE.md` file in your current directory. By default, it's created in the current working directory—you can specify a different path:

```bash
claudeops setup use fullstack --output ~/.claude/CLAUDE.md
```

You can also extend from multiple setups:

```bash
claudeops setup use fullstack --extend backend,data
```

## Syncing to Claude Code

After configuring your profiles and setups, sync everything to Claude Code:

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
# Run the interactive setup wizard
claudeops install

# Choose your setup (fullstack, backend, frontend, etc.)
# Configure your model preferences
# Set up cost tracking if desired
```

### 2. Create Project-Specific Profiles

```bash
# Create a profile for your current project
claudeops profile create my-api-server

# View all profiles
claudeops profile list
```

### 3. Configure Profiles

Edit your profile to add skills, agents, and settings:

```bash
# Edit profile configuration
claudeops config edit

# View current settings
claudeops config show
```

### 4. Sync to Claude Code

```bash
# Switch to your desired profile
claudeops profile use my-api-server

# Sync the configuration
claudeops sync

# Verify everything is correct
claudeops doctor
```

### 5. Work with Claude Code

Now Claude Code will use your synced configuration:

- Your CLAUDE.md instructions will be available
- Your skills and agents will be configured
- Your model preferences will be applied
- Cost tracking will be active (if enabled)

### 6. Update Configuration as Needed

Make changes to your profile or setup:

```bash
# Edit configuration
claudeops config edit

# Apply setup changes
claudeops setup use frontend

# Sync again
claudeops sync
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
- Addons are properly installed

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
- **[Setups Guide](./setups.md)** - Explore available setups and create custom ones
- **[Addons Guide](./addons.md)** - Install and manage addons to extend functionality

### Common Tasks

**Add a new MCP server:**
```bash
claudeops mcp add my-server "command to run"
```

**Track API costs:**
```bash
claudeops cost today    # Today's spending
claudeops cost week     # This week's spending
claudeops cost budget   # Your budget status
```

**Create a custom setup:**
```bash
claudeops setup create my-setup --from fullstack
```

**Export your configuration:**
```bash
claudeops profile export default > backup.json
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
claudeops install
```

### Configuration issues

Run the doctor command to diagnose problems:

```bash
claudeops doctor --fix
```

This will attempt to fix common configuration issues automatically.

### Need help?

Check specific command help:

```bash
claudeops <command> --help
```

Examples:

```bash
claudeops profile --help
claudeops setup --help
claudeops sync --help
```

## What's Next?

Now that you're set up, you can:

1. **Customize your profile** - Add skills, agents, and MCP servers
2. **Explore setups** - Try different pre-built configurations
3. **Enable cost tracking** - Monitor your API spending
4. **Create addons** - Build reusable configuration packages
5. **Automate workflows** - Set up hooks for common tasks

Happy coding with claudeops!
