/**
 * Setup domain module
 * Exports all setup-related functionality
 */

// Manifest Parser
export {
  parseSetupManifest,
  loadSetupManifest,
  validateSetupManifest,
  extractMetadata,
  manifestExists,
  getManifestFilename,
  SetupParseError,
} from './manifest-parser.js';

// Loader
export {
  createSetupLoader,
  listBuiltinSetups,
  isSetupDirectory,
  SetupLoadError,
  type SetupLoader,
} from './loader.js';

// Merger
export {
  mergeSetups,
  createEmptyMergedSetup,
  areMergedSetupsEqual,
  diffMergedSetups,
  SetupMergeError,
  type MergeOptions,
  type SetupDiff,
} from './merger.js';

// Manager
export {
  createSetupManager,
  SetupManagerError,
  type SetupManager,
} from './manager.js';
