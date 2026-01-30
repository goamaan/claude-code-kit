/**
 * Hook: checkpoint
 * Event: Stop
 * Description: Creates git stash checkpoint before session ends if uncommitted changes exist
 * Matcher: *
 * Enabled: true
 *
 * checkpoint - Stop Hook
 *
 * Creates a git stash as a checkpoint before session ends.
 * Stores stash references in ~/.claudeops/state/checkpoints.json for recovery.
 * Only creates checkpoint if uncommitted changes exist.
 *
 * Hook type: Stop
 * Triggers: Before session/conversation ends
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const execAsync = promisify(exec);

/**
 * Get checkpoint state file path
 */
function getCheckpointFilePath() {
  const stateDir = join(homedir(), '.claudeops', 'state');
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  return join(stateDir, 'checkpoints.json');
}

/**
 * Load existing checkpoints
 */
function loadCheckpoints() {
  const filePath = getCheckpointFilePath();
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const data = readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

/**
 * Save checkpoint to state file
 */
function saveCheckpoint(checkpoint) {
  const checkpoints = loadCheckpoints();
  checkpoints.push(checkpoint);

  // Keep only last 50 checkpoints
  if (checkpoints.length > 50) {
    checkpoints.splice(0, checkpoints.length - 50);
  }

  const filePath = getCheckpointFilePath();
  writeFileSync(filePath, JSON.stringify(checkpoints, null, 2), 'utf8');
}

/**
 * Check if we're in a git repository
 */
async function isGitRepo() {
  try {
    await execAsync('git rev-parse --git-dir', {
      encoding: 'utf8',
      timeout: 5000,
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if there are uncommitted changes
 */
async function hasUncommittedChanges() {
  try {
    const { stdout } = await execAsync('git status --porcelain', {
      encoding: 'utf8',
      timeout: 5000,
    });

    return stdout.trim().length > 0;
  } catch (e) {
    return false;
  }
}

/**
 * Get current git repository info
 */
async function getRepoInfo() {
  try {
    const { stdout: root } = await execAsync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      timeout: 5000,
    });

    const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      timeout: 5000,
    });

    const { stdout: commit } = await execAsync('git rev-parse HEAD', {
      encoding: 'utf8',
      timeout: 5000,
    });

    return {
      root: root.trim(),
      branch: branch.trim(),
      commit: commit.trim(),
    };
  } catch (e) {
    return null;
  }
}

/**
 * Create git stash checkpoint
 */
async function createCheckpoint() {
  const repoInfo = await getRepoInfo();
  if (!repoInfo) {
    return null;
  }

  const timestamp = new Date().toISOString();
  const message = `Claude session checkpoint - ${timestamp}`;

  try {
    // Create stash with message
    const { stdout } = await execAsync(`git stash push -u -m "${message}"`, {
      encoding: 'utf8',
      timeout: 30000,
    });

    // Get stash reference
    const { stdout: stashRef } = await execAsync('git rev-parse stash@{0}', {
      encoding: 'utf8',
      timeout: 5000,
    });

    const checkpoint = {
      timestamp,
      repository: repoInfo.root,
      branch: repoInfo.branch,
      commit: repoInfo.commit,
      stashRef: stashRef.trim(),
      message,
    };

    saveCheckpoint(checkpoint);

    return checkpoint;
  } catch (e) {
    return null;
  }
}

/**
 * Main hook function
 */
export default async function checkpointHook(context) {
  // Check if we're in a git repo
  const inGitRepo = await isGitRepo();
  if (!inGitRepo) {
    return {
      decision: 'allow',
      message: 'Not in a git repository, skipping checkpoint.',
    };
  }

  // Check if there are uncommitted changes
  const hasChanges = await hasUncommittedChanges();
  if (!hasChanges) {
    return {
      decision: 'allow',
      message: 'No uncommitted changes, skipping checkpoint.',
    };
  }

  // Create checkpoint
  const checkpoint = await createCheckpoint();

  if (!checkpoint) {
    return {
      decision: 'allow',
      message: '⚠️  Failed to create checkpoint stash.',
    };
  }

  return {
    decision: 'allow',
    message: `\n💾 Checkpoint created:\n  Repository: ${checkpoint.repository}\n  Branch: ${checkpoint.branch}\n  Stash: ${checkpoint.stashRef.slice(0, 12)}\n  Time: ${checkpoint.timestamp}\n\nRestore with: git stash apply ${checkpoint.stashRef.slice(0, 12)}\n`,
    metadata: {
      checkpoint,
    },
  };
}
