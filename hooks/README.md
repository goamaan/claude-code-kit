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
