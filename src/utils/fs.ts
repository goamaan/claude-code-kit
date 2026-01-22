/**
 * Filesystem utilities for claude-code-kit
 * Provides async wrappers around Node.js fs operations
 */

/// <reference types="node" />

import * as fs from 'node:fs/promises';
import {
  existsSync as nodeExistsSync,
  createReadStream,
  createWriteStream,
  type Stats,
  type Dirent,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { resolvePath } from './paths.js';

/**
 * Read a file as a string
 * @param path - File path (supports ~ expansion)
 * @returns File contents as string
 * @throws Error if file doesn't exist or can't be read
 */
export async function readFile(path: string): Promise<string> {
  const resolved = resolvePath(path);
  return fs.readFile(resolved, 'utf-8');
}

/**
 * Read a file as a string, returning undefined if it doesn't exist
 * @param path - File path (supports ~ expansion)
 * @returns File contents as string, or undefined if not found
 */
export async function readFileSafe(path: string): Promise<string | undefined> {
  try {
    return await readFile(path);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

/**
 * Write a file with content
 * Creates parent directories if they don't exist
 * @param path - File path (supports ~ expansion)
 * @param content - Content to write
 */
export async function writeFile(path: string, content: string): Promise<void> {
  const resolved = resolvePath(path);
  const dir = dirname(resolved);

  // Ensure parent directory exists
  await mkdir(dir, { recursive: true });
  await fs.writeFile(resolved, content, 'utf-8');
}

/**
 * Check if a file or directory exists
 * @param path - Path to check (supports ~ expansion)
 * @returns Whether the path exists
 */
export async function exists(path: string): Promise<boolean> {
  const resolved = resolvePath(path);
  try {
    await fs.access(resolved);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file or directory exists (synchronous)
 * @param path - Path to check (supports ~ expansion)
 * @returns Whether the path exists
 */
export function existsSync(path: string): boolean {
  const resolved = resolvePath(path);
  return nodeExistsSync(resolved);
}

/**
 * Create a directory
 * @param path - Directory path (supports ~ expansion)
 * @param options - Options for mkdir
 */
export async function mkdir(
  path: string,
  options?: { recursive?: boolean }
): Promise<void> {
  const resolved = resolvePath(path);
  await fs.mkdir(resolved, { recursive: options?.recursive ?? false });
}

/**
 * Read directory contents
 * @param path - Directory path (supports ~ expansion)
 * @returns Array of file/directory names
 */
export async function readDir(path: string): Promise<string[]> {
  const resolved = resolvePath(path);
  return fs.readdir(resolved);
}

/**
 * Read directory with file types
 * @param path - Directory path (supports ~ expansion)
 * @returns Array of directory entries with file type info
 */
export async function readDirWithTypes(
  path: string
): Promise<Dirent[]> {
  const resolved = resolvePath(path);
  return fs.readdir(resolved, { withFileTypes: true });
}

/**
 * Remove a file or directory
 * @param path - Path to remove (supports ~ expansion)
 * @param options - Options for removal
 */
export async function remove(
  path: string,
  options?: { recursive?: boolean }
): Promise<void> {
  const resolved = resolvePath(path);
  await fs.rm(resolved, {
    recursive: options?.recursive ?? false,
    force: true,
  });
}

/**
 * Copy a file
 * @param src - Source path (supports ~ expansion)
 * @param dest - Destination path (supports ~ expansion)
 */
export async function copy(src: string, dest: string): Promise<void> {
  const resolvedSrc = resolvePath(src);
  const resolvedDest = resolvePath(dest);

  // Ensure destination directory exists
  const destDir = dirname(resolvedDest);
  await mkdir(destDir, { recursive: true });

  await fs.copyFile(resolvedSrc, resolvedDest);
}

/**
 * Copy a directory recursively
 * @param src - Source directory path (supports ~ expansion)
 * @param dest - Destination directory path (supports ~ expansion)
 */
export async function copyDir(src: string, dest: string): Promise<void> {
  const resolvedSrc = resolvePath(src);
  const resolvedDest = resolvePath(dest);

  await mkdir(resolvedDest, { recursive: true });

  const entries = await readDirWithTypes(resolvedSrc);

  for (const entry of entries) {
    const srcPath = join(resolvedSrc, entry.name);
    const destPath = join(resolvedDest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copy(srcPath, destPath);
    }
  }
}

/**
 * Move/rename a file or directory
 * @param src - Source path (supports ~ expansion)
 * @param dest - Destination path (supports ~ expansion)
 */
export async function move(src: string, dest: string): Promise<void> {
  const resolvedSrc = resolvePath(src);
  const resolvedDest = resolvePath(dest);

  // Ensure destination directory exists
  const destDir = dirname(resolvedDest);
  await mkdir(destDir, { recursive: true });

  await fs.rename(resolvedSrc, resolvedDest);
}

/**
 * Get file/directory stats
 * @param path - Path to stat (supports ~ expansion)
 * @returns File stats
 */
export async function stat(path: string): Promise<Stats> {
  const resolved = resolvePath(path);
  return fs.stat(resolved);
}

/**
 * Get file/directory stats, returning undefined if not found
 * @param path - Path to stat (supports ~ expansion)
 * @returns File stats or undefined
 */
export async function statSafe(path: string): Promise<Stats | undefined> {
  try {
    return await stat(path);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

/**
 * Check if path is a file
 * @param path - Path to check (supports ~ expansion)
 * @returns Whether path is a file
 */
export async function isFile(path: string): Promise<boolean> {
  const stats = await statSafe(path);
  return stats?.isFile() ?? false;
}

/**
 * Check if path is a directory
 * @param path - Path to check (supports ~ expansion)
 * @returns Whether path is a directory
 */
export async function isDirectory(path: string): Promise<boolean> {
  const stats = await statSafe(path);
  return stats?.isDirectory() ?? false;
}

/**
 * Read a JSON file
 * @param path - File path (supports ~ expansion)
 * @returns Parsed JSON content
 */
export async function readJson<T = unknown>(path: string): Promise<T> {
  const content = await readFile(path);
  return JSON.parse(content) as T;
}

/**
 * Read a JSON file, returning undefined if not found
 * @param path - File path (supports ~ expansion)
 * @returns Parsed JSON content or undefined
 */
export async function readJsonSafe<T = unknown>(
  path: string
): Promise<T | undefined> {
  const content = await readFileSafe(path);
  if (content === undefined) {
    return undefined;
  }
  return JSON.parse(content) as T;
}

/**
 * Write a JSON file
 * @param path - File path (supports ~ expansion)
 * @param data - Data to write
 * @param options - JSON stringify options
 */
export async function writeJson<T>(
  path: string,
  data: T,
  options?: { indent?: number }
): Promise<void> {
  const content = JSON.stringify(data, null, options?.indent ?? 2);
  await writeFile(path, content + '\n');
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param path - Directory path (supports ~ expansion)
 */
export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

/**
 * Ensure a file's parent directory exists
 * @param path - File path (supports ~ expansion)
 */
export async function ensureFileDir(path: string): Promise<void> {
  const resolved = resolvePath(path);
  const dir = dirname(resolved);
  await ensureDir(dir);
}

/**
 * Create a readable stream for a file
 * @param path - File path (supports ~ expansion)
 * @returns Readable stream
 */
export function createReadableStream(
  path: string
): ReturnType<typeof createReadStream> {
  const resolved = resolvePath(path);
  return createReadStream(resolved);
}

/**
 * Create a writable stream for a file
 * @param path - File path (supports ~ expansion)
 * @returns Writable stream
 */
export function createWritableStream(
  path: string
): ReturnType<typeof createWriteStream> {
  const resolved = resolvePath(path);
  return createWriteStream(resolved);
}

/**
 * Stream copy a file
 * @param src - Source path (supports ~ expansion)
 * @param dest - Destination path (supports ~ expansion)
 */
export async function streamCopy(src: string, dest: string): Promise<void> {
  await ensureFileDir(dest);
  const readable = createReadableStream(src);
  const writable = createWritableStream(dest);
  await pipeline(readable, writable);
}

/**
 * Type guard for Node.js errors with code property
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
