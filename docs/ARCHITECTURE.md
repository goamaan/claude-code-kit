# claudeops Architecture

> Batteries-included Claude Code enhancement toolkit - orchestration, guardrails, profiles, and configuration management.

**Version:** 4.0.0
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

claudeops is a configuration and orchestration layer for Claude Code that provides:

- **Swarm Orchestration** - Multi-agent task coordination built on Claude Code's native task system
- **Semantic Intent Classification** - AI-powered analysis of user prompts to determine intent, complexity, and domain
- **Intelligent Routing** - Automatic agent and model selection based on task characteristics
- **Safety Guardrails** - Protection against destructive deletions, secret exposure, and dangerous commands
- **Profile Management** - Named configurations with inheritance for different projects/contexts
- **Skills Library** - 21 specialized skills for different development tasks
- **Hooks System** - 14 hooks for workflow automation and safety checks
- **Configuration Sync** - Seamless integration with Claude Code via CLAUDE.md and settings.json

---

## Swarm Orchestration

claudeops v4.0.0 introduces swarm orchestration that builds on top of Claude Code's **native task system** rather than replacing it.

### Claude Code Task System

Claude Code (2.1.16+) provides native task tools:

| Tool | Purpose |
|------|---------|
| `TaskCreate` | Create a new task |
| `TaskGet` | Retrieve task details |
| `TaskList` | List all tasks |
| `TaskUpdate` | Update task status/dependencies |

**Native Task Schema:**
```typescript
interface Task {
  id: string;              // Numeric string ("1", "2", "3")
  subject: string;         // Short description
  description: string;     // Detailed description
  status: 'open' | 'resolved';  // Native status values
  owner?: string;          // Assignee
  blocks: string[];        // Tasks this blocks
  blockedBy: string[];     // Dependencies
  comments: TaskComment[]; // Discussion
  references: string[];    // Related files/URLs
}
```

**Storage:** `~/.claude/tasks/<team_name>/`

### How claudeops Integrates

claudeops **enhances** the native task system without replacing it:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code Native                          │
├─────────────────────────────────────────────────────────────────┤
│  TaskCreate ──▶ ~/.claude/tasks/<team>/<id>.json                │
│  TaskUpdate ──▶ status: 'open' | 'resolved'                     │
│  TaskList   ──▶ blocks/blockedBy for dependencies               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     claudeops Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Swarm Planner  ──▶ Task breakdown + dependency graph           │
│  Worker Spawner ──▶ Model selection + prompt generation         │
│  Swarm Metadata ──▶ ~/.claudeops/swarms/<name>/                 │
│  Cost Tracking  ──▶ Per-task cost aggregation                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Use native tools**: Let Claude Code's TaskCreate/TaskUpdate handle task CRUD
2. **Store metadata separately**: Swarm costs, history, and config go to `~/.claudeops/swarms/`
3. **Respect native schema**: Use `open/resolved` status, not custom values
4. **Leverage blockedBy**: Dependencies are enforced by Claude Code's task system
5. **CLAUDE_CODE_TASK_LIST_ID**: Use this to persist tasks across sessions

### Swarm Module (`src/core/swarm/`)

| File | Purpose |
|------|---------|
| `planner.ts` | Classification → task breakdown with dependencies |
| `dependency-graph.ts` | Topological sort, parallel groups, cycle detection |
| `spawner.ts` | Worker prompt generation, model routing |
| `persistence.ts` | Swarm metadata (not task storage) |
| `index.ts` | Public exports |

---

## Project Structure

```
claudeops/
├── src/                          # TypeScript source
│   ├── cli.ts                    # CLI entry point (citty-based)
│   ├── index.ts                  # Library entry point
│   ├── commands/                 # CLI subcommands (13 commands)
│   ├── core/                     # Core business logic
│   │   ├── classifier/           # Intent classification
│   │   ├── config/               # Config loading/merging
│   │   ├── doctor/               # Diagnostics
│   │   ├── guardrails/           # Safety checks
│   │   ├── router/               # Agent/model routing
│   │   ├── swarm/                # Swarm orchestration (v4.0.0)
│   │   └── sync/                 # Claude Code sync
│   ├── domain/                   # Domain modules
│   │   ├── addon/                # Addon management
│   │   ├── cost/                 # Cost tracking
│   │   ├── generator/            # AI-powered generation
│   │   ├── hook/                 # Hook management
│   │   ├── mcp/                  # MCP server management
│   │   ├── profile/              # Profile management
│   │   ├── setup/                # Setup templates
│   │   ├── skill/                # Skill management
│   │   └── state/                # Session state
│   ├── types/                    # Zod schemas & TypeScript types
│   ├── ui/                       # Terminal UI (output, prompts)
│   └── utils/                    # Shared utilities
├── skills/                       # Built-in skills (21 .md files)
├── hooks/                        # Built-in hooks (13 .mjs files)
├── setups/                       # Setup templates
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
    profile, setup, addon, skill, hook, config,
    mcp, cost, sync, doctor, install, upgrade, classify
  },
});
```

