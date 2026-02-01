#!/usr/bin/env node
/**
 * learning-retriever - UserPromptSubmit Hook
 *
 * On each user prompt, checks .claude/learnings/ for relevant past learnings
 * matching current prompt keywords. Injects brief context about matching
 * learnings to help Claude avoid repeating past mistakes.
 *
 * Protocol: reads JSON from stdin, outputs context to stdout
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Extract search keywords from a user prompt
 * Focuses on technical terms likely to match learning tags/symptoms
 */
function extractKeywords(prompt) {
  if (!prompt || typeof prompt !== 'string') return [];

  const lower = prompt.toLowerCase();

  // Remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
    'not', 'no', 'so', 'if', 'then', 'that', 'this', 'it', 'its', 'my',
    'your', 'our', 'their', 'what', 'which', 'who', 'when', 'where', 'how',
    'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
    'there', 'please', 'help', 'me', 'i', 'we', 'you', 'he', 'she', 'they',
    'make', 'get', 'use', 'try', 'let', 'need', 'want', 'like', 'know',
  ]);

  // Extract words, filter stopwords, keep technical terms
  const words = lower
    .replace(/[^a-z0-9-_./]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  // Deduplicate and limit
  return [...new Set(words)].slice(0, 8);
}

/**
 * Quick scan of learning files for matching keywords
 * Only reads frontmatter (tags, symptoms) for speed
 */
function findRelevantLearnings(learningsDir, keywords) {
  const matches = [];
  const categoryDirs = [
    'build-errors', 'test-failures', 'type-errors',
    'runtime-errors', 'config-issues', 'patterns',
    'workarounds', 'conventions',
  ];

  for (const catDir of categoryDirs) {
    const dir = join(learningsDir, catDir);
    if (!existsSync(dir)) continue;

    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }

    for (const file of entries) {
      if (!file.endsWith('.md')) continue;

      try {
        const content = readFileSync(join(dir, file), 'utf8');

        // Quick frontmatter parse — just grab tags and symptoms
        const frontmatterEnd = content.indexOf('\n---', 4);
        if (frontmatterEnd === -1) continue;

        const frontmatter = content.slice(0, frontmatterEnd + 4).toLowerCase();

        // Check if any keywords match tags/symptoms/component
        let matchCount = 0;
        for (const kw of keywords) {
          if (frontmatter.includes(kw)) {
            matchCount++;
          }
        }

        if (matchCount >= 1) {
          // Extract just the essential info
          const nameMatch = frontmatter.match(/symptoms:\s*\n\s*-\s*"?([^"\n]+)"?/);
          const componentMatch = frontmatter.match(/component:\s*(.+)/);

          matches.push({
            file,
            category: catDir,
            symptom: nameMatch ? nameMatch[1].trim() : file.replace('.md', ''),
            component: componentMatch ? componentMatch[1].trim() : '',
            matchCount,
          });
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  // Sort by match count, limit to top 3
  return matches
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 3);
}

// Read input from stdin
let input;
try {
  const stdinData = readFileSync(0, 'utf8');
  input = JSON.parse(stdinData);
} catch {
  process.exit(0);
}

const cwd = input.cwd || process.cwd();
const prompt = input.user_prompt || input.prompt || '';

// Check for learnings directory
const learningsDir = join(cwd, '.claude', 'learnings');

if (!existsSync(learningsDir)) {
  process.exit(0);
}

// Extract keywords from prompt (if available)
const keywords = extractKeywords(prompt);

// If no prompt available, try to surface recent learnings
let matches;
if (keywords.length === 0) {
  // Fallback: find the 3 most recent learnings regardless of keywords
  const allLearnings = [];
  const categoryDirs = [
    'build-errors', 'test-failures', 'type-errors',
    'runtime-errors', 'config-issues', 'patterns',
    'workarounds', 'conventions',
  ];

  for (const catDir of categoryDirs) {
    const dir = join(learningsDir, catDir);
    if (!existsSync(dir)) continue;
    try {
      const entries = readdirSync(dir);
      for (const file of entries) {
        if (!file.endsWith('.md')) continue;
        try {
          const content = readFileSync(join(dir, file), 'utf8');
          const frontmatterEnd = content.indexOf('\n---', 4);
          if (frontmatterEnd === -1) continue;
          const frontmatter = content.slice(0, frontmatterEnd + 4);
          const dateMatch = frontmatter.match(/date:\s*(\S+)/);
          const nameMatch = frontmatter.match(/symptoms:\s*\n\s*-\s*"?([^"\n]+)"?/);
          const componentMatch = frontmatter.match(/component:\s*(.+)/);
          allLearnings.push({
            file,
            category: catDir,
            symptom: nameMatch ? nameMatch[1].trim() : file.replace('.md', ''),
            component: componentMatch ? componentMatch[1].trim() : '',
            date: dateMatch ? dateMatch[1] : '0000-00-00',
          });
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  matches = allLearnings
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
} else {
  matches = findRelevantLearnings(learningsDir, keywords);
}

if (matches.length === 0) {
  process.exit(0);
}

// Build context injection
const learningLines = matches.map(m => {
  const component = m.component ? ` [${m.component}]` : '';
  return `- ${m.symptom}${component} (see .claude/learnings/${m.category}/${m.file})`;
});

const output = {
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: `<past_learnings>\nRelevant learnings from previous sessions:\n${learningLines.join('\n')}\n</past_learnings>`
  }
};
console.log(JSON.stringify(output));
process.exit(0);
