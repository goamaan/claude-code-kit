# Test Helpers

Shared utilities for writing tests in the claudeops project.

## Installation

```typescript
import { createTempDir, removeTempDir, createFile } from '@/tests/helpers';
```

## Available Utilities

### `createTempDir(prefix?: string): Promise<string>`

Creates a temporary directory for tests with an optional prefix.

```typescript
const tempDir = await createTempDir('my-test-');
// Returns: /tmp/my-test-abc123
```

### `removeTempDir(dir: string): Promise<void>`

Removes a directory and all its contents. Safe to call on non-existent directories.

```typescript
await removeTempDir(tempDir);
```

### `createFile(filePath: string, content: string): Promise<void>`

Creates a file with the given content, automatically creating parent directories.

```typescript
await createFile('/tmp/test/deep/nested/file.txt', 'content');
```

### `createJsonFile(filePath: string, data: unknown): Promise<void>`

Creates a JSON file with proper formatting (2-space indentation).

```typescript
await createJsonFile('/tmp/config.json', { name: 'test', version: '1.0.0' });
```

### `readJsonFile<T>(filePath: string): Promise<T>`

Reads and parses a JSON file with type safety.

```typescript
const config = await readJsonFile<ConfigType>('/tmp/config.json');
```

### `fileExists(filePath: string): Promise<boolean>`

Checks if a file or directory exists.

```typescript
if (await fileExists('/tmp/test.txt')) {
  // File exists
}
```

### `createDirStructure(baseDir: string, structure: object): Promise<void>`

Creates a complete directory structure from a nested object. Keys are paths, values are either file contents (string) or nested objects (directories).

```typescript
await createDirStructure('/tmp/project', {
  'package.json': JSON.stringify({ name: 'test' }),
  'src': {
    'index.ts': 'export const main = () => {};',
    'utils': {
      'helper.ts': 'export const helper = () => {};'
    }
  },
  'tests': {
    'index.test.ts': 'describe("test", () => {});'
  }
});
```

## Usage Pattern

The typical pattern for using these utilities in tests:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTempDir, removeTempDir, createFile } from '@/tests/helpers';

describe('MyFeature', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('my-feature-test-');
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  it('should work with temp directory', async () => {
    await createFile(path.join(tempDir, 'test.txt'), 'content');
    // ... test logic
  });
});
```

## Migration Example

### Before

```typescript
let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'loader-test-'));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

// Creating files
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(path.join(dir, 'manifest.toml'), content);
```

### After

```typescript
import { createTempDir, removeTempDir, createFile } from '@/tests/helpers';

let tempDir: string;

beforeEach(async () => {
  tempDir = await createTempDir('loader-test-');
});

afterEach(async () => {
  await removeTempDir(tempDir);
});

// Creating files
await createFile(path.join(dir, 'manifest.toml'), content);
```
