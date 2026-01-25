/**
 * Skill Domain Module
 * Exports skill management functionality
 */

export type {
  Skill,
  SkillMetadata,
  SkillMatch,
  SkillSourceType,
  SkillManagerOptions,
  FormattedSkillContext,
} from './types.js';

export { SkillManager, createSkillManager } from './skill-manager.js';
