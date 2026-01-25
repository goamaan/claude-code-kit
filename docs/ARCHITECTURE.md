# claudeops Architecture

This document explains how claudeops manages configuration, profiles, skills, and hooks for Claude Code.

## Directory Structure

### `~/.claudeops/` (claudeops Configuration)

This is where claudeops stores its own configuration:

```
~/.claudeops/
├── config.toml              # Global settings (model, cost, sync)
├── active-profile           # Plain text file with current profile name
├── profiles/                # Profile definitions
│   ├── default.toml
│   └── work.toml
├── skills/                  # User-installed skills
├── hooks/                   # User-installed hooks
├── addons/                  # Installed addons
├── addons.json              # Addon registry
├── backups/                 # Backup files from sync operations
└── state/                   # Session state
```

### `~/.claude/` (Claude Code Configuration)

This is where Claude Code reads its runtime configuration:

```
~/.claude/
├── settings.json            # Claude Code settings (hooks registered here)
├── CLAUDE.md                # Global instructions for Claude
├── skills/                  # Skills Claude Code reads
└── hooks/                   # Hook scripts
```

### Project-level Directories

```
.claudeops/                  # Project-specific claudeops config
├── config.toml              # Project overrides
├── local.toml               # Local overrides (gitignored)
└── profile.toml             # Project profile overrides

.claude/                     # Project-specific Claude Code config
├── skills/                  # Project-specific skills
├── hooks/                   # Project-specific hooks
└── CLAUDE.md                # Project instructions
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONFIG RESOLUTION                           │
├─────────────────────────────────────────────────────────────────┤
│  defaults → ~/.claudeops/config.toml → ~/.claudeops/profiles/X  │
│           → .claudeops/config.toml → .claudeops/local.toml      │
│                              ↓                                   │
│                      MergedConfig                                │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                         cops sync                                │
├─────────────────────────────────────────────────────────────────┤
│  Skills: builtin + ~/.claudeops/skills/ + .claude/skills/       │
│          → synced to → ~/.claude/skills/                        │
│                                                                  │
│  Hooks: builtin + ~/.claudeops/hooks/ + .claude/hooks/          │
│         → synced to → ~/.claude/settings.json                   │
│                                                                  │
│  CLAUDE.md: Generated from config                                │
│             → written to → ~/.claude/CLAUDE.md                   │
└─────────────────────────────────────────────────────────────────┘
```

## Profile System

### What Profiles Control

Profiles allow you to customize claudeops behavior. Each profile can configure:

```toml
# ~/.claudeops/profiles/work.toml
name = "work"
description = "Work profile with stricter settings"
extends = "default"  # Optional: inherit from another profile

[skills]
disabled = ["autopilot", "executor-high"]  # Skills to exclude

[hooks]
disabled = ["session-log"]  # Hooks to exclude

[agents.executor]
model = "sonnet"
priority = 1

[model]
default = "sonnet"

[model.routing]
simple = "haiku"
standard = "sonnet"
complex = "opus"

[cost]
budget_daily = 50.0
```

### Profile Inheritance

Profiles can extend other profiles using the `extends` field:

```toml
# ~/.claudeops/profiles/work-strict.toml
name = "work-strict"
extends = "work"

[skills]
disabled = ["autopilot", "executor-high", "executor"]  # Merged with parent
```

When inheriting:
- `disabled` arrays are **merged** (union)
- Scalar values (model, etc.) are **overridden** by child
- Agent configs are **deep-merged**

### Switching Profiles

```bash
cops profile use work
```

This will:
1. Update `~/.claudeops/active-profile` to "work"
2. **Auto-sync** to Claude Code (skills, hooks, CLAUDE.md)

To switch without syncing:
```bash
cops profile use work --no-sync
```

## Skills System

### Skill Loading Order

Skills are loaded from multiple locations in priority order (later overrides earlier):

1. **Builtin**: `<claudeops-install>/skills/` (21 built-in skills)
2. **Global**: `~/.claudeops/skills/`
3. **Project**: `.claude/skills/`

### Profile-Based Filtering

When a profile has `skills.disabled = ["autopilot"]`, the skill manager will:
1. Load all skills from all locations
2. Filter out skills in the disabled list
3. Sync remaining skills to `~/.claude/skills/`

### Syncing Skills

```bash
cops sync           # Sync everything (skills, hooks, CLAUDE.md)
cops skill sync     # Sync only skills
```

## Hooks System

### Hook Loading Order

Same as skills:

1. **Builtin**: `<claudeops-install>/hooks/`
2. **Global**: `~/.claudeops/hooks/`
3. **Project**: `.claude/hooks/`

### Profile-Based Filtering

When a profile has `hooks.disabled = ["session-log"]`, that hook is excluded.

### Syncing Hooks

Hooks are synced to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node /path/to/hook.mjs" }
        ]
      }
    ]
  }
}
```

## Unified Sync Command

The `cops sync` command is the primary way to sync configuration to Claude Code:

```bash
cops sync              # Interactive sync
cops sync -f           # Force sync (no confirmation)
cops sync -d           # Dry run (show what would happen)
cops sync -v           # Verbose output
```

What `cops sync` does:
1. Loads merged config (including active profile)
2. Syncs skills to `~/.claude/skills/` (respecting disabled list)
3. Syncs hooks to `~/.claude/settings.json` (respecting disabled list)
4. Generates `~/.claude/CLAUDE.md` with profile info

## Development (Dogfooding)

For development, use the dogfood setup script to symlink repo assets:

```bash
./scripts/dogfood-setup.sh
```

This creates symlinks:
- `skills/*` → `~/.claude/skills/` and `~/.claudeops/skills/`
- `hooks/*` → `~/.claude/hooks/` and `~/.claudeops/hooks/`

Changes to skills/hooks in the repo are immediately reflected.

## Common Workflows

### Create and Use a New Profile

```bash
# Create profile
cops profile create work -d "Work profile"

# Edit profile
$EDITOR ~/.claudeops/profiles/work.toml

# Switch to profile (auto-syncs)
cops profile use work
```

### Disable a Skill for Current Profile

1. Edit the active profile:
   ```bash
   cops profile edit
   ```

2. Add to `[skills]` section:
   ```toml
   [skills]
   disabled = ["autopilot"]
   ```

3. Sync:
   ```bash
   cops sync
   ```

### Check Current Configuration

```bash
cops config show        # Show merged config
cops profile show       # Show active profile details
cops skill list         # List active skills
cops hook list          # List active hooks
```