### Library Entry (`src/index.ts`)

Exports public APIs for programmatic use:

```typescript
export const VERSION = "3.1.0";
export const NAME = "claudeops";

// Core APIs
export { createClassifier, type IntentClassifier } from './core/classifier';
export { routeIntent, type RoutingDecision } from './core/router';
export { checkDeletionCommand, scanForSecrets } from './core/guardrails';

// Domain APIs
export { createSkillManager } from './domain/skill';
export { createHookManager } from './domain/hook';
export { createProfileManager } from './domain/profile';
```

---

## Core Modules

### Classifier (`src/core/classifier/`)

Semantic analysis of user requests to determine intent, complexity, and domain.

**Files:**
- `types.ts` - Classification types (IntentType, Complexity, Domain, UserSignals)
- `classifier.ts` - AIClassifier + FallbackClassifier implementations
- `prompts.ts` - AI classification prompts

**Classification Categories:**

| Category | Values |
|----------|--------|
| Intent | research, implementation, debugging, review, planning, refactoring, maintenance, conversation |
| Complexity | trivial, simple, moderate, complex, architectural |
| Domain | frontend, backend, database, devops, security, testing, documentation, general |
| Signals | wantsPersistence, wantsSpeed, wantsAutonomy, wantsPlanning, wantsVerification, wantsThorough |

**Usage:**
```typescript
const classifier = createClassifier();
const result = await classifier.classify("implement user authentication");
// { type: 'implementation', complexity: 'moderate', domains: ['backend', 'security'], ... }
```

### Router (`src/core/router/`)

Maps classifications to agent selections, model tiers, and execution strategies.

**Files:**
- `agent-catalog.ts` - Registry of all agents with capabilities
- `agent-router.ts` - Intent-to-agent mapping
- `model-router.ts` - Complexity-to-model mapping
- `parallelism.ts` - Execution strategy selection
- `router.ts` - Main routing orchestration

**Agent Catalog:**

| Agent | Model | Purpose |
|-------|-------|---------|
| explore | haiku | Fast codebase search |
| executor | opus | Standard implementations |
| executor-low | haiku | Simple boilerplate |
| architect | opus | Deep analysis, debugging |
| designer | opus | UI/UX, components |
| qa-tester | opus | Testing, TDD |
| security | opus | Security audits |
| researcher | opus | External research |
| writer | haiku | Documentation |
| planner | opus | Strategic planning |
| critic | opus | Plan review |

**Model Selection:**
- `trivial` → haiku
- `simple` → sonnet
- `moderate/complex/architectural` → opus
- Signals can upgrade/downgrade (wantsSpeed → downgrade, wantsThorough → upgrade)

### Guardrails (`src/core/guardrails/`)

Safety layer preventing destructive operations.

**Files:**
- `deletion.ts` - Destructive deletion protection
- `secrets.ts` - Secret/credential detection
- `dangerous.ts` - Dangerous command detection

**Deletion Protection:**
- Blocks `rm -rf *`, `rm -rf /`, recursive deletions on critical paths
- Detects bypass attempts (`sudo rm`, `\rm`, `/bin/rm`)
- Allows safe alternatives (`trash`, `gio trash`)

**Secret Detection:**
- AWS keys, GitHub tokens, Stripe keys, private keys, JWTs
- Filters false positives (env vars, placeholders, templates)

**Dangerous Commands:**
- Git: `push --force`, `reset --hard`, force push to main
- Database: `DROP TABLE`, `TRUNCATE`, `DELETE` without WHERE
- System: `mkfs`, `fdisk`, `killall -9`

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

Synchronizes configuration to Claude Code.

**Files:**
- `engine.ts` - Main sync orchestration
- `claudemd-generator.ts` - CLAUDE.md generation
- `settings-generator.ts` - settings.json generation
- `backup.ts` - Backup/restore functionality

**What Gets Synced:**
- `~/.claude/settings.json` - Hooks, MCP servers, permissions
- `~/.claude/CLAUDE.md` - Instructions with managed sections
- `~/.claude/skills/` - Skill definitions

### Doctor (`src/core/doctor/`)

System diagnostics and auto-repair.

**Diagnostic Checks:**
| Check | Category | Auto-Fix |
|-------|----------|----------|
| claudeops-dir | installation | Yes |
| config-valid | configuration | No |
| active-profile | profiles | Yes |
| bun-version | dependencies | No |
| claude-dir-sync | sync | Yes |

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

### Setup (`src/domain/setup/`)

