/**
 * Model Router
 * Maps complexity and intent to appropriate model tiers
 */

import type { Complexity, IntentType } from '../classifier/types.js';
import type { ModelTier } from './types.js';

// =============================================================================
// Complexity to Model Mapping
// =============================================================================

/**
 * Base model tier mapping by complexity
 */
const COMPLEXITY_MODEL_MAP: Record<Complexity, ModelTier> = {
  trivial: 'haiku',
  simple: 'haiku',
  moderate: 'sonnet',
  complex: 'opus',
  architectural: 'opus',
};

/**
 * Intent types that always require opus (overrides complexity)
 */
const OPUS_REQUIRED_INTENTS: Set<IntentType> = new Set([
  'planning',
  'review',
  'debugging',
]);

/**
 * Intent types that benefit from sonnet minimum
 */
const SONNET_MIN_INTENTS: Set<IntentType> = new Set([
  'implementation',
  'refactoring',
]);

// =============================================================================
// Model Selection Functions
// =============================================================================

/**
 * Select primary model tier based on complexity and intent
 */
export function selectModelTier(
  complexity: Complexity,
  intent: IntentType,
): ModelTier {
  // Override: Some intents always need opus
  if (OPUS_REQUIRED_INTENTS.has(intent)) {
    return 'opus';
  }

  // Get base model from complexity
  const baseModel = COMPLEXITY_MODEL_MAP[complexity];

  // Upgrade to sonnet minimum for certain intents
  if (SONNET_MIN_INTENTS.has(intent) && baseModel === 'haiku') {
    return 'sonnet';
  }

  return baseModel;
}

/**
 * Upgrade model tier if needed based on additional signals
 */
export function upgradeModelIfNeeded(
  baseModel: ModelTier,
  options: {
    wantsThorough?: boolean;
    multiDomain?: boolean;
    requiresVerification?: boolean;
  },
): ModelTier {
  const { wantsThorough, multiDomain, requiresVerification } = options;

  // If already opus, can't upgrade further
  if (baseModel === 'opus') {
    return 'opus';
  }

  // Upgrade to opus if user wants thorough work
  if (wantsThorough) {
    return 'opus';
  }

  // Upgrade to sonnet for multi-domain work
  if (multiDomain && baseModel === 'haiku') {
    return 'sonnet';
  }

  // Upgrade to sonnet if verification is required
  if (requiresVerification && baseModel === 'haiku') {
    return 'sonnet';
  }

  return baseModel;
}

/**
 * Downgrade model tier for speed optimization
 */
export function downgradeModelForSpeed(
  baseModel: ModelTier,
  wantsSpeed: boolean,
): ModelTier {
  if (!wantsSpeed) {
    return baseModel;
  }

  // Downgrade opus to sonnet for speed
  if (baseModel === 'opus') {
    return 'sonnet';
  }

  // Downgrade sonnet to haiku for speed
  if (baseModel === 'sonnet') {
    return 'haiku';
  }

  return baseModel;
}

/**
 * Get recommended model tier with all considerations
 */
export function getRecommendedModel(
  complexity: Complexity,
  intent: IntentType,
  options: {
    wantsSpeed?: boolean;
    wantsThorough?: boolean;
    multiDomain?: boolean;
    requiresVerification?: boolean;
  } = {},
): ModelTier {
  // Get base model
  let model = selectModelTier(complexity, intent);

  // Apply upgrades first
  model = upgradeModelIfNeeded(model, {
    wantsThorough: options.wantsThorough,
    multiDomain: options.multiDomain,
    requiresVerification: options.requiresVerification,
  });

  // Apply speed downgrade last (only if user explicitly wants speed)
  if (options.wantsSpeed) {
    model = downgradeModelForSpeed(model, true);
  }

  return model;
}

/**
 * Get model tier reasoning explanation
 */
export function explainModelSelection(
  complexity: Complexity,
  intent: IntentType,
  finalModel: ModelTier,
): string {
  const baseModel = COMPLEXITY_MODEL_MAP[complexity];

  const reasons: string[] = [];

  // Base complexity
  reasons.push(`Base: ${baseModel} (complexity: ${complexity})`);

  // Intent overrides
  if (OPUS_REQUIRED_INTENTS.has(intent)) {
    reasons.push(`Upgraded to opus (${intent} requires deep analysis)`);
  } else if (SONNET_MIN_INTENTS.has(intent) && baseModel === 'haiku') {
    reasons.push(`Upgraded to sonnet (${intent} requires more capability)`);
  }

  // Final selection
  if (finalModel !== baseModel) {
    reasons.push(`Final: ${finalModel}`);
  }

  return reasons.join(' → ');
}
