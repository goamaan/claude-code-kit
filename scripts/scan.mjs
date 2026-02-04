#!/usr/bin/env node

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, basename, dirname, extname } from 'path';
import { execSync } from 'child_process';

// Language extensions map
const LANGUAGE_EXTENSIONS = {
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
  '.vb': 'VB.NET',
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

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  '.next',
  '__pycache__',
  'vendor',
  '.venv',
  'venv',
]);

// Detect languages by counting file extensions
function detectLanguages(root) {
  const langCounts = {};

  function walk(dir, depth) {
    if (depth > 5) return;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
            walk(join(dir, entry.name), depth + 1);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          const lang = LANGUAGE_EXTENSIONS[ext];
          if (lang) {
            if (!langCounts[lang]) {
              langCounts[lang] = { name: lang, extensions: new Set(), fileCount: 0 };
            }
            langCounts[lang].extensions.add(ext);
            langCounts[lang].fileCount++;
          }
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }

  walk(root, 0);

  return Object.values(langCounts)
    .map(lang => ({
      name: lang.name,
      extensions: Array.from(lang.extensions).sort(),
      fileCount: lang.fileCount,
    }))
    .sort((a, b) => b.fileCount - a.fileCount);
}

// Read and parse package.json
function readPackageJson(root) {
  const pkgPath = join(root, 'package.json');
  if (!existsSync(pkgPath)) return null;

  try {
    return JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    return null;
  }
}

// Detect frameworks
function detectFrameworks(root) {
  const frameworks = [];
  const pkg = readPackageJson(root);

  if (pkg) {
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    // JavaScript/TypeScript frameworks
    const frameworkPatterns = [
      { name: 'Next.js', keys: ['next'], confidence: 'high' },
      { name: 'React', keys: ['react'], confidence: 'high' },
      { name: 'Vue', keys: ['vue'], confidence: 'high' },
      { name: 'Svelte', keys: ['svelte'], confidence: 'high' },
      { name: 'Angular', keys: ['@angular/core'], confidence: 'high' },
      { name: 'Express', keys: ['express'], confidence: 'medium' },
      { name: 'Fastify', keys: ['fastify'], confidence: 'high' },
      { name: 'Hono', keys: ['hono'], confidence: 'high' },
      { name: 'NestJS', keys: ['@nestjs/core'], confidence: 'high' },
      { name: 'Nuxt', keys: ['nuxt'], confidence: 'high' },
      { name: 'Remix', keys: ['@remix-run/react'], confidence: 'high' },
      { name: 'Astro', keys: ['astro'], confidence: 'high' },
      { name: 'Vite', keys: ['vite'], confidence: 'high' },
      { name: 'Electron', keys: ['electron'], confidence: 'high' },
      { name: 'React Native', keys: ['react-native'], confidence: 'high' },
      { name: 'Expo', keys: ['expo'], confidence: 'high' },
      { name: 'Tailwind CSS', keys: ['tailwindcss'], confidence: 'high' },
    ];

    for (const pattern of frameworkPatterns) {
      for (const key of pattern.keys) {
        if (allDeps[key]) {
          frameworks.push({
            name: pattern.name,
            version: allDeps[key],
            confidence: pattern.confidence,
            source: 'package.json',
          });
          break;
        }
      }
    }
  }

  // Python frameworks
  const reqPath = join(root, 'requirements.txt');
  const pyprojectPath = join(root, 'pyproject.toml');

  if (existsSync(reqPath)) {
    try {
      const content = readFileSync(reqPath, 'utf8');
      if (content.includes('django')) {
        frameworks.push({ name: 'Django', version: null, confidence: 'high', source: 'requirements.txt' });
      }
      if (content.includes('flask')) {
        frameworks.push({ name: 'Flask', version: null, confidence: 'high', source: 'requirements.txt' });
      }
      if (content.includes('fastapi')) {
        frameworks.push({ name: 'FastAPI', version: null, confidence: 'high', source: 'requirements.txt' });
      }
    } catch {}
  }

  if (existsSync(pyprojectPath)) {
    try {
      const content = readFileSync(pyprojectPath, 'utf8');
      if (content.includes('django')) {
        frameworks.push({ name: 'Django', version: null, confidence: 'high', source: 'pyproject.toml' });
      }
      if (content.includes('flask')) {
        frameworks.push({ name: 'Flask', version: null, confidence: 'high', source: 'pyproject.toml' });
      }
      if (content.includes('fastapi')) {
        frameworks.push({ name: 'FastAPI', version: null, confidence: 'high', source: 'pyproject.toml' });
      }
    } catch {}
  }

  // Rust frameworks
  const cargoPath = join(root, 'Cargo.toml');
  if (existsSync(cargoPath)) {
    try {
      const content = readFileSync(cargoPath, 'utf8');
      if (content.includes('actix-web')) {
        frameworks.push({ name: 'Actix Web', version: null, confidence: 'high', source: 'Cargo.toml' });
      }
      if (content.includes('axum')) {
        frameworks.push({ name: 'Axum', version: null, confidence: 'high', source: 'Cargo.toml' });
      }
      if (content.includes('rocket')) {
        frameworks.push({ name: 'Rocket', version: null, confidence: 'high', source: 'Cargo.toml' });
      }
      if (content.includes('tauri')) {
        frameworks.push({ name: 'Tauri', version: null, confidence: 'high', source: 'Cargo.toml' });
      }
    } catch {}
  }

  // Go frameworks
  const goModPath = join(root, 'go.mod');
  if (existsSync(goModPath)) {
    try {
      const content = readFileSync(goModPath, 'utf8');
      if (content.includes('github.com/gin-gonic/gin')) {
        frameworks.push({ name: 'Gin', version: null, confidence: 'high', source: 'go.mod' });
      }
      if (content.includes('github.com/labstack/echo')) {
        frameworks.push({ name: 'Echo', version: null, confidence: 'high', source: 'go.mod' });
      }
      if (content.includes('github.com/gofiber/fiber')) {
        frameworks.push({ name: 'Fiber', version: null, confidence: 'high', source: 'go.mod' });
      }
    } catch {}
  }

  return frameworks;
}

