/**
 * Backup - Backup and restore functionality for Claude Code settings
 * Creates timestamped backups and allows restoration
 */

import { join, basename } from 'node:path';
import * as fs from 'node:fs/promises';
import {
  exists,
  readDir,
  mkdir,
  copyDir,
  remove,
} from '@/utils/fs.js';
import { getGlobalConfigDir } from '@/utils/paths.js';

// =============================================================================
// Constants
// =============================================================================

const BACKUPS_DIR = 'backups';
const BACKUP_PREFIX = 'claude-backup-';
const MAX_BACKUPS_DEFAULT = 10;

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a backup operation
 */
export interface BackupResult {
  /** Whether backup was successful */
  success: boolean;

  /** Path to the backup directory */
  path?: string;

  /** Error message if failed */
  error?: string;

  /** Timestamp of the backup */
  timestamp?: Date;

  /** Files backed up */
  files?: string[];
}

/**
 * Information about a backup
 */
export interface BackupInfo {
  /** Backup directory path */
  path: string;

  /** Backup name (directory name) */
  name: string;

  /** When the backup was created */
  timestamp: Date;

  /** Size in bytes */
  size: number;

  /** Files in the backup */
  files: string[];
}

/**
 * Result of a restore operation
 */
export interface RestoreResult {
  /** Whether restore was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Files restored */
  files?: string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the backups directory path
 */
export function getBackupsDir(configDir?: string): string {
  const base = configDir ?? getGlobalConfigDir();
  return join(base, BACKUPS_DIR);
}

/**
 * Generate a backup directory name with timestamp
 */
function generateBackupName(): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/:/g, '-')
    .replace(/\./g, '-')
    .replace('T', '_')
    .replace('Z', '');
  return `${BACKUP_PREFIX}${timestamp}`;
}

/**
 * Parse timestamp from backup directory name
 */
function parseBackupTimestamp(name: string): Date | null {
  if (!name.startsWith(BACKUP_PREFIX)) {
    return null;
  }

  const timestampPart = name.slice(BACKUP_PREFIX.length);
  // Format: YYYY-MM-DD_HH-MM-SS-mmm
  const match = timestampPart.match(
    /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})-(\d{3})$/
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second, ms] = match;
  return new Date(
    parseInt(year!, 10),
    parseInt(month!, 10) - 1,
    parseInt(day!, 10),
    parseInt(hour!, 10),
    parseInt(minute!, 10),
    parseInt(second!, 10),
    parseInt(ms!, 10)
  );
}

/**
 * Get total size of a directory recursively
 */
async function getDirectorySize(dir: string): Promise<number> {
  let totalSize = 0;

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      totalSize += await getDirectorySize(entryPath);
    } else {
      const stats = await fs.stat(entryPath);
      totalSize += stats.size;
    }
  }

  return totalSize;
}

/**
 * List files in a directory recursively
 */
async function listFilesRecursive(dir: string, base = ''): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = base ? join(base, entry.name) : entry.name;
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await listFilesRecursive(fullPath, relativePath);
        files.push(...subFiles);
      } else {
        files.push(relativePath);
      }
    }
  } catch {
    // Ignore errors reading directories
  }

  return files;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Create a backup of the Claude directory
 *
 * @param claudeDir - Path to the Claude directory to backup
 * @param configDir - Optional config directory for backup storage
 * @returns Backup result
 */
