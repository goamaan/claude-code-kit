/**
 * Scan command - Codebase analysis
 * cops scan [--json] [--generate] [--conventions]
 */

import { defineCommand } from 'citty';
import { resolve, join } from 'path';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { scan } from '../core/scanner/index.js';
import { detectConventions } from '../core/scanner/conventions.js';
import { exists, ensureDir, writeJson } from '../utils/fs.js';
import {
  generateProjectClaudeMd,
  generateProjectSettings,
  spliceManagedSection,
  MANAGED_START,
} from '../core/scanner/generator.js';
import { writeFile, readFile } from '../utils/fs.js';

export default defineCommand({
  meta: {
    name: 'scan',
    description: 'Scan codebase and display analysis',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
    generate: {
      type: 'boolean',
      description: 'Regenerate .claude/ artifacts from scan',
      default: false,
    },
    conventions: {
      type: 'boolean',
      description: 'Generate .claude/conventions.json only',
      default: false,
    },
    path: {
      type: 'string',
      description: 'Target directory to scan (defaults to cwd)',
    },
  },
  async run({ args }) {
    const targetPath = resolve(args.path ?? process.cwd());
    const s = prompts.spinner();

    // Scan
    s.start('Scanning codebase...');
    const scanResult = await scan({ path: targetPath });
    const conventions = detectConventions(scanResult);
    s.stop('Scan complete');

    // JSON output mode
    if (args.json) {
      output.json({ ...scanResult, conventions });
      return;
    }

    // Conventions-only mode
    if (args.conventions) {
      const projectClaudeDir = join(targetPath, '.claude');
      await ensureDir(projectClaudeDir);
      const convPath = join(projectClaudeDir, 'conventions.json');
      await writeJson(convPath, conventions);
      output.success(`Conventions written to ${convPath}`);
      return;
    }

    // Generate mode
    if (args.generate) {
      const projectClaudeDir = join(targetPath, '.claude');
      const claudeMdPath = join(projectClaudeDir, 'CLAUDE.md');
      const settingsPath = join(projectClaudeDir, 'settings.json');

      await ensureDir(projectClaudeDir);

      // Generate CLAUDE.md
      s.start('Generating .claude/CLAUDE.md...');
      const generatedMd = generateProjectClaudeMd(scanResult);

      if (await exists(claudeMdPath)) {
        const existing = await readFile(claudeMdPath);
        if (existing.includes(MANAGED_START)) {
          const spliced = spliceManagedSection(existing, generatedMd);
          if (spliced) {
            await writeFile(claudeMdPath, spliced);
            s.stop('.claude/CLAUDE.md updated');
          } else {
            s.stop('.claude/CLAUDE.md splice failed');
          }
        } else {
          await writeFile(claudeMdPath, generatedMd + '\n' + existing);
          s.stop('.claude/CLAUDE.md prepended');
        }
      } else {
        await writeFile(claudeMdPath, generatedMd);
        s.stop('.claude/CLAUDE.md created');
      }

      // Generate settings.json
      s.start('Generating .claude/settings.json...');
      const generatedSettings = generateProjectSettings(scanResult);
      if (generatedSettings) {
        await writeJson(settingsPath, generatedSettings);
        s.stop('.claude/settings.json created');
      } else {
        s.stop('.claude/settings.json skipped (no permissions)');
      }

      // Generate conventions.json
      const convPath = join(projectClaudeDir, 'conventions.json');
      await writeJson(convPath, conventions);
      output.success('conventions.json generated');

      return;
    }

    // Default: print summary
    output.header('Codebase Scan');
    output.kv('Path', scanResult.root);
    console.log();

    // Languages
    if (scanResult.languages.length > 0) {
      output.dim('  Languages:');
      for (const lang of scanResult.languages.slice(0, 5)) {
        output.kv(lang.name, `${lang.fileCount} files`, 2);
      }
      console.log();
    }

    // Frameworks
    if (scanResult.frameworks.length > 0) {
      output.dim('  Frameworks:');
      for (const fw of scanResult.frameworks) {
        output.kv(fw.name, fw.version || `(${fw.confidence})`, 2);
      }
      console.log();
    }

    // Build
    if (scanResult.build) {
      output.dim('  Build:');
      output.kv('Tool', scanResult.build.tool, 2);
      const scripts = Object.keys(scanResult.build.scripts);
      if (scripts.length > 0) {
        output.kv('Scripts', scripts.slice(0, 8).join(', '), 2);
      }
      console.log();
    }

    // Testing
    if (scanResult.testing.length > 0) {
      output.dim('  Testing:');
      for (const t of scanResult.testing) {
        output.kv(t.framework, t.configFile || '', 2);
      }
      console.log();
    }

    // Linting
    if (scanResult.linting.length > 0) {
      output.dim('  Linting:');
      for (const l of scanResult.linting) {
        output.kv(l.tool, l.configFile, 2);
      }
      console.log();
    }

    // Enhanced language info
    if (scanResult.python) {
      output.dim('  Python:');
      if (scanResult.python.version) output.kv('Version', scanResult.python.version, 2);
      if (scanResult.python.venvType) output.kv('Venv', scanResult.python.venvType, 2);
      if (scanResult.python.typeChecker) output.kv('Type checker', scanResult.python.typeChecker, 2);
      if (scanResult.python.packageLayout) output.kv('Layout', scanResult.python.packageLayout, 2);
      console.log();
    }

    if (scanResult.rust) {
      output.dim('  Rust:');
      if (scanResult.rust.edition) output.kv('Edition', scanResult.rust.edition, 2);
      if (scanResult.rust.workspace) output.kv('Workspace', 'yes', 2);
      if (scanResult.rust.features?.length) output.kv('Features', scanResult.rust.features.join(', '), 2);
      console.log();
    }

    if (scanResult.go) {
      output.dim('  Go:');
      if (scanResult.go.version) output.kv('Version', scanResult.go.version, 2);
      if (scanResult.go.modulePath) output.kv('Module', scanResult.go.modulePath, 2);
      if (scanResult.go.hasInternal) output.kv('Internal pkgs', 'yes', 2);
      console.log();
    }

    if (scanResult.java) {
      output.dim('  Java:');
      if (scanResult.java.buildTool) output.kv('Build', scanResult.java.buildTool, 2);
      if (scanResult.java.javaVersion) output.kv('Java version', scanResult.java.javaVersion, 2);
      if (scanResult.java.springBoot) output.kv('Spring Boot', 'yes', 2);
      console.log();
    }

    // Conventions
    output.dim('  Conventions:');
    output.kv('Imports', conventions.imports.style, 2);
    output.kv('Tests', `${conventions.tests.location} (${conventions.tests.pattern})`, 2);
    output.kv('Exports', conventions.exports.style, 2);
    output.kv('File naming', conventions.naming.files, 2);
    console.log();

    // CI
    if (scanResult.ci.length > 0) {
      output.dim('  CI/CD:');
      for (const ci of scanResult.ci) {
        output.kv(ci.platform, ci.configFile, 2);
      }
      console.log();
    }

    // Database
    if (scanResult.database.length > 0) {
      output.dim('  Database:');
      for (const db of scanResult.database) {
        output.kv(db.type, db.orm || '', 2);
      }
      console.log();
    }

    output.dim(`  Use --json for machine-readable output`);
    output.dim(`  Use --generate to regenerate .claude/ artifacts`);
    output.dim(`  Use --conventions to generate .claude/conventions.json`);
  },
});