// Detect build system
function detectBuild(root) {
  const pkg = readPackageJson(root);

  if (pkg && pkg.scripts) {
    return {
      tool: 'npm scripts',
      scripts: pkg.scripts,
      source: 'package.json',
    };
  }

  if (existsSync(join(root, 'Makefile'))) {
    return {
      tool: 'make',
      scripts: {},
      source: 'Makefile',
    };
  }

  if (existsSync(join(root, 'Cargo.toml'))) {
    return {
      tool: 'cargo',
      scripts: {},
      source: 'Cargo.toml',
    };
  }

  if (existsSync(join(root, 'go.mod'))) {
    return {
      tool: 'go',
      scripts: {},
      source: 'go.mod',
    };
  }

  return null;
}

// Detect testing frameworks
function detectTesting(root) {
  const testing = [];
  const pkg = readPackageJson(root);

  // Vitest
  const vitestConfigs = ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mjs'];
  for (const config of vitestConfigs) {
    if (existsSync(join(root, config))) {
      const testDirs = [];
      if (existsSync(join(root, 'tests'))) testDirs.push('tests');
      if (existsSync(join(root, 'test'))) testDirs.push('test');

      // Check for inline tests
      const hasInlineTests = hasFilesWithPattern(root, /\.(test|spec)\.(ts|js|tsx|jsx)$/);
      if (hasInlineTests) testDirs.push('src (inline)');

      testing.push({
        framework: 'vitest',
        configFile: config,
        testDirs: testDirs.length > 0 ? testDirs : ['src (inline)'],
      });
      break;
    }
  }

  // Jest
  const jestConfigs = ['jest.config.ts', 'jest.config.js', 'jest.config.mjs', 'jest.config.json'];
  for (const config of jestConfigs) {
    if (existsSync(join(root, config))) {
      const testDirs = [];
      if (existsSync(join(root, '__tests__'))) testDirs.push('__tests__');
      if (existsSync(join(root, 'tests'))) testDirs.push('tests');

      const hasInlineTests = hasFilesWithPattern(root, /\.(test|spec)\.(ts|js|tsx|jsx)$/);
      if (hasInlineTests) testDirs.push('src (inline)');

      testing.push({
        framework: 'jest',
        configFile: config,
        testDirs: testDirs.length > 0 ? testDirs : ['__tests__'],
      });
      break;
    }
  }

  // Check package.json for jest config
  if (pkg && pkg.jest && testing.length === 0) {
    testing.push({
      framework: 'jest',
      configFile: 'package.json',
      testDirs: ['__tests__'],
    });
  }

  // Mocha
  const mochaConfigs = ['.mocharc.json', '.mocharc.js', '.mocharc.yml'];
  for (const config of mochaConfigs) {
    if (existsSync(join(root, config))) {
      testing.push({
        framework: 'mocha',
        configFile: config,
        testDirs: ['test'],
      });
      break;
    }
  }

  // Playwright
  const playwrightConfigs = ['playwright.config.ts', 'playwright.config.js'];
  for (const config of playwrightConfigs) {
    if (existsSync(join(root, config))) {
      testing.push({
        framework: 'playwright',
        configFile: config,
        testDirs: ['tests', 'e2e'],
      });
      break;
    }
  }

  // Cypress
  const cypressConfigs = ['cypress.config.ts', 'cypress.config.js', 'cypress.json'];
  for (const config of cypressConfigs) {
    if (existsSync(join(root, config))) {
      testing.push({
        framework: 'cypress',
        configFile: config,
        testDirs: ['cypress/e2e'],
      });
      break;
    }
  }

  // Pytest
  const pytestConfigs = ['pytest.ini', 'pyproject.toml'];
  for (const config of pytestConfigs) {
    if (existsSync(join(root, config))) {
      testing.push({
        framework: 'pytest',
        configFile: config,
        testDirs: ['tests'],
      });
      break;
    }
  }

  return testing;
}

