---
description: Diagnose claudeops plugin setup, project configuration, and environment health. Run all checks and report pass/fail status.
user-invocable: true
disable-model-invocation: true
allowed-tools: [Read, Glob, Grep]
---

# Doctor Skill

Diagnose claudeops plugin setup, project configuration, and environment health.

## When to Activate

- User says "doctor" or "diagnose"
- Something isn't working with the plugin
- Skills not loading
- Project setup seems incomplete

## Diagnostic Checks

Run each check and report results:

### Check 1: Plugin Structure

Verify the claudeops plugin directory contains required files:

- `.claude-plugin/plugin.json` exists and is valid JSON
- `skills/` directory exists with SKILL.md files (expected: 10 skills)
- `agents/` directory exists with .md files (expected: 7 agents: architect, designer, executor, explore, researcher, security, tester)

Use Glob to find files, Read to validate JSON.

### Check 2: Skill Definitions

For each skill in `skills/*/SKILL.md`:
- Verify YAML frontmatter is valid
- Verify `description` field exists
- Verify `allowed-tools` field exists
- Report any skills missing required fields

### Check 3: Agent Definitions

For each agent in `agents/*.md`:
- Verify YAML frontmatter is valid
- Verify `name`, `description`, `model`, `tools` fields exist
- Report expected model tier (haiku/opus)

### Check 4: Project .claude/ Setup

Check the current working directory for:

- `.claude/CLAUDE.md` exists (suggest running `/claudeops:init` if missing)
- `.claude/settings.json` exists and is valid JSON
  - Verify `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set to `"1"` (suggest re-running `/claudeops:init` if missing)
- `.claude/learnings/` directory (informational, not required)
- `.claude/rules/` directory (informational, not required)

### Check 5: Environment Detection

Detect environment features and suggest productivity optimizations:

- Detect shell type from current context
- Check if project has git initialized
- Check for common project types (Node.js, Python, Rust, Go, etc.)

**Suggestions by detection**:

| Detection | Suggestion |
|-----------|-----------|
| No `.claude/CLAUDE.md` in project | Suggest running `/claudeops:init` |
| No `.claude/settings.json` | Suggest running `/claudeops:init` for permission allowlists |
| Large codebase detected | Suggest using `claudeops:explore` agent for file discovery |
| Monorepo detected | Note that init will detect workspaces and map them |

Output actionable tips, not just diagnostics.

## Report Format

```
## Doctor Report

### Status: [HEALTHY / WARNING / ERROR]

### Checks
- [x] Plugin structure valid (10 skills, 7 agents)
- [x] All skill definitions valid
- [x] All agent definitions valid
- [ ] Project .claude/CLAUDE.md missing
- [x] Project has git initialized

### Issues Found

#### [WARNING] Missing project CLAUDE.md
The current project has no `.claude/CLAUDE.md`.

**Fix:** Run `/claudeops:init` to generate project configuration.

### Environment Tips
- [tip 1]
- [tip 2]

### Recommendations
- [Any suggested improvements]
```

## Anti-Patterns

1. **Making changes without asking** — Doctor diagnoses, it doesn't fix unless asked
2. **Skipping checks** — Run ALL checks even if early ones fail
3. **Vague output** — Every check must report pass/fail with specific details
4. **Using Bash** — Use Read/Glob/Grep tools for cross-platform compatibility
