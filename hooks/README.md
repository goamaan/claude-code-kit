# claudeops Hooks

This directory contains Claude Code hooks that enhance and modify Claude's behavior.

## Overview

Hooks intercept Claude Code at key points to inject context, validate actions, or modify behavior. All hooks in this directory follow the CLI stdin/stdout pattern required by Claude Code.

## Available Hooks

### keyword-detector.mjs

**Event:** `UserPromptSubmit`

Detects keywords in user prompts and injects mode-specific context via `additionalContext`.

**Detected Keywords:**

| Keywords | Mode | Effect |
|----------|------|--------|
| `ultrawork`, `ulw`, `uw` | ULTRAWORK | Maximum parallel execution, aggressive delegation |
| `autopilot`, `build me`, `create a`, `make me` | AUTOPILOT | 5-phase autonomous execution |
| `plan this`, `plan the`, `how should I` | PLANNER | Structured interview + task breakdown |
| `investigate`, `debug`, `analyze` | ANALYSIS | Deep analysis via architect agent |
| `find`, `search`, `locate` | SEARCH | Parallel explore agents |

**Test:**
```bash
echo '{"prompt": "ultrawork this feature"}' | node keyword-detector.mjs
```

---

### continuation-check.mjs

**Event:** `Stop`

Evaluates whether Claude should stop or continue working. Blocks premature stopping when tasks remain pending.

**Behavior:**
- Scans `~/.claude/tasks/` for pending tasks
- Returns `decision: "block"` with reason when incomplete tasks found
- Allows stop when all tasks are complete

**Test:**
```bash
echo '{"cwd": "/path/to/project"}' | node continuation-check.mjs
```

---

### lint-changed.mjs

**Event:** `PostToolUse`
**Matcher:** `Edit|Write`

Runs ESLint after Write/Edit tools modify JavaScript/TypeScript files.

**Behavior:**
- Triggers on `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs` files
- Finds project's ESLint config automatically
- Reports errors via `additionalContext`

---

### typecheck-changed.mjs

**Event:** `PostToolUse`
**Matcher:** `Edit|Write`

Runs TypeScript type checking after Write/Edit tools modify TypeScript files.

**Behavior:**
- Triggers on `.ts`, `.tsx` files
- Finds project's `tsconfig.json` automatically
- Uses `npm run typecheck` or `npx tsc --noEmit`
- Reports errors via `additionalContext`

---

### checkpoint.mjs

**Event:** `Stop`

Creates git stash checkpoint before session ends if uncommitted changes exist.

**Behavior:**
- Checks for uncommitted changes via `git status`
- Creates timestamped stash: `claudeops-checkpoint-YYYY-MM-DD-HH:MM:SS`
- Only activates when changes exist

---

### thinking-level.mjs

**Event:** `UserPromptSubmit`

Detects complex tasks and adds reasoning enhancement instructions.

**Triggers:**
- Complex terminology: architecture, security, performance, debug
- Multi-step tasks
- Analysis requests

---

### cost-warning.mjs

**Event:** `UserPromptSubmit`

Warns when approaching daily cost budget based on token usage.

**Behavior:**
- Tracks cumulative costs per day
- Estimates costs based on input/output tokens
- Warns at 80% and 95% of daily budget
- Configurable via `CLAUDE_DAILY_BUDGET` environment variable

**Environment:**
```bash
export CLAUDE_DAILY_BUDGET=50.0  # Default: $50/day
```

---

### security-scan.mjs

**Event:** `PreToolUse`
**Matcher:** `Bash` (git commands)

Scans for secrets and sensitive data before git commits.

**Detects:**
- API keys, tokens, passwords
- AWS credentials
- GitHub tokens
- Private keys
- Connection strings
- Sensitive file names (.env, credentials.json, etc.)

**Bypass:**
```bash
export SKIP_SECRET_SCAN=1
```

---

### test-reminder.mjs

**Event:** `PostToolUse`
**Matcher:** `Edit|Write`

Reminds to run tests after code changes.

