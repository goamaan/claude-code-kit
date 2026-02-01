/**
 * Convention Detection
 * Analyzes source files to detect project conventions:
 * imports, tests, exports, naming, and component styles
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import type { ScanResult } from './types.js';

// =============================================================================
// Types
// =============================================================================

export interface ProjectConventions {
  imports: {
    style: 'barrel' | 'direct' | 'mixed';
    barrelFiles?: string[];
  };
  tests: {
    location: 'colocated' | 'separate' | 'mixed';
    directory?: string;
    pattern: string;
  };
  exports: {
    style: 'named' | 'default' | 'mixed';
  };
  naming: {
    files: 'kebab-case' | 'camelCase' | 'PascalCase' | 'snake_case' | 'mixed';
  };
}

// =============================================================================
// Helpers
// =============================================================================

function listSourceFiles(dir: string, maxDepth: number, depth = 0): string[] {
  if (depth > maxDepth || !existsSync(dir)) return [];

  const files: string[] = [];
  const skip = new Set([
    'node_modules', '.git', 'dist', 'build', 'target', '.next',
    '__pycache__', 'vendor', '.venv', 'venv', 'coverage',
  ]);

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (skip.has(entry) || entry.startsWith('.')) continue;
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          files.push(...listSourceFiles(fullPath, maxDepth, depth + 1));
        } else {
          const ext = extname(entry);
          if (['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go'].includes(ext)) {
            files.push(fullPath);
          }
        }
      } catch {
        // Skip inaccessible
      }
    }
  } catch {
    // Skip unreadable dirs
  }

  return files;
}

function readFileSafe(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

// =============================================================================
// Convention Detectors
// =============================================================================

/**
 * Detect import style: barrel (index.ts re-exports) vs direct
 */
