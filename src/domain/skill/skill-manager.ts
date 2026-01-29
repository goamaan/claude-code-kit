/**
 * Skill Manager
 * Loads, matches, and formats skills for Claude Code integration
 */

import { readdir, readFile, mkdir, writeFile as fsWriteFile, stat, copyFile } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';
import type { IntentClassification, Domain } from '../../core/classifier/types.js';
import type {
  Skill,
  SkillMetadata,
  SkillMatch,
  SkillManagerOptions,
  SkillSourceType,
  FormattedSkillContext,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_BUILTIN_SKILLS_DIR = join(dirname(dirname(dirname(__dirname))), 'skills');
const DEFAULT_GLOBAL_SKILLS_DIR = join(homedir(), '.claudeops', 'skills');
const DEFAULT_PROJECT_SKILLS_DIR = '.claude/skills';
const CLAUDE_SKILLS_DIR = join(homedir(), '.claude', 'skills');

// =============================================================================
// YAML Frontmatter Parser
// =============================================================================

interface ParsedSkillFile {
  metadata: SkillMetadata;
  content: string;
}

function parseSkillFile(fileContent: string, filePath: string): ParsedSkillFile {
  const lines = fileContent.split('\n');

  // Check for YAML frontmatter
  if (lines[0]?.trim() !== '---') {
    // No frontmatter, use filename as name
    const name = basename(filePath, '.md').replace(/SKILL$/i, '').toLowerCase();
    return {
      metadata: { name, description: '' },
      content: fileContent,
    };
  }

  // Find closing ---
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    // No closing ---, treat as no frontmatter
    const name = basename(filePath, '.md').replace(/SKILL$/i, '').toLowerCase();
    return {
      metadata: { name, description: '' },
      content: fileContent,
    };
  }

  // Parse YAML frontmatter (simple key: value parsing)
  const frontmatterLines = lines.slice(1, endIndex);
  const metadata: SkillMetadata = { name: '', description: '' };

  for (const line of frontmatterLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    switch (key) {
      case 'name':
        metadata.name = value;
        break;
      case 'description':
        metadata.description = value;
        break;
      case 'auto_trigger':
      case 'autoTrigger':
        // Handle array format
        if (value.startsWith('[')) {
          metadata.autoTrigger = value
            .slice(1, -1)
            .split(',')
            .map(s => s.trim().replace(/["']/g, ''));
        }
        break;
      case 'domains':
        if (value.startsWith('[')) {
          metadata.domains = value
            .slice(1, -1)
            .split(',')
            .map(s => s.trim().replace(/["']/g, '')) as Domain[];
        }
        break;
      case 'model':
        metadata.model = value as SkillMetadata['model'];
        break;
      case 'disable-model-invocation':
      case 'disableModelInvocation':
        metadata.disableModelInvocation = value === 'true';
        break;
      case 'user-invocable':
      case 'userInvocable':
        metadata.userInvocable = value !== 'false';
        break;
    }
  }

  // Default name from filename if not in frontmatter
  if (!metadata.name) {
    metadata.name = basename(filePath, '.md').replace(/SKILL$/i, '').toLowerCase();
  }

  // Content is everything after frontmatter
  const content = lines.slice(endIndex + 1).join('\n').trim();

  return { metadata, content };
}

// =============================================================================
// Skill Manager Class
// =============================================================================

export class SkillManager {
  private skills: Map<string, Skill> = new Map();
  private options: SkillManagerOptions;
  private loaded = false;
  private claudeSkillsDir: string;

  constructor(options: SkillManagerOptions = {}) {
    this.claudeSkillsDir = options.claudeSkillsDir || CLAUDE_SKILLS_DIR;
    this.options = {
      builtinSkillsDir: options.builtinSkillsDir || DEFAULT_BUILTIN_SKILLS_DIR,
      globalSkillsDir: options.globalSkillsDir || DEFAULT_GLOBAL_SKILLS_DIR,
      projectSkillsDir: options.projectSkillsDir || DEFAULT_PROJECT_SKILLS_DIR,
      claudeSkillsDir: this.claudeSkillsDir,
      profileSkills: options.profileSkills || [],
      disabledSkills: options.disabledSkills || [],
    };
  }

  /**
   * Load all skills from configured directories
   */
  async loadSkills(): Promise<Skill[]> {
    this.skills.clear();

    // Load in priority order (lower priority first, higher overwrites)
    await this.loadSkillsFromDir(this.options.builtinSkillsDir!, 'builtin');
    await this.loadSkillsFromDir(this.options.globalSkillsDir!, 'global');
    await this.loadSkillsFromDir(this.options.projectSkillsDir!, 'project');

    this.loaded = true;
    return Array.from(this.skills.values());
  }

  /**
   * Load skills from a directory
   */
  private async loadSkillsFromDir(dir: string, sourceType: SkillSourceType): Promise<void> {
    if (!existsSync(dir)) return;

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // Look for SKILL.md in directory
          const skillPath = join(fullPath, 'SKILL.md');
          if (existsSync(skillPath)) {
            await this.loadSkillFile(skillPath, sourceType);
          }
        } else if (entry.name.endsWith('.md')) {
          // Direct .md file
          await this.loadSkillFile(fullPath, sourceType);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  /**
   * Load a single skill file
   */
  private async loadSkillFile(filePath: string, sourceType: SkillSourceType): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf8');
      const { metadata, content: skillContent } = parseSkillFile(content, filePath);

      // Skip disabled skills
      if (this.options.disabledSkills?.includes(metadata.name)) {
        return;
      }

      const skill: Skill = {
        metadata,
        content: skillContent,
        sourcePath: filePath,
        sourceType,
      };

      this.skills.set(metadata.name, skill);
    } catch {
      // Skip files that can't be read
    }
  }

  /**
   * Get all loaded skills
   */
  getSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get a skill by name
   */
  getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * Match skills based on user prompt patterns
   */
  matchSkills(userPrompt: string): SkillMatch[] {
    const promptLower = userPrompt.toLowerCase();
    const matches: SkillMatch[] = [];

    for (const skill of this.skills.values()) {
      const triggers = skill.metadata.autoTrigger || [];

      for (const trigger of triggers) {
        if (promptLower.includes(trigger.toLowerCase())) {
          matches.push({
            skill,
            matchReason: 'auto_trigger',
            score: 0.8,
          });
          break;
        }
      }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Match skills based on intent classification
   */
  matchByClassification(classification: IntentClassification): SkillMatch[] {
    const matches: SkillMatch[] = [];

    for (const skill of this.skills.values()) {
      const skillDomains = skill.metadata.domains || [];

      // Match by domain overlap
      const domainOverlap = classification.domains.filter(d =>
        skillDomains.includes(d)
      );

      if (domainOverlap.length > 0) {
        matches.push({
          skill,
          matchReason: 'domain',
          score: domainOverlap.length / Math.max(classification.domains.length, skillDomains.length),
        });
      }

      // Match specific intents to skills
      if (classification.type === 'planning' && skill.metadata.name === 'planner') {
        matches.push({ skill, matchReason: 'classification', score: 0.9 });
      }
      if (classification.signals.wantsAutonomy && skill.metadata.name === 'autopilot') {
        matches.push({ skill, matchReason: 'classification', score: 0.9 });
      }
      if (classification.domains.includes('frontend') && skill.metadata.name === 'frontend-ui-ux') {
        matches.push({ skill, matchReason: 'classification', score: 0.85 });
      }
    }

    // Dedupe by skill name, keeping highest score
    const seen = new Map<string, SkillMatch>();
    for (const match of matches) {
      const existing = seen.get(match.skill.metadata.name);
      if (!existing || match.score > existing.score) {
        seen.set(match.skill.metadata.name, match);
      }
    }

    return Array.from(seen.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Format matched skills as context string for injection
   */
  formatSkillContext(skills: Skill[], maxLength = 10000): FormattedSkillContext {
    if (skills.length === 0) {
      return { context: '', skills: [], characterCount: 0 };
    }

    const header = '## Active Skills\n';
    const parts: string[] = [header];
    const includedSkills: string[] = [];
    let currentLength = header.length;

    for (const skill of skills) {
      const skillSection = `### ${skill.metadata.name}\n${skill.metadata.description}\n\n${skill.content}\n\n---\n`;

      if (currentLength + skillSection.length > maxLength) {
        // Add truncated indicator
        parts.push(`\n(Additional skills truncated for context length)`);
        break;
      }

      parts.push(skillSection);
      includedSkills.push(skill.metadata.name);
      currentLength += skillSection.length;
    }

    const context = parts.join('\n');
    return {
      context,
      skills: includedSkills,
      characterCount: context.length,
    };
  }

  /**
   * Recursively sync a skill's references directory if it exists
   */
  private async syncSkillReferences(skillName: string, sourceDir: string): Promise<void> {
    const sourceReferencesDir = join(sourceDir, 'references');

    // Check if references directory exists
    try {
      const refsStat = await stat(sourceReferencesDir);
      if (!refsStat.isDirectory()) return;
    } catch {
      // References directory doesn't exist, skip
      return;
    }

    // Create destination skill directory and references subdirectory
    const destSkillDir = join(this.claudeSkillsDir, skillName);
    const destReferencesDir = join(destSkillDir, 'references');
    await mkdir(destReferencesDir, { recursive: true });

    // Recursively copy all files from source to destination
    await this.copyDirectoryRecursive(sourceReferencesDir, destReferencesDir);
  }

  /**
   * Recursively copy directory contents
   */
  private async copyDirectoryRecursive(sourceDir: string, destDir: string): Promise<void> {
    const entries = await readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = join(sourceDir, entry.name);
      const destPath = join(destDir, entry.name);

      if (entry.isDirectory()) {
        await mkdir(destPath, { recursive: true });
        await this.copyDirectoryRecursive(sourcePath, destPath);
      } else {
        await copyFile(sourcePath, destPath);
      }
    }
  }

  /**
   * Sync skills to Claude Code's native skill directory
   */
  async syncToClaudeCode(): Promise<{
    added: string[];
    updated: string[];
    removed: string[];
    errors: string[];
  }> {
    const added: string[] = [];
    const updated: string[] = [];
    const removed: string[] = [];
    const errors: string[] = [];

    try {
      // Ensure Claude skills directory exists
      await mkdir(this.claudeSkillsDir, { recursive: true });

      // Track which skills should exist in Claude Code (files and directories)
      const expectedSkills = new Set<string>();

      // Sync enabled skills to Claude Code
      for (const skill of this.skills.values()) {
        try {
          const destPath = join(this.claudeSkillsDir, `${skill.metadata.name}.md`);
          expectedSkills.add(`${skill.metadata.name}.md`);
          expectedSkills.add(skill.metadata.name); // Track directory name for references

          // Build full skill file with frontmatter
          const frontmatter = [
            '---',
            `name: ${skill.metadata.name}`,
            `description: ${skill.metadata.description || ''}`,
          ];

          if (skill.metadata.autoTrigger?.length) {
            frontmatter.push(`auto_trigger: [${skill.metadata.autoTrigger.map(t => `"${t}"`).join(', ')}]`);
          }
          if (skill.metadata.domains?.length) {
            frontmatter.push(`domains: [${skill.metadata.domains.map(d => `"${d}"`).join(', ')}]`);
          }
          if (skill.metadata.model) {
            frontmatter.push(`model: ${skill.metadata.model}`);
          }
          if (skill.metadata.disableModelInvocation !== undefined) {
            frontmatter.push(`disable-model-invocation: ${skill.metadata.disableModelInvocation}`);
          }
          if (skill.metadata.userInvocable !== undefined) {
            frontmatter.push(`user-invocable: ${skill.metadata.userInvocable}`);
          }

          frontmatter.push('---', '');

          const fullContent = frontmatter.join('\n') + '\n' + skill.content;

          // Check if file exists
          const fileExists = existsSync(destPath);

          // Write to Claude skills directory
          await fsWriteFile(destPath, fullContent, 'utf8');

          // Sync references directory if it exists
          const skillSourceDir = dirname(skill.sourcePath);
          await this.syncSkillReferences(skill.metadata.name, skillSourceDir);

          if (fileExists) {
            updated.push(skill.metadata.name);
          } else {
            added.push(skill.metadata.name);
          }
        } catch (err) {
          errors.push(`${skill.metadata.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Clean up skills that were removed from claudeops
      if (existsSync(this.claudeSkillsDir)) {
        const existingEntries = await readdir(this.claudeSkillsDir, { withFileTypes: true });

        for (const entry of existingEntries) {
          // Skip if this entry is expected
          if (expectedSkills.has(entry.name)) continue;

          try {
            const entryPath = join(this.claudeSkillsDir, entry.name);

            if (entry.isDirectory()) {
              // Remove skill directory (references)
              const { rm } = await import('fs/promises');
              await rm(entryPath, { recursive: true, force: true });
              removed.push(entry.name);
            } else if (entry.name.endsWith('.md')) {
              // Remove skill file
              const { unlink } = await import('fs/promises');
              await unlink(entryPath);
              removed.push(entry.name.replace(/\.md$/, ''));
            }
          } catch (err) {
            errors.push(`Failed to remove ${entry.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      }
    } catch (err) {
      errors.push(`Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    return { added, updated, removed, errors };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a skill manager instance
 */
export function createSkillManager(options?: SkillManagerOptions): SkillManager {
  return new SkillManager(options);
}
