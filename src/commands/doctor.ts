/**
 * Doctor command
 * cops doctor [--fix] [--json]
 * Diagnoses and optionally fixes configuration issues
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { loadConfig } from '../core/config/loader.js';
import { createProfileManager } from '../domain/profile/manager.js';
import { listInstalledAddons } from '../domain/addon/manager.js';
import { getClaudeDir, getGlobalConfigDir } from '../utils/paths.js';
import { exists, ensureDir, writeFile } from '../utils/fs.js';
import { join } from 'node:path';
import { VERSION } from '../index.js';
import type { DiagnosticResult, DiagnosticReport, DiagnosticCategory } from '../types/diagnostic.js';

// =============================================================================
// Diagnostic Checks
// =============================================================================

type DiagnosticCheck = () => Promise<DiagnosticResult>;

const checks: Record<string, DiagnosticCheck> = {
  // Installation checks
  'installation:claudeops-dir': async () => {
    const start = Date.now();
    const configDir = getGlobalConfigDir();
    const dirExists = await exists(configDir);

    return {
      id: 'installation:claudeops-dir',
      name: 'claudeops directory',
      category: 'installation',
      severity: dirExists ? 'info' : 'warning',
      passed: dirExists,
      description: 'Check if ~/.claudeops directory exists',
      message: dirExists
        ? `Found: ${configDir}`
        : `Missing: ${configDir}`,
      suggestions: dirExists ? undefined : [
        'Run: cops config init',
        'Or: mkdir -p ~/.claudeops',
      ],
      fixAvailable: !dirExists,
      fixId: dirExists ? undefined : 'fix:create-config-dir',
      duration: Date.now() - start,
    };
  },

  'installation:claude-dir': async () => {
    const start = Date.now();
    const claudeDir = getClaudeDir();
    const dirExists = await exists(claudeDir);

    return {
      id: 'installation:claude-dir',
      name: 'Claude directory',
      category: 'installation',
      severity: dirExists ? 'info' : 'error',
      passed: dirExists,
      description: 'Check if ~/.claude directory exists',
      message: dirExists
        ? `Found: ${claudeDir}`
        : `Missing: ${claudeDir}`,
      suggestions: dirExists ? undefined : [
        'Ensure Claude Code is installed',
        'Run Claude Code at least once to create the directory',
      ],
      fixAvailable: false,
      duration: Date.now() - start,
    };
  },

  'installation:node-version': async () => {
    const start = Date.now();
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0] ?? '0');
    const minVersion = 20;
    const passed = majorVersion >= minVersion;

    return {
      id: 'installation:node-version',
      name: 'Node.js version',
      category: 'installation',
      severity: passed ? 'info' : 'error',
      passed,
      description: `Check if Node.js is at least v${minVersion}`,
      message: passed
        ? `Node.js ${nodeVersion} (OK)`
        : `Node.js ${nodeVersion} is below required v${minVersion}`,
      suggestions: passed ? undefined : [
        `Upgrade Node.js to v${minVersion} or later`,
        'Use nvm: nvm install 20 && nvm use 20',
      ],
      fixAvailable: false,
      duration: Date.now() - start,
    };
  },

  // Configuration checks
  'configuration:config-valid': async () => {
    const start = Date.now();
    let passed = true;
    let message = 'Configuration loaded successfully';
    const errors: string[] = [];

    try {
      await loadConfig();
    } catch (err) {
      passed = false;
      message = 'Configuration has errors';
      errors.push(err instanceof Error ? err.message : String(err));
    }

    return {
      id: 'configuration:config-valid',
      name: 'Configuration validity',
      category: 'configuration',
      severity: passed ? 'info' : 'error',
      passed,
      description: 'Validate configuration files',
      message,
      suggestions: passed ? undefined : [
        'Run: cops config validate',
        'Check TOML syntax in config files',
        ...errors,
      ],
      fixAvailable: false,
      duration: Date.now() - start,
    };
  },

  'configuration:active-profile': async () => {
    const start = Date.now();
    const profileManager = createProfileManager();
    let passed = true;
    let message = '';

    try {
      const activeProfile = await profileManager.active();
      const profileExists = await profileManager.get(activeProfile).then(() => true).catch(() => false);

      if (profileExists) {
        message = `Active profile: ${activeProfile}`;
      } else {
        passed = false;
        message = `Active profile "${activeProfile}" does not exist`;
      }
    } catch (err) {
      passed = false;
      message = err instanceof Error ? err.message : String(err);
    }

    return {
      id: 'configuration:active-profile',
      name: 'Active profile',
      category: 'profiles',
      severity: passed ? 'info' : 'warning',
      passed,
      description: 'Check if active profile exists',
      message,
      suggestions: passed ? undefined : [
        'Run: cops profile list',
        'Run: cops profile create default',
      ],
      fixAvailable: false,
      duration: Date.now() - start,
    };
  },

  // Permissions checks
  'permissions:config-writable': async () => {
    const start = Date.now();
    const configDir = getGlobalConfigDir();
    let passed = false;
    let message = '';

    try {
      await ensureDir(configDir);
      const testFile = join(configDir, '.write-test');
      await writeFile(testFile, 'test');
      const { unlink } = await import('node:fs/promises');
      await unlink(testFile);
      passed = true;
      message = `${configDir} is writable`;
    } catch (err) {
      message = `Cannot write to ${configDir}: ${err instanceof Error ? err.message : err}`;
    }

    return {
      id: 'permissions:config-writable',
      name: 'Config directory writable',
      category: 'permissions',
      severity: passed ? 'info' : 'error',
      passed,
      description: 'Check if config directory is writable',
      message,
      suggestions: passed ? undefined : [
        `Check permissions: ls -la ${configDir}`,
        `Fix permissions: chmod 755 ${configDir}`,
      ],
      fixAvailable: false,
      duration: Date.now() - start,
    };
  },

  // Addons checks
  'addons:manifests-valid': async () => {
    const start = Date.now();
    const addons = await listInstalledAddons();
    const invalidAddons: string[] = [];

    for (const addon of addons) {
      if (!addon.manifest.name || !addon.manifest.version) {
        invalidAddons.push(addon.manifest.name ?? addon.path);
      }
    }

    const passed = invalidAddons.length === 0;

    return {
      id: 'addons:manifests-valid',
      name: 'Addon manifests',
      category: 'addons',
      severity: passed ? 'info' : 'warning',
      passed,
      description: 'Validate installed addon manifests',
      message: passed
        ? `${addons.length} addon(s) validated`
        : `${invalidAddons.length} addon(s) have invalid manifests`,
      suggestions: passed ? undefined : [
        ...invalidAddons.map(a => `Check manifest for: ${a}`),
      ],
      fixAvailable: false,
      duration: Date.now() - start,
    };
  },

  // MCP checks
  'mcp:settings-valid': async () => {
    const start = Date.now();
    const settingsPath = join(getClaudeDir(), 'claude_desktop_config.json');
    let passed = true;
    let message = '';

    if (!(await exists(settingsPath))) {
      message = 'No claude_desktop_config.json found (OK - optional)';
    } else {
      try {
        const { readFile } = await import('../utils/fs.js');
        const content = await readFile(settingsPath);
        JSON.parse(content);
        message = 'claude_desktop_config.json is valid JSON';
      } catch (err) {
        passed = false;
        message = `Invalid JSON in claude_desktop_config.json: ${err instanceof Error ? err.message : err}`;
      }
    }

    return {
      id: 'mcp:settings-valid',
      name: 'MCP settings file',
      category: 'mcp',
      severity: passed ? 'info' : 'error',
      passed,
      description: 'Validate MCP settings file',
      message,
      suggestions: passed ? undefined : [
        'Check JSON syntax in ~/.claude/claude_desktop_config.json',
        'Use a JSON validator to find errors',
      ],
      fixAvailable: false,
      duration: Date.now() - start,
    };
  },

  // Hooks checks
  'hooks:settings-valid': async () => {
    const start = Date.now();
    const settingsPath = join(getClaudeDir(), 'settings.json');
    let passed = true;
    let message = '';
    const issues: string[] = [];

    if (!(await exists(settingsPath))) {
      message = 'No settings.json found (OK - will be created on sync)';
    } else {
      try {
        const { readFile } = await import('../utils/fs.js');
        const content = await readFile(settingsPath);
        const settings = JSON.parse(content) as { hooks?: Record<string, unknown[]> };

        if (settings.hooks) {
          // Validate hook structure
          for (const [event, handlers] of Object.entries(settings.hooks)) {
            if (!Array.isArray(handlers)) {
              issues.push(`${event}: handlers must be an array`);
            } else {
              for (let i = 0; i < handlers.length; i++) {
                const h = handlers[i] as { matcher?: string; command?: string };
                if (!h.matcher) issues.push(`${event}[${i}]: missing matcher`);
                if (!h.command) issues.push(`${event}[${i}]: missing command`);
              }
            }
          }
        }

        passed = issues.length === 0;
        message = passed
          ? 'settings.json hooks are valid'
          : `Found ${issues.length} issue(s) in hooks`;
      } catch (err) {
        passed = false;
        message = `Invalid JSON in settings.json: ${err instanceof Error ? err.message : err}`;
      }
    }

    return {
      id: 'hooks:settings-valid',
      name: 'Hooks settings',
      category: 'hooks',
      severity: passed ? 'info' : 'warning',
      passed,
      description: 'Validate hooks in settings.json',
      message,
      suggestions: passed ? undefined : issues,
      fixAvailable: false,
      duration: Date.now() - start,
    };
  },
};

// =============================================================================
// Fixes
// =============================================================================

type FixFunction = () => Promise<boolean>;

const fixes: Record<string, FixFunction> = {
  'fix:create-config-dir': async () => {
    const configDir = getGlobalConfigDir();
    await ensureDir(configDir);
    return true;
  },
};

// =============================================================================
// Run Diagnostics
// =============================================================================

async function runDiagnostics(
  categories?: DiagnosticCategory[]
): Promise<DiagnosticReport> {
  const startTime = Date.now();
  const results: DiagnosticResult[] = [];

  for (const [id, check] of Object.entries(checks)) {
    // Filter by category if specified
    if (categories) {
      const category = id.split(':')[0] as DiagnosticCategory;
      if (!categories.includes(category)) continue;
    }

    try {
      const result = await check();
      results.push(result);
    } catch (err) {
      results.push({
        id,
        name: id,
        category: id.split(':')[0] as DiagnosticCategory,
        severity: 'error',
        passed: false,
        description: 'Check failed to execute',
        message: err instanceof Error ? err.message : String(err),
        fixAvailable: false,
        duration: 0,
      });
    }
  }

  // Calculate summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed && r.severity === 'error').length,
    warnings: results.filter(r => !r.passed && r.severity === 'warning').length,
    skipped: 0,
  };

  // Determine overall status
  let status: DiagnosticReport['status'] = 'healthy';
  if (summary.failed > 0) {
    status = 'unhealthy';
  } else if (summary.warnings > 0) {
    status = 'degraded';
  }

  // Collect available fixes
  const availableFixes = results
    .filter(r => r.fixAvailable && r.fixId)
    .map(r => ({
      fixId: r.fixId!,
      checkId: r.id,
      description: r.message,
      severity: r.severity,
    }));

  return {
    timestamp: new Date(),
    status,
    summary,
    results,
    availableFixes,
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      claudeopsVersion: VERSION,
    },
    duration: Date.now() - startTime,
  };
}

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'doctor',
    description: 'Diagnose configuration issues',
  },
  args: {
    fix: {
      type: 'boolean',
      alias: 'f',
      description: 'Automatically fix issues where possible',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
    category: {
      type: 'string',
      alias: 'c',
      description: 'Check specific category only',
    },
  },
  async run({ args }) {
    const s = prompts.spinner();
    s.start('Running diagnostics...');

    const categories = args.category
      ? [args.category as DiagnosticCategory]
      : undefined;

    const report = await runDiagnostics(categories);

    s.stop(`Diagnostics complete (${output.formatDuration(report.duration)})`);

    if (args.json) {
      output.json(report);
      return;
    }

    // Print results
    output.header('Diagnostic Report');

    // Status badge
    const statusColors = {
      healthy: output.success,
      degraded: output.warn,
      unhealthy: output.error,
    };
    statusColors[report.status](`Status: ${report.status.toUpperCase()}`);

    console.log();
    output.kv('Checks run', report.summary.total.toString());
    output.kv('Passed', report.summary.passed.toString());
    if (report.summary.warnings > 0) {
      output.kv('Warnings', report.summary.warnings.toString());
    }
    if (report.summary.failed > 0) {
      output.kv('Failed', report.summary.failed.toString());
    }

    // Group results by category
    const byCategory = new Map<string, DiagnosticResult[]>();
    for (const result of report.results) {
      if (!byCategory.has(result.category)) {
        byCategory.set(result.category, []);
      }
      byCategory.get(result.category)!.push(result);
    }

    for (const [category, results] of byCategory) {
      console.log();
      output.label(category.toUpperCase(), '');

      for (const result of results) {
        const color = result.passed ? output.check :
                      result.severity === 'error' ? output.cross :
                      output.warn;

        color(`  ${result.name}`);
        output.dim(`    ${result.message}`);

        if (!result.passed && result.suggestions) {
          for (const suggestion of result.suggestions) {
            output.dim(`    - ${suggestion}`);
          }
        }
      }
    }

    // Handle fixes
    if (args.fix && report.availableFixes.length > 0) {
      console.log();
      output.header('Applying Fixes');

      for (const fix of report.availableFixes) {
        const fixFn = fixes[fix.fixId];
        if (!fixFn) {
          output.warn(`No fix implementation for: ${fix.fixId}`);
          continue;
        }

        try {
          const success = await fixFn();
          if (success) {
            output.success(`Fixed: ${fix.description}`);
          } else {
            output.warn(`Could not fix: ${fix.description}`);
          }
        } catch (err) {
          output.error(`Fix failed: ${err instanceof Error ? err.message : err}`);
        }
      }
    } else if (report.availableFixes.length > 0) {
      console.log();
      output.info(`${report.availableFixes.length} issue(s) can be auto-fixed. Run with --fix to apply.`);
    }

    // System info
    console.log();
    output.header('System Info');
    output.kv('Platform', report.system.platform);
    output.kv('Node.js', report.system.nodeVersion);
    output.kv('claudeops', report.system.claudeopsVersion);

    // Exit with appropriate code
    if (report.status === 'unhealthy') {
      process.exit(1);
    }
  },
});
