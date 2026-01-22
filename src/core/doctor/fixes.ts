/**
 * Auto-fix Implementations
 * Provides automatic fixes for common diagnostic issues
 */

import type { DiagnosticResult, FixResult } from '@/types/index.js';
import { CHECKS, getCheck } from './diagnostics.js';

// =============================================================================
// Fix Registry
// =============================================================================

/**
 * Registry of fix implementations
 * Maps fix IDs to their implementation functions
 */
export const FIXES: Record<string, (result: DiagnosticResult) => Promise<FixResult>> = {};

// Populate FIXES from CHECKS that have fix implementations
for (const check of CHECKS) {
  if (check.fix) {
    FIXES[check.id] = async (_result: DiagnosticResult) => {
      return check.fix!();
    };
  }
}

// =============================================================================
// Fix Functions
// =============================================================================

/**
 * Apply a fix for a specific diagnostic result
 * @param diagnostic - The diagnostic result to fix
 * @returns Fix result indicating success or failure
 */
export async function applyFix(diagnostic: DiagnosticResult): Promise<FixResult> {
  const fixId = diagnostic.fixId ?? diagnostic.id;

  // Check if fix exists in registry
  const fixFn = FIXES[fixId];
  if (fixFn) {
    try {
      return await fixFn(diagnostic);
    } catch (error) {
      return {
        fixId,
        success: false,
        description: `Fix threw an error`,
        error: error instanceof Error ? error.message : String(error),
        actions: [],
        requiresRestart: false,
      };
    }
  }

  // Try to get fix from check definition
  const check = getCheck(diagnostic.id);
  if (check?.fix) {
    try {
      return await check.fix();
    } catch (error) {
      return {
        fixId,
        success: false,
        description: `Fix threw an error`,
        error: error instanceof Error ? error.message : String(error),
        actions: [],
        requiresRestart: false,
      };
    }
  }

  return {
    fixId,
    success: false,
    description: 'No fix available for this issue',
    error: `No fix registered for ID: ${fixId}`,
    actions: [],
    requiresRestart: false,
  };
}

/**
 * Apply all available fixes for a list of diagnostic results
 * @param diagnostics - Array of diagnostic results to fix
 * @returns Array of fix results
 */
export async function applyAllFixes(diagnostics: DiagnosticResult[]): Promise<FixResult[]> {
  const results: FixResult[] = [];

  // Filter to only failed diagnostics with available fixes
  const fixableDiagnostics = diagnostics.filter(
    (d) => !d.passed && d.fixAvailable
  );

  // Sort by severity (critical > error > warning > info)
  const severityOrder: Record<string, number> = {
    critical: 0,
    error: 1,
    warning: 2,
    info: 3,
  };

  fixableDiagnostics.sort(
    (a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
  );

  // Apply fixes in order
  for (const diagnostic of fixableDiagnostics) {
    const result = await applyFix(diagnostic);
    results.push(result);

    // If a fix requires restart, note it but continue
    // The caller can decide whether to stop or continue
  }

  return results;
}

/**
 * Check if a fix is available for a diagnostic
 * @param diagnostic - The diagnostic result to check
 * @returns Whether a fix is available
 */
export function hasFixAvailable(diagnostic: DiagnosticResult): boolean {
  if (diagnostic.fixAvailable) {
    return true;
  }

  const fixId = diagnostic.fixId ?? diagnostic.id;

  // Check registry
  if (FIXES[fixId]) {
    return true;
  }

  // Check check definition
  const check = getCheck(diagnostic.id);
  return check?.fix !== undefined;
}

/**
 * Get a summary of available fixes
 * @param diagnostics - Array of diagnostic results
 * @returns Summary of available fixes
 */
export function getFixSummary(diagnostics: DiagnosticResult[]): {
  total: number;
  fixable: number;
  unfixable: number;
  bySeverity: Record<string, { fixable: number; unfixable: number }>;
} {
  const failed = diagnostics.filter((d) => !d.passed);
  const fixable = failed.filter((d) => hasFixAvailable(d));
  const unfixable = failed.filter((d) => !hasFixAvailable(d));

  const bySeverity: Record<string, { fixable: number; unfixable: number }> = {};

  for (const diagnostic of failed) {
    if (!bySeverity[diagnostic.severity]) {
      bySeverity[diagnostic.severity] = { fixable: 0, unfixable: 0 };
    }

    if (hasFixAvailable(diagnostic)) {
      bySeverity[diagnostic.severity]!.fixable++;
    } else {
      bySeverity[diagnostic.severity]!.unfixable++;
    }
  }

  return {
    total: failed.length,
    fixable: fixable.length,
    unfixable: unfixable.length,
    bySeverity,
  };
}

/**
 * Validate that all necessary conditions are met before applying a fix
 * @param diagnostic - The diagnostic to validate
 * @returns Validation result with any blocking issues
 */
export async function validateFixPrerequisites(diagnostic: DiagnosticResult): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  // Check if fix is available
  if (!hasFixAvailable(diagnostic)) {
    issues.push('No fix implementation available');
    return { valid: false, issues };
  }

  // Check dependencies if this is a check-based fix
  const check = getCheck(diagnostic.id);
  if (check?.dependsOn) {
    // Dependencies are handled by the diagnostic runner
    // If we're here, dependencies should have passed
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
