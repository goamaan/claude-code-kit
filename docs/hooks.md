# Hooks System Guide

Hooks are a powerful extension mechanism in Claude Code that intercept and control tool execution. They enable validation, security policies, logging, auditing, and dynamic input transformation without modifying the core runtime.

## Overview

Hooks execute at specific points in the tool lifecycle and can:

- **Validate** inputs before tool execution
- **Transform** tool inputs dynamically
- **Block** dangerous or policy-violating commands
- **Log** and audit tool usage
- **Monitor** subagent execution
- **Perform cleanup** when execution completes

## Hook Events

Claude Code supports four hook events:

### PreToolUse

Triggers before any tool is executed. Use PreToolUse hooks to:
- Validate and sanitize inputs
- Enforce security policies
- Block dangerous operations
- Log tool invocations
- Modify tool parameters

**Input:**
```javascript
{
  tool_name: string,           // e.g., "Bash", "Read", "Write"
  tool_input: Record<string, unknown>,  // Tool parameters
  session_id?: string,         // Session ID
  agent_type?: string,         // Subagent type (if subagent)
  timestamp?: string           // ISO 8601 timestamp
}
```

**Example Use Cases:**
- Block `rm -rf /` commands (rm-rf-guard addon)
- Block dangerous git operations (safety-net addon)
- Prevent reading sensitive files (claude-ignore addon)
- Enforce naming conventions

### PostToolUse

Triggers after a tool completes execution (success or failure). Use PostToolUse hooks to:
- Log tool execution results
- Collect metrics and statistics
- Send notifications
- Archive outputs
- Perform post-execution cleanup

**Input:**
```javascript
{
  tool_name: string,
  tool_input: Record<string, unknown>,
  tool_output: unknown,        // Tool result
  success: boolean,            // Did tool succeed?
  error?: string,              // Error message if failed
  duration_ms?: number,        // Execution time
  session_id?: string,
  agent_type?: string,
  timestamp?: string
}
```

**Example Use Cases:**
- Log all executed commands to audit trail
- Send Slack notifications on failures
- Collect timing metrics for performance analysis
- Archive large file outputs

### Stop

Triggers when the main agent stops execution. Use Stop hooks to:
- Perform cleanup operations
- Send final notifications
- Save session statistics
- Generate reports
- Trigger post-run actions

**Input:**
```javascript
{
  reason: 'complete' | 'error' | 'user_cancel' | 'timeout' | 'budget_exceeded',
  message?: string,            // Final output message
  error?: {                    // Error details if stopped due to error
    code: string,
    message: string,
    stack?: string
  },
  stats?: {                    // Session statistics
    duration_ms: number,
    tools_used: number,
    tokens_used?: number,
    cost_usd?: number
  },
  session_id?: string,
  timestamp?: string
}
```

**Reasons:**
- `complete`: Execution completed successfully
- `error`: Stopped due to an error
- `user_cancel`: User cancelled execution
- `timeout`: Execution exceeded time limit
- `budget_exceeded`: Token or cost budget exceeded

**Example Use Cases:**
- Save session logs to database
- Send completion notification with stats
- Clean up temporary files
- Upload logs to cloud storage
- Invoice customers based on usage

### SubagentStop

Triggers when a subagent completes execution. Use SubagentStop hooks to:
- Monitor subagent lifecycle
- Aggregate metrics across agents
- Track agent performance
- Handle agent failures
- Pass data between agents

**Input:**
```javascript
{
  agent_type: string,          // e.g., "architect", "executor"
  agent_id?: string,           // Unique agent instance ID
  reason: 'complete' | 'error' | 'user_cancel' | 'timeout' | 'budget_exceeded',
  message?: string,            // Final output from subagent
  result?: unknown,            // Subagent result
  error?: {
    code: string,
    message: string,
    stack?: string
  },
  stats?: {
    duration_ms: number,
    tools_used: number,
    tokens_used?: number,
    cost_usd?: number
  },
  session_id?: string,         // Parent session ID
  timestamp?: string
}
```

