/**
 * Pack Analyzer - AI-powered repository analysis
 * Uses Claude to analyze and classify code repositories
 */

import { mkdir, readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import type { PackAnalysis, PackType, PackComponent } from './types.js';

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE = 100000; // 100KB
const MAX_FILES_TO_ANALYZE = 50;
const ANALYSIS_EXTENSIONS = ['.ts', '.js', '.md', '.json', '.toml', '.yaml', '.yml', '.sh'];

// =============================================================================
// Error Types
// =============================================================================

export class PackAnalysisError extends Error {
  constructor(
    message: string,
    public readonly source?: string,
    cause?: unknown
  ) {
    super(message, { cause });
    this.name = 'PackAnalysisError';
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function execCommand(command: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code ?? 0 });
    });

    proc.on('error', (err) => {
      resolve({ stdout, stderr: err.message, code: 1 });
    });
  });
}

async function collectRepoFiles(repoPath: string): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];

  async function scanDir(dir: string, relativePath = ''): Promise<void> {
    if (files.length >= MAX_FILES_TO_ANALYZE) return;

    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (files.length >= MAX_FILES_TO_ANALYZE) break;

      const fullPath = join(dir, entry.name);
      const relPath = join(relativePath, entry.name);

      // Skip common ignore patterns
      if (entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === 'build') {
        continue;
      }

      if (entry.isDirectory()) {
        await scanDir(fullPath, relPath);
      } else if (entry.isFile()) {
        const ext = entry.name.substring(entry.name.lastIndexOf('.'));
        if (ANALYSIS_EXTENSIONS.includes(ext)) {
          try {
            const stats = await readFile(fullPath, 'utf-8');
            if (stats.length <= MAX_FILE_SIZE) {
              files.push({
                path: relPath,
                content: stats.slice(0, MAX_FILE_SIZE),
              });
            }
          } catch {
            // Skip files we can't read
          }
        }
      }
    }
  }

  await scanDir(repoPath);
  return files;
}

function buildAnalysisPrompt(repoName: string, files: { path: string; content: string }[]): string {
  const fileList = files.map(f => f.path).join('\n');
  const sampleFiles = files.slice(0, 10).map(f =>
    `--- ${f.path} ---\n${f.content.slice(0, 2000)}`
  ).join('\n\n');

  return `Analyze this repository and classify what kind of pack it is.

Repository: ${repoName}

File structure:
${fileList}

Sample file contents:
${sampleFiles}

Please analyze this repository and provide a JSON response with the following structure:
{
  "type": "agent-pack" | "skill-pack" | "hook-pack" | "mcp-server" | "guardrail" | "rules" | "mixed",
  "description": "Brief description of what this pack does",
  "components": [
    {
      "type": "agent" | "skill" | "hook" | "rule" | "mcp" | "script",
      "name": "component name",
      "path": "relative/path/to/file",
      "description": "what this component does",
      "model": "haiku" | "sonnet" | "opus" (optional, for agents),
      "dependencies": ["dep1", "dep2"] (optional)
    }
  ],
  "requirements": {
    "npm": ["package1", "package2"],
    "mcp": ["server1"],
    "env": ["ENV_VAR1", "ENV_VAR2"]
  },
  "installInstructions": "How to install and configure this pack",
  "confidence": 0.0-1.0
}

Guidelines:
- agent-pack: Contains AI agent definitions (.md files with agent instructions)
- skill-pack: Contains reusable skill snippets/templates
- hook-pack: Contains lifecycle hooks (PreToolUse, PostToolUse, etc.)
- mcp-server: Model Context Protocol server implementation
- guardrail: Safety/security checks and validations
- rules: CLAUDE.md style rules and instructions
- mixed: Contains multiple types of components

Be thorough in identifying all components and their purposes.`;
}

// =============================================================================
// Analyzer Implementation
// =============================================================================

export interface PackAnalyzer {
  /**
   * Analyze a repository from a GitHub URL or local path
   */
  analyze(source: string): Promise<PackAnalysis>;

  /**
   * Analyze using mock data (for testing without API key)
   */
  analyzeMock(source: string): Promise<PackAnalysis>;
}

class PackAnalyzerImpl implements PackAnalyzer {
  private anthropicApiKey?: string;

