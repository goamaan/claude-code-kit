/**
 * Scan command - Deterministic codebase analysis
 * cops scan [--path <dir>] [--json]
 */

import { defineCommand } from 'citty';
import pc from 'picocolors';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { scan } from '../core/scanner/index.js';

export default defineCommand({
  meta: {
    name: 'scan',
    description: 'Analyze a codebase and output structured scan results',
  },
  args: {
    path: {
      type: 'string',
      description: 'Target directory to scan (defaults to current directory)',
    },
    json: {
      type: 'boolean',
      description: 'Output raw scan result as JSON (for skill consumption)',
      default: false,
    },
  },
  async run({ args }) {
    const targetPath = args.path ?? process.cwd();

    if (args.json) {
      // JSON mode: output raw scan result for programmatic consumption
      const result = await scan({ path: targetPath });
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // Interactive mode: pretty-print scan results
    prompts.intro('Codebase Scan');

    const s = prompts.spinner();
    s.start('Scanning codebase...');

    const result = await scan({ path: targetPath });

    s.stop('Scan complete');

    // Languages
    if (result.languages.length > 0) {
      output.header('Languages');
      for (const lang of result.languages) {
        output.kv(lang.name, `${lang.fileCount} files (${lang.extensions.join(', ')})`);
      }
      console.log();
    }

    // Frameworks
    if (result.frameworks.length > 0) {
      output.header('Frameworks');
      for (const fw of result.frameworks) {
        const version = fw.version ? ` ${pc.dim(fw.version)}` : '';
        output.kv(fw.name, `${version} ${pc.dim(`[${fw.confidence}] via ${fw.source}`)}`);
      }
      console.log();
    }

    // Build
    if (result.build) {
      output.header('Build System');
      output.kv('Tool', `${result.build.tool} (${result.build.source})`);
      const scripts = Object.keys(result.build.scripts);
      if (scripts.length > 0) {
        const keyScripts = scripts.filter(s =>
          ['build', 'test', 'lint', 'dev', 'start', 'typecheck', 'format', 'verify'].includes(s)
        );
        if (keyScripts.length > 0) {
          output.kv('Key scripts', keyScripts.join(', '));
        }
      }
      console.log();
    }

    // Testing
    if (result.testing.length > 0) {
      output.header('Testing');
      for (const test of result.testing) {
        output.kv(test.framework, `${test.configFile ?? ''}${test.testDirs.length > 0 ? ` (${test.testDirs.join(', ')})` : ''}`);
      }
      console.log();
    }

    // Linting
    if (result.linting.length > 0) {
      output.header('Linting/Formatting');
      for (const lint of result.linting) {
        output.kv(lint.tool, lint.configFile);
      }
      console.log();
    }

    // CI/CD
    if (result.ci.length > 0) {
      output.header('CI/CD');
      for (const ci of result.ci) {
        output.kv(ci.platform, ci.configFile);
      }
      console.log();
    }

    // Database
    if (result.database.length > 0) {
      output.header('Database');
      for (const db of result.database) {
        const details = [db.type, db.orm, db.migrationDir].filter(Boolean).join(' / ');
        output.kv(db.orm ?? db.type, details);
      }
      console.log();
    }

    // API
    if (result.api.length > 0) {
      output.header('API Style');
      for (const api of result.api) {
        output.kv(api.style, api.evidence.join(', '));
      }
      console.log();
    }

    // Monorepo
    if (result.monorepo) {
      output.header('Monorepo');
      output.kv('Tool', result.monorepo.tool);
      if (result.monorepo.packages.length > 0) {
        output.kv('Packages', result.monorepo.packages.join(', '));
      }
      console.log();
    }

    // Directory Structure
    if (result.directories.length > 0) {
      output.header('Directory Structure');
      output.dim(`  ${result.directories.join('  ')}`);
      console.log();
    }

    // Existing .claude/ config
    output.header('Existing .claude/ Configuration');
    output.kv('.claude/ directory', result.existingConfig.hasClaudeDir ? 'yes' : 'no');
    output.kv('CLAUDE.md', result.existingConfig.hasClaudeMd ? 'yes' : 'no');
    output.kv('settings.json', result.existingConfig.hasSettings ? 'yes' : 'no');
    if (result.existingConfig.hasSkills) {
      output.kv('Skills', result.existingConfig.skillNames.join(', ') || 'none');
    }
    console.log();

    // Key Files
    if (result.keyFiles.length > 0) {
      output.header('Key Files');
      for (const kf of result.keyFiles) {
        output.kv(kf.type, kf.path);
      }
      console.log();
    }

    // Guidance
    output.header('Next Steps');
    output.info('Use /scan in Claude Code to generate .claude/ artifacts from this analysis');
    output.dim('  Or run: cops scan --json | claude --pipe "Generate .claude/ artifacts from this scan"');

    prompts.outro('Scan complete');
  },
});
