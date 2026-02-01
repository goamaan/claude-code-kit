/**
 * Tests for Convention Detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { detectConventions } from './conventions.js';
import type { ScanResult } from './types.js';

const testDir = join(process.cwd(), '.test-conventions');

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    root: testDir,
    languages: [{ name: 'TypeScript', extensions: ['.ts'], fileCount: 10 }],
    frameworks: [],
    build: null,
    testing: [{ framework: 'vitest', testDirs: ['src'] }],
    linting: [],
    ci: [],
    database: [],
    api: [],
    monorepo: null,
    directories: ['src'],
    existingConfig: {
      hasClaudeDir: false,
      hasClaudeMd: false,
      hasSettings: false,
      hasSkills: false,
      skillNames: [],
    },
    keyFiles: [],
    ...overrides,
  };
}

describe('detectConventions', () => {
  beforeEach(() => {
    mkdirSync(join(testDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('import style', () => {
    it('should detect barrel imports when index.ts files exist', () => {
      writeFileSync(
        join(testDir, 'src', 'index.ts'),
        'export { Foo } from "./foo.js";\nexport { Bar } from "./bar.js";\n'
      );
      writeFileSync(
        join(testDir, 'src', 'foo.ts'),
        'import { Bar } from "./index.js";\nexport const Foo = 1;\n'
      );
      writeFileSync(
        join(testDir, 'src', 'bar.ts'),
        'import { Foo } from "./index.js";\nexport const Bar = 2;\n'
      );

      const conventions = detectConventions(makeScanResult());
      // With barrel imports present, should be barrel or mixed
      expect(['barrel', 'mixed']).toContain(conventions.imports.style);
    });

    it('should detect direct imports when no barrels exist', () => {
      writeFileSync(
        join(testDir, 'src', 'foo.ts'),
        'import { readFile } from "fs/promises";\nconst x = 1;\n'
      );
      writeFileSync(
        join(testDir, 'src', 'bar.ts'),
        'import { join } from "path";\nconst y = 2;\n'
      );

      const conventions = detectConventions(makeScanResult());
      expect(conventions.imports.style).toBe('direct');
    });
  });

  describe('test location', () => {
    it('should detect colocated tests in src/', () => {
      writeFileSync(join(testDir, 'src', 'foo.ts'), 'export const Foo = 1;\n');
      writeFileSync(join(testDir, 'src', 'foo.test.ts'), 'test("foo", () => {});\n');

      const conventions = detectConventions(makeScanResult());
      expect(conventions.tests.location).toBe('colocated');
    });

    it('should detect separate test directory', () => {
      mkdirSync(join(testDir, 'tests'), { recursive: true });
      writeFileSync(join(testDir, 'src', 'foo.ts'), 'export const Foo = 1;\n');
      writeFileSync(join(testDir, 'tests', 'foo.test.ts'), 'test("foo", () => {});\n');

      const conventions = detectConventions(makeScanResult());
      expect(['separate', 'mixed']).toContain(conventions.tests.location);
    });

    it('should use correct pattern for Python', () => {
      const conventions = detectConventions(makeScanResult({
        languages: [{ name: 'Python', extensions: ['.py'], fileCount: 10 }],
        testing: [{ framework: 'pytest', testDirs: ['tests'] }],
      }));
      expect(conventions.tests.pattern).toBe('test_*.py');
    });

    it('should use correct pattern for Go', () => {
      const conventions = detectConventions(makeScanResult({
        languages: [{ name: 'Go', extensions: ['.go'], fileCount: 10 }],
        testing: [],
      }));
      expect(conventions.tests.pattern).toBe('*_test.go');
    });
  });

  describe('export style', () => {
    it('should detect named exports', () => {
      writeFileSync(
        join(testDir, 'src', 'foo.ts'),
        'export function foo() {}\nexport const bar = 1;\nexport class Baz {}\n'
      );

      const conventions = detectConventions(makeScanResult());
      expect(conventions.exports.style).toBe('named');
    });

    it('should detect default exports', () => {
      writeFileSync(
        join(testDir, 'src', 'foo.ts'),
        'export default function foo() {}\n'
      );
      writeFileSync(
        join(testDir, 'src', 'bar.ts'),
        'export default class Bar {}\n'
      );

      const conventions = detectConventions(makeScanResult());
      expect(conventions.exports.style).toBe('default');
    });
  });

  describe('file naming', () => {
    it('should detect kebab-case naming', () => {
      writeFileSync(join(testDir, 'src', 'my-component.ts'), 'export const x = 1;\n');
      writeFileSync(join(testDir, 'src', 'another-file.ts'), 'export const y = 2;\n');
      writeFileSync(join(testDir, 'src', 'third-module.ts'), 'export const z = 3;\n');

      const conventions = detectConventions(makeScanResult());
      expect(conventions.naming.files).toBe('kebab-case');
    });

    it('should detect PascalCase naming', () => {
      writeFileSync(join(testDir, 'src', 'MyComponent.ts'), 'export const x = 1;\n');
      writeFileSync(join(testDir, 'src', 'AnotherFile.ts'), 'export const y = 2;\n');
      writeFileSync(join(testDir, 'src', 'ThirdModule.ts'), 'export const z = 3;\n');

      const conventions = detectConventions(makeScanResult());
      expect(conventions.naming.files).toBe('PascalCase');
    });

    it('should detect snake_case naming', () => {
      writeFileSync(join(testDir, 'src', 'my_component.ts'), 'export const x = 1;\n');
      writeFileSync(join(testDir, 'src', 'another_file.ts'), 'export const y = 2;\n');
      writeFileSync(join(testDir, 'src', 'third_module.ts'), 'export const z = 3;\n');

      const conventions = detectConventions(makeScanResult());
      expect(conventions.naming.files).toBe('snake_case');
    });
  });
});
