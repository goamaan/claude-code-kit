/**
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
import { existsSync } from 'fs';
import { dirname, resolve, join } from 'path';

const execAsync = promisify(exec);

/**
 * Check if file is a JavaScript/TypeScript file
 */
function isLintableFile(filePath) {
  return /\.(js|jsx|ts|tsx)$/.test(filePath);
}

/**
 * Find ESLint config in directory hierarchy
 */
function findEslintConfig(filePath) {
  let dir = dirname(resolve(filePath));
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
        const pkg = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf8'));
        if (pkg.eslintConfig) {
          return packageJsonPath;
        }
      } catch (e) {
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
async function runLint(filePath) {
  const eslintConfig = findEslintConfig(filePath);

  if (!eslintConfig) {
    return {
      success: true,
      output: 'No ESLint config found, skipping lint',
      warnings: [],
      errors: [],
    };
  }

  const projectDir = dirname(eslintConfig);

  try {
    const { stdout: packageJson } = await execAsync('cat package.json', {
      cwd: projectDir,
      encoding: 'utf8',
    }).catch(() => ({ stdout: '{}' }));

    const pkg = JSON.parse(packageJson);
    const hasLintScript = pkg.scripts && pkg.scripts.lint;

    let command;
    if (hasLintScript) {
      // Use project's lint script with the specific file
      command = `npm run lint -- "${filePath}"`;
    } else {
      // Use npx eslint directly
      command = `npx eslint "${filePath}" --format json`;
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectDir,
      encoding: 'utf8',
      timeout: 30000,
    });

    return {
      success: true,
      output: stdout + stderr,
      warnings: [],
      errors: [],
    };
  } catch (error) {
    const output = (error.stdout || '') + (error.stderr || '');
    const { warnings, errors } = parseEslintOutput(output);

    return {
      success: errors.length === 0,
      output,
      warnings,
      errors,
    };
  }
}

/**
 * Parse ESLint output (JSON or text format)
 */
function parseEslintOutput(output) {
  const warnings = [];
  const errors = [];

  // Try parsing as JSON first (ESLint --format json)
  try {
    const results = JSON.parse(output);
    if (Array.isArray(results)) {
      for (const result of results) {
        if (result.messages) {
          for (const msg of result.messages) {
            const location = `${result.filePath}:${msg.line}:${msg.column}`;
            const message = `${location} - ${msg.message} (${msg.ruleId || 'unknown'})`;

            if (msg.severity === 2) {
              errors.push(message);
            } else if (msg.severity === 1) {
              warnings.push(message);
            }
          }
        }
      }
    }
  } catch (e) {
    // Not JSON, parse as text
    const lines = output.split('\n');

    for (const line of lines) {
      if (/error/.test(line) && /\d+:\d+/.test(line)) {
        errors.push(line.trim());
      } else if (/warning/.test(line) && /\d+:\d+/.test(line)) {
        warnings.push(line.trim());
      }
    }

    // If no structured errors/warnings found, treat non-empty output as error
    if (errors.length === 0 && warnings.length === 0 && output.trim()) {
      errors.push(output.trim());
    }
  }

  return { warnings, errors };
}

/**
 * Main hook function
 */
export default async function lintChangedHook(context) {
  const { tool, toolInput } = context;

  if (tool !== 'Write' && tool !== 'Edit') {
    return { decision: 'allow' };
  }

  const filePath = toolInput.file_path;

  if (!filePath || !isLintableFile(filePath)) {
    return { decision: 'allow' };
  }

  const result = await runLint(filePath);

  if (result.success && result.errors.length === 0) {
    const message = result.warnings.length > 0
      ? `\n✅ Lint passed with ${result.warnings.length} warning(s) for ${filePath}\n`
      : '';

    return {
      decision: 'allow',
      message,
      metadata: {
        lint: 'passed',
        warningCount: result.warnings.length,
        warnings: result.warnings,
        output: result.output,
      },
    };
  }

  const errorCount = result.errors.length;
  const warningCount = result.warnings.length;
  const errorPreview = result.errors.slice(0, 10).join('\n');
  const hasMore = errorCount > 10 ? '\n... and ' + (errorCount - 10) + ' more errors' : '';

  const warningPreview = warningCount > 0
    ? '\n\n⚠️  Warnings (' + warningCount + '):\n' + result.warnings.slice(0, 5).join('\n')
    : '';

  return {
    decision: 'allow',
    message: '\n❌ ESLint failed after modifying ' + filePath + ':\n\n' + errorPreview + hasMore + warningPreview + '\n\nPlease fix these lint errors.\n',
    metadata: {
      lint: 'failed',
      errorCount,
      warningCount,
      errors: result.errors,
      warnings: result.warnings,
    },
  };
}
