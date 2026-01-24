# ClaudeOps v3 Implementation Plan

## Overview

This plan transforms claudeops from a keyword-based mode system to a semantic, AI-driven orchestration layer. The key innovation is that users don't need to memorize keywords or modes - they just describe what they want naturally, and the system figures out the optimal approach.

---

## Task Dependency Graph

```
Phase 1 (Parallel - No Dependencies):
├── [1] Intent Classification System
├── [3] Guardrails Layer
└── [4] AI-Powered Pack Analyzer

Phase 2 (Depends on Phase 1):
├── [2] Intelligent Router ← depends on [1]
├── [6] Hook Scripts ← depends on [1], [3]
└── [7] Pack CLI Commands ← depends on [4]

Phase 3 (Integration):
├── [5] CLAUDE.md Generator ← depends on [1], [2]
└── [8] Tests ← depends on [1], [2], [3], [4]

Phase 4 (Finalization):
└── [9] Documentation ← depends on all above
```

---

## Task 1: Intent Classification System

### Goal
Replace flaky keyword detection with semantic AI-powered intent classification.

### Location
`src/core/classifier/`

### Files to Create

```
src/core/classifier/
├── index.ts           # Main exports
├── types.ts           # Classification types
├── prompts.ts         # Classification prompt templates
├── classifier.ts      # Core classification logic
├── cache.ts           # Optional: cache similar classifications
└── classifier.test.ts # Tests
```

### Types Definition

```typescript
// src/core/classifier/types.ts

export type IntentType =
  | 'research'        // Finding information, exploring codebase
  | 'implementation'  // Building new features
  | 'debugging'       // Fixing bugs, investigating issues
  | 'review'          // Code review, security audit
  | 'planning'        // Architecture, design decisions
  | 'refactoring'     // Restructuring existing code
  | 'maintenance'     // Updates, dependency management
  | 'conversation';   // General questions, clarifications

export type Complexity =
  | 'trivial'         // One-liner, typo fix
  | 'simple'          // Single file, straightforward
  | 'moderate'        // Multiple files, some coordination
  | 'complex'         // Significant changes, multiple systems
  | 'architectural';  // System-wide, design decisions

export type Domain =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'devops'
  | 'security'
  | 'testing'
  | 'documentation'
  | 'general';

export interface UserSignals {
  wantsPersistence: boolean;    // "don't stop", "finish this", "complete"
  wantsSpeed: boolean;          // "quickly", "fast", "asap"
  wantsAutonomy: boolean;       // "just do it", "handle it", "figure it out"
  wantsPlanning: boolean;       // "plan", "how should", "what's the approach"
  wantsVerification: boolean;   // "make sure", "verify", "double check"
  wantsThorough: boolean;       // "thoroughly", "comprehensive", "deep"
}

export interface AgentRecommendation {
  agents: string[];
  parallelism: 'sequential' | 'parallel' | 'swarm';
  modelTier: 'haiku' | 'sonnet' | 'opus';
  verification: boolean;
}

export interface IntentClassification {
  type: IntentType;
  complexity: Complexity;
  domains: Domain[];
  signals: UserSignals;
  recommendation: AgentRecommendation;
  confidence: number;           // 0-1
  reasoning?: string;           // Why this classification
}
```

### Classification Prompt

```typescript
// src/core/classifier/prompts.ts

export const CLASSIFICATION_PROMPT = `You are an intent classifier for a coding assistant. Analyze the user's request and classify it.

<request>
{USER_REQUEST}
</request>

<project_context>
{PROJECT_CONTEXT}
</project_context>

Respond with JSON only, no markdown:
{
  "type": "research|implementation|debugging|review|planning|refactoring|maintenance|conversation",
  "complexity": "trivial|simple|moderate|complex|architectural",
  "domains": ["frontend", "backend", "database", "devops", "security", "testing", "documentation", "general"],
  "signals": {
    "wantsPersistence": false,
    "wantsSpeed": false,
    "wantsAutonomy": false,
    "wantsPlanning": false,
    "wantsVerification": false,
    "wantsThorough": false
  },
  "recommendation": {
    "agents": ["agent1", "agent2"],
    "parallelism": "sequential|parallel|swarm",
    "modelTier": "haiku|sonnet|opus",
    "verification": true
  },
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}

Classification guidelines:
- trivial: typos, one-line changes, simple questions
- simple: single file changes, clear requirements
- moderate: multi-file, some exploration needed
- complex: significant feature, multiple systems
- architectural: design decisions, system restructuring

Agent mapping:
- research/exploration → explore, researcher
- implementation → executor, qa-tester
- debugging → architect, executor
- review → reviewer, security
- planning → planner, architect
- refactoring → architect, executor, qa-tester

Signal detection:
- Persistence: "don't stop", "finish", "complete it", "until done"
- Speed: "quick", "fast", "asap", "hurry"
- Autonomy: "just do it", "handle it", "you decide"
- Planning: "plan", "how should", "what approach"
- Verification: "make sure", "verify", "double-check", "test it"
- Thorough: "thorough", "comprehensive", "deep dive"`;

export const getClassificationPrompt = (
  userRequest: string,
  projectContext?: string
): string => {
  return CLASSIFICATION_PROMPT
    .replace('{USER_REQUEST}', userRequest)
    .replace('{PROJECT_CONTEXT}', projectContext || 'No specific project context.');
};
```