// Detect linting tools
function detectLinting(root) {
  const linting = [];

  // ESLint
  const eslintConfigs = [
    'eslint.config.js',
    'eslint.config.mjs',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.json',
    '.eslintrc',
  ];
  for (const config of eslintConfigs) {
    if (existsSync(join(root, config))) {
      linting.push({ tool: 'eslint', configFile: config });
      break;
    }
  }

  // Prettier
  const prettierConfigs = [
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.js',
    '.prettierrc.mjs',
    'prettier.config.js',
    'prettier.config.mjs',
  ];
  for (const config of prettierConfigs) {
    if (existsSync(join(root, config))) {
      linting.push({ tool: 'prettier', configFile: config });
      break;
    }
  }

  // Biome
  const biomeConfigs = ['biome.json', 'biome.jsonc'];
  for (const config of biomeConfigs) {
    if (existsSync(join(root, config))) {
      linting.push({ tool: 'biome', configFile: config });
      break;
    }
  }

  // Rust
  if (existsSync(join(root, 'rustfmt.toml')) || existsSync(join(root, '.rustfmt.toml'))) {
    linting.push({ tool: 'rustfmt', configFile: 'rustfmt.toml' });
  }

  if (existsSync(join(root, 'clippy.toml')) || existsSync(join(root, '.clippy.toml'))) {
    linting.push({ tool: 'clippy', configFile: 'clippy.toml' });
  }

  // Python
  const blackConfigs = ['pyproject.toml'];
  for (const config of blackConfigs) {
    if (existsSync(join(root, config))) {
      try {
        const content = readFileSync(join(root, config), 'utf8');
        if (content.includes('[tool.black]')) {
          linting.push({ tool: 'black', configFile: config });
        }
        if (content.includes('[tool.ruff]')) {
          linting.push({ tool: 'ruff', configFile: config });
        }
      } catch {}
      break;
    }
  }

  if (existsSync(join(root, 'ruff.toml'))) {
    linting.push({ tool: 'ruff', configFile: 'ruff.toml' });
  }

  // Go
  if (existsSync(join(root, '.golangci.yml')) || existsSync(join(root, '.golangci.yaml'))) {
    linting.push({ tool: 'golangci-lint', configFile: '.golangci.yml' });
  }

  return linting;
}

