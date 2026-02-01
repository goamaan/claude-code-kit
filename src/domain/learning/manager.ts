/**
 * Learning Manager
 * Handles reading, writing, listing, searching, and evolving learnings
 */

import { readdir, readFile, writeFile, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type {
  Learning,
  LearningFile,
  LearningSchema,
  LearningManagerOptions,
  LearningCategory,
  ResolutionType,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_SCHEMA: LearningSchema = {
  version: 1,
  generatedFrom: 'manual',
  categories: [
    'build-error',
    'test-failure',
    'type-error',
    'runtime-error',
    'config-issue',
    'pattern',
    'workaround',
    'convention',
  ],
  components: [],
  rootCauses: [],
  resolutionTypes: [
    'code-fix',
    'config-change',
    'dependency-update',
    'workaround',
    'refactor',
    'documentation',
  ],
};

const CATEGORY_DIRS: Record<string, string> = {
  'build-error': 'build-errors',
  'test-failure': 'test-failures',
  'type-error': 'type-errors',
  'runtime-error': 'runtime-errors',
  'config-issue': 'config-issues',
  'pattern': 'patterns',
  'workaround': 'workarounds',
  'convention': 'conventions',
};

// =============================================================================
// Learning Manager
// =============================================================================

export class LearningManager {
  private learningsDir: string;

  constructor(options: LearningManagerOptions) {
    this.learningsDir = options.learningsDir;
  }

  /**
   * Ensure the learnings directory structure exists
   */
  async ensureStructure(): Promise<void> {
    await mkdir(this.learningsDir, { recursive: true });
    for (const dir of Object.values(CATEGORY_DIRS)) {
      await mkdir(join(this.learningsDir, dir), { recursive: true });
    }
  }

  /**
   * List all learning files
   */
  async list(): Promise<LearningFile[]> {
    if (!existsSync(this.learningsDir)) {
      return [];
    }

    const learnings: LearningFile[] = [];

    for (const [_category, dir] of Object.entries(CATEGORY_DIRS)) {
      const catDir = join(this.learningsDir, dir);
      if (!existsSync(catDir)) continue;

      const entries = await readdir(catDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

        const filePath = join(catDir, entry.name);
        try {
          const content = await readFile(filePath, 'utf8');
          const learning = parseLearningFile(content);
          if (learning) {
            learnings.push({
              fileName: entry.name,
              filePath,
              learning,
            });
          }
        } catch {
          // Skip unparseable files
        }
      }
    }

    // Also check root patterns file
    const patternsFile = join(this.learningsDir, 'patterns', 'critical-patterns.md');
    if (existsSync(patternsFile)) {
      try {
        const content = await readFile(patternsFile, 'utf8');
        // Critical patterns is a special file, only include if it has frontmatter
        const learning = parseLearningFile(content);
        if (learning) {
          learnings.push({
            fileName: 'critical-patterns.md',
            filePath: patternsFile,
            learning,
          });
        }
      } catch {
        // Skip
      }
    }

    return learnings;
  }

  /**
   * Get a specific learning by filename
   */
  async get(fileName: string): Promise<LearningFile | null> {
    const all = await this.list();
    return all.find(l => l.fileName === fileName) || null;
  }

  /**
   * Save a new learning
   */
  async save(learning: Learning): Promise<string> {
    await this.ensureStructure();

    const categoryDir = CATEGORY_DIRS[learning.category] || 'patterns';
    const dir = join(this.learningsDir, categoryDir);
    await mkdir(dir, { recursive: true });

    // Generate filename from symptoms and date
    const slug = learning.symptoms[0]
      ? learning.symptoms[0]
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40)
      : 'learning';
    const date = learning.date.split('T')[0];
    const fileName = `${slug}-${date}.md`;
    const filePath = join(dir, fileName);

    const content = formatLearning(learning);
    await writeFile(filePath, content, 'utf8');

    return filePath;
  }

  /**
   * Search learnings by keywords
   */
  async search(keywords: string[]): Promise<LearningFile[]> {
    const all = await this.list();
    const lowerKeywords = keywords.map(k => k.toLowerCase());

    return all.filter(l => {
      const searchText = [
        ...l.learning.tags,
        ...l.learning.symptoms,
        l.learning.component,
        l.learning.rootCause,
        l.learning.problem,
      ]
        .join(' ')
        .toLowerCase();

      return lowerKeywords.some(kw => searchText.includes(kw));
    });
  }

  /**
   * Clear all learnings
   */
  async clear(): Promise<number> {
    if (!existsSync(this.learningsDir)) {
      return 0;
    }

    let count = 0;
    for (const dir of Object.values(CATEGORY_DIRS)) {
      const catDir = join(this.learningsDir, dir);
      if (!existsSync(catDir)) continue;

      const entries = await readdir(catDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          await rm(join(catDir, entry.name));
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Evolve learnings into project-specific skills
   * Groups learnings by shared tags and generates SKILL.md files
   */
  async evolve(skillsDir: string): Promise<{ name: string; path: string; learningCount: number }[]> {
    const all = await this.list();
    if (all.length < 3) {
      return []; // Need at least 3 learnings to evolve
    }

    // Group by tags
    const tagGroups: Record<string, LearningFile[]> = {};
    for (const learning of all) {
      for (const tag of learning.learning.tags) {
        if (!tagGroups[tag]) {
          tagGroups[tag] = [];
        }
        tagGroups[tag].push(learning);
      }
    }

    // Find clusters with 3+ entries
    const clusters: { tag: string; learnings: LearningFile[] }[] = [];
    for (const [tag, learnings] of Object.entries(tagGroups)) {
      if (learnings.length >= 3) {
        clusters.push({ tag, learnings });
      }
    }

    if (clusters.length === 0) {
      return [];
    }

    // Generate skills from clusters
    const generated: { name: string; path: string; learningCount: number }[] = [];
    await mkdir(skillsDir, { recursive: true });

    for (const cluster of clusters) {
      const skillName = `project-${cluster.tag}`;
      const skillDir = join(skillsDir, skillName);
      await mkdir(skillDir, { recursive: true });

      const skillContent = generateSkillFromCluster(cluster.tag, cluster.learnings);
      const skillPath = join(skillDir, 'SKILL.md');
      await writeFile(skillPath, skillContent, 'utf8');

      generated.push({
        name: skillName,
        path: skillPath,
        learningCount: cluster.learnings.length,
      });
    }

    return generated;
  }

  /**
   * Read the learnings schema
   */
  async getSchema(): Promise<LearningSchema> {
    const schemaPath = join(this.learningsDir, 'schema.json');
    if (!existsSync(schemaPath)) {
      return DEFAULT_SCHEMA;
    }

    try {
      const content = await readFile(schemaPath, 'utf8');
      return JSON.parse(content) as LearningSchema;
    } catch {
      return DEFAULT_SCHEMA;
    }
  }

  /**
   * Write a learnings schema
   */
  async saveSchema(schema: LearningSchema): Promise<void> {
    await this.ensureStructure();
    const schemaPath = join(this.learningsDir, 'schema.json');
    await writeFile(schemaPath, JSON.stringify(schema, null, 2), 'utf8');
  }
}

// =============================================================================
// Parsing
// =============================================================================

/**
 * Parse a learning markdown file with YAML frontmatter
 */
export function parseLearningFile(content: string): Learning | null {
  const lines = content.split('\n');
  if (lines[0]?.trim() !== '---') return null;

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) return null;

  // Parse frontmatter
  const frontmatter: Record<string, string> = {};
  const arrayFields: Record<string, string[]> = {};

  for (const line of lines.slice(1, endIndex)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();

    // Handle array values: [item1, item2]
    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      const inner = rawValue.slice(1, -1);
      arrayFields[key] = inner
        .split(',')
        .map(s => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      frontmatter[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }

  // Parse body sections
  const body = lines.slice(endIndex + 1).join('\n');
  const sections = parseMarkdownSections(body);

  return {
    date: frontmatter['date'] || new Date().toISOString(),
    category: (frontmatter['category'] || 'pattern') as LearningCategory,
    component: frontmatter['component'] || '',
    symptoms: arrayFields['symptoms'] || [],
    rootCause: frontmatter['root_cause'] || '',
    resolution: (frontmatter['resolution'] || 'code-fix') as ResolutionType,
    tags: arrayFields['tags'] || [],
    confidence: parseFloat(frontmatter['confidence'] || '0.5'),
    problem: sections['Problem'] || '',
    solution: sections['Solution'] || '',
    why: sections['Why'] || '',
  };
}

/**
 * Parse markdown into sections by ## headers
 */
function parseMarkdownSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let currentSection = '';
  let currentContent: string[] = [];

  for (const line of content.split('\n')) {
    if (line.startsWith('## ')) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = line.slice(3).trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentSection) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

// =============================================================================
// Formatting
// =============================================================================

/**
 * Format a learning as a markdown file with frontmatter
 */
export function formatLearning(learning: Learning): string {
  const lines: string[] = [
    '---',
    `date: ${learning.date}`,
    `category: ${learning.category}`,
    `component: ${learning.component}`,
    `symptoms:`,
  ];

  for (const symptom of learning.symptoms) {
    lines.push(`  - "${symptom}"`);
  }

  lines.push(
    `root_cause: ${learning.rootCause}`,
    `resolution: ${learning.resolution}`,
    `tags: [${learning.tags.join(', ')}]`,
    `confidence: ${learning.confidence}`,
    '---',
    '',
    '## Problem',
    learning.problem,
    '',
    '## Solution',
    learning.solution,
    '',
    '## Why',
    learning.why,
    '',
  );

  return lines.join('\n');
}

/**
 * Generate a SKILL.md from a cluster of learnings
 */
function generateSkillFromCluster(tag: string, learnings: LearningFile[]): string {
  const patterns = learnings.map(l => {
    return `### ${l.learning.symptoms[0] || 'Pattern'}\n\n**Problem:** ${l.learning.problem}\n\n**Solution:** ${l.learning.solution}\n`;
  });

  return `---
name: project-${tag}
description: Project-specific patterns for ${tag} (auto-generated from ${learnings.length} learnings)
license: MIT
metadata:
  author: claudeops-learning
  version: "1.0.0"
  claudeops:
    triggers: [${tag}]
    domains: [general]
    alwaysActive: true
---

# Project Patterns: ${tag}

These patterns were automatically distilled from ${learnings.length} session learnings.

${patterns.join('\n---\n\n')}
`;
}

// =============================================================================
// Factory
// =============================================================================

export function createLearningManager(options?: Partial<LearningManagerOptions>): LearningManager {
  const learningsDir = options?.learningsDir || join(process.cwd(), '.claude', 'learnings');
  return new LearningManager({ learningsDir });
}
