/**
 * Doctor Module
 * Provides diagnostic and repair functionality for claude-code-kit
 */

import type {
  DiagnosticResult,
  FixResult,
  DoctorOptions,
  DiagnosticReport,
} from '@/types/index.js';
import { runDiagnostics } from './diagnostics.js';
import { applyFix, applyAllFixes, hasFixAvailable } from './fixes.js';

// =============================================================================
// Re-exports
// =============================================================================

export {
  runDiagnostics,
  CHECKS,
  getCheck,
} from './diagnostics.js';

export {
  applyFix,
  applyAllFixes,
  getFixSummary,
  hasFixAvailable,
  FIXES,
} from './fixes.js';

// =============================================================================
// Doctor Interface
// =============================================================================

export interface Doctor {
  /** Run diagnostic checks */
  diagnose(options?: DoctorOptions): Promise<DiagnosticResult[]>;

  /** Apply fixes for specific issues */
  fix(issues: DiagnosticResult[]): Promise<FixResult[]>;

  /** Run diagnostics and fix all fixable issues */
  fixAll(): Promise<FixResult[]>;

  /** Get a full diagnostic report */
  report(options?: DoctorOptions): Promise<DiagnosticReport>;

  /** Check overall health status */
  healthCheck(): Promise<'healthy' | 'degraded' | 'unhealthy'>;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create a Doctor instance
 */
export function createDoctor(): Doctor {
  /**
   * Run diagnostic checks
   */
  async function diagnose(options?: DoctorOptions): Promise<DiagnosticResult[]> {
    return runDiagnostics({
      categories: options?.categories,
      checks: options?.checks,
      skip: options?.skip,
    });
  }

  /**
   * Apply fixes for specific issues
   */
  async function fix(issues: DiagnosticResult[]): Promise<FixResult[]> {
    const fixableIssues = issues.filter(
      (issue) => !issue.passed && hasFixAvailable(issue)
    );

    const results: FixResult[] = [];

    for (const issue of fixableIssues) {
      const result = await applyFix(issue);
      results.push(result);
    }

    return results;
  }

  /**
   * Run diagnostics and fix all fixable issues
   */
  async function fixAll(): Promise<FixResult[]> {
    const diagnostics = await diagnose();
    return applyAllFixes(diagnostics);
  }

  /**
   * Get a full diagnostic report
   */
  async function report(options?: DoctorOptions): Promise<DiagnosticReport> {
    const startTime = performance.now();
    const results = await diagnose(options);

    // Calculate summary
    const passed = results.filter((r) => r.passed);
    const failed = results.filter((r) => !r.passed);
    const warnings = failed.filter((r) => r.severity === 'warning');
    const skipped = results.filter(
      (r) => r.message.startsWith('Skipped')
    );

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    const criticalErrors = failed.filter(
      (r) => r.severity === 'critical' || r.severity === 'error'
    );

    if (criticalErrors.length > 0) {
      status = 'unhealthy';
    } else if (warnings.length > 0) {
      status = 'degraded';
    }

    // Collect available fixes
    const availableFixes = failed
      .filter((r) => r.fixAvailable)
      .map((r) => ({
        fixId: r.fixId ?? r.id,
        checkId: r.id,
        description: r.suggestions?.[0] ?? 'Fix available',
        severity: r.severity,
      }));

    // Get system info
    const systemInfo = await getSystemInfo();

    const totalDuration = performance.now() - startTime;

    return {
      timestamp: new Date(),
      status,
      summary: {
        total: results.length,
        passed: passed.length,
        failed: failed.length,
        warnings: warnings.length,
        skipped: skipped.length,
      },
      results,
      availableFixes,
      system: systemInfo,
      duration: totalDuration,
    };
  }

  /**
   * Quick health check
   */
  async function healthCheck(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    // Run only critical checks
    const criticalChecks = ['claude-code-kit-dir', 'config-valid', 'active-profile'];
    const results = await runDiagnostics({ checks: criticalChecks });

    const failed = results.filter((r) => !r.passed);
    const criticalFailures = failed.filter(
      (r) => r.severity === 'critical' || r.severity === 'error'
    );
    const warnings = failed.filter((r) => r.severity === 'warning');

    if (criticalFailures.length > 0) {
      return 'unhealthy';
    }

    if (warnings.length > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  return {
    diagnose,
    fix,
    fixAll,
    report,
    healthCheck,
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get system information for diagnostic reports
 */
async function getSystemInfo(): Promise<DiagnosticReport['system']> {
  const { execSync } = await import('node:child_process');

  let claudeKitVersion = '0.0.0';
  let claudeCodeVersion: string | undefined;
  let omcVersion: string | undefined;

  // Try to get claude-code-kit version from package.json
  try {
    const packageJson = await import('../../../package.json', {
      assert: { type: 'json' },
    });
    claudeKitVersion = packageJson.default.version;
  } catch {
    // Ignore if package.json can't be loaded
  }

  // Try to get Claude Code version
  try {
    const output = execSync('claude --version 2>/dev/null || echo ""', {
      encoding: 'utf-8',
    }).trim();
    if (output) {
      claudeCodeVersion = output;
    }
  } catch {
    // Ignore if claude command not found
  }

  return {
    platform: process.platform,
    nodeVersion: process.version,
    claudeKitVersion,
    claudeCodeVersion,
    omcVersion,
  };
}

/**
 * Format a diagnostic report for display
 */
export function formatReport(report: DiagnosticReport): string {
  const lines: string[] = [];

  // Header
  lines.push('# Claude-Kit Health Report');
  lines.push(`Generated: ${report.timestamp.toISOString()}`);
  lines.push(`Status: ${report.status.toUpperCase()}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push(`- Total checks: ${report.summary.total}`);
  lines.push(`- Passed: ${report.summary.passed}`);
  lines.push(`- Failed: ${report.summary.failed}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push('');

  // Failed checks
  const failed = report.results.filter((r) => !r.passed);
  if (failed.length > 0) {
    lines.push('## Issues Found');
    for (const result of failed) {
      lines.push(`### [${result.severity.toUpperCase()}] ${result.name}`);
      lines.push(`- ${result.message}`);
      if (result.suggestions?.length) {
        lines.push('- Suggestions:');
        for (const suggestion of result.suggestions) {
          lines.push(`  - ${suggestion}`);
        }
      }
      lines.push('');
    }
  }

  // Available fixes
  if (report.availableFixes.length > 0) {
    lines.push('## Available Fixes');
    lines.push('Run "claude-code-kit doctor --fix" to apply these fixes:');
    for (const fix of report.availableFixes) {
      lines.push(`- ${fix.description} (${fix.checkId})`);
    }
    lines.push('');
  }

  // System info
  lines.push('## System Information');
  lines.push(`- Platform: ${report.system.platform}`);
  lines.push(`- Node.js: ${report.system.nodeVersion}`);
  lines.push(`- claude-code-kit: ${report.system.claudeKitVersion}`);
  if (report.system.claudeCodeVersion) {
    lines.push(`- Claude Code: ${report.system.claudeCodeVersion}`);
  }
  if (report.system.omcVersion) {
    lines.push(`- oh-my-claudecode: ${report.system.omcVersion}`);
  }

  lines.push('');
  lines.push(`Duration: ${report.duration.toFixed(2)}ms`);

  return lines.join('\n');
}
