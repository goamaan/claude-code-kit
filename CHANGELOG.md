# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-23

### Breaking Changes

This release makes claudeops fully self-contained by removing the dependency on oh-my-claudecode and consolidating agents and skills.

#### Agent Changes

**Reduced from 35 to 12 agents:**

| Category | Kept | Archived |
|----------|------|----------|
| Core | architect, executor, executor-low, explore | architect-low, architect-medium, executor-high, explore-medium |
| Specialized | designer, qa-tester, security, vision | designer-low, designer-high, qa-tester-high, scientist-*, build-fixer-*, tdd-guide-*, code-reviewer-*, analyst, oracle |
| Planning | planner, critic, writer, researcher | researcher-low, *-expert agents |

**Agent Prefix Change:** `oh-my-claudecode:` → `claudeops:`

Example migration:
```typescript
// Before
Task(subagent_type="oh-my-claudecode:architect", ...)

// After
Task(subagent_type="claudeops:architect", ...)
```

**Capability Absorption:**
- `architect` now includes code review capabilities
- `qa-tester` now includes TDD workflow facilitation
- `executor` now includes build error diagnosis

**Renamed Agent:**
- `security-reviewer` → `security` (use `claudeops:security`)

#### Skill Changes

**Reduced from 15 to 6 skills:**

| Kept | Archived (merged into orchestrate) |
|------|-------------------------------------|
| orchestrate, autopilot, planner | ralph, ultrawork, analyze, deepsearch |
| git-master, frontend-ui-ux, doctor | code-review, research, tdd, profile, help |

**Ralph Philosophy Merged:** The verification-before-completion and persistence philosophy from `ralph` is now built into the core `orchestrate` skill.

#### Setup Manifest Changes

The `requires.oh-my-claudecode` field is now deprecated:

```toml
# Before (v1.x)
[requires]
oh-my-claudecode = ">=3.3.0"
addons = ["rm-rf-guard"]

# After (v2.0)
[requires]
addons = ["rm-rf-guard"]
# oh-my-claudecode field ignored (kept for backward compatibility)
```

All built-in setups have been updated to v2.0.0 with the new agent/skill references.

### Added

- **Native Claude Code Integration**: Leverages Claude Code's native Task tool (TaskCreate, TaskUpdate, TaskGet, TaskList), background execution (`run_in_background: true`), and `/plan` mode
- **Full Task System Documentation**: Added comprehensive Task dependency management (addBlockedBy/addBlocks), agent assignment via owner field, task persistence via CLAUDE_CODE_TASK_LIST_ID, and task storage location (~/.claude/tasks/)
- **Self-contained Orchestration**: 12 specialized agents and 6 focused skills built directly into claudeops
- **Streamlined Model Routing**: haiku/sonnet/opus routing with explicit `model` parameter support

### Changed

- Setup manifests now use v2.0.0 schema
- Doctor diagnostics no longer check for oh-my-claudecode installation
- Settings generator no longer references oh-my-claudecode plugin

### Deprecated

- `requires.oh-my-claudecode` field in setup manifests (ignored, kept for compatibility)

### Removed

- External oh-my-claudecode dependency
- 23 redundant agent definitions (archived to `.archive/agents/`)
- 9 redundant skill definitions (archived to `.archive/skills/`)

### Migration

See [docs/MIGRATION-v2.md](docs/MIGRATION-v2.md) for detailed migration instructions.

---

## [0.1.0] - 2026-01-22

Initial release of claudeops - a configuration and setup management layer for Claude Code.

### Added

#### Core Features

- **Profile Management System**
  - Create, list, switch, and delete named profiles
  - Profile inheritance with `extends` field for configuration reuse
  - Profile cloning from existing profiles
  - Import/export profiles in TOML and JSON formats
  - Per-profile CLAUDE.md instructions
  - Active profile tracking and persistence

- **Setup Templates**
  - 7 pre-built setups for different workflows:
    - `minimal` - Clean slate with essentials
    - `fullstack` - Full-stack web development (React + Node.js)
    - `frontend` - Frontend-focused (React/Vue/Svelte)
    - `backend` - Backend-focused (API patterns, databases)
    - `data` - Data science and ML workflows
    - `devops` - Infrastructure and CI/CD
    - `enterprise` - Strict compliance and security
  - Setup inheritance with composition support
  - Custom CLAUDE.md content per setup
  - Setup-specific hook templates
  - Setup manifest format with version constraints
  - Combine multiple setups for hybrid configurations