// Detect CI/CD
function detectCI(root) {
  const ci = [];

  // GitHub Actions
  const ghWorkflowsDir = join(root, '.github', 'workflows');
  if (existsSync(ghWorkflowsDir)) {
    try {
      const workflows = readdirSync(ghWorkflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
      for (const workflow of workflows) {
        ci.push({
          platform: 'GitHub Actions',
          configFile: join('.github', 'workflows', workflow),
        });
      }
    } catch {}
  }

  // GitLab CI
  if (existsSync(join(root, '.gitlab-ci.yml'))) {
    ci.push({ platform: 'GitLab CI', configFile: '.gitlab-ci.yml' });
  }

  // Jenkins
  if (existsSync(join(root, 'Jenkinsfile'))) {
    ci.push({ platform: 'Jenkins', configFile: 'Jenkinsfile' });
  }

  // CircleCI
  if (existsSync(join(root, '.circleci', 'config.yml'))) {
    ci.push({ platform: 'CircleCI', configFile: '.circleci/config.yml' });
  }

  // Travis CI
  if (existsSync(join(root, '.travis.yml'))) {
    ci.push({ platform: 'Travis CI', configFile: '.travis.yml' });
  }

  return ci;
}

// Detect database and ORM
function detectDatabase(root) {
  const database = [];
  const pkg = readPackageJson(root);

  if (pkg) {
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    // Prisma
    if (allDeps['prisma'] || allDeps['@prisma/client']) {
      const migrationDir = existsSync(join(root, 'prisma', 'migrations')) ? 'prisma/migrations' : null;
      database.push({
        type: 'SQL',
        orm: 'Prisma',
        migrationDir,
      });
    }

    // Drizzle
    if (allDeps['drizzle-orm']) {
      database.push({
        type: 'SQL',
        orm: 'Drizzle',
        migrationDir: null,
      });
    }

    // TypeORM
    if (allDeps['typeorm']) {
      database.push({
        type: 'SQL',
        orm: 'TypeORM',
        migrationDir: null,
      });
    }

    // Knex
    if (allDeps['knex']) {
      database.push({
        type: 'SQL',
        orm: 'Knex',
        migrationDir: null,
      });
    }

    // Mongoose
    if (allDeps['mongoose']) {
      database.push({
        type: 'NoSQL',
        orm: 'Mongoose',
        migrationDir: null,
      });
    }

    // MongoDB
    if (allDeps['mongodb']) {
      database.push({
        type: 'NoSQL',
        orm: 'MongoDB Native',
        migrationDir: null,
      });
    }
  }

  // Python ORMs
  const reqPath = join(root, 'requirements.txt');
  const pyprojectPath = join(root, 'pyproject.toml');

  if (existsSync(reqPath)) {
    try {
      const content = readFileSync(reqPath, 'utf8');
      if (content.includes('sqlalchemy')) {
        database.push({ type: 'SQL', orm: 'SQLAlchemy', migrationDir: null });
      }
      if (content.includes('alembic')) {
        database.push({ type: 'SQL', orm: 'Alembic', migrationDir: 'alembic' });
      }
    } catch {}
  }

  if (existsSync(pyprojectPath)) {
    try {
      const content = readFileSync(pyprojectPath, 'utf8');
      if (content.includes('sqlalchemy')) {
        database.push({ type: 'SQL', orm: 'SQLAlchemy', migrationDir: null });
      }
      if (content.includes('django')) {
        database.push({ type: 'SQL', orm: 'Django ORM', migrationDir: null });
      }
    } catch {}
  }

  return database;
}

// Detect API style
function detectAPI(root) {
  const api = [];
  const pkg = readPackageJson(root);

  if (pkg) {
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    // GraphQL
    if (allDeps['graphql'] || allDeps['@apollo/server'] || allDeps['apollo-server']) {
      api.push({ style: 'GraphQL', evidence: ['graphql'] });
    }

    // gRPC
    if (allDeps['@grpc/grpc-js'] || allDeps['grpc']) {
      api.push({ style: 'gRPC', evidence: ['grpc'] });
    }

    // tRPC
    if (allDeps['@trpc/server'] || allDeps['@trpc/client']) {
      api.push({ style: 'tRPC', evidence: ['trpc'] });
    }
  }

  // Check for common REST patterns
  if (existsSync(join(root, 'src', 'routes')) ||
      existsSync(join(root, 'src', 'api')) ||
      existsSync(join(root, 'routes')) ||
      existsSync(join(root, 'api'))) {
    api.push({ style: 'REST', evidence: ['routes', 'api'] });
  }

  // OpenAPI
  const openApiFiles = ['openapi.yml', 'openapi.yaml', 'swagger.yml', 'swagger.yaml'];
  for (const file of openApiFiles) {
    if (existsSync(join(root, file))) {
      api.push({ style: 'OpenAPI', evidence: [file] });
      break;
    }
  }

  return api;
}

// Detect monorepo
function detectMonorepo(root) {
  const pkg = readPackageJson(root);

  if (pkg) {
    // npm/yarn workspaces
    if (pkg.workspaces) {
      return {
        tool: 'workspaces',
        packages: Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages || [],
      };
    }
  }

  // pnpm
  if (existsSync(join(root, 'pnpm-workspace.yaml'))) {
    return {
      tool: 'pnpm',
      packages: [],
    };
  }

  // Turborepo
  if (existsSync(join(root, 'turbo.json'))) {
    return {
      tool: 'turborepo',
      packages: [],
    };
  }

  // Nx
  if (existsSync(join(root, 'nx.json'))) {
    return {
      tool: 'nx',
      packages: [],
    };
  }

  // Lerna
  if (existsSync(join(root, 'lerna.json'))) {
    return {
      tool: 'lerna',
      packages: [],
    };
  }

  return null;
}

// Detect top-level directories
function detectDirectories(root) {
  try {
    const entries = readdirSync(root, { withFileTypes: true });
    return entries
      .filter(entry =>
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        !SKIP_DIRS.has(entry.name)
      )
      .map(entry => entry.name)
      .sort();
  } catch {
    return [];
  }
}

// Detect existing .claude/ config
function detectExistingConfig(root) {
  const claudeDir = join(root, '.claude');
  const hasClaudeDir = existsSync(claudeDir);
  const hasClaudeMd = existsSync(join(claudeDir, 'CLAUDE.md'));
  const hasSettings = existsSync(join(claudeDir, 'settings.json'));

  const skillsDir = join(claudeDir, 'skills');
  const hasSkills = existsSync(skillsDir);
  const skillNames = [];

  if (hasSkills) {
    try {
      const files = readdirSync(skillsDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          skillNames.push(file.replace(/\.md$/, ''));
        }
      }
    } catch {}
  }

  return {
    hasClaudeDir,
    hasClaudeMd,
    hasSettings,
    hasSkills,
    skillNames: skillNames.sort(),
  };
}

