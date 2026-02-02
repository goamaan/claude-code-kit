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

### Option 1: Install from marketplace (recommended)

```shell
/plugin marketplace add goamaan/claudeops
/plugin install claudeops@claudeops
```

### Option 2: Clone and use as plugin directory

```bash
git clone https://github.com/goamaan/claudeops.git ~/.claude-plugins/claudeops
claude --plugin-dir ~/.claude-plugins/claudeops
```

### Option 3: Use directly from a local clone

```bash
git clone https://github.com/goamaan/claudeops.git
cd your-project
claude --plugin-dir /path/to/claudeops
```

## Skills

Skills are invoked with `/claudeops:<name>` in Claude Code.

| Skill | Description |
|-------|-------------|
| **init** | Interactive project setup — scan codebase, generate `.claude/` config with orchestration |
| **scan** | AI-enhanced codebase analysis, tech debt scanning, and context aggregation |
| **autopilot** | Full autonomous execution — pipeline, swarm, worktree, and plan-first modes |
| **debug** | Systematic debugging — hypothesis testing, CI/pipeline, container, and paste-and-fix |
| **review** | Multi-specialist code review — PR review, adversarial challenge, and explain/teach |
| **doctor** | Diagnose plugin setup, environment health, and optimization tips |
| **learn** | Capture session learnings for future retrieval |
| **query** | Natural language to SQL/database query translation and analysis |
| **create-skill** | Generate new claudeops skills from templates (user-only) |

## Agents

Agents are specialized subagent definitions used by skills for delegation.

| Agent | Model | Purpose |
|-------|-------|---------|
| architect | opus | Deep analysis, debugging, system design, performance review, plan critique |
| executor | sonnet | Code implementation, bug fixes, refactoring (any complexity) |
| explore | haiku | File search, codebase discovery, structure mapping |
| designer | sonnet | UI/UX, component creation, styling, responsive layouts |
| tester | sonnet | Test planning, TDD workflow, test writing, quality assurance |
| security | opus | Security audit, threat modeling, vulnerability assessment, OWASP compliance |
| researcher | sonnet | Technology evaluation, best practices, API analysis, framework conventions |

## Hooks

Event-driven scripts that run automatically during Claude Code sessions.

| Hook | Event | Description |
|------|-------|-------------|
| smart-approve | PreToolUse (Bash) | Auto-approves safe commands, flags dangerous ones |
| security-scan | PreToolUse (Bash) | Scans for secrets before git commits |
| git-branch-check | PreToolUse (Bash) | Warns when committing to protected branches |
| lint-changed | PostToolUse (Edit/Write) | Runs ESLint on modified JS/TS files |
| typecheck-changed | PostToolUse (Edit/Write) | Runs TypeScript type checking on modified files |
| continuation-check | Stop | Evaluates completion and blocks premature stopping |
| rule-suggester | Stop | Detects corrections and prompts CLAUDE.md rule updates |
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
description: What this agent specializes in. Use proactively when...
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
