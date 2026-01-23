# Migration Guide: v2 to v3

This guide helps you migrate from claudeops v2 to v3.

## What's New in v3

### 1. Semantic Intent Detection

**v2:** Required keywords to activate modes (`ultrawork`, `autopilot`, `ralph`)

**v3:** Just describe what you want naturally - no keywords needed

```bash
# v2 - keyword-based
You: "ultrawork - build user authentication"
You: "autopilot - create API endpoints"

# v3 - natural language
You: "Build user authentication"
You: "Create API endpoints for the product catalog"
```

The system automatically:
- Classifies your intent
- Assesses complexity
- Selects optimal agents and models
- Determines parallelism strategy

### 2. AI-Powered Pack System

**v2:** Manual configuration of capabilities

**v3:** Install packs from GitHub repos automatically

```bash
# v3 - install from any repo
claudeops pack add https://github.com/vercel-labs/agent-browser
claudeops pack add https://github.com/user/custom-agents

# AI analyzes repo and shows what's available
# Interactive install of agents, skills, hooks, etc.
```

### 3. Built-in Guardrails

**v2:** Optional safety features

**v3:** Enabled by default with smart protection

- Deletion protection (blocks `rm -rf`, suggests `trash`)
- Secret scanning (prevents committing API keys)
- Dangerous command warnings (warns on force push, etc.)

### 4. Intelligent Routing

**v2:** Static agent definitions

**v3:** Dynamic agent routing based on intent classification

The router automatically:
- Maps intent type to agent combinations
- Selects model tier based on complexity
- Enables parallelization when beneficial

---

## Breaking Changes

### Removed Keywords and Modes