// Detect key files
function detectKeyFiles(root) {
  const keyFiles = [];

  const candidates = [
    { path: 'README.md', type: 'documentation' },
    { path: 'README.rst', type: 'documentation' },
    { path: 'CONTRIBUTING.md', type: 'documentation' },
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
    { path: 'docker-compose.yml', type: 'infrastructure' },
    { path: 'docker-compose.yaml', type: 'infrastructure' },
    { path: 'Dockerfile', type: 'infrastructure' },
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
    if (existsSync(join(root, candidate.path))) {
      keyFiles.push({
        path: candidate.path,
        type: candidate.type,
      });
    }
  }

  return keyFiles;
}

// Detect Python-specific info
function detectPython(root) {
  const pyprojectPath = join(root, 'pyproject.toml');
  const reqPath = join(root, 'requirements.txt');

  if (!existsSync(pyprojectPath) && !existsSync(reqPath)) {
    return undefined;
  }

  const python = {};

  // Venv type
  if (existsSync(join(root, 'poetry.lock'))) {
    python.venvType = 'poetry';
  } else if (existsSync(join(root, 'Pipfile'))) {
    python.venvType = 'pipenv';
  } else if (existsSync(join(root, 'uv.lock'))) {
    python.venvType = 'uv';
  } else if (existsSync(join(root, 'venv')) || existsSync(join(root, '.venv'))) {
    python.venvType = 'venv';
  }

  // Version
  const pythonVersionPath = join(root, '.python-version');
  if (existsSync(pythonVersionPath)) {
    try {
      python.version = readFileSync(pythonVersionPath, 'utf8').trim();
    } catch {}
  } else if (existsSync(pyprojectPath)) {
    try {
      const content = readFileSync(pyprojectPath, 'utf8');
      const match = content.match(/requires-python\s*=\s*"([^"]+)"/);
      if (match) {
        python.version = match[1];
      }
    } catch {}
  }

  // Type checker
  if (existsSync(join(root, 'mypy.ini')) || existsSync(join(root, '.mypy.ini'))) {
    python.typeChecker = 'mypy';
  } else if (existsSync(join(root, 'pyrightconfig.json'))) {
    python.typeChecker = 'pyright';
  } else if (existsSync(pyprojectPath)) {
    try {
      const content = readFileSync(pyprojectPath, 'utf8');
      if (content.includes('[tool.mypy]')) {
        python.typeChecker = 'mypy';
      } else if (content.includes('[tool.pyright]')) {
        python.typeChecker = 'pyright';
      } else if (content.includes('[tool.basedpyright]')) {
        python.typeChecker = 'basedpyright';
      }
    } catch {}
  }

  // Package layout
  const srcDir = join(root, 'src');
  if (existsSync(srcDir)) {
    try {
      const entries = readdirSync(srcDir);
      for (const entry of entries) {
        const entryPath = join(srcDir, entry);
        if (statSync(entryPath).isDirectory() && existsSync(join(entryPath, '__init__.py'))) {
          python.packageLayout = 'src';
          break;
        }
      }
    } catch {}
  }

  return Object.keys(python).length > 0 ? python : undefined;
}