export async function createBackup(
  claudeDir: string,
  configDir?: string,
): Promise<BackupResult> {
  const backupsDir = getBackupsDir(configDir);
  const backupName = generateBackupName();
  const backupPath = join(backupsDir, backupName);

  try {
    // Check source exists
    if (!(await exists(claudeDir))) {
      return {
        success: false,
        error: `Source directory does not exist: ${claudeDir}`,
      };
    }

    // Ensure backups directory exists
    await mkdir(backupsDir, { recursive: true });

    // Copy the Claude directory
    await copyDir(claudeDir, backupPath);

    // List backed up files
    const files = await listFilesRecursive(backupPath);

    return {
      success: true,
      path: backupPath,
      timestamp: new Date(),
      files,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * List all available backups
 *
 * @param configDir - Optional config directory
 * @returns Array of backup info sorted by timestamp (newest first)
 */
export async function listBackups(configDir?: string): Promise<BackupInfo[]> {
  const backupsDir = getBackupsDir(configDir);
  const backups: BackupInfo[] = [];

  try {
    if (!(await exists(backupsDir))) {
      return [];
    }

    const entries = await readDir(backupsDir);

    for (const entry of entries) {
      if (!entry.startsWith(BACKUP_PREFIX)) {
        continue;
      }

      const backupPath = join(backupsDir, entry);
      const timestamp = parseBackupTimestamp(entry);

      if (!timestamp) {
        continue;
      }

      try {
        const size = await getDirectorySize(backupPath);
        const files = await listFilesRecursive(backupPath);

        backups.push({
          path: backupPath,
          name: entry,
          timestamp,
          size,
          files,
        });
      } catch {
        // Skip invalid backups
      }
    }

    // Sort by timestamp, newest first
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return backups;
  } catch {
    return [];
  }
}

/**
 * Restore from a backup
 *
 * @param backupPath - Path to the backup directory
 * @param targetDir - Path to restore to (Claude directory)
 * @returns Restore result
 */
export async function restoreBackup(
  backupPath: string,
  targetDir: string,
): Promise<RestoreResult> {
  try {
    // Validate backup exists
    if (!(await exists(backupPath))) {
      return {
        success: false,
        error: `Backup does not exist: ${backupPath}`,
      };
    }

    // List files to restore
    const files = await listFilesRecursive(backupPath);

    if (files.length === 0) {
      return {
        success: false,
        error: 'Backup is empty',
      };
    }

    // Create a safety backup of current state before restoring
    const safetyBackup = await createBackup(targetDir);
    if (!safetyBackup.success) {
      // Continue anyway, but log warning
      console.warn('Warning: Could not create safety backup before restore');
    }

    // Clear target directory
    if (await exists(targetDir)) {
      await remove(targetDir, { recursive: true });
    }

    // Copy backup to target
    await copyDir(backupPath, targetDir);

    return {
      success: true,
      files,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete a specific backup
 *
 * @param backupPath - Path to the backup to delete
 * @returns Whether deletion was successful
 */
export async function deleteBackup(backupPath: string): Promise<boolean> {
  try {
    if (!(await exists(backupPath))) {
      return false;
    }

    await remove(backupPath, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Prune old backups, keeping only the most recent N
 *
 * @param keep - Number of backups to keep
 * @param configDir - Optional config directory
 * @returns Number of backups deleted
 */
export async function pruneBackups(
  keep: number = MAX_BACKUPS_DEFAULT,
  configDir?: string,
): Promise<number> {
  const backups = await listBackups(configDir);

  if (backups.length <= keep) {
    return 0;
  }

  // Backups to delete (oldest ones beyond the keep limit)
  const toDelete = backups.slice(keep);
  let deleted = 0;

  for (const backup of toDelete) {
    const success = await deleteBackup(backup.path);
    if (success) {
      deleted++;
    }
  }

  return deleted;
}

/**
 * Get the latest backup
 *
 * @param configDir - Optional config directory
 * @returns Latest backup info or null
 */
export async function getLatestBackup(
  configDir?: string,
): Promise<BackupInfo | null> {
  const backups = await listBackups(configDir);
  return backups[0] ?? null;
}

/**
 * Get a backup by name
 *
 * @param name - Backup name
 * @param configDir - Optional config directory
 * @returns Backup info or null
 */
export async function getBackupByName(
  name: string,
  configDir?: string,
): Promise<BackupInfo | null> {
  const backups = await listBackups(configDir);
  return backups.find(b => b.name === name) ?? null;
}

/**
 * Get total size of all backups
 *
 * @param configDir - Optional config directory
 * @returns Total size in bytes
 */
export async function getTotalBackupSize(configDir?: string): Promise<number> {
  const backups = await listBackups(configDir);
  return backups.reduce((sum, b) => sum + b.size, 0);
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Check if a path is a valid backup
 */
export async function isValidBackup(path: string): Promise<boolean> {
  try {
    if (!(await exists(path))) {
      return false;
    }

    const name = basename(path);
    if (!name.startsWith(BACKUP_PREFIX)) {
      return false;
    }

    const timestamp = parseBackupTimestamp(name);
    if (!timestamp) {
      return false;
    }

    // Check it has some content
    const files = await listFilesRecursive(path);
    return files.length > 0;
  } catch {
    return false;
  }
}
