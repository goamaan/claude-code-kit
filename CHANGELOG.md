# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Major restructuring: fewer, better pieces. Consolidate 18 agents to 7, 12 skills to 7, remove model routing, and make orchestration the default behavior via init-generated CLAUDE.md.

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