### Classifier Implementation

```typescript
// src/core/classifier/classifier.ts

import Anthropic from '@anthropic-ai/sdk';
import { IntentClassification } from './types';
import { getClassificationPrompt } from './prompts';

const client = new Anthropic();

export async function classifyIntent(
  userRequest: string,
  projectContext?: string
): Promise<IntentClassification> {
  const prompt = getClassificationPrompt(userRequest, projectContext);

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  try {
    return JSON.parse(text) as IntentClassification;
  } catch {
    // Fallback classification
    return {
      type: 'implementation',
      complexity: 'moderate',
      domains: ['general'],
      signals: {
        wantsPersistence: false,
        wantsSpeed: false,
        wantsAutonomy: false,
        wantsPlanning: false,
        wantsVerification: false,
        wantsThorough: false
      },
      recommendation: {
        agents: ['executor'],
        parallelism: 'sequential',
        modelTier: 'sonnet',
        verification: false
      },
      confidence: 0.5
    };
  }
}

// Format classification for injection into CLAUDE.md context
export function formatClassificationContext(
  classification: IntentClassification
): string {
  const { type, complexity, recommendation, signals } = classification;

  let context = `[ORCHESTRATION CONTEXT]
Task Type: ${type}
Complexity: ${complexity}
Recommended Model: ${recommendation.modelTier}
Parallelism: ${recommendation.parallelism}
`;

  if (recommendation.agents.length > 0) {
    context += `Suggested Agents: ${recommendation.agents.join(', ')}\n`;
  }

  if (recommendation.verification) {
    context += `Verification Required: Yes\n`;
  }

  const activeSignals = Object.entries(signals)
    .filter(([_, v]) => v)
    .map(([k]) => k.replace('wants', ''));

  if (activeSignals.length > 0) {
    context += `User Signals: ${activeSignals.join(', ')}\n`;
  }

  return context;
}
```

### Hook Integration

```javascript
// scripts/hooks/classify-intent.js
// UserPromptSubmit hook that runs classification

const { classifyIntent, formatClassificationContext } = require('../../dist/core/classifier');
const fs = require('fs');
const path = require('path');

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  const data = JSON.parse(input);
  const userPrompt = data.prompt || data.user_prompt || '';

  if (!userPrompt || userPrompt.length < 10) {
    // Too short to classify meaningfully
    console.log(JSON.stringify({ action: 'continue' }));
    return;
  }

  try {
    const classification = await classifyIntent(userPrompt);
    const context = formatClassificationContext(classification);

    // Output context for Claude to see
    console.error(`[Orchestration] ${classification.type} task (${classification.complexity})`);
    console.error(`[Orchestration] Using: ${classification.recommendation.agents.join(', ')}`);

    // Write to temp file for other hooks to read
    const tempDir = process.env.CLAUDEOPS_TEMP || path.join(process.env.HOME, '.claudeops', 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'current-classification.json'),
      JSON.stringify(classification, null, 2)
    );

    console.log(JSON.stringify({
      action: 'continue',
      context: context
    }));
  } catch (error) {
    console.error(`[Orchestration] Classification failed: ${error.message}`);
    console.log(JSON.stringify({ action: 'continue' }));
  }
}

main();
```

---

## Task 2: Intelligent Router

### Goal
Take classification and map to concrete agent/model/parallelism decisions.

### Location
`src/core/router/`

### Files to Create

```
src/core/router/
├── index.ts
├── types.ts
├── agent-router.ts      # Maps type → agents
├── model-router.ts      # Maps complexity → model
├── parallelism.ts       # Determines execution strategy
└── router.test.ts
```

### Router Implementation

