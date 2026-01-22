/**
 * Cost Storage Module
 * JSONL-based storage for cost tracking entries
 */

import { join } from 'node:path';
import type { CostEntry } from '@/types/index.js';
import { getGlobalConfigDir } from '@/utils/paths.js';
import {
  writeFile,
  exists,
  ensureDir,
  readFile,
} from '@/utils/fs.js';
import * as fs from 'node:fs/promises';

// =============================================================================
// Interface
// =============================================================================

export interface CostStorage {
  /** Append a cost entry to storage */
  append(entry: CostEntry): Promise<void>;

  /** Query entries within a date range */
  query(options: { start: Date; end: Date }): Promise<CostEntry[]>;

  /** Get path to cost file for a given year/month */
  getPath(year: number, month: number): string;

  /** Get all entries for today */
  getToday(): Promise<CostEntry[]>;

  /** Get all entries for current week */
  getThisWeek(): Promise<CostEntry[]>;

  /** Get all entries for current month */
  getThisMonth(): Promise<CostEntry[]>;

  /** Clear all cost data (for testing) */
  clear(): Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

const COSTS_DIR = 'cache/costs';

// =============================================================================
// Implementation
// =============================================================================

export function createCostStorage(): CostStorage {
  /**
   * Get the costs directory path
   */
  function getCostsDir(): string {
    return join(getGlobalConfigDir(), COSTS_DIR);
  }

  /**
   * Get path to cost file for a given year/month
   */
  function getPath(year: number, month: number): string {
    const monthStr = String(month).padStart(2, '0');
    return join(getCostsDir(), `${year}-${monthStr}.jsonl`);
  }

  /**
   * Parse a JSONL file into cost entries
   */
  async function parseJsonl(filePath: string): Promise<CostEntry[]> {
    if (!(await exists(filePath))) {
      return [];
    }

    const content = await readFile(filePath);
    const lines = content.trim().split('\n').filter(Boolean);
    const entries: CostEntry[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as CostEntry;
        // Convert timestamp string back to Date
        entry.timestamp = new Date(entry.timestamp);
        entries.push(entry);
      } catch {
        // Skip invalid lines
      }
    }

    return entries;
  }

  /**
   * Append a cost entry to storage
   */
  async function append(entry: CostEntry): Promise<void> {
    const date = entry.timestamp;
    const filePath = getPath(date.getFullYear(), date.getMonth() + 1);

    // Ensure directory exists
    await ensureDir(getCostsDir());

    // Serialize entry with timestamp as ISO string
    const serialized = JSON.stringify({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    });

    // Append to file
    if (await exists(filePath)) {
      const existingContent = await readFile(filePath);
      const newContent = existingContent.endsWith('\n')
        ? existingContent + serialized + '\n'
        : existingContent + '\n' + serialized + '\n';
      await writeFile(filePath, newContent);
    } else {
      await writeFile(filePath, serialized + '\n');
    }
  }

  /**
   * Query entries within a date range
   */
  async function query(options: { start: Date; end: Date }): Promise<CostEntry[]> {
    const { start, end } = options;

    // Determine which files to read
    const files: string[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= endMonth) {
      files.push(getPath(current.getFullYear(), current.getMonth() + 1));
      current.setMonth(current.getMonth() + 1);
    }

    // Read all relevant files
    const allEntries: CostEntry[] = [];
    for (const file of files) {
      const entries = await parseJsonl(file);
      allEntries.push(...entries);
    }

    // Filter by date range
    return allEntries.filter((entry) => {
      const timestamp = entry.timestamp;
      return timestamp >= start && timestamp <= end;
    });
  }

  /**
   * Get all entries for today
   */
  async function getToday(): Promise<CostEntry[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return query({ start: startOfDay, end: endOfDay });
  }

  /**
   * Get all entries for current week
   */
  async function getThisWeek(): Promise<CostEntry[]> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return query({ start: startOfWeek, end: endOfWeek });
  }

  /**
   * Get all entries for current month
   */
  async function getThisMonth(): Promise<CostEntry[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return query({ start: startOfMonth, end: endOfMonth });
  }

  /**
   * Clear all cost data
   */
  async function clear(): Promise<void> {
    const costsDir = getCostsDir();
    if (await exists(costsDir)) {
      await fs.rm(costsDir, { recursive: true, force: true });
    }
  }

  return {
    append,
    query,
    getPath,
    getToday,
    getThisWeek,
    getThisMonth,
    clear,
  };
}
