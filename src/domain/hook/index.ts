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

// Hook Manager exports
export type {
  Hook,
  HookMetadata,
  HookSourceType,
  HookManagerOptions,
  HookSyncResult,
} from './types.js';

export { HookManager, createHookManager } from './hook-manager.js';