```typescript
// src/core/router/agent-router.ts

import { IntentType, Domain } from '../classifier/types';

export interface AgentConfig {
  name: string;
  model: 'haiku' | 'sonnet' | 'opus';
  description: string;
  domains: Domain[];
}

export const AGENT_CATALOG: Record<string, AgentConfig> = {
  explore: {
    name: 'explore',
    model: 'haiku',
    description: 'Fast codebase exploration and search',
    domains: ['general']
  },
  executor: {
    name: 'executor',
    model: 'sonnet',
    description: 'Standard code implementation',
    domains: ['frontend', 'backend', 'general']
  },
  'executor-low': {
    name: 'executor-low',
    model: 'haiku',
    description: 'Simple changes, boilerplate',
    domains: ['general']
  },
  architect: {
    name: 'architect',
    model: 'opus',
    description: 'Deep analysis, complex debugging, design',
    domains: ['general']
  },
  designer: {
    name: 'designer',
    model: 'sonnet',
    description: 'UI/UX implementation',
    domains: ['frontend']
  },
  'qa-tester': {
    name: 'qa-tester',
    model: 'sonnet',
    description: 'Testing and quality assurance',
    domains: ['testing']
  },
  security: {
    name: 'security',
    model: 'opus',
    description: 'Security analysis and audit',
    domains: ['security']
  },
  researcher: {
    name: 'researcher',
    model: 'sonnet',
    description: 'External research and documentation',
    domains: ['documentation', 'general']
  },
  planner: {
    name: 'planner',
    model: 'opus',
    description: 'Strategic planning and requirements',
    domains: ['general']
  },
  writer: {
    name: 'writer',
    model: 'haiku',
    description: 'Documentation and comments',
    domains: ['documentation']
  }
};

export const TYPE_TO_AGENTS: Record<IntentType, string[]> = {
  research: ['explore', 'researcher'],
  implementation: ['executor', 'qa-tester'],
  debugging: ['architect', 'executor'],
  review: ['security', 'architect'],
  planning: ['planner', 'architect'],
  refactoring: ['architect', 'executor', 'qa-tester'],
  maintenance: ['executor-low', 'qa-tester'],
  conversation: [] // No agents needed for conversation
};

export function getAgentsForIntent(
  type: IntentType,
  domains: Domain[]
): string[] {
  const baseAgents = TYPE_TO_AGENTS[type] || ['executor'];

  // Add domain-specific agents
  const domainAgents: string[] = [];

  if (domains.includes('frontend')) {
    domainAgents.push('designer');
  }
  if (domains.includes('security')) {
    domainAgents.push('security');
  }
  if (domains.includes('testing')) {
    domainAgents.push('qa-tester');
  }

  // Deduplicate
  return [...new Set([...baseAgents, ...domainAgents])];
}
```

```typescript
// src/core/router/model-router.ts

import { Complexity, IntentType } from '../classifier/types';

export type ModelTier = 'haiku' | 'sonnet' | 'opus';

const COMPLEXITY_TO_MODEL: Record<Complexity, ModelTier> = {
  trivial: 'haiku',
  simple: 'haiku',
  moderate: 'sonnet',
  complex: 'opus',
  architectural: 'opus'
};

const TYPE_MODEL_OVERRIDE: Partial<Record<IntentType, ModelTier>> = {
  planning: 'opus',       // Always use opus for planning
  review: 'opus',         // Security/code review needs opus
  debugging: 'opus',      // Complex debugging needs opus
  conversation: 'haiku'   // Simple Q&A can use haiku
};

export function getModelForTask(
  complexity: Complexity,
  type: IntentType
): ModelTier {
  // Type override takes precedence
  if (TYPE_MODEL_OVERRIDE[type]) {
    return TYPE_MODEL_OVERRIDE[type]!;
  }

  return COMPLEXITY_TO_MODEL[complexity];
}

export function getModelId(tier: ModelTier): string {
  switch (tier) {
    case 'haiku':
      return 'claude-3-5-haiku-20241022';
    case 'sonnet':
      return 'claude-sonnet-4-20250514';
    case 'opus':
      return 'claude-opus-4-20250514';
  }
}
```

```typescript
// src/core/router/parallelism.ts

import { Complexity, IntentType, UserSignals } from '../classifier/types';

export type ParallelismLevel = 'sequential' | 'parallel' | 'swarm';

export function determineParallelism(
  complexity: Complexity,
  type: IntentType,
  signals: UserSignals,
  agentCount: number
): ParallelismLevel {
  // User explicitly wants speed
  if (signals.wantsSpeed) {
    return agentCount > 2 ? 'swarm' : 'parallel';
  }

  // Research benefits from parallel exploration
  if (type === 'research') {
    return 'parallel';
  }

  // Complex tasks with multiple agents should parallelize
  if (complexity === 'complex' || complexity === 'architectural') {
    return agentCount > 2 ? 'swarm' : 'parallel';
  }

  // Multi-domain tasks can parallelize
  if (agentCount > 1 && complexity !== 'trivial') {
    return 'parallel';
  }

  return 'sequential';
}
```

---

## Task 3: Guardrails Layer

### Goal
Safety-first defaults: deletion protection, secret scanning, dangerous command warnings.

### Location
`src/core/guardrails/`

### Files to Create

```
src/core/guardrails/
├── index.ts
├── types.ts
├── deletion.ts          # rm -rf protection
├── secrets.ts           # Secret pattern detection
├── dangerous.ts         # Dangerous command warnings
└── guardrails.test.ts
```

### Deletion Protection