**Behavior:**
- Tracks modified source files
- Detects test framework (pytest, jest, vitest, go test, cargo test)
- Reminds every 15 minutes
- Suggests appropriate test command

**Bypass:**
```bash
export SKIP_TEST_REMINDER=1
```

---

### format-on-save.mjs

**Event:** `PostToolUse`
**Matcher:** `Edit|Write`

Automatically formats files after Write/Edit operations.

**Supported Formatters:**
- Prettier (JS/TS/JSON/CSS/HTML/YAML/MD)
- Black (Python)
- rustfmt (Rust)
- gofmt (Go)
- clang-format (C/C++)

**Bypass:**
```bash
export SKIP_AUTO_FORMAT=1
```

---

### git-branch-check.mjs

**Event:** `PreToolUse`
**Matcher:** `Bash` (git commands)

Warns when attempting to commit or push to protected branches.

**Protected Branches:**
- main
- master
- production
- prod

**Bypass:**
```bash
export SKIP_BRANCH_CHECK=1
```

---

### todo-tracker.mjs

**Event:** `UserPromptSubmit`

Tracks TODO items mentioned in user prompts.

**Detects:**
- `TODO: item`
- `FIXME: item`
- `HACK: item`
- `[ ] item` (checkbox format)

**Completion:**
- `done: item`
- `[x] item`

**Clear:**
```bash
export CLEAR_SESSION_TODOS=1
```

---

### session-log.mjs

**Event:** `Stop`

Logs session summary when Claude stops.

**Tracks:**
- Session duration
- Token usage (input/output)
- Estimated cost
- Tools invoked
- Files modified
- Commands run

**Logs saved to:**
- `~/.claudeops/logs/sessions/{date}.jsonl` (JSONL format)
- `~/.claudeops/logs/sessions/{sessionId}.txt` (human-readable)

---

### large-file-warning.mjs

**Event:** `PreToolUse`
**Matcher:** `Read`

Warns before reading large files that could consume excessive tokens.

**Thresholds:**
- Warning: 100 KB
- Critical: 500 KB

**Suggests:**
- Read specific lines with offset/limit
- Use Grep for targeted search
- Use Bash with head/tail

**Bypass:**
```bash
export SKIP_FILE_SIZE_CHECK=1
```

---

## Hook Configuration

Hooks are registered in `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "hooks": [{
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR/hooks/keyword-detector.mjs\"",
        "timeout": 10
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR/hooks/continuation-check.mjs\"",
        "timeout": 15
      }]
    }],
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR/hooks/lint-changed.mjs\"",
        "timeout": 30
      }]
    }]
  }
}
```

## Hook Architecture

All hooks follow this pattern:

1. Read JSON from stdin
2. Process input and determine action
3. Output JSON to stdout (or exit silently)
4. Exit with code 0

### Input Format

```json
{
  "prompt": "user message",        // UserPromptSubmit
  "tool_name": "Edit",             // PreToolUse/PostToolUse
  "tool_input": {...},             // PreToolUse/PostToolUse
  "cwd": "/current/directory",     // All events
  "session_id": "abc123"           // All events
}
```

### Output Format

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "Injected context here"
  }
}
```

Or for Stop hooks:
```json
{
  "decision": "block",
  "reason": "Explanation why blocking"
}
```

## Creating New Hooks

1. Create `.mjs` file in this directory
2. Follow stdin/stdout pattern
3. Add to `hooks.json` manifest
4. Register in `.claude/settings.json`

Example template:

```javascript
#!/usr/bin/env node
import { readFileSync } from 'fs';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

// Your hook logic here

if (shouldInjectContext) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'YourEvent',
      additionalContext: 'Your context'
    }
  }));
}

process.exit(0);
```

## Testing Hooks

```bash
# Test keyword detection
echo '{"prompt": "build me a web app"}' | node keyword-detector.mjs

# Test continuation check
echo '{"cwd": "."}' | node continuation-check.mjs

# Run all hooks through eslint
npm run lint -- hooks/*.mjs
```
