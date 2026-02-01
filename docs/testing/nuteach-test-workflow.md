# claudeops v4 Test Workflow — nuteach

Full end-to-end test workflow for validating all claudeops features against the [nuteach](https://github.com/goamaan/nuteach) project.

## Prerequisites

```bash
# Ensure claudeops is built and linked
cd ~/code/claudeops && bun run build && bun link

# Verify CLI works
cops --version    # should print 3.2.0
cops doctor       # should show DEGRADED or HEALTHY
```

## Part 1: CLI Command Validation

### 1A. Core Commands

```bash
# Profile management
cops profile list                     # Shows: default, orchestrator
cops profile show orchestrator        # Shows full profile with agents, model config
cops profile create nuteach-dev -d "Nuteach development profile" -a
cops profile show nuteach-dev

# Sync
cops sync --force                     # Syncs skills + hooks + CLAUDE.md to ~/.claude/

# Doctor
cops doctor                           # Runs all 12 diagnostic checks
cops doctor --category skills         # Just skill health checks
cops doctor --category hooks          # Hook conflict detection
```

### 1B. Ecosystem Commands

```bash
# Skill management
cops skill list                       # Lists all 14 skills
cops skill list --enabled             # Just enabled skills
cops skill list --json                # JSON output

# Hook management
cops hook list                        # Lists all 23 hooks
cops hook list --enabled              # Just enabled hooks
cops hook list --event Stop           # Hooks for Stop event

# Learning system (initially empty)
cops learn list                       # "No learnings captured yet"
cops learn clear --force              # Should succeed even when empty
```

### 1C. Analysis Commands

```bash
cd ~/code/nuteach

# Scan
cops scan                             # Human-readable analysis
cops scan --json                      # Machine-readable JSON
cops scan --conventions               # Generate conventions.json

# Init (already done, verify idempotent)
cops init --project --force           # Should regenerate artifacts
```

### 1D. Team Sharing

```bash
# Export
cops team export                                    # Prints JSON to stdout
cops team export --output /tmp/team-config.json     # Saves to file

# Import (create a test profile first, then import)
cops team import /tmp/team-config.json --force      # Should import config
```

## Part 2: Hook Integration Testing

These hooks fire automatically during Claude Code sessions. To test them, open Claude Code in the nuteach project.

### 2A. UserPromptSubmit Hooks

Hooks that fire on every prompt:

| Hook | What to verify | How to check |
|------|----------------|--------------|
| `thinking-level` | Injects thinking mode based on task complexity | Check `<user-prompt-submit-hook>` output in Claude's context |
| `keyword-detector` | Detects keywords in prompts | Try prompts with "security", "performance" |
| `learning-retriever` | Searches learnings for relevant context | Will activate once learnings exist |
| `session-restore` | Restores previous session state | Check `.claude/session-state.json` on 2nd session |

### 2B. Stop Hooks

Hooks that fire when Claude Code session ends:

| Hook | What to verify | How to check |
|------|----------------|--------------|
| `session-save` | Saves branch, modified files, stats | Check `.claude/session-state.json` after session |
| `session-learner` | Detects resolved problems, prompts learning capture | End session after fixing a bug/error |
| `checkpoint` | Session checkpoint logging | Check session logs |
| `continuation-check` | Context continuation prompt | Fires on natural session end |
| `version-bump-prompt` | Version bump reminder | Fires after feature work |

### 2C. PostToolUse Hooks

Hooks that fire after tool calls:

| Hook | What to verify | How to check |
|------|----------------|--------------|
| `lint-changed` | Runs linter on written files | Write a `.ts`/`.tsx` file, check for lint output |
| `typecheck-changed` | Runs typecheck on written files | Write a `.ts` file with type errors |

## Part 3: Feature Prompt Test Scenario

This scenario exercises all claudeops features in a realistic workflow.

### Setup

```bash
cd ~/code/nuteach

# 1. Make sure claudeops artifacts are fresh
cops init --project --force
cops scan --conventions
cops sync --force

# 2. Check session state (should be empty or from previous session)
cat .claude/session-state.json 2>/dev/null || echo "No previous session"

# 3. Start Claude Code
claude
```

### Test Prompt

Use this prompt in Claude Code to exercise the full stack:

```
Add a "Study Streak" feature to nuteach. When a student completes a flashcard
review session (SpacedRepetitionCard), track consecutive days of study and show
a streak counter on the dashboard.

This needs:
1. A new Prisma model `StudyStreak` with fields: userId, courseId, currentStreak,
   longestStreak, lastStudyDate
2. Server logic in a new file app/server/streak.server.ts
3. A streak display component app/components/streak-badge.tsx
4. Integration into the existing dashboard route
```

### What This Tests

| claudeops Feature | How It's Exercised |
|---|---|
| **Scanner/CLAUDE.md** | Claude reads `.claude/CLAUDE.md` for build commands, frameworks |
| **Conventions** | Claude follows `conventions.json` (kebab-case files, named exports, direct imports) |
| **Thinking Level** | Hook detects "feature" keyword, sets thinking to extended |
| **Lint Hook** | PostToolUse fires after writing `.ts`/`.tsx` files |
| **Typecheck Hook** | PostToolUse fires typecheck after writes |
| **Session Save** | On session end, saves modified files and branch info |
| **Session Restore** | On next session, restores context about what was changed |
| **Learning Capture** | If errors occur and get fixed, session-learner detects resolution patterns |
| **Learning Retriever** | On subsequent prompts, retrieves any captured learnings |
| **Keyword Detector** | Detects task-related keywords in prompts |

### Verification Checklist

After the Claude Code session, verify:

```bash
# 1. Session state was saved
cat .claude/session-state.json
# Should show: branch, modifiedFiles, stats, stopReason

# 2. Check if any learnings were captured
cops learn list
# If errors were resolved during session, should show learnings

# 3. Verify conventions were followed
# Check that new files use kebab-case naming
ls app/server/streak*.ts app/components/streak*.tsx

# 4. Verify lint/typecheck hooks fired
# Check session transcript or Claude's output for lint/typecheck messages

# 5. Start a NEW session to test session-restore
claude
# First prompt should see "<previous_session>" context injected
```

### Second Session Test

Start a new Claude Code session immediately after:

```
Continue the study streak feature. Add tests for the streak calculation logic
and make sure the streak resets if a day is missed.
```

This verifies:
- **session-restore** hook injects previous session context (branch, files changed)
- **learning-retriever** injects any learnings from first session
- **continuation-check** context is available

## Part 4: Doctor Validation After Testing

```bash
# Run full diagnostics after all testing
cops doctor

# Expected results:
# - installation: all pass
# - configuration: pass
# - profiles: pass (active profile exists)
# - skills: pass (all installed skills valid)
# - hooks: may warn about conflicts (multiple Stop hooks is expected)
# - learnings: pass (structure valid if learnings were captured)
```

## Known Issues / Expected Warnings

1. **Help text after commands**: citty framework prints parent run() after subcommand. Cosmetic only.
2. **Hook conflicts warning**: Multiple hooks on `Stop:*` and `UserPromptSubmit:*` is by design.
3. **Hooks settings validation**: Doctor warns about missing `matcher`/`command` because the Claude Code hook format uses nested `hooks` arrays, not flat fields. Pre-existing validator mismatch.

## Command Quick Reference

| Command | Status | Notes |
|---|---|---|
| `cops init` | Working | Use `--project --force` to skip prompts |
| `cops profile list` | Working | |
| `cops profile show <name>` | Working | Requires explicit name |
| `cops profile create <name>` | Working | |
| `cops sync --force` | Working | Without `--force`, prompts for confirmation |
| `cops doctor` | Working | 12 checks including new skill/hook/learning checks |
| `cops skill list` | Working | |
| `cops hook list` | Working | Supports `--enabled`, `--event` filters |
| `cops learn list` | Working | |
| `cops scan` | Working | Supports `--json`, `--conventions`, `--generate` |
| `cops team export` | Working | Supports `--output` |
| `cops team import` | Working | Requires `--force` to skip confirmation |
| `cops reset` | Untested | Use with caution |
| `cops upgrade` | Untested | Checks for npm updates |
