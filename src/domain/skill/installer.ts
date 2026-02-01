/**
 * Skill Installer
 * Handles installing skills from git repos, local paths, and managing the lock file
 */

import { readdir, readFile, mkdir, rm, cp } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

// =============================================================================
// Types
// =============================================================================

export interface SkillSource {
  type: 'github' | 'gitlab' | 'git' | 'local';
  owner?: string;
  repo?: string;
  url?: string;
  path?: string;
  skillName?: string;
}

export interface DiscoveredSkill {
  name: string;
  description: string;
  path: string;
  isDirectory: boolean;
}

export interface InstalledSkill {
  name: string;
  source: string;
  sourceType: SkillSource['type'];
  installedAt: string;
  updatedAt: string;
  path: string;
}

export interface SkillLockFile {
  version: 1;
  skills: Record<string, InstalledSkill>;
}

// =============================================================================
// Constants
// =============================================================================

const INSTALLED_SKILLS_DIR = join(homedir(), '.claudeops', 'skills');
const LOCK_FILE_PATH = join(homedir(), '.claudeops', 'skill-lock.json');

// =============================================================================
// Source Parsing
// =============================================================================

/**
 * Parse a skill source string into a structured SkillSource
 *
 * Supported formats:
 * - owner/repo              → GitHub shorthand
 * - owner/repo@skill-name   → Specific skill from GitHub repo
 * - https://github.com/...  → Full GitHub URL
 * - https://gitlab.com/...  → Full GitLab URL
 * - ./local/path            → Local directory
 * - /absolute/path          → Local directory
 */
export function parseSource(input: string): SkillSource {
  // Local path (starts with . or /)
  if (input.startsWith('.') || input.startsWith('/') || input.startsWith('~')) {
    return {
      type: 'local',
      path: input.startsWith('~') ? join(homedir(), input.slice(2)) : resolve(input),
    };
  }

  // Full URL
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const url = new URL(input);
    const isGitHub = url.hostname === 'github.com';
    const isGitLab = url.hostname === 'gitlab.com';

    return {
      type: isGitHub ? 'github' : isGitLab ? 'gitlab' : 'git',
      url: input,
      owner: url.pathname.split('/')[1],
      repo: url.pathname.split('/')[2]?.replace(/\.git$/, ''),
    };
  }

  // owner/repo or owner/repo@skill-name
  const atIndex = input.indexOf('@');
  let repoPath = input;
  let skillName: string | undefined;

  if (atIndex !== -1) {
    repoPath = input.slice(0, atIndex);
    skillName = input.slice(atIndex + 1);
  }

  const parts = repoPath.split('/');
  if (parts.length === 2) {
    return {
      type: 'github',
      owner: parts[0],
      repo: parts[1],
      url: `https://github.com/${parts[0]}/${parts[1]}.git`,
      skillName,
    };
  }

  // Fallback: treat as git URL
  return {
    type: 'git',
    url: input,
  };
}

// =============================================================================
// Git Operations
// =============================================================================

/**
 * Clone a git repo to a temporary directory (shallow clone)
 */
function cloneRepo(url: string): string {
  const tempDir = join(tmpdir(), `claudeops-skill-${Date.now()}`);
  execSync(`git clone --depth 1 "${url}" "${tempDir}"`, {
    stdio: 'pipe',
    timeout: 30000,
  });
  return tempDir;
}

// =============================================================================
// Skill Discovery
// =============================================================================

/**
 * Discover skills in a directory by scanning for SKILL.md files
 */
export async function discoverSkills(dir: string): Promise<DiscoveredSkill[]> {
  const skills: DiscoveredSkill[] = [];

  // Check common locations for skills
  const searchDirs = [
    join(dir, 'skills'),
    join(dir, '.claude', 'skills'),
    dir,
  ];

  for (const searchDir of searchDirs) {
    if (!existsSync(searchDir)) continue;

    const entries = await readdir(searchDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(searchDir, entry.name);

      if (entry.isDirectory()) {
        const skillMd = join(fullPath, 'SKILL.md');
        if (existsSync(skillMd)) {
          const content = await readFile(skillMd, 'utf8');
          const meta = parseSkillFrontmatter(content);
          skills.push({
            name: meta.name || entry.name,
            description: meta.description || '',
            path: fullPath,
            isDirectory: true,
          });
        }
      } else if (entry.name.endsWith('.md') && entry.name !== 'README.md') {
        const content = await readFile(fullPath, 'utf8');
        const meta = parseSkillFrontmatter(content);
        if (meta.name) {
          skills.push({
            name: meta.name,
            description: meta.description || '',
            path: fullPath,
            isDirectory: false,
          });
        }
      }
    }
  }

  // Dedupe by name
  const seen = new Set<string>();
  return skills.filter(s => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });
}

