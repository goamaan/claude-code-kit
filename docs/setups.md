# Setup Templates Guide

Setup templates are pre-configured starting points that provide everything Claude needs to work effectively in different development contexts. Each setup includes a manifest defining skills, agents, MCP configurations, and custom instructions tailored to your workflow.

## What Setups Provide

A setup is a complete environment configuration consisting of:

- **Skills**: Enabled/disabled capabilities that define how Claude operates
- **Agents**: Specialized AI personas configured with specific models and priorities
- **MCP Servers**: Model Context Protocol integrations for external tools
- **Hook Templates**: Automated checks and transformations for specific file patterns
- **Custom Instructions**: CLAUDE.md content with domain-specific guidance and patterns
- **Requirements**: Version constraints and dependencies

## Available Setups

### minimal

The clean slate setup - use this as a base for custom configurations.

- **Description**: Basic Claude Code configuration with no additions
- **Use Case**: Starting from scratch with maximum flexibility
- **Features**:
  - No skills enabled by default
  - Minimal footprint
  - Foundation for custom setup creation

**Example**:
```bash
cck setup use minimal
```

---

### fullstack

Complete setup for full-stack web application development with React and Node.js.

- **Description**: Full-stack development with React and Node.js
- **Tech Stack**:
  - Frontend: React, TypeScript, Tailwind CSS, Vite
  - Backend: Node.js, Express/Fastify, TypeScript
  - Database: PostgreSQL, MongoDB, Redis
  - Testing: Vitest, Playwright, Jest

**Skills Enabled**:
- `autopilot` - Autonomous task execution
- `ralph` - Persistence until task completion
- `ultrawork` - Parallel execution for speed
- `planner` - Strategic planning and interviews
- `git-master` - Expert git workflow
- `frontend-ui-ux` - UI/UX design sensibility
- `tdd-guide` - Test-driven development
- `code-reviewer` - Code review expertise
- `security-reviewer` - Security best practices
- `analyze` - Deep analysis and debugging
- `deepsearch` - Comprehensive codebase search

**Agents Configured**:
- `designer` (sonnet, priority 70) - UI/component design
- `executor` (sonnet, priority 50) - Code execution
- `architect` (opus, priority 80) - Architecture decisions
- `qa-tester` (sonnet, priority 60) - Quality assurance

**MCP Servers**: `filesystem`, `git`, `fetch`

**Best For**:
- Web applications with frontend and backend
- React component libraries
- Full-stack TypeScript projects
- Teams building modern web apps

**Example**:
```bash
cck setup use fullstack
```

---

### frontend

Specialized setup for frontend-focused development with design and UI emphasis.

- **Description**: Frontend development with React, Vue, or Svelte
- **Tech Stack**:
  - Frameworks: React, Vue, Svelte
  - Styling: Tailwind CSS, CSS-in-JS
  - Build: Vite, SvelteKit
  - Testing: Vitest, Playwright, Testing Library
  - Design: Component systems, responsive design

**Skills Enabled**:
- `autopilot` - Autonomous execution
- `ralph` - Persistence
- `ultrawork` - Parallelization
- `planner` - Planning
- `git-master` - Git expertise
- `frontend-ui-ux` - Strong UI/UX focus
- `tdd-guide` - Test-driven development
- `code-reviewer` - Code review
- `analyze` - Deep analysis
- `deepsearch` - Codebase search

**Agents Configured**:
- `designer` (opus, priority 90) - Primary UI/design agent
- `designer-low` (haiku, priority 30) - Quick design checks
- `executor` (sonnet, priority 50) - Implementation
- `architect` (sonnet, priority 60) - Component architecture

**MCP Servers**: `filesystem`, `git`, `fetch`

**Best For**:
- React/Vue/Svelte applications
- Component libraries
- Design system development
- Single-page applications (SPAs)
- UI-heavy projects

**Example**:
```bash
cck setup use frontend
```

---

### backend

Specialized setup for backend/API development with security and architecture focus.

- **Description**: Backend API development with security focus
- **Tech Stack**:
  - Languages: TypeScript, Python, Go
  - Frameworks: Express, Fastify, FastAPI, Gin
  - Databases: PostgreSQL, MongoDB, Redis
  - Messaging: RabbitMQ, Kafka, Redis Pub/Sub
  - Security: Authentication, encryption, rate limiting

**Skills Enabled**:
- `autopilot` - Autonomous execution
- `ralph` - Persistence
- `ultrawork` - Parallelization
- `planner` - Planning
- `git-master` - Git expertise
- `tdd-guide` - Test-driven development
- `code-reviewer` - Code review
- `security-reviewer` - Security focus
- `analyze` - Deep analysis
- `deepsearch` - Codebase search

