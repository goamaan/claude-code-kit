# Contributing to claude-code-kit

Thank you for your interest in contributing to claude-code-kit! This document provides guidelines and instructions for participating in the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Architecture Overview](#architecture-overview)
- [Adding New Commands](#adding-new-commands)
- [Creating Setups](#creating-setups)
- [Creating Addons](#creating-addons)

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- Bun runtime (for development)
- Git

### Setup Your Environment

1. Clone the repository:

```bash
git clone https://github.com/your-org/claude-code-kit.git
cd claude-code-kit
```

2. Install dependencies using Bun:

```bash
bun install
```

3. Verify your setup by running the test suite:

```bash
bun run verify
```

## Development Workflow

### Available Commands

The project uses Bun as the runtime with the following development commands:

- `bun run dev` - Start watch mode for development (uses tsdown)
- `bun run build` - Compile TypeScript to JavaScript
- `bun run typecheck` - Run TypeScript type checking
- `bun run lint` - Run ESLint on source files
- `bun run test` - Run the full test suite once
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Generate coverage report (must meet 80% threshold)
- `bun run test:unit` - Run unit tests only
- `bun run test:integration` - Run integration tests only
- `bun run test:e2e` - Run end-to-end tests only
- `bun run verify` - Run typecheck, lint, and test (required before PRs)

### Development Process

1. Create a new feature branch:

```bash
git checkout -b feature/your-feature-name
```

2. Start watch mode in one terminal:

```bash
bun run dev
```

3. In another terminal, run tests in watch mode:

```bash
bun run test:watch
```

4. Make your changes to `src/` files
5. Verify all checks pass:

```bash
bun run verify
```

6. Commit and push your changes

### Project Structure

```
claude-code-kit/
├── src/
│   ├── cli.ts                 # CLI entry point (citty commands)
│   ├── commands/              # Command implementations
│   │   ├── profile.ts         # Profile management command
│   │   ├── setup.ts           # Setup management command
│   │   ├── addon.ts           # Addon management command
│   │   ├── config.ts          # Configuration management
│   │   ├── mcp.ts             # MCP server management
│   │   ├── cost.ts            # Cost tracking
│   │   ├── hook.ts            # Hook management
│   │   ├── sync.ts            # Configuration sync
│   │   ├── doctor.ts          # Diagnostics
│   │   ├── install.ts         # Installation wizard
│   │   └── upgrade.ts         # Upgrade checks
│   ├── core/                  # Core infrastructure
│   │   ├── config/            # Configuration loading and merging
│   │   │   ├── parser.ts      # TOML parsing with Zod validation
│   │   │   ├── merger.ts      # Configuration merging logic
│   │   │   └── loader.ts      # Config file loading
│   │   ├── sync/              # Configuration sync engine
│   │   │   ├── engine.ts      # Main sync logic
│   │   │   ├── claudemd-generator.ts
│   │   │   └── settings-generator.ts
│   │   └── doctor/            # Diagnostic tools
│   │       ├── diagnostics.ts
│   │       └── fixes.ts
│   ├── domain/                # Domain-specific business logic
│   │   ├── profile/           # Profile management
│   │   │   ├── manager.ts     # Profile operations interface
│   │   │   └── storage.ts     # Profile persistence
│   │   ├── addon/             # Addon management
│   │   │   ├── manager.ts     # Addon operations
│   │   │   ├── installer.ts   # Addon installation
│   │   │   ├── registry.ts    # Addon registry
│   │   │   └── manifest-parser.ts
│   │   ├── setup/             # Setup management
│   │   │   ├── manager.ts     # Setup operations
│   │   │   ├── loader.ts      # Setup loading
│   │   │   ├── merger.ts      # Setup merging
│   │   │   └── manifest-parser.ts
│   │   ├── mcp/               # MCP server management
│   │   │   ├── manager.ts     # MCP operations
│   │   │   └── budget.ts      # Token budget tracking
│   │   ├── cost/              # Cost tracking
│   │   │   ├── tracker.ts     # Cost tracking logic
│   │   │   └── storage.ts     # Cost data persistence
│   │   └── hook/              # Hook management
│   │       └── composer.ts    # Hook composition
│   ├── types/                 # Zod schemas and TypeScript types
│   │   ├── index.ts           # Barrel export
│   │   ├── config.ts          # Configuration schemas
│   │   ├── setup.ts           # Setup schemas
│   │   ├── addon.ts           # Addon schemas
│   │   ├── mcp.ts             # MCP schemas
│   │   ├── cost.ts            # Cost schemas
│   │   ├── hook.ts            # Hook schemas
│   │   ├── profile.ts         # Profile types
│   │   └── diagnostic.ts      # Diagnostic types
│   ├── ui/                    # User interface
│   │   ├── prompts.ts         # Interactive prompts (clack)
│   │   └── output.ts          # Output formatting
│   ├── utils/                 # Utility functions
│   │   ├── fs.ts              # File system utilities
│   │   ├── logger.ts          # Logging utilities
│   │   ├── paths.ts           # Path resolution
│   │   └── constants.ts       # Constants
│   └── index.ts               # Public API exports
├── tests/
│   ├── integration/           # Integration tests
│   └── e2e/                   # End-to-end tests
├── setups/                    # Built-in setup templates
│   ├── minimal/               # Minimal setup
│   ├── frontend/              # Frontend-focused setup
│   ├── backend/               # Backend-focused setup
│   ├── fullstack/             # Full-stack setup
│   ├── data/                  # Data science setup
│   ├── devops/                # DevOps setup
│   └── enterprise/            # Enterprise setup
├── addons/                    # Built-in addons
│   ├── claude-ignore/         # .claudeignore support
│   ├── safety-net/            # Safety guards
│   └── rm-rf-guard/           # Dangerous command protection
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
└── README.md
```

## Code Style

### TypeScript Guidelines

1. **Strict Mode**: All code must pass TypeScript strict mode checks
2. **Type Safety**: Always provide explicit type annotations for public APIs
3. **No `any`**: Use `any` only in exceptional cases and explain why
4. **Unused Variables**: Prefix unused parameters with underscore: `_param`

### Formatting

The project uses Prettier for code formatting. Rules:

- **Tab Width**: 2 spaces
- **Line Length**: No enforced limit
- **Quotes**: Double quotes
- **Semicolons**: Required
- **Trailing Comma**: ES5 compatible

Format code automatically:

```bash
bun x prettier --write src/
```

### ESLint Rules

Key ESLint rules enforced:

- No unused variables (unless prefixed with `_`)
- No explicit `any` without comment
- No console usage except in intended places (explicitly allowed)
- Consistent naming conventions

Check linting:

```bash
bun run lint
```

Auto-fix linting issues:

```bash
bun x eslint --fix src/
```

### Comments and Documentation

1. **JSDoc for Public APIs**: Use JSDoc comments for exported functions and types

```typescript
/**
 * Creates a new profile with the specified configuration
 *
 * @param name - Profile name (must be lowercase, no spaces)
 * @param options - Optional configuration overrides
 * @returns Promise that resolves when profile is created
 * @throws ProfileExistsError if profile already exists
 */
export async function createProfile(
  name: string,
  options?: ProfileOptions
): Promise<void>
```

2. **Section Headers**: Use section headers to organize code within files

```typescript
// =============================================================================
// Constants
// =============================================================================

// =============================================================================
// Types
// =============================================================================

// =============================================================================
// Implementation
// =============================================================================
```

3. **Inline Comments**: Keep inline comments brief and explain the "why", not the "what"

```typescript
// Zod validation ensures type safety at runtime
const config = configSchema.parse(rawConfig);
```

## Testing Guidelines

### Coverage Requirements

All contributions must maintain at least **80% code coverage** across:

- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

Check coverage:

```bash
bun run test:coverage
```

### Test Structure

Tests are organized by type:

- **Unit Tests** (`src/**/*.test.ts`): Test individual functions and modules
- **Integration Tests** (`tests/integration/**/*.test.ts`): Test component interactions
- **E2E Tests** (`tests/e2e/**/*.test.ts`): Test complete workflows

### Writing Tests

Use Vitest with globals enabled:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ProfileManager', () => {
  describe('create', () => {
    it('should create a new profile with valid name', async () => {
      const manager = createProfileManager();
      await manager.create('test-profile');

      const profiles = await manager.list();
      expect(profiles).toContainEqual(
        expect.objectContaining({ name: 'test-profile' })
      );
    });

    it('should throw ProfileExistsError when profile already exists', async () => {
      const manager = createProfileManager();
      await manager.create('test-profile');

      await expect(
        manager.create('test-profile')
      ).rejects.toThrow(ProfileExistsError);
    });
  });
});
```

### Test Best Practices

1. **Descriptive Names**: Test names should clearly describe what is being tested

```typescript
// Good
it('should throw ValidationError when config schema is invalid', () => {})

// Avoid
it('should validate', () => {})
```

2. **Arrange-Act-Assert**: Follow AAA pattern clearly

```typescript
it('should merge two configurations', () => {
  // Arrange
  const config1 = { name: 'test', version: '1.0.0' };
  const config2 = { version: '2.0.0' };

  // Act
  const result = merge([config1, config2]);

  // Assert
  expect(result).toEqual({
    name: 'test',
    version: '2.0.0',
  });
});
```

3. **Mock External Dependencies**: Use `vi.mock()` for file system, network calls

```typescript
import { vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));
```

4. **Test Edge Cases**: Always test error conditions, empty inputs, boundary values

```typescript
it('should handle empty configuration array', () => {
  const result = merge([]);
  expect(result).toEqual({});
});

it('should preserve deeply nested structures', () => {
  const result = merge([
    { a: { b: { c: 1 } } },
    { a: { b: { d: 2 } } },
  ]);

  expect(result).toEqual({
    a: { b: { c: 1, d: 2 } },
  });
});
```

5. **Integration Tests**: Test actual file I/O, configuration loading, etc.

```typescript
describe('ProfileManager integration', () => {
  it('should persist and load profile from disk', async () => {
    const manager = createProfileManager();
    await manager.create('persist-test');

    const newManager = createProfileManager();
    const profiles = await newManager.list();

    expect(profiles).toContainEqual(
      expect.objectContaining({ name: 'persist-test' })
    );
  });
});
```

## Pull Request Process

### Before Submitting

1. **Verify All Checks Pass**

```bash
bun run verify
```

This runs:
- Type checking (`tsc --noEmit`)
- Linting (`eslint src/`)
- Tests with coverage (`vitest run --coverage`)

2. **Update Tests**: Add or update tests for any new functionality
3. **Update Documentation**: Update README if new features are user-facing
4. **Format Code**: Ensure code is properly formatted
5. **Check Coverage**: Verify coverage hasn't decreased

### Creating a PR

1. **Branch Naming**: Use descriptive branch names

```
feature/command-name          # New feature/command
fix/issue-description         # Bug fix
docs/what-changed             # Documentation updates
refactor/what-changed         # Code refactoring
test/what-tested              # Test additions
```

2. **Commit Messages**: Write clear, atomic commits

```
feat: add new profile cloning command

- Implement profile clone functionality
- Add tests for clone operation
- Update documentation
```

3. **PR Description**: Include:

- What changed and why
- How to test the changes
- Any breaking changes
- Screenshots/examples if applicable

### Review Expectations

- Code review will check style, architecture, and testing
- All checks must pass (type check, lint, tests, coverage)
- At least one approval before merging
- Address feedback constructively

## Architecture Overview

### Core Patterns

#### 1. Factory Pattern for Managers

Managers are created using factory functions that encapsulate initialization:

```typescript
// domain/profile/manager.ts
export interface ProfileManager {
  list(): Promise<ProfileSummary[]>;
  create(name: string, options?: Options): Promise<void>;
  // ...
}

export function createProfileManager(): ProfileManager {
  // Implementation with dependency injection
}
```

#### 2. Layered Configuration Merging

Configuration is merged through layers (project, profile, setup, addon):

```typescript
// core/config/merger.ts
export function merge(configs: Record<string, unknown>[]): Record<string, unknown> {
  // Deep merge with later configs overriding earlier ones
}

export function resolveInheritance(
  name: string,
  storage: ConfigStorage,
): Promise<Record<string, unknown>> {
  // Resolve extends relationships
}
```

#### 3. Zod for Schema Validation

All data structures use Zod for runtime validation:

```typescript
// types/config.ts
export const ProfileConfigSchema = z.object({
  name: z.string().regex(NAME_PATTERN),
  version: z.string().regex(SEMVER_PATTERN),
  description: z.string().optional(),
  extends: z.string().optional(),
});

export type ProfileConfig = z.infer<typeof ProfileConfigSchema>;
```

#### 4. TOML for Configuration Files

Configuration files use TOML format with support for:

- Sections: `[section]`
- Tables: `[section.subsection]`
- Arrays: `key = ["value1", "value2"]`

```toml
[setup]
name = "my-setup"
version = "1.0.0"
extends = "fullstack"

[skills]
enabled = ["autopilot"]
disabled = []

[hooks]
templates = [
  { name = "custom-hook", handler = "./hook.ts" }
]
```

### Managed Sections in Generated Files

When claude-code-kit syncs configuration, it manages specific sections in generated files:

```markdown
<!-- BEGIN CLAUDE-CODE-KIT: SETUP -->
... auto-generated content ...
<!-- END CLAUDE-CODE-KIT: SETUP -->
```

This allows:
- Safe updates without overwriting manual changes
- Multiple tools managing different sections
- Rollback capabilities

## Adding New Commands

### Command Structure

Commands use the `citty` framework. Create a new command in `src/commands/`:

```typescript
// src/commands/mycommand.ts
import { defineCommand } from 'citty';
import * as output from '../ui/output.js';

const listSubcommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List items',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    // Implementation
  },
});