**Example Use Cases:**
- Track which subagents are used most frequently
- Aggregate costs across multiple agents
- Monitor agent error rates
- Save subagent outputs for analysis

## Hook Results

Hook handlers must return one of four action results:

### Continue

Allows the tool to execute normally with no changes.

```javascript
return { action: 'continue' };
```

### Skip

Blocks the tool from executing. The tool call is skipped silently.

```javascript
return {
  action: 'skip',
  reason: 'Optional reason for debugging'
};
```

### Modify

Allows execution but modifies the tool input before calling the tool.

```javascript
return {
  action: 'modify',
  input: {
    // Modified tool input
    command: 'echo "safe command"',
    file_path: '/safe/path.txt'
  }
};
```

### Error

Stops execution immediately with an error message.

```javascript
return {
  action: 'error',
  message: 'Tool not allowed in this context'
};
```

## Creating Hooks

Hooks are executable scripts (Bash, Python, Node.js, or any executable) that:

1. Read JSON input from stdin
2. Perform validation/processing
3. Exit with a code indicating the result

### Exit Codes

Hook handlers must exit with the following codes:

| Code | Meaning | Behavior |
|------|---------|----------|
| 0 | Continue/Allow | Tool executes normally |
| 1 | Error | Stop execution with error |
| 2 | Block/Skip | Skip the tool call |

**Note:** For `Modify` action, write the modified input to stdout as JSON before exiting with code 0.

### Writing a Hook Handler

Hooks are stateless executables that receive JSON input via stdin and output results via exit codes and stdout.

**Basic Template (Bash):**

```bash
#!/bin/bash

# Read input from stdin
INPUT=$(cat)

# Extract values
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input')

# Your logic here
if [[ "$TOOL_NAME" == "Bash" ]]; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

  if [[ "$COMMAND" =~ "dangerous" ]]; then
    echo "[my-hook] BLOCKED: Dangerous command" >&2
    exit 2  # Skip
  fi
fi

exit 0  # Continue
```

**Basic Template (JavaScript/Bun):**

```typescript
#!/usr/bin/env bun

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id?: string;
  agent_type?: string;
  timestamp?: string;
}

async function main(): Promise<void> {
  let rawInput: string;
  try {
    rawInput = await Bun.stdin.text();
  } catch {
    process.exit(0);  // No input, allow
  }

  if (!rawInput.trim()) {
    process.exit(0);
  }

  let input: HookInput;
  try {
    input = JSON.parse(rawInput);
  } catch {
    process.exit(0);  // Invalid JSON, allow
  }

  // Your hook logic
  if (input.tool_name === 'Bash') {
    const command = (input.tool_input.command as string) || '';

    if (command.includes('dangerous')) {
      console.error('[my-hook] BLOCKED: Dangerous command');
      process.exit(2);  // Block
    }
  }

  process.exit(0);  // Allow
}

main().catch((err) => {
  console.error('[my-hook] Error:', err);
  process.exit(1);  // Error
});
```

**Basic Template (Python):**

```python
#!/usr/bin/env python3

import json
import sys

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except:
        sys.exit(0)  # Allow by default

    tool_name = input_data.get('tool_name', '')
    tool_input = input_data.get('tool_input', {})

    if tool_name == 'Bash':
        command = tool_input.get('command', '')

        if 'dangerous' in command:
            print('[my-hook] BLOCKED: Dangerous command', file=sys.stderr)
            sys.exit(2)  # Block

    sys.exit(0)  # Allow

if __name__ == '__main__':
    main()
```

### Real-World Examples

**Example 1: rm-rf-guard (Blocks dangerous deletions)**

```typescript
const DANGEROUS_PATTERNS = [
  /\brm\s+(-[rf]+\s+)*\//,          // rm targeting root
  /\brm\s+(-[rf]+\s+)*(\*|\.)\s*$/, // rm -rf * or .
  /\bsudo\s+rm\b/,                  // sudo rm
];

if (input.tool_name === 'Bash') {
  const command = (input.tool_input.command as string) || '';

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      console.error('[rm-rf-guard] BLOCKED: Dangerous rm command');
      process.exit(2);
    }
  }
}
```

