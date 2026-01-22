# Profile Management Guide

Profiles are named configurations that let you switch between different Claude Code setups for different contexts. Whether you're working on backend services, frontend development, or personal projects, profiles help you maintain consistent, optimized settings for each environment.

## What Are Profiles?

A profile is a complete configuration set that includes:

- **Skills configuration** - which Claude Code features are enabled or disabled
- **Agent settings** - which AI models and priority levels agents use
- **Model routing** - how complex vs. simple tasks are routed to different models
- **MCP servers** - which Model Context Protocol servers are available
- **Cost tracking** - budget limits and cost tracking preferences

Profiles live in `~/.claude-code-kit/profiles/` as TOML files.

## Profile Location

All profiles are stored in your home directory:

```
~/.claude-code-kit/
├── profiles/
│   ├── default.toml
│   ├── frontend.toml
│   ├── backend.toml
│   └── personal.toml
└── active-profile   # Contains the name of the currently active profile
```

## Getting Started

### List All Profiles

See all your profiles at a glance:

```bash
ck profile list
```

Output:

```
Profiles

  Name          Description         Extends    Skills  Agents  Modified
  * default     Default profile     -          2       1       2 hours ago
    frontend    Frontend dev        default    3       2       1 day ago
    backend     Backend services    default    4       3       5 days ago
    personal    Personal projects   -          1       0       1 week ago

  * = active profile
```

### View Active Profile

Show detailed information about the currently active profile:

```bash
ck profile show
```

To view a specific profile:

```bash
ck profile show frontend
```

Output:

```
Profile: frontend

For frontend development with optimized tooling

Path: /Users/username/.claude-code-kit/profiles/frontend.toml
Active: yes
Created: 2025-01-15 10:30:00
Modified: 2025-01-20 14:22:15

Inheritance chain: default -> frontend

Skills
Enabled: autopilot, ultrawork, designer
Disabled: security-reviewer

Agents
Name                  Model   Priority
  designer            opus    85
  executor            sonnet  70
  architect-low       haiku   30

Model Configuration
Default: sonnet
Simple tasks: haiku
Standard tasks: sonnet
Complex tasks: opus

MCP Servers
Enabled: filesystem, git
Disabled: web-search
```

### Switch Profiles

Activate a different profile:

```bash
ck profile use frontend
```

Output:

```
Switched to profile: frontend
```

## Creating Profiles

### Create a Basic Profile

Create a new empty profile:

```bash
ck profile create my-profile
```

### Create with a Base Profile

Inherit from an existing profile to reuse its configuration:

```bash
ck profile create frontend --from default
```

The `frontend` profile will inherit all settings from `default`, which you can then customize.

### Create with Description

Add a descriptive comment to your profile:

```bash
ck profile create work --description "Work projects configuration"
```

### Create and Activate

Create a profile and immediately switch to it:

```bash
ck profile create experimental --activate
```

## Profile TOML Structure

Profiles are stored as TOML files. Here's what a complete profile looks like:

```toml
name = "frontend"
description = "Frontend development optimized profile"
extends = "default"

[skills]
enabled = ["autopilot", "designer", "ultrawork"]
disabled = ["security-reviewer"]

[agents.designer]
model = "opus"
priority = 85

[agents.executor]
model = "sonnet"
priority = 70

[agents.architect-low]
model = "haiku"
priority = 30

[mcp]
enabled = ["filesystem", "git"]
disabled = ["web-search"]

[model]
default = "sonnet"

[model.routing]
simple = "haiku"
standard = "sonnet"
complex = "opus"

[cost]
tracking = true
budget_daily = 10.0
budget_weekly = 50.0
budget_monthly = 200.0
```

## Profile Inheritance

Profiles can extend other profiles to reduce duplication. When a profile extends another:

- All settings from the parent are inherited
- Child settings override parent settings
- Arrays (skills, MCP servers) are merged
- Objects (agents, model overrides) are merged with child properties taking precedence

### Basic Inheritance

Create a profile that extends another:

```bash
ck profile create qa-testing --from default
```

This creates `qa-testing` with all settings from `default`:

```toml
name = "qa-testing"
extends = "default"
```

### Inheritance Chain

You can create multi-level inheritance:

```toml
# base.toml
name = "base"
[skills]
enabled = ["autopilot"]

# frontend.toml
name = "frontend"
extends = "base"
[skills]
enabled = ["designer"]

# react.toml
name = "react"
extends = "frontend"
[agents.designer]
model = "opus"
```

The `react` profile will inherit from `frontend`, which inherits from `base`. The inheritance chain is: `base -> frontend -> react`.

When resolved, `react` will have:
- All skills from `base` and `frontend`
- All agent settings from `frontend` and its overrides
- Any custom agent settings defined in `react`