function detectImportStyle(
  root: string,
  sourceFiles: string[],
): ProjectConventions['imports'] {
  const barrelFiles: string[] = [];

  // Look for index.ts/index.js files that re-export
  for (const file of sourceFiles) {
    const name = basename(file);
    if (name === 'index.ts' || name === 'index.js') {
      const content = readFileSafe(file);
      if (content && /export\s+/.test(content)) {
        const relativePath = file.replace(root + '/', '');
        barrelFiles.push(relativePath);
      }
    }
  }

  // Sample imports from source files (up to 30)
  const sampled = sourceFiles.filter(f => !basename(f).startsWith('index.')).slice(0, 30);
  let barrelImports = 0;
  let directImports = 0;

  for (const file of sampled) {
    const content = readFileSafe(file);
    if (!content) continue;

    const importLines = content.match(/^(?:import|from)\s+.*$/gm) || [];
    for (const line of importLines) {
      if (/\/index['"]|\/index\.(?:ts|js)['"]/.test(line) || /from\s+['"][^'"]+\/['"]/.test(line)) {
        barrelImports++;
      } else if (/from\s+['"]/.test(line)) {
        directImports++;
      }
    }
  }

  const total = barrelImports + directImports;
  if (total === 0) return { style: 'direct' };

  const barrelRatio = barrelImports / total;
  if (barrelRatio > 0.5) return { style: 'barrel', barrelFiles };
  if (barrelRatio > 0.1 && barrelFiles.length > 0) return { style: 'mixed', barrelFiles };
  return { style: 'direct' };
}

/**
 * Detect test file location pattern
 */
function detectTestLocation(
  root: string,
  scanResult: ScanResult,
): ProjectConventions['tests'] {
  const hasTestDir = existsSync(join(root, 'tests')) || existsSync(join(root, 'test'));
  const hasTestsInSrc = existsSync(join(root, 'src'));

  // Check for colocated test files in src
  let colocatedCount = 0;
  let separateCount = 0;

  if (hasTestsInSrc) {
    const srcFiles = listSourceFiles(join(root, 'src'), 3);
    colocatedCount = srcFiles.filter(f => {
      const name = basename(f);
      return name.includes('.test.') || name.includes('.spec.') || name.includes('_test.');
    }).length;
  }

  if (hasTestDir) {
    const testDir = existsSync(join(root, 'tests')) ? 'tests' : 'test';
    const testFiles = listSourceFiles(join(root, testDir), 3);
    separateCount = testFiles.length;
  }

  // Detect test file pattern
  let pattern = '*.test.ts';
  const testFramework = scanResult.testing[0]?.framework || '';
  const primaryLang = scanResult.languages[0]?.name || '';

  if (primaryLang === 'Python') {
    pattern = 'test_*.py';
  } else if (primaryLang === 'Go') {
    pattern = '*_test.go';
  } else if (primaryLang === 'Rust') {
    pattern = 'mod tests (inline)';
  } else if (testFramework === 'jest' || testFramework === 'vitest') {
    pattern = '*.test.ts';
  }

  if (colocatedCount > 0 && separateCount > 0) {
    return { location: 'mixed', directory: hasTestDir ? (existsSync(join(root, 'tests')) ? 'tests' : 'test') : undefined, pattern };
  }
  if (colocatedCount > 0) {
    return { location: 'colocated', pattern };
  }
  if (separateCount > 0) {
    return { location: 'separate', directory: existsSync(join(root, 'tests')) ? 'tests' : 'test', pattern };
  }

  return { location: 'colocated', pattern };
}

/**
 * Detect export style: named vs default
 */
function detectExportStyle(sourceFiles: string[]): ProjectConventions['exports'] {
  let namedCount = 0;
  let defaultCount = 0;

  const sampled = sourceFiles.filter(f => !basename(f).startsWith('index.')).slice(0, 30);

  for (const file of sampled) {
    const content = readFileSafe(file);
    if (!content) continue;

    const namedExports = (content.match(/^export\s+(?:function|const|class|interface|type|enum)\s/gm) || []).length;
    const defaultExports = (content.match(/^export\s+default\s/gm) || []).length;

    namedCount += namedExports;
    defaultCount += defaultExports;
  }

  const total = namedCount + defaultCount;
  if (total === 0) return { style: 'named' };

  const namedRatio = namedCount / total;
  if (namedRatio > 0.7) return { style: 'named' };
  if (namedRatio < 0.3) return { style: 'default' };
  return { style: 'mixed' };
}

/**
 * Detect file naming convention
 */
function detectFileNaming(sourceFiles: string[]): ProjectConventions['naming'] {
  const patterns = { kebab: 0, camel: 0, pascal: 0, snake: 0 };

  for (const file of sourceFiles.slice(0, 50)) {
    const name = basename(file).replace(/\.[^.]+$/, ''); // Remove extension
    if (name === 'index' || name.startsWith('_')) continue;

    if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(name)) {
      patterns.kebab++;
    } else if (/^[a-z][a-zA-Z0-9]*$/.test(name) && /[A-Z]/.test(name)) {
      patterns.camel++;
    } else if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      patterns.pascal++;
    } else if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(name)) {
      patterns.snake++;
    }
  }

  const max = Math.max(patterns.kebab, patterns.camel, patterns.pascal, patterns.snake);
  const total = patterns.kebab + patterns.camel + patterns.pascal + patterns.snake;

  if (total === 0) return { files: 'kebab-case' };
  if (max / total < 0.5) return { files: 'mixed' };

  if (max === patterns.kebab) return { files: 'kebab-case' };
  if (max === patterns.camel) return { files: 'camelCase' };
  if (max === patterns.pascal) return { files: 'PascalCase' };
  return { files: 'snake_case' };
}

// =============================================================================
// Main Detection Function
// =============================================================================

/**
 * Detect project conventions by sampling source files
 */
export function detectConventions(scanResult: ScanResult): ProjectConventions {
  const root = scanResult.root;
  const sourceFiles = listSourceFiles(root, 4);

  return {
    imports: detectImportStyle(root, sourceFiles),
    tests: detectTestLocation(root, scanResult),
    exports: detectExportStyle(sourceFiles),
    naming: detectFileNaming(sourceFiles),
  };
}