**Example 2: safety-net (Blocks dangerous git operations)**

```typescript
const DANGEROUS_PATTERNS = [
  /\bgit\s+reset\s+--hard\b/,              // git reset --hard
  /\bgit\s+push\s+.*--force\b/,           // git push --force
  /\bgit\s+push\s+--force.*\s+(main|master)\b/, // force to main
];

const SAFE_PATTERNS = [
  /\bgit\s+push\s+.*--force-with-lease\b/, // safer alternative
  /\bgit\s+reset\s+--(soft|mixed)\b/,      // safer reset
];

if (input.tool_name === 'Bash') {
  const command = input.tool_input.command as string;

  // Check safe patterns first
  if (SAFE_PATTERNS.some(p => p.test(command))) {
    process.exit(0);
  }

  // Check dangerous patterns
  const dangerous = DANGEROUS_PATTERNS.find(p => p.test(command));
  if (dangerous) {
    console.error('[safety-net] BLOCKED: Dangerous git command');
    process.exit(2);
  }
}
```

**Example 3: claude-ignore (Blocks reading sensitive files)**

```typescript
function findIgnoreFiles(filePath: string): string[] {
  // Find .claudeignore files from file location up to root
  const ignoreFiles: string[] = [];
  let dir = dirname(filePath);

  while (dir !== '/') {
    const ignoreFile = join(dir, '.claudeignore');
    if (existsSync(ignoreFile)) {
      ignoreFiles.push(ignoreFile);
    }
    dir = dirname(dir);
  }

  return ignoreFiles;
}

if (input.tool_name === 'Read') {
  const filePath = input.tool_input.file_path as string;

  for (const ignoreFile of findIgnoreFiles(filePath)) {
    const patterns = parseIgnoreFile(ignoreFile);
    if (isIgnored(filePath, patterns)) {
      console.error('[claude-ignore] BLOCKED');
      process.exit(2);
    }
  }
}
```

**Example 4: Audit logging (PostToolUse)**

```typescript
async function logToAuditTrail(input: PostToolUseInput) {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    tool: input.tool_name,
    success: input.success,
    duration_ms: input.duration_ms,
    session_id: input.session_id,
  };

  // Log to file
  await appendFile('/var/log/claude-audit.json',
    JSON.stringify(auditEntry) + '\n');
}
```

## Configuring Hooks

Hooks are configured in addon manifests or user settings.

### In Addon Manifests (addon.toml)

```toml
[addon]
name = "my-safety-hook"
version = "1.0.0"
description = "Custom safety enforcement"

[hooks]
# PreToolUse hooks
PreToolUse = [
  { matcher = "Bash", handler = "./hooks/bash-guard.ts", priority = 100 },
  { matcher = "*", handler = "./hooks/audit.ts", priority = -100 },
]

# PostToolUse hooks
PostToolUse = [
  { matcher = "*", handler = "./hooks/logger.ts", priority = 0 },
]

# Stop hooks
Stop = [
  { matcher = "*", handler = "./hooks/cleanup.ts", priority = 0 },
]

[install]
runtime = "bun"
```

### In User Settings (~/.claude/settings.json)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "handler": "~/.claude/hooks/my-guard.sh",
        "priority": 50,
        "enabled": true
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "handler": "~/.claude/hooks/logger.py",
        "priority": 0
      }
    ]
  }
}
```

## Hook Configuration

### Matcher Patterns

Matchers determine which tools trigger a hook:

| Pattern | Type | Matches |
|---------|------|---------|
| `"Bash"` | Exact | Only the Bash tool |
| `"Read"` | Exact | Only the Read tool |
| `"*"` | Wildcard | All tools |
| `"Read*"` | Glob | Read, ReadFile, etc. |
| `"(Read\|Write)"` | Regex | Read or Write tools |

**Matcher Examples:**

```toml
# Exact match - only Bash
matcher = "Bash"

