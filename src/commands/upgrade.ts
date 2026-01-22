/**
 * Upgrade command
 * ck upgrade [--check]
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import * as prompts from '../ui/prompts.js';
import { VERSION } from '../index.js';

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
}

// =============================================================================
// Helper Functions
// =============================================================================

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch('https://registry.npmjs.org/claude-code-kit');
    if (!response.ok) {
      return null;
    }

    const data = await response.json() as PackageInfo;
    return data['dist-tags']?.latest ?? null;
  } catch {
    return null;
  }
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

  // Detect package manager
  const userAgent = process.env['npm_config_user_agent'] ?? '';
  const packageManager = userAgent.includes('yarn') ? 'yarn' :
                        userAgent.includes('pnpm') ? 'pnpm' :
                        userAgent.includes('bun') ? 'bun' : 'npm';

  const commands: Record<string, string[]> = {
    npm: ['npm', 'install', '-g', 'claude-code-kit@latest'],
    yarn: ['yarn', 'global', 'add', 'claude-code-kit@latest'],
    pnpm: ['pnpm', 'add', '-g', 'claude-code-kit@latest'],
    bun: ['bun', 'add', '-g', 'claude-code-kit@latest'],
  };

  const cmd = commands[packageManager] ?? commands['npm']!;

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
    description: 'Check for and install updates',
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
      description: 'Output as JSON',
      default: false,
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Upgrade without confirmation',
      default: false,
    },
  },
  async run({ args }) {
    const s = prompts.spinner();
    s.start('Checking for updates...');

    const latestVersion = await fetchLatestVersion();

    s.stop('Version check complete');

    if (!latestVersion) {
      output.error('Could not check for updates. Are you online?');
      process.exit(1);
    }

    const currentVersion = VERSION;
    const comparison = compareVersions(currentVersion, latestVersion);

    const versionInfo = {
      current: currentVersion,
      latest: latestVersion,
      updateAvailable: comparison < 0,
      isNewer: comparison > 0,
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
      return;
    }

    if (comparison > 0) {
      output.info('You are running a newer version than the latest release.');
      output.dim('This may be a development or pre-release version.');
      return;
    }

    // Update available
    output.warn(`Update available: ${currentVersion} -> ${latestVersion}`);

    if (args.check) {
      console.log();
      output.info('Run `ck upgrade` to install the update');
      return;
    }

    // Confirm upgrade
    if (!args.force) {
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
    output.info('Upgrading claude-code-kit...');
    console.log();

    const success = await executeUpgrade();

    if (success) {
      console.log();
      output.success(`Upgraded to version ${latestVersion}`);
      output.info('Run `ck doctor` to verify the installation');
    } else {
      console.log();
      output.error('Upgrade failed');
      output.info('Try running manually:');
      output.dim('  npm install -g claude-code-kit@latest');
      output.dim('  # or');
      output.dim('  yarn global add claude-code-kit@latest');
      process.exit(1);
    }
  },
});