```typescript
// src/core/guardrails/deletion.ts

export interface DeletionCheckResult {
  allowed: boolean;
  reason?: string;
  suggestion?: string;
  severity: 'info' | 'warn' | 'block';
}

const BLOCKED_PATTERNS = [
  // Direct rm commands
  { pattern: /\brm\s+(-[rfivI]+\s+)*\//, reason: 'Absolute path deletion' },
  { pattern: /\brm\s+(-[rfivI]+\s+)*~/, reason: 'Home directory deletion' },
  { pattern: /\brm\s+-rf?\s+\*/, reason: 'Wildcard deletion' },
  { pattern: /\brm\s+-rf\s+\./, reason: 'Current directory deletion' },

  // Bypass attempts
  { pattern: /sudo\s+rm\b/, reason: 'Sudo rm' },
  { pattern: /command\s+rm\b/, reason: 'Command rm bypass' },
  { pattern: /\\rm\b/, reason: 'Escaped rm bypass' },
  { pattern: /\/bin\/rm\b/, reason: 'Direct rm path' },

  // Other destructive commands
  { pattern: /\bshred\b/, reason: 'Shred command' },
  { pattern: /\bunlink\s+/, reason: 'Unlink command' },

  // Find with delete
  { pattern: /\bfind\s+.*-delete\b/, reason: 'Find with delete' },
  { pattern: /\bfind\s+.*-exec\s+rm\b/, reason: 'Find exec rm' },

  // Shell tricks
  { pattern: /:\(\)\{.*\}/, reason: 'Fork bomb pattern' },
  { pattern: />\s*\/dev\/sd[a-z]/, reason: 'Direct disk write' },
];

const SAFE_ALTERNATIVES = [
  { pattern: /\btrash\b/, name: 'trash' },
  { pattern: /\bgit\s+clean\b/, name: 'git clean' },
  { pattern: /\bnpm\s+prune\b/, name: 'npm prune' },
];

export function checkDeletionCommand(command: string): DeletionCheckResult {
  // Strip quoted strings to avoid false positives on echo/comments
  const strippedCommand = command
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''");

  // Check if using safe alternative
  for (const safe of SAFE_ALTERNATIVES) {
    if (safe.pattern.test(strippedCommand)) {
      return { allowed: true, severity: 'info' };
    }
  }

  // Check for dangerous patterns
  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(strippedCommand)) {
      // Generate safe suggestion
      const suggestion = command.includes('rm ')
        ? command.replace(/\brm\b/, 'trash')
        : 'Use trash command for recoverable deletion';

      return {
        allowed: false,
        reason: `Blocked: ${reason}. Destructive deletion commands are blocked by default.`,
        suggestion,
        severity: 'block'
      };
    }
  }

  // Warn on any rm usage (even if not blocked)
  if (/\brm\b/.test(strippedCommand)) {
    return {
      allowed: true,
      reason: 'Consider using trash for recoverable deletion',
      suggestion: command.replace(/\brm\b/, 'trash'),
      severity: 'warn'
    };
  }

  return { allowed: true, severity: 'info' };
}
```

### Secret Scanning

```typescript
// src/core/guardrails/secrets.ts

export interface SecretMatch {
  type: string;
  pattern: string;
  line: number;
  snippet: string;
}

export interface SecretScanResult {
  hasSecrets: boolean;
  matches: SecretMatch[];
  severity: 'info' | 'warn' | 'block';
}

const SECRET_PATTERNS = [
  // API Keys
  { type: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { type: 'AWS Secret Key', pattern: /[0-9a-zA-Z/+]{40}/ },
  { type: 'GitHub Token', pattern: /ghp_[0-9a-zA-Z]{36}/ },
  { type: 'GitHub OAuth', pattern: /gho_[0-9a-zA-Z]{36}/ },
  { type: 'Stripe Key', pattern: /sk_live_[0-9a-zA-Z]{24,}/ },
  { type: 'Stripe Test Key', pattern: /sk_test_[0-9a-zA-Z]{24,}/ },
  { type: 'Slack Token', pattern: /xox[baprs]-[0-9a-zA-Z-]+/ },
  { type: 'Discord Token', pattern: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}/ },

  // Generic patterns
  { type: 'Private Key', pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { type: 'Password Assignment', pattern: /password\s*[=:]\s*['"][^'"]{8,}['"]/ },
  { type: 'Secret Assignment', pattern: /secret\s*[=:]\s*['"][^'"]{8,}['"]/ },
  { type: 'API Key Assignment', pattern: /api[_-]?key\s*[=:]\s*['"][^'"]{16,}['"]/ },
  { type: 'Token Assignment', pattern: /token\s*[=:]\s*['"][^'"]{16,}['"]/ },

  // Environment variable patterns with values
  { type: 'Hardcoded Env', pattern: /[A-Z_]+_KEY\s*=\s*['"]?[a-zA-Z0-9]{20,}['"]?/ },
  { type: 'Hardcoded Secret', pattern: /[A-Z_]+_SECRET\s*=\s*['"]?[a-zA-Z0-9]{20,}['"]?/ },
];

// False positive patterns (env var references, not actual secrets)
const FALSE_POSITIVE_PATTERNS = [
  /process\.env\./,
  /\$\{[A-Z_]+\}/,
  /os\.environ/,
  /getenv\(/,
  /env\.[A-Z_]+/,
  /import\.meta\.env/,
];

export function scanForSecrets(content: string): SecretScanResult {
  const matches: SecretMatch[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip if it's an env var reference
    if (FALSE_POSITIVE_PATTERNS.some(fp => fp.test(line))) {
      continue;
    }

    for (const { type, pattern } of SECRET_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        matches.push({
          type,
          pattern: pattern.source,
          line: i + 1,
          snippet: line.substring(0, 80) + (line.length > 80 ? '...' : '')
        });
      }
    }
  }

  return {
    hasSecrets: matches.length > 0,
    matches,
    severity: matches.length > 0 ? 'block' : 'info'
  };
}
```

