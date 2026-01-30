## [3.2.0] - 2026-01-29

### Added

#### Setup Consolidation into Profiles
- **Setups have been consolidated into the profile system**
  - All configuration previously split across setups and profiles now lives in profiles
  - Profile `content` field replaces setup CLAUDE.md content
  - Profile `extends` provides inheritance (previously done via setup extends)
  - Removed `src/domain/setup/`, `src/commands/setup.ts`, and `setups/` directory
  - Deleted `docs/setups.md` documentation

#### Reset Command
- **New `cops reset` command to remove claudeops-generated artifacts**
  - Removes managed sections from CLAUDE.md while preserving user content
  - Cleans claudeops hooks and metadata from settings.json
  - Removes claudeops-generated skill files
  - Supports `--global`, `--all`, `--force`, and `--dry-run` flags

#### Native Swarm Integration
- **Multi-agent task orchestration built on Claude Code Teams**
  - Custom swarm engine replaced with Claude Code's native task system
  - New `cops init` command for zero-config project setup
  - New `cops swarm` command with subcommands: status, tasks, init, stop, history
  - Task dependency graph with topological sorting and parallel execution groups
  - Worker spawner with model selection based on task complexity
  - Per-task cost tracking and state persistence

#### New Skills
- `review` - Pull request and code review workflows
- `debug` - Systematic debugging methodology
- `testing` - Test strategy and execution
- `security-audit` - Comprehensive security auditing
- `scan` - Codebase scanning and detection

#### Hook Metadata Tags
- Hooks now use JSDoc metadata tags (`@Hook`, `@Event`, `@Matcher`, `@Enabled`, `@Description`, `@Priority`, `@Timeout`, `@Async`)
- New `cops hook add` command for AI-generated hooks
- Hook count increased to 18 (8 enabled-by-default, 10 disabled-by-default)
- New hooks: `version-bump-prompt`, `team-lifecycle`, `swarm-cost-tracker`

### Fixed

#### Bundled Path Resolution
- Use `findPackageRoot()` for resolving bundled asset paths (skills, hooks)
- Fixes path resolution when running from `node_modules` or bundled distribution

#### TOML Multiline Parsing
- Added `joiner` option to `@ltd/j-toml` parser for correct multiline string handling
- Triple-quoted strings (`"""`) in TOML profiles now preserve line breaks

#### CI Fixes
- Use `bun run test` instead of `bun test` for vitest runner compatibility
- Use bracket notation for index signature access in detectors (TypeScript strict mode)
- Postbuild sync script made resilient for CI environments

### Changed
- README rewrite with updated documentation
- Auto-sync postbuild script for distribution
- Enhanced orchestrate skill with conductor/worker patterns
- Router types extended with swarm recommendation
- Updated cost tracker for per-task cost tracking

---

## [3.1.0] - 2026-01-25

### Added

#### Preferred Package Manager Support
- Add global and per-project package manager preference (npm, yarn, pnpm, bun)
- Priority chain: project config > global config > lockfile detection > npm (default)
- New CLI command: `cops config pm` with subcommands:
  - `cops config pm show` - Display current package manager settings
  - `cops config pm set <pm>` - Set project-level preference
  - `cops config pm set <pm> -g` - Set global preference
  - `cops config pm detect` - Auto-detect from lockfile
- CLAUDE.md generator includes package manager instructions
- All hooks respect configured package manager
- Upgrade command uses configured package manager

#### Skills Library (21 skills)
- 15 new skills added (21 total): executor variants, architect, analyze, qa-tester, tdd, security, writer, researcher, explore, deepsearch, critic, code-review, typescript-expert
- Each skill has YAML frontmatter with auto-trigger patterns and domains
- Appropriate model tier assignment (haiku/sonnet/opus)
- New CLI commands:
  - `cops skill list` - List installed skills
  - `cops skill install NAME [--from URL]` - Install skills
  - `cops skill enable/disable NAME` - Toggle skills
  - `cops skill info NAME` - Show skill details
  - `cops skill sync` - Sync to Claude Code

#### Hooks Library (13 hooks)
- cost-warning.mjs - Warn when approaching daily cost budget
- security-scan.mjs - Scan for secrets before commits
- test-reminder.mjs - Remind to run tests after code changes
- format-on-save.mjs - Auto-format files after write
- git-branch-check.mjs - Warn when on protected branches
- lint-changed.mjs - Lint files after modifications
- typecheck-changed.mjs - Type check after modifications
- todo-tracker.mjs - Track TODO items in prompts
- session-log.mjs - Log session summary on stop
- large-file-warning.mjs - Warn before reading large files
- New CLI commands:
  - `cops hook list` - List active hooks
  - `cops hook debug` - Debug hook execution
  - `cops hook test` - Test hook functionality

#### Profile System Enhancements
- Profile inheritance via `extends` field
- Project-level overrides (.claudeops/profile.toml)
- 8 profile templates: minimal, frontend, backend, fullstack, security, devops, python, typescript
- `resolveProfile()` with inheritance chain resolution
- `getWithOverrides()` for project-specific settings

#### Error Handling Improvements
- ClaudeOpsError class with context and suggestions
- Error categorization (CONFIG, NETWORK, FILE_SYSTEM, etc)
- Error factories for common scenarios
- Actionable error messages with next steps

