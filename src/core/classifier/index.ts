/**
 * Intent Classifier Module - Barrel export
 * Exports all classifier functionality
 */

// Types
export type {
  IntentType,
  Complexity,
  Domain,
  UserSignals,
  AgentRecommendation,
  IntentClassification,
} from './types.js';

// Prompts
export {
  CLASSIFICATION_SYSTEM_PROMPT,
  CLASSIFICATION_USER_PROMPT,
  FORMATTING_PROMPT,
} from './prompts.js';

// Classifier
export {
  ClassificationError,
  createClassifier,
  formatClassificationContext,
  classifyIntent,
  type IntentClassifier,
  type ClassifierOptions,
} from './classifier.js';
