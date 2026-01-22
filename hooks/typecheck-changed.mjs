/**
 * typecheck-changed - PostToolUse Hook
 *
 * Runs TypeScript type checking after Write/Edit tools modify .ts/.tsx files.
 * Uses `tsc --noEmit` or project's typecheck script.
 *
 * Hook type: PostToolUse
 * Triggers: After Write, Edit tools modify TypeScript files
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { dirname, resolve, join } from 'path';

const execAsync = promisify(exec);

/**
 * Check if file is a TypeScript file
 */
function isTypeScriptFile(filePath) {
  return /\.(ts|tsx)$/.test(filePath);
}

/**
 * Find tsconfig.json in directory hierarchy
 */
function findTsConfig(filePath) {
  let dir = dirname(resolve(filePath));
  const root = '/';

  while (dir !== root) {
    const tsconfigPath = join(dir, 'tsconfig.json');
    if (existsSync(tsconfigPath)) {
      return tsconfigPath;
    }
    const parentDir = dirname(dir);
    if (parentDir === dir) break;
    dir = parentDir;
  }

  return null;
}

/**
 * Run TypeScript type checking
 */
async function runTypeCheck(filePath) {
  const tsconfigPath = findTsConfig(filePath);

  if (!tsconfigPath) {
    return {
      success: true,
      output: 'No tsconfig.json found, skipping type check',
      errors: [],
    };
  }

  const projectDir = dirname(tsconfigPath);

  try {
    const { stdout: packageJson } = await execAsync('cat package.json', {
      cwd: projectDir,
      encoding: 'utf8',
    }).catch(() => ({ stdout: '{}' }));

    const pkg = JSON.parse(packageJson);
    const hasTypecheckScript = pkg.scripts && pkg.scripts.typecheck;

    let command;
    if (hasTypecheckScript) {
      command = 'npm run typecheck';
    } else {
      command = 'npx tsc --noEmit';
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectDir,
      encoding: 'utf8',
      timeout: 30000,
    });

    return {
      success: true,
      output: stdout + stderr,
      errors: [],
    };
  } catch (error) {
    const output = (error.stdout || '') + (error.stderr || '');
    const errors = parseTypeScriptErrors(output);

    return {
      success: false,
      output,
      errors,
    };
  }
}

/**
 * Parse TypeScript error output
 */
function parseTypeScriptErrors(output) {
  const errors = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (/\.tsx?:\d+:\d+/.test(line) || /error TS\d+:/.test(line)) {
      errors.push(line.trim());
    }
  }

  return errors.length > 0 ? errors : [output.trim()];
}

/**
 * Main hook function
 */
export default async function typecheckChangedHook(context) {
  const { tool, toolInput } = context;

  if (tool !== 'Write' && tool !== 'Edit') {
    return { decision: 'allow' };
  }

  const filePath = toolInput.file_path;

  if (!filePath || !isTypeScriptFile(filePath)) {
    return { decision: 'allow' };
  }

  const result = await runTypeCheck(filePath);

  if (result.success) {
    return {
      decision: 'allow',
      metadata: {
        typecheck: 'passed',
        output: result.output,
      },
    };
  }

  const errorCount = result.errors.length;
  const errorPreview = result.errors.slice(0, 10).join('\n');
  const hasMore = errorCount > 10 ? '\n... and ' + (errorCount - 10) + ' more errors' : '';

  return {
    decision: 'allow',
    message: '\n⚠️  TypeScript type check failed after modifying ' + filePath + ':\n\n' + errorPreview + hasMore + '\n\nPlease fix these type errors.\n',
    metadata: {
      typecheck: 'failed',
      errorCount,
      errors: result.errors,
    },
  };
}
