# Claude Code Kit Addon System

The addon system allows you to extend and customize Claude Code Kit's behavior through extensible plugins. Addons can hook into the tool execution pipeline, provide custom configuration options, and integrate additional functionality into the CLAUDE.md environment.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation Sources](#installation-sources)
3. [Addon Structure](#addon-structure)
4. [Manifest Format](#manifest-format)
5. [Hooks](#hooks)
6. [Configuration Options](#configuration-options)
7. [Creating Addons](#creating-addons)
8. [Managing Addons](#managing-addons)
9. [Hook Debugging](#hook-debugging)
10. [Examples](#examples)

## Quick Start

### Installing an Addon

```bash
# From the public registry
cck addon install safety-net

# From GitHub
cck addon install github:user/addon-name

# From local path
cck addon install ./my-addon
```

### Listing Addons

```bash
# List all installed addons
cck addon list

# Show details about a specific addon
cck addon info safety-net

# Search the registry
cck addon search "safety"
```

### Enabling/Disabling

```bash
# Disable an addon (won't be loaded)
cck addon disable safety-net

# Re-enable it
cck addon enable safety-net
```

### Removing Addons

```bash
# Remove an addon (will prompt for confirmation)
cck addon remove safety-net

# Force removal without confirmation
cck addon remove safety-net --force
```

## Installation Sources

Claude Code Kit supports three installation sources:

### 1. Local Path

Install an addon from your filesystem:

```bash
cck addon install ./my-addon
cck addon install ~/addons/my-addon
cck addon install /absolute/path/to/addon
```

Use this for developing addons locally before publishing.

### 2. GitHub

Install directly from a GitHub repository:

```bash
# Install from main branch
cck addon install github:owner/repo-name

# Install from specific branch
cck addon install github:owner/repo-name@feature-branch
```

GitHub repos should contain an `addon.toml` at the root.

### 3. Registry (Future)

Once the public registry is available, install by name:

```bash
# Install latest version
cck addon install addon-name

# Install specific version
cck addon install addon-name --version 1.0.0
```

## Addon Structure

A typical addon directory looks like this:

```
my-addon/
├── addon.toml           # Addon manifest (required)
├── hook.ts              # Hook handler implementation
├── README.md            # Documentation
├── package.json         # Dependencies (if needed)
└── lib/                 # Additional code
    └── helpers.ts
```

### Minimum Requirements

At minimum, an addon needs:
- `addon.toml` - The addon manifest declaring its name, version, and hooks

### Recommended Files

- `hook.ts` - Hook handler(s) referenced by `addon.toml`
- `README.md` - Documentation for users
- `package.json` - If using Node dependencies

## Manifest Format

The addon manifest is a TOML file named `addon.toml`. Here's a complete example:

```toml
[addon]
name = "safety-net"
version = "1.0.0"
description = "Blocks dangerous git commands that could cause data loss"
author = "claude-kit"
repository = "https://github.com/user/safety-net"
license = "MIT"
keywords = ["safety", "protection", "git"]

[requires]
claude-code-kit = ">=0.1.0"
oh-my-claudecode = ">=3.0.0"

[install]
runtime = "bun"
postinstall = "bun install"

[[install.dependencies]]
name = "lodash"
version = "^4.17.0"
optional = false

[[install.files]]
source = "https://example.com/data.json"
destination = "data.json"

[hooks]
PreToolUse = [
  { matcher = "Bash", handler = "./hook.ts", priority = 10, enabled = true }
]
PostToolUse = [
  { matcher = "*", handler = "./post-hook.ts", priority = 0 }
]

[[config]]
key = "strict_mode"
label = "Strict Mode"
type = "boolean"
default = false
description = "Enable strict validation of commands"
required = false

[[config]]
key = "blocked_commands"
label = "Blocked Commands"
type = "array"
description = "List of commands to block"

[[config]]
key = "log_level"
label = "Log Level"
type = "select"
default = "warn"
choices = [
  { value = "debug", label = "Debug" },
  { value = "info", label = "Info" },
  { value = "warn", label = "Warning" },
  { value = "error", label = "Error" }
]

main = "index.js"
skills = ["custom-skill-1", "custom-skill-2"]
content = "# Additional CLAUDE.md content\n\nProvided by safety-net addon"
```

### Manifest Sections

#### `[addon]` (Required)

Core addon metadata:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Addon name (lowercase, alphanumeric + hyphens, max 64 chars) |
| `version` | string | Yes | Semantic version (e.g., `1.0.0`) |
| `description` | string | No | Short description (max 512 chars) |
| `author` | string | No | Author name |
| `repository` | string | No | Git repository URL |
| `license` | string | No | License identifier (e.g., `MIT`, `Apache-2.0`) |
| `keywords` | array | No | Search keywords (max 10, each max 32 chars) |

#### `[requires]` (Optional)

Version compatibility requirements:

```toml
[requires]
claude-code-kit = ">=0.1.0"
oh-my-claudecode = ">=3.0.0"
```

Uses semantic versioning. Installation will fail if requirements aren't met.

#### `[install]` (Optional)

Installation configuration:

| Field | Type | Description |
|-------|------|-------------|
| `runtime` | string | Runtime to execute hooks: `node`, `bun`, or `deno` (default: `node`) |
| `postinstall` | string | Script to run after installation (e.g., `npm install`) |
| `dependencies` | array | Dependencies to install |
| `files` | array | Files to download/copy during install |

#### `[hooks]` (Optional)

Hook definitions. See [Hooks](#hooks) section for details.

#### `[[config]]` (Optional)

Configuration options for the addon. See [Configuration Options](#configuration-options) section.

#### Other Fields

| Field | Type | Description |
|-------|------|-------------|
| `main` | string | Entry point for addon initialization |
| `skills` | array | Custom skills provided by this addon |
| `content` | string | Content to append to CLAUDE.md when addon is enabled |

## Hooks

Hooks allow your addon to intercept and modify tool execution at various points in the lifecycle.

### Hook Events

#### PreToolUse

Runs before a tool is executed. Can block, skip, or modify the tool call.

**When it runs:** Just before any tool (Read, Bash, Write, etc.) is executed

**Input:**
```typescript
{
  tool_name: string        // Name of the tool being called
  tool_input: Record<...>  // Input parameters for the tool
  session_id?: string      // Unique session identifier
  agent_type?: string      // Type of agent making the call (if subagent)
  timestamp?: string       // ISO timestamp of the event
}
```

**Use cases:**
- Block dangerous commands (e.g., `rm -rf /`)
- Validate inputs before execution
- Log tool usage for auditing
- Apply transformations to inputs

#### PostToolUse

Runs after a tool has executed (success or failure).

**When it runs:** After the tool completes, with results

**Input:**
```typescript
{
  tool_name: string        // Name of the tool that ran
  tool_input: Record<...>  // Original input parameters
  tool_output: unknown     // Result from the tool
  success: boolean         // Whether the tool succeeded
  error?: string           // Error message if failed
  duration_ms?: number     // Execution duration in milliseconds
  session_id?: string      // Unique session identifier
  agent_type?: string      // Type of agent that called the tool
  timestamp?: string       // ISO timestamp of the event
}
```

**Use cases:**
- Log tool results
- Clean up temporary files
- Update statistics
- Monitor API usage

#### Stop

Runs when an agent stops (for any reason).

**When it runs:** When an agent completes, errors, or is cancelled

**Input:**
```typescript
{
  reason: 'complete' | 'error' | 'user_cancel' | 'timeout' | 'budget_exceeded'
  message?: string         // Final message or output
  error?: {                // Only if reason is 'error'
    code: string
    message: string
    stack?: string
  }
  stats?: {                // Execution statistics
    duration_ms: number
    tools_used: number
    tokens_used?: number
    cost_usd?: number
  }
  session_id?: string
  timestamp?: string
}
```

**Use cases:**
- Record final statistics
- Send notifications on completion
- Cleanup resources
- Generate reports

#### SubagentStop

Runs when a subagent (spawned by another agent) stops.

**When it runs:** When a subagent completes or fails

**Input:**
```typescript
{
  agent_type: string       // Type of agent that stopped
  agent_id?: string        // Unique agent identifier
  reason: 'complete' | 'error' | 'user_cancel' | 'timeout' | 'budget_exceeded'
  message?: string         // Final message from subagent
  result?: unknown         // Result of subagent execution
  error?: {                // Only if reason is 'error'
    code: string
    message: string
    stack?: string
  }
  stats?: {
    duration_ms: number
    tools_used: number
    tokens_used?: number
    cost_usd?: number
  }
  session_id?: string
  timestamp?: string
}
```

**Use cases:**
- Track subagent performance
- Aggregate results from multiple subagents
- Monitor for subagent failures

### Hook Handlers

Hook handlers are executable scripts that process the hook input. They can be written in any language but must:

1. **Accept JSON on stdin:** The hook input is passed as JSON
2. **Exit with a specific code:** Determines the action
3. **Return quickly:** Keep execution time minimal

#### Exit Codes

Handlers communicate their decision via exit code:

| Code | Action | Description |
|------|--------|-------------|
| `0` | Allow | Continue with normal execution |
| `1` | Error | Stop with an error (abort execution) |
| `2` | Block | Skip this tool call silently |

#### Handler Implementation

Here's a simple PreToolUse handler in TypeScript/Bun:

```typescript
#!/usr/bin/env bun
/**
 * Example PreToolUse hook handler
 */

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id?: string;
  agent_type?: string;
  timestamp?: string;
}

async function main(): Promise<void> {
  // Read input from stdin
  const input = JSON.parse(await Bun.stdin.text()) as HookInput;

  // Example: block dangerous Bash commands
  if (input.tool_name === 'Bash') {
    const command = (input.tool_input.command as string) || '';

    if (command.includes('rm -rf /')) {
      console.error('Blocked: dangerous rm command');
      process.exit(2); // Block
    }
  }

  // Allow by default
  process.exit(0);
}

main().catch((err) => {
  console.error('Hook error:', err);
  process.exit(1);
});
```

### Hook Matcher Patterns

The `matcher` field determines which tools trigger the hook:

```toml
# Exact match (case-insensitive)
matcher = "Bash"

# Wildcard match
matcher = "*"              # All tools
matcher = "Read*"          # ReadFile, ReadDir, etc.
matcher = "*Write"         # Write, FileWrite, etc.

# Multiple matchers
[[hooks.PreToolUse]]
matcher = "Bash"
handler = "./handlers/bash-hook.ts"

[[hooks.PreToolUse]]
matcher = "Read"
handler = "./handlers/read-hook.ts"
```

### Hook Priority

Hooks with higher priority run first. When multiple hooks match:

```toml
[[hooks.PreToolUse]]
matcher = "Bash"
handler = "./critical-check.ts"
priority = 100  # Runs first

[[hooks.PreToolUse]]
matcher = "Bash"
handler = "./logging.ts"
priority = 0    # Runs after
```

Priority ordering:
1. Hooks with higher `priority` values run first
2. Within the same priority, order is undefined
3. Default priority is `0`

### Disabling Hooks

Temporarily disable a hook without removing it:

```toml
[[hooks.PreToolUse]]
matcher = "Bash"
handler = "./hook.ts"
enabled = false  # Won't run
```

Or disable via CLI:

```bash
cck hook disable addon-name bash-hook
```

## Configuration Options

Configuration options allow users to customize addon behavior without editing code.

### Option Types

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text input | `"debug"` |
| `number` | Numeric value | `42` |
| `boolean` | True/false flag | `true` |
| `array` | List of values | `["cmd1", "cmd2"]` |
| `object` | Structured data | `{"key": "value"}` |
| `select` | Choice from list | `"option-1"` |

### Configuration Example

```toml
[[config]]
key = "strict_mode"
label = "Strict Mode"
type = "boolean"
default = false
description = "Enable strict validation"
required = false

[[config]]
key = "blocked_patterns"
label = "Blocked Patterns"
type = "array"
description = "Regex patterns to block"

[[config]]
key = "log_level"
label = "Log Level"
type = "select"
choices = [
  { value = "debug", label = "Debug" },
  { value = "info", label = "Info" },
  { value = "warn", label = "Warning" }
]
default = "warn"

[[config]]
key = "max_timeout"
label = "Timeout (seconds)"
type = "number"
min = 1
max = 3600
default = 300
```

### Accessing Configuration in Hooks

Configuration values are stored in `~/.claude-code-kit/addons/{name}/config.json`:

```json
{
  "strict_mode": true,
  "blocked_patterns": ["dangerous.*", "critical.*"],
  "log_level": "debug",
  "max_timeout": 600
}
```

Your hook can read this file to access user settings:

```typescript
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const configPath = join(
  homedir(),
  '.claude-code-kit/addons/my-addon/config.json'
);
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

if (config.strict_mode) {
  // Apply stricter checks
}
```

## Creating Addons

### Generate Scaffold

Use the CLI to create a new addon:

```bash
cck addon create my-addon
```

This creates a directory with:

```
my-addon/
├── addon.toml           # Manifest template
├── hook.ts              # Hook handler template
└── README.md            # Documentation template
```

### Step 1: Edit addon.toml

Update the metadata and hooks:

```toml
[addon]
name = "my-addon"
version = "1.0.0"
description = "My custom addon"
author = "Your Name"
license = "MIT"

[hooks]
PreToolUse = [
  { matcher = "Bash", handler = "./hook.ts", priority = 0 }
]

[install]
runtime = "bun"
```

### Step 2: Implement hook.ts

Write your hook logic:

```typescript
#!/usr/bin/env bun

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id?: string;
}

async function main(): Promise<void> {
  const input = JSON.parse(await Bun.stdin.text()) as HookInput;

  // Your logic here
  console.log(`Called ${input.tool_name}`);

  process.exit(0); // Allow
}

main().catch(() => process.exit(1));
```

### Step 3: Test Locally

```bash
# Test hook with sample input
cck hook test ./my-addon/hook.ts -t Bash -i '{"command":"echo test"}'

# List active hooks (including your addon when installed)
cck hook list

# Debug hook execution for a tool
cck hook debug Bash --event PreToolUse
```

### Step 4: Install Locally

```bash
cck addon install ./my-addon
```

### Step 5: Verify Installation

```bash
# Check addon is installed and enabled
cck addon info my-addon

# See it in the list
cck addon list

# Verify hooks are active
cck hook list
```

### Step 6: Publish (Optional)

#### To GitHub

1. Create a GitHub repository with your addon code
2. Push your code with `addon.toml` at the root
3. Share the URL: `https://github.com/user/addon-name`

Users can then install with:
```bash
cck addon install github:user/addon-name
```

#### To Registry

Once the public registry is available:

1. Submit your addon for review
2. Upon approval, it's published to the registry
3. Users can install with: `cck addon install addon-name`

## Managing Addons

### CLI Commands

#### List Addons

```bash
# Show all addons
cck addon list

# JSON output
cck addon list --json

# Include disabled addons
cck addon list --all
```

#### Show Addon Details

```bash
# Show info about an installed addon
cck addon info my-addon

# Show info about a registry addon
cck addon info safety-net

# JSON output
cck addon info my-addon --json
```

#### Search Registry

```bash
# Search for addons
cck addon search "safety"

# Limit results
cck addon search "git" --limit 10

# JSON output
cck addon search "security" --json
```

#### Install Addon

```bash
# From registry
cck addon install addon-name

# From GitHub
cck addon install github:user/repo

# From local path
cck addon install ./my-addon

# Specific version
cck addon install addon-name --version 1.2.0
```

#### Update Addons

```bash
# Update a specific addon
cck addon update safety-net

# Update all addons
cck addon update
```

#### Enable/Disable

```bash
# Disable an addon (won't load)
cck addon disable safety-net

# Enable an addon
cck addon enable safety-net
```

#### Remove Addon

```bash
# Remove with confirmation
cck addon remove safety-net

# Force removal
cck addon remove safety-net --force
```

### Installation Storage

Addons are installed to:

```
~/.claude-code-kit/addons/
├── safety-net/
│   ├── addon.toml
│   ├── hook.ts
│   └── ...
├── my-addon/
│   ├── addon.toml
│   ├── hook.ts
│   └── ...
└── state.json  # Tracks installed addons
```

Configuration is stored per addon:

```
~/.claude-code-kit/addons/my-addon/config.json
```

## Hook Debugging

### List Active Hooks

View all active hooks across all enabled addons:

```bash
cck hook list
```

Output shows:
- Event type (PreToolUse, PostToolUse, etc.)
- Source (which addon)
- Matcher pattern
- Handler path
- Priority

### Filter by Event

```bash
# Show only PreToolUse hooks
cck hook list --event PreToolUse

# Show only PostToolUse hooks
cck hook list --event PostToolUse
```

### Debug Hook Matching

Find which hooks will run for a specific tool:

```bash
# Check what hooks run when Bash is called
cck hook debug Bash

# Check for PreToolUse event
cck hook debug Bash --event PreToolUse

# Check for PostToolUse event
cck hook debug Bash --event PostToolUse
```

Output shows:
- Total hooks for the event
- Hooks that match the tool
- Execution order (sorted by priority)
- Match reason (exact, glob, wildcard)

### Test Hook Handler

Test a hook script with sample input:

```bash
# Test with default input
cck hook test ./hook.ts

# Test with specific tool
cck hook test ./hook.ts --tool Bash

# Test with custom input
cck hook test ./hook.ts -t Bash -i '{"command":"echo test"}'
```

Output shows:
- Exit code (0 = allow, 1 = error, 2 = block)
- stdout and stderr
- Execution time
- Result interpretation

### Common Issues

#### Hook Not Triggering

1. Check addon is enabled:
   ```bash
   cck addon list
   ```

2. Verify hook is registered:
   ```bash
   cck hook list
   ```

3. Check matcher pattern:
   ```bash
   cck hook debug YourTool
   ```

4. Verify hook file exists and is executable:
   ```bash
   ls -la ~/.claude-code-kit/addons/your-addon/
   ```

#### Hook Errors

1. Test the hook directly:
   ```bash
   cck hook test ./hook.ts
   ```

2. Check for missing dependencies:
   ```bash
   cd ~/.claude-code-kit/addons/your-addon
   npm list
   ```

3. Verify runtime is available:
   ```bash
   which bun  # or node, deno
   ```

#### Performance Issues

1. Check hook execution time:
   ```bash
   cck hook test ./hook.ts
   ```

2. Reduce priority if hook is too slow:
   ```toml
   [[hooks.PreToolUse]]
   matcher = "Bash"
   handler = "./hook.ts"
   priority = -10  # Lower priority = runs later
   ```

3. Consider disabling non-critical hooks:
   ```bash
   cck addon disable logging-addon
   ```

## Examples

### Example 1: Safety Net (Block Dangerous Git Commands)

Blocks dangerous git commands that could cause data loss:

```toml
[addon]
name = "safety-net"
version = "1.0.0"
description = "Blocks dangerous git commands"
keywords = ["safety", "git"]

[hooks]
PreToolUse = [
  { matcher = "Bash", handler = "./hook.ts", priority = 10 }
]

[install]
runtime = "bun"
```

```typescript
#!/usr/bin/env bun

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

const DANGEROUS_PATTERNS = [
  /git\s+reset\s+--hard/,
  /git\s+clean\s+-fd/,
  /git\s+push\s+--force/,
];

async function main(): Promise<void> {
  const input = JSON.parse(await Bun.stdin.text()) as HookInput;

  if (input.tool_name !== 'Bash') {
    process.exit(0);
  }

  const command = (input.tool_input.command as string) || '';

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      console.error(`[safety-net] Blocked dangerous command: ${command}`);
      process.exit(2);
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(1));
```

### Example 2: File Audit Logger

Logs all file access for compliance:

```toml
[addon]
name = "audit-logger"
version = "1.0.0"
description = "Audit file access"

[hooks]
PreToolUse = [
  { matcher = "Read", handler = "./audit.ts", priority = 1 },
  { matcher = "Write", handler = "./audit.ts", priority = 1 }
]

[[config]]
key = "log_file"
label = "Log File Path"
type = "string"
default = "./audit.log"
```

```typescript
#!/usr/bin/env bun
import { appendFileSync } from 'fs';

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  timestamp?: string;
  session_id?: string;
}

async function main(): Promise<void> {
  const input = JSON.parse(await Bun.stdin.text()) as HookInput;
  const logEntry = {
    timestamp: input.timestamp || new Date().toISOString(),
    tool: input.tool_name,
    file: input.tool_input.file_path,
    session: input.session_id,
  };

  const logFile = process.env.AUDIT_LOG_FILE || './audit.log';
  appendFileSync(logFile, JSON.stringify(logEntry) + '\n');

  process.exit(0);
}

main().catch(() => process.exit(1));
```

### Example 3: Command Transformer

Transforms commands to use safer alternatives:

```toml
[addon]
name = "command-transformer"
version = "1.0.0"

[hooks]
PreToolUse = [
  { matcher = "Bash", handler = "./transform.ts", priority = 5 }
]
```

```typescript
#!/usr/bin/env bun

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

interface HookResult {
  action: 'continue' | 'skip' | 'modify' | 'error';
  input?: Record<string, unknown>;
  reason?: string;
}

async function main(): Promise<void> {
  const input = JSON.parse(await Bun.stdin.text()) as HookInput;

  if (input.tool_name !== 'Bash') {
    process.exit(0);
  }

  let command = (input.tool_input.command as string) || '';

  // Transform unsafe patterns
  if (command.includes('rm -rf')) {
    // Use safer alternative
    command = command.replace('rm -rf', 'trash');
  }

  if (command !== input.tool_input.command) {
    // Modified - return modified input
    const modified = { ...input.tool_input, command };
    console.log(JSON.stringify({ action: 'modify', input: modified }));
    process.exit(0);
  }

  process.exit(0);
}

main().catch(() => process.exit(1));
```

### Example 4: Rate Limiter

Limits tool usage to prevent resource exhaustion:

```toml
[addon]
name = "rate-limiter"
version = "1.0.0"

[hooks]
PreToolUse = [
  { matcher = "*", handler = "./limiter.ts", priority = 100 }
]

[[config]]
key = "calls_per_minute"
label = "Calls Per Minute"
type = "number"
default = 60
min = 1
max = 1000
```

```typescript
#!/usr/bin/env bun

interface HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  session_id?: string;
}

const callCounts = new Map<string, Array<number>>();

async function main(): Promise<void> {
  const input = JSON.parse(await Bun.stdin.text()) as HookInput;
  const sessionId = input.session_id || 'unknown';
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Get call history for this session
  if (!callCounts.has(sessionId)) {
    callCounts.set(sessionId, []);
  }

  const calls = callCounts.get(sessionId)!;
  const recentCalls = calls.filter(t => t > oneMinuteAgo);

  const limit = 60; // Configurable
  if (recentCalls.length >= limit) {
    console.error(`[rate-limiter] Rate limit exceeded: ${limit}/min`);
    process.exit(2);
  }

  recentCalls.push(now);
  callCounts.set(sessionId, recentCalls);

  process.exit(0);
}

main().catch(() => process.exit(1));
```

## Best Practices

### Addon Development

1. **Keep hooks fast:** Hooks run synchronously; slow handlers impact performance
2. **Fail gracefully:** Return exit code 0 (allow) when unsure
3. **Log errors:** Use stderr for diagnostics
4. **Handle missing input:** Not all fields may be present
5. **Use stdin/stdout correctly:** Don't mix debug output with hook results

### Security

1. **Validate input thoroughly:** Never trust user input in hook_input
2. **Use allowlists:** Prefer blocking known bad patterns over blocking unknown good ones
3. **Document assumptions:** Clearly state what the addon checks for
4. **Ask for permissions:** If addon needs access to files, document this
5. **Keep updated:** Subscribe to security advisories for dependencies

### Testing

1. **Test with real tools:** Run actual commands, not just hook tests
2. **Test edge cases:** Empty input, special characters, large files
3. **Test performance:** Measure hook execution time under load
4. **Test in CI/CD:** Verify hooks work in automated environments
5. **Monitor production:** Log hook actions for audit and debugging

### Documentation

1. **Write clear README:** Explain what addon does and why to use it
2. **Document configuration:** List all options and their effects
3. **Provide examples:** Show common use cases
4. **Document limitations:** Be honest about what addon can't do
5. **Update for versions:** Keep docs in sync with code

---

For more information, see the [Hook Debugging](#hook-debugging) section or run `cck addon --help` for CLI documentation.