// Detect Rust-specific info
function detectRust(root) {
  const cargoPath = join(root, 'Cargo.toml');
  if (!existsSync(cargoPath)) {
    return undefined;
  }

  const rust = {};

  try {
    const content = readFileSync(cargoPath, 'utf8');

    // Edition
    const editionMatch = content.match(/edition\s*=\s*"([^"]+)"/);
    if (editionMatch) {
      rust.edition = editionMatch[1];
    }

    // Workspace
    if (content.includes('[workspace]')) {
      rust.workspace = true;
    }

    // Features
    if (content.includes('[features]')) {
      rust.features = true;
    }

    // Build script
    if (existsSync(join(root, 'build.rs'))) {
      rust.buildScript = true;
    }

    // Clippy
    if (existsSync(join(root, 'clippy.toml')) || existsSync(join(root, '.clippy.toml'))) {
      rust.clippy = true;
    }
  } catch {}

  return Object.keys(rust).length > 0 ? rust : undefined;
}

// Detect Go-specific info
function detectGo(root) {
  const goModPath = join(root, 'go.mod');
  if (!existsSync(goModPath)) {
    return undefined;
  }

  const go = {};

  try {
    const content = readFileSync(goModPath, 'utf8');

    // Version
    const versionMatch = content.match(/^go\s+(\d+\.\d+)/m);
    if (versionMatch) {
      go.version = versionMatch[1];
    }

    // Module path
    const moduleMatch = content.match(/^module\s+(.+)$/m);
    if (moduleMatch) {
      go.modulePath = moduleMatch[1].trim();
    }
  } catch {}

  // Internal directory
  if (existsSync(join(root, 'internal'))) {
    go.hasInternal = true;
  }

  // Makefile
  if (existsSync(join(root, 'Makefile'))) {
    go.hasMakefile = true;
  }

  return Object.keys(go).length > 0 ? go : undefined;
}

