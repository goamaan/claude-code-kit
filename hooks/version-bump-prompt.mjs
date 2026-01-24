#!/usr/bin/env node
/**
 * Claude Code Hook: Stop
 * Prompts user to consider version bump after work is complete
 *
 * This hook runs when Claude stops and checks if there are changes
 * that might warrant a version bump.
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

/**
 * Check if there are uncommitted changes
 */
function hasUncommittedChanges() {
  try {
    const status = execSync('git status --porcelain', {
      cwd: projectRoot,
      encoding: 'utf8'
    });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if there are unpushed commits
 */
function hasUnpushedCommits() {
  try {
    const unpushed = execSync('git log @{u}..HEAD --oneline 2>/dev/null || echo ""', {
      cwd: projectRoot,
      encoding: 'utf8'
    });
    return unpushed.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get recent commit messages to analyze changes
 */
function getRecentCommits() {
  try {
    const commits = execSync('git log -5 --oneline', {
      cwd: projectRoot,
      encoding: 'utf8'
    });
    return commits.trim();
  } catch {
    return '';
  }
}

/**
 * Determine suggested bump type based on commits
 */
function suggestBumpType(commits) {
  const lines = commits.toLowerCase();

  if (lines.includes('breaking') || lines.includes('!:')) {
    return 'major';
  }
  if (lines.includes('feat(') || lines.includes('feat:')) {
    return 'minor';
  }
  if (lines.includes('fix(') || lines.includes('fix:')) {
    return 'patch';
  }
  return 'patch';
}

/**
 * Get current version from package.json
 */
function getCurrentVersion() {
  try {
    const pkgPath = join(projectRoot, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

/**
 * Check if version was recently bumped (within last 5 commits)
 */
function wasVersionRecentlyBumped() {
  try {
    const commits = execSync('git log -5 --oneline', {
      cwd: projectRoot,
      encoding: 'utf8'
    });
    return commits.includes('bump') ||
           commits.includes('version') ||
           commits.includes('release');
  } catch {
    return false;
  }
}

/**
 * Main hook logic
 */
async function main() {
  // Read hook input from stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const data = JSON.parse(input);

    // Only suggest version bump if:
    // 1. There are unpushed commits OR uncommitted changes
    // 2. Version wasn't recently bumped
    // 3. Significant work was done (tools used > 5)

    const toolsUsed = data.stats?.tools_used || 0;
    const hasChanges = hasUncommittedChanges() || hasUnpushedCommits();
    const recentlyBumped = wasVersionRecentlyBumped();

    if (hasChanges && !recentlyBumped && toolsUsed > 5) {
      const currentVersion = getCurrentVersion();
      const commits = getRecentCommits();
      const suggestedType = suggestBumpType(commits);

      // Output suggestion to stderr (visible to user)
      console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('📦 VERSION BUMP REMINDER');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`Current version: ${currentVersion}`);
      console.error(`Suggested bump: ${suggestedType}`);
      console.error('');
      console.error('To bump version and release:');
      console.error(`  npm version ${suggestedType} -m "chore: bump version to %s"`);
      console.error('  git push && git push --tags');
      console.error('');
      console.error('Or ask Claude: "bump version and release"');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // Always allow stop (exit 0)
    console.log(JSON.stringify({ action: 'continue' }));
    process.exit(0);
  } catch (error) {
    // On error, just continue without blocking
    console.error(`[Version Hook] Error: ${error.message}`);
    console.log(JSON.stringify({ action: 'continue' }));
    process.exit(0);
  }
}

main();