# Wildcard - all tools
matcher = "*"

# Glob pattern - all Read* tools
matcher = "Read*"

# Glob pattern - all Write* tools
matcher = "Write*"

# Multiple exact matches using regex
matcher = "(Bash|Write)"

# Pattern for file operation tools
matcher = "(Read|Write|Glob)"
```

### Priority

Priority determines execution order when multiple hooks match the same tool:

- **Higher priority runs first** (100 before 0)
- **Same priority** runs in definition order
- **Common ranges:**
  - `100+`: Critical security/blocking hooks (run first)
  - `0`: Standard hooks
  - `-100`: Logging/monitoring hooks (run last)

**Why priority matters:**

1. A security hook (priority 100) runs first and can block
2. A modification hook (priority 50) runs next and transforms input
3. A logging hook (priority -100) runs last and logs the final state

```toml
# Security check runs first
{ matcher = "Bash", handler = "./guard.ts", priority = 100 }

# Transformation runs second
{ matcher = "Bash", handler = "./transform.ts", priority = 50 }

# Logging runs last
{ matcher = "Bash", handler = "./log.ts", priority = -100 }
```

### Enabled Flag

Control whether a hook is active:

```toml
{ matcher = "Bash", handler = "./hook.ts", priority = 0, enabled = true }
```

Or disable in settings to temporarily turn off:

```json
{
  "matcher": "Bash",
  "handler": "~/.claude/hooks/my-hook.sh",
  "enabled": false
}
```

### Timeout

Optional timeout in milliseconds (if hook takes longer, treated as error):

```json
{
  "matcher": "*",
  "handler": "~/.claude/hooks/slow-hook.sh",
  "timeout": 5000
}
```

## Managing Hooks

### List Active Hooks

Show all hooks from addons and settings, grouped by event type:

```bash
claudeops hooklist
```

Output:
```
Active Hooks

PreToolUse

  Source              Matcher   Handler                  Priority
  addon:rm-rf-guard   Bash      ./hook.ts                10
  addon:safety-net    Bash      ./hook.ts                10
  addon:claude-ignore Read      ./hook.ts                5

PostToolUse

  Source              Matcher   Handler                  Priority
  settings.json       *         ~/.claude/hooks/log.ts   0

Stop

  Source              Matcher   Handler                  Priority
  settings.json       *         ~/.claude/hooks/clean.ts 0
```

Filter by event:

```bash
claudeops hooklist --event PreToolUse
```

JSON output:

```bash
claudeops hooklist --json
```

### Debug Hook Execution

See which hooks will run for a specific tool:

```bash
claudeops hookdebug Bash
```

Output:
```
Hook Debug: Bash (PreToolUse)

Total hooks for event: 3
Matching hooks: 3

Execution Order

  1. rm-rf-guard
    Handler: ./hook.ts
    Match: Exact match
    Priority: 10

  2. safety-net
    Handler: ./hook.ts
    Match: Exact match
    Priority: 10

  3. claude-ignore
    Handler: ./hook.ts
    Match: Glob pattern: Read*
    Priority: 5
```

Debug specific event:

```bash
claudeops hookdebug Read --event PostToolUse
```

### Test Hook Handlers

Run a hook handler manually with sample input:

```bash
claudeops hooktest ./hooks/my-guard.ts
```

With custom tool name:

```bash
claudeops hooktest ./hooks/my-guard.ts --tool Write
```

With custom input JSON:

```bash
claudeops hooktest ./hooks/my-guard.ts --tool Bash \
  --input '{"command":"echo test"}'
