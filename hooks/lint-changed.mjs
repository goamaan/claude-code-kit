#!/usr/bin/env node
/**
 * Hook: lint-changed
 * Event: PostToolUse
 * Description: Runs ESLint after Write/Edit on JavaScript/TypeScript files
 * Matcher: Write
 * Enabled: true
 *
 * lint-changed - PostToolUse Hook
 *
 * Runs ESLint after Write/Edit tools modify JavaScript/TypeScript files.
 * Uses project's eslint or npm run lint script.
 *
 * Hook type: PostToolUse
 * Triggers: After Write, Edit tools modify .js/.ts/.tsx/.jsx files
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve, join } from 'path';

const execAsync = promisify(exec);

/**
 * Detect package manager from environment or lockfile
 */
function getPackageManager(projectDir) {
  // Detect from lockfile
  const lockfiles = {
    'package-lock.json': 'npm',
    'yarn.lock': 'yarn',
    'pnpm-lock.yaml': 'pnpm',
    'bun.lockb': 'bun',
    'bun.lock': 'bun',
  };

  for (const [file, pm] of Object.entries(lockfiles)) {
    if (existsSync(join(projectDir, file))) {
      return pm;
    }
  }

  return 'npm';
}

/**
 * Get run command for package manager
 */
function getRunCommand(pm) {
  const commands = {
    npm: 'npm run',
    yarn: 'yarn',
    pnpm: 'pnpm',
    bun: 'bun run',
  };
  return commands[pm] || 'npm run';
}

/**
 * Get exec command for package manager
 */
function getExecCommand(pm) {
  const commands = {
    npm: 'npx',
    yarn: 'yarn dlx',
    pnpm: 'pnpm exec',
    bun: 'bunx',
  };
  return commands[pm] || 'npx';
}

// Read input from stdin
let input;
try {
  const stdinData = readFileSync(0, 'utf8');
  input = JSON.parse(stdinData);
} catch {
  process.exit(0);
}

const toolName = input.tool_name || '';
const toolInput = input.tool_input || {};
const _cwd = input.cwd || process.cwd();

// Only process Write/Edit tools
if (toolName !== 'Write' && toolName !== 'Edit') {
  process.exit(0);
}

const filePath = toolInput.file_path;

// Check if file is a lintable JavaScript/TypeScript file
function isLintableFile(fp) {
  return /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(fp);
}

if (!filePath || !isLintableFile(filePath)) {
  process.exit(0);
}

/**
 * Find ESLint config in directory hierarchy
 */
function findEslintConfig(fp) {
  let dir = dirname(resolve(fp));
  const root = '/';

  const configNames = [
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.json',
    '.eslintrc.yml',
    '.eslintrc.yaml',
    'eslint.config.js',
    'eslint.config.mjs',
  ];

  while (dir !== root) {
    for (const configName of configNames) {
      const configPath = join(dir, configName);
      if (existsSync(configPath)) {
        return configPath;
      }
    }

    // Check package.json for eslintConfig
    const packageJsonPath = join(dir, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        if (pkg.eslintConfig) {
          return packageJsonPath;
        }
      } catch {
        // Ignore parse errors
      }
    }

    const parentDir = dirname(dir);
    if (parentDir === dir) break;
    dir = parentDir;
  }

  return null;
}

/**
 * Run ESLint on file
 */
async function runLint(fp) {
  const eslintConfig = findEslintConfig(fp);

  if (!eslintConfig) {
    return { success: true, output: '', errors: [] };
  }

  const projectDir = dirname(eslintConfig);

  try {
    const pkgPath = join(projectDir, 'package.json');
    let hasLintScript = false;

    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      hasLintScript = pkg.scripts && pkg.scripts.lint;
    }

    const pm = getPackageManager(projectDir);
    const runCmd = getRunCommand(pm);
    const execCmd = getExecCommand(pm);

    let command;
    if (hasLintScript) {
      command = `${runCmd} lint -- "${fp}" 2>&1`;
    } else {
      command = `${execCmd} eslint "${fp}" --format stylish 2>&1`;
    }

    const { stdout } = await execAsync(command, {
      cwd: projectDir,
      encoding: 'utf8',
      timeout: 30000,
    });

    return { success: true, output: stdout, errors: [] };
  } catch (error) {
    const output = error.stdout || error.stderr || error.message;
    return { success: false, output, errors: [output] };
  }
}

// Run lint and output result
try {
  const result = await runLint(filePath);

  if (!result.success && result.errors.length > 0) {
    // Report lint errors to Claude via additionalContext
    const output = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `[LINT ERRORS] ESLint found issues in ${filePath}:\n\n${result.output.slice(0, 2000)}\n\nPlease fix these lint errors.`
      }
    };
    console.log(JSON.stringify(output));
  }
} catch {
  // Silently fail - don't block on lint errors
}

process.exit(0);
