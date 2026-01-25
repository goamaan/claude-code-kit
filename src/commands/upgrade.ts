/**
 * Upgrade command
 * ck upgrade [--check] [--force]
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { VERSION } from '../index.js';
import { handleError, ErrorCategory } from '../utils/errors.js';
import { resolvePackageManager, getCommands } from '../utils/package-manager.js';
import { loadConfig } from '../core/config/loader.js';

// =============================================================================
// Types
// =============================================================================

interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  'dist-tags'?: {
    latest?: string;
    next?: string;
  };
  versions?: Record<string, unknown>;
  time?: Record<string, string>;
}

// =============================================================================
// Helper Functions
// =============================================================================

async function fetchPackageInfo(): Promise<PackageInfo | null> {
  try {
    const response = await fetch('https://registry.npmjs.org/claudeops');
    if (!response.ok) {
      return null;
    }

    const data = await response.json() as PackageInfo;
    return data;
  } catch (error) {
    handleError(error, ErrorCategory.NETWORK);
    return null;
  }
}

function getVersionType(from: string, to: string): 'major' | 'minor' | 'patch' {
  const fromParts = from.replace(/^v/, '').split('.').map(Number);
  const toParts = to.replace(/^v/, '').split('.').map(Number);

  if ((fromParts[0] ?? 0) < (toParts[0] ?? 0)) return 'major';
  if ((fromParts[1] ?? 0) < (toParts[1] ?? 0)) return 'minor';
  return 'patch';
}

function compareVersions(a: string, b: string): number {
  const aParts = a.replace(/^v/, '').split('.').map(Number);
  const bParts = b.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;

    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
  }

  return 0;
}

async function executeUpgrade(): Promise<boolean> {
  const { spawn } = await import('node:child_process');

  // Try to load config for preferred package manager
  let preferredPm: 'npm' | 'yarn' | 'pnpm' | 'bun' | undefined;
  try {
    const config = await loadConfig();
    preferredPm = config.packageManager;
  } catch {
    // Config loading failed, use default detection
  }

  // Resolve package manager (preference > detection > npm)
  const pm = resolvePackageManager(preferredPm, process.cwd());
  const commands = getCommands(pm);

  // Build the install command
  const cmd = `${commands.globalInstall} claudeops@latest`.split(' ');

  return new Promise((resolve) => {
    const child = spawn(cmd[0]!, cmd.slice(1), {
      stdio: 'inherit',
      shell: true,
    });

    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'upgrade',
    description: 'Check for and install claudeops updates\n\nExamples:\n  cops upgrade              # Check and install updates\n  cops upgrade --check      # Only check for updates\n  cops upgrade --force      # Install without confirmation',
  },
  args: {
    check: {
      type: 'boolean',
      alias: 'c',
      description: 'Check for updates without installing',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output version information as JSON',
      default: false,
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Install update without confirmation prompt',
      default: false,
    },
  },
  async run({ args }) {
    const s = prompts.spinner();
    s.start('Checking for updates...');

    const packageInfo = await fetchPackageInfo();

    s.stop('Version check complete');

    if (!packageInfo || !packageInfo['dist-tags']?.latest) {
      output.error('Could not check for updates');
      console.log();
      output.info('Possible reasons:');
      output.dim('  • No internet connection');
      output.dim('  • NPM registry is unavailable');
      output.dim('  • Network firewall blocking access');
      console.log();
      output.info('To fix this:');
      output.dim('  • Check your internet connection');
      output.dim('  • Visit https://status.npmjs.org for registry status');
      output.dim('  • Try again in a few moments');
      process.exit(1);
    }

    const currentVersion = VERSION;
    const latestVersion = packageInfo['dist-tags'].latest;
    const comparison = compareVersions(currentVersion, latestVersion);

    const versionInfo = {
      current: currentVersion,
      latest: latestVersion,
      updateAvailable: comparison < 0,
      isNewer: comparison > 0,
      changeType: comparison < 0 ? getVersionType(currentVersion, latestVersion) : undefined,
    };

    if (args.json) {
      output.json(versionInfo);
      return;
    }

    output.header('Version Information');

    output.kv('Current version', currentVersion);
    output.kv('Latest version', latestVersion);

    console.log();

    if (comparison === 0) {
      output.success('You are running the latest version!');
      console.log();
      output.info('No updates available');

      if (args.force) {
        console.log();
        output.info('Use --force to reinstall the current version:');
        output.dim('  cops upgrade --force');
      }
      return;
    }

    if (comparison > 0) {
      output.info('You are running a newer version than the latest release');
      output.dim('This may be a development or pre-release version');
      console.log();
      output.kv('Your version', currentVersion);
      output.kv('Latest stable', latestVersion);
      return;
    }

    // Update available
    const changeType = getVersionType(currentVersion, latestVersion);
    const changeColor = changeType === 'major' ? output.warn :
                       changeType === 'minor' ? output.info :
                       output.dim;

    changeColor(`Update available: ${currentVersion} → ${latestVersion} (${changeType})`);

    if (changeType === 'major') {
      console.log();
      output.warn('Major version update - may include breaking changes');
      output.dim('Review the changelog before upgrading');
    }

    console.log();
    output.info('What\'s new:');
    output.dim('  • Visit: https://github.com/goamaan/claudeops/releases');
    output.dim('  • Changelog: https://github.com/goamaan/claudeops/blob/main/CHANGELOG.md');

    if (args.check) {
      console.log();
      output.info('To install this update, run:');
      output.dim('  cops upgrade');
      return;
    }

    // Confirm upgrade
    if (!args.force) {
      console.log();
      const confirm = await prompts.promptConfirm(
        `Upgrade to version ${latestVersion}?`
      );
      prompts.handleCancel(confirm);
      if (!confirm) {
        output.info('Upgrade cancelled');
        return;
      }
    }

    // Execute upgrade
    console.log();
    output.info('Upgrading claudeops...');
    console.log();

    const success = await executeUpgrade();

    if (success) {
      console.log();
      output.success(`Successfully upgraded to version ${latestVersion}`);
      console.log();
      output.info('Next steps:');
      output.dim('  • Run: cops doctor    (verify installation)');
      output.dim('  • Run: cops sync      (sync configuration)');
    } else {
      console.log();
      output.error('Upgrade failed');
      console.log();
      output.info('To fix this:');
      output.dim('  • Try running manually:');
      output.dim('      npm install -g claudeops@latest');
      output.dim('  • Or with yarn:');
      output.dim('      yarn global add claudeops@latest');
      output.dim('  • Check permissions (may need sudo)');
      output.dim('  • Clear npm cache:');
      output.dim('      npm cache clean --force');
      process.exit(1);
    }
  },
});