```

Output shows:
- Exit code and interpretation
- stdout and stderr
- Execution duration

## Built-in Hooks (18)

claudeops ships with 18 built-in hooks, split between enabled-by-default and disabled-by-default.

### Enabled by Default (8)

| Hook | Event | Description |
|------|-------|-------------|
| `continuation-check` | Stop | Evaluates completion status and blocks premature stopping |
| `lint-changed` | PostToolUse | Runs ESLint after Write/Edit on JS/TS files |
| `typecheck-changed` | PostToolUse | Runs TypeScript type checking after Write/Edit |
| `checkpoint` | Stop | Creates git stash checkpoint before session ends |
| `thinking-level` | UserPromptSubmit | Detects complex tasks and adds reasoning instructions |
| `keyword-detector` | UserPromptSubmit | Mode keyword detection from user prompts |
| `swarm-lifecycle` | SubagentStop | Tracks swarm task completion and cost |
| `version-bump-prompt` | UserPromptSubmit | Prompts for version bump considerations |

### Disabled by Default (10)

| Hook | Event | Description |
|------|-------|-------------|
| `cost-warning` | UserPromptSubmit | Warns when approaching daily cost budget |
| `security-scan` | PreToolUse | Scans for secrets before git commits |
| `test-reminder` | PostToolUse | Reminds to run tests after code changes |
| `format-on-save` | PostToolUse | Auto-formats files after Write/Edit operations |
| `git-branch-check` | PreToolUse | Warns when committing to main/master branches |
| `todo-tracker` | UserPromptSubmit | Tracks TODO items mentioned in prompts |
| `session-log` | Stop | Logs session summary when Claude stops |
| `large-file-warning` | PreToolUse | Warns before reading large files |
| `team-lifecycle` | SubagentStop | Logs team creation and shutdown events |
| `swarm-cost-tracker` | PostToolUse | Tracks per-agent costs for orchestration |

### Hook Metadata Format

Hooks use JSDoc tags at the top of each `.mjs` file to declare their metadata:

```javascript
/**
 * @Hook continuation-check
 * @Event Stop
 * @Matcher *
 * @Enabled true
 * @Description Evaluates completion status and blocks premature stopping
 * @Priority 100
 * @Timeout 5000
 * @Async false
 */
```

| Tag | Description |
|-----|-------------|
| `@Hook` | Hook name (must match filename without extension) |
| `@Event` | Event type: PreToolUse, PostToolUse, Stop, SubagentStop, UserPromptSubmit |
| `@Matcher` | Tool matcher pattern (e.g., `Bash`, `*`, `(Read\|Write)`) |
| `@Enabled` | Whether the hook is enabled by default (`true` or `false`) |
| `@Description` | Human-readable description of the hook's purpose |
| `@Priority` | Execution priority (higher runs first, default 0) |
| `@Timeout` | Maximum execution time in milliseconds (default 10000) |
| `@Async` | Whether the hook runs asynchronously without blocking (`true` or `false`) |

### AI-Generated Hooks

Use the `cops hook add` command to generate a new hook with AI assistance:

```bash
cops hook add "block npm publish commands"
```

This will:
1. Analyze your description to determine the appropriate event type and matcher
2. Generate the hook implementation
3. Add the proper JSDoc metadata tags
4. Save the hook to your hooks directory

You can also specify the event type explicitly:

```bash
cops hook add "log all file writes" --event PostToolUse
```

## Hook Chain Execution

When a tool is called, hooks execute in a chain:

1. **Matching**: All hooks for that event type are checked for pattern matches
2. **Sorting**: Matching hooks are sorted by priority (highest first)
3. **Execution**: Each hook runs in order with the tool input
4. **Short-circuit**: First hook to error/skip/modify stops the chain
5. **Result**: Chain produces final action (continue, skip, modify, error)

### Chain Behavior

**All hooks match → continue:**
```
Tool: Bash
Command: echo "hello"

Hook 1 (priority 100): Matches, continue
Hook 2 (priority 0): Matches, continue
Result: CONTINUE
```

**Hook blocks execution:**
```
Tool: Bash
Command: rm -rf /

Hook 1 (priority 100): Matches, BLOCK
Result: SKIP (Hook 2 never runs)
```

**Hook modifies input:**
```
Tool: Bash
Command: echo $PASSWORD

Hook 1 (priority 100): Matches, modify to echo "***"
Result: MODIFY
Tool receives: echo "***"
Hook 2 doesn't run (first to modify stops chain)
```

**Hook errors:**
```
Tool: Bash
Command: valid-command