const createSubcommand = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new item',
  },
  args: {
    name: {
      type: 'string',
      description: 'Item name',
      required: true,
    },
  },
  async run({ args }) {
    // Implementation
  },
});

export default defineCommand({
  meta: {
    name: 'mycommand',
    description: 'Manage my items',
  },
  subCommands: {
    list: () => Promise.resolve(listSubcommand),
    create: () => Promise.resolve(createSubcommand),
  },
});
```

### Registering a Command

Add to `src/cli.ts`:

```typescript
const main = defineCommand({
  meta: { /* ... */ },
  subCommands: {
    mycommand: () => import('./commands/mycommand.js').then((m) => m.default),
    // ...
  },
});
```

### Command Best Practices

1. **Use the Domain Layer**: Commands should delegate to domain managers

```typescript
async run({ args }) {
  const manager = createProfileManager();
  try {
    await manager.create(args.name);
    output.success(`Created profile: ${args.name}`);
  } catch (error) {
    if (error instanceof ProfileExistsError) {
      output.error(error.message);
      return;
    }
    throw error;
  }
}
```

2. **Structured Output**: Use the `ui/output.js` module for consistency

```typescript
import * as output from '../ui/output.js';

output.header('Profiles');
output.table([/* data */]);
output.success('Operation completed');
output.error('Something went wrong');
output.json({ data: 'value' });
```

3. **Interactive Input**: Use `ui/prompts.js` for user input

```typescript
import * as prompts from '../ui/prompts.js';

