<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# tests/

## Purpose

Test suites using Vitest. Contains integration tests for end-to-end workflows and command execution. Unit tests are colocated with source files (`.test.ts`).

## Key Files

| File | Purpose |
|------|---------|
| `integration/` | Integration test suites (directory) |
| `setup.ts` | Test setup and global configuration (if exists) |
| `helpers.ts` | Shared test utilities and fixtures (if exists) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `integration/` | End-to-end integration tests (CLI commands, workflows) |

## For AI Agents

### Working In This Directory

- **Test framework**: Vitest with TypeScript support
- **Test isolation**: Use temporary directories for file system operations
- **Integration tests**: Test CLI commands end-to-end via `integration/`
- **Unit tests**: Colocated with source files (e.g., `src/core/config/manager.test.ts`)
- **Fixtures**: Use factory functions to create test data

### Testing Requirements

- Run `npm test` to execute all tests
- Run `npm run typecheck` to verify TypeScript compilation
- All tests must pass before commits
- Use temporary directories for file operations (cleanup after tests)
- Mock external dependencies (file system, network, process)

### Common Patterns

- **Temporary directories**: Create unique temp dir per test, cleanup in `afterEach`
- **Factory functions**: `createTestProfile()`, `createTestAddon()`, etc.
- **Mocking**: Use Vitest's `vi.mock()` for external dependencies
- **Assertions**: Use Vitest's `expect()` with descriptive messages
- **Async tests**: Use `async/await` for asynchronous operations

## Dependencies

### Internal
- `src/*` - All source code under test

### External
- `vitest` - Test framework and runner
- `@vitest/ui` - Test UI (optional)
- `node:fs` - File system operations for test setup
- `node:path` - Path utilities for test fixtures

<!-- MANUAL -->
