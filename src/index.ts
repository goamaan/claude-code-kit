/**
 * claudeops - Batteries-included Claude Code enhancement toolkit
 *
 * @module claudeops
 */

export const VERSION = "3.2.0";

export const NAME = "claudeops";

/**
 * Placeholder for future exports.
 * This file will export core APIs for programmatic usage.
 */

// Core config exports (to be implemented)
// export { loadConfig, resolveConfig } from "./core/config";

// Domain exports (to be implemented)
// export type { Profile, Setup, Addon } from "./types";

// Skill exports
export * from './domain/skill/index.js';

// Hook exports
export * from './domain/hook/index.js';

// Error handling exports
export * from './utils/errors.js';
export * from './utils/error-helpers.js';
