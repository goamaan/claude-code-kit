# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-22

Initial release of Claude Code Kit - a configuration and setup management layer for Claude Code.

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
  - `ck profile list` - List all profiles with status
  - `ck profile use <name>` - Switch active profile
  - `ck profile create <name>` - Create new profile
  - `ck profile create <name> --from <base>` - Create from template
  - `ck profile delete <name>` - Remove profile
  - `ck profile export <name>` - Export for sharing
  - `ck profile import <url|file>` - Import profile

- **Setup Commands**
  - `ck setup list` - List available setups
  - `ck setup info <name>` - Show setup details
  - `ck setup use <name>` - Apply setup
  - `ck setup use <name> --extend <other>` - Apply with extensions
  - `ck setup create <name>` - Create custom setup
  - `ck setup create <name> --from <a> <b>` - Combine setups
  - `ck setup export <name>` - Export setup
  - `ck setup import <url|file>` - Import setup

- **Addon Commands**
  - `ck addon list` - List installed addons
  - `ck addon search <query>` - Search registry
  - `ck addon info <name>` - Show addon details
  - `ck addon install <name|github:repo|path>` - Install addon
  - `ck addon update <name>` - Update addon
  - `ck addon update --all` - Update all addons
  - `ck addon remove <name>` - Uninstall addon
  - `ck addon create <name>` - Scaffold new addon
  - `ck addon publish <name>` - Publish to registry

- **Configuration Commands**
  - `ck config init` - Interactive setup wizard
  - `ck config edit` - Open config in $EDITOR
  - `ck config show` - Display merged config
  - `ck config validate` - Validate all configs
  - `ck config export --format json|toml|csv` - Export config

- **MCP Commands**
  - `ck mcp list` - List MCP servers
  - `ck mcp enable <name>` - Enable server
  - `ck mcp disable <name>` - Disable server
  - `ck mcp install <package>` - Install new MCP
  - `ck mcp budget` - Show context budget

- **Cost Commands**
  - `ck cost` - Today's cost summary
  - `ck cost today` - Detailed today's usage
  - `ck cost week` - Weekly breakdown
  - `ck cost month` - Monthly breakdown
  - `ck cost budget set <amount>` - Set daily budget
  - `ck cost export --format csv|json` - Export cost data

- **Hook Commands**
  - `ck hook list` - List active hooks
  - `ck hook debug <event>` - Debug hook execution
  - `ck hook template list` - List hook templates
  - `ck hook template apply <name>` - Apply template

- **System Commands**
  - `ck sync` - Sync config to ~/.claude
  - `ck sync --dry-run` - Preview changes
  - `ck doctor` - Run diagnostic checks
  - `ck doctor --fix` - Auto-fix issues
  - `ck install` - Full installation
  - `ck upgrade` - Upgrade to latest version
  - `ck uninstall` - Clean uninstall

#### Architecture & Infrastructure

- **TypeScript Implementation**
  - Full TypeScript codebase with strict type checking
  - Type-safe configuration with Zod schemas
  - Async/await patterns throughout
  - Module-based architecture

- **Configuration System**
  - Layered configuration merging:
    - Global (~/.claude-kit/config.toml)
    - Profile-specific (~/.claude-kit/profiles/<name>/config.toml)
    - Project-level (.claude-kit/config.toml)
    - Environment variable overrides
  - TOML configuration format with @ltd/j-toml parser
  - Configuration inheritance and extends support
  - Configuration validation with Zod schemas
  - Cosmiconfig for config file discovery

- **Build & Distribution**
  - tsdown bundler (Rolldown-powered)
  - ESM-first module output
  - CLI entry points:
    - `claude-code-kit` - Full command
    - `cck` - Short alias
    - `ck` - Ultra-short alias
  - Binary distribution ready
  - npm package publishing

- **Testing Infrastructure**
  - Vitest test runner with native ESM support
  - Unit, integration, and E2E test organization
  - Test fixtures and helpers
  - Coverage tracking with @vitest/coverage-v8
  - 80%+ code coverage threshold

- **Storage Structure**
  - Global configuration at `~/.claude-kit/`
    - `config.toml` - Main settings
    - `active-profile` - Current profile tracking
    - `profiles/` - Profile configurations
    - `setups/` - Downloaded/custom setups
    - `addons/` - Installed addons
    - `cache/` - Cached registry and costs
    - `secrets.toml` - Sensitive credentials (gitignored)
  - Project-level at `.claude-kit/`
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
