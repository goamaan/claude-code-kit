# claudeops Hook Scripts

This directory contains Claude Code hook scripts that enhance Claude's capabilities with intent classification and safety guardrails.

## Available Hooks

### 1. `classify-intent.js` - UserPromptSubmit Hook

Classifies user intent before Claude processes the request, providing context about:
- Intent type (implementation, debugging, research, etc.)
- Complexity level (trivial, simple, moderate, complex, architectural)
- Relevant domains (frontend, backend, security, etc.)
- User preferences (speed, autonomy, verification, etc.)
- Recommended agents and model tier

**Usage:**
```bash
# Add to ~/.config/claude/hooks/userpromptsubmit/
ln -s /path/to/claudeops/scripts/hooks/classify-intent.js ~/.config/claude/hooks/userpromptsubmit/claudeops-classify.js
```

**Requirements:**
- Optional: `ANTHROPIC_API_KEY` environment variable for AI-powered classification
- Falls back to rule-based classification if API key not available

### 2. `guardrails.js` - PreToolUse Hook

Prevents dangerous operations before they execute:

**For Bash commands:**
- Blocks destructive deletion commands (`rm -rf /`, etc.)
- Warns about dangerous Git operations (`git push --force`, etc.)
- Blocks commands containing secrets/credentials

**For Edit/Write operations:**
- Blocks file edits that would introduce secrets
- Scans for API keys, tokens, passwords, etc.

**Usage:**
```bash
# Add to ~/.config/claude/hooks/pretooluse/
ln -s /path/to/claudeops/scripts/hooks/guardrails.js ~/.config/claude/hooks/pretooluse/claudeops-guardrails.js
```

**Exit Codes:**
- `0` - Allow operation
- `1` - Error (hook failure)
- `2` - Block operation

### 3. `post-edit.js` - PostToolUse Hook

Post-edit quality checks and warnings:
- Warns about secrets that may have been introduced
- Detects `console.log` statements in JS/TS files
- Provides actionable warnings without blocking

**Usage:**
```bash
# Add to ~/.config/claude/hooks/posttooluse/
ln -s /path/to/claudeops/scripts/hooks/post-edit.js ~/.config/claude/hooks/posttooluse/claudeops-post-edit.js
```

## Installation

### Quick Install (All Hooks)

```bash
# From claudeops package root
npm run setup-hooks
```

Or manually:

```bash
# Create hook directories
mkdir -p ~/.config/claude/hooks/{userpromptsubmit,pretooluse,posttooluse}

# Link hooks
ln -s "$(pwd)/scripts/hooks/classify-intent.js" ~/.config/claude/hooks/userpromptsubmit/claudeops-classify.js
ln -s "$(pwd)/scripts/hooks/guardrails.js" ~/.config/claude/hooks/pretooluse/claudeops-guardrails.js
ln -s "$(pwd)/scripts/hooks/post-edit.js" ~/.config/claude/hooks/posttooluse/claudeops-post-edit.js

# Make executable
chmod +x scripts/hooks/*.js
```

### Global Installation (via npm)

When installed globally via npm, hooks are available at:
```
$(npm root -g)/claudeops/scripts/hooks/
```

Link them to Claude Code:
```bash
HOOKS_DIR="$(npm root -g)/claudeops/scripts/hooks"
ln -s "$HOOKS_DIR/classify-intent.js" ~/.config/claude/hooks/userpromptsubmit/claudeops-classify.js
ln -s "$HOOKS_DIR/guardrails.js" ~/.config/claude/hooks/pretooluse/claudeops-guardrails.js
ln -s "$HOOKS_DIR/post-edit.js" ~/.config/claude/hooks/posttooluse/claudeops-post-edit.js
```

## How It Works

### Hook Execution Flow

```
User Prompt
    ↓
[UserPromptSubmit Hook]
    ↓ classify-intent.js
    ↓ - Classifies intent
    ↓ - Outputs context for Claude
    ↓ - Saves classification to temp file
    ↓
Claude processes request
    ↓
[PreToolUse Hook]
    ↓ guardrails.js
    ↓ - Checks for dangerous operations
    ↓ - Blocks if violations found
    ↓ - Allows if safe
    ↓
Tool executes (Bash, Edit, Write, etc.)
    ↓
[PostToolUse Hook]
    ↓ post-edit.js
    ↓ - Scans edited files
    ↓ - Warns about potential issues
    ↓ - Doesn't block
    ↓
Result returned to Claude
```

