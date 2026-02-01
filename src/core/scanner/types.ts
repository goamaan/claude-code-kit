/**
 * Scanner types for deterministic codebase analysis
 */

export interface ScanOptions {
  /** Target directory to scan (defaults to cwd) */
  path?: string;
  /** Output raw JSON (for skill consumption) */
  json?: boolean;
}

export interface LanguageInfo {
  name: string;
  extensions: string[];
  fileCount: number;
}

export interface FrameworkInfo {
  name: string;
  version?: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

export interface BuildInfo {
  tool: string;
  scripts: Record<string, string>;
  source: string;
}

export interface TestInfo {
  framework: string;
  configFile?: string;
  testDirs: string[];
}

export interface LintInfo {
  tool: string;
  configFile: string;
}

export interface CIInfo {
  platform: string;
  configFile: string;
}

export interface DatabaseInfo {
  type: string;
  orm?: string;
  migrationDir?: string;
}

export interface APIInfo {
  style: string;
  evidence: string[];
}

export interface MonorepoInfo {
  tool: string;
  packages: string[];
}

export interface KeyFile {
  path: string;
  type: 'readme' | 'contributing' | 'config' | 'entry' | 'schema' | 'other';
}

export interface ExistingClaudeConfig {
  hasClaudeDir: boolean;
  hasClaudeMd: boolean;
  hasSettings: boolean;
  hasSkills: boolean;
  skillNames: string[];
}

export interface PythonInfo {
  version?: string;
  venvType?: 'venv' | 'poetry' | 'pipenv' | 'uv' | 'conda';
  typeChecker?: 'mypy' | 'pyright' | 'basedpyright';
  packageLayout?: 'src' | 'flat';
}

export interface RustInfo {
  edition?: string;
  workspace?: boolean;
  features?: string[];
  hasBuildScript?: boolean;
  hasClippy?: boolean;
}

export interface GoInfo {
  version?: string;
  modulePath?: string;
  hasInternal?: boolean;
  hasMakefile?: boolean;
}

export interface JavaInfo {
  buildTool?: 'maven' | 'gradle' | 'gradle-kotlin';
  springBoot?: boolean;
  javaVersion?: string;
  junitVersion?: '4' | '5';
}

export interface ScanResult {
  /** Absolute path of scanned directory */
  root: string;
  /** Detected programming languages */
  languages: LanguageInfo[];
  /** Detected frameworks */
  frameworks: FrameworkInfo[];
  /** Build system info */
  build: BuildInfo | null;
  /** Test framework info */
  testing: TestInfo[];
  /** Linter/formatter info */
  linting: LintInfo[];
  /** CI/CD info */
  ci: CIInfo[];
  /** Database/ORM info */
  database: DatabaseInfo[];
  /** API style info */
  api: APIInfo[];
  /** Monorepo info */
  monorepo: MonorepoInfo | null;
  /** Directory structure overview */
  directories: string[];
  /** Existing .claude/ configuration */
  existingConfig: ExistingClaudeConfig;
  /** Key files worth reading for context */
  keyFiles: KeyFile[];
  /** Language-specific enhanced info */
  python?: PythonInfo;
  rust?: RustInfo;
  go?: GoInfo;
  java?: JavaInfo;
}
