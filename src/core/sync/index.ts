/**
 * Sync core - Barrel export
 * Exports all sync-related functionality
 */

// =============================================================================
// Settings Generator
// =============================================================================

export {
  // Main functions
  generateSettings,
  mergeSettings,
  validateSettings,
  serializeSettings,
  parseSettings,
  createDefaultSettings,
  getApiModelId,

  // Types
  type GeneratedSettings,
  type McpServerSettings,
  type PermissionSettings,
  type FeatureSettings,
  type GenerateSettingsOptions,
} from './settings-generator.js';

// =============================================================================
// CLAUDE.md Generator
// =============================================================================

export {
  // Main functions
  generateClaudeMd,
  extractUserContent,
  hasManagedSection,
  getManagedSection,
  replaceManagedSection,
  createMinimalClaudeMd,
  parseClaudeMdInfo,

  // Types
  type GenerateClaudeMdOptions,
  type GeneratedClaudeMd,
} from './claudemd-generator.js';

// =============================================================================
// Sync Engine
// =============================================================================

export {
  // Main functions
  createSyncEngine,
  isSyncNeeded,
  getSyncSummary,

  // Types
  type SyncEngine,
  type SyncOptions,
  type SyncResult,
  type DiffEntry,
  type ValidationResult,
  type SyncState,
  type SyncEngineOptions,
} from './engine.js';

// =============================================================================
// Backup
// =============================================================================

export {
  // Main functions
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  pruneBackups,
  getLatestBackup,
  getBackupByName,
  getTotalBackupSize,
  isValidBackup,

  // Helpers
  getBackupsDir,
  formatBytes,

  // Types
  type BackupResult,
  type BackupInfo,
  type RestoreResult,
} from './backup.js';