const name = await prompts.text({
  message: 'Profile name:',
  validate: (value) => value.length > 0 ? null : 'Name cannot be empty',
});
```

## Creating Setups

Setups are template configurations that can be applied to profiles. They live in `setups/`.

### Setup Manifest Structure

Each setup must have a `manifest.toml`:

```toml
[setup]
name = "my-setup"
version = "1.0.0"
description = "My custom setup for TypeScript projects"
author = "Your Name"
extends = "fullstack"  # Optional: inherit from another setup

[requires]
"oh-my-claudecode" = ">=0.1.0"
addons = ["addon-name"]  # Required addons

[skills]
enabled = ["autopilot", "deepinit"]
disabled = []

[agents]
# Override agent configurations
[agents.architect]
model = "claude-opus-4-5"
priority = 100

[mcp]
recommended = ["filesystem"]
required = ["filesystem"]
max_enabled = 10

[hooks]
templates = [
  { name = "custom-hook", handler = "./hook.ts", language = "typescript" }
]

[commands]
[commands.dev]
description = "Start development server"
run = "npm run dev"

[commands.build]
description = "Build project"
run = "npm run build"
```

### Setup Documentation

Create a `CLAUDE.md` in the setup directory describing:

```markdown
# My Setup

Description of what this setup does and when to use it.

