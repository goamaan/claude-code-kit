/**
 * Shared test utilities
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Create a temporary directory for tests
 * Returns the path to the temp directory
 */
export async function createTempDir(prefix: string = 'test-'): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

/**
 * Remove a directory and all its contents
 */
export async function removeTempDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

/**
 * Create a file in a directory, ensuring parent directories exist
 */
export async function createFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

/**
 * Create a JSON file
 */
export async function createJsonFile(filePath: string, data: unknown): Promise<void> {
  await createFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Read a JSON file
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a directory structure from an object
 * Keys are paths, values are file contents (string) or nested objects (directories)
 *
 * @example
 * await createDirStructure(baseDir, {
 *   'file.txt': 'content',
 *   'dir1': {
 *     'nested.txt': 'nested content'
 *   }
 * });
 */
export async function createDirStructure(
  baseDir: string,
  structure: Record<string, string | Record<string, unknown>>
): Promise<void> {
  for (const [name, value] of Object.entries(structure)) {
    const fullPath = path.join(baseDir, name);
    if (typeof value === 'string') {
      await createFile(fullPath, value);
    } else {
      await fs.mkdir(fullPath, { recursive: true });
      await createDirStructure(fullPath, value as Record<string, string | Record<string, unknown>>);
    }
  }
}