Hook 1 (priority 100): Matches, ERROR
Result: ERROR (entire execution stops)
```

## Composition

Hooks from multiple sources are automatically merged:

1. **Built-in hooks** (Claude Code core)
2. **Setup hooks** (from manifest.toml)
3. **Addon hooks** (from enabled addons)
4. **User hooks** (~/.claude/settings.json)

All are combined and sorted by priority to create the final hook chain.

**Source Priority:** Later sources can override or extend earlier ones.

```
Built-in                 (lowest override priority)
  ↓
Setup manifest.toml      (overrides built-in)
  ↓
Addon hooks              (overrides setup)
  ↓
User settings.json       (overrides everything)
```

## Security Best Practices

### For Hook Authors

1. **Validate all input** - Don't trust stdin JSON
2. **Handle errors gracefully** - Use try-catch
3. **Log carefully** - Don't log sensitive data
4. **Exit cleanly** - Always exit with valid code
5. **Test thoroughly** - Use `claudeops hooktest`
6. **Document patterns** - Explain what you block/allow

### For Hook Operators

1. **Review addon hooks** - Understand what they do before installing
2. **Prioritize security** - Run security hooks at priority 100+
3. **Monitor logs** - Track blocked operations
4. **Test before deployment** - Verify hooks work in your environment
5. **Combine wisely** - Too many hooks slow execution
6. **Keep updated** - Update addons regularly for new patterns

### Common Pitfalls

1. **Overly broad blocking** - Risk blocking legitimate operations
2. **Performance** - Complex hooks slow every tool call
3. **Inconsistent exit codes** - Hooks fail unpredictably
4. **Not handling missing input** - Crash if expected fields missing
5. **Forgetting about escaping** - Regex patterns may need escaping

## Advanced Usage

### Custom Hook Addon

Create an addon with hooks:

```bash
claudeops addoncreate my-hooks
cd my-hooks
```

Structure:
```
my-hooks/
├── addon.toml
├── hook.ts           # PreToolUse hook
├── post-hook.ts      # PostToolUse hook
└── README.md
```

**addon.toml:**
```toml
[addon]
name = "my-hooks"
version = "1.0.0"

[hooks]
PreToolUse = [
  { matcher = "Bash", handler = "./hook.ts", priority = 50 }
]
PostToolUse = [
  { matcher = "*", handler = "./post-hook.ts", priority = 0 }
]
```

### Conditional Logic

Hooks can implement complex conditional logic:

```typescript
interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id?: string;
  agent_type?: string;
}

async function main(): Promise<void> {
  const input: HookInput = JSON.parse(await Bun.stdin.text());

  // Only enforce during production
  if (process.env.ENV === 'production') {
    if (isDangerous(input)) {
      console.error('[my-hook] BLOCKED');
      process.exit(2);
    }
  }

  // Allow in development
  process.exit(0);
}
```

### Collecting Metrics

PostToolUse hooks can collect statistics:

```typescript
interface PostToolUseInput {
  tool_name: string;
  success: boolean;
  duration_ms?: number;
  session_id?: string;
}

async function collectMetrics(input: PostToolUseInput) {
  const metric = {
    timestamp: new Date().toISOString(),
    tool: input.tool_name,
    success: input.success,
    duration_ms: input.duration_ms || 0,
  };

  // Send to monitoring system
  await fetch('http://metrics.local/record', {
    method: 'POST',
    body: JSON.stringify(metric),
  });
}
```

### Context-Aware Hooks

Access session info to make decisions:

```typescript
interface HookInput {
  session_id: string;
  agent_type?: string;  // 'architect', 'executor', etc.
}