// Detect Java-specific info
function detectJava(root) {
  const hasPom = existsSync(join(root, 'pom.xml'));
  const hasGradle = existsSync(join(root, 'build.gradle')) || existsSync(join(root, 'build.gradle.kts'));

  if (!hasPom && !hasGradle) {
    return undefined;
  }

  const java = {};

  // Build tool
  if (hasPom) {
    java.buildTool = 'maven';
  } else if (hasGradle) {
    java.buildTool = 'gradle';
  }

  // Spring Boot
  if (hasPom) {
    try {
      const content = readFileSync(join(root, 'pom.xml'), 'utf8');
      if (content.includes('spring-boot')) {
        java.springBoot = true;
      }

      // Java version from Maven
      const versionMatch = content.match(/<java\.version>([^<]+)<\/java\.version>/);
      if (versionMatch) {
        java.version = versionMatch[1];
      }
    } catch {}
  }

  if (hasGradle) {
    try {
      const gradlePath = existsSync(join(root, 'build.gradle.kts'))
        ? join(root, 'build.gradle.kts')
        : join(root, 'build.gradle');
      const content = readFileSync(gradlePath, 'utf8');

      if (content.includes('spring-boot') || content.includes('org.springframework.boot')) {
        java.springBoot = true;
      }

      // Java version from Gradle
      const versionMatch = content.match(/sourceCompatibility\s*=\s*['"]?(\d+)/);
      if (versionMatch) {
        java.version = versionMatch[1];
      }
    } catch {}
  }

  // JUnit
  const hasJUnit = hasFilesWithPattern(root, /Test\.java$/);
  if (hasJUnit) {
    java.junit = true;
  }

  return Object.keys(java).length > 0 ? java : undefined;
}

// Detect .NET-specific info
function detectDotNet(root) {
  // Look for solution files or project files
  const hasSln = hasFilesWithPattern(root, /\.sln$/);
  const hasCsproj = hasFilesWithPattern(root, /\.csproj$/);
  const hasVbproj = hasFilesWithPattern(root, /\.vbproj$/);

  if (!hasSln && !hasCsproj && !hasVbproj) {
    return undefined;
  }

  const dotnet = {
    hasSolution: hasSln,
    projectTypes: [],
  };

  if (hasCsproj) dotnet.projectTypes.push('C#');
  if (hasVbproj) dotnet.projectTypes.push('VB.NET');

  // Check for common .NET patterns
  if (existsSync(join(root, 'global.json'))) {
    try {
      const content = JSON.parse(readFileSync(join(root, 'global.json'), 'utf8'));
      if (content.sdk?.version) {
        dotnet.sdkVersion = content.sdk.version;
      }
    } catch {}
  }

  // Check for NuGet packages
  if (existsSync(join(root, 'packages.config')) || existsSync(join(root, 'nuget.config'))) {
    dotnet.hasNuGet = true;
  }

  // Check for ASP.NET
  if (hasFilesWithPattern(root, /Startup\.cs$/) ||
      hasFilesWithPattern(root, /Program\.cs$/) ||
      existsSync(join(root, 'appsettings.json'))) {
    dotnet.aspNet = true;
  }

  // Check for Entity Framework
  if (existsSync(join(root, 'Migrations')) || hasFilesWithPattern(root, /DbContext\.cs$/)) {
    dotnet.entityFramework = true;
  }

  // Check for test projects
  if (hasFilesWithPattern(root, /Tests?\.csproj$/) || hasFilesWithPattern(root, /\.Tests?\//)) {
    dotnet.hasTests = true;
  }

  return Object.keys(dotnet).length > 0 ? dotnet : undefined;
}

// Detect code conventions
function detectConventions(root) {
  const conventions = {
    imports: {},
    tests: {},
    exports: {},
    naming: {},
  };

  // Import style - check for barrel imports
  const hasBarrelFiles = hasFilesWithPattern(root, /index\.(ts|js)$/);
  if (hasBarrelFiles) {
    const sampleFiles = findSampleSourceFiles(root, 30);
    let barrelImports = 0;
    let directImports = 0;

    for (const file of sampleFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const importMatches = content.match(/from\s+['"]([^'"]+)['"]/g) || [];

        for (const imp of importMatches) {
          if (imp.includes('/index') || imp.match(/from\s+['"]\.[^'"]+['"]/)) {
            if (imp.includes('/index')) barrelImports++;
            else directImports++;
          }
        }
      } catch {}
    }

    if (barrelImports > directImports) {
      conventions.imports.style = 'barrel';
    } else {
      conventions.imports.style = 'direct';
    }
  } else {
    conventions.imports.style = 'direct';
  }

  // Test location
  const hasTestDir = existsSync(join(root, 'tests')) || existsSync(join(root, 'test')) || existsSync(join(root, '__tests__'));
  const hasColocatedTests = hasFilesWithPattern(root, /\.(test|spec)\.(ts|js|tsx|jsx)$/);

  if (hasColocatedTests && hasTestDir) {
    conventions.tests.location = 'both';
  } else if (hasColocatedTests) {
    conventions.tests.location = 'colocated';
    conventions.tests.pattern = '*.test.ts';
  } else if (hasTestDir) {
    conventions.tests.location = 'separate';
  }

  // Export style
  const sampleFiles = findSampleSourceFiles(root, 30);
  let namedExports = 0;
  let defaultExports = 0;

  for (const file of sampleFiles) {
    try {
      const content = readFileSync(file, 'utf8');
      const namedMatches = content.match(/export\s+(function|const|class|interface|type)\s+/g) || [];
      const defaultMatches = content.match(/export\s+default\s+/g) || [];

      namedExports += namedMatches.length;
      defaultExports += defaultMatches.length;
    } catch {}
  }

  if (namedExports > defaultExports) {
    conventions.exports.style = 'named';
  } else if (defaultExports > namedExports) {
    conventions.exports.style = 'default';
  } else {
    conventions.exports.style = 'mixed';
  }

  // File naming
  const allFiles = findAllSourceFiles(root);
  const namingPatterns = {
    kebab: 0,
    camel: 0,
    pascal: 0,
    snake: 0,
  };

  const kebabRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/;
  const camelRegex = /^[a-z][a-zA-Z0-9]*$/;
  const pascalRegex = /^[A-Z][a-zA-Z0-9]*$/;
  const snakeRegex = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/;

  for (const file of allFiles) {
    const base = basename(file, extname(file));

    if (kebabRegex.test(base)) namingPatterns.kebab++;
    else if (pascalRegex.test(base)) namingPatterns.pascal++;
    else if (camelRegex.test(base)) namingPatterns.camel++;
    else if (snakeRegex.test(base)) namingPatterns.snake++;
  }

  const max = Math.max(...Object.values(namingPatterns));
  const dominant = Object.keys(namingPatterns).find(k => namingPatterns[k] === max);

  if (dominant) {
    conventions.naming.files = `${dominant}-case`;
  }

  return conventions;
}

// Helper: Check if files matching pattern exist
function hasFilesWithPattern(root, pattern, maxDepth = 5) {
  function walk(dir, depth) {
    if (depth > maxDepth) return false;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
            if (walk(join(dir, entry.name), depth + 1)) {
              return true;
            }
          }
        } else if (entry.isFile() && pattern.test(entry.name)) {
          return true;
        }
      }
    } catch {}

    return false;
  }

  return walk(root, 0);
}

