# Claudeops Vision v2: Batteries-Included Claude Code Enhancement

**Status:** Draft
**Version:** 3.x (no v4/v5/v6 - everything stays in 3.x)
**Philosophy:** Semantic intent, zero learning curve, rich extensibility

---

## Table of Contents

1. [Vision Statement](#1-vision-statement)
2. [Directory Structure](#2-directory-structure)
3. [Skills Library](#3-skills-library)
4. [Skill Runtime Integration](#4-skill-runtime-integration)
5. [Hooks Library](#5-hooks-library)
6. [Profile System](#6-profile-system)
7. [Agent Catalog](#7-agent-catalog)
8. [Technical Architecture](#8-technical-architecture)
9. [v3 Roadmap](#9-v3-roadmap)
10. [Design Principles](#10-design-principles)

---

## 1. Vision Statement

### What is Claudeops?

Claudeops is **batteries-included enhancement for Claude Code**. It transforms Claude Code into a multi-agent development powerhouse through:

- **Semantic Intent Detection** - No keywords to memorize. Describe what you want naturally and claudeops figures out the optimal approach.
- **Rich Skills Library** - Battle-tested skills for common development workflows: frontend, backend, testing, git, security, and more.
- **Profile-Based Configuration** - Switch between project contexts instantly with everything pre-configured.
- **Zero Learning Curve** - Works out of the box. Power users can customize deeply.

### Core Philosophy

```
User says: "Add email validation to the signup form"

Claudeops:
1. Classifies intent: implementation, frontend domain, moderate complexity
2. Routes to: executor agent (Sonnet model)
3. Executes with: frontend-ui-ux skill awareness
4. Verifies: lint + typecheck hooks run automatically
```

No commands. No keywords. Just describe what you need.

### Non-Goals

- **Not a replacement for Claude Code** - Claudeops enhances, not replaces
- **Not keyword-driven** - No magic words to memorize
- **Not opinionated about workflow** - Adapts to how you work

---

## 2. Directory Structure

### Project-Level (`.claudeops/`)

```
.claudeops/
  state/                    # Runtime state
    classification.json     # Last intent classification
    session.json            # Current session state
  plans/                    # Generated work plans
    feature-auth.md
    refactor-api.md
  logs/                     # Execution logs
    2026-01-24.jsonl
```

### Global-Level (`~/.claudeops/`)

```
~/.claudeops/
  config.toml               # Main configuration
  profiles/                 # Profile definitions
    default.toml
    fullstack.toml
    security.toml
    minimal.toml
  skills/                   # User-installed skills
    react-patterns/
    tdd-workflow/
    api-design/
  hooks/                    # User-installed hooks
    eslint-fix/
    prettier-format/
    secret-scan/
  agents/                   # Custom agent definitions
    my-custom-agent.md
  state/                    # Global state
    cost-tracking.json
```

### Claude Code Integration

```
~/.claude/
  settings.json             # Claude Code settings (managed by claudeops sync)
  settings.local.json       # Local overrides
  skills/                   # Skills synced from claudeops for native loading

.claude/                    # Project-level Claude Code config
  settings.json             # Synced from claudeops
  CLAUDE.md                 # Project instructions
  skills/                   # Project-level skills
```

---

## 3. Skills Library

Skills are reusable capabilities that extend Claude Code. Each skill is a markdown file with YAML frontmatter that Claude Code can auto-invoke.

### Installing Skills

```bash
# Install from built-in library
cops skill install frontend-ui-ux
cops skill install git-master
cops skill install tdd-workflow

# Install from GitHub
cops skill install https://github.com/user/skill-repo

# List installed skills
cops skill list

# Enable/disable skills per profile
cops skill enable tdd-workflow --profile security
cops skill disable frontend-ui-ux --profile minimal
```

### Built-in Skills Library (20+)

#### Execution & Implementation

| Skill | Description | Auto-Trigger |
|-------|-------------|--------------|
| `autopilot` | Full autonomous execution from idea to working code | "build me", "create a", "I want a" |
| `implement` | Standard feature implementation workflow | Implementation intent detected |
| `refactor` | Safe refactoring with verification | "refactor", "restructure", "clean up" |
| `migrate` | Database/API migration workflow | "migrate", "upgrade schema" |

#### Planning & Analysis

| Skill | Description | Auto-Trigger |
|-------|-------------|--------------|
| `planner` | Strategic planning with user interview | Broad/vague requests |
| `analyze` | Deep investigation and debugging | "debug", "investigate", "why is" |
| `research` | External documentation research | "research", "find docs", "how to" |
| `deepsearch` | Thorough codebase exploration | "find all", "where is", "search for" |

#### Frontend & Design

| Skill | Description | Auto-Trigger |
|-------|-------------|--------------|
| `frontend-ui-ux` | Design sensibility for UI work | UI/component context |
| `react-patterns` | React best practices and patterns | React file context |
| `vue-patterns` | Vue.js conventions | Vue file context |
| `css-architecture` | CSS organization and methodology | Styling work |
| `accessibility` | a11y compliance and testing | Accessibility mentions |

#### Backend & API

| Skill | Description | Auto-Trigger |
|-------|-------------|--------------|
| `api-design` | RESTful/GraphQL API conventions | API route work |
| `database` | Schema design and query optimization | Database work |
| `auth-patterns` | Authentication/authorization best practices | Auth-related work |
| `microservices` | Service architecture patterns | Service context |

#### Testing & Quality

| Skill | Description | Auto-Trigger |
|-------|-------------|--------------|
| `tdd-workflow` | Test-driven development enforcement | "tdd", "test first" |
| `testing` | General testing strategies | Test file context |
| `qa-automation` | End-to-end test automation | E2E testing work |

#### DevOps & Infrastructure

| Skill | Description | Auto-Trigger |
|-------|-------------|--------------|
| `docker` | Containerization best practices | Docker file context |
| `ci-cd` | Pipeline configuration | CI/CD file context |
| `kubernetes` | K8s deployment patterns | K8s manifests context |

#### Git & Collaboration

| Skill | Description | Auto-Trigger |
|-------|-------------|--------------|
| `git-master` | Git workflow expertise | Git operations |
| `pr-workflow` | Pull request best practices | PR creation/review |
| `code-review` | Review checklist and feedback | Review requests |

#### Security

| Skill | Description | Auto-Trigger |
|-------|-------------|--------------|
| `security-audit` | Security vulnerability analysis | Security context |
| `secret-management` | Secrets handling best practices | Credentials context |
| `input-validation` | Input sanitization patterns | Form/API input work |

#### Documentation

| Skill | Description | Auto-Trigger |
|-------|-------------|--------------|
| `documentation` | Technical writing standards | Doc file context |
| `api-docs` | API documentation generation | OpenAPI/Swagger work |
| `jsdoc` | Code comment standards | Code documentation |

#### System

| Skill | Description | Auto-Trigger |
|-------|-------------|--------------|
| `doctor` | Diagnose and fix installation issues | "doctor", "diagnose" |
| `orchestrate` | Core multi-agent orchestration | Always active |

### Skill File Format

```markdown
---
name: frontend-ui-ux
description: Design sensibility for UI/UX work. Enforces component patterns, accessibility, and visual consistency.
auto_trigger:
  - "component"
  - "button"
  - "form"
  - "modal"
  - "styling"
  - "CSS"
  - "UI"
  - "UX"
---

# Frontend UI/UX Skill

You have enhanced awareness for frontend development...

## Component Patterns
[Guidelines for component structure]

## Accessibility Requirements
[a11y checklist and enforcement]

## Styling Conventions
[CSS methodology and organization]
```

---

## 4. Skill Runtime Integration

This section explains **how skills modify agent behavior at runtime** - the mechanism that connects skill definitions to actual Claude Code execution.

### Skill Loading Architecture

Skills integrate with Claude Code through two complementary mechanisms:

#### Mechanism 1: Native Claude Code Skill Loading

Skills are synced to `~/.claude/skills/` (global) or `.claude/skills/` (project-level) where Claude Code natively loads them.

```
~/.claudeops/skills/frontend-ui-ux.md  --sync-->  ~/.claude/skills/frontend-ui-ux.md
```

**Claude Code's native behavior:**
- Reads all `.md` files in `~/.claude/skills/`
- Files with `auto_trigger` frontmatter are pattern-matched against user prompts
- Matching skills are auto-appended to Claude's context

#### Mechanism 2: Hook-Based Skill Injection (Custom Routing)

For advanced routing beyond pattern matching, the `intent-classifier` hook injects skill content dynamically.

**Flow:**
```
UserPromptSubmit hook
    |
    v
intent-classifier.mjs
    |
    +--> Classify intent (type, complexity, domains)
    |
    +--> Load relevant skills based on classification
    |
    +--> Inject as `system_prompt_suffix` in hook output
    |
    v
Claude Code receives enhanced prompt with skill context
```

### Skill Manager Implementation

The Skill Manager is responsible for loading, matching, and injecting skills at runtime.

**Location:** `src/domain/skill/skill-manager.ts`

```typescript
// Skill Manager API

interface SkillManager {
  /**
   * Load all installed skills from disk
   */
  loadSkills(): Promise<Skill[]>;

  /**
   * Find skills that match user prompt via auto_trigger patterns
   */
  matchSkills(userPrompt: string): Skill[];

  /**
   * Find skills that match intent classification
   */
  matchByClassification(classification: IntentClassification): Skill[];

  /**
   * Format matched skills as context string for injection
   */
  formatSkillContext(skills: Skill[]): string;

  /**
   * Sync skills to Claude Code's native skill directory
   */
  syncToClaudeCode(): Promise<void>;
}

// Example implementation of skill matching
function matchSkills(userPrompt: string): Skill[] {
  const promptLower = userPrompt.toLowerCase();
  const matched: Skill[] = [];

  for (const skill of this.skills) {
    for (const trigger of skill.autoTrigger) {
      if (promptLower.includes(trigger.toLowerCase())) {
        matched.push(skill);
        break;
      }
    }
  }

  return matched;
}

// Example of skill injection in hook output
function buildHookOutput(classification: IntentClassification, skills: Skill[]) {
  const skillContext = skills.map(s => s.content).join('\n\n---\n\n');

  return {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: skillContext,
      // OR for system prompt approach:
      system_prompt_suffix: skillContext
    }
  };
}
```

### Skill Loading Priority

When multiple skills match, they are loaded in priority order:

| Priority | Source | Example |
|----------|--------|---------|
| 1 (highest) | Project-level `.claude/skills/` | Custom project skills |
| 2 | Profile-enabled skills | `fullstack.toml` enables `react-patterns` |
| 3 | Global `~/.claude/skills/` | User-installed skills |
| 4 (lowest) | Built-in skills | Bundled with claudeops |

### Skill Injection Points

Skills can be injected at different points in Claude Code's lifecycle:

| Injection Point | Hook Event | Use Case |
|-----------------|------------|----------|
| Pre-prompt | `UserPromptSubmit` | Context/skill injection before processing |
| Post-response | `AssistantResponse` | Verify skill guidelines were followed |
| Pre-tool | `PreToolUse` | Add skill-specific tool constraints |

---

## 5. Hooks Library

Hooks intercept Claude Code at lifecycle events to inject context, validate actions, or modify behavior.

### Installing Hooks

```bash
# Install from built-in library
cops hook install lint-on-save
cops hook install typecheck-on-save
cops hook install secret-scan

# Enable/disable hooks
cops hook enable secret-scan
cops hook disable lint-on-save

# List installed hooks
cops hook list

# Debug hook execution
cops hook debug --verbose
```

### Built-in Hooks Library (15+)

#### Quality Assurance Hooks

| Hook | Event | Description |
|------|-------|-------------|
| `lint-on-save` | PostToolUse | Run ESLint after Write/Edit on JS/TS files |
| `typecheck-on-save` | PostToolUse | Run TypeScript after Write/Edit on .ts/.tsx |
| `prettier-format` | PostToolUse | Auto-format code after Write/Edit |
| `test-affected` | PostToolUse | Run tests for affected files after changes |

#### Safety & Security Hooks

| Hook | Event | Description |
|------|-------|-------------|
| `secret-scan` | PreToolUse | Block commits containing secrets/credentials |
| `rm-rf-guard` | PreToolUse | Prevent destructive delete commands |
| `git-safety-net` | PreToolUse | Block dangerous git commands (force push, hard reset) |
| `sql-guard` | PreToolUse | Warn on DROP/TRUNCATE statements |

#### Context Injection Hooks

| Hook | Event | Description |
|------|-------|-------------|
| `intent-classifier` | UserPromptSubmit | Classify intent and inject routing context + skills |
| `thinking-enhancer` | UserPromptSubmit | Add reasoning instructions for complex tasks |
| `context-gatherer` | UserPromptSubmit | Auto-gather relevant codebase context |

#### Session Management Hooks

| Hook | Event | Description |
|------|-------|-------------|
| `checkpoint` | Stop | Create git stash before session ends |
| `continuation-check` | Stop | Block premature stopping when tasks remain |
| `session-summary` | Stop | Generate session summary on exit |

#### Notification Hooks

| Hook | Event | Description |
|------|-------|-------------|
| `slack-notify` | Stop | Post session summary to Slack |
| `desktop-notify` | Stop | macOS/Linux desktop notification on completion |

#### Cost Tracking Hooks

| Hook | Event | Description |
|------|-------|-------------|
| `cost-tracker` | PostToolUse | Track token usage and estimated cost |
| `budget-guard` | PreToolUse | Warn/block when approaching budget limit |

### Hook File Format

```javascript
#!/usr/bin/env node
/**
 * Hook: secret-scan
 * Event: PreToolUse
 * Description: Block commits containing secrets
 */

import { readFileSync } from 'fs';

// Read input from stdin
const input = JSON.parse(readFileSync(0, 'utf8'));

// Check for secrets in file content
const secretPatterns = [
  /api[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9]{20,}/i,
  /password["\s]*[:=]["\s]*["'][^"']{8,}["']/i,
  /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/,
];

if (containsSecrets(input.tool_input)) {
  console.log(JSON.stringify({
    decision: "block",
    reason: "Detected potential secrets in file. Please remove credentials before committing."
  }));
} else {
  console.log(JSON.stringify({ decision: "allow" }));
}

process.exit(0);
```

---

## 6. Profile System

Profiles bundle configuration, skills, hooks, and agent settings into switchable contexts.

### Profile Structure

```toml
# ~/.claudeops/profiles/fullstack.toml

[profile]
name = "fullstack"
description = "Full-stack web development with React + Node.js"
extends = "default"

[model]
default = "sonnet"

[model.routing]
simple = "haiku"
standard = "sonnet"
complex = "opus"

[skills]
enabled = [
  "autopilot",
  "frontend-ui-ux",
  "react-patterns",
  "api-design",
  "tdd-workflow",
  "git-master"
]

[hooks]
enabled = [
  "lint-on-save",
  "typecheck-on-save",
  "secret-scan",
  "checkpoint"
]

[agents]
# Override default agent models
designer = { model = "sonnet", priority = 90 }
qa-tester = { model = "sonnet", priority = 80 }

[cost]
tracking = true
daily_budget = 25.0
```

### Built-in Profiles

| Profile | Description | Skills | Hooks |
|---------|-------------|--------|-------|
| `minimal` | Bare essentials, fast | orchestrate, implement | intent-classifier |
| `default` | Balanced for general use | autopilot, planner, git-master | lint-on-save, typecheck-on-save, checkpoint |
| `fullstack` | React + Node.js development | frontend-ui-ux, react-patterns, api-design, tdd-workflow | lint-on-save, typecheck-on-save, prettier-format |
| `frontend` | UI/UX focused | frontend-ui-ux, react-patterns, accessibility, css-architecture | lint-on-save, prettier-format |
| `backend` | API and database focused | api-design, database, auth-patterns, testing | typecheck-on-save, secret-scan |
| `security` | Security-conscious development | security-audit, secret-management, input-validation | secret-scan, rm-rf-guard, git-safety-net, sql-guard |
| `devops` | Infrastructure and deployment | docker, ci-cd, kubernetes | rm-rf-guard, git-safety-net |
| `enterprise` | Full suite with all safety | All skills | All safety hooks + quality hooks |

### Profile Commands

```bash
# List available profiles
cops profile list

# Create new profile
cops profile create my-project --extends fullstack

# Switch active profile
cops profile use security

# Show current profile
cops profile show

# Edit profile
cops profile edit my-project

# Delete profile
cops profile delete my-project
```

### Project-Level Profile Override

```yaml
# .claudeops.yaml in project root

profile: fullstack

# Override specific settings
skills:
  enabled:
    - vue-patterns  # Add Vue instead of React
  disabled:
    - react-patterns

hooks:
  enabled:
    - test-affected
```

---

## 7. Agent Catalog

Agents are specialized subagents for different domains. The router automatically selects agents based on intent classification.

### Current Agents (12)

| Agent | Model | Purpose | Domains |
|-------|-------|---------|---------|
| `explore` | Haiku | Fast codebase search and file discovery | general, documentation |
| `executor` | Sonnet | Standard feature implementation and bug fixes | general, backend, frontend, testing |
| `executor-low` | Haiku | Simple boilerplate and trivial changes | general, documentation |
| `architect` | Opus | Deep analysis, debugging, architectural decisions | general, backend, frontend, database, devops |
| `designer` | Sonnet | UI/UX design, component creation, styling | frontend |
| `qa-tester` | Sonnet | Test writing, TDD workflow, quality checks | testing, general |
| `security` | Opus | Security audits and vulnerability analysis | security, backend, devops |
| `researcher` | Sonnet | External research and documentation analysis | documentation, general |
| `writer` | Haiku | Documentation writing and maintenance | documentation |
| `planner` | Opus | Strategic planning and task breakdown | general |
| `critic` | Opus | Plan review and critical analysis | general |
| `vision` | Sonnet | Image and visual analysis | frontend, design |

### Agent Selection Logic

```
Intent Classification --> Router --> Agent Selection

Example:
  User: "Debug the race condition in auth"

  Classification:
    type: debugging
    complexity: complex
    domains: [backend, security]

  Router Decision:
    primary_agent: architect (Opus)
    support_agents: [explore (Haiku)]
    verification: true
```

### Custom Agents

Users can define custom agents in `~/.claudeops/agents/`:

```markdown
---
name: my-domain-expert
description: Expert in our domain-specific logic
model: sonnet
tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
domains:
  - general
  - backend
---

# My Domain Expert Agent

You are an expert in [domain-specific knowledge]...
```

---

## 8. Technical Architecture

### Intent Classification Flow

```
User Prompt
    |
    v
[UserPromptSubmit Hook: intent-classifier]
    |
    v
Intent Classification
  - type: research|implementation|debugging|review|planning|refactoring|maintenance|conversation
  - complexity: trivial|simple|moderate|complex|architectural
  - domains: [frontend, backend, database, devops, security, testing, documentation, general]
  - signals: {wantsPersistence, wantsSpeed, wantsAutonomy, wantsPlanning, wantsVerification, wantsThorough}
    |
    v
[Skill Manager: Match and Load Skills]
    |
    v
[Router]
    |
    v
Routing Decision
  - agents: [selected agents with models]
  - parallelism: sequential|parallel|swarm
  - verification: boolean
    |
    v
[Claude Code Native Task System]
    |
    v
Execution
```

### Integration with Claude Code

Claudeops enhances Claude Code through:

1. **Skills** - Installed to `~/.claude/skills/` or `.claude/skills/`
2. **Hooks** - Registered in `~/.claude/settings.json`
3. **Agents** - Custom subagents via Task tool
4. **Configuration** - Settings synced to Claude Code format

### Native Feature Detection

Claudeops probes for native Claude Code features:

```typescript
async function detectNativeFeatures() {
  return {
    nativeSwarm: await probeCapability('swarm'),
    nativeTeam: await probeCapability('team'),
    nativeSkills: await checkSkillsSupport(),
    nativeHooks: await checkHooksSupport(),
  };
}
```

When native features are available, claudeops uses them directly. When not, it provides graceful fallbacks.

### Graceful Degradation

| Feature | Native Available | Fallback |
|---------|------------------|----------|
| Swarm | Use native swarm | Sequential task delegation |
| Team | Use native team | Parallel Task calls |
| Skills | Native skill loading | CLAUDE.md injection |
| Hooks | Native hook system | No fallback (required) |

---

## 9. v3 Roadmap

All development stays in v3.x. No v4/v5/v6 since there are no users yet.

### v3.1: Intent Classification Wiring (Current)

**Goal:** Wire up the existing intent classification system end-to-end.

**Intent Classification Flow (Detailed Wiring):**

```
1. hooks/intent-classifier.mjs (UserPromptSubmit hook)
   - Reads user prompt from stdin
   - Calls src/core/classifier/classifier.ts via dynamic import
   - Writes classification to /tmp/claudeops-hooks/last-classification.json (legacy)

2. NEW: Hook outputs routing context via hookSpecificOutput
   {
     hookSpecificOutput: {
       hookEventName: 'UserPromptSubmit',
       additionalContext: classificationContext + skillContext
     }
   }

3. src/core/router/router.ts routeIntent() receives classification
   - Selects agents, model tier, parallelism strategy
   - Returns RoutingDecision

4. Claude Code receives enhanced prompt with:
   - Intent classification summary
   - Matched skill content
   - Routing guidance (recommended agents)

5. Claude routes to appropriate agents based on context
```

**Deliverables:**
- [ ] Refactor `hooks/intent-classifier.mjs` to output via `hookSpecificOutput.additionalContext`
- [ ] Add skill matching to intent-classifier hook (call Skill Manager)
- [ ] Create `src/domain/skill/skill-manager.ts` with load/match/format APIs
- [ ] Connect classification to router inline in hook (no external file dependency)
- [ ] Add classification + routing to `.claudeops/state/session.json`
- [ ] CLI: `cops classify "user prompt"` for testing
- [ ] **Deprecate `hooks/keyword-detector.mjs`** (legacy keyword detection)
- [ ] Replace with `intent-classifier` hook as sole context injection mechanism
- [ ] **Delete legacy `.omc/` directory** (superseded by `.claudeops/`)

**Files to Modify:**
- `hooks/intent-classifier.mjs` - Refactor to use hookSpecificOutput
- `hooks/keyword-detector.mjs` - Mark deprecated, remove from settings.json
- `src/domain/skill/skill-manager.ts` - NEW: Skill loading and matching
- `src/core/sync/settings-generator.ts` - Remove keyword-detector from hooks list
- `.omc/` - DELETE entire directory

**Integration Code Example:**

```javascript
// hooks/intent-classifier.mjs - Updated flow

import { createClassifier, formatClassificationContext } from '../dist/index.mjs';
import { routeIntent } from '../dist/core/router/router.js';
import { SkillManager } from '../dist/domain/skill/skill-manager.js';

async function main() {
  const input = await readStdin();
  const userPrompt = input.prompt;

  // 1. Classify intent
  const classifier = createClassifier();
  const classification = await classifier.classify(userPrompt);

  // 2. Route based on classification
  const routingDecision = routeIntent(classification);

  // 3. Match and load skills
  const skillManager = new SkillManager();
  const matchedSkills = skillManager.matchByClassification(classification);
  const skillContext = skillManager.formatSkillContext(matchedSkills);

  // 4. Build combined context
  const classificationContext = formatClassificationContext(classification);
  const routingContext = `Routing: ${routingDecision.reasoning}`;

  // 5. Output for Claude Code
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: [
        '[CLAUDEOPS CONTEXT]',
        classificationContext,
        routingContext,
        skillContext,
        '[/CLAUDEOPS CONTEXT]'
      ].join('\n\n')
    }
  }));
}
```

### v3.2: Skills Library Launch

**Goal:** Ship 20+ battle-tested skills users can install.

**Deliverables:**
- [ ] Complete skill file format with auto-trigger
- [ ] Built-in skills library (20+)
- [ ] CLI: `cops skill install/list/enable/disable`
- [ ] Skill installation from GitHub URLs
- [ ] Skill sync to Claude Code (`~/.claude/skills/`)
- [ ] Profile skill configuration
- [ ] Skill Manager with load/match/format APIs

**Files:**
- `skills/` directory (6 skills exist)
- New: `src/domain/skill/` module

### v3.3: Hooks Library + Profile Polish

**Goal:** Ship 15+ helpful hooks and polish the profile system.

**Deliverables:**
- [ ] Complete hooks library (15+)
- [ ] CLI: `cops hook install/list/enable/disable/debug`
- [ ] Hook installation from GitHub URLs
- [ ] Profile system improvements
- [ ] Profile inheritance (extends)
- [ ] Project-level profile overrides
- [ ] Profile templates for common stacks

**Files:**
- `hooks/` directory (7 hooks exist)
- `src/domain/profile/` (exists)

### v3.4: Community & Polish

**Goal:** Enable community contributions and polish the experience.

**Deliverables:**
- [ ] Community skill/hook repository
- [ ] Skill/hook submission workflow
- [ ] Documentation site
- [ ] Video tutorials
- [ ] Performance optimization
- [ ] Error messages polish
- [ ] `cops upgrade` improvements

---

## 10. Design Principles

### 1. Semantic Over Keywords

```
BAD:  "ulw fix all the errors"      (keyword-driven)
GOOD: "Fix all the TypeScript errors" (semantic intent)
```

Claudeops classifies intent from natural language, not magic keywords.

**IMPORTANT:** The legacy `keyword-detector.mjs` hook contradicts this principle and is deprecated in v3.1. All context injection flows through `intent-classifier` which uses semantic classification.

### 2. Zero Configuration Works

```bash
npm install -g claudeops
claudeops sync
# That's it. Everything works.
```

Power users can customize deeply, but defaults are sensible.

### 3. Enhance, Don't Replace

Claudeops works with Claude Code, not against it:
- Uses native Task system for agents
- Uses native hooks system
- Uses native skills format
- Syncs to Claude Code settings

### 4. Profiles Are First-Class

Switch contexts instantly:
```bash
cops profile use security    # All security skills/hooks activated
cops profile use minimal     # Stripped down for simple tasks
```

### 5. Skills and Hooks Are Installable

```bash
cops skill install react-patterns
cops hook install prettier-format
```

Rich library of community-contributed enhancements.

### 6. Graceful Degradation

When native Claude Code features aren't available, claudeops falls back gracefully. No errors, just reduced functionality.

### 7. Transparency

```
[claudeops] Intent: implementation, Complexity: moderate
[claudeops] Routing to: executor (Sonnet)
[claudeops] Skills active: frontend-ui-ux, react-patterns
```

Users see what claudeops is doing. No magic black boxes.

---

## Appendix A: CLI Reference

```bash
# Configuration
cops config init              # Initialize configuration
cops config show              # Show current config
cops sync                     # Sync to Claude Code
cops doctor                   # Run diagnostics

# Profiles
cops profile list             # List profiles
cops profile create NAME      # Create profile
cops profile use NAME         # Switch profile
cops profile show             # Show current profile

# Skills
cops skill list               # List installed skills
cops skill install NAME       # Install skill
cops skill enable NAME        # Enable skill
cops skill disable NAME       # Disable skill

# Hooks
cops hook list                # List installed hooks
cops hook install NAME        # Install hook
cops hook enable NAME         # Enable hook
cops hook disable NAME        # Disable hook
cops hook debug               # Debug hook execution

# Cost
cops cost today               # Today's spending
cops cost budget --set 10     # Set daily budget

# Utilities
cops classify "prompt"        # Test intent classification
cops upgrade                  # Upgrade claudeops
```

---

## Appendix B: Migration from v2

If you have existing `.omc/` configuration:

```bash
# Automatic migration
cops migrate

# This will:
# 1. Move .omc/config.yaml -> ~/.claudeops/config.toml
# 2. Convert profiles to new format
# 3. Map old skills to new skills library
# 4. Preserve custom configurations
# 5. Delete legacy .omc/ directory
```

---

## Appendix C: Deprecated Components

The following components are deprecated as of v3.1:

| Component | Reason | Replacement |
|-----------|--------|-------------|
| `hooks/keyword-detector.mjs` | Contradicts semantic intent philosophy | `hooks/intent-classifier.mjs` |
| `.omc/` directory | Legacy naming, confusing | `.claudeops/` directory |
| Magic keywords (`ulw`, `uw`) | Keyword-driven approach | Natural language + classification |

---

**End of Vision Document**

PLAN_READY: .claudeops/plans/claudeops-vision-v2.md
