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
- **Agent teams integration** — complex tasks spawn coordinated agent teams that self-organize, share findings, and parallelize work natively
- **Intent routing** — say "fix CI" or paste an error and the right workflow fires automatically
- **Built-in guardrails** — CLAUDE.md rules for linting, typechecking, and security are baked in

### Design philosophy

**No new mental model.** You don't install claudeops to learn claudeops. You install it to make the thing you already use — Claude Code — better at the thing you already do — writing software.

There are no background services to run, no databases to configure, no separate CLI to learn, no runtimes to install. No Byzantine consensus algorithms. No WebAssembly sidecars. No vector databases. No web UIs on localhost ports.

claudeops is **pure markdown**. You can read every file in it. You can understand what each piece does. You can change anything in minutes.

| Principle | What it means |
|-----------|---------------|
| **Zero overhead** | No build step, no dependencies, no runtime services, no lock-in |
| **Just talk** | Describe what you want in natural language — intent routing handles the rest |
| **Few commands** | 1 new command to memorize (`/claudeops:create-skill`). Everything else auto-invokes. |
| **Skills over scripts** | Everything is a skill — readable, customizable, no hidden automation |
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

### Updating

After claudeops updates (auto-update or manual), **re-run `/claudeops:init`** in Enhance mode to get new features in your generated CLAUDE.md. The plugin code updates automatically, but your project's `.claude/CLAUDE.md` was generated from the *previous* template and won't have new rules, routing, or conventions until you re-init.

```
/claudeops:init  →  "Enhance (Recommended)"
```

This preserves your existing content while adding new sections from the latest template. If you only want to check for codebase drift (new files, changed commands) without re-running the full init, use `/claudeops:scan refresh` instead — but note that scan only detects codebase changes, not plugin template changes.

**Auto-update**: Marketplace plugins auto-update by default. If you cloned manually, pull the latest:

```bash
cd ~/.claude-plugins/claudeops && git pull
```

### First-time setup

This is where the magic happens. Init offers two modes:

### Full Deep Dive (recommended)

Multiple agents analyze your codebase in parallel:
- **explore** maps directories, languages, frameworks, and commands
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

Fast analysis, minimal questions, basic initialization. Good for small projects or when you're in a hurry.

## What can it do?

### Say what you want. The right thing happens.

You don't pick modes or memorize commands. Just describe the problem.

| You say | What happens |
|---------|-------------|
| "build me an auth system" | **Autopilot** — discovers codebase, plans, agent teams coordinate the work in parallel, verify, self-correct |
| "plan first, then build" | **Pipeline with plan-first** — architect plans, staff-engineer critiques, you approve, then execution |
| "fix CI" | **CI debugger** — pulls failure logs from `gh run`, diagnoses, fixes, verifies. Zero context needed from you. |
| *[paste a stack trace]* | **Paste-and-fix** — parses file paths and errors, skips interview, fixes directly |
| "fix containers" | **Container debugger** — reads Dockerfile + compose logs, diagnoses port/volume/env issues |
| "review this PR" | **Agent team review** — security, architecture, and testing reviewers coordinate in parallel |
| "grill me on this code" | **Adversarial agent team** — hostile staff engineer + red team. Demands evidence, won't rubber-stamp. |
| "explain how auth works" | **Teach mode** — traces code paths, generates ASCII architecture diagrams, step-by-step walkthrough |
| "tech debt report" | **Tech debt scan** — finds TODOs, dead code, duplicated logic, missing tests |
| "onboard me" | **Context dump** — project summary with architecture, recent activity, open PRs/issues |
| "query users by signup date" | **Query skill** — detects your database, writes SQL, shows it for approval, executes, analyzes results |
| "have we seen this before?" | **Recall** — surfaces relevant past learnings from `.claude/learnings/` |
| "work on auth and API in parallel" | **Worktree mode** — creates git worktrees for independent features, scoped agents per worktree |

### What you don't have to do

You don't have to remember that "fix CI" maps to the debug skill's CI workflow. The skill descriptions contain trigger phrases, and Claude matches your intent automatically. This is how Claude Code plugins are designed to work — you just haven't seen it done this way before.

### Quality built into CLAUDE.md

Instead of hidden scripts running in the background, claudeops generates CLAUDE.md with explicit rules:

```markdown
## Rules

- Always run `npm run lint` after modifying code
- Always run `npm run typecheck` after TypeScript changes
- Never commit directly to main/master
- Never commit .env, credentials, or secrets
- Complete all tasks before ending session
```

Claude follows these every session. You can see them, modify them, and understand exactly what's happening.

### Agent teams + subagents

claudeops uses two coordination strategies:

**Agent teams** for complex parallel work — multiple Claude sessions coordinate via native TeammateTool:
- PR review with security, architecture, and testing reviewers
- Autopilot execution with multiple workers sharing a task list
- Performance debugging across database, API, and frontend layers
- Competing hypothesis testing during uncertain debugging

**Subagents** for focused single tasks — sequential pipelines and quick analysis:
- CI debugging: diagnose → fix → verify
- Paste-and-fix: parse error → read files → fix → test
- Init analysis: foundation scan → deep dive → interview

Skills choose the right strategy automatically based on the task.

claudeops delegates work to 7 specialized agents:

| Agent | Role |
|-------|------|
| **architect** | System design, deep analysis, plan critique, performance review |
| **executor** | Code implementation — any complexity |
| **explore** | Fast file search and codebase mapping |
| **designer** | UI/UX, components, styling |
| **tester** | Test planning, TDD, quality assurance |
| **security** | Security audit, threat modeling, OWASP |
| **researcher** | Tech evaluation, best practices, API analysis |

## How it works

```
claudeops/
├── skills/          # 10 workflow skills (SKILL.md files)
│   ├── init/        # Deep project setup + comprehensive CLAUDE.md generation
│   ├── autopilot/   # Autonomous execution (team, pipeline, worktree)
│   ├── debug/       # Debugging (hypothesis, CI, container, paste-and-fix)
│   ├── review/      # Code review (PR, adversarial, explain/teach)
│   ├── scan/        # Codebase health (tech debt, context dump, refresh)
│   ├── recall/      # Retrieve past learnings from .claude/learnings/
│   ├── doctor/      # Plugin health + environment tips
│   ├── learn/       # Session learning capture
│   ├── query/       # Natural language → database queries
│   └── create-skill/# Scaffold new skills (user-only)
└── agents/          # 7 agent definitions (.md files)
```

Every skill is a markdown file with YAML frontmatter. No compiled code, no abstractions, no framework. Open any SKILL.md and you'll see exactly what it does — the trigger phrases, the agent assignments, the prompts, the output format.

### Generated artifacts

After running `/claudeops:init`, you get:

```
.claude/
├── CLAUDE.md           # Comprehensive project context (loaded every session)
├── settings.json       # Permission allowlists for common commands + CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS env var
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

If your project needs more documentation than fits in 600 lines:

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

## License

MIT
