---
description: Diagnose claudeops plugin setup, project configuration, and environment health. Run all checks and report pass/fail status.
user-invocable: true
disable-model-invocation: true
allowed-tools: [Bash, Read, Glob, Grep]
---

# Doctor Skill

Diagnose claudeops plugin setup, project configuration, and environment health.

## When to Activate

- User says "doctor" or "diagnose"
- Something isn't working with the plugin
- Skills or hooks not loading
- Project setup seems incomplete

## Diagnostic Checks

Run each check and report results:

### Check 1: Plugin Structure

Verify the claudeops plugin directory contains required files:

- `.claude-plugin/plugin.json` exists and is valid JSON
- `skills/` directory exists with SKILL.md files (expected: 7 skills)
- `agents/` directory exists with .md files (expected: 7 agents: architect, designer, executor, explore, researcher, security, tester)
- `hooks/hooks.json` exists and is valid JSON
- `hooks/` contains the .mjs files referenced in hooks.json
- `scripts/scan.mjs` exists

### Check 2: Node.js Version

```bash
node --version
```

Require Node.js 20+. Report if missing or too old.

### Check 3: Git Configuration

```bash
git --version
git config user.name
git config user.email
```

Report if git is missing or user not configured.

### Check 4: Project .claude/ Setup

Check the current working directory for:

- `.claude/CLAUDE.md` exists (suggest running `/claudeops:init` if missing)
- `.claude/settings.json` exists and is valid JSON
- `.claude/learnings/` directory (informational, not required)

### Check 5: Scanner Availability

```bash
node <plugin>/scripts/scan.mjs --help 2>&1 || echo "Scanner not found"
```

Verify the scanner script can be executed.

### Check 6: Hook Scripts

For each hook referenced in hooks.json, verify:
- The .mjs file exists
- The file is syntactically valid (`node --check <file>`)

## Report Format

```
## Doctor Report

### Status: [HEALTHY / WARNING / ERROR]

### Checks
- [x] Plugin structure valid (7 skills, 7 agents, 9 hooks)
- [x] Node.js v22.0.0 (meets v20+ requirement)
- [x] Git configured (user: Name <email>)
- [ ] Project .claude/CLAUDE.md missing
- [x] Scanner available
- [x] All hook scripts valid

### Issues Found

#### [WARNING] Missing project CLAUDE.md
The current project has no `.claude/CLAUDE.md`.

**Fix:** Run `/claudeops:init` to generate project configuration.

### Recommendations
- [Any suggested improvements]
```

## Anti-Patterns

1. **Making changes without asking** — Doctor diagnoses, it doesn't fix unless asked
2. **Skipping checks** — Run ALL checks even if early ones fail
3. **Vague output** — Every check must report pass/fail with specific details
