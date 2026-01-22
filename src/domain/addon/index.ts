/**
 * Addon Module - Re-exports all addon functionality
 */

// Manifest parsing
export {
  parseAddonManifest,
  loadAddonManifest,
  validateAddonManifest,
  validateManifestSafe,
  checkCompatibility,
  ManifestParseError,
  ManifestValidationError,
} from './manifest-parser.js';

// Installer
export {
  createAddonInstaller,
  getAddonsDir,
  getStateFilePath,
  AddonInstallError,
  type AddonInstaller,
} from './installer.js';

// Registry
export {
  createAddonRegistry,
  createCompositeRegistry,
  createLocalRegistry,
  RegistryError,
  type AddonRegistry,
} from './registry.js';

// Manager
export {
  createAddonManager,
  listInstalledAddons,
  listEnabledAddons,
  AddonManagerError,
  type AddonManager,
  type AddonInstallSource,
} from './manager.js';
