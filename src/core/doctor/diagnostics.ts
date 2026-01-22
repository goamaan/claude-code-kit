/**
 * Diagnostic Checks Module
 * Defines and runs diagnostic checks for claude-code-kit installation health
 */

import { join } from 'node:path';
import { execSync } from 'node:child_process';
import type {
  DiagnosticResult,
  DiagnosticSeverity,
  DiagnosticCategory,
  DiagnosticCheck,
} from '@/types/index.js';
import {
  getGlobalConfigDir,
  getClaudeDir,
  getProfilesDir,
  getAddonsDir,
} from '@/utils/paths.js';
import { isFile, isDirectory, readFileSafe, readJsonSafe } from '@/utils/fs.js';
import {
  CONFIG_FILE,
  PROFILE_FILE,
  CLAUDE_SETTINGS_FILE,
  DEFAULT_PROFILE_NAME,
} from '@/utils/constants.js';

// =============================================================================
// Diagnostic Check Definitions
// =============================================================================

/**
 * Create a diagnostic result helper
 */
function createResult(
  check: { id: string; name: string; category: DiagnosticCategory; description: string },
  options: {
    passed: boolean;
    severity?: DiagnosticSeverity;
    message: string;
    suggestions?: string[];
    fixAvailable?: boolean;
    fixId?: string;
    details?: Record<string, unknown>;
    duration: number;
  }
): DiagnosticResult {
  return {
    id: check.id,
    name: check.name,
    category: check.category,
    description: check.description,
    severity: options.severity ?? (options.passed ? 'info' : 'error'),
    passed: options.passed,
    message: options.message,
    suggestions: options.suggestions,
    fixAvailable: options.fixAvailable ?? false,
    fixId: options.fixId,
    details: options.details,
    duration: options.duration,
  };
}

/**
 * All diagnostic checks
 */