## Features

- Feature 1
- Feature 2

## Requirements

- Node.js 18+
- Bun 1.0+

## Getting Started

How to apply and use this setup.

## Customization

Tips for customizing the setup.
```

### Setup Best Practices

1. **Single Responsibility**: Each setup should target a specific use case
2. **Clear Inheritance**: Use `extends` to share common configuration
3. **Validate Against Schemas**: Ensure your manifest validates against `SetupManifestSchema`
4. **Document Clearly**: Help users understand what the setup does and provides

## Creating Addons

Addons extend functionality through hooks and custom code. They live in `addons/`.

### Addon Manifest Structure

Each addon must have an `addon.toml`:

```toml
[addon]
name = "my-addon"
version = "1.0.0"
description = "Does something useful"
author = "Your Name"
license = "MIT"
keywords = ["tag1", "tag2"]
repository = "https://github.com/user/repo"

# Hook definitions
[hooks]
# Pre-hook: runs before tool is used
PreToolUse = [
  { matcher = "Read", handler = "./hooks/read-guard.ts", priority = 10 }
]

# Post-hook: runs after tool completes
PostToolUse = [
  { matcher = "Bash", handler = "./hooks/bash-audit.ts", priority = 5 }
]

# Stop event hook
Stop = [
  { handler = "./hooks/cleanup.ts" }
]

