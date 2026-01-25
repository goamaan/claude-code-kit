/**
 * claudeops - Batteries-included Claude Code enhancement toolkit
 *
 * @module claudeops
 */

export const VERSION = "0.1.0";

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

// Pack exports
export * from './domain/pack/index.js';

// Skill exports
export * from './domain/skill/index.js';

// State exports
export * from './domain/state/index.js';