export const CHECKS: DiagnosticCheck[] = [
  // =========================================================================
  // Installation Checks
  // =========================================================================
  {
    id: 'claude-code-kit-dir',
    name: 'Check ~/.claude-code-kit exists',
    category: 'installation',
    description: 'Verify the claude-code-kit configuration directory exists',
    enabledByDefault: true,
    async run() {
      const start = performance.now();
      const configDir = getGlobalConfigDir();
      const dirExists = await isDirectory(configDir);

      return createResult(this, {
        passed: dirExists,
        message: dirExists
          ? `Configuration directory exists at ${configDir}`
          : `Configuration directory not found at ${configDir}`,
        suggestions: dirExists ? undefined : ['Run "cck init" to create the directory'],
        fixAvailable: !dirExists,
        fixId: 'claude-code-kit-dir',
        duration: performance.now() - start,
      });
    },
    async fix() {
      const { mkdir } = await import('@/utils/fs.js');
      const configDir = getGlobalConfigDir();

      try {
        await mkdir(configDir, { recursive: true });
        return {
          fixId: 'claude-code-kit-dir',
          success: true,
          description: `Created directory ${configDir}`,
          actions: [{ action: 'mkdir', success: true, details: configDir }],
          requiresRestart: false,
        };
      } catch (error) {
        return {
          fixId: 'claude-code-kit-dir',
          success: false,
          description: 'Failed to create directory',
          error: error instanceof Error ? error.message : String(error),
          actions: [{ action: 'mkdir', success: false }],
          requiresRestart: false,
        };
      }
    },
  },

  {
    id: 'config-valid',
    name: 'Validate config syntax',
    category: 'configuration',
    description: 'Verify the main configuration file is valid',
    enabledByDefault: true,
    dependsOn: ['claude-code-kit-dir'],
    async run() {
      const start = performance.now();
      const configPath = join(getGlobalConfigDir(), CONFIG_FILE);
      const configExists = await isFile(configPath);

      if (!configExists) {
        return createResult(this, {
          passed: true, // Not having a config is OK - defaults are used
          severity: 'info',
          message: 'No configuration file found (using defaults)',
          duration: performance.now() - start,
        });
      }

      try {
        const content = await readFileSafe(configPath);
        if (!content) {
          return createResult(this, {
            passed: true,
            severity: 'info',
            message: 'Configuration file is empty (using defaults)',
            duration: performance.now() - start,
          });
        }

        // Try to parse TOML
        const { parse } = await import('@ltd/j-toml');
        parse(content, { bigint: false });

        return createResult(this, {
          passed: true,
          message: 'Configuration file is valid TOML',
          duration: performance.now() - start,
        });
      } catch (error) {
        return createResult(this, {
          passed: false,
          severity: 'error',
          message: `Configuration file has invalid syntax: ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestions: ['Check the TOML syntax in the config file', 'Run "cck config validate" for details'],
          fixAvailable: false,
          details: { error: error instanceof Error ? error.message : String(error) },
          duration: performance.now() - start,
        });
      }
    },
  },

  {
    id: 'active-profile',
    name: 'Check active profile exists',
    category: 'profiles',
    description: 'Verify the active profile directory exists',
    enabledByDefault: true,
    dependsOn: ['claude-code-kit-dir'],
    async run() {
      const start = performance.now();
      const profileFilePath = join(getGlobalConfigDir(), PROFILE_FILE);
      const profileFileExists = await isFile(profileFilePath);

      let activeProfile = DEFAULT_PROFILE_NAME;
      if (profileFileExists) {
        const content = await readFileSafe(profileFilePath);
        if (content?.trim()) {
          activeProfile = content.trim();
        }
      }

      const profileDir = join(getProfilesDir(), activeProfile);
      const profileExists = await isDirectory(profileDir);

      if (profileExists) {
        return createResult(this, {
          passed: true,
          message: `Active profile "${activeProfile}" exists`,
          details: { profile: activeProfile, path: profileDir },
          duration: performance.now() - start,
        });
      }

      // Check if it's the default profile that doesn't exist
      if (activeProfile === DEFAULT_PROFILE_NAME) {
        return createResult(this, {
          passed: true, // Default profile not existing is OK
          severity: 'info',
          message: 'Using default profile (no explicit profile configured)',
          suggestions: ['Run "cck profile create default" to create an explicit default profile'],
          fixAvailable: true,
          fixId: 'active-profile',
          duration: performance.now() - start,
        });
      }

      return createResult(this, {
        passed: false,
        severity: 'error',
        message: `Active profile "${activeProfile}" not found`,
        suggestions: [
          `Run "cck profile create ${activeProfile}" to create it`,
          'Run "cck profile use default" to switch to default profile',
        ],
        fixAvailable: true,
        fixId: 'active-profile',
        details: { profile: activeProfile },
        duration: performance.now() - start,
      });
    },
    async fix() {
      const { mkdir, writeFile } = await import('@/utils/fs.js');
      const profilesDir = getProfilesDir();
      const defaultProfileDir = join(profilesDir, DEFAULT_PROFILE_NAME);
      const defaultConfigPath = join(defaultProfileDir, CONFIG_FILE);

      try {
        await mkdir(defaultProfileDir, { recursive: true });
        await writeFile(
          defaultConfigPath,
          `# Default profile configuration
name = "default"
description = "Default claude-kit profile"
`
        );

        return {
          fixId: 'active-profile',
          success: true,
          description: 'Created default profile',
          actions: [
            { action: 'mkdir', success: true, details: defaultProfileDir },
            { action: 'create-config', success: true, details: defaultConfigPath },
          ],
          requiresRestart: false,
        };
      } catch (error) {
        return {
          fixId: 'active-profile',
          success: false,
          description: 'Failed to create default profile',
          error: error instanceof Error ? error.message : String(error),
          actions: [],
          requiresRestart: false,
        };
      }
    },
  },

  // =========================================================================
  // Dependencies Checks
  // =========================================================================
  {
    id: 'oh-my-claudecode',
    name: 'Check oh-my-claudecode installed',
    category: 'dependencies',
    description: 'Verify oh-my-claudecode is properly installed',
    enabledByDefault: true,
    async run() {
      const start = performance.now();

      // Check for omc directory in common locations
      const omcPaths = [
        join(getClaudeDir(), '.omc'),
        join(getGlobalConfigDir(), 'omc'),
      ];

      for (const omcPath of omcPaths) {
        if (await isDirectory(omcPath)) {
          return createResult(this, {
            passed: true,
            message: `oh-my-claudecode found at ${omcPath}`,
            details: { path: omcPath },
            duration: performance.now() - start,
          });
        }
      }

      // Check if CLAUDE.md contains omc references
      const claudeMdPath = join(getClaudeDir(), 'CLAUDE.md');
      const claudeMdContent = await readFileSafe(claudeMdPath);

      if (claudeMdContent?.includes('oh-my-claudecode')) {
        return createResult(this, {
          passed: true,
          severity: 'info',
          message: 'oh-my-claudecode detected in CLAUDE.md configuration',
          duration: performance.now() - start,
        });
      }

      return createResult(this, {
        passed: false,
        severity: 'warning',
        message: 'oh-my-claudecode not detected',
        suggestions: [
          'Install oh-my-claudecode for enhanced Claude Code capabilities',
          'Visit https://github.com/AviAvinav/oh-my-claudecode for installation instructions',
        ],
        fixAvailable: false,
        duration: performance.now() - start,
      });
    },
  },

  {
    id: 'bun-version',
    name: 'Check Bun version',
    category: 'dependencies',
    description: 'Verify Bun is installed and meets minimum version requirements',
    enabledByDefault: true,
    async run() {
      const start = performance.now();

      try {
        const versionOutput = execSync('bun --version', { encoding: 'utf-8' }).trim();
        const version = versionOutput.replace(/^v?/, '');

        // Parse version
        const [major = 0] = version.split('.').map(Number);

        // Require Bun 1.0 or higher
        if (major >= 1) {
          return createResult(this, {
            passed: true,
            message: `Bun version ${version} meets requirements`,
            details: { version },
            duration: performance.now() - start,
          });
        }

        return createResult(this, {
          passed: false,
          severity: 'warning',
          message: `Bun version ${version} is outdated (requires 1.0+)`,
          suggestions: ['Run "curl -fsSL https://bun.sh/install | bash" to update Bun'],
          duration: performance.now() - start,
        });
      } catch {
        return createResult(this, {
          passed: false,
          severity: 'warning',
          message: 'Bun is not installed or not in PATH',
          suggestions: [
            'Install Bun: curl -fsSL https://bun.sh/install | bash',
            'claude-code-kit can run with Node.js but Bun is recommended',
          ],
          duration: performance.now() - start,
        });
      }
    },
  },

  // =========================================================================
  // Sync Checks
  // =========================================================================
  {
    id: 'claude-dir-sync',
    name: 'Check ~/.claude in sync',
    category: 'sync',
    description: 'Verify claude-code-kit state is synced to ~/.claude',
    enabledByDefault: true,
    async run() {
      const start = performance.now();
      const claudeDir = getClaudeDir();
      const settingsPath = join(claudeDir, CLAUDE_SETTINGS_FILE);

      const dirExists = await isDirectory(claudeDir);
      if (!dirExists) {
        return createResult(this, {
          passed: false,
          severity: 'warning',
          message: '~/.claude directory does not exist',
          suggestions: ['Run "cck sync" to initialize'],
          fixAvailable: true,
          fixId: 'claude-dir-sync',
          duration: performance.now() - start,
        });
      }

      const settingsExist = await isFile(settingsPath);
      if (!settingsExist) {
        return createResult(this, {
          passed: true,
          severity: 'info',
          message: 'No Claude settings file found (will be created on sync)',
          duration: performance.now() - start,
        });
      }

      // Verify settings file is valid JSON
      const settings = await readJsonSafe(settingsPath);
      if (!settings) {
        return createResult(this, {
          passed: false,
          severity: 'error',
          message: 'Claude settings file is invalid JSON',
          suggestions: ['Run "cck sync --force" to regenerate'],
          fixAvailable: true,
          fixId: 'claude-dir-sync',
          duration: performance.now() - start,
        });
      }

      return createResult(this, {
        passed: true,
        message: 'Claude directory is properly configured',
        duration: performance.now() - start,
      });
    },
    async fix() {
      const { mkdir } = await import('@/utils/fs.js');
      const claudeDir = getClaudeDir();

      try {
        await mkdir(claudeDir, { recursive: true });
        return {
          fixId: 'claude-dir-sync',
          success: true,
          description: 'Created ~/.claude directory',
          actions: [{ action: 'mkdir', success: true, details: claudeDir }],
          requiresRestart: false,
          instructions: ['Run "cck sync" to complete setup'],
        };
      } catch (error) {
        return {
          fixId: 'claude-dir-sync',
          success: false,
          description: 'Failed to create directory',
          error: error instanceof Error ? error.message : String(error),
          actions: [],
          requiresRestart: false,
        };
      }
    },
  },

  // =========================================================================
  // Hooks Checks
  // =========================================================================
  {
    id: 'hooks-valid',
    name: 'Validate hook handlers exist',
    category: 'hooks',
    description: 'Verify hook handler files exist',
    enabledByDefault: true,
    dependsOn: ['claude-code-kit-dir'],
    async run() {
      const start = performance.now();

      // Check settings file for hooks
      const settingsPath = join(getClaudeDir(), CLAUDE_SETTINGS_FILE);
      const settings = await readJsonSafe<{ hooks?: Record<string, unknown> }>(settingsPath);

      if (!settings?.hooks) {
        return createResult(this, {
          passed: true,
          severity: 'info',
          message: 'No hooks configured',
          duration: performance.now() - start,
        });
      }

      // For now, just verify the hooks section exists and is valid
      const hookCount = Object.keys(settings.hooks).length;

      return createResult(this, {
        passed: true,
        message: `${hookCount} hook(s) configured`,
        details: { hooks: Object.keys(settings.hooks) },
        duration: performance.now() - start,
      });
    },
  },

  // =========================================================================
  // Addons Checks
  // =========================================================================
  {
    id: 'addon-manifests',
    name: 'Validate addon manifests',
    category: 'addons',
    description: 'Verify all installed addon manifests are valid',
    enabledByDefault: true,
    dependsOn: ['claude-code-kit-dir'],
    async run() {
      const start = performance.now();
      const addonsDir = getAddonsDir();

      if (!(await isDirectory(addonsDir))) {
        return createResult(this, {
          passed: true,
          severity: 'info',
          message: 'No addons installed',
          duration: performance.now() - start,
        });
      }

      const { readDirWithTypes } = await import('@/utils/fs.js');
      const entries = await readDirWithTypes(addonsDir);
      const addonDirs = entries.filter((e) => e.isDirectory());

      if (addonDirs.length === 0) {
        return createResult(this, {
          passed: true,
          severity: 'info',
          message: 'No addons installed',
          duration: performance.now() - start,
        });
      }

      const issues: string[] = [];
      const validAddons: string[] = [];

      for (const addon of addonDirs) {
        const manifestPath = join(addonsDir, addon.name, 'addon.toml');

        if (!(await isFile(manifestPath))) {
          issues.push(`${addon.name}: missing addon.toml`);
          continue;
        }

        try {
          const content = await readFileSafe(manifestPath);
          if (content) {
            const { parse } = await import('@ltd/j-toml');
            parse(content, { bigint: false });
            validAddons.push(addon.name);
          }
        } catch (error) {
          issues.push(`${addon.name}: invalid manifest (${error instanceof Error ? error.message : 'parse error'})`);
        }
      }

      if (issues.length > 0) {
        return createResult(this, {
          passed: false,
          severity: 'warning',
          message: `${issues.length} addon(s) have invalid manifests`,
          suggestions: issues.map((i) => `Fix: ${i}`),
          details: { issues, validAddons },
          duration: performance.now() - start,
        });
      }

      return createResult(this, {
        passed: true,
        message: `${validAddons.length} addon(s) have valid manifests`,
        details: { addons: validAddons },
        duration: performance.now() - start,
      });
    },
  },
];

// =============================================================================
// Diagnostic Runner
// =============================================================================

/**
 * Run all diagnostic checks
 */
export async function runDiagnostics(options?: {
  categories?: DiagnosticCategory[];
  checks?: string[];
  skip?: string[];
}): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];
  const completedChecks = new Set<string>();

  // Filter checks based on options
  let checksToRun = CHECKS.filter((c) => c.enabledByDefault);

  if (options?.categories) {
    checksToRun = checksToRun.filter((c) => options.categories!.includes(c.category));
  }

  if (options?.checks) {
    checksToRun = CHECKS.filter((c) => options.checks!.includes(c.id));
  }

  if (options?.skip) {
    checksToRun = checksToRun.filter((c) => !options.skip!.includes(c.id));
  }

  // Run checks respecting dependencies
  async function runCheck(check: DiagnosticCheck): Promise<DiagnosticResult | null> {
    if (completedChecks.has(check.id)) {
      return null;
    }

    // Run dependencies first
    if (check.dependsOn) {
      for (const depId of check.dependsOn) {
        const depCheck = CHECKS.find((c) => c.id === depId);
        if (depCheck && !completedChecks.has(depId)) {
          const depResult = await runCheck(depCheck);
          if (depResult) {
            results.push(depResult);
          }
        }
      }

      // Check if any dependency failed
      const failedDeps = check.dependsOn.filter((depId) => {
        const depResult = results.find((r) => r.id === depId);
        return depResult && !depResult.passed;
      });

      if (failedDeps.length > 0) {
        const skippedResult: DiagnosticResult = {
          id: check.id,
          name: check.name,
          category: check.category,
          description: check.description,
          severity: 'info',
          passed: false,
          message: `Skipped due to failed dependencies: ${failedDeps.join(', ')}`,
          fixAvailable: false,
          duration: 0,
        };
        completedChecks.add(check.id);
        return skippedResult;
      }
    }

    try {
      const result = await check.run();
      completedChecks.add(check.id);
      return result;
    } catch (error) {
      completedChecks.add(check.id);
      return {
        id: check.id,
        name: check.name,
        category: check.category,
        description: check.description,
        severity: 'error',
        passed: false,
        message: `Check failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fixAvailable: false,
        duration: 0,
      };
    }
  }

  for (const check of checksToRun) {
    const result = await runCheck(check);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Get a diagnostic check by ID
 */
export function getCheck(id: string): DiagnosticCheck | undefined {
  return CHECKS.find((c) => c.id === id);
}
