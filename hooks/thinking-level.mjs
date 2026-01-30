/**
 * Hook: thinking-level
 * Event: UserPromptSubmit
 * Description: Detects complex tasks and adds reasoning enhancement instructions
 * Matcher: *
 * Enabled: true
 *
 * thinking-level - UserPromptSubmit Hook
 *
 * Detects complex tasks from user prompts and adds reasoning enhancement instructions.
 * Analyzes keywords like "debug", "architect", "refactor", "security" to determine task complexity.
 *
 * Hook type: UserPromptSubmit
 * Triggers: Before user prompt is submitted to Claude
 */

/**
 * Keywords that indicate complex tasks requiring enhanced reasoning
 */
const COMPLEXITY_KEYWORDS = {
  debug: ['debug', 'debugger', 'troubleshoot', 'investigate', 'diagnose', 'trace', 'root cause'],
  architect: ['architect', 'architecture', 'design pattern', 'system design', 'scalability', 'distributed'],
  refactor: ['refactor', 'restructure', 'reorganize', 'optimize', 'improve performance', 'tech debt'],
  security: ['security', 'vulnerability', 'exploit', 'attack', 'penetration', 'audit', 'threat'],
  algorithm: ['algorithm', 'complexity', 'optimize', 'performance', 'big o', 'data structure'],
  integration: ['integrate', 'migration', 'upgrade', 'compatibility', 'breaking change'],
};

/**
 * Detect complexity level from prompt
 */
function detectComplexity(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  const detectedCategories = [];

  for (const [category, keywords] of Object.entries(COMPLEXITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        detectedCategories.push(category);
        break;
      }
    }
  }

  return {
    isComplex: detectedCategories.length > 0,
    categories: detectedCategories,
    level: detectedCategories.length >= 3 ? 'high' : detectedCategories.length >= 1 ? 'medium' : 'low',
  };
}

/**
 * Generate reasoning enhancement instructions based on complexity
 */
function generateReasoningInstructions(complexity) {
  if (!complexity.isComplex) {
    return null;
  }

  const instructions = [];

  if (complexity.categories.includes('debug')) {
    instructions.push('- Use systematic debugging approach: reproduce, isolate, identify, fix, verify');
    instructions.push('- Trace execution flow and state changes carefully');
  }

  if (complexity.categories.includes('architect')) {
    instructions.push('- Consider scalability, maintainability, and extensibility');
    instructions.push('- Evaluate trade-offs between different architectural approaches');
  }

  if (complexity.categories.includes('refactor')) {
    instructions.push('- Preserve existing behavior while improving code structure');
    instructions.push('- Consider incremental refactoring approach for safety');
  }

  if (complexity.categories.includes('security')) {
    instructions.push('- Apply security-first mindset: threat modeling, least privilege, defense in depth');
    instructions.push('- Consider attack vectors and potential vulnerabilities');
  }

  if (complexity.categories.includes('algorithm')) {
    instructions.push('- Analyze time and space complexity');
    instructions.push('- Consider edge cases and performance implications');
  }

  if (complexity.categories.includes('integration')) {
    instructions.push('- Plan for backward compatibility and graceful degradation');
    instructions.push('- Consider rollback strategy and migration path');
  }

  if (complexity.level === 'high') {
    instructions.push('- Break down problem into smaller, manageable components');
    instructions.push('- Use extended reasoning for critical decisions');
  }

  return instructions.length > 0 ? instructions : null;
}

/**
 * Main hook function
 */
export default async function thinkingLevelHook(context) {
  const { prompt } = context;

  if (!prompt || typeof prompt !== 'string') {
    return { decision: 'allow' };
  }

  const complexity = detectComplexity(prompt);

  if (!complexity.isComplex) {
    return {
      decision: 'allow',
      metadata: {
        complexity: 'low',
      },
    };
  }

  const instructions = generateReasoningInstructions(complexity);

  if (!instructions) {
    return {
      decision: 'allow',
      metadata: {
        complexity: complexity.level,
        categories: complexity.categories,
      },
    };
  }

  const enhancement = `\n\n<reasoning_guidance>\nThis task involves: ${complexity.categories.join(', ')}\n\nApply enhanced reasoning:\n${instructions.join('\n')}\n</reasoning_guidance>\n`;

  return {
    decision: 'allow',
    modifiedPrompt: prompt + enhancement,
    message: `🧠 Enhanced reasoning activated (${complexity.level} complexity: ${complexity.categories.join(', ')})`,
    metadata: {
      complexity: complexity.level,
      categories: complexity.categories,
      enhanced: true,
    },
  };
}
