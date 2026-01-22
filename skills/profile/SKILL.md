---
name: profile
description: Manage Claude-Kit profiles for different environments and workflows
auto_trigger:
  - profile
  - switch profile
  - create profile
  - list profiles
allowed_tools:
  - Read
  - Write
  - Glob
  - Bash
---

# Profile Skill

Manage profiles for different development environments, workflows, and preferences.

## Purpose

Profile mode provides:
- Environment-specific configurations
- Workflow customization
- Quick context switching
- Preference management

## When to Activate

Activate when user says:
- "profile [action]"
- "switch to [profile]"
- "create profile [name]"
- "list profiles"
- "show current profile"

## Profile Concepts

### What is a Profile?

A profile is a named configuration that includes:
- Model preferences (which tier to use by default)
- Active skills and addons
- Project-specific settings
- Custom instructions

### Profile Storage

```
~/.claude-kit/
  profiles/
    default.toml
    work.toml
    personal.toml
    fast.toml
```

### Profile Structure

```toml
[profile]
name = "work"
description = "Work environment with strict settings"

[models]
default_tier = "sonnet"
prefer_cost_efficiency = false
max_concurrent_agents = 10

[skills]
enabled = ["autopilot", "ralph", "code-review", "tdd"]
disabled = []

[addons]
enabled = ["typescript-strict", "testing-required"]

[behavior]
auto_commit = false
require_tests = true
strict_types = true

[custom]
company = "Acme Corp"
code_style = "functional"
```

## Profile Actions

### List Profiles

```bash
claude-kit profile list
```

Output:
```
Available Profiles:

* default (active)
  - Standard development settings

  work
  - Strict settings for work projects

  personal
  - Relaxed settings for side projects

  fast
  - Speed-optimized for quick tasks
```

### Show Current Profile

```bash
claude-kit profile show
```

Output:
```
Current Profile: default

Models:
  Default tier: sonnet
  Cost efficiency: balanced
  Max agents: 8

Skills: autopilot, ralph, ultrawork, planner...
Addons: none

Behavior:
  Auto-commit: false
  Require tests: false
```

### Create Profile

```bash
claude-kit profile create <name>
```

Interactive creation:
```
Creating new profile: work

Default model tier? [haiku/sonnet/opus]: sonnet
Prioritize cost efficiency? [y/N]: n
Maximum concurrent agents? [8]: 10

Enable skills (comma-separated or 'all'): all
Disable any skills?: code-review

Enable addons?: typescript-strict, testing-required

Auto-commit after changes? [y/N]: n
Require tests for changes? [y/N]: y

Profile 'work' created!
```

### Switch Profile

```bash
claude-kit profile use <name>
```

Output:
```
Switched to profile: work

Active settings:
- Model tier: sonnet
- Skills: 14 enabled, 1 disabled
- Addons: 2 enabled
- Strict mode: enabled
```

### Edit Profile

```bash
claude-kit profile edit <name>
```

Opens profile in editor or interactive modification.

### Delete Profile

```bash
claude-kit profile delete <name>
```

With confirmation:
```
Delete profile 'old-project'? This cannot be undone. [y/N]: y
Profile 'old-project' deleted.
```

### Copy Profile

```bash
claude-kit profile copy <source> <new-name>
```

Output:
```
Created profile 'new-project' as copy of 'work'
```

## Common Profiles

### Fast Profile

For quick tasks where speed matters:
```toml
[profile]
name = "fast"
description = "Speed-optimized"

[models]
default_tier = "haiku"
prefer_cost_efficiency = true
max_concurrent_agents = 15

[behavior]
auto_commit = true
require_tests = false
```

### Strict Profile

For production code:
```toml
[profile]
name = "strict"
description = "Maximum quality checks"

[models]
default_tier = "opus"
prefer_cost_efficiency = false
max_concurrent_agents = 5

[skills]
enabled = ["code-review", "tdd", "security-review"]

[behavior]
require_tests = true
strict_types = true
security_review = true
```

### Learning Profile

For exploration and learning:
```toml
[profile]
name = "learning"
description = "Verbose explanations"

[models]
default_tier = "opus"

[behavior]
verbose = true
explain_decisions = true
suggest_improvements = true
```

## Profile Inheritance

Profiles can extend others:
```toml
[profile]
name = "work-frontend"
extends = "work"

[skills]
enabled = ["frontend-ui-ux"]

[addons]
enabled = ["react-best-practices"]
```

## Output Format

### Profile Summary
```
## Profile: work

### Description
Strict settings for work projects

### Model Settings
| Setting | Value |
|---------|-------|
| Default tier | sonnet |
| Cost efficiency | false |
| Max agents | 10 |

### Skills
Enabled: autopilot, ralph, ultrawork, planner, code-review, tdd
Disabled: none

### Addons
- typescript-strict
- testing-required

### Behavior
- Auto-commit: false
- Require tests: true
- Strict types: true
```

### Profile Switch
```
## Switched Profile

From: default
To: work

### Changed Settings
- Model tier: haiku → sonnet
- Max agents: 8 → 10
- Require tests: false → true

### Now Active
[Summary of current profile]
```

## Anti-Patterns to Avoid

1. **Too many profiles**
   - BAD: Profile per project
   - GOOD: Profiles for distinct workflows

2. **Complex inheritance**
   - BAD: 5-level deep extension
   - GOOD: Simple, clear inheritance

3. **Conflicting settings**
   - BAD: Fast profile with strict checks
   - GOOD: Consistent, purposeful settings

4. **No descriptions**
   - BAD: Profile with just name
   - GOOD: Clear description of purpose

## Success Criteria

Profile operations complete when:
- [ ] Action executed successfully
- [ ] Changes confirmed
- [ ] Current state displayed
- [ ] Any conflicts resolved
- [ ] User knows active settings
