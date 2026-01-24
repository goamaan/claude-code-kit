# ClaudeOps v3 Architecture

## Research Summary

### Current State Analysis

**claudeops (current):**
- Keyword-based mode activation is **documented but NOT implemented**
- Well-designed type system with Zod schemas
- Hook composition infrastructure exists but uses placeholder handlers
- 12 agents defined but not actively invoked
- Terms like "ultrawork" and "autopilot" borrowed from competitors

**oh-my-claudecode (competitor):**
- Uses semantic intent detection (not just keywords)
- "Natural-first interaction" where commands are optional
- 28 agents, 31 skills
- Terms: `ralph` (persistence), `ulw` (ultrawork), `autopilot`

**everything-claude-code (reference):**
- 9 agents, 14+ commands, 9+ skills, 8 rules, 6 hooks
- Predefined workflows via slash commands
- Focus on code quality (TDD, security review, etc.)
- Cross-platform Node.js hooks

**Claude Code Task System (official):**
- Dependency-aware task management
- Background task support with `Ctrl+B`
- Parallel agent execution
- Model inheritance for subagents

---

## Design Principles

### 1. Capability Scaling, Not Mode Switching

**Old Mental Model:**
```
"ultrawork" keyword → activate parallel mode
"autopilot" keyword → activate autonomous mode
(flaky, requires memorization)
```

**New Mental Model:**
```
Every request → semantic analysis → intelligent capability scaling
Simple task → single agent, focused
Complex task → multiple agents, parallel
Research task → exploration agents
Implementation → executor + verification
```

### 2. Always-On Intelligence

Multi-agent orchestration should be the **default**, not an opt-in mode:

- Simple fixes → haiku executor (fast, cheap)
- Standard features → sonnet executor + reviewer
- Complex architecture → opus architect + parallel executors + verification

The system intelligently scales UP when needed, not DOWN from a maximum.

### 3. Semantic Over Syntactic

Replace keyword detection with AI-powered intent classification:

```
User: "help me build a login page"
→ Intent: feature_implementation
→ Complexity: medium
→ Domain: frontend
→ Suggested: planner → designer → executor → qa-tester
```

### 4. Composable & Extensible

Easy integration of external capabilities:
- vercel-labs/agent-skills → add as skill packs
- vercel-labs/agent-browser → add as MCP or capability
- claude-rm-rf → add as guardrail
- Custom tools → standard plugin interface

---

## New Terminology

| Old (Avoid) | New | Meaning |
|-------------|-----|---------|
| ultrawork | `turbo` or `parallel` | Maximum concurrent execution |
| autopilot | `orchestrate` | Autonomous multi-agent workflow |
| ralph | `persist` | Don't stop until complete |
| - | `delegate` | Route to specialized agents |
| - | `scale` | Adjust parallelism dynamically |

Or simpler: just describe what you want naturally, and the system figures it out.

---

## Core Architecture

### Layer 1: Intent Classification (UserPromptSubmit Hook)

```typescript
interface IntentClassification {
  // What type of work is this?
  type: 'research' | 'implementation' | 'debugging' | 'review' | 'planning' | 'refactoring';

  // How complex is this task?
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'architectural';

  // What domains are involved?
  domains: ('frontend' | 'backend' | 'database' | 'devops' | 'security' | 'testing')[];

  // Explicit user signals
  signals: {
    wantsPersistence: boolean;      // User said "don't stop", "complete this"
    wantsParallelism: boolean;      // User said "quickly", "in parallel"
    wantsAutonomy: boolean;         // User said "just do it", "handle it"
    wantsPlanning: boolean;         // User said "plan", "how should"
    wantsVerification: boolean;     // User said "make sure", "verify"
  };

  // Recommended approach
  recommendation: {
    agents: string[];              // Which agents to involve
    parallelism: 'sequential' | 'parallel' | 'swarm';
    verification: boolean;         // Should verify before completing
    modelTier: 'haiku' | 'sonnet' | 'opus';
  };
}
```

### Layer 2: Intelligent Router

The router takes the classification and orchestrates accordingly:

```typescript
interface RouterConfig {
  // Complexity → Model mapping
  modelRouting: {
    trivial: 'haiku';
    simple: 'haiku' | 'sonnet';
    moderate: 'sonnet';
    complex: 'sonnet' | 'opus';
    architectural: 'opus';
  };

  // Type → Agent mapping
  agentRouting: {
    research: ['explore', 'researcher'];
    implementation: ['executor', 'qa-tester'];
    debugging: ['architect', 'executor'];
    review: ['reviewer', 'security'];
    planning: ['planner', 'architect'];
    refactoring: ['architect', 'executor', 'qa-tester'];
  };

  // When to parallelize
  parallelizationRules: {
    independentTasks: true;           // Always parallelize independent work
    multiDomain: true;                // Frontend + backend in parallel
    researchPhase: true;              // Multiple explore agents
    verificationPhase: true;          // Multiple reviewers
  };
}
```

