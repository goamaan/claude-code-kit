/**
 * Scanner module - Deterministic codebase analysis
 * Scans a directory and returns structured data about the codebase
 */

import { resolve } from 'node:path';
import type { ScanResult, ScanOptions } from './types.js';
import {
  detectLanguages,
  detectFrameworks,
  detectBuild,
  detectTesting,
  detectLinting,
  detectCI,
  detectDatabase,
  detectAPI,
  detectMonorepo,
  detectDirectories,
  detectExistingConfig,
  detectKeyFiles,
} from './detectors.js';

export type { ScanResult, ScanOptions } from './types.js';

/**
 * Perform a full codebase scan
 *
 * @param options - Scan options
 * @returns Structured scan result with all detected signals
 */
export async function scan(options?: ScanOptions): Promise<ScanResult> {
  const root = resolve(options?.path ?? process.cwd());

  return {
    root,
    languages: detectLanguages(root),
    frameworks: detectFrameworks(root),
    build: detectBuild(root),
    testing: detectTesting(root),
    linting: detectLinting(root),
    ci: detectCI(root),
    database: detectDatabase(root),
    api: detectAPI(root),
    monorepo: detectMonorepo(root),
    directories: detectDirectories(root),
    existingConfig: detectExistingConfig(root),
    keyFiles: detectKeyFiles(root),
  };
}
