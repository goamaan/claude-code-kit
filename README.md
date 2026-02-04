<div align="center">

# claudeops

**Make Claude Code do more — without learning more.**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code Plugin](https://img.shields.io/badge/claude_code-plugin-purple.svg)](https://docs.anthropic.com/en/docs/claude-code)

10 workflow skills. 7 specialized agents. Deep project context. Zero dependencies.

[Get Started](#installation) | [What It Does](#what-can-it-do) | [How It Works](#how-it-works) | [Reference](#skills)

</div>

---

## Why claudeops?

Claude Code is already good. But it works alone, forgets between sessions, and doesn't know your project's conventions until you tell it — every time.

claudeops fixes that. Install it once, run `/claudeops:init`, and Claude Code gains:

- **Deep project context** — multiple agents analyze your codebase, interview you for tacit knowledge, and generate comprehensive CLAUDE.md that enables paste-a-bug-and-fix workflows
- **Multi-agent orchestration** — fan out work to specialized agents that run in parallel
- **Intent routing** — say "fix CI" or paste an error and the right workflow fires automatically
- **Built-in guardrails** — CLAUDE.md rules for linting, typechecking, and security are baked in

### Design philosophy

**No new mental model.** You don't install claudeops to learn claudeops. You install it to make the thing you already use — Claude Code — better at the thing you already do — writing software.

There are no background services to run, no databases to configure, no separate CLI to learn, no runtimes to install. No Byzantine consensus algorithms. No WebAssembly sidecars. No vector databases. No web UIs on localhost ports.

claudeops is **markdown, JavaScript, and JSON**. You can read every file in it. You can understand what each piece does. You can change anything in minutes.

| Principle | What it means |
|-----------|---------------|
| **Zero overhead** | No build step, no dependencies, no runtime services, no lock-in |
| **Just talk** | Describe what you want in natural language — intent routing handles the rest |
| **Few commands** | 1 new command to memorize (`/claudeops:create-skill`). Everything else auto-invokes. |
| **Skills over hooks** | Everything is a skill — readable, customizable, no hidden automation |
| **Deep context** | One init generates comprehensive project context that persists forever |
| **Readable internals** | Every skill is a SKILL.md you can open and understand |

## Installation

### Option 1: Marketplace (recommended)

```shell
/plugin marketplace add goamaan/claudeops
/plugin install claudeops@claudeops
```

### Option 2: Clone

```bash
git clone https://github.com/goamaan/claudeops.git ~/.claude-plugins/claudeops
claude --plugin-dir ~/.claude-plugins/claudeops
```

Then initialize your project:

```
/claudeops:init
```

This is where the magic happens. Init offers two modes:

### Full Deep Dive (recommended)

Multiple agents analyze your codebase in parallel:
- **explore** maps directories and entry points
- **architect** traces architecture and patterns
- **researcher** reads docs and understands domain
- **security** finds auth patterns and sensitive areas
- **tester** maps test structure and coverage
- **designer** analyzes UI patterns (if frontend detected)

Then you're interviewed for tacit knowledge:
- What does this product do?
- Any gotchas or footguns?
- Unwritten coding rules?
- Sensitive areas that need extra care?

The result: a comprehensive `.claude/CLAUDE.md` that enables you to paste a bug and have Claude know exactly where to look and how to fix it.

### Quick Setup

Basic scanning, minimal questions, fast initialization. Good for small projects or when you're in a hurry.

## What can it do?

### Say what you want. The right thing happens.

You don't pick modes or memorize commands. Just describe the problem.

| You say | What happens |
|---------|-------------|
| "build me an auth system" | **Autopilot** — discovers codebase, plans, executes in parallel, verifies, self-corrects |
| "plan first, then build" | **Plan-first mode** — architect plans, staff-engineer critiques, you approve, then execution |
| "fix CI" | **CI debugger** — pulls failure logs from `gh run`, diagnoses, fixes, verifies. Zero context needed from you. |
| *[paste a stack trace]* | **Paste-and-fix** — parses file paths and errors, skips interview, fixes directly |
| "fix containers" | **Container debugger** — reads Dockerfile + compose logs, diagnoses port/volume/env issues |
| "review this PR" | **Parallel review** — security, architecture, and testing agents review simultaneously |
| "grill me on this code" | **Adversarial review** — hostile staff engineer + red team. Demands evidence, won't rubber-stamp. |
| "explain how auth works" | **Teach mode** — traces code paths, generates ASCII architecture diagrams, step-by-step walkthrough |
| "tech debt report" | **Tech debt scan** — finds TODOs, dead code, duplicated logic, missing tests |
| "onboard me" | **Context dump** — project summary with architecture, recent activity, open PRs/issues |
| "query users by signup date" | **Query skill** — detects your database, writes SQL, shows it for approval, executes, analyzes results |
| "have we seen this before?" | **Recall** — surfaces relevant past learnings from `.claude/learnings/` |
| "work on auth and API in parallel" | **Worktree mode** — creates git worktrees for independent features, scoped agents per worktree |

### What you don't have to do

You don't have to remember that "fix CI" maps to the debug skill's CI workflow. The skill descriptions contain trigger phrases, and Claude matches your intent automatically. This is how Claude Code plugins are designed to work — you just haven't seen it done this way before.

### Quality built into CLAUDE.md

Instead of hidden hooks running in the background, claudeops generates CLAUDE.md with explicit rules:

```markdown
## Rules

- Always run `npm run lint` after modifying code
- Always run `npm run typecheck` after TypeScript changes
- Never commit directly to main/master
- Never commit .env, credentials, or secrets
- Complete all tasks before ending session
```

Claude follows these every session. You can see them, modify them, and understand exactly what's happening.

### Multi-agent orchestration

claudeops delegates work to 7 specialized agents:

| Agent | Tier | Role |
|-------|------|------|
| **architect** | opus | System design, deep analysis, plan critique, performance review |
| **executor** | sonnet | Code implementation — any complexity |
| **explore** | haiku | Fast file search and codebase mapping |
| **designer** | sonnet | UI/UX, components, styling |
| **tester** | sonnet | Test planning, TDD, quality assurance |
| **security** | opus | Security audit, threat modeling, OWASP |
| **researcher** | sonnet | Tech evaluation, best practices, API analysis |

Skills coordinate these agents using four patterns:

- **Fan-out** — parallel execution for independent work (review spawns 3 agents simultaneously)
- **Pipeline** — sequential handoff (diagnose → hypothesize → fix → verify)
- **Task graph** — complex dependencies tracked with TaskCreate/TaskUpdate
- **Speculative** — try 2-3 approaches in parallel, pick the winner

## How it works

```
claudeops/
├── skills/          # 10 workflow skills (SKILL.md files)
│   ├── init/        # Deep project setup + comprehensive CLAUDE.md generation
│   ├── autopilot/   # Autonomous execution (pipeline, swarm, worktree, plan-first)
│   ├── debug/       # Debugging (hypothesis, CI, container, paste-and-fix)
│   ├── review/      # Code review (PR, adversarial, explain/teach)
│   ├── scan/        # Codebase health (tech debt, context dump, refresh)
│   ├── recall/      # Retrieve past learnings from .claude/learnings/
│   ├── doctor/      # Plugin health + environment tips
│   ├── learn/       # Session learning capture
│   ├── query/       # Natural language → database queries
│   └── create-skill/# Scaffold new skills (user-only)
├── agents/          # 7 agent definitions (.md files)
└── scripts/         # Deterministic codebase scanner
```

Every skill is a markdown file with YAML frontmatter. No compiled code, no abstractions, no framework. Open any SKILL.md and you'll see exactly what it does — the trigger phrases, the agent assignments, the prompts, the output format.

### The scanner

`scripts/scan.mjs` performs deterministic codebase analysis and outputs JSON. It detects languages, frameworks, build systems, test runners, linters, CI/CD pipelines, databases, API styles, monorepo tools, and code conventions. Used by `init` and `scan` to bootstrap project understanding without burning tokens on exploration.

### Generated artifacts

After running `/claudeops:init`, you get:

```
.claude/
├── CLAUDE.md           # Comprehensive project context (loaded every session)
├── settings.json       # Permission allowlists for common commands
├── rules/              # Path-specific rules (optional)
│   ├── api.md          # Rules for src/api/**
│   └── testing.md      # Rules for **/*.test.*
└── learnings/          # Past debugging sessions (optional)
    ├── build-errors/
    ├── type-errors/
    └── patterns/
```

## Customization

### Create a new skill

```
/claudeops:create-skill
```

Or manually create `skills/<name>/SKILL.md`:

```yaml
---
description: What this skill does and trigger phrases for auto-invocation
user-invocable: true
---

# Skill Name

## When to Activate
...

## Execution Steps
...
```

### Add an agent

Create `agents/<name>.md` with YAML frontmatter describing the agent's specialty.

### Modify CLAUDE.md

The generated `.claude/CLAUDE.md` is yours to customize. Add rules, remove sections, tweak conventions. It's just markdown.

### Use @imports for large projects

If your project needs more documentation than fits in 400 lines:

```markdown
## Architecture
@docs/architecture.md

## API Patterns
@docs/api-guide.md
```

Claude Code imports these on demand, keeping your main CLAUDE.md lean.

## Skills Reference

| Skill | Trigger | What it does |
|-------|---------|--------------|
| **init** | "init", "initialize", "setup" | Deep codebase analysis + CLAUDE.md generation |
| **autopilot** | "build me", "autopilot", "full auto" | Autonomous end-to-end execution |
| **debug** | "fix bug", "debug", "fix CI", paste error | Hypothesis-driven debugging |
| **review** | "review", "audit", "explain" | Parallel code review, adversarial mode |
| **scan** | "tech debt", "onboard me", "context dump" | Codebase health and context |
| **recall** | "have we seen this", "remember" | Surface past learnings |
| **learn** | "capture this", "save learning" | Save debugging session for future |
| **query** | "query", "SQL", "analytics" | Natural language to database |
| **doctor** | "doctor", "check plugin" | Plugin health diagnostics |
| **create-skill** | manual only | Scaffold new custom skill |

## Requirements

- Claude Code
- Node.js 20+
- Git

## License

MIT
