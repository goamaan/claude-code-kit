#!/usr/bin/env node
/**
 * Hook: typecheck-changed
 * Event: PostToolUse
 * Description: Runs TypeScript type checking after Write/Edit on .ts/.tsx files
 * Matcher: Write
 * Enabled: true
 *
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

// Check if file is a TypeScript file
function isTypeScriptFile(fp) {
  return /\.(ts|tsx)$/.test(fp);
}

if (!filePath || !isTypeScriptFile(filePath)) {
  process.exit(0);
}

/**
 * Find tsconfig.json in directory hierarchy
 */
function findTsConfig(fp) {
  let dir = dirname(resolve(fp));
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
async function runTypeCheck(fp) {
  const tsconfigPath = findTsConfig(fp);

  if (!tsconfigPath) {
    return { success: true, output: '', errors: [] };
  }

  const projectDir = dirname(tsconfigPath);

  try {
    const pkgPath = join(projectDir, 'package.json');
    let hasTypecheckScript = false;

    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      hasTypecheckScript = pkg.scripts && (pkg.scripts.typecheck || pkg.scripts['type-check']);
    }

    const pm = getPackageManager(projectDir);
    const runCmd = getRunCommand(pm);
    const execCmd = getExecCommand(pm);

    let command;
    if (hasTypecheckScript) {
      command = `${runCmd} typecheck 2>&1`;
    } else {
      command = `${execCmd} tsc --noEmit 2>&1`;
    }

    const { stdout } = await execAsync(command, {
      cwd: projectDir,
      encoding: 'utf8',
      timeout: 60000, // TypeScript can be slow
    });

    return { success: true, output: stdout, errors: [] };
  } catch (error) {
    const output = error.stdout || error.stderr || error.message;
    return { success: false, output, errors: [output] };
  }
}

// Run typecheck and output result
try {
  const result = await runTypeCheck(filePath);

  if (!result.success && result.errors.length > 0) {
    // Report type errors to Claude via additionalContext
    const output = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `[TYPE ERRORS] TypeScript found issues after modifying ${filePath}:\n\n${result.output.slice(0, 2000)}\n\nPlease fix these type errors.`
      }
    };
    console.log(JSON.stringify(output));
  }
} catch {
  // Silently fail - don't block on type errors
}

process.exit(0);
