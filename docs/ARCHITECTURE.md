# claudeops Architecture

> Batteries-included Claude Code enhancement toolkit - orchestration, guardrails, profiles, and configuration management.

**Version:** 3.2.0
**Last Updated:** 2026-01-25

---

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Entry Points](#entry-points)
4. [Core Modules](#core-modules)
5. [Domain Modules](#domain-modules)
6. [CLI Commands](#cli-commands)
7. [Type System](#type-system)
8. [Configuration System](#configuration-system)
9. [Sync Engine](#sync-engine)
10. [Skills & Hooks](#skills--hooks)
11. [Storage Locations](#storage-locations)
12. [Data Flow](#data-flow)
13. [Dependencies](#dependencies)
14. [Testing](#testing)

---

## Overview

claudeops is a configuration and sync layer for Claude Code that provides:

- **Profile Management** - Named configurations with inheritance for different projects/contexts
- **Skills Library** - 25 specialized skills for different development tasks
- **Hooks System** - 18 hooks for workflow automation and safety checks
- **Configuration Sync** - Seamless integration with Claude Code via CLAUDE.md and settings.json

---

## Project Structure

```
claudeops/
├── src/                          # TypeScript source
│   ├── cli.ts                    # CLI entry point (citty-based)
│   ├── index.ts                  # Library entry point
│   ├── commands/                 # CLI subcommands (6 commands)
│   ├── core/                     # Core business logic
│   │   ├── config/               # Config loading/merging
│   │   ├── doctor/               # Diagnostics
│   │   └── sync/                 # Claude Code sync
│   ├── domain/                   # Domain modules
│   │   ├── hook/                 # Hook management
│   │   ├── profile/              # Profile management
│   │   └── skill/                # Skill management
│   ├── types/                    # Zod schemas & TypeScript types
│   ├── ui/                       # Terminal UI (output, prompts)
│   └── utils/                    # Shared utilities
├── skills/                       # Built-in skills (25 directories)
├── hooks/                        # Built-in hooks (18 .mjs files)
├── tests/                        # Test files
│   ├── helpers/                  # Test utilities
│   ├── integration/              # Integration tests
│   └── unit/                     # Unit tests
└── dist/                         # Build output (ESM)
```

---

## Entry Points

### CLI Entry (`src/cli.ts`)

The CLI uses the `citty` framework and exposes three binary names: `claudeops`, `cops`, `co`.

```typescript
const main = defineCommand({
  meta: { name: "claudeops", version: VERSION },
  subCommands: {
    init, sync, doctor, reset, upgrade, profile
  },
});
```

### Library Entry (`src/index.ts`)

Exports public APIs for programmatic use:

```typescript
export const VERSION = "3.2.0";
export const NAME = "claudeops";

// Domain APIs
export { createSkillManager } from './domain/skill';
export { createHookManager } from './domain/hook';
export { createProfileManager } from './domain/profile';
```

---

## Core Modules

### Config (`src/core/config/`)

Multi-layer configuration with TOML parsing and Zod validation.

**Files:**
- `parser.ts` - TOML parsing with @ltd/j-toml
- `merger.ts` - Deep merge and inheritance resolution
- `loader.ts` - Config file discovery and loading

**Layer Precedence (lowest to highest):**
1. Default - Hardcoded defaults
2. Global - `~/.claudeops/config.toml`
3. Profile - `~/.claudeops/profiles/{name}/config.toml`
4. Project - `.claudeops/config.toml`
5. Local - `.claudeops/local.toml` (gitignored)

### Sync (`src/core/sync/`)

Synchronizes configuration to Claude Code. The sync engine reads the merged profile configuration directly (no MergedSetup dependency) and generates output files.

**Files:**
- `engine.ts` - Main sync orchestration
- `claudemd-generator.ts` - CLAUDE.md generation
- `settings-generator.ts` - settings.json generation
- `backup.ts` - Backup/restore functionality

**Path Resolution:** The sync engine uses `findPackageRoot()` to locate bundled assets (skills, hooks) relative to the package root rather than relying on `__dirname`. This ensures correct path resolution whether running from source, bundled distribution, or within a `node_modules` tree.

**TOML Parsing:** When parsing TOML files with multiline strings (triple-quoted `"""`), the `@ltd/j-toml` parser requires the `joiner` option set to `'\n'` to preserve line breaks correctly.

**What Gets Synced:**
- `~/.claude/settings.json` - Hooks and permissions
- `~/.claude/CLAUDE.md` - Instructions with managed sections
- `~/.claude/skills/` - Skill definitions

---

## Domain Modules

### Profile (`src/domain/profile/`)

Profile management with inheritance support.

**Interface:**
```typescript
interface ProfileManager {
  list(): Promise<ProfileSummary[]>;
  active(): Promise<string>;
  get(name: string): Promise<ProfileDetails>;
  create(name: string, options?: CreateProfileOptions): Promise<void>;
  use(name: string): Promise<void>;
  delete(name: string): Promise<void>;
}
```

**Inheritance:** Profiles can extend other profiles via `extends` field. Resolution is recursive with circular detection.

### Hook (`src/domain/hook/`)

Hook loading, composition, and sync.

**Hook Events:**
- `UserPromptSubmit` - Before user prompt processed
- `PreToolUse` - Before tool execution
- `PostToolUse` - After tool execution
- `Stop` - When Claude stops
- `SubagentStop` - When subagent completes

**Hook Script Format:**
```javascript
/**
 * Hook: my-guard
 * Event: PreToolUse
 * Matcher: Bash
 * Priority: 100
 */
// Hook logic...
```

### Skill (`src/domain/skill/`)

Skill loading and sync to Claude Code.

**Skill Format (Markdown with YAML frontmatter):**
```markdown
---
name: my-skill
description: A custom skill
auto_trigger: ["deploy", "build"]
domains: ["backend"]
model: opus
---

# Skill Content
Instructions for Claude...
```

---

## CLI Commands

| Command | Purpose |
|---------|---------|
| `cops init` | Zero-config project setup |
| `cops sync` | Sync config to Claude Code |
| `cops profile` | Profile operations (list, use, create, delete) |
| `cops doctor` | Diagnostic checks |
| `cops reset` | Remove claudeops-generated artifacts |
| `cops upgrade` | Self-update |

---

## Type System

All types use Zod schemas for runtime validation.

### Core Schemas (`src/types/config.ts`)

```typescript
export const ModelNameSchema = z.enum(['haiku', 'sonnet', 'opus']);
export const PackageManagerSchema = z.enum(['npm', 'yarn', 'pnpm', 'bun']);

export const ProfileFileConfigSchema = z.object({
  name: z.string(),
  extends: z.string().optional(),
  skills: ProfileSkillsConfigSchema.optional(),
  hooks: ProfileHooksConfigSchema.optional(),
  agents: ProfileAgentsConfigSchema.optional(),
  model: ModelConfigSchema.optional(),
  packageManager: PackageManagerSchema.optional(),
});
```

### MergedConfig

The final resolved configuration combining all layers:

```typescript
interface MergedConfig {
  profile: { name: string; source: string };
  model: { default: ModelName; routing: ModelRouting };
  skills: { enabled: string[]; disabled: string[] };
  hooks: { enabled: string[]; disabled: string[] };
  agents: Record<string, { model?: ModelName; priority?: number }>;
  mcp: { enabled: string[]; disabled: string[] };
  packageManager?: PackageManager;
}
```

---

## Configuration System

### Config Files

| File | Location | Purpose |
|------|----------|---------|
| Global config | `~/.claudeops/config.toml` | User-wide settings |
| Profile config | `~/.claudeops/profiles/<name>/config.toml` | Profile-specific |
| Project config | `.claudeops/config.toml` | Project-specific |
| Local config | `.claudeops/local.toml` | Personal (gitignored) |

### Example Config

```toml
[profile]
name = "my-project"
extends = "fullstack"

[model]
default = "sonnet"

[model.routing]
simple = "haiku"
complex = "opus"

[skills]
enabled = ["executor", "architect", "qa-tester"]
disabled = ["autopilot"]

[agents.executor]
model = "opus"

[mcp]
enabled = ["github", "filesystem"]

packageManager = "bun"
```

---

## Sync Engine

### Sync Flow

```
loadConfig() → MergedConfig
      ↓
resolveProfile() → ResolvedProfile (with content, skills, agents)
      ↓
composeHooks() → ComposedHooks
      ↓
generateSettings() + generateClaudeMd()
      ↓
Write to ~/.claude/
```

### CLAUDE.md Generation

The generated CLAUDE.md includes:

1. **Managed Section Markers** - Preserve user content outside markers
2. **Profile Information** - Active profile and configuration
3. **Model Configuration** - Default model and routing
4. **Package Manager** - Configured package manager commands
5. **Skills** - Enabled/disabled skills
6. **Hooks** - Active hooks

---

## Skills & Hooks

### Built-in Skills (25)

| Skill | Model | Purpose |
|-------|-------|---------|
| executor | sonnet | Standard implementations |
| executor-low | haiku | Simple boilerplate |
| architect | opus | Deep analysis, debugging |
| planner | opus | Strategic planning |
| critic | opus | Plan review |
| designer | sonnet | UI/UX design |
| qa-tester | sonnet | Testing, TDD |
| security | opus | Security audits |
| security-audit | opus | Comprehensive security auditing |
| explore | haiku | Codebase search |
| writer | haiku | Documentation |
| researcher | sonnet | External research |
| analyze | sonnet | Code analysis |
| autopilot | opus | Autonomous execution |
| orchestrate | opus | Multi-agent orchestration |
| code-review | opus | Code review |
| review | opus | Pull request and code review |
| debug | opus | Systematic debugging |
| testing | sonnet | Test strategy and execution |
| deepsearch | sonnet | Deep exploration |
| doctor | sonnet | Project diagnostics |
| frontend-ui-ux | sonnet | Frontend guidance |
| git-master | sonnet | Git expertise |
| tdd | sonnet | Test-driven development |
| typescript-expert | sonnet | TypeScript guidance |
| scan | sonnet | Codebase scanning |

### Built-in Hooks (18)

| Hook | Event | Default | Purpose |
|------|-------|---------|---------|
| continuation-check | Stop | Enabled | Block premature stopping |
| lint-changed | PostToolUse | Enabled | ESLint after edits |
| typecheck-changed | PostToolUse | Enabled | TypeScript check |
| checkpoint | Stop | Enabled | Git stash checkpoint |
| thinking-level | UserPromptSubmit | Enabled | Add reasoning instructions |
| keyword-detector | UserPromptSubmit | Enabled | Mode keyword detection |
| swarm-lifecycle | SubagentStop | Enabled | Swarm task completion tracking |
| version-bump-prompt | UserPromptSubmit | Enabled | Version bump considerations |
| cost-warning | UserPromptSubmit | Disabled | Budget warnings |
| security-scan | PreToolUse | Disabled | Secret scanning |
| test-reminder | PostToolUse | Disabled | Test reminders |
| format-on-save | PostToolUse | Disabled | Auto-formatting |
| git-branch-check | PreToolUse | Disabled | Protected branch warnings |
| todo-tracker | UserPromptSubmit | Disabled | TODO tracking |
| session-log | Stop | Disabled | Session logging |
| large-file-warning | PreToolUse | Disabled | Warn before reading large files |
| team-lifecycle | SubagentStop | Disabled | Team creation/shutdown logging |
| swarm-cost-tracker | PostToolUse | Disabled | Per-agent cost tracking |

---

## Storage Locations

### Global (`~/.claudeops/`)

```
~/.claudeops/
├── config.toml           # Global configuration
├── active-profile        # Active profile name
├── profiles/             # Profile configurations
│   └── <name>/
│       └── config.toml
├── skills/               # User skills
├── hooks/                # User hooks
└── backups/              # Sync backups
```

### Project (`.claudeops/`)

```
.claudeops/
├── config.toml           # Project configuration
└── local.toml            # Personal overrides (gitignored)
```

### Claude Code (`~/.claude/`)

```
~/.claude/
├── settings.json         # Synced settings
├── CLAUDE.md             # Synced instructions
└── skills/               # Synced skills
```

---

## Data Flow

### Configuration Flow

```
┌─────────────────────────────────────────────┐
│              Config Sources                  │
├─────────────┬─────────────┬─────────────────┤
│   Global    │   Profile   │    Project      │
└─────────────┴─────────────┴─────────────────┘
                    │
                    ▼
           ┌───────────────┐
           │  TOML Parser  │ ← @ltd/j-toml
           └───────────────┘
                    │
                    ▼
           ┌───────────────┐
           │ Zod Validator │
           └───────────────┘
                    │
                    ▼
           ┌───────────────┐
           │ Config Merger │ ← Inheritance resolution
           └───────────────┘
                    │
                    ▼
           ┌───────────────┐
           │ MergedConfig  │
           └───────────────┘
```

### Sync Flow

```
┌─────────────────────────────────────────────┐
│              MergedConfig                    │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│ Settings Gen  │       │ CLAUDE.md Gen │
└───────────────┘       └───────────────┘
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│ settings.json │       │  CLAUDE.md    │
└───────────────┘       └───────────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
           ┌───────────────┐
           │   ~/.claude/  │
           └───────────────┘
```

---

## Dependencies

### Runtime

| Package | Purpose |
|---------|---------|
| `@clack/prompts` | Interactive CLI prompts |
| `@ltd/j-toml` | TOML parsing |
| `citty` | CLI framework |
| `cosmiconfig` | Config discovery |
| `listr2` | Task progress |
| `picocolors` | Terminal colors |
| `semver` | Version comparison |
| `tar` | Archive handling |
| `zod` | Schema validation |

### Development

| Package | Purpose |
|---------|---------|
| `tsdown` | Build (esbuild-based) |
| `typescript` | Type checking |
| `vitest` | Testing |
| `eslint` | Linting |
| `prettier` | Formatting |

---

## Testing

### Framework

Vitest with native ESM support.

### Structure

```
src/
├── *.test.ts              # Unit tests (colocated)
tests/
├── helpers/               # Test utilities
├── integration/           # Integration tests
└── unit/                  # Standalone unit tests
```

### Commands

```bash
bun run test               # Run all tests
bun run test:watch         # Watch mode
bun run test:coverage      # With coverage
bun run verify             # typecheck + lint + test
```

### Coverage Thresholds

- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

---

## Factory Function Pattern

All domain modules use factory functions:

```typescript
// Profile
const profileManager = createProfileManager();

// Skills
const skillManager = createSkillManager({ skillsDir });

// Hooks
const hookManager = createHookManager({ hooksDir });
```

This pattern enables:
- Dependency injection for testing
- Lazy initialization
- Configuration at creation time

---

## Error Handling

Custom error classes with context and suggestions:

```typescript
class ClaudeOpsError extends Error {
  constructor(
    message: string,
    public readonly context?: string,
    public readonly suggestions: string[] = [],
    public readonly cause?: Error
  ) { ... }
}
```

Error factories for common scenarios:
- `errors.configNotFound(path)`
- `errors.profileNotFound(name)`
- `errors.incompatibleVersion(required, actual)`
- `errors.validationError(field, reason)`
