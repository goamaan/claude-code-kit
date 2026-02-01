# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
