/**
 * Diagnostic types for the doctor command
 * Defines diagnostic checks, results, and fixes
 */

// =============================================================================
// Diagnostic Severity
// =============================================================================

export type DiagnosticSeverity = 'info' | 'warning' | 'error' | 'critical';

// =============================================================================
// Diagnostic Result
// =============================================================================

export interface DiagnosticResult {
  /** Unique check ID */
  id: string;

  /** Human-readable check name */
  name: string;

  /** Check category */
  category: DiagnosticCategory;

  /** Severity of the issue (if any) */
  severity: DiagnosticSeverity;

  /** Whether the check passed */
  passed: boolean;

  /** Description of what was checked */
  description: string;

  /** Detailed message about the result */
  message: string;

  /** Suggestions for fixing the issue */
  suggestions?: string[];

  /** Whether an automatic fix is available */
  fixAvailable: boolean;

  /** Fix function identifier (if fixAvailable is true) */
  fixId?: string;

  /** Additional details for debugging */
  details?: Record<string, unknown>;

  /** Time taken to run this check (in ms) */
  duration: number;
}

// =============================================================================
// Diagnostic Category
// =============================================================================

export type DiagnosticCategory =
  | 'installation'
  | 'configuration'
  | 'permissions'
  | 'dependencies'
  | 'mcp'
  | 'hooks'
  | 'profiles'
  | 'skills'
  | 'learnings'
  | 'addons'
  | 'sync'
  | 'system';

// =============================================================================
// Fix Result
// =============================================================================

export interface FixResult {
  /** Fix ID that was executed */
  fixId: string;

  /** Whether the fix was successful */
  success: boolean;

  /** Description of what was fixed */
  description: string;

  /** Error message if fix failed */
  error?: string;

  /** Actions taken during the fix */
  actions: Array<{
    action: string;
    success: boolean;
    details?: string;
  }>;

  /** Whether a restart is required */
  requiresRestart: boolean;

  /** Additional instructions for the user */
  instructions?: string[];
}

// =============================================================================
// Validation Result
// =============================================================================

export interface ValidationResult {
  /** What was validated */
  subject: string;

  /** Subject type */
  type: 'config' | 'manifest' | 'profile' | 'addon' | 'hook' | 'mcp';

  /** Whether validation passed */
  valid: boolean;

  /** Validation errors */
  errors: Array<{
    path: string;
    message: string;
    code: string;
    severity: DiagnosticSeverity;
  }>;

  /** Validation warnings */
  warnings: Array<{
    path: string;
    message: string;
  }>;

  /** Schema used for validation (if applicable) */
  schema?: string;
}

// =============================================================================
// Diagnostic Check Definition
// =============================================================================

/**
 * Context passed to diagnostic checks for path overrides (primarily for testing)
 */
export interface DiagnosticContext {
  getConfigDir: () => string;
  getClaudeDir: () => string;
  getProfilesDir: () => string;
  getAddonsDir: () => string;
}

export interface DiagnosticCheck {
  /** Unique check ID */
  id: string;

  /** Human-readable name */
  name: string;

  /** Check category */
  category: DiagnosticCategory;

  /** Description of what this check does */
  description: string;

  /** Whether this check is enabled by default */
  enabledByDefault: boolean;

  /** Dependencies on other checks (must pass first) */
  dependsOn?: string[];

  /** Execute the check */
  run: (context?: DiagnosticContext) => Promise<DiagnosticResult>;

  /** Fix function (if available) */
  fix?: (context?: DiagnosticContext) => Promise<FixResult>;
}

// =============================================================================
// Diagnostic Report
// =============================================================================

export interface DiagnosticReport {
  /** Report timestamp */
  timestamp: Date;

  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /** Summary statistics */
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
  };

  /** Individual check results */
  results: DiagnosticResult[];

  /** Available fixes */
  availableFixes: Array<{
    fixId: string;
    checkId: string;
    description: string;
    severity: DiagnosticSeverity;
  }>;

  /** System information */
  system: {
    platform: string;
    nodeVersion: string;
    claudeopsVersion: string;
    claudeCodeVersion?: string;
  };

  /** Total duration of all checks (in ms) */
  duration: number;
}

// =============================================================================
// Doctor Options
// =============================================================================

export interface DoctorOptions {
  /** Categories to check (default: all) */
  categories?: DiagnosticCategory[];

  /** Specific check IDs to run */
  checks?: string[];

  /** Skip specific checks */
  skip?: string[];

  /** Automatically apply available fixes */
  autoFix?: boolean;

  /** Interactive mode (prompt before fixes) */
  interactive?: boolean;

  /** Verbose output */
  verbose?: boolean;

  /** Output format */
  format?: 'text' | 'json' | 'markdown';

  /** Timeout per check (in ms) */
  timeout?: number;
}

// =============================================================================
// Common Diagnostic Checks
// =============================================================================

export const DIAGNOSTIC_CHECKS = {
  // Installation checks
  CLAUDE_KIT_INSTALLED: 'installation:claudeops-installed',
  OMC_INSTALLED: 'installation:omc-installed',
  CLAUDE_CODE_INSTALLED: 'installation:claude-code-installed',
  CLAUDE_INSTALLED: 'installation:claude-installed',
  NODE_VERSION: 'installation:node-version',

  // Configuration checks
  CONFIG_EXISTS: 'configuration:config-exists',
  CONFIG_VALID: 'configuration:config-valid',
  SETTINGS_VALID: 'configuration:settings-valid',
  PROFILE_VALID: 'configuration:profile-valid',

  // Permissions checks
  CONFIG_DIR_WRITABLE: 'permissions:config-dir-writable',
  DATA_DIR_WRITABLE: 'permissions:data-dir-writable',
  HOOKS_EXECUTABLE: 'permissions:hooks-executable',

  // Dependencies checks
  REQUIRED_PACKAGES: 'dependencies:required-packages',
  OPTIONAL_PACKAGES: 'dependencies:optional-packages',
  ADDON_DEPENDENCIES: 'dependencies:addon-dependencies',

  // MCP checks
  MCP_SERVERS_CONFIG: 'mcp:servers-config',
  MCP_SERVERS_RUNNING: 'mcp:servers-running',
  MCP_SERVERS_HEALTHY: 'mcp:servers-healthy',

  // Hooks checks
  HOOKS_CONFIG_VALID: 'hooks:config-valid',
  HOOKS_HANDLERS_EXIST: 'hooks:handlers-exist',
  HOOKS_NO_CONFLICTS: 'hooks:no-conflicts',

  // Profiles checks
  ACTIVE_PROFILE_EXISTS: 'profiles:active-exists',
  PROFILE_INHERITANCE_VALID: 'profiles:inheritance-valid',

  // Addons checks
  ADDONS_MANIFESTS_VALID: 'addons:manifests-valid',
  ADDONS_DEPENDENCIES_MET: 'addons:dependencies-met',
  ADDONS_NO_CONFLICTS: 'addons:no-conflicts',

  // Sync checks
  SYNC_STATUS: 'sync:status',
  SYNC_REMOTE_REACHABLE: 'sync:remote-reachable',

  // System checks
  DISK_SPACE: 'system:disk-space',
  MEMORY_AVAILABLE: 'system:memory-available',
  NETWORK_CONNECTIVITY: 'system:network-connectivity',
} as const;

export type DiagnosticCheckId = typeof DIAGNOSTIC_CHECKS[keyof typeof DIAGNOSTIC_CHECKS];