### Dangerous Commands

```typescript
// src/core/guardrails/dangerous.ts

export interface DangerousCommandResult {
  action: 'allow' | 'warn' | 'block';
  reason?: string;
  suggestion?: string;
}

const DANGEROUS_COMMANDS: Array<{
  pattern: RegExp;
  action: 'warn' | 'block';
  reason: string;
  suggestion?: string;
}> = [
  // Git dangerous operations
  {
    pattern: /git\s+push\s+.*--force(?!-with-lease)/,
    action: 'warn',
    reason: 'Force push can overwrite remote history',
    suggestion: 'Use --force-with-lease for safer force push'
  },
  {
    pattern: /git\s+push\s+--force\s+.*\b(main|master)\b/,
    action: 'block',
    reason: 'Force push to main/master is extremely dangerous'
  },
  {
    pattern: /git\s+reset\s+--hard/,
    action: 'warn',
    reason: 'Hard reset discards uncommitted changes permanently'
  },
  {
    pattern: /git\s+clean\s+-[a-z]*f/,
    action: 'warn',
    reason: 'Git clean -f permanently removes untracked files'
  },

  // Database operations
  {
    pattern: /DROP\s+(TABLE|DATABASE|SCHEMA)/i,
    action: 'block',
    reason: 'DROP statements permanently delete data'
  },
  {
    pattern: /TRUNCATE\s+TABLE/i,
    action: 'warn',
    reason: 'TRUNCATE permanently deletes all table data'
  },
  {
    pattern: /DELETE\s+FROM\s+\w+\s*(?:;|$)/i,
    action: 'warn',
    reason: 'DELETE without WHERE affects all rows'
  },

  // System operations
  {
    pattern: /chmod\s+777/,
    action: 'warn',
    reason: '777 permissions are a security risk'
  },
  {
    pattern: /curl\s+.*\|\s*(?:sudo\s+)?(?:bash|sh)/,
    action: 'warn',
    reason: 'Piping curl to shell is risky'
  }
];

export function checkDangerousCommand(command: string): DangerousCommandResult {
  for (const { pattern, action, reason, suggestion } of DANGEROUS_COMMANDS) {
    if (pattern.test(command)) {
      return { action, reason, suggestion };
    }
  }

  return { action: 'allow' };
}
```

### PreToolUse Hook (Combined Guardrails)

```javascript
// scripts/hooks/guardrails.js

const fs = require('fs');
const path = require('path');

// Import guardrail checks (bundled from TypeScript)
const { checkDeletionCommand } = require('../../dist/core/guardrails/deletion');
const { checkDangerousCommand } = require('../../dist/core/guardrails/dangerous');
const { scanForSecrets } = require('../../dist/core/guardrails/secrets');

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  const data = JSON.parse(input);
  const tool = data.tool;
  const toolInput = data.tool_input || {};

  // Bash command guardrails
  if (tool === 'Bash') {
    const command = toolInput.command || '';

    // Check deletion
    const deletionResult = checkDeletionCommand(command);
    if (!deletionResult.allowed) {
      console.error(`[Guardrail] BLOCKED: ${deletionResult.reason}`);
      if (deletionResult.suggestion) {
        console.error(`[Guardrail] Suggestion: ${deletionResult.suggestion}`);
      }
      process.exit(2); // Block
    }

    // Check dangerous commands
    const dangerResult = checkDangerousCommand(command);
    if (dangerResult.action === 'block') {
      console.error(`[Guardrail] BLOCKED: ${dangerResult.reason}`);
      process.exit(2);
    }
    if (dangerResult.action === 'warn') {
      console.error(`[Guardrail] WARNING: ${dangerResult.reason}`);
      if (dangerResult.suggestion) {
        console.error(`[Guardrail] Suggestion: ${dangerResult.suggestion}`);
      }
    }
  }

  // Edit/Write secret scanning
  if (tool === 'Edit' || tool === 'Write') {
    const content = toolInput.new_string || toolInput.content || '';
    const filePath = toolInput.file_path || '';

    // Skip scanning for env example files
    if (!/\.env\.example|\.env\.sample|\.env\.template/i.test(filePath)) {
      const secretResult = scanForSecrets(content);
      if (secretResult.hasSecrets) {
        console.error(`[Guardrail] BLOCKED: Potential secrets detected in ${filePath}`);
        for (const match of secretResult.matches.slice(0, 3)) {
          console.error(`  Line ${match.line}: ${match.type}`);
        }
        console.error(`[Guardrail] Use environment variables instead of hardcoding secrets`);
        process.exit(2);
      }
    }
  }

  console.log(JSON.stringify({ action: 'continue' }));
}

main();
```

---

## Task 4: AI-Powered Pack Analyzer

### Goal
Point to any GitHub repo → AI analyzes → interactively adds to config. No manual capability building.

### Location
`src/domain/pack/`

### How It Works

