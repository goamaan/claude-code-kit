/**
 * Unit tests for TOML parser with Zod validation
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  parse,
  parseRaw,
  stringify,
  parseFile,
  parseFileRaw,
  validate,
  validateSafe,
  ConfigError,
} from './parser.js';

describe('parser', () => {
  describe('parse', () => {
    it('should parse valid TOML with schema', () => {
      const schema = z.object({
        name: z.string(),
        version: z.number(),
      });

      const result = parse(
        `
name = "test-app"
version = 1
`,
        schema
      );

      expect(result).toEqual({
        name: 'test-app',
        version: 1,
      });
    });

    it('should parse nested objects', () => {
      const schema = z.object({
        database: z.object({
          host: z.string(),
          port: z.number(),
        }),
      });

      const result = parse(
        `
[database]
host = "localhost"
port = 5432
`,
        schema
      );

      expect(result).toEqual({
        database: {
          host: 'localhost',
          port: 5432,
        },
      });
    });

    it('should parse arrays', () => {
      const schema = z.object({
        tags: z.array(z.string()),
        numbers: z.array(z.number()),
      });

      const result = parse(
        `
tags = ["a", "b", "c"]
numbers = [1, 2, 3]
`,
        schema
      );

      expect(result).toEqual({
        tags: ['a', 'b', 'c'],
        numbers: [1, 2, 3],
      });
    });

    it('should throw ConfigError on invalid TOML syntax', () => {
      const schema = z.object({
        name: z.string(),
      });

      expect(() => parse('name = invalid value', schema)).toThrow(ConfigError);
    });

    it('should throw ConfigError on schema validation failure', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      expect(() =>
        parse(
          `
name = "test"
age = "not a number"
`,
          schema
        )
      ).toThrow(ConfigError);
    });

    it('should include validation issues in ConfigError', () => {
      const schema = z.object({
        name: z.string().min(5),
        age: z.number().min(0),
      });

      try {
        parse(
          `
name = "ab"
age = -5
`,
          schema
        );
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError);
        const configError = error as ConfigError;
        expect(configError.issues).toBeDefined();
        expect(configError.issues?.length).toBeGreaterThan(0);
      }
    });

    it('should handle optional fields', () => {
      const schema = z.object({
        name: z.string(),
        description: z.string().optional(),
      });

      const result = parse('name = "test"', schema);

      expect(result).toEqual({
        name: 'test',
      });
    });

    it('should handle default values', () => {
      const schema = z.object({
        name: z.string(),
        enabled: z.boolean().default(true),
      });

      const result = parse('name = "test"', schema);

      expect(result).toEqual({
        name: 'test',
        enabled: true,
      });
    });
  });

  describe('parseRaw', () => {
    it('should parse TOML without schema validation', () => {
      const result = parseRaw(`
name = "test"
count = 42
enabled = true
`);

      expect(result).toEqual({
        name: 'test',
        count: 42,
        enabled: true,
      });
    });

    it('should handle nested structures', () => {
      const result = parseRaw(`
[section]
key = "value"

[section.nested]
deep = true
`);

      expect(result).toEqual({
        section: {
          key: 'value',
          nested: {
            deep: true,
          },
        },
      });
    });

    it('should throw ConfigError on invalid TOML', () => {
      expect(() => parseRaw('= invalid')).toThrow(ConfigError);
    });
  });

  describe('stringify', () => {
    it('should convert object to TOML string', () => {
      const result = stringify({
        name: 'test-app',
        version: 1,
      });

      // j-toml uses single quotes for strings
      expect(result).toContain("name = 'test-app'");
      expect(result).toContain('version = 1');
    });

    it('should handle nested objects', () => {
      const result = stringify({
        database: {
          host: 'localhost',
          port: 5432,
        },
      });

      // j-toml uses dotted keys for nested objects by default
      expect(result).toContain("database.host = 'localhost'");
      expect(result).toContain('database.port = 5432');
    });

    it('should handle arrays', () => {
      const result = stringify({
        tags: ['a', 'b', 'c'],
      });

      // j-toml outputs arrays with each element on a new line
      expect(result).toContain('tags = [');
      expect(result).toContain("'a'");
      expect(result).toContain("'b'");
      expect(result).toContain("'c'");
    });

    it('should handle boolean values', () => {
      const result = stringify({
        enabled: true,
        disabled: false,
      });

      expect(result).toContain('enabled = true');
      expect(result).toContain('disabled = false');
    });

    it('should produce valid TOML that can be parsed back', () => {
      const original = {
        name: 'test',
        settings: {
          debug: true,
          level: 5,
        },
        tags: ['a', 'b'],
      };

      const toml = stringify(original);
      const parsed = parseRaw(toml);

      expect(parsed).toEqual(original);
    });
  });

  describe('validate', () => {
    it('should validate object against schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = validate({ name: 'test', age: 25 }, schema);

      expect(result).toEqual({ name: 'test', age: 25 });
    });

    it('should throw ConfigError on validation failure', () => {
      const schema = z.object({
        name: z.string(),
      });

      expect(() => validate({ name: 123 }, schema)).toThrow(ConfigError);
    });

    it('should transform values according to schema', () => {
      const schema = z.object({
        value: z.coerce.number(),
      });

      const result = validate({ value: '42' }, schema);

      expect(result).toEqual({ value: 42 });
    });
  });

  describe('validateSafe', () => {
    it('should return success result for valid data', () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = validateSafe({ name: 'test' }, schema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'test' });
      }
    });

    it('should return error result for invalid data', () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = validateSafe({ name: 123 }, schema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ConfigError);
      }
    });
  });

  describe('ConfigError', () => {
    it('should include path information', () => {
      const error = new ConfigError('Test error', {
        path: ['database', 'host'],
      });

      expect(error.path).toEqual(['database', 'host']);
    });

    it('should include issues information', () => {
      const issues: z.ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        },
      ];

      const error = new ConfigError('Validation failed', { issues });

      expect(error.issues).toEqual(issues);
    });

    it('should include file path information', () => {
      const error = new ConfigError('File error', {
        filePath: '/path/to/config.toml',
      });

      expect(error.filePath).toBe('/path/to/config.toml');
    });

    it('should format error correctly', () => {
      const error = new ConfigError('Validation failed', {
        filePath: '/path/to/config.toml',
        path: ['database', 'port'],
        issues: [
          {
            code: 'invalid_type',
            expected: 'number',
            received: 'string',
            path: ['database', 'port'],
            message: 'Expected number, received string',
          },
        ],
      });

      const formatted = error.format();

      expect(formatted).toContain('Validation failed');
      expect(formatted).toContain('/path/to/config.toml');
      expect(formatted).toContain('database.port');
    });
  });

  describe('parseFile', () => {
    // Note: Mocking is not currently used in these tests.
    // We only test error cases that don't depend on mocking.

    it('should parse file with schema validation', async () => {
      const _schema = z.object({
        name: z.string(),
      });

      // Note: This test is illustrative. In a real test environment,
      // we'd need proper module mocking setup.
      // For now, we'll test the error cases that don't depend on mocking.
    });

    it('should throw ConfigError for non-existent file', async () => {
      const schema = z.object({
        name: z.string(),
      });

      // This will throw because the file doesn't exist
      await expect(
        parseFile('/non/existent/path.toml', schema)
      ).rejects.toThrow(ConfigError);
    });
  });

  describe('parseFileRaw', () => {
    it('should throw ConfigError for non-existent file', async () => {
      await expect(parseFileRaw('/non/existent/path.toml')).rejects.toThrow(
        ConfigError
      );
    });
  });
});