/**
 * Quick parse of frontmatter to extract name and description
 */
function parseSkillFrontmatter(content: string): { name?: string; description?: string } {
  const lines = content.split('\n');
  if (lines[0]?.trim() !== '---') return {};

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) return {};

  const result: { name?: string; description?: string } = {};
  for (const line of lines.slice(1, endIndex)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key === 'name') result.name = value;
    if (key === 'description') result.description = value;
  }
  return result;
}

// =============================================================================
// Install / Remove
// =============================================================================

/**
 * Clone, discover, and install skill(s) from a source
 */
export async function installFromSource(
  source: SkillSource,
  options: { all?: boolean; skillName?: string } = {}
): Promise<InstalledSkill[]> {
  const targetSkillName = options.skillName || source.skillName;
  let sourceDir: string;
  let tempDir: string | undefined;

  // Get the source directory
  if (source.type === 'local') {
    sourceDir = source.path!;
    if (!existsSync(sourceDir)) {
      throw new Error(`Local path not found: ${sourceDir}`);
    }
  } else {
    const url = source.url || `https://github.com/${source.owner}/${source.repo}.git`;
    tempDir = cloneRepo(url);
    sourceDir = tempDir;
  }

  try {
    // Discover skills
    const discovered = await discoverSkills(sourceDir);
    if (discovered.length === 0) {
      throw new Error('No skills found in source');
    }

    // Filter to specific skill if requested
    let toInstall = discovered;
    if (targetSkillName) {
      toInstall = discovered.filter(s => s.name === targetSkillName);
      if (toInstall.length === 0) {
        const available = discovered.map(s => s.name).join(', ');
        throw new Error(`Skill "${targetSkillName}" not found. Available: ${available}`);
      }
    } else if (!options.all && discovered.length > 1) {
      // If multiple skills and not --all, throw with list
      const available = discovered.map(s => `  - ${s.name}: ${s.description}`).join('\n');
      throw new Error(
        `Multiple skills found. Specify one with @name or use --all:\n${available}`
      );
    }

    // Install each skill
    const installed: InstalledSkill[] = [];
    const lock = readLockFile();
    const sourceStr = source.url || source.path || `${source.owner}/${source.repo}`;

    await mkdir(INSTALLED_SKILLS_DIR, { recursive: true });

    for (const skill of toInstall) {
      const destDir = join(INSTALLED_SKILLS_DIR, skill.name);

      // Copy skill to installed directory
      if (skill.isDirectory) {
        await mkdir(destDir, { recursive: true });
        await cp(skill.path, destDir, { recursive: true });
      } else {
        await mkdir(destDir, { recursive: true });
        const destFile = join(destDir, 'SKILL.md');
        await cp(skill.path, destFile);
      }

      const now = new Date().toISOString();
      const record: InstalledSkill = {
        name: skill.name,
        source: sourceStr,
        sourceType: source.type,
        installedAt: lock.skills[skill.name]?.installedAt || now,
        updatedAt: now,
        path: destDir,
      };

      lock.skills[skill.name] = record;
      installed.push(record);
    }

    writeLockFile(lock);
    return installed;
  } finally {
    // Clean up temp directory
    if (tempDir && existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * Remove an installed skill
 */
export async function removeSkill(name: string): Promise<void> {
  const lock = readLockFile();

  if (!lock.skills[name]) {
    throw new Error(`Skill "${name}" is not installed`);
  }

  const skillDir = join(INSTALLED_SKILLS_DIR, name);
  if (existsSync(skillDir)) {
    await rm(skillDir, { recursive: true, force: true });
  }

  delete lock.skills[name];
  writeLockFile(lock);
}

/**
 * List all installed skills
 */
export function listInstalledSkills(): InstalledSkill[] {
  const lock = readLockFile();
  return Object.values(lock.skills);
}

// =============================================================================
// Lock File
// =============================================================================

/**
 * Read the skill lock file
 */
export function readLockFile(): SkillLockFile {
  if (!existsSync(LOCK_FILE_PATH)) {
    return { version: 1, skills: {} };
  }

  try {
    const content = readFileSync(LOCK_FILE_PATH, 'utf8');
    return JSON.parse(content) as SkillLockFile;
  } catch {
    return { version: 1, skills: {} };
  }
}

/**
 * Write the skill lock file
 */
export function writeLockFile(lock: SkillLockFile): void {
  const dir = join(homedir(), '.claudeops');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(LOCK_FILE_PATH, JSON.stringify(lock, null, 2), 'utf8');
}