**Agents Configured**:
- `architect` (opus, priority 85) - Architecture decisions
- `executor` (sonnet, priority 50) - Implementation
- `security-reviewer` (opus, priority 80) - Security review
- `qa-tester` (sonnet, priority 65) - API testing

**MCP Servers**: `filesystem`, `git`, `postgres`, `fetch`

**Best For**:
- REST and GraphQL APIs
- Microservices
- Backend services
- Database design
- API security

**Example**:
```bash
cck setup use backend
```

---

### data

Specialized setup for data science, analytics, and machine learning projects.

- **Description**: Data science and analytics with Python and Jupyter
- **Tech Stack**:
  - Languages: Python, SQL, R
  - Libraries: pandas, numpy, scikit-learn, PyTorch, TensorFlow
  - Visualization: matplotlib, seaborn, plotly
  - Notebooks: Jupyter, JupyterLab

**Skills Enabled**:
- `autopilot` - Autonomous execution
- `ralph` - Persistence
- `ultrawork` - Parallelization
- `planner` - Planning
- `git-master` - Git expertise
- `research` - Research and exploration
- `analyze` - Analysis expertise
- `deepsearch` - Codebase search

**Agents Configured**:
- `scientist` (sonnet, priority 80) - Data science expert
- `scientist-high` (opus, priority 90) - Complex ML tasks
- `scientist-low` (haiku, priority 30) - Quick data inspection
- `researcher` (sonnet, priority 70) - Research and analysis
- `architect` (sonnet, priority 60) - Project architecture
- `executor` (sonnet, priority 50) - Implementation

**MCP Servers**: `filesystem`, `git`, `postgres`, `fetch`

**Best For**:
- Machine learning projects
- Data analysis and exploration
- Statistical modeling
- Jupyter notebook development
- Data pipelines

**Example**:
```bash
cck setup use data
```

---

### devops

Specialized setup for infrastructure as code, containerization, and CI/CD.

- **Description**: DevOps with Docker, Kubernetes, and Terraform
- **Tech Stack**:
  - Containers: Docker, Podman
  - Orchestration: Kubernetes, Docker Compose
  - IaC: Terraform, Pulumi, CloudFormation
  - CI/CD: GitHub Actions, GitLab CI, Jenkins
  - Monitoring: Prometheus, Grafana, Datadog

**Skills Enabled**:
- `autopilot` - Autonomous execution
- `ralph` - Persistence
- `ultrawork` - Parallelization
- `planner` - Planning
- `git-master` - Git expertise
- `security-reviewer` - Security focus
- `analyze` - Deep analysis
- `deepsearch` - Codebase search

**Agents Configured**:
- `architect` (opus, priority 85) - Infrastructure design
- `executor` (sonnet, priority 50) - Implementation
- `security-reviewer` (opus, priority 80) - Security review
- `build-fixer` (sonnet, priority 70) - Build pipeline fixes

**MCP Servers**: `filesystem`, `git`, `fetch`

**Best For**:
- Kubernetes deployments
- Terraform/IaC projects
- Docker container setup
- CI/CD pipelines
- Infrastructure monitoring

**Example**:
```bash
cck setup use devops
```

---

### enterprise

Specialized setup for enterprise development with strict compliance, security, and audit requirements.

- **Description**: Enterprise development with strict compliance and security
- **Focus**:
  - Compliance frameworks (SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS)
  - Security scanning and code review
  - Audit logging and access control
  - Change management and approval workflows
  - Documentation requirements

**Skills Enabled**:
- `autopilot` - Autonomous execution
- `ralph` - Persistence
- `planner` - Planning
- `git-master` - Git expertise
- `tdd-guide` - Test-driven development
- `code-reviewer` - Code review (disabled: `ultrawork` for controlled execution)
- `security-reviewer` - Security expertise
- `analyze` - Deep analysis
- `deepsearch` - Codebase search

**Skills Disabled**:
- `ultrawork` - Disabled for controlled, auditable execution

**Agents Configured**:
- `architect` (opus, priority 90) - Architecture review
- `security-reviewer` (opus, priority 95) - Primary security focus
- `code-reviewer` (opus, priority 85) - Code review expertise
- `executor` (sonnet, priority 50) - Implementation
- `qa-tester-high` (opus, priority 80) - Enterprise QA

**MCP Servers**: Limited to `filesystem`, `git` (max 3 enabled)

**Hook Templates**:
- `security-audit` - Runs on source files with priority 100
- `compliance-check` - Validates compliance on all source files with priority 90

**Best For**:
- Enterprise applications requiring compliance
- Regulated industries (finance, healthcare, government)
- Projects requiring audit trails
- High-security requirements
- Strict code review workflows

**Example**:
```bash
cck setup use enterprise
```