- **Addon System**
  - Install addons from multiple sources:
    - Local file paths
    - GitHub repositories (via `github:org/repo` syntax)
    - Official registry
  - Hook injection support with event types:
    - `PreToolUse` - Execute before tool invocation
    - `PostToolUse` - Execute after tool invocation
    - `Stop` - Execute on stop events
    - `SubagentStop` - Execute on subagent stop events
  - Custom configuration options per addon
  - Post-install scripts for setup and initialization
  - Addon manifest format with dependencies
  - Remove and update installed addons
  - Built-in safety addons:
    - `rm-rf-guard` - Prevents destructive file deletions
    - `safety-net` - Blocks dangerous git operations
    - `claude-ignore` - .claudeignore file support

- **MCP Server Management**
  - Add, remove, enable, and disable MCP servers
  - Server configuration with command, arguments, environment variables
  - Timeout configuration per server
  - Context budget tracking
  - Maximum enabled server limits
  - MCP server status and health checks

- **Cost Tracking**
  - Token usage tracking per model:
    - Haiku, Sonnet, Opus, and custom models
  - Daily, weekly, and monthly budget management
  - Budget threshold alerts
  - Cost data export in multiple formats:
    - CSV for spreadsheet analysis
    - JSON for programmatic access
    - JSONL for logging and streaming
  - Historical cost aggregation and reporting

- **Hook System**
  - Hook composition from multiple sources:
    - Addon-provided hooks
    - Setup-included hooks
    - Custom user hooks
  - Priority-based hook ordering
  - Pattern matching for conditional hook execution
  - Hook debugging and execution tracing
  - Hook template library
  - Support for TypeScript hook handlers

- **Configuration Sync Engine**
  - Sync merged config to `~/.claude/settings.json`
  - Sync setup CLAUDE.md to `~/.claude/CLAUDE.md`
  - Managed sections that preserve user content
  - Automatic backup creation before sync
  - Diff mode to preview changes before applying
  - Validation of synced configuration
  - Auto-sync on profile changes (configurable)
  - Watch mode for live configuration updates

- **Model Routing**
  - Default model selection (Haiku, Sonnet, Opus)
  - Complexity-based routing:
    - Simple tasks → Haiku
    - Standard tasks → Sonnet
    - Complex tasks → Opus
  - Per-agent model overrides
  - Model-specific configuration options

- **Doctor Diagnostics Tool**
  - Configuration validation:
    - TOML syntax checking
    - Schema compliance
    - Missing required fields
  - Installation checks:
    - Verify oh-my-claudecode installation
    - Check Node.js/Bun version
    - Validate directory structure
  - Auto-fix capabilities:
    - Create missing directories
    - Repair invalid configurations
    - Initialize default profiles
    - Backup before repairs

#### CLI Commands

- **Profile Commands**
  - `co profile list` - List all profiles with status
  - `co profile use <name>` - Switch active profile
  - `co profile create <name>` - Create new profile
  - `co profile create <name> --from <base>` - Create from template
  - `co profile delete <name>` - Remove profile
  - `co profile export <name>` - Export for sharing
  - `co profile import <url|file>` - Import profile

- **Setup Commands**
  - `co setup list` - List available setups
  - `co setup info <name>` - Show setup details
  - `co setup use <name>` - Apply setup
  - `co setup use <name> --extend <other>` - Apply with extensions
  - `co setup create <name>` - Create custom setup
  - `co setup create <name> --from <a> <b>` - Combine setups
  - `co setup export <name>` - Export setup
  - `co setup import <url|file>` - Import setup

- **Addon Commands**
  - `co addon list` - List installed addons
  - `co addon search <query>` - Search registry
  - `co addon info <name>` - Show addon details
  - `co addon install <name|github:repo|path>` - Install addon
  - `co addon update <name>` - Update addon
  - `co addon update --all` - Update all addons
  - `co addon remove <name>` - Uninstall addon
  - `co addon create <name>` - Scaffold new addon
  - `co addon publish <name>` - Publish to registry

- **Configuration Commands**
  - `co config init` - Interactive setup wizard
  - `co config edit` - Open config in $EDITOR
  - `co config show` - Display merged config
  - `co config validate` - Validate all configs
  - `co config export --format json|toml|csv` - Export config

- **MCP Commands**
  - `co mcp list` - List MCP servers
  - `co mcp enable <name>` - Enable server
  - `co mcp disable <name>` - Disable server
  - `co mcp install <package>` - Install new MCP
  - `co mcp budget` - Show context budget