#### Upgrade Command Enhancements
- Version change type detection (major/minor/patch)
- Breaking change warnings for major versions
- `--check` flag (check without installing)
- `--force` flag (skip confirmation)
- Changelog and release notes links

### Changed
- Removed pack module (commands, domain, types) - functionality merged elsewhere
- Enhanced hook command with library and management features
- Enhanced skill command with improved management
- Updated all skills with refinements
- CLI help organized into categories with examples

### Fixed
- Use compatible vitest mocking pattern for CI
- Use compatible assertion pattern for async no-throw tests
- VERSION test uses regex pattern

### Documentation
- New comprehensive `docs/ARCHITECTURE.md` covering entire codebase
  - Core systems: classifier, router, guardrails, config, sync, doctor
  - Domain modules: profile, setup, addon, hook, skill, mcp, cost, state
  - Data flow, directory structure, and extension points
- Removed 23 outdated documentation files:
  - Root: AGENTS.md, IMPROVEMENTS.md
  - docs/: ARCHITECTURE-V3.md, IMPLEMENTATION-PLAN.md, MIGRATION.md, PACKS.md, old ARCHITECTURE.md
  - src/**/AGENTS.md files (16 files across subdirectories)

---

## [3.0.0] - 2026-01-23

### Added

#### Semantic Intent Classification
- Replace keyword-based modes with semantic intent classification
- AI-powered classification of user prompts into intents:
  - research, implementation, debugging, review, planning, refactoring, maintenance, conversation
- Complexity detection (trivial, simple, moderate, complex, architectural)
- Domain detection (frontend, backend, database, devops, security, testing, documentation, general)
- Signal detection (wantsPersistence, wantsSpeed, wantsAutonomy, wantsPlanning, wantsVerification, wantsThorough)

#### Intelligent Routing
- Agent selection based on intent and complexity
- Model tier selection (haiku/sonnet/opus) based on task requirements
- Parallelism determination for multi-agent workflows
- Verification requirements based on task type

#### Guardrails Layer
- Deletion protection for important files and directories
- Secret scanning before commits
- Dangerous command detection and warnings
- Configurable guardrail rules

#### Hook Scripts
- Cross-platform Node.js hooks for Claude Code integration
- PreToolUse and PostToolUse hook types
- Configurable hook priorities and patterns

### Changed
- Remove "ultrawork" and "autopilot" terminology
- Modernize agent orchestration approach
- Update documentation with v3 architecture

### Documentation
- ~~docs/ARCHITECTURE-V3.md - Full architecture specification~~ (superseded by docs/ARCHITECTURE.md in v3.1.0)
- ~~docs/MIGRATION.md - v2 to v3 migration guide~~ (removed in v3.1.0)
- Updated README and setup templates

---

## [2.0.1](https://github.com/goamaan/claudeops/compare/v2.0.0...v2.0.1) (2026-01-23)

### ⚠ BREAKING CHANGES

* Remove backward compatibility for oh-my-claudecode

- Delete 23 archived agent definitions (.archive/agents/)
- Delete 9 archived skill definitions (.archive/skills/)
- Delete .omc state directory
- Delete MIGRATION-v2.md guide
- Delete PLAN.md planning document
- Remove oh-my-claudecode field from type definitions
- Remove oh-my-claudecode handling from setup merger
- Remove omcVersion from doctor diagnostics
- Update all agent/skill files to use v2.0 patterns
- Fix archived agent references (analyst, executor-high, etc.)
- Replace TodoWrite/TodoRead with TaskCreate/TaskUpdate
- Fix AskUserQuestion tool usage in planner skill
- Update documentation examples

Co-Authored-By: Claude <noreply@anthropic.com>

### Bug Fixes

* **ci:** add NPM_TOKEN for npm publish authentication ([d7ee999](https://github.com/goamaan/claudeops/commit/d7ee99950ccd27d60080c1bb1e6f811f8d0f2e2d))
* **ci:** configure npm OIDC trusted publishing correctly ([e320d02](https://github.com/goamaan/claudeops/commit/e320d0235928d1fb1573caa73a9c51984a10d034))
* **ci:** match semantic-release recommended workflow for trusted publishing ([845954e](https://github.com/goamaan/claudeops/commit/845954e95ceec1561600ec057dfef2472219b3cb))
* **ci:** use Node.js 22 for semantic-release ([84e8250](https://github.com/goamaan/claudeops/commit/84e82506911f5b59561fb063f713643575bd74c0))
* update addon test for bun compatibility ([108e4e8](https://github.com/goamaan/claudeops/commit/108e4e86a2a248f9eb76ff5c74310eb0412bc935))

### Code Refactoring

* remove all legacy oh-my-claudecode references and archived code ([b1414d5](https://github.com/goamaan/claudeops/commit/b1414d563d60484607c01508625534ff17b086c5))

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

The `requires.oh-my-claudecode` field has been removed:

```toml
# v2.0 format
[requires]
addons = ["rm-rf-guard"]
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

### Removed

- External oh-my-claudecode dependency and all references
- 23 redundant agent definitions (executor-high, architect-low, etc.)
- 9 redundant skill definitions (ralph, ultrawork, tdd, etc.)
- `requires.oh-my-claudecode` field from manifests

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

#### Documentation
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