```
User: claudeops pack add https://github.com/vercel-labs/agent-skills

1. Clone/fetch repo to temp directory
2. AI analyzes structure:
   - What files exist (agents/, hooks/, skills/, etc.)
   - What each file does
   - What dependencies are needed
   - How to integrate with Claude Code

3. Classification:
   - Type: agent-pack, hook-pack, skill-pack, mcp-server, guardrail, mixed
   - Contents: list of components
   - Requirements: npm deps, MCP servers, env vars

4. Interactive prompts:
   - "This repo contains 3 agents and 2 skills. Install all? [Y/n]"
   - "Agent 'security-reviewer' requires opus model. Enable? [Y/n]"
   - "Hook 'deletion-protection' will block rm commands. Enable? [Y/n]"

5. Apply to config:
   - Copy files to ~/.claude/
   - Update settings.json
   - Update CLAUDE.md if needed
```

### Types

```typescript
// src/domain/pack/types.ts

export type PackType =
  | 'agent-pack'      // Contains agent definitions
  | 'skill-pack'      // Contains skill definitions
  | 'hook-pack'       // Contains hooks
  | 'mcp-server'      // Is an MCP server
  | 'guardrail'       // Safety/protection hooks
  | 'rules'           // Rule files
  | 'mixed';          // Combination

export interface PackComponent {
  type: 'agent' | 'skill' | 'hook' | 'rule' | 'mcp' | 'script';
  name: string;
  path: string;
  description: string;
  model?: 'haiku' | 'sonnet' | 'opus';
  dependencies?: string[];
}

export interface PackAnalysis {
  name: string;
  source: string;           // GitHub URL
  type: PackType;
  description: string;
  components: PackComponent[];
  requirements: {
    npm?: string[];
    mcp?: string[];
    env?: string[];
  };
  installInstructions: string;
  confidence: number;
}

export interface InstalledPack {
  name: string;
  source: string;
  installedAt: string;
  components: PackComponent[];
  enabled: boolean;
}
```

### Analyzer Implementation

```typescript
// src/domain/pack/analyzer.ts

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PackAnalysis, PackComponent } from './types';

const client = new Anthropic();

const ANALYSIS_PROMPT = `Analyze this GitHub repository structure and contents to understand what Claude Code capabilities it provides.

<repo_structure>
{STRUCTURE}
</repo_structure>

<file_samples>
{SAMPLES}
</file_samples>

Respond with JSON:
{
  "name": "pack-name",
  "type": "agent-pack|skill-pack|hook-pack|mcp-server|guardrail|rules|mixed",
  "description": "What this pack provides",
  "components": [
    {
      "type": "agent|skill|hook|rule|mcp|script",
      "name": "component-name",
      "path": "relative/path",
      "description": "What it does",
      "model": "haiku|sonnet|opus (if applicable)",
      "dependencies": ["dep1", "dep2"]
    }
  ],
  "requirements": {
    "npm": ["package1", "package2"],
    "mcp": ["mcp-server-name"],
    "env": ["ENV_VAR_1", "ENV_VAR_2"]
  },
  "installInstructions": "How to install/configure",
  "confidence": 0.95
}

Guidelines:
- Look for .md files in agents/, commands/, skills/ folders
- Check hooks.json or settings.json for hook definitions
- Check for MCP server configurations
- Identify package.json dependencies
- Note any environment variables referenced`;

async function getRepoStructure(repoPath: string): Promise<string> {
  const result = execSync(`find . -type f -name "*.md" -o -name "*.json" -o -name "*.ts" -o -name "*.js" | head -100`, {
    cwd: repoPath,
    encoding: 'utf8'
  });
  return result;
}

async function getSampleFiles(repoPath: string): Promise<string> {
  const samples: string[] = [];
  const importantFiles = [
    'README.md',
    'package.json',
    'hooks.json',
    'settings.json',
    'manifest.json',
    'plugin.json'
  ];

  for (const file of importantFiles) {
    const filePath = path.join(repoPath, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8').substring(0, 2000);
      samples.push(`=== ${file} ===\n${content}`);
    }
  }

  // Sample agent files
  const agentsDir = path.join(repoPath, 'agents');
  if (fs.existsSync(agentsDir)) {
    const agentFiles = fs.readdirSync(agentsDir).slice(0, 3);
    for (const file of agentFiles) {
      const content = fs.readFileSync(path.join(agentsDir, file), 'utf8').substring(0, 1000);
      samples.push(`=== agents/${file} ===\n${content}`);
    }
  }

  // Sample hook files
  const hooksDir = path.join(repoPath, 'hooks');
  if (fs.existsSync(hooksDir)) {
    const hookFiles = fs.readdirSync(hooksDir).slice(0, 3);
    for (const file of hookFiles) {
      const filePath = path.join(hooksDir, file);
      if (fs.statSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath, 'utf8').substring(0, 1000);
        samples.push(`=== hooks/${file} ===\n${content}`);
      }
    }
  }

  return samples.join('\n\n');
}

export async function analyzeRepo(repoUrl: string): Promise<PackAnalysis> {
  // Clone to temp
  const tempDir = fs.mkdtempSync('/tmp/claudeops-pack-');

  try {
    execSync(`git clone --depth 1 ${repoUrl} ${tempDir}`, { stdio: 'pipe' });

    const structure = await getRepoStructure(tempDir);
    const samples = await getSampleFiles(tempDir);

    const prompt = ANALYSIS_PROMPT
      .replace('{STRUCTURE}', structure)
      .replace('{SAMPLES}', samples);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const analysis = JSON.parse(text) as PackAnalysis;
    analysis.source = repoUrl;

    return analysis;
  } finally {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
```