---

## Command Reference

### List Available Setups

View all available built-in and custom setups:

```bash
cck setup list
```

**Options**:
- `--json` - Output as JSON for programmatic use

**Output**: Table showing name, version, description, author, and source

---

### Show Setup Details

Get detailed information about a specific setup:

```bash
cck setup info <name>
```

**Arguments**:
- `<name>` - Setup name (e.g., `fullstack`, `frontend`)

**Options**:
- `--json` - Output as JSON

**Output**:
- Metadata (version, description, author, path)
- Enabled/disabled skills
- Hook template configurations
- Preview of CLAUDE.md content

**Example**:
```bash
cck setup info fullstack
cck setup info backend --json
```

---

### Apply a Setup

Generate CLAUDE.md by applying a setup configuration:

```bash
cck setup use <name> [--extend <setup1,setup2>] [--output <path>] [--force] [--dry-run]
```

**Arguments**:
- `<name>` - Base setup to apply

**Options**:
- `--extend, -e <setup1,setup2>` - Additional setups to extend from (comma-separated)
- `--output, -o <path>` - Output file path (default: `CLAUDE.md`)
- `--force, -f` - Overwrite existing file without prompt
- `--dry-run` - Show output without writing to file

**Example**:
```bash
# Apply fullstack setup to CLAUDE.md in current directory
cck setup use fullstack

# Apply with custom output path
cck setup use backend --output ~/.claude-code-kit/CLAUDE.md

# Extend frontend with data science setup
cck setup use frontend --extend data

# Preview output before applying
cck setup use enterprise --dry-run

# Force overwrite without confirmation
cck setup use fullstack --force
```

---

### Create Custom Setup

Create a new custom setup based on existing setup(s):

```bash
cck setup create <name> [--from <setup1,setup2>] [--description <text>]
```

**Arguments**:
- `<name>` - Name for the new setup (lowercase, hyphens allowed)

**Options**:
- `--from, -f <setup1,setup2>` - Base setup(s) to extend (comma-separated)
- `--description, -d <text>` - Setup description

**Example**:
```bash
# Create setup extending frontend
cck setup create my-react --from frontend --description "My React setup"

# Create setup extending multiple setups
cck setup create my-fullstack --from fullstack,enterprise

# Create from scratch
cck setup create minimal-custom
```

**Output**: New setup created in `~/.claude-code-kit/setups/<name>/`

---

### Export Setup

Export a setup as a shareable tar.gz archive:

```bash
cck setup export <name> [--output <path>]
```

**Arguments**:
- `<name>` - Setup name to export

**Options**:
- `--output, -o <path>` - Output file path (default: `<name>.tar.gz`)

**Example**:
```bash
# Export fullstack setup
cck setup export fullstack

# Export to custom location
cck setup export my-setup --output ./exported-setup.tar.gz
```

**Output**: Compressed archive containing the setup manifest and content

---

### Import Setup

Import a setup from file, URL, or archive:

```bash
cck setup import <source> [--name <name>]
```

**Arguments**:
- `<source>` - File path, URL, or archive to import

**Options**:
- `--name, -n <name>` - Name for imported setup (auto-detected if not provided)

**Example**:
```bash
# Import from local file
cck setup import ./my-setup.tar.gz

# Import from URL
cck setup import https://example.com/setups/custom-setup.tar.gz

# Import with specific name
cck setup import ./setup.tar.gz --name my-imported-setup
```

---

### Delete Setup

Delete a custom user setup:

```bash
cck setup delete <name> [--force]
```

**Arguments**:
- `<name>` - Setup name to delete

**Options**:
- `--force, -f` - Skip confirmation prompt

**Example**:
```bash
# Delete with confirmation
cck setup delete my-setup

# Force delete without confirmation
cck setup delete my-setup --force
```

**Note**: Built-in setups (minimal, fullstack, frontend, backend, data, devops, enterprise) cannot be deleted.

---

## Setup Manifest Structure

Setup manifests are TOML files located in `~/.claude-code-kit/setups/<name>/manifest.toml`.

### Basic Metadata

```toml
[setup]
name = "mysetup"
version = "1.0.0"
description = "My custom setup"
author = "Your Name"
extends = "fullstack"  # Optional: inherit from another setup
```

### Skills Configuration

Enable and disable skills:

```toml
[skills]
enabled = [
  "autopilot",
  "ralph",
  "code-reviewer"
]
disabled = [
  "ultrawork"
]
```

### Agent Configuration

Configure agent models and priorities (0-100, higher = preferred):

```toml
[agents.architect]
model = "opus"
priority = 90

[agents.executor]
model = "sonnet"
priority = 50

[agents.designer]
model = "haiku"
priority = 30
```

