/**
 * Intent Classifier
 * AI-powered classification of user requests for agent orchestration
 */

import type {
  IntentClassification,
  IntentType,
  Complexity,
  Domain,
  UserSignals,
  AgentRecommendation,
} from './types.js';
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  CLASSIFICATION_USER_PROMPT,
} from './prompts.js';

// =============================================================================
// Classification Error
// =============================================================================

export class ClassificationError extends Error {
  public override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ClassificationError';
    this.cause = cause;
  }
}

// =============================================================================
// Classifier Options
// =============================================================================

export interface ClassifierOptions {
  /** Anthropic API key (defaults to ANTHROPIC_API_KEY env var) */
  apiKey?: string;

  /** Model to use for classification (defaults to claude-3-5-haiku-20241022) */
  model?: string;

  /** Max tokens for classification response */
  maxTokens?: number;

  /** Temperature for classification (0-1) */
  temperature?: number;

  /** Additional context to include in classification */
  context?: string;
}

// =============================================================================
// Default Options
// =============================================================================

const DEFAULT_OPTIONS: Required<Omit<ClassifierOptions, 'context' | 'apiKey'>> = {
  model: 'claude-3-5-haiku-20241022',
  maxTokens: 1024,
  temperature: 0.3,
};

// =============================================================================
// Classifier
// =============================================================================

export interface IntentClassifier {
  /**
   * Classify a user request
   * @param userRequest The user's request to classify
   * @param options Optional classification options
   * @returns Intent classification result
   */
  classify(
    userRequest: string,
    options?: Partial<ClassifierOptions>,
  ): Promise<IntentClassification>;

  /**
   * Format classification as context string for system prompts
   * @param classification The classification result
   * @returns Formatted context string
   */
  formatClassificationContext(classification: IntentClassification): string;
}

// =============================================================================
// Fallback Classifier (Rule-based)
// =============================================================================

/**
 * Fallback rule-based classifier when Anthropic SDK is not available
 */
class FallbackClassifier implements IntentClassifier {
  async classify(
    userRequest: string,
    _options?: Partial<ClassifierOptions>,
  ): Promise<IntentClassification> {
    const lower = userRequest.toLowerCase();

    // Detect intent type
    const type = this.detectIntent(lower);

    // Detect complexity
    const complexity = this.detectComplexity(lower);

    // Detect domains
    const domains = this.detectDomains(lower);

    // Detect signals
    const signals = this.detectSignals(lower);

    // Generate recommendation
    const recommendation = this.generateRecommendation(type, complexity, signals);

    return {
      type,
      complexity,
      domains,
      signals,
      recommendation,
      confidence: 0.6, // Lower confidence for rule-based
      reasoning: 'Fallback rule-based classification (Anthropic SDK not available)',
    };
  }

  formatClassificationContext(classification: IntentClassification): string {
    return formatClassificationContext(classification);
  }

  private detectIntent(lower: string): IntentType {
    if (
      lower.includes('find') ||
      lower.includes('search') ||
      lower.includes('look') ||
      lower.includes('explore')
    ) {
      return 'research';
    }
    if (
      lower.includes('debug') ||
      lower.includes('fix') ||
      lower.includes('bug') ||
      lower.includes('error')
    ) {
      return 'debugging';
    }
    if (
      lower.includes('review') ||
      lower.includes('audit') ||
      lower.includes('check security')
    ) {
      return 'review';
    }
    if (
      lower.includes('plan') ||
      lower.includes('roadmap') ||
      lower.includes('break down')
    ) {
      return 'planning';
    }
    if (
      lower.includes('refactor') ||
      lower.includes('restructure') ||
      lower.includes('clean up')
    ) {
      return 'refactoring';
    }
    if (
      lower.includes('update') ||
      lower.includes('upgrade') ||
      lower.includes('maintain')
    ) {
      return 'maintenance';
    }
    if (
      lower.includes('create') ||
      lower.includes('implement') ||
      lower.includes('add') ||
      lower.includes('build')
    ) {
      return 'implementation';
    }
    return 'conversation';
  }

  private detectComplexity(lower: string): Complexity {
    // Size indicators
    const wordCount = lower.split(/\s+/).length;
    if (wordCount < 5) return 'trivial';
    if (wordCount < 15) return 'simple';

    // Complexity keywords
    if (
      lower.includes('entire') ||
      lower.includes('complete') ||
      lower.includes('system') ||
      lower.includes('architecture')
    ) {
      return 'architectural';
    }
    if (
      lower.includes('complex') ||
      lower.includes('advanced') ||
      lower.includes('intricate')
    ) {
      return 'complex';
    }
    if (lower.includes('simple') || lower.includes('quick') || lower.includes('just')) {
      return 'simple';
    }
    return 'moderate';
  }

