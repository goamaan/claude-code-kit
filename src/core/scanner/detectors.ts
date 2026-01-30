/**
 * Deterministic codebase analysis detectors
 * Each detector scans for specific signals without using AI
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import type {
  LanguageInfo,
  FrameworkInfo,
  BuildInfo,
  TestInfo,
  LintInfo,
  CIInfo,
  DatabaseInfo,
  APIInfo,
  MonorepoInfo,
  KeyFile,
  ExistingClaudeConfig,
} from './types.js';

/**
 * Read a JSON file safely, returning null on failure
 */
function readJsonSafe(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Check if a file or directory exists
 */
function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * List directory entries safely
 */
function listDir(dirPath: string): string[] {
  try {
    return readdirSync(dirPath);
  } catch {
    return [];
  }
}

/**
 * Check if path is a directory
 */
function isDir(filePath: string): boolean {
  try {
    return statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

// =============================================================================
// Language Detection
// =============================================================================

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.py': 'Python',
  '.rs': 'Rust',
  '.go': 'Go',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.swift': 'Swift',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.c': 'C',
  '.zig': 'Zig',
  '.ex': 'Elixir',
  '.exs': 'Elixir',
  '.scala': 'Scala',
  '.dart': 'Dart',
  '.lua': 'Lua',
  '.r': 'R',
  '.R': 'R',
  '.jl': 'Julia',
  '.clj': 'Clojure',
  '.hs': 'Haskell',
  '.ml': 'OCaml',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
};

export function detectLanguages(root: string): LanguageInfo[] {
  const counts = new Map<string, { extensions: Set<string>; count: number }>();

  function walk(dir: string, depth: number): void {
    if (depth > 5) return; // Limit recursion depth
    const entries = listDir(dir);

    for (const entry of entries) {
      // Skip common non-source directories
      if (['node_modules', '.git', 'dist', 'build', 'target', '.next', '__pycache__', 'vendor', '.venv', 'venv'].includes(entry)) continue;

      const fullPath = join(dir, entry);

      if (isDir(fullPath)) {
        walk(fullPath, depth + 1);
      } else {
        const ext = extname(entry);
        const lang = LANGUAGE_EXTENSIONS[ext];
        if (lang) {
          const existing = counts.get(lang) ?? { extensions: new Set<string>(), count: 0 };
          existing.extensions.add(ext);
          existing.count++;
          counts.set(lang, existing);
        }
      }
    }
  }

  walk(root, 0);

  return Array.from(counts.entries())
    .map(([name, { extensions, count }]) => ({
      name,
      extensions: Array.from(extensions),
      fileCount: count,
    }))
    .sort((a, b) => b.fileCount - a.fileCount);
}

// =============================================================================
// Framework Detection
// =============================================================================

export function detectFrameworks(root: string): FrameworkInfo[] {
  const frameworks: FrameworkInfo[] = [];

  // Check package.json for JS/TS frameworks
  const pkgJson = readJsonSafe(join(root, 'package.json'));
  if (pkgJson) {
    const deps = {
      ...((pkgJson['dependencies'] as Record<string, string>) ?? {}),
      ...((pkgJson['devDependencies'] as Record<string, string>) ?? {}),
    };

    const JS_FRAMEWORKS: Array<{ name: string; packages: string[] }> = [
      { name: 'Next.js', packages: ['next'] },
      { name: 'React', packages: ['react'] },
      { name: 'Vue', packages: ['vue'] },
      { name: 'Svelte', packages: ['svelte'] },
      { name: 'Angular', packages: ['@angular/core'] },
      { name: 'Express', packages: ['express'] },
      { name: 'Fastify', packages: ['fastify'] },
      { name: 'Hono', packages: ['hono'] },
      { name: 'NestJS', packages: ['@nestjs/core'] },
      { name: 'Nuxt', packages: ['nuxt'] },
      { name: 'Remix', packages: ['@remix-run/react'] },
      { name: 'Astro', packages: ['astro'] },
      { name: 'Vite', packages: ['vite'] },
      { name: 'Electron', packages: ['electron'] },
      { name: 'React Native', packages: ['react-native'] },
      { name: 'Expo', packages: ['expo'] },
      { name: 'Tailwind CSS', packages: ['tailwindcss'] },
    ];

    for (const fw of JS_FRAMEWORKS) {
      for (const pkg of fw.packages) {
        if (deps[pkg]) {
          frameworks.push({
            name: fw.name,
            version: deps[pkg],
            confidence: 'high',
            source: 'package.json',
          });
          break;
        }
      }
    }
  }

  // Python frameworks
  const PYTHON_CONFIGS: Array<{ name: string; files: string[]; patterns?: string[] }> = [
    { name: 'Django', files: ['manage.py'], patterns: ['django'] },
    { name: 'Flask', files: [], patterns: ['flask'] },
    { name: 'FastAPI', files: [], patterns: ['fastapi'] },
  ];

  const reqFiles = ['requirements.txt', 'pyproject.toml', 'setup.py'];
  let pythonDeps = '';
  for (const f of reqFiles) {
    const fp = join(root, f);
    if (fileExists(fp)) {
      try { pythonDeps += readFileSync(fp, 'utf-8'); } catch { /* ignore */ }
    }
  }

  for (const fw of PYTHON_CONFIGS) {
    const hasFile = fw.files.some(f => fileExists(join(root, f)));
    const hasPattern = fw.patterns?.some(p => pythonDeps.toLowerCase().includes(p));
    if (hasFile || hasPattern) {
      frameworks.push({
        name: fw.name,
        confidence: hasFile ? 'high' : 'medium',
        source: hasFile ? 'config file' : 'dependencies',
      });
    }
  }

  // Rust frameworks
  const cargoToml = join(root, 'Cargo.toml');
  if (fileExists(cargoToml)) {
    try {
      const content = readFileSync(cargoToml, 'utf-8');
      if (content.includes('actix-web')) frameworks.push({ name: 'Actix Web', confidence: 'high', source: 'Cargo.toml' });
      if (content.includes('axum')) frameworks.push({ name: 'Axum', confidence: 'high', source: 'Cargo.toml' });
      if (content.includes('rocket')) frameworks.push({ name: 'Rocket', confidence: 'high', source: 'Cargo.toml' });
      if (content.includes('tauri')) frameworks.push({ name: 'Tauri', confidence: 'high', source: 'Cargo.toml' });
    } catch { /* ignore */ }
  }

  // Go frameworks
  const goMod = join(root, 'go.mod');
  if (fileExists(goMod)) {
    try {
      const content = readFileSync(goMod, 'utf-8');
      if (content.includes('gin-gonic')) frameworks.push({ name: 'Gin', confidence: 'high', source: 'go.mod' });
      if (content.includes('labstack/echo')) frameworks.push({ name: 'Echo', confidence: 'high', source: 'go.mod' });
      if (content.includes('gofiber')) frameworks.push({ name: 'Fiber', confidence: 'high', source: 'go.mod' });
    } catch { /* ignore */ }
  }

  return frameworks;
}

// =============================================================================
// Build System Detection
// =============================================================================

export function detectBuild(root: string): BuildInfo | null {
  // package.json scripts
  const pkgJson = readJsonSafe(join(root, 'package.json'));
  if (pkgJson?.['scripts']) {
    return {
      tool: 'npm scripts',
      scripts: pkgJson['scripts'] as Record<string, string>,
      source: 'package.json',
    };
  }

  // Makefile
  if (fileExists(join(root, 'Makefile'))) {
    return { tool: 'make', scripts: {}, source: 'Makefile' };
  }

  // Cargo
  if (fileExists(join(root, 'Cargo.toml'))) {
    return { tool: 'cargo', scripts: { build: 'cargo build', test: 'cargo test' }, source: 'Cargo.toml' };
  }

  // Go
  if (fileExists(join(root, 'go.mod'))) {
    return { tool: 'go', scripts: { build: 'go build ./...', test: 'go test ./...' }, source: 'go.mod' };
  }

  return null;
}

// =============================================================================
// Test Framework Detection
// =============================================================================

export function detectTesting(root: string): TestInfo[] {
  const tests: TestInfo[] = [];

  // JavaScript test frameworks
  const testConfigs: Array<{ framework: string; files: string[] }> = [
    { framework: 'vitest', files: ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts'] },
    { framework: 'jest', files: ['jest.config.js', 'jest.config.ts', 'jest.config.mjs'] },
    { framework: 'mocha', files: ['.mocharc.yml', '.mocharc.json', '.mocharc.js'] },
    { framework: 'playwright', files: ['playwright.config.ts', 'playwright.config.js'] },
    { framework: 'cypress', files: ['cypress.config.ts', 'cypress.config.js', 'cypress.json'] },
  ];

  for (const tc of testConfigs) {
    for (const file of tc.files) {
      if (fileExists(join(root, file))) {
        const testDirs: string[] = [];
        for (const dir of ['test', 'tests', '__tests__', 'spec', 'e2e']) {
          if (isDir(join(root, dir))) testDirs.push(dir);
        }
        // Also check for inline test files
        if (isDir(join(root, 'src'))) testDirs.push('src (inline)');

        tests.push({ framework: tc.framework, configFile: file, testDirs });
        break;
      }
    }
  }

  // Python test frameworks
  if (fileExists(join(root, 'pytest.ini')) || fileExists(join(root, 'pyproject.toml'))) {
    const testDirs: string[] = [];
    for (const dir of ['tests', 'test']) {
      if (isDir(join(root, dir))) testDirs.push(dir);
    }
    if (fileExists(join(root, 'pytest.ini'))) {
      tests.push({ framework: 'pytest', configFile: 'pytest.ini', testDirs });
    } else if (fileExists(join(root, 'pyproject.toml'))) {
      try {
        const content = readFileSync(join(root, 'pyproject.toml'), 'utf-8');
        if (content.includes('[tool.pytest]')) {
          tests.push({ framework: 'pytest', configFile: 'pyproject.toml', testDirs });
        }
      } catch { /* ignore */ }
    }
  }

  return tests;
}

// =============================================================================
// Linting/Formatting Detection
// =============================================================================

export function detectLinting(root: string): LintInfo[] {
  const linters: LintInfo[] = [];

  const lintConfigs: Array<{ tool: string; files: string[] }> = [
    { tool: 'eslint', files: ['.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', 'eslint.config.js', 'eslint.config.mjs', 'eslint.config.ts'] },
    { tool: 'prettier', files: ['.prettierrc', '.prettierrc.js', '.prettierrc.json', '.prettierrc.yml', 'prettier.config.js', 'prettier.config.mjs'] },
    { tool: 'biome', files: ['biome.json', 'biome.jsonc'] },
    { tool: 'rustfmt', files: ['rustfmt.toml', '.rustfmt.toml'] },
    { tool: 'clippy', files: ['clippy.toml', '.clippy.toml'] },
    { tool: 'black', files: ['pyproject.toml'] }, // checked separately
    { tool: 'ruff', files: ['ruff.toml', '.ruff.toml'] },
    { tool: 'golangci-lint', files: ['.golangci.yml', '.golangci.yaml', '.golangci.toml'] },
  ];

  for (const lc of lintConfigs) {
    // Special handling for tools that share config files
    if (lc.tool === 'black') {
      try {
        const content = readFileSync(join(root, 'pyproject.toml'), 'utf-8');
        if (content.includes('[tool.black]')) {
          linters.push({ tool: 'black', configFile: 'pyproject.toml' });
        }
      } catch { /* ignore */ }
      continue;
    }

    for (const file of lc.files) {
      if (fileExists(join(root, file))) {
        linters.push({ tool: lc.tool, configFile: file });
        break;
      }
    }
  }

  return linters;
}

// =============================================================================
// CI/CD Detection
// =============================================================================

export function detectCI(root: string): CIInfo[] {
  const ci: CIInfo[] = [];

  if (isDir(join(root, '.github', 'workflows'))) {
    const files = listDir(join(root, '.github', 'workflows'));
    for (const file of files) {
      if (file.endsWith('.yml') || file.endsWith('.yaml')) {
        ci.push({ platform: 'GitHub Actions', configFile: `.github/workflows/${file}` });
      }
    }
  }

  if (fileExists(join(root, '.gitlab-ci.yml'))) {
    ci.push({ platform: 'GitLab CI', configFile: '.gitlab-ci.yml' });
  }

  if (fileExists(join(root, 'Jenkinsfile'))) {
    ci.push({ platform: 'Jenkins', configFile: 'Jenkinsfile' });
  }

  if (fileExists(join(root, '.circleci', 'config.yml'))) {
    ci.push({ platform: 'CircleCI', configFile: '.circleci/config.yml' });
  }

  if (fileExists(join(root, '.travis.yml'))) {
    ci.push({ platform: 'Travis CI', configFile: '.travis.yml' });
  }

  return ci;
}

// =============================================================================
// Database/ORM Detection
// =============================================================================

export function detectDatabase(root: string): DatabaseInfo[] {
  const databases: DatabaseInfo[] = [];

  // Prisma
  if (isDir(join(root, 'prisma')) || fileExists(join(root, 'prisma', 'schema.prisma'))) {
    databases.push({ type: 'SQL', orm: 'Prisma', migrationDir: 'prisma/migrations' });
  }

  // Drizzle
  if (fileExists(join(root, 'drizzle.config.ts')) || fileExists(join(root, 'drizzle.config.js'))) {
    databases.push({ type: 'SQL', orm: 'Drizzle' });
  }

  // TypeORM
  if (fileExists(join(root, 'ormconfig.json')) || fileExists(join(root, 'ormconfig.js'))) {
    databases.push({ type: 'SQL', orm: 'TypeORM' });
  }

  // Knex
  if (fileExists(join(root, 'knexfile.js')) || fileExists(join(root, 'knexfile.ts'))) {
    databases.push({ type: 'SQL', orm: 'Knex' });
  }

  // SQLAlchemy / Alembic
  if (isDir(join(root, 'alembic')) || fileExists(join(root, 'alembic.ini'))) {
    databases.push({ type: 'SQL', orm: 'SQLAlchemy', migrationDir: 'alembic' });
  }

  // Django migrations
  if (isDir(join(root, 'migrations'))) {
    databases.push({ type: 'SQL', orm: 'Django ORM', migrationDir: 'migrations' });
  }

  // MongoDB / Mongoose
  const pkgJson = readJsonSafe(join(root, 'package.json'));
  if (pkgJson) {
    const deps = { ...((pkgJson['dependencies'] as Record<string, string>) ?? {}) };
    if (deps['mongoose']) databases.push({ type: 'MongoDB', orm: 'Mongoose' });
    if (deps['mongodb']) databases.push({ type: 'MongoDB' });
  }

  return databases;
}

// =============================================================================
// API Style Detection
// =============================================================================

export function detectAPI(root: string): APIInfo[] {
  const apis: APIInfo[] = [];

  // GraphQL
  const gqlFiles = ['schema.graphql', 'schema.gql'];
  const hasGql = gqlFiles.some(f => fileExists(join(root, f))) || isDir(join(root, 'graphql'));
  if (hasGql) {
    apis.push({ style: 'GraphQL', evidence: gqlFiles.filter(f => fileExists(join(root, f))) });
  }

  // gRPC
  const hasProto = isDir(join(root, 'proto')) || isDir(join(root, 'protos'));
  if (hasProto) {
    apis.push({ style: 'gRPC', evidence: ['proto/ directory'] });
  }

  // tRPC
  const pkgJson = readJsonSafe(join(root, 'package.json'));
  if (pkgJson) {
    const deps = { ...((pkgJson['dependencies'] as Record<string, string>) ?? {}), ...((pkgJson['devDependencies'] as Record<string, string>) ?? {}) };
    if (deps['@trpc/server']) apis.push({ style: 'tRPC', evidence: ['@trpc/server dependency'] });
  }

  // REST (check for route-like patterns in common locations)
  const routeIndicators = ['routes', 'api', 'controllers', 'endpoints'];
  const hasRoutes = routeIndicators.some(d => isDir(join(root, 'src', d)) || isDir(join(root, d)));
  if (hasRoutes && !apis.some(a => a.style === 'tRPC')) {
    apis.push({ style: 'REST', evidence: routeIndicators.filter(d => isDir(join(root, 'src', d)) || isDir(join(root, d))) });
  }

  // OpenAPI
  const openApiFiles = ['openapi.yaml', 'openapi.yml', 'openapi.json', 'swagger.yaml', 'swagger.yml', 'swagger.json'];
  const hasOpenApi = openApiFiles.some(f => fileExists(join(root, f)));
  if (hasOpenApi) {
    apis.push({ style: 'OpenAPI', evidence: openApiFiles.filter(f => fileExists(join(root, f))) });
  }

  return apis;
}

// =============================================================================
// Monorepo Detection
// =============================================================================

export function detectMonorepo(root: string): MonorepoInfo | null {
  const pkgJson = readJsonSafe(join(root, 'package.json'));

  // npm/yarn workspaces
  if (pkgJson?.['workspaces']) {
    const workspaces = Array.isArray(pkgJson['workspaces'])
      ? pkgJson['workspaces']
      : ((pkgJson['workspaces'] as Record<string, unknown>)?.['packages'] ?? []);
    return { tool: 'workspaces', packages: workspaces as string[] };
  }

  // pnpm workspaces
  if (fileExists(join(root, 'pnpm-workspace.yaml'))) {
    return { tool: 'pnpm workspaces', packages: [] };
  }

  // Turborepo
  if (fileExists(join(root, 'turbo.json'))) {
    return { tool: 'turborepo', packages: [] };
  }

  // Nx
  if (fileExists(join(root, 'nx.json'))) {
    return { tool: 'nx', packages: [] };
  }

  // Lerna
  if (fileExists(join(root, 'lerna.json'))) {
    return { tool: 'lerna', packages: [] };
  }

  return null;
}

// =============================================================================
// Directory Structure Detection
// =============================================================================

export function detectDirectories(root: string): string[] {
  const entries = listDir(root);
  const dirs: string[] = [];

  for (const entry of entries) {
    if (entry.startsWith('.')) continue; // Skip hidden
    if (['node_modules', 'dist', 'build', 'target', '__pycache__', 'vendor', '.venv', 'venv', 'coverage'].includes(entry)) continue;

    if (isDir(join(root, entry))) {
      dirs.push(entry);
    }
  }

  return dirs.sort();
}

// =============================================================================
// Existing .claude/ Detection
// =============================================================================

export function detectExistingConfig(root: string): ExistingClaudeConfig {
  const claudeDir = join(root, '.claude');
  const hasClaudeDir = isDir(claudeDir);
  const hasClaudeMd = fileExists(join(claudeDir, 'CLAUDE.md'));
  const hasSettings = fileExists(join(claudeDir, 'settings.json'));
  const skillsDir = join(claudeDir, 'skills');
  const hasSkills = isDir(skillsDir);

  let skillNames: string[] = [];
  if (hasSkills) {
    skillNames = listDir(skillsDir).filter(e => isDir(join(skillsDir, e)));
  }

  return {
    hasClaudeDir,
    hasClaudeMd,
    hasSettings,
    hasSkills,
    skillNames,
  };
}

// =============================================================================
// Key Files Detection
// =============================================================================

export function detectKeyFiles(root: string): KeyFile[] {
  const keyFiles: KeyFile[] = [];

  const candidates: Array<{ path: string; type: KeyFile['type'] }> = [
    { path: 'README.md', type: 'readme' },
    { path: 'README.rst', type: 'readme' },
    { path: 'CONTRIBUTING.md', type: 'contributing' },
    { path: 'package.json', type: 'config' },
    { path: 'pyproject.toml', type: 'config' },
    { path: 'Cargo.toml', type: 'config' },
    { path: 'go.mod', type: 'config' },
    { path: 'tsconfig.json', type: 'config' },
    { path: 'next.config.js', type: 'config' },
    { path: 'next.config.ts', type: 'config' },
    { path: 'next.config.mjs', type: 'config' },
    { path: 'vite.config.ts', type: 'config' },
    { path: 'vite.config.js', type: 'config' },
    { path: 'tailwind.config.ts', type: 'config' },
    { path: 'tailwind.config.js', type: 'config' },
    { path: 'docker-compose.yml', type: 'config' },
    { path: 'docker-compose.yaml', type: 'config' },
    { path: 'Dockerfile', type: 'config' },
    { path: '.env.example', type: 'config' },
    { path: 'src/index.ts', type: 'entry' },
    { path: 'src/main.ts', type: 'entry' },
    { path: 'src/app.ts', type: 'entry' },
    { path: 'src/index.js', type: 'entry' },
    { path: 'src/main.js', type: 'entry' },
    { path: 'src/app.js', type: 'entry' },
    { path: 'app/layout.tsx', type: 'entry' },
    { path: 'app/page.tsx', type: 'entry' },
    { path: 'pages/index.tsx', type: 'entry' },
    { path: 'pages/_app.tsx', type: 'entry' },
    { path: 'main.go', type: 'entry' },
    { path: 'src/main.rs', type: 'entry' },
    { path: 'prisma/schema.prisma', type: 'schema' },
  ];

  for (const candidate of candidates) {
    if (fileExists(join(root, candidate.path))) {
      keyFiles.push({ path: candidate.path, type: candidate.type });
    }
  }

  return keyFiles;
}