async function main() {
  const input = JSON.parse(await Bun.stdin.text());

  // Allow different tools for different agent types
  if (input.agent_type === 'executor') {
    // Executors can run dangerous commands
    process.exit(0);
  } else if (input.agent_type === 'architect') {
    // Architects can only read
    if (input.tool_name !== 'Read') {
      process.exit(2);  // Block
    }
  }

  process.exit(0);
}
```

## Troubleshooting

### Hook not triggering

1. Check matcher pattern matches tool name exactly:
   ```bash
   claudeops hookdebug Bash
   ```

2. Verify hook is enabled in config:
   ```bash
   claudeops hooklist --json | grep -i enabled
   ```

3. Check hook file path is correct:
   ```bash
   ls -la path/to/hook.ts
   ```

### Hook causing errors

1. Test the hook manually:
   ```bash
   claudeops hooktest ./hook.ts --tool Bash
   ```

2. Check exit codes:
   - 0 = allow (correct)
   - 2 = block (correct)
   - 1 = error (check stderr)
   - Other = error

3. Add debug logging:
   ```bash
   claudeops hooktest ./hook.ts --tool Bash 2>&1 | cat
   ```

### Hook too slow

1. Check execution time:
   ```bash
   time claudeops hooktest ./hook.ts
   ```

2. Reduce hook complexity
3. Lower hook priority if not critical
4. Cache expensive computations

### Input parsing failing

Ensure hook reads stdin correctly:

```bash
# Test with echo
echo '{"tool_name":"Bash","tool_input":{"command":"test"}}' | ./hook.ts
echo $?  # Should be 0
```

## Reference

### Hook Input Schemas

**PreToolUseInput:**
```typescript
{
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id?: string;
  agent_type?: string;
  timestamp?: string;
}
```

**PostToolUseInput:**
```typescript
{
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output: unknown;
  success: boolean;
  error?: string;
  duration_ms?: number;
  session_id?: string;
  agent_type?: string;
  timestamp?: string;
}
```

**StopInput:**
```typescript
{
  reason: 'complete' | 'error' | 'user_cancel' | 'timeout' | 'budget_exceeded';
  message?: string;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  stats?: {
    duration_ms: number;
    tools_used: number;
    tokens_used?: number;
    cost_usd?: number;
  };
  session_id?: string;
  timestamp?: string;
}
```

**SubagentStopInput:**
```typescript
{
  agent_type: string;
  agent_id?: string;
  reason: 'complete' | 'error' | 'user_cancel' | 'timeout' | 'budget_exceeded';
  message?: string;
  result?: unknown;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  stats?: {
    duration_ms: number;
    tools_used: number;
    tokens_used?: number;
    cost_usd?: number;
  };
  session_id?: string;
  timestamp?: string;
}
```

### Commands

```bash
# List all active hooks
claudeops hooklist

# Filter by event type
claudeops hooklist --event PreToolUse

# Debug which hooks run for a tool
claudeops hookdebug Bash
claudeops hookdebug Read --event PostToolUse

# Test a hook handler
claudeops hooktest ./hooks/my-hook.ts
claudeops hooktest ./hooks/my-hook.ts --tool Write
claudeops hooktest ./hooks/my-hook.ts --tool Bash --input '{"command":"ls"}'

# JSON output for parsing
claudeops hooklist --json
claudeops hookdebug Bash --json
```

### Built-in Addons with Hooks

Claude Code includes several security-focused addons:

- **rm-rf-guard**: Blocks dangerous `rm` commands
- **safety-net**: Blocks dangerous `git` operations
- **claude-ignore**: Respects `.claudeignore` files

Enable them with:
```bash
claudeops addonenable rm-rf-guard
claudeops addonenable safety-net
claudeops addonenable claude-ignore
```

## Summary

Hooks are a flexible, composable system for controlling Claude Code behavior:

1. **Events**: PreToolUse, PostToolUse, Stop, SubagentStop
2. **Actions**: continue, skip, modify, error
3. **Configuration**: Matchers, priority, enabled flag
4. **Execution**: Hooks chain in priority order, first blocking hook stops chain
5. **Management**: List, debug, and test hooks from CLI
6. **Composition**: Multiple sources merge automatically

Use hooks to enforce security policies, validate inputs, log operations, and extend Claude Code functionality without code changes.