### Data Flow

1. **classify-intent.js** writes classification to:
   - `/tmp/claudeops-hooks/last-classification.json`

2. **guardrails.js** reads:
   - Tool name and input from stdin (JSON)
   - Guardrail rules from `dist/core/guardrails/`

3. **post-edit.js** reads:
   - Tool name and input from stdin (JSON)
   - Edited file from filesystem

## Secret Detection Patterns

The guardrails detect various secret types:
- AWS Access Keys (`AKIA...`)
- GitHub Tokens (`ghp_...`, `github_pat_...`)
- API Keys (Anthropic, OpenAI, etc.)
- Private Keys (SSH, PGP)
- JWT Tokens
- Database connection strings
- Generic passwords and tokens

## Dangerous Command Patterns

### Blocked Operations
- `rm -rf /` or other destructive deletions
- `sudo` with deletion commands
- File shredding commands
- Recursive deletion with wildcards

### Warned Operations
- `git push --force` (suggests `--force-with-lease`)
- `git reset --hard`
- `DROP TABLE` or `DROP DATABASE`
- System-level modifications

## Configuration

### Environment Variables

- `ANTHROPIC_API_KEY` - For AI-powered intent classification (optional)
- `CLAUDE_CODE_TASK_LIST_ID` - For task persistence (optional)

### Disabling Hooks

To temporarily disable a hook:
```bash
# Rename or remove the symlink
mv ~/.config/claude/hooks/pretooluse/claudeops-guardrails.js{,.disabled}
```

To re-enable:
```bash
mv ~/.config/claude/hooks/pretooluse/claudeops-guardrails.js{.disabled,}
```

## Troubleshooting

### Hook Not Running

1. Check hook is executable:
   ```bash
   ls -l ~/.config/claude/hooks/*/claudeops-*.js
   ```

2. Test hook manually:
   ```bash
   echo '{"command": "ls -la"}' | node ~/.config/claude/hooks/pretooluse/claudeops-guardrails.js
   ```

3. Check Claude Code version:
   ```bash
   claude --version
   # Hooks require Claude Code v1.5+
   ```

### Package Not Built

If you see "Guardrails not available" or "Classifier not available":

```bash
# Build the package
npm run build

# Or in development
npm run dev
```

### Import Errors

Ensure the package structure is correct:
```
claudeops/
├── dist/
│   └── core/
│       ├── classifier/
│       │   └── index.mjs
│       └── guardrails/
│           └── index.mjs
└── scripts/
    └── hooks/
        ├── classify-intent.js
        ├── guardrails.js
        └── post-edit.js
```

## Development

### Testing Hooks

1. **Test classification:**
   ```bash
   echo "create a new feature" | node scripts/hooks/classify-intent.js
   ```

2. **Test guardrails (allow):**
   ```bash
   echo '{"tool_name":"Bash","tool_input":{"command":"ls -la"}}' | node scripts/hooks/guardrails.js
   ```

3. **Test guardrails (block):**
   ```bash
   echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | node scripts/hooks/guardrails.js
   echo $? # Should be 2 (blocked)
   ```

4. **Test post-edit:**
   ```bash
   echo '{"tool_name":"Edit","tool_input":{"file_path":"test.js"}}' | node scripts/hooks/post-edit.js
   ```

### Adding New Guardrails

1. Add pattern to `src/core/guardrails/dangerous.ts` or `secrets.ts`
2. Rebuild: `npm run build`
3. Test with hook scripts

### Hook Output

- **stdout** - Visible to Claude (use for context/results)
- **stderr** - Visible to user (use for warnings/logs)
- **Exit codes** - Control hook behavior (0=allow, 1=error, 2=block)

## Cross-Platform Compatibility

All hooks use Node.js and are cross-platform:
- ✅ macOS
- ✅ Linux
- ✅ Windows (with WSL or Git Bash)

No bash-specific code is used.

## Performance

- **classify-intent.js**: ~200-500ms (with API), ~10ms (fallback)
- **guardrails.js**: ~5-20ms
- **post-edit.js**: ~10-50ms (depends on file size)

Hooks run in parallel when possible, minimizing impact on Claude's responsiveness.

## License

MIT - Part of the claudeops package