### Interactive Installer

```typescript
// src/domain/pack/installer.ts

import * as prompts from '@clack/prompts';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PackAnalysis, InstalledPack } from './types';

const CLAUDE_DIR = path.join(process.env.HOME!, '.claude');
const PACKS_STATE_FILE = path.join(CLAUDE_DIR, 'packs.json');

export async function installPack(analysis: PackAnalysis): Promise<void> {
  console.log(`\n📦 Pack: ${analysis.name}`);
  console.log(`   Type: ${analysis.type}`);
  console.log(`   ${analysis.description}\n`);

  // Show components
  console.log('Components found:');
  for (const comp of analysis.components) {
    console.log(`  • ${comp.type}: ${comp.name} - ${comp.description}`);
  }

  // Confirm installation
  const confirm = await prompts.confirm({
    message: `Install ${analysis.components.length} components?`
  });

  if (!confirm) {
    console.log('Installation cancelled.');
    return;
  }

  // Component selection for mixed packs
  let componentsToInstall = analysis.components;
  if (analysis.components.length > 3) {
    const selected = await prompts.multiselect({
      message: 'Select components to install:',
      options: analysis.components.map(c => ({
        value: c.name,
        label: `${c.type}: ${c.name}`,
        hint: c.description
      })),
      initialValues: analysis.components.map(c => c.name)
    });

    if (prompts.isCancel(selected)) {
      console.log('Installation cancelled.');
      return;
    }

    componentsToInstall = analysis.components.filter(c =>
      (selected as string[]).includes(c.name)
    );
  }

  // Install npm dependencies
  if (analysis.requirements.npm?.length) {
    const installDeps = await prompts.confirm({
      message: `Install npm dependencies? (${analysis.requirements.npm.join(', ')})`
    });

    if (installDeps) {
      console.log('Installing dependencies...');
      execSync(`npm install ${analysis.requirements.npm.join(' ')}`, {
        stdio: 'inherit'
      });
    }
  }

  // Clone repo
  const packsDir = path.join(CLAUDE_DIR, 'packs');
  fs.mkdirSync(packsDir, { recursive: true });

  const packDir = path.join(packsDir, analysis.name);
  if (fs.existsSync(packDir)) {
    fs.rmSync(packDir, { recursive: true });
  }

  console.log('Cloning pack...');
  execSync(`git clone --depth 1 ${analysis.source} ${packDir}`, { stdio: 'pipe' });

  // Copy components to appropriate locations
  for (const comp of componentsToInstall) {
    const srcPath = path.join(packDir, comp.path);
    let destDir: string;

    switch (comp.type) {
      case 'agent':
        destDir = path.join(CLAUDE_DIR, 'agents');
        break;
      case 'skill':
        destDir = path.join(CLAUDE_DIR, 'skills');
        break;
      case 'rule':
        destDir = path.join(CLAUDE_DIR, 'rules');
        break;
      case 'hook':
      case 'script':
        destDir = path.join(CLAUDE_DIR, 'scripts', analysis.name);
        break;
      default:
        destDir = path.join(CLAUDE_DIR, 'packs', analysis.name);
    }

    fs.mkdirSync(destDir, { recursive: true });

    if (fs.existsSync(srcPath)) {
      const destPath = path.join(destDir, path.basename(comp.path));
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ✓ Installed ${comp.type}: ${comp.name}`);
    }
  }

  // Update settings.json with hooks if needed
  const hookComponents = componentsToInstall.filter(c => c.type === 'hook');
  if (hookComponents.length > 0) {
    await updateSettingsWithHooks(analysis, hookComponents);
  }

  // Save to installed packs state
  await saveInstalledPack({
    name: analysis.name,
    source: analysis.source,
    installedAt: new Date().toISOString(),
    components: componentsToInstall,
    enabled: true
  });

  console.log(`\n✅ Pack "${analysis.name}" installed successfully!`);

  if (analysis.requirements.env?.length) {
    console.log(`\n⚠️  Remember to set these environment variables:`);
    for (const env of analysis.requirements.env) {
      console.log(`   export ${env}=<value>`);
    }
  }
}

async function updateSettingsWithHooks(
  analysis: PackAnalysis,
  hooks: typeof analysis.components
): Promise<void> {
  const settingsPath = path.join(CLAUDE_DIR, 'settings.json');
  let settings: any = {};

  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  }

  // Merge hooks from pack
  // This is simplified - real implementation would parse hook files
  console.log(`  ✓ Updated settings.json with ${hooks.length} hooks`);
}

