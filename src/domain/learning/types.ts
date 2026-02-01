/**
 * Learning System Types
 * Types for automated knowledge capture and retrieval
 */

// =============================================================================
// Learning Categories
// =============================================================================

export type LearningCategory =
  | 'build-error'
  | 'test-failure'
  | 'type-error'
  | 'runtime-error'
  | 'config-issue'
  | 'pattern'
  | 'workaround'
  | 'convention';

export type ResolutionType =
  | 'code-fix'
  | 'config-change'
  | 'dependency-update'
  | 'workaround'
  | 'refactor'
  | 'documentation';

// =============================================================================
// Learning
// =============================================================================

export interface Learning {
  /** ISO date string */
  date: string;
  /** Category of the learning */
  category: LearningCategory;
  /** Component/area this relates to (e.g., 'typescript', 'vitest') */
  component: string;
  /** Symptoms that triggered this learning */
  symptoms: string[];
  /** Root cause identifier */
  rootCause: string;
  /** How it was resolved */
  resolution: ResolutionType;
  /** Searchable tags */
  tags: string[];
  /** Confidence score 0-1 */
  confidence: number;
  /** The problem description */
  problem: string;
  /** The solution that worked */
  solution: string;
  /** Why this was the root cause */
  why: string;
}

// =============================================================================
// Learning Schema (project-level)
// =============================================================================

export interface LearningSchema {
  version: 1;
  generatedFrom: 'scanner' | 'manual';
  categories: LearningCategory[];
  components: string[];
  rootCauses: string[];
  resolutionTypes: ResolutionType[];
}

// =============================================================================
// Learning File
// =============================================================================

export interface LearningFile {
  /** File name (without path) */
  fileName: string;
  /** Full path to the file */
  filePath: string;
  /** Parsed learning data */
  learning: Learning;
}

// =============================================================================
// Learning Manager Options
// =============================================================================

export interface LearningManagerOptions {
  /** Directory where learnings are stored */
  learningsDir: string;
}
