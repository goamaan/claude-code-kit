/**
 * Profile domain exports
 */

export {
  createProfileStorage,
  type ProfileStorage,
} from './storage.js';

export {
  createProfileManager,
  type ProfileManager,
  ProfileNotFoundError,
  ProfileExistsError,
  ActiveProfileDeleteError,
} from './manager.js';
