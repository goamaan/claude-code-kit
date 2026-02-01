<div align="center">

# claudeops

**Multi-Agent Orchestration Plugin for Claude Code**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code Plugin](https://img.shields.io/badge/claude_code-plugin-purple.svg)](https://docs.anthropic.com/en/docs/claude-code)

Workflow skills, specialized agents, quality hooks, and codebase scanning.

[Installation](#installation) | [Skills](#skills) | [Agents](#agents) | [Hooks](#hooks) | [Scanner](#scanner)

</div>

---

## What is claudeops?

claudeops is a **Claude Code directory plugin** that adds multi-agent orchestration, workflow automation, quality hooks, and codebase scanning to Claude Code. No build step, no dependencies — just markdown, JavaScript, and JSON.

## Installation

### Option 1: Clone and use as plugin directory

```bash
git clone https://github.com/goamaan/claudeops.git ~/.claude-plugins/claudeops
claude --plugin-dir ~/.claude-plugins/claudeops
```

### Option 2: Use directly from a local clone

```bash
git clone https://github.com/goamaan/claudeops.git
cd your-project
claude --plugin-dir /path/to/claudeops
```

## Skills

Skills are invoked with `/claudeops:<name>` in Claude Code.

| Skill | Description |
|-------|-------------|
| **init** | Interactive project setup — scan codebase, generate `.claude/` config |
| **scan** | AI-enhanced codebase analysis beyond deterministic scanning |
| **orchestrate** | Core multi-agent orchestration conductor |
| **autopilot** | Full autonomous execution from idea to working code |
| **planner** | Strategic planning with requirement gathering |
| **executor** | Standard code implementation for features and bug fixes |
| **debug** | Systematic debugging with parallel hypothesis testing |
| **review** | Multi-specialist parallel code review |
| **testing** | Testing orchestration with TDD and coverage-driven generation |
| **security** | OWASP security audit, threat modeling, dependency audit |
| **doctor** | Diagnose plugin setup and environment health |
| **learn** | Capture session learnings for future retrieval |

## Agents

Agents are specialized subagent definitions used by skills for delegation.

### Opus Tier (Complex/Analytical)
| Agent | Purpose |
|-------|---------|
| architect | Deep analysis, debugging, system design, verification |
| executor | Multi-file features, bug fixes, standard implementation |
| designer | UI/UX, component creation, styling |
| qa-tester | Test planning, TDD workflow, quality assurance |
| security | Security audit, threat modeling |
| researcher | External research, API analysis, tech evaluation |
| planner | Strategic planning, requirements gathering |
| critic | Plan review, critical analysis, gap identification |
| security-sentinel | OWASP vulnerability review, injection analysis |
| performance-oracle | Performance bottleneck analysis, optimization |
| architecture-strategist | Architectural compliance, design pattern review |

### Sonnet Tier (Standard)
| Agent | Purpose |
|-------|---------|
| code-simplicity-reviewer | YAGNI detection, over-engineering review |
| best-practices-researcher | Framework best practices, convention research |

### Haiku Tier (Fast/Simple)
| Agent | Purpose |
|-------|---------|
| explore | File search, codebase discovery, structure mapping |
| executor-low | Single-file boilerplate, trivial changes |
| writer | Documentation, comments, technical writing |
| git-history-analyzer | Code archaeology, git log analysis, changelogs |
| vision | Visual analysis of images, diagrams, UI screenshots |

## Hooks

Event-driven scripts that run automatically during Claude Code sessions.

| Hook | Event | Description |
|------|-------|-------------|
| security-scan | PreToolUse (Bash) | Scans for secrets before git commits |
| git-branch-check | PreToolUse (Bash) | Warns when committing to protected branches |
| lint-changed | PostToolUse (Edit/Write) | Runs ESLint on modified JS/TS files |
| typecheck-changed | PostToolUse (Edit/Write) | Runs TypeScript type checking on modified files |
| continuation-check | Stop | Evaluates completion and blocks premature stopping |
| session-save | Stop | Saves session state for cross-session restoration |
| session-learner | Stop | Captures learnings from resolved problems |
| session-restore | UserPromptSubmit | Restores context from previous session |
| learning-retriever | UserPromptSubmit | Retrieves relevant past learnings as context |

Hooks are registered in `hooks/hooks.json` using Claude Code's plugin hook format.

## Scanner

The scanner (`scripts/scan.mjs`) performs deterministic codebase analysis and outputs JSON. It detects:

- Programming languages and file counts
- Frameworks (JS, Python, Rust, Go, Java ecosystems)
- Build systems and scripts
- Test frameworks and test directories
- Linters and formatters
- CI/CD pipelines
- Database/ORM configurations
- API styles (REST, GraphQL, gRPC, tRPC)
- Monorepo tools
- Code conventions (imports, exports, naming, test location)
- Language-specific details (Python venvs, Rust editions, Go modules, Java build tools)

### Usage

```bash
node scripts/scan.mjs /path/to/project
```

Outputs JSON to stdout. Used by the `init` and `scan` skills.

## Customization

### Adding skills

Create `skills/<name>/SKILL.md` with YAML frontmatter:

```yaml
---
name: my-skill
description: What this skill does
user-invocable: true
---
```

### Adding agents

Create `agents/<name>.md` with YAML frontmatter:

```yaml
---
name: my-agent
description: What this agent specializes in
model: sonnet
---
```

### Adding hooks

1. Create a `.mjs` file in `hooks/`
2. Register it in `hooks/hooks.json`
3. Hook reads JSON from stdin, outputs JSON to stdout

## Requirements

- Claude Code
- Node.js 20+
- Git

## License

MIT
