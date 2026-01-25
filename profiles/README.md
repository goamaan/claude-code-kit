# Profile Templates

This directory contains default profile templates for claudeops. These templates provide pre-configured settings for common development scenarios.

## Available Templates

### minimal.toml
Bare bones configuration with minimal context and processing.
- Uses Haiku for most operations (cost-effective)
- Disables autopilot, ralph, ultrawork, and planner skills
- Best for: Quick tasks, simple operations, budget-conscious development

### frontend.toml
Frontend development focused profile.
- Enables frontend-ui-ux skill
- Prioritizes designer agents (Sonnet/Opus)
- Best for: React, Vue, Svelte, CSS, UI/UX work

### backend.toml
Backend development focused profile.
- Prioritizes architect and security-reviewer agents
- Best for: API development, database work, server-side logic

### fullstack.toml
Combines frontend and backend capabilities.
- Extends frontend profile
- Includes backend agents (architect, security-reviewer)
- Best for: Full-stack applications, monorepos

### security.toml
Security-focused development profile.
- Prioritizes security-reviewer and code-reviewer agents (Opus)
- Uses Opus as default model for thorough analysis
- Best for: Security audits, sensitive applications, compliance work

### devops.toml
DevOps and infrastructure profile.
- Prioritizes architect and build-fixer agents
- Best for: CI/CD, deployment, infrastructure as code, Docker/K8s

### python.toml
Python development profile.
- Enables scientist agent for data analysis
- Includes TDD guide for test-driven development
- Best for: Python projects, data science, machine learning

### typescript.toml
TypeScript development profile.
- Prioritizes type system understanding
- Uses Opus for complex type problems and generics
- Best for: TypeScript projects, type-heavy codebases

## Using Templates

Import a template to create a new profile:

```bash
# Import as-is
ck profile import profiles/frontend.toml

# Import with custom name
ck profile import profiles/frontend.toml --name my-react-profile

# Import and activate immediately
ck profile import profiles/security.toml --activate
```

## Inheritance

Profiles can extend other profiles using the `extends` field:

```toml
name = "my-custom-profile"
extends = "frontend"

# Override or add additional settings
[agents.executor]
model = "opus"
priority = 90
```

## Project-Level Overrides

Projects can override global profile settings by creating `.claudeops/profile.toml` in the project root:

```toml
# .claudeops/profile.toml
name = "project-override"

[skills]
enabled = ["project-specific-skill"]

[agents.executor]
model = "opus"  # Override for this project
```

## Creating Custom Templates

1. Create a new `.toml` file in this directory
2. Follow the schema from existing templates
3. Use `extends` to build on existing templates
4. Document your template in this README

## Template Schema

```toml
name = "template-name"
description = "Template description"
extends = "base-profile-name"  # Optional

[skills]
enabled = ["skill1", "skill2"]
disabled = ["unwanted-skill"]

[agents.agent-name]
model = "haiku" | "sonnet" | "opus"
priority = 0-100  # Higher = higher priority

[mcp]
enabled = ["mcp-server-1"]
disabled = ["mcp-server-2"]

[model]
default = "haiku" | "sonnet" | "opus"

[model.routing]
simple = "haiku"
standard = "sonnet"
complex = "opus"

[model.overrides]
specific-task = "opus"

[cost]
tracking = true
budget_daily = 10.0
budget_monthly = 100.0
```