The following keywords no longer trigger special behavior (they weren't implemented anyway):

**Removed:**
- `ultrawork`, `ulw`, `uw`
- `autopilot`
- `ralph`
- `plan this`, `plan the`
- `investigate`, `analyze`
- `find`, `search`, `locate`

**Why:** These were documented but not implemented. v3 uses semantic detection instead.

**Migration:** Just remove the keywords - natural language works better:

```bash
# Before
"ultrawork - implement authentication"

# After
"Implement authentication with JWT and refresh tokens"
```

### Hook Script Format

Hook scripts now use a new format with better error handling.

**v2 format:**
```javascript
// Old hook format
module.exports = async (context) => {
  // Hook logic
};
```

**v3 format:**
```javascript
#!/usr/bin/env node
// New hook format with proper error handling
import { readStdin, logInfo, exit } from './lib/utils.js';

async function main() {
  try {
    const input = await readStdin();
    // Hook logic
    exit(0);
  } catch (error) {
    exit(1, error.message);
  }
}

main();
```

**Migration:** Your existing hooks will continue to work, but consider updating to the new format for better reliability.

### Agent Definition Changes

Agent definitions now support more metadata for intelligent routing.

**v2 format:**
```yaml
agents:
  - name: executor
    model: sonnet
```

**v3 format:**
```yaml
agents:
  - name: executor
    model: sonnet
    domains:
      - frontend
      - backend
    complexity:
      - simple
      - moderate
      - complex
```

**Migration:** The old format still works - additional metadata is optional.

---

## New Features to Adopt

### 1. Use Natural Language

Stop thinking about keywords and modes. Just describe your needs:

```bash
# Instead of memorizing modes
"I need to refactor the auth module for better testability"
"Help me debug why the database connection keeps timing out"
"Create a new API endpoint for user profile updates"
```

The system will:
- Understand your intent
- Route to appropriate agents
- Use optimal models
- Parallelize when beneficial

### 2. Install Packs for Capabilities

Instead of manually configuring capabilities, install packs:

```bash
# Add browser automation
claudeops pack add https://github.com/vercel-labs/agent-browser

# Add React skills
claudeops pack add https://github.com/vercel-labs/agent-skills

# Add your team's standards
claudeops pack add https://github.com/mycompany/code-standards
```

### 3. Leverage Guardrails

Guardrails are now enabled by default. Configure them per project:

```yaml
# .claudeops.yaml
guardrails:
  deletionProtection:
    enabled: true
    bypassKeyword: "force-delete"

  secretProtection:
    enabled: true
    blockCommit: true

  dangerousCommands:
    "git push --force": "warn"
    "DROP TABLE": "block"
```

### 4. Trust the Router

Let the intelligent router do its job:

- **Simple tasks** → Single Haiku executor (fast, cheap)
- **Standard features** → Sonnet executor + reviewer
- **Complex work** → Opus architect + parallel executors + verification

You don't need to manually specify agents anymore - just describe what you need.

---

## Step-by-Step Migration

### Step 1: Upgrade claudeops

```bash
npm install -g claudeops@latest
```

### Step 2: Update Your CLAUDE.md

If you customized your CLAUDE.md file with old keywords, update it:

```bash
# Backup your current config
cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.backup

# Sync new v3 configuration
claudeops sync
```

### Step 3: Remove Keyword References

Search your documentation and remove references to old modes:

```bash
# Find mentions of old keywords
grep -r "ultrawork\|autopilot\|ralph" .

# Update to natural language descriptions
```

### Step 4: Test Natural Language

Try describing tasks naturally:

```bash
# Start Claude Code
claude

# Try natural requests
You: "Help me build a user registration form"
You: "Debug the memory leak in the image processor"
You: "Review security of the authentication flow"
```

### Step 5: Install Packs (Optional)

Add capabilities as needed:

```bash
# List available packs (when registry is ready)
claudeops pack search browser

# Install packs
claudeops pack add https://github.com/vercel-labs/agent-browser
```

---

## Compatibility Notes

### What Still Works

- **Profile management** - All profile commands work the same
- **Setup templates** - Templates unchanged, but now enable v3 features
- **Cost tracking** - Cost tracking works the same
- **Hook system** - Old hooks still work (but consider updating format)
- **Configuration files** - `.claudeops.yaml` format unchanged

### What Changed

- **Mode activation** - No longer uses keywords (wasn't implemented anyway)
- **Agent routing** - Now automatic based on semantic analysis
- **Pack installation** - New AI-powered pack system replaces manual setup

### What's New

- **Intent classification** - Automatic semantic analysis of requests
- **Intelligent routing** - AI selects agents, models, and parallelism
- **Pack system** - Install capabilities from any GitHub repo
- **Guardrails** - Built-in safety protections

---

## Rollback to v2

If you need to rollback:

```bash
# Install v2
npm install -g claudeops@2.1.0

# Restore old CLAUDE.md
cp ~/.claude/CLAUDE.md.backup ~/.claude/CLAUDE.md

# Sync v2 config
claudeops sync
```

---

## Getting Help

- **Documentation:** See `docs/` directory for detailed guides
- **Examples:** See `examples/` for usage examples
- **Issues:** https://github.com/goamaan/claudeops/issues
- **Discussions:** https://github.com/goamaan/claudeops/discussions

---

## Benefits of v3

### Simpler Mental Model

**v2:** Memorize keywords → Remember which mode does what → Type keyword + request

**v3:** Describe what you need → System figures it out

### Better Results

- AI-powered intent detection is more accurate than keyword matching
- Intelligent routing uses optimal agents and models
- Automatic parallelization for complex tasks

### Safer by Default

- Deletion protection prevents accidents
- Secret scanning prevents data leaks
- Dangerous command warnings prevent mistakes

### More Extensible

- Install capabilities from any GitHub repo
- AI analyzes and helps install components
- Share packs with your team or community

---

## Common Questions

### Q: Do I need to use specific words for detection to work?

**A:** No. The semantic classifier understands intent, not keywords. "Build a login form", "Create a user authentication page", and "I need a signup form" all work.

### Q: Can I still manually delegate to specific agents?

**A:** Yes. You can still use `Task(subagent_type="claudeops:executor", ...)` if you want manual control.

### Q: Are the old keywords completely gone?

**A:** They're not blocked, but they don't trigger special behavior. Just describe your needs naturally.

### Q: How do I disable guardrails?

**A:** Configure in `.claudeops.yaml`:

```yaml
guardrails:
  deletionProtection:
    enabled: false
  secretProtection:
    enabled: false
```

### Q: Will my custom agents still work?

**A:** Yes. Custom agents in `agents/` directory still work. Consider packaging them as a pack for easier sharing.

### Q: How does the router know which agent to use?

**A:** It uses intent classification:
- `type` (implementation, debugging, research, etc.)
- `complexity` (trivial, simple, moderate, complex, architectural)
- `domains` (frontend, backend, security, etc.)
- `signals` (wants persistence, parallelism, autonomy, etc.)

Based on these factors, it selects the optimal agents, models, and execution strategy.

---

## Next Steps

1. Read [PACKS.md](./PACKS.md) to learn about the pack system
2. Try natural language requests in Claude Code
3. Install packs to extend capabilities
4. Customize guardrails for your workflow
5. Share your packs with the community

Welcome to claudeops v3!
