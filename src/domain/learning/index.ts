/**
 * Learning Domain Module
 * Exports learning management functionality
 */

export type {
  Learning,
  LearningFile,
  LearningSchema,
  LearningCategory,
  ResolutionType,
  LearningManagerOptions,
} from './types.js';

export {
  LearningManager,
  createLearningManager,
  parseLearningFile,
  formatLearning,
} from './manager.js';
