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

// Installer exports
export type {
  SkillSource,
  DiscoveredSkill,
  InstalledSkill,
  SkillLockFile,
} from './installer.js';

export {
  parseSource,
  discoverSkills,
  installFromSource,
  removeSkill,
  listInstalledSkills,
  readLockFile,
  writeLockFile,
} from './installer.js';