### Circular Inheritance

The system detects and prevents circular inheritance chains:

```bash
# This will fail - would create a cycle
ck profile create base --from circular-base
# Error: Circular inheritance detected
```

## Common Profile Patterns

### Frontend Development Profile

```toml
name = "frontend"
description = "Optimized for frontend development"
extends = "default"

[skills]
enabled = ["designer", "ultrawork", "autopilot"]
disabled = ["security-reviewer"]

[agents.designer]
model = "opus"
priority = 90

[agents.executor]
model = "sonnet"
priority = 70

[mcp]
enabled = ["filesystem", "git"]

[model]
default = "sonnet"
```

### Backend Development Profile

```toml
name = "backend"
description = "Optimized for backend development"
extends = "default"

[skills]
enabled = ["architect", "security-reviewer", "code-reviewer"]
disabled = ["designer"]

[agents.architect]
model = "opus"
priority = 90

[agents.executor]
model = "sonnet"
priority = 70

[agents.security-reviewer]
model = "opus"
priority = 85

[mcp]
enabled = ["filesystem", "git"]

[model]
default = "sonnet"
```

### Cost-Conscious Profile

```toml
name = "budget"
description = "Minimize API costs with haiku defaults"
extends = "default"

[model]
default = "haiku"

[model.routing]
simple = "haiku"
standard = "haiku"
complex = "sonnet"

[cost]
tracking = true
budget_daily = 5.0
budget_monthly = 100.0
```

### Personal Projects Profile

```toml
name = "personal"
description = "Personal projects with all features enabled"

[skills]
enabled = ["autopilot", "ultrawork", "ralph"]

[mcp]
enabled = ["filesystem", "git"]

[model]
default = "opus"

[model.routing]
simple = "sonnet"
standard = "opus"
complex = "opus"

[cost]
tracking = false
```

## Modifying Profiles

### Manual Editing

Profiles are plain TOML files that you can edit directly:

```bash
# Open in your default editor
$EDITOR ~/.claude-code-kit/profiles/frontend.toml
```

The file will be validated when next read, and invalid configurations will be rejected.

## Exporting and Importing Profiles

### Export a Profile

Save a profile to a file for sharing or backup:

```bash
ck profile export frontend
```

Export to a specific file:

```bash
ck profile export frontend --output ~/my-profile.toml
```

Export with resolved inheritance (all merged settings):

```bash
ck profile export frontend --resolved
```

Export as JSON:

```bash
ck profile export frontend --format json
```

### Import a Profile

Load a profile from a file:

```bash
ck profile import ~/my-profile.toml
```

Import with a custom name:

```bash
ck profile import ~/my-profile.toml --name custom-name
```

Import from a URL:

```bash
ck profile import https://example.com/team-profile.toml --activate
```

Import and overwrite existing profile:

```bash
ck profile import ~/updated-profile.toml --merge
```

Import and activate immediately:

```bash
ck profile import ~/my-profile.toml --activate
```

## Cloning Profiles

Create a copy of an existing profile with modifications:

```bash
ck profile clone frontend new-frontend
```

Clone with a new description:

```bash
ck profile clone frontend staging --description "Staging environment"
```

Clone and activate:

```bash
ck profile clone backend test-backend --activate
```

## Deleting Profiles

Remove a profile permanently:

```bash
ck profile delete old-profile
```

You'll be asked to confirm before deletion. Skip confirmation:

```bash
ck profile delete old-profile --force
```

**Important:** You cannot delete the currently active profile. Switch to another profile first:

```bash
ck profile use default
ck profile delete backend
```

## Configuration Reference

### Skills

Skills are high-level features that can be enabled or disabled:

```toml
[skills]
enabled = ["autopilot", "ralph", "ultrawork"]
disabled = ["security-reviewer"]
```

Common skills:
- `autopilot` - Autonomous execution from idea to working code
- `ralph` - Persistence mode for long-running tasks
- `ultrawork` - Maximum parallel execution
- `designer` - UI/UX design capabilities
- `architect` - Deep analysis and architecture
- `security-reviewer` - Security analysis
- `code-reviewer` - Code review expertise

### Agents

Configure specific AI agents that handle different tasks:

```toml
[agents.executor]
model = "sonnet"
priority = 70

[agents.architect]
model = "opus"
priority = 90

[agents.designer-low]
model = "haiku"
priority = 40
```

Agent properties:
- `model` - Which Claude model to use: `haiku`, `sonnet`, or `opus`
- `priority` - Task priority (0-100, default 50). Higher = more important

### Models

Control which Claude models are used and when:

