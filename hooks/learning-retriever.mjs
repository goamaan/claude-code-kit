/**
 * Hook: learning-retriever
 * Event: UserPromptSubmit
 * Description: Retrieves relevant past learnings and injects them as context
 * Matcher: *
 * Enabled: true
 *
 * learning-retriever - UserPromptSubmit Hook
 *
 * On each user prompt, checks .claude/learnings/ for relevant past learnings
 * matching current prompt keywords. Injects brief context about matching
 * learnings to help Claude avoid repeating past mistakes.
 *
 * Hook type: UserPromptSubmit
 * Triggers: Before user prompt is submitted to Claude
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

/**
 * Main hook function
 */
export default async function learningRetrieverHook(context) {
  const { prompt } = context;

  if (!prompt || typeof prompt !== 'string') {
    return { decision: 'allow' };
  }

  // Check for learnings directory
  const cwd = process.cwd();
  const learningsDir = join(cwd, '.claude', 'learnings');

  if (!existsSync(learningsDir)) {
    return { decision: 'allow' };
  }

  // Extract keywords
  const keywords = extractKeywords(prompt);
  if (keywords.length === 0) {
    return { decision: 'allow' };
  }

  // Search for matching learnings
  const matches = findRelevantLearnings(learningsDir, keywords);

  if (matches.length === 0) {
    return { decision: 'allow' };
  }

  // Build context injection
  const learningLines = matches.map(m => {
    const component = m.component ? ` [${m.component}]` : '';
    return `- ${m.symptom}${component} (see .claude/learnings/${m.category}/${m.file})`;
  });

  const injection = `\n\n<past_learnings>\nRelevant learnings from previous sessions:\n${learningLines.join('\n')}\n</past_learnings>`;

  return {
    decision: 'allow',
    modifiedPrompt: prompt + injection,
    metadata: {
      learningsMatched: matches.length,
      keywords: keywords.slice(0, 5),
    },
  };
}
