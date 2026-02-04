# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2026-02-04

Remove deterministic scanner in favor of AI-driven analysis. Pure markdown architecture.

### Removed

- **Deterministic scanner** (`scripts/scan.mjs`): 1300+ lines of JavaScript pattern matching replaced by AI-driven foundation analysis
- **scripts/ directory**: No more JavaScript in the project
- **Node.js requirement**: Only Claude Code is required now

### Changed

- **init skill**: Now uses explore agent for foundation analysis instead of scanner
  - Extracts languages, frameworks, commands, and project structure via AI
  - Better semantic understanding than pattern matching
  - Self-updating for new frameworks without code changes
  - Conditional agent spawning based on foundation agent findings
- **doctor skill**: Removed scanner and hook checks, simplified to plugin/project structure validation
- **Tech stack**: Changed from "Markdown, JavaScript, JSON" to "Markdown only"

### Why

The scanner was 1300 lines of maintenance burden that duplicated what AI agents already do better. Init spawns 3-6 agents anyway - having them also handle foundation analysis is simpler and more capable.

## [2.0.0] - 2026-02-03

Major restructuring + Boris's 10 Tips integration. Consolidate 18 agents to 7, expand 7 skills to 9 with new workflows/modes, remove hooks for simplicity, and make orchestration the default behavior via init-generated CLAUDE.md. Zero new commands to memorize (except `create-skill` for meta/setup).

### Added

- **2 new skills** (7 → 9):
  - `query`: Natural language to SQL/database query translation with safety gates
  - `create-skill`: Generate new claudeops skills from templates (user-only)
- **2 new hooks** (9 → 11):
  - `rule-suggester` (Stop): Detects user corrections during session, prompts CLAUDE.md rule updates
  - `smart-approve` (PreToolUse Bash): Auto-approves safe commands (read-only, git read, build/test), flags dangerous ones (rm -rf, force push, sudo, pipe-to-shell, destructive SQL)
- **3 new debug workflows**: CI/Pipeline debugging (zero-context from CI logs), Container/Docker debugging, Paste-and-Fix (quick mode for pasted errors)
- **2 new review modes**: Adversarial/Challenge (demands evidence, red-teams code), Explain/Teach (layered explanations with ASCII diagrams)
- **3 new autopilot modes**: Parallel Worktree (independent feature tracks via git worktree), Plan-First (strict user approval gate between plan and execution), Subagent Context Management guidance
- **2 new scan workflows**: Tech Debt Analysis (TODOs, dead code, duplication, missing tests), Context Aggregation (project summary for onboarding)
- **Environment optimization** in doctor: tmux detection, shell aliases, statusline config, OS-specific tips
- **Intent routing table** in init-generated CLAUDE.md template
- **Rules section placeholder** in init-generated CLAUDE.md template
- **Rule check note** in learn skill for behavioral rules

### Changed

- **Agent consolidation (18 → 7)**: Merged overlapping agents into focused roles
  - `architect` absorbs architecture-strategist, performance-oracle, critic
  - `security` absorbs security-sentinel
  - `researcher` absorbs best-practices-researcher
  - `executor` absorbs executor-low
  - `qa-tester` renamed to `tester`
- **Skill consolidation (12 → 7)**: Removed thin wrappers, embedded orchestration in init
  - `init` now generates CLAUDE.md with orchestration instructions and per-project agent filtering
  - `autopilot` absorbs planner skill's interview methodology
  - `tester` agent absorbs testing skill's TDD workflow
- **Removed model routing**: No more `model:` in agent/skill frontmatter; Claude Code handles model selection natively
- **Updated all remaining skills** (autopilot, debug, review, doctor) to reference 7-agent roster

### Removed

- **11 agents**: architecture-strategist, performance-oracle, critic, security-sentinel, best-practices-researcher, executor-low, planner, writer, vision, git-history-analyzer, code-simplicity-reviewer
- **5 skills**: orchestrate (→ init-generated CLAUDE.md), planner (→ autopilot), executor (thin wrapper), security (thin wrapper), testing (→ tester agent)
- **Orchestrate references/**: Domain guides and pattern references distilled into init template and autopilot skill
- All `model:` frontmatter from agents and skills

## [1.0.0] - 2026-02-01

Initial release of claudeops as a **Claude Code directory plugin**.

Zero dependencies. No build step. Just markdown, JavaScript, and JSON.

### Added

- **Plugin manifest** (`.claude-plugin/plugin.json`)
- **12 workflow skills**: init, scan, orchestrate, autopilot, planner, executor, debug, review, testing, security, doctor, learn
- **18 specialized agents** across opus/sonnet/haiku tiers for multi-agent orchestration
- **9 event-driven hooks**: security-scan, git-branch-check, lint-changed, typecheck-changed, continuation-check, session-save, session-learner, session-restore, learning-retriever
- **Codebase scanner** (`scripts/scan.mjs`) — pure ESM JavaScript, detects languages, frameworks, build systems, test frameworks, linters, CI/CD, databases, API styles, monorepo tools, and code conventions
- **Session memory**: save/restore context across sessions, capture and retrieve learnings
- **Project instructions** (`.claude/CLAUDE.md`)

### Usage

```bash
claude --plugin-dir /path/to/claudeops
```

Skills are invoked as `/claudeops:<name>` (e.g., `/claudeops:init`, `/claudeops:scan`).