# Installation configuration
[install]
runtime = "bun"      # "bun", "node", "deno", or "none"
dependencies = ["dependency-name"]

# Runtime environment variables
[install.env]
MY_VAR = "value"

# Configuration schema for addon
[[config]]
name = "enabled"
type = "boolean"
description = "Enable this addon"
default = true

[[config]]
name = "log-level"
type = "string"
description = "Logging level"
default = "info"
enum = ["debug", "info", "warn", "error"]
```

### Hook Implementation

Create hook handlers that respond to events:

```typescript
// hooks/read-guard.ts
import type { PreToolUseInput, HookResult } from '@/types';

export async function handle(input: PreToolUseInput): Promise<HookResult> {
  // Check if file should be blocked
  if (input.file_path.includes('.env')) {
    return {
      blocked: true,
      reason: 'Cannot read .env files',
    };
  }

  return { blocked: false };
}
```

### Hook Matcher Patterns

Hook matchers determine which tools trigger the handler:

- Specific tool: `"Read"`, `"Bash"`, `"Task"`
- Wildcard: `"*"` (all tools)
- Regex: `/^Read.*File$/` (regex patterns)
- Array: `["Read", "Glob"]` (multiple tools)

### Addon Testing

Test your addon's hooks:

```typescript
import { describe, it, expect } from 'vitest';
import { handle } from './hook.ts';

describe('MyAddon', () => {
  it('should block sensitive files', async () => {
    const result = await handle({
      tool_name: 'Read',
      file_path: '/path/to/.env',
    });

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('.env');
  });

  it('should allow normal files', async () => {
    const result = await handle({
      tool_name: 'Read',
      file_path: '/path/to/src/index.ts',
    });

    expect(result.blocked).toBe(false);
  });
});
```

### Addon Best Practices

1. **Priority**: Higher priority hooks run first (0-100, default 50)
2. **Error Handling**: Always handle errors gracefully in hooks
3. **Performance**: Keep hooks fast; they run in the hot path
4. **Documentation**: Clearly document what your addon does
5. **Version Compatibility**: Test with the minimum required version

```typescript
// Good error handling
export async function handle(input: PreToolUseInput): Promise<HookResult> {
  try {
    const result = await checkFile(input.file_path);
    return { blocked: result.shouldBlock };
  } catch (error) {
    // Log but don't block - don't break other functionality
    console.error('Addon error:', error);
    return { blocked: false };
  }
}
```

## Questions or Need Help?

- Check existing code examples in the repository
- Review related tests to understand patterns
- Open a discussion or issue with your question
- Ask in code review for clarification

Thank you for contributing to claude-code-kit!
