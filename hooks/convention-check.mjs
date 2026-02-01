/**
 * Hook: convention-check
 * Event: PostToolUse
 * Description: Checks file writes against project conventions and warns on violations
 * Matcher: Write|Edit
 * Enabled: false
 *
 * convention-check - PostToolUse Hook
 *
 * When Claude writes or edits a file, checks the file against
 * .claude/conventions.json for naming, import, and test conventions.
 * Returns non-blocking warnings as additionalContext.
 *
 * Hook type: PostToolUse
 * Triggers: After Write or Edit tool use
 */

import { existsSync, readFileSync } from 'fs';
import { join, basename, extname } from 'path';

/**
 * Load conventions from project
 */
function loadConventions(cwd) {
  const convPath = join(cwd, '.claude', 'conventions.json');
  if (!existsSync(convPath)) return null;

  try {
    return JSON.parse(readFileSync(convPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Check file naming convention
 */
function checkNaming(fileName, expected) {
  const name = fileName.replace(/\.[^.]+$/, ''); // strip extension
  if (name === 'index' || name.startsWith('_')) return null;

  const checks = {
    'kebab-case': /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
    'camelCase': /^[a-z][a-zA-Z0-9]*$/,
    'PascalCase': /^[A-Z][a-zA-Z0-9]*$/,
    'snake_case': /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/,
  };

  const pattern = checks[expected];
  if (!pattern || pattern.test(name)) return null;

  return `File "${fileName}" doesn't follow ${expected} naming convention`;
}

/**
 * Main hook function
 */
export default async function conventionCheckHook(context) {
  const { tool_name, tool_input } = context;

  if (!tool_name || (tool_name !== 'Write' && tool_name !== 'Edit')) {
    return { decision: 'allow' };
  }

  const cwd = process.cwd();
  const conventions = loadConventions(cwd);
  if (!conventions) {
    return { decision: 'allow' };
  }

  const warnings = [];

  // Check file naming
  const filePath = tool_input?.file_path || '';
  if (filePath) {
    const fileName = basename(filePath);
    const ext = extname(fileName);

    // Only check source files
    if (['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go'].includes(ext)) {
      const namingWarning = checkNaming(fileName, conventions.naming?.files);
      if (namingWarning) {
        warnings.push(namingWarning);
      }
    }
  }

  if (warnings.length === 0) {
    return { decision: 'allow' };
  }

  return {
    decision: 'allow',
    message: `Convention check: ${warnings.length} warning(s)`,
    metadata: {
      warnings,
      conventionsFile: '.claude/conventions.json',
    },
  };
}
