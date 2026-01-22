<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# setups/

## Purpose

Pre-packaged configuration templates for common development workflows. Each setup provides a complete Claude Code configuration (CLAUDE.md) with best practices, recommended addons, and workflow-specific instructions.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `backend/` | Backend development setup (APIs, databases, servers) |
| `data/` | Data science/engineering setup (analysis, pipelines, ML) |
| `devops/` | DevOps/infrastructure setup (CI/CD, containers, IaC) |
| `enterprise/` | Enterprise setup (security, compliance, large teams) |
| `frontend/` | Frontend development setup (React, Vue, UI components) |
| `fullstack/` | Full-stack development setup (combines frontend + backend) |
| `minimal/` | Minimal setup (barebones starting point) |

## For AI Agents

### Working In This Directory

- **Setup structure**: Each setup contains `manifest.toml` (metadata) + `CLAUDE.md` (Claude instructions) + optional addons
- **Installation**: Setups installed via `claude-code-kit setup install <name>`
- **Customization**: Users can modify CLAUDE.md after installation
- **Inheritance**: Setups can inherit from other setups (e.g., fullstack inherits frontend + backend)

### Testing Requirements

- Test setup installation to temporary directories
- Test manifest.toml parsing and validation
- Verify CLAUDE.md is valid markdown
- Test addon dependencies are resolved
- Test setup inheritance chains

### Common Patterns

- **Setup manifest**: `manifest.toml` with name, version, description, addons, base_setup
- **Claude instructions**: `CLAUDE.md` with workflow-specific guidance for Claude Code
- **Addon dependencies**: List required addons in manifest
- **Base setup**: Reference another setup to inherit from (optional)
- **Documentation**: Include usage examples and best practices in CLAUDE.md

## Dependencies

### Internal
- `src/domain/setup` - Setup installer
- `src/types/setup` - Setup schema
- `src/domain/addon` - Addon resolution

### External
- `@iarna/toml` - TOML parsing for manifest.toml

<!-- MANUAL -->
