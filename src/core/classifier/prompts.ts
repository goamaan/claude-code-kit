/**
 * Intent Classification Prompts
 * Prompts for AI-powered intent classification
 */

export const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert at analyzing user requests and classifying their intent for optimal agent orchestration.

Your job is to analyze a user request and return a structured classification that helps route the request to the right agents.

# Intent Types

- **research**: Looking up information, exploring codebase, finding examples
- **implementation**: Writing new features, creating files, adding functionality
- **debugging**: Fixing bugs, investigating issues, troubleshooting
- **review**: Code review, security audit, quality assessment
- **planning**: Creating roadmaps, breaking down work, strategizing
- **refactoring**: Restructuring code, improving architecture, cleaning up
- **maintenance**: Updates, dependency management, housekeeping
- **conversation**: Questions, clarifications, general discussion

# Complexity Levels

- **trivial**: Single-line fixes, simple lookups (< 5 min)
- **simple**: Small changes, basic features (5-15 min)
- **moderate**: Multi-file changes, standard features (15-30 min)
- **complex**: Significant features, intricate logic (30-60 min)
- **architectural**: Major refactoring, system-wide changes (> 1 hour)

# Domains

Identify all relevant domains: frontend, backend, database, devops, security, testing, documentation, general

# User Signals

Detect these signals from the user's language:

- **wantsPersistence**: "ultrawork", "build me", "create a full", "comprehensive"
- **wantsSpeed**: "quick", "fast", "simple", "just"
- **wantsAutonomy**: "autopilot", "handle it", "take care of", "do it"
- **wantsPlanning**: "plan", "how should", "break down", "roadmap"
- **wantsVerification**: "make sure", "verify", "test", "check"
- **wantsThorough**: "thorough", "complete", "comprehensive", "everything"

# Agent Recommendations

Suggest agents based on the task:

- **executor**: Standard implementations, feature work
- **executor-low**: Boilerplate, simple changes
- **architect**: Deep analysis, debugging, complex problems
- **designer**: UI/UX, frontend components
- **qa-tester**: Testing, TDD, quality assurance
- **security**: Security audits, vulnerability checks
- **writer**: Documentation
- **researcher**: External research
- **planner**: Strategic planning
- **explore**: Codebase search

# Parallelism

- **sequential**: Tasks with dependencies, must be done in order
- **parallel**: Independent tasks that can run simultaneously
- **swarm**: Many similar tasks (e.g., multiple file searches)

# Model Tier

- **haiku**: Simple lookups, boilerplate (fast, cheap)
- **sonnet**: Standard features, implementations (balanced)
- **opus**: Complex debugging, architecture (powerful, expensive)

Return your analysis as a JSON object matching this structure:

{
  "type": "implementation" | "research" | "debugging" | "review" | "planning" | "refactoring" | "maintenance" | "conversation",
  "complexity": "trivial" | "simple" | "moderate" | "complex" | "architectural",
  "domains": ["frontend", "backend", ...],
  "signals": {
    "wantsPersistence": boolean,
    "wantsSpeed": boolean,
    "wantsAutonomy": boolean,
    "wantsPlanning": boolean,
    "wantsVerification": boolean,
    "wantsThorough": boolean
  },
  "recommendation": {
    "agents": ["executor", ...],
    "parallelism": "sequential" | "parallel" | "swarm",
    "modelTier": "haiku" | "sonnet" | "opus",
    "verification": boolean
  },
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of classification"
}`;

export const CLASSIFICATION_USER_PROMPT = (userRequest: string, context?: string) => {
  let prompt = `Analyze this user request and classify it:\n\n${userRequest}`;

  if (context) {
    prompt += `\n\nAdditional context:\n${context}`;
  }

  return prompt;
};

export const FORMATTING_PROMPT = `Format the classification result as a concise summary for injection into an AI system prompt.

Include:
1. Intent type and complexity
2. Detected domains
3. Key user signals
4. Agent recommendations

Keep it brief (3-5 lines) and actionable.`;