  private detectDomains(lower: string): Domain[] {
    const domains: Domain[] = [];

    if (
      lower.includes('ui') ||
      lower.includes('component') ||
      lower.includes('react') ||
      lower.includes('frontend')
    ) {
      domains.push('frontend');
    }
    if (
      lower.includes('api') ||
      lower.includes('server') ||
      lower.includes('backend') ||
      lower.includes('endpoint')
    ) {
      domains.push('backend');
    }
    if (
      lower.includes('database') ||
      lower.includes('sql') ||
      lower.includes('query') ||
      lower.includes('schema')
    ) {
      domains.push('database');
    }
    if (
      lower.includes('deploy') ||
      lower.includes('docker') ||
      lower.includes('ci') ||
      lower.includes('devops')
    ) {
      domains.push('devops');
    }
    if (
      lower.includes('security') ||
      lower.includes('auth') ||
      lower.includes('vulnerability')
    ) {
      domains.push('security');
    }
    if (lower.includes('test') || lower.includes('testing') || lower.includes('spec')) {
      domains.push('testing');
    }
    if (lower.includes('doc') || lower.includes('readme') || lower.includes('guide')) {
      domains.push('documentation');
    }

    return domains.length > 0 ? domains : ['general'];
  }

  private detectSignals(lower: string): UserSignals {
    return {
      wantsPersistence:
        lower.includes('ultrawork') ||
        lower.includes('build me') ||
        lower.includes('create a full') ||
        lower.includes('comprehensive'),
      wantsSpeed:
        lower.includes('quick') ||
        lower.includes('fast') ||
        lower.includes('simple') ||
        lower.includes('just'),
      wantsAutonomy:
        lower.includes('autopilot') ||
        lower.includes('handle it') ||
        lower.includes('take care of') ||
        lower.includes('do it'),
      wantsPlanning:
        lower.includes('plan') ||
        lower.includes('how should') ||
        lower.includes('break down') ||
        lower.includes('roadmap'),
      wantsVerification:
        lower.includes('make sure') ||
        lower.includes('verify') ||
        lower.includes('test') ||
        lower.includes('check'),
      wantsThorough:
        lower.includes('thorough') ||
        lower.includes('complete') ||
        lower.includes('comprehensive') ||
        lower.includes('everything'),
    };
  }

  private generateRecommendation(
    type: IntentType,
    complexity: Complexity,
    signals: UserSignals,
  ): AgentRecommendation {
    const agents: string[] = [];
    let parallelism: AgentRecommendation['parallelism'] = 'sequential';
    let modelTier: AgentRecommendation['modelTier'] = 'sonnet';
    let verification = signals.wantsVerification;

    // Determine model tier based on complexity
    if (complexity === 'trivial' || complexity === 'simple') {
      modelTier = 'haiku';
    } else if (complexity === 'architectural' || complexity === 'complex') {
      modelTier = 'opus';
    }

    // Determine agents based on intent
    switch (type) {
      case 'research':
        agents.push('explore');
        if (complexity !== 'trivial') {
          agents.push('researcher');
        }
        parallelism = 'parallel';
        break;

      case 'implementation':
        if (complexity === 'trivial' || complexity === 'simple') {
          agents.push('executor-low');
        } else {
          agents.push('executor');
        }
        if (signals.wantsThorough) {
          agents.push('qa-tester');
        }
        break;

      case 'debugging':
        if (complexity === 'complex' || complexity === 'architectural') {
          agents.push('architect');
        } else {
          agents.push('executor');
        }
        verification = true;
        break;

      case 'review':
        agents.push('architect');
        if (signals.wantsVerification) {
          agents.push('security');
        }
        break;

      case 'planning':
        agents.push('planner');
        if (complexity === 'architectural') {
          agents.push('architect');
        }
        break;

      case 'refactoring':
        agents.push('architect', 'executor');
        verification = true;
        break;

      case 'maintenance':
        agents.push('executor-low');
        break;

      case 'conversation':
        // No agents needed
        break;
    }

    return {
      agents,
      parallelism,
      modelTier,
      verification,
    };
  }
}

// =============================================================================
// AI-powered Classifier (using Anthropic SDK)
// =============================================================================

// Type definition for Anthropic SDK (to avoid importing when not installed)
interface AnthropicSDK {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      temperature: number;
      system: string;
      messages: Array<{ role: string; content: string }>;
    }): Promise<{
      content: Array<{ text?: string }>;
    }>;
  };
}

/**
 * AI-powered classifier using Anthropic's Claude API
 * Note: Requires @anthropic-ai/sdk to be installed
 */