  constructor() {
    this.anthropicApiKey = process.env['ANTHROPIC_API_KEY'];
  }

  async analyze(source: string): Promise<PackAnalysis> {
    // Determine if source is GitHub URL or local path
    let repoPath: string;
    let repoName: string;
    let isTemp = false;

    if (source.includes('github.com') || source.includes('/')) {
      // GitHub repository
      const tempDir = join(tmpdir(), `claudeops-pack-${randomUUID()}`);
      await mkdir(tempDir, { recursive: true });

      try {
        // Clone repository
        const gitUrl = source.startsWith('http') ? source : `https://github.com/${source}`;
        const cloneResult = await execCommand(
          'git',
          ['clone', '--depth', '1', gitUrl, tempDir],
          tempDir
        );

        if (cloneResult.code !== 0) {
          throw new PackAnalysisError(
            `Failed to clone repository: ${cloneResult.stderr}`,
            source
          );
        }

        repoPath = tempDir;
        repoName = source.split('/').pop()?.replace('.git', '') ?? 'unknown';
        isTemp = true;
      } catch (err) {
        throw new PackAnalysisError(
          `Failed to access repository: ${err instanceof Error ? err.message : String(err)}`,
          source,
          err
        );
      }
    } else {
      // Local path
      repoPath = source;
      repoName = source.split('/').pop() ?? 'local-pack';
    }

    try {
      // Collect repository files
      const files = await collectRepoFiles(repoPath);

      if (files.length === 0) {
        throw new PackAnalysisError(
          'No analyzable files found in repository',
          source
        );
      }

      // Use AI to analyze if API key available, otherwise mock
      let analysis: PackAnalysis;
      if (this.anthropicApiKey) {
        analysis = await this.analyzeWithAI(repoName, source, files);
      } else {
        console.warn('ANTHROPIC_API_KEY not set, using mock analysis');
        analysis = await this.analyzeMock(source);
      }

      return analysis;
    } finally {
      // Cleanup temp directory if created
      if (isTemp) {
        try {
          await execCommand('rm', ['-rf', repoPath], dirname(repoPath));
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  private async analyzeWithAI(
    repoName: string,
    source: string,
    files: { path: string; content: string }[]
  ): Promise<PackAnalysis> {
    const _prompt = buildAnalysisPrompt(repoName, files);

    // Note: This would use the Anthropic SDK if available
    // For now, we'll use a simplified mock implementation
    // Real implementation would call:
    // const response = await anthropic.messages.create({
    //   model: 'claude-sonnet-4-20250514',
    //   messages: [{ role: 'user', content: _prompt }],
    //   max_tokens: 2048,
    // });

    // Fallback to mock for now
    console.warn('AI analysis not yet fully implemented, using mock');
    return this.analyzeMock(source);
  }

  async analyzeMock(source: string): Promise<PackAnalysis> {
    const name = source.split('/').pop()?.replace('.git', '') ?? 'unknown-pack';

    // Simple heuristic-based analysis
    let type: PackType = 'mixed';
    let components: PackComponent[] = [];

    // Try to detect from directory name or common patterns
    if (name.includes('agent')) {
      type = 'agent-pack';
      components = [{
        type: 'agent',
        name: name,
        path: 'agent.md',
        description: 'AI agent definition',
        model: 'sonnet',
      }];
    } else if (name.includes('hook')) {
      type = 'hook-pack';
      components = [{
        type: 'hook',
        name: name,
        path: 'hook.ts',
        description: 'Lifecycle hook',
      }];
    } else if (name.includes('skill')) {
      type = 'skill-pack';
      components = [{
        type: 'skill',
        name: name,
        path: 'skill.md',
        description: 'Reusable skill',
      }];
    } else if (name.includes('mcp')) {
      type = 'mcp-server';
      components = [{
        type: 'mcp',
        name: name,
        path: 'index.ts',
        description: 'MCP server',
      }];
    }

    return {
      name,
      source,
      type,
      description: `Mock analysis for ${name}`,
      components,
      requirements: {
        npm: [],
        mcp: [],
        env: [],
      },
      installInstructions: 'Run installation to copy components to appropriate directories',
      confidence: 0.5,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a pack analyzer instance
 */
export function createPackAnalyzer(): PackAnalyzer {
  return new PackAnalyzerImpl();
}