// Helper: Find sample source files
function findSampleSourceFiles(root, limit = 30) {
  const files = [];
  const sourceExts = new Set(['.ts', '.tsx', '.js', '.jsx']);

  function walk(dir, depth) {
    if (depth > 5 || files.length >= limit) return;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (files.length >= limit) break;

        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
            walk(join(dir, entry.name), depth + 1);
          }
        } else if (entry.isFile() && sourceExts.has(extname(entry.name))) {
          files.push(join(dir, entry.name));
        }
      }
    } catch {}
  }

  walk(root, 0);
  return files;
}

// Helper: Find all source files
function findAllSourceFiles(root, maxDepth = 3) {
  const files = [];
  const sourceExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java']);

  function walk(dir, depth) {
    if (depth > maxDepth) return;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
            walk(join(dir, entry.name), depth + 1);
          }
        } else if (entry.isFile() && sourceExts.has(extname(entry.name))) {
          files.push(join(dir, entry.name));
        }
      }
    } catch {}
  }

  walk(root, 0);
  return files;
}

// Main entry point
const root = resolve(process.argv[2] || process.cwd());

const languages = detectLanguages(root);
const frameworks = detectFrameworks(root);
const build = detectBuild(root);
const testing = detectTesting(root);
const linting = detectLinting(root);
const ci = detectCI(root);
const database = detectDatabase(root);
const api = detectAPI(root);
const monorepo = detectMonorepo(root);
const directories = detectDirectories(root);
const existingConfig = detectExistingConfig(root);
const keyFiles = detectKeyFiles(root);
const python = detectPython(root);
const rust = detectRust(root);
const go = detectGo(root);
const java = detectJava(root);
const dotnet = detectDotNet(root);
const conventions = detectConventions(root);

const result = {
  root,
  languages,
  frameworks,
  build,
  testing,
  linting,
  ci,
  database,
  api,
  monorepo,
  directories,
  existingConfig,
  keyFiles,
  python,
  rust,
  go,
  java,
  dotnet,
  conventions,
};

console.log(JSON.stringify(result, null, 2));