### Layer 3: Guardrails

Safety-first defaults that can be customized:

```typescript
interface GuardrailConfig {
  // Deletion protection (claude-rm-rf style)
  deletionProtection: {
    enabled: true;
    blockedPatterns: ['rm -rf', 'rm -r', 'shred', 'unlink'];
    allowedAlternative: 'trash';
    bypassKeyword: 'force-delete';  // Explicit opt-out
  };

  // Secret protection
  secretProtection: {
    enabled: true;
    patterns: ['API_KEY', 'SECRET', 'PASSWORD', 'TOKEN'];
    blockCommit: true;
    warnOnWrite: true;
  };

  // Dangerous command warnings
  dangerousCommands: {
    'git push --force': 'warn';
    'git reset --hard': 'warn';
    'DROP TABLE': 'block';
    'truncate': 'warn';
  };
}
```

### Layer 4: Capability Packs

Extensible system for adding capabilities:

```typescript
interface CapabilityPack {
  name: string;
  version: string;

  // What this pack provides
  provides: {
    agents?: AgentDefinition[];
    skills?: SkillDefinition[];
    hooks?: HookDefinition[];
    guardrails?: GuardrailDefinition[];
    mcpServers?: McpServerConfig[];
  };

  // Dependencies
  requires?: {
    packs?: string[];
    mcpServers?: string[];
    tools?: string[];
  };

  // Installation
  install?: {
    npm?: string[];
    scripts?: string[];
  };
}
```

Example capability packs:
- `@claudeops/browser` → wraps agent-browser
- `@claudeops/skills-react` → wraps vercel agent-skills react pack
- `@claudeops/safety` → deletion protection, secret scanning
- `@claudeops/frontend` → designer agent + UI skills
- `@claudeops/data-science` → scientist agents + jupyter integration

---

## Implementation Plan

### Phase 1: Intent Classification System

1. **Create semantic classifier**
   - UserPromptSubmit hook that runs fast classification
   - Use haiku for speed (~200ms)
   - Output intent classification as system context

2. **Replace keyword detection**
   - Remove hardcoded keyword matching
   - Intent classifier handles all detection semantically
   - Still support explicit keywords as "hints"

3. **Inject context**
   - Classification result added to system prompt
   - Claude receives guidance on how to approach task
   - Suggested agents and parallelism level

### Phase 2: Always-On Agent Routing

1. **Dynamic agent selection**
   - Based on classification, suggest relevant agents
   - Inject agent prompts into CLAUDE.md dynamically
   - Remove need for manual mode switching

2. **Automatic parallelism**
   - When complexity >= moderate, default to parallel
   - Independent tasks always run concurrently
   - Use Task system for orchestration

3. **Model routing**
   - Trivial → haiku (cheap, fast)
   - Standard → sonnet (balanced)
   - Complex → opus (thorough)
   - Override with explicit user signal

### Phase 3: Guardrails & Safety

1. **Deletion protection**
   - PreToolUse hook for Bash commands
   - Block destructive patterns
   - Suggest safe alternatives

2. **Secret scanning**
   - PostToolUse hook for Edit/Write
   - Detect secret patterns in written content
   - Block commits containing secrets

3. **Dangerous command warnings**
   - Warn on force push, hard reset
   - Block SQL drops/truncates by default
   - Allow explicit bypass with confirmation

### Phase 4: Capability Pack System

1. **Pack specification**
   - Define pack manifest format
   - Version management
   - Dependency resolution

2. **Pack registry**
   - Community packs
   - Official packs
   - Private/team packs

3. **Integration layer**
   - `claudeops pack add @claudeops/browser`
   - `claudeops pack add vercel-labs/agent-skills`
   - `claudeops pack add zcaceres/claude-rm-rf`

---

## File Structure Changes

```
claudeops/
├── src/
│   ├── core/
│   │   ├── classifier/          # NEW: Intent classification
│   │   │   ├── index.ts
│   │   │   ├── prompts.ts       # Classification prompts
│   │   │   ├── parser.ts        # Parse classification output
│   │   │   └── classifier.test.ts
│   │   ├── router/              # NEW: Intelligent routing
│   │   │   ├── index.ts
│   │   │   ├── agent-router.ts
│   │   │   ├── model-router.ts
│   │   │   └── parallelism.ts
│   │   ├── guardrails/          # NEW: Safety layer
│   │   │   ├── index.ts
│   │   │   ├── deletion.ts
│   │   │   ├── secrets.ts
│   │   │   └── dangerous.ts
│   │   └── sync/                # Existing
│   ├── domain/
│   │   ├── pack/                # NEW: Capability packs
│   │   │   ├── index.ts
│   │   │   ├── loader.ts
│   │   │   ├── installer.ts
│   │   │   ├── registry.ts
│   │   │   └── manifest.ts
│   │   └── ...                  # Existing domains
│   └── ...
├── packs/                       # NEW: Built-in capability packs
│   ├── core/                    # Basic agents and skills
│   ├── safety/                  # Deletion protection, secrets
│   ├── frontend/                # UI/UX capabilities
│   ├── backend/                 # API/database capabilities
│   └── quality/                 # Testing, review capabilities
└── ...
```