Setup templates for consistent environments.

**Manifest Format (`manifest.toml`):**
```toml
[setup]
name = "my-setup"
version = "1.0.0"
extends = "base-setup"

[skills]
enabled = ["executor", "architect"]

[agents.executor]
model = "opus"
```

### Addon (`src/domain/addon/`)

Addon installation and management.

**Install Sources:**
- Local path: `./my-addon`
- GitHub: `owner/repo@ref`
- Registry: `addon-name`

**Manifest Format (`addon.toml`):**
```toml
[addon]
name = "my-addon"
version = "1.0.0"

[requires]
claudeops = "^3.0.0"

[hooks]
PreToolUse = [{ matcher = "Bash", handler = "./guard.ts" }]
```

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

### MCP (`src/domain/mcp/`)

MCP server management and context budget estimation.

### Cost (`src/domain/cost/`)

Cost tracking with budget management.

**Storage:** `~/.claudeops/cache/costs/YYYY-MM.jsonl`

### State (`src/domain/state/`)

Session state for classification tracking.

---

## CLI Commands

| Command | Purpose |
|---------|---------|
| `cops init` | Zero-config swarm setup (v4.0.0) |
| `cops swarm` | Swarm orchestration (status, tasks, init, stop, history) |
| `cops sync` | Sync config to Claude Code |
| `cops config` | Configuration management (init, edit, show, validate, pm) |
| `cops profile` | Profile operations (list, use, create, delete) |
| `cops skill` | Skill management (list, install, add, enable, disable) |
| `cops hook` | Hook management (list, debug, test, add, sync) |
| `cops addon` | Addon operations (install, update, remove) |
| `cops setup` | Setup templates (list, use, create) |
| `cops mcp` | MCP server management |
| `cops cost` | Cost tracking and budgets |
| `cops doctor` | Diagnostic checks |
| `cops upgrade` | Self-update |
| `cops classify` | Test intent classification |

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
loadSetup() → MergedSetup
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
2. **Profile Information** - Active profile and setup
3. **Model Configuration** - Default model and routing
4. **Package Manager** - Configured package manager commands
5. **Agent Catalog** - Available agents with descriptions
6. **Skills** - Enabled/disabled skills
7. **Hooks** - Active hooks

---

## Skills & Hooks

### Built-in Skills (21)

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
| explore | haiku | Codebase search |
| writer | haiku | Documentation |
| researcher | sonnet | External research |
| analyze | sonnet | Code analysis |
| autopilot | opus | Autonomous execution |
| orchestrate | opus | Multi-agent orchestration |
| code-review | opus | Code review |
| deepsearch | sonnet | Deep exploration |
| doctor | sonnet | Project diagnostics |
| frontend-ui-ux | sonnet | Frontend guidance |
| git-master | sonnet | Git expertise |
| tdd | sonnet | Test-driven development |
| typescript-expert | sonnet | TypeScript guidance |

### Built-in Hooks (14)

| Hook | Event | Default | Purpose |
|------|-------|---------|---------|
| continuation-check | Stop | Enabled | Block premature stopping |
| lint-changed | PostToolUse | Enabled | ESLint after edits |
| typecheck-changed | PostToolUse | Enabled | TypeScript check |
| checkpoint | Stop | Enabled | Git stash checkpoint |
| thinking-level | UserPromptSubmit | Enabled | Add reasoning instructions |
| keyword-detector | UserPromptSubmit | Enabled | Mode keyword detection |
| cost-warning | UserPromptSubmit | Disabled | Budget warnings |
| security-scan | PreToolUse | Disabled | Secret scanning |
| test-reminder | PostToolUse | Disabled | Test reminders |
| format-on-save | PostToolUse | Disabled | Auto-formatting |
| git-branch-check | PreToolUse | Disabled | Protected branch warnings |
| todo-tracker | UserPromptSubmit | Disabled | TODO tracking |
| session-log | Stop | Disabled | Session logging |
| swarm-lifecycle | SubagentStop | Enabled | Swarm task completion tracking |

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
├── addons/               # Installed addons
├── skills/               # User skills
├── hooks/                # User hooks
├── setups/               # User setups
├── cache/
│   ├── costs/            # Cost tracking data
│   └── mcp-servers.json  # MCP state
├── swarms/               # Swarm metadata (v4.0.0)
│   ├── history.json      # Past executions
│   └── <name>/           # Active swarm state
│       └── state.json    # Current swarm state
└── backups/              # Sync backups
```

### Project (`.claudeops/`)

```
.claudeops/
├── config.toml           # Project configuration
├── local.toml            # Personal overrides (gitignored)
└── state/                # Runtime state
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

// Classifier
const classifier = createClassifier({ model: 'haiku' });

// Cost
const costTracker = createCostTracker();
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
