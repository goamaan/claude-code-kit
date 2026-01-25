# v3.4 Error Handling & UX Improvements

## Overview

This update significantly improves error handling, user experience, and help documentation across the CLI.

## New Features

### 1. Enhanced Error Utilities (`src/utils/errors.ts`)

A comprehensive error handling system with:

- **ClaudeOpsError**: Custom error class with context and actionable suggestions
- **Error Categories**: Organized error types (CONFIG, NETWORK, FILE_SYSTEM, PERMISSION, etc.)
- **Smart Error Handler**: Automatically categorizes errors and provides contextual help
- **Common Error Factories**: Pre-built errors for common scenarios

**Example:**
```typescript
// Before:
throw new Error('Config not found');

// After:
throw errors.configNotFound('/path/to/config.toml');
// Output includes:
// - Clear error message
// - File path context
// - Actionable suggestions (e.g., "Run: cck config init")
```

### 2. Error Helper Functions (`src/utils/error-helpers.ts`)

Reusable error handling patterns:

- `executeCommand()` - Wrap commands with consistent error handling
- `notFoundError()` - Resource not found errors
- `configError()` - Configuration validation errors
- `networkError()` - Network request failures
- `fileSystemError()` - File system operation failures
- `permissionError()` - Permission denied errors
- `validationError()` - Input validation errors
- `dependencyError()` - Missing/incompatible dependencies
- `installationError()` - Installation failures

### 3. Improved Upgrade Command

**New Features:**
- ✅ Check if already on latest version
- ✅ Show version change type (major/minor/patch)
- ✅ Warning for breaking changes (major versions)
- ✅ Link to changelog and release notes
- ✅ Better progress indicators
- ✅ Detailed error messages with recovery steps
- ✅ `--check` flag to check without installing
- ✅ `--force` flag to skip confirmation
- ✅ Examples in help text

**Error Messages:**

Before:
```
Could not check for updates. Are you online?
```

After:
```
x Could not check for updates

Possible reasons:
  • No internet connection
  • NPM registry is unavailable
  • Network firewall blocking access

To fix this:
  • Check your internet connection
  • Visit https://status.npmjs.org for registry status
  • Try again in a few moments
```

### 4. Enhanced CLI Help

**Organized by Category:**
- Getting Started (install, config init, doctor, sync)
- Core Commands (profile, config, sync)
- Extensions (setup, addon, pack, skill, mcp, hook)
- AI Features (classify)
- Utilities (cost, doctor, upgrade)

**Examples Section:**
```
Examples:
  cck config init              Create initial configuration
  cck profile create work      Create a work profile
  cck addon search react       Search for React addons
  cck pack add typescript      Add TypeScript pack
  cck upgrade --check          Check for updates
```

**Quick Links:**
- Command-specific help: `cck <command> --help`
- Diagnostics: `cck doctor`
- Documentation URL

## Error Message Improvements

### Network Errors

**Before:**
```
Error: fetch failed
```

**After:**
```
x Network error during package info fetch

Possible causes:
  • No internet connection
  • Server is unreachable
  • Network firewall blocking request

To fix this:
  • Check your internet connection
  • Try again in a few moments
  • Check proxy/firewall settings
```

### File Not Found Errors

**Before:**
```
Error: ENOENT: no such file or directory
```

**After:**
```
x Config file not found

Context: Looking for: ~/.claudeops/config.toml

To fix this:
  • Run: cck config init
  • Or create the file manually
```

### Permission Errors

**Before:**
```
Error: EACCES: permission denied
```

**After:**
```
x Permission denied

Path: ~/.claudeops/config.toml

To fix this:
  • Check permissions: ls -la "~/.claudeops/config.toml"
  • Fix permissions: chmod 755 "~/.claudeops/config.toml"
  • Try running with sudo (not recommended)
  • Use a user-level installation instead
```

### Validation Errors

**Before:**
```
Invalid value
```

**After:**
```
x Validation error

Field: budget_daily
Value: -10
Problem: Must be a positive number
Expected: Positive decimal (e.g., 10.50)

To fix this:
  • Check the value and try again
  • Run: cck config validate
```

## Usage Examples

### Upgrade Command

```bash
# Check for updates
cck upgrade --check

# Upgrade with confirmation
cck upgrade

# Force upgrade without confirmation
cck upgrade --force

# Get version info as JSON
cck upgrade --check --json
```

### Error Handling in Commands

```typescript
import { handleError, ErrorCategory } from '../utils/errors.js';
import { executeCommand } from '../utils/error-helpers.js';

// Wrap command with error handling
await executeCommand(async () => {
  // Command logic here
}, { category: ErrorCategory.NETWORK });

// Or use specific error helpers
if (!config) {
  notFoundError('Config', 'default', [
    'Run: cck config init',
    'Or: cck config list'
  ]);
}
```

## Benefits

1. **Better User Experience**: Clear, actionable error messages
2. **Faster Problem Resolution**: Errors include fix suggestions
3. **Reduced Support Burden**: Users can self-diagnose issues
4. **Consistent Error Format**: All errors follow same pattern
5. **Better Help Documentation**: Organized, example-driven help
6. **Improved Discoverability**: Categories and examples guide users

## Testing

All improvements have been:
- ✅ Type-checked with TypeScript
- ✅ Linted with ESLint
- ✅ Built successfully
- ✅ Manually tested for output quality

## Future Enhancements

Potential areas for further improvement:

1. **Internationalization**: Translate error messages
2. **Error Telemetry**: Track common errors for improvements
3. **Interactive Fixes**: Offer to auto-fix detected issues
4. **Context-Aware Suggestions**: Smarter suggestions based on project state
5. **Error Search**: `cck help errors` to search error solutions