---

## Hook Implementation

### UserPromptSubmit Hook (Intent Classification)

```javascript
// hooks/classify-intent.js
const Anthropic = require('@anthropic-ai/sdk');

const CLASSIFICATION_PROMPT = `
Analyze this user request and classify the intent.
Return JSON with this structure:
{
  "type": "research|implementation|debugging|review|planning|refactoring",
  "complexity": "trivial|simple|moderate|complex|architectural",
  "domains": ["frontend", "backend", ...],
  "signals": {
    "wantsPersistence": boolean,
    "wantsParallelism": boolean,
    "wantsAutonomy": boolean,
    "wantsPlanning": boolean
  },
  "recommendedAgents": ["agent1", "agent2"],
  "parallelism": "sequential|parallel|swarm"
}

User request: {REQUEST}
`;

async function classifyIntent(request) {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: CLASSIFICATION_PROMPT.replace('{REQUEST}', request)
    }]
  });

  return JSON.parse(response.content[0].text);
}

// Export classification as context for Claude
module.exports = { classifyIntent };
```

### PreToolUse Hook (Deletion Protection)

```javascript
// hooks/deletion-protection.js
const BLOCKED_PATTERNS = [
  /\brm\s+(-[rf]+\s+)*[^|;]*$/,      // rm -rf, rm -r, rm
  /\bshred\b/,                         // shred
  /\bunlink\b/,                        // unlink
  /\bfind\s+.*-delete\b/,              // find . -delete
  /\bfind\s+.*-exec\s+rm\b/,           // find . -exec rm
];

const BYPASS_PATTERNS = [
  /\btrash\b/,                         // Using trash instead
];

function checkCommand(command) {
  // Allow if using safe alternative
  for (const safe of BYPASS_PATTERNS) {
    if (safe.test(command)) return { allowed: true };
  }

  // Block if matches dangerous pattern
  for (const dangerous of BLOCKED_PATTERNS) {
    if (dangerous.test(command)) {
      return {
        allowed: false,
        reason: 'Destructive deletion blocked. Use "trash" for recoverable deletion.',
        suggestion: command.replace(/\brm\b/, 'trash')
      };
    }
  }

  return { allowed: true };
}

module.exports = { checkCommand };
```

---

## Migration Path

### From Current claudeops

1. **Deprecate keyword detection** (it wasn't working anyway)
2. **Replace with intent classification hook**
3. **Keep existing profile/setup/sync systems**
4. **Add capability pack layer on top**

### From oh-my-claudecode Users

1. **Similar semantic detection** (they'll feel at home)
2. **Different terminology** (we're not copying)
3. **Better extensibility** (capability packs)
4. **Claude Code Task system integration** (official, not custom)

### From everything-claude-code Users

1. **Import their agents as a pack** (`@claudeops/everything-claude-code`)
2. **Keep their hooks working** (compatible format)
3. **Add semantic layer on top**

---

## Success Metrics

1. **No keyword memorization required**
   - Natural language works
   - System figures out intent

2. **Intelligent scaling**
   - Simple tasks stay simple
   - Complex tasks get full orchestration

3. **Easy extensibility**
   - Add browser automation: `claudeops pack add @claudeops/browser`
   - Add React skills: `claudeops pack add vercel-labs/agent-skills`
   - Add safety: enabled by default, opt-out available

4. **Reliable guardrails**
   - Deletion protection works
   - Secrets never committed
   - Dangerous commands warned

---

## Open Questions

1. **Intent classification latency**
   - Haiku is fast (~200ms) but adds to every request
   - Could cache classifications for similar requests
   - Could make classification optional for simple tasks

2. **Terminology finalization**
   - "turbo" vs "parallel" vs "swarm"
   - "orchestrate" vs "delegate" vs "auto"
   - Should we use any keywords at all?

3. **Default guardrails**
   - How strict by default?
   - Easy bypass mechanism?
   - Per-project customization?

4. **Pack ecosystem**
   - Central registry or distributed?
   - Versioning strategy?
   - Security review for community packs?
