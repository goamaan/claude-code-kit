/**
 * Generator Module
 * AI-powered skill and hook generation
 */

export type {
  GenerationOptions,
  SkillGenerationRequest,
  HookGenerationRequest,
  GeneratedSkill,
  GeneratedHook,
  ClaudeCliOptions,
  ClaudeCliResult,
} from './types.js';

export { GeneratorError } from './types.js';

export {
  isClaudeCliAvailable,
  isAnthropicApiAvailable,
  invokeClaudeCli,
  generateSkill,
  generateHook,
  generateSkillTemplate,
  generateHookTemplate,
} from './claude-cli.js';

export { buildSkillPrompt, buildHookPrompt, fetchReferenceContent } from './prompts.js';