class AIClassifier implements IntentClassifier {
  private anthropic: AnthropicSDK;
  private defaultOptions: Required<Omit<ClassifierOptions, 'context' | 'apiKey'>>;

  constructor(options: ClassifierOptions = {}) {
    this.defaultOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    // Try to import Anthropic SDK
    try {
      const AnthropicModule = eval("require('@anthropic-ai/sdk')");
      const Anthropic = AnthropicModule.default || AnthropicModule;
      const apiKey = options.apiKey || process.env['ANTHROPIC_API_KEY'];

      if (!apiKey) {
        throw new ClassificationError(
          'Anthropic API key not provided. Set ANTHROPIC_API_KEY environment variable or pass apiKey option.',
        );
      }

      this.anthropic = new Anthropic({ apiKey }) as AnthropicSDK;
    } catch (error) {
      throw new ClassificationError(
        'Failed to initialize Anthropic SDK. Make sure @anthropic-ai/sdk is installed.',
        error,
      );
    }
  }

  async classify(
    userRequest: string,
    options?: Partial<ClassifierOptions>,
  ): Promise<IntentClassification> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const response = await this.anthropic.messages.create({
        model: opts.model,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        system: CLASSIFICATION_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: CLASSIFICATION_USER_PROMPT(userRequest, opts.context),
          },
        ],
      });

      // Extract JSON from response
      const content = response.content[0]?.text || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new ClassificationError(
          'Failed to extract JSON from classification response',
        );
      }

      const classification = JSON.parse(jsonMatch[0]) as IntentClassification;

      // Validate the classification
      this.validateClassification(classification);

      return classification;
    } catch (error) {
      if (error instanceof ClassificationError) {
        throw error;
      }
      throw new ClassificationError('Failed to classify intent', error);
    }
  }

  formatClassificationContext(classification: IntentClassification): string {
    return formatClassificationContext(classification);
  }

  private validateClassification(classification: unknown): asserts classification is IntentClassification {
    if (!classification || typeof classification !== 'object') {
      throw new ClassificationError('Invalid classification: not an object');
    }

    const obj = classification as Record<string, unknown>;

    const requiredFields = [
      'type',
      'complexity',
      'domains',
      'signals',
      'recommendation',
      'confidence',
    ];
    for (const field of requiredFields) {
      if (!(field in obj)) {
        throw new ClassificationError(
          `Invalid classification: missing field '${field}'`,
        );
      }
    }

    if (
      typeof obj['confidence'] !== 'number' ||
      obj['confidence'] < 0 ||
      obj['confidence'] > 1
    ) {
      throw new ClassificationError(
        'Invalid classification: confidence must be between 0 and 1',
      );
    }
  }
}

// =============================================================================
// Classifier Factory
// =============================================================================

/**
 * Create an intent classifier
 * @param options Classifier options
 * @returns IntentClassifier instance
 */
export function createClassifier(options: ClassifierOptions = {}): IntentClassifier {
  try {
    // Try to use AI-powered classifier
    return new AIClassifier(options);
  } catch (error) {
    // Fall back to rule-based classifier
    console.warn(
      'Anthropic SDK not available, using fallback rule-based classifier.',
      error instanceof Error ? error.message : String(error),
    );
    return new FallbackClassifier();
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format classification as context string for system prompts
 */
export function formatClassificationContext(
  classification: IntentClassification,
): string {
  const lines: string[] = [];

  // Intent and complexity
  lines.push(
    `Task: ${classification.type.toUpperCase()} (${classification.complexity})`,
  );

  // Domains
  if (classification.domains.length > 0) {
    lines.push(`Domains: ${classification.domains.join(', ')}`);
  }

  // Key signals
  const activeSignals = Object.entries(classification.signals)
    .filter(([, value]) => value)
    .map(([key]) => key.replace('wants', '').toLowerCase());

  if (activeSignals.length > 0) {
    lines.push(`User wants: ${activeSignals.join(', ')}`);
  }

  // Recommendations
  const rec = classification.recommendation;
  if (rec.agents.length > 0) {
    lines.push(
      `Recommended agents: ${rec.agents.join(', ')} (${rec.modelTier}, ${rec.parallelism})`,
    );
  }

  if (rec.verification) {
    lines.push('Verification: Required');
  }

  // Reasoning
  if (classification.reasoning) {
    lines.push(`Reasoning: ${classification.reasoning}`);
  }

  return lines.join('\n');
}

/**
 * Quick classify utility function
 */
export async function classifyIntent(
  userRequest: string,
  options?: ClassifierOptions,
): Promise<IntentClassification> {
  const classifier = createClassifier(options);
  return classifier.classify(userRequest, options);
}
