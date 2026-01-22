/**
 * Hook domain - Barrel export
 * Exports all hook-related functionality
 */

export {
  // Main functions
  composeHooks,
  toSettingsFormat,

  // Helper functions
  resolveHandlerPath,
  isHooksEmpty,
  mergeComposedHooks,
  createEmptyHooks,
  getHookCount,
  filterHooksBySource,
  removeHooksBySource,
  getHookSources,

  // Types
  type HookSource,
} from './composer.js';