async function saveInstalledPack(pack: InstalledPack): Promise<void> {
  let packs: InstalledPack[] = [];

  if (fs.existsSync(PACKS_STATE_FILE)) {
    packs = JSON.parse(fs.readFileSync(PACKS_STATE_FILE, 'utf8'));
  }

  // Update or add
  const existing = packs.findIndex(p => p.name === pack.name);
  if (existing >= 0) {
    packs[existing] = pack;
  } else {
    packs.push(pack);
  }

  fs.writeFileSync(PACKS_STATE_FILE, JSON.stringify(packs, null, 2));
}
```

---

## Task 5: Update CLAUDE.md Generator

### Goal
Dynamic CLAUDE.md that reflects current classification context and installed packs.

### Changes to `src/core/sync/claudemd-generator.ts`

```typescript
// Add to existing generator

export function generateDynamicContext(
  installedPacks: InstalledPack[],
  classification?: IntentClassification
): string {
  let content = '';

  // Orchestration philosophy (replaces old keyword docs)
  content += `# Intelligent Orchestration

This environment uses semantic intent detection. No keywords required - just describe what you want naturally.

## How It Works
- Your request is automatically analyzed for intent, complexity, and domain
- Appropriate agents and models are suggested based on the analysis
- Parallelism is applied when beneficial
- Verification is included for complex tasks

## Available Agents
`;

  // List installed agents from packs
  const agents = installedPacks
    .flatMap(p => p.components.filter(c => c.type === 'agent'));

  if (agents.length > 0) {
    content += '| Agent | Model | Purpose |\n|-------|-------|--------|\n';
    for (const agent of agents) {
      content += `| ${agent.name} | ${agent.model || 'sonnet'} | ${agent.description} |\n`;
    }
    content += '\n';
  }

  // Current classification context (if available)
  if (classification) {
    content += `## Current Task Context
- Type: ${classification.type}
- Complexity: ${classification.complexity}
- Suggested: ${classification.recommendation.agents.join(', ')}
- Parallelism: ${classification.recommendation.parallelism}
`;
  }

  // Guardrails
  content += `
## Active Guardrails
- Deletion Protection: Enabled (use \`trash\` instead of \`rm\`)
- Secret Scanning: Enabled (blocks hardcoded secrets)
- Dangerous Commands: Warnings enabled

`;

  return content;
}
```

---

## Task 6: Create New Hook Scripts

Covered in previous sections. Summary of hooks to create:

| Hook | Event | Purpose |
|------|-------|---------|
| `classify-intent.js` | UserPromptSubmit | Semantic classification |
| `guardrails.js` | PreToolUse | Deletion/danger protection |
| `secret-scan.js` | PostToolUse | Secret detection on writes |

---

## Task 7: Add CLI Commands for Pack Management

### Commands to Add

```bash
# Analyze and install a pack from any repo
claudeops pack add <repo-url>
claudeops pack add https://github.com/vercel-labs/agent-skills
claudeops pack add https://github.com/zcaceres/claude-rm-rf

# List installed packs
claudeops pack list

# Remove a pack
claudeops pack remove <name>

# Update a pack
claudeops pack update <name>
claudeops pack update --all

# Enable/disable without removing
claudeops pack enable <name>
claudeops pack disable <name>

# Show pack details
claudeops pack info <name>
```

### Implementation Location

`src/commands/pack.ts`

---

## Task 8: Write Tests

### Test Categories

1. **Classifier Tests**
   - Various prompt types classified correctly
   - User signals detected
   - Edge cases (very short, very long, ambiguous)

2. **Router Tests**
   - Complexity → model mapping
   - Type → agent mapping
   - Parallelism determination

3. **Guardrails Tests**
   - Deletion patterns blocked
   - Safe commands allowed
   - Secret patterns detected
   - False positives avoided

4. **Pack Analyzer Tests**
   - Various repo structures analyzed
   - Components correctly identified
   - Requirements extracted

---

## Task 9: Update Documentation

### Files to Update

1. **README.md** - New overview, remove keyword references
2. **docs/MIGRATION.md** - From v2 to v3
3. **docs/PACKS.md** - How to use pack system
4. **CLAUDE.md template** - Remove mode keywords

### New Terminology Guide

| Old | New | Note |
|-----|-----|------|
| ultrawork | (removed) | System auto-scales |
| autopilot | (removed) | System auto-orchestrates |
| mode activation | intent classification | Semantic, not keyword |
| keyword detection | (removed) | Natural language works |

---

## Implementation Timeline

```
Week 1: Foundation
├── Day 1-2: Intent Classification System (#1)
├── Day 3-4: Guardrails Layer (#3)
└── Day 5: AI Pack Analyzer basics (#4)

Week 2: Integration
├── Day 1-2: Intelligent Router (#2)
├── Day 3: Hook Scripts (#6)
├── Day 4: Pack CLI Commands (#7)
└── Day 5: CLAUDE.md Generator (#5)

Week 3: Polish
├── Day 1-2: Tests (#8)
├── Day 3-4: Documentation (#9)
└── Day 5: Release prep
```

---

## Success Criteria

- [ ] No keyword memorization required
- [ ] Natural language triggers correct behavior
- [ ] `claudeops pack add <any-repo>` works
- [ ] Guardrails active by default
- [ ] Build passes
- [ ] Tests pass
- [ ] Old terminology removed from docs