**Available Models**:
- `haiku` - Fast, cost-effective
- `sonnet` - Balanced performance/cost
- `opus` - Most capable

### MCP Configuration

Configure Model Context Protocol integrations:

```toml
[mcp]
recommended = ["filesystem", "git", "postgres"]
required = ["filesystem"]
max_enabled = 3  # Maximum MCP servers to enable
```

### Hook Templates

Define automated checks and transformations:

```toml
[[hooks.templates]]
name = "security-audit"
description = "Run security checks on source files"
matcher = "**/src/**/*.{ts,js}"
handler = "security-check"
priority = 100

[[hooks.templates]]
name = "formatting"
matcher = "**/src/**/*"
handler = "format-check"
priority = 50
```

### Custom Content

Add custom instructions to CLAUDE.md:

```toml
[setup]
# ... metadata ...

content = """
# My Custom Instructions

## Project-Specific Patterns

Your custom guidance here...
"""
```

---

## Setup Inheritance

Setups can extend other setups using the `extends` field:

```toml
[setup]
name = "my-frontend"
extends = "frontend"

[skills]
enabled = ["my-custom-skill"]

[agents.custom-agent]
model = "sonnet"
priority = 75
```

### Inheritance Rules

- Skills are **merged**: enabled and disabled lists combine
- Agents are **overridden**: values in child override parent
- MCP is **merged**: recommended and required lists combine
- Hooks are **merged**: templates combine with child priority overriding
- Content is **concatenated**: child content appends to parent

---

## Extending Setups with Command-Line

Apply multiple setups in one command:

```bash
# Start with frontend, extend with data science capabilities
cck setup use frontend --extend data

# Start with backend, add both enterprise and data features
cck setup use backend --extend enterprise,data
```

When extending:
1. Base setup configuration is loaded
2. Each extended setup adds to or overrides configuration
3. Later setups take precedence in conflicts
4. Final merged configuration generates CLAUDE.md

---

## Practical Examples

### Example 1: React + TypeScript Project

```bash
# Use frontend setup (already optimized for React)
cck setup use frontend

# Or extend with testing capabilities
cck setup use frontend --extend fullstack
```

### Example 2: Python Data Analysis Project

```bash
# Use data science setup with Python tools
cck setup use data
```

### Example 3: Enterprise REST API

```bash
# Backend setup with enterprise compliance
cck setup use backend --extend enterprise
```

### Example 4: Full-Stack with ML Features

```bash
# Full-stack frontend and backend with data science
cck setup use fullstack --extend data
```

### Example 5: Custom Multi-Team Setup

```bash
# Create custom setup combining multiple specialties
cck setup create team-setup --from fullstack

# Edit the manifest to customize further
# Then use it across the team
cck setup export team-setup

# Team members can import it
cck setup import team-setup.tar.gz
```

---

## Best Practices

### Choosing a Setup

1. **Match your primary stack**: Start with the setup closest to your main technology
2. **Consider your team**: Enterprise setup adds compliance requirements
3. **Plan extension**: Use `--extend` to combine capabilities
4. **Review the content**: Check `cck setup info <name>` to see what's included

### Managing Custom Setups

1. **Keep it simple**: Only customize what you need
2. **Document decisions**: Add comments to your custom manifest
3. **Version your setup**: Use semver (1.0.0, 1.1.0, 2.0.0)
4. **Test before sharing**: Use `--dry-run` to preview output
5. **Use inheritance**: Extend built-in setups rather than recreating

### Collaboration

1. **Export team setups**: Use `cck setup export` to share
2. **Version control**: Track custom setups in git
3. **Document overrides**: Explain why you disabled or modified defaults
4. **Regular updates**: Sync with claude-code-kit updates

---

## Troubleshooting

### Setup Not Found

```
Setup not found: mysetup
```

**Solution**: List available setups with `cck setup list`

### File Already Exists

```
File CLAUDE.md already exists. Overwrite?
```

**Solution**: Use `--force` to skip confirmation or `--output` for different path

### Invalid Setup Name

```
Name must be lowercase, start with letter, contain only letters, numbers, and hyphens
```

**Solution**: Use lowercase name like `my-setup` instead of `mySetup`

### Cannot Delete Built-in Setup

```
Cannot delete builtin setups
```

**Solution**: Built-in setups (minimal, fullstack, etc.) are protected. Create a custom setup instead.

### Import Fails

```
Setup already exists with this name
```

**Solution**: Use a different name or delete the existing setup first

---

## Summary

Setup templates provide a powerful way to configure Claude for different development contexts. Whether you're building a React app, training ML models, managing infrastructure, or working in an enterprise environment, there's a setup tailored to your needs. Combine setups with `--extend` for maximum flexibility, and create custom setups to standardize patterns across your team.
