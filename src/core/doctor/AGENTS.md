<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/core/doctor/

## Purpose

Installation health diagnostics and auto-repair system. Provides 11 diagnostic checks across 5 categories (directories, permissions, configuration, profiles, sync) with auto-fix capabilities for common issues.

## Key Files

| File | Purpose |
|------|---------|
| `index.ts` | Doctor interface and facade (302 lines) |
| `diagnostics.ts` | Diagnostic check implementations and registry |
| `fixes.ts` | Auto-repair functions for fixable issues |
| `diagnostics.test.ts` | Test suite for diagnostic checks |

## For AI Agents

### Working In This Directory

- **Check categories**: Directories, Permissions, Configuration, Profiles, Sync State
- **11 diagnostic checks**: claude-code-kit-dir, profile-dir, config-valid, active-profile, profile-exists, default-profile, permissions-read, permissions-write, sync-state, mcp-servers, addons-state
- **Severity levels**: Critical (system broken), Error (major feature broken), Warning (degraded), Info (advisory)
- **Fix availability**: Each check can optionally provide `fixAvailable: true` with corresponding fix function
- **Doctor interface**: `diagnose()`, `fix()`, `fixAll()`, `report()`, `healthCheck()`
- **Report format**: Structured `DiagnosticReport` with summary, results, available fixes, system info, duration
- **System info**: Collects platform, Node version, claude-code-kit version, Claude Code version (from `claude --version`)
- **Health status**: 'healthy' (all pass), 'degraded' (warnings only), 'unhealthy' (errors/critical)

### Testing Requirements

- Test each diagnostic check in isolation with mocked file system
- Test fix functions actually resolve the detected issues
- Test that `fixAll()` applies fixes in correct order
- Test report generation with various combinations of passing/failing checks
- Test severity classification and status determination
- Mock system commands (e.g., `claude --version`) for testing

### Common Patterns

- **Check structure**: `{ id, name, category, severity, check(), fix?() }`
- **Check registry**: `CHECKS` map stores all check definitions
- **Result format**: `{ id, name, category, severity, passed, message, suggestions?, fixAvailable?, fixId?, duration }`
- **Fix flow**: `applyFix(issue)` → look up fix by `fixId` or `id` → execute → return `FixResult`
- **Error handling**: Diagnostic checks never throw, always return result with `passed: false` and error message
- **Performance tracking**: Each check and fix tracks execution duration in milliseconds
- **Summary aggregation**: Count passed/failed/warnings/skipped across all results

## Dependencies

### Internal
- `@/types` - DiagnosticResult, FixResult, DoctorOptions, DiagnosticReport types
- `@/utils/paths` - Path resolution for checking directory existence
- `@/utils/fs` - File system operations for diagnostic checks
- `@/core/config` - Config loading for validation checks
- `@/core/sync` - Sync state checks

### External
- `node:fs/promises` - Async file system operations
- `node:path` - Path manipulation
- `node:child_process` - Execute `claude --version` command
- `node:perf_hooks` or `performance` - Duration tracking

<!-- MANUAL -->
