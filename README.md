<div align="center">

# claudeops

**Make Claude Code do more — without learning more.**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code Plugin](https://img.shields.io/badge/claude_code-plugin-purple.svg)](https://docs.anthropic.com/en/docs/claude-code)

9 workflow skills. 7 specialized agents. 11 quality hooks. Zero dependencies.

[Get Started](#installation) | [What It Does](#what-can-it-do) | [How It Works](#how-it-works) | [Reference](#skills)

</div>

---

## Why claudeops?

Claude Code is already good. But it works alone, forgets between sessions, and doesn't know your project's conventions until you tell it — every time.

claudeops fixes that. Install it once, run `/claudeops:init`, and Claude Code gains:

- **Multi-agent orchestration** — fan out work to specialized agents that run in parallel
- **Session memory** — learnings, corrections, and context persist across sessions
- **Intent routing** — say "fix CI" or paste an error and the right workflow fires automatically
- **Quality guardrails** — hooks catch secrets, flag dangerous commands, and lint your code before you see it

### Design philosophy

**No new mental model.** You don't install claudeops to learn claudeops. You install it to make the thing you already use — Claude Code — better at the thing you already do — writing software.

There are no background services to run, no databases to configure, no separate CLI to learn, no runtimes to install. No Byzantine consensus algorithms. No WebAssembly sidecars. No vector databases. No web UIs on localhost ports.

claudeops is **markdown, JavaScript, and JSON**. You can read every file in it. You can understand what each piece does. You can change anything in minutes.

| Principle | What it means |
|-----------|---------------|
| **Zero overhead** | No build step, no dependencies, no runtime services, no lock-in |
| **Just talk** | Describe what you want in natural language — intent routing handles the rest |
| **Few commands** | 1 new command to memorize (`/claudeops:create-skill`). Everything else auto-invokes. |
| **Quality over quantity** | 9 skills that cover real workflows, not 30+ thin wrappers |
| **Readable internals** | Every skill is a SKILL.md you can open and understand |
| **Native plugin** | Uses Claude Code's plugin system as designed — skills, agents, hooks |

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

This scans your codebase, detects your stack, and generates `.claude/CLAUDE.md` with orchestration instructions, an intent routing table, and project-specific conventions. Claude reads this every session — no repeated explanations.

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
| "work on auth and API in parallel" | **Worktree mode** — creates git worktrees for independent features, scoped agents per worktree |

### What you don't have to do

You don't have to remember that "fix CI" maps to the debug skill's CI workflow. The skill descriptions contain trigger phrases, and Claude matches your intent automatically. This is how Claude Code plugins are designed to work — you just haven't seen it done this way before.

### Hooks that work in the background

Things you never have to think about:

- **Smart command approval** — `ls`, `git status`, `npm test` run without friction. `rm -rf`, `git push --force`, `sudo` get flagged with a warning.
- **Secret scanning** — catches API keys, tokens, and credentials before they hit git.
- **Branch protection** — warns when you're about to commit to main.
- **Auto-lint and typecheck** — runs on files you just edited, not the whole project.
- **Session memory** — saves state on exit, restores on next session. Learnings from past debugging sessions surface when relevant.
- **Rule learning** — when you correct Claude ("don't do that", "always use X"), the rule-suggester prompts Claude to save it to your CLAUDE.md. Next session, it already knows.

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
├── skills/          # 9 workflow skills (SKILL.md files)
│   ├── init/        # Project setup + CLAUDE.md generation
│   ├── autopilot/   # Autonomous execution (pipeline, swarm, worktree, plan-first)
│   ├── debug/       # Debugging (hypothesis, CI, container, paste-and-fix)
│   ├── review/      # Code review (PR, adversarial, explain/teach)
│   ├── scan/        # Codebase analysis (enhanced scan, tech debt, context dump)
│   ├── doctor/      # Plugin health + environment tips
│   ├── learn/       # Session learning capture
│   ├── query/       # Natural language → database queries
│   └── create-skill/# Scaffold new skills (user-only)
├── agents/          # 7 agent definitions (.md files)
├── hooks/           # 11 event-driven hooks (.mjs + hooks.json)
└── scripts/         # Deterministic codebase scanner
```

Every skill is a markdown file with YAML frontmatter. No compiled code, no abstractions, no framework. Open any SKILL.md and you'll see exactly what it does — the trigger phrases, the agent assignments, the prompts, the output format.

### The scanner

`scripts/scan.mjs` performs deterministic codebase analysis and outputs JSON. It detects languages, frameworks, build systems, test runners, linters, CI/CD pipelines, databases, API styles, monorepo tools, and code conventions. Used by `init` and `scan` to bootstrap project understanding without burning tokens on exploration.

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

### Add a hook

1. Create a `.mjs` file in `hooks/`
2. Register it in `hooks/hooks.json`
3. Hook reads JSON from stdin, outputs JSON to stdout

## Requirements

- Claude Code
- Node.js 20+
- Git

## License

MIT