- **Cost Commands**
  - `co cost` - Today's cost summary
  - `co cost today` - Detailed today's usage
  - `co cost week` - Weekly breakdown
  - `co cost month` - Monthly breakdown
  - `co cost budget set <amount>` - Set daily budget
  - `co cost export --format csv|json` - Export cost data

- **Hook Commands**
  - `co hook list` - List active hooks
  - `co hook debug <event>` - Debug hook execution
  - `co hook template list` - List hook templates
  - `co hook template apply <name>` - Apply template

- **System Commands**
  - `co sync` - Sync config to ~/.claude
  - `co sync --dry-run` - Preview changes
  - `co doctor` - Run diagnostic checks
  - `co doctor --fix` - Auto-fix issues
  - `co install` - Full installation
  - `co upgrade` - Upgrade to latest version
  - `co uninstall` - Clean uninstall

#### Architecture & Infrastructure

- **TypeScript Implementation**
  - Full TypeScript codebase with strict type checking
  - Type-safe configuration with Zod schemas
  - Async/await patterns throughout
  - Module-based architecture

- **Configuration System**
  - Layered configuration merging:
    - Global (~/.claudeops/config.toml)
    - Profile-specific (~/.claudeops/profiles/<name>/config.toml)
    - Project-level (.claudeops/config.toml)
    - Environment variable overrides
  - TOML configuration format with @ltd/j-toml parser
  - Configuration inheritance and extends support
  - Configuration validation with Zod schemas
  - Cosmiconfig for config file discovery

- **Build & Distribution**
  - tsdown bundler (Rolldown-powered)
  - ESM-first module output
  - CLI entry points:
    - `claudeops` - Full command
    - `cops` - Short alias
    - `co` - Ultra-short alias
  - Binary distribution ready
  - npm package publishing

- **Testing Infrastructure**
  - Vitest test runner with native ESM support
  - Unit, integration, and E2E test organization
  - Test fixtures and helpers
  - Coverage tracking with @vitest/coverage-v8
  - 80%+ code coverage threshold

- **Storage Structure**
  - Global configuration at `~/.claudeops/`
    - `config.toml` - Main settings
    - `active-profile` - Current profile tracking
    - `profiles/` - Profile configurations
    - `setups/` - Downloaded/custom setups
    - `addons/` - Installed addons
    - `cache/` - Cached registry and costs
    - `secrets.toml` - Sensitive credentials (gitignored)
  - Project-level at `.claudeops/`
    - `config.toml` - Project overrides
    - `team.toml` - Team shared configuration
    - `local.toml` - Personal project config (gitignored)
    - `setup.toml` - Project setup configuration
  - Generated at `~/.claude/` (by sync):
    - `settings.json` - Merged configuration
    - `CLAUDE.md` - Active instructions
    - `skills/` - Symlinked from setup
    - `hooks/` - Merged from addons and setup
    - `plugins/oh-my-claudecode/` - Managed by claude-kit

#### Documentation

- Comprehensive PLAN.md with architecture overview
- Setup manifest documentation
- Addon manifest and development guide
- CLI command reference
- Configuration file examples
- Sample workflows and use cases
- Testing strategy documentation
- Implementation roadmap with test-driven approach
- Technology stack documentation

### Technical Details

- **Runtime Requirements**
  - Node.js 20.0.0 or higher
  - Bun 1.1+ (optional, for faster execution)

- **Dependencies**
  - @clack/prompts - Interactive CLI prompts
  - @ltd/j-toml - TOML parsing
  - citty - CLI framework
  - cosmiconfig - Config file discovery
  - listr2 - Task progress display
  - picocolors - Terminal colors
  - semver - Version comparison
  - tar - Archive handling
  - zod - Schema validation

- **Dev Dependencies**
  - TypeScript 5.7.2 - Language and type checking
  - Vitest 2.1.8 - Test framework
  - tsdown 0.19.0 - Build tool
  - ESLint 9.17.0 - Code linting
  - Prettier 3.4.2 - Code formatting

### Known Limitations

- oh-my-claudecode 3.3.0+ required for full feature compatibility
- Configuration sync may overwrite unmanaged sections in ~/.claude/CLAUDE.md
- Some addons may have platform-specific requirements

### Breaking Changes

None - Initial release.

---

## Future Versions

Planned features for future releases:

- Team dashboard for shared profile management
- Web-based configuration UI
- Integration with GitHub organizations
- Automated onboarding workflows
- Performance metrics and optimization suggestions
- Advanced hook composition and middleware
- Addon marketplace with ratings and reviews
- Configuration diff visualization
