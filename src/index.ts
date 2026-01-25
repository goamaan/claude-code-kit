/**
 * claudeops - Batteries-included Claude Code enhancement toolkit
 *
 * @module claudeops
 */

export const VERSION = "3.1.0";

export const NAME = "claudeops";

/**
 * Placeholder for future exports.
 * This file will export core APIs for programmatic usage.
 */

// Core config exports (to be implemented)
// export { loadConfig, resolveConfig } from "./core/config";

// Domain exports (to be implemented)
// export type { Profile, Setup, Addon } from "./types";

// Classifier exports
export * from './core/classifier/index.js';

// Guardrails exports
export * from './core/guardrails/index.js';

// Router exports
export * from './core/router/index.js';

// Skill exports
export * from './domain/skill/index.js';

// Generator exports
export * from './domain/generator/index.js';

// Hook exports
export * from './domain/hook/index.js';

// State exports
export * from './domain/state/index.js';

// Error handling exports
export * from './utils/errors.js';
export * from './utils/error-helpers.js';