```toml
[model]
default = "sonnet"

[model.routing]
simple = "haiku"           # Use for quick lookups, simple questions
standard = "sonnet"        # Use for standard features and implementations
complex = "opus"           # Use for deep analysis, complex reasoning

# Optional: Override specific agents to use different models
[model.overrides]
security-reviewer = "opus"
architect-low = "haiku"
```

Available models:
- `haiku` - Fast, cheap, good for simple tasks
- `sonnet` - Balanced speed and capability
- `opus` - Most capable, best for complex reasoning

### MCP Servers

Model Context Protocol servers provide additional capabilities:

```toml
[mcp]
enabled = ["filesystem", "git"]
disabled = ["web-search"]
```

Common MCP servers:
- `filesystem` - File and directory access
- `git` - Git repository operations
- `web-search` - Web search capability
- `database` - Database query support

### Cost Tracking

Monitor and limit API usage:

```toml
[cost]
tracking = true
budget_daily = 10.0
budget_weekly = 50.0
budget_monthly = 200.0
```

- `tracking` - Enable/disable cost tracking (default: true)
- `budget_daily` - Daily spend limit in USD
- `budget_weekly` - Weekly spend limit in USD
- `budget_monthly` - Monthly spend limit in USD

## Best Practices

### 1. Use Descriptive Names

Choose profile names that clearly indicate their purpose:

```bash
# Good
ck profile create frontend-react
ck profile create api-backend
ck profile create client-projects

# Avoid
ck profile create temp
ck profile create test
ck profile create profile1
```

### 2. Create Base Profiles

Set up a base profile with common settings, then extend it:

```bash
# Create a base profile with company standards
ck profile create company-base --description "Company standards"

# Extend for specific use cases
ck profile create company-frontend --from company-base
ck profile create company-backend --from company-base
```

### 3. Document Profiles

Use descriptions to document when and why to use each profile:

```bash
ck profile create client-work --description "Client project with strict cost limits"
ck profile create research --description "Research and experiments, cost limit disabled"
ck profile create production --description "Production work with security review enabled"
```

### 4. Version Control Configuration

Keep your profile configurations in version control:

```bash
# Export all profiles
for profile in $(ck profile list | grep -v '*'); do
  ck profile export $profile --output profiles/$profile.toml
done

# Commit to git
git add profiles/
git commit -m "Update claude-kit profiles"
```

### 5. Share Profiles Safely

Export profiles for team sharing:

```bash
# Create a team profile
ck profile create team-standards --description "Shared team configuration"

# Export for version control
ck profile export team-standards --output team-profile.toml
```

## Troubleshooting

### Profile Not Found

If you get "Profile not found" error:

```bash
# Check available profiles
ck profile list

# Verify the name is correct
ck profile show profile-name
```

### Circular Inheritance Error

If you get a circular inheritance error:

```bash
# Check the inheritance chain
ck profile show problematic-profile

# Remove the circular reference from the TOML file
$EDITOR ~/.claude-code-kit/profiles/problematic-profile.toml
```

### Cannot Delete Active Profile

If you can't delete a profile:

```bash
# Switch to a different profile first
ck profile use default

# Now delete
ck profile delete old-profile
```

### Configuration Not Applied

If profile settings don't seem to apply:

```bash
# Verify the profile is active
ck profile show

# Check the resolved configuration
ck profile show --json | jq '.resolved'

# Re-activate to ensure settings are loaded
ck profile use current-profile
```

## Profile Variables and Templating

Currently, profiles are static TOML files. Templating and variable substitution may be added in future versions.

For now, if you need environment-specific profiles, create separate profile files:

```bash
ck profile create prod
ck profile create staging
ck profile create dev
```

Then use the appropriate profile for each environment.

## Project-Level Profile Override

You can override the global profile for a specific project by creating a `.claude-code-kit.yaml` file in your project root:

```yaml
profile: project-specific-profile
```

This will use `project-specific-profile` for all work in this directory, overriding your global active profile.

## API Usage

If you're building tools that work with profiles, the profile system is available as a TypeScript API:

```typescript
import { createProfileManager } from '@claude-code-kit/profile';

const manager = createProfileManager();

// List all profiles
const profiles = await manager.list();

// Get details for a profile
const profile = await manager.get('frontend');

// Create a new profile
await manager.create('new-profile', {
  description: 'My new profile',
  extends: 'default'
});

// Switch profiles
await manager.use('frontend');

// Export a profile
const toml = await manager.export('frontend');

// Delete a profile
await manager.delete('old-profile');
```

## Feedback and Feature Requests

Profiles are actively developed. If you have suggestions for improvements:

1. Check existing profiles in your `.claude-code-kit/profiles/` directory
2. Test different configurations to find what works best
3. Share successful profiles with the community
4. Report issues or request features on the project repository
