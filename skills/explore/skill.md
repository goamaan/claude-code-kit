---
name: explore
description: Fast codebase exploration and file finding. Quick searches for files, functions, and patterns.
model: haiku
user-invocable: true
---

# Explore Skill

Fast codebase exploration for finding files, functions, classes, and patterns.

## Purpose

The explore skill provides:
- File location
- Function/class finding
- Pattern searching
- Quick code lookups
- Directory structure understanding
- Import chain tracing

## When to Use

Use explore (haiku-tier) for:
- Finding where something is defined
- Locating files by name or pattern
- Quick searches for specific code
- Understanding file structure
- Simple pattern matching

## When NOT to Use

- Deep multi-pattern analysis → Use `deepsearch`
- Complex debugging → Use `architect`
- Code implementation → Use `executor`

## Search Protocol

### 1. Understand Query
```
1. What are we looking for?
2. Any constraints? (file type, directory)
3. Exact match or pattern?
```

### 2. Search Efficiently
```
1. Use Glob for file names
2. Use Grep for code content
3. Combine for complex queries
```

### 3. Report Results
```
1. List findings
2. Show relevant context
3. Provide file paths
```

## Search Patterns

### Find File by Name
```
Query: "Find UserService.ts"

Tool: Glob(pattern="**/UserService.ts")

Result:
Found: src/services/UserService.ts
```

### Find Function Definition
```
Query: "Where is createUser defined?"

Tool: Grep(pattern="function createUser|const createUser|createUser\\(", output_mode="content")

Result:
src/services/UserService.ts:45
  function createUser(data: UserInput): Promise<User> {
```

### Find Class
```
Query: "Locate AuthController class"

Tool: Grep(pattern="class AuthController", output_mode="files_with_matches")

Result:
src/controllers/AuthController.ts
```

### Find Imports
```
Query: "Where is UserService imported?"

Tool: Grep(pattern="import.*UserService", output_mode="content")

Result:
src/controllers/UserController.ts:3
  import { UserService } from '../services/UserService';

src/routes/users.ts:5
  import { UserService } from './services/UserService';
```

### Find All Files of Type
```
Query: "Find all test files"

Tool: Glob(pattern="**/*.test.ts")

Result:
- src/services/__tests__/UserService.test.ts
- src/controllers/__tests__/AuthController.test.ts
- src/utils/__tests__/validation.test.ts
```

### Find Pattern Usage
```
Query: "Find all uses of validateEmail"

Tool: Grep(pattern="validateEmail", output_mode="content", -C=2)

Result:
src/services/UserService.ts:23-25
  const user = {
    email: validateEmail(input.email),
    name: input.name
  };
```

## Task Patterns

### Single File Lookup
```
## Search: [Query]

### Found
File: src/path/to/file.ts
Location: Line [N]

### Context
```typescript
// Relevant code snippet
```
```

### Multiple Results
```
## Search: [Query]

### Found [N] matches

1. **src/file1.ts:45**
   ```typescript
   // Code context
   ```

2. **src/file2.ts:12**
   ```typescript
   // Code context
   ```

3. **src/file3.ts:89**
   ```typescript
   // Code context
   ```
```

### File Structure
```
## Directory Structure: [Path]

```
src/
├── controllers/
│   ├── AuthController.ts
│   └── UserController.ts
├── services/
│   ├── AuthService.ts
│   └── UserService.ts
├── routes/
│   ├── auth.ts
│   └── users.ts
└── utils/
    └── validation.ts
```

### Key Files
- Controllers: [count] files
- Services: [count] files
- Routes: [count] files
```

## Search Techniques

### Glob Patterns
```
**/*.ts          # All TypeScript files
**/*.test.ts     # All test files
src/services/**  # All files in services
**/User*.ts      # Files starting with "User"
```

### Grep Patterns
```
"class UserService"              # Exact match
"function create.*User"          # Regex pattern
"import.*from ['\"]react"        # Imports from react
"TODO|FIXME|HACK"               # Multiple patterns
```

### Context Options
```
-C 2    # 2 lines before and after
-B 3    # 3 lines before
-A 1    # 1 line after
```

## Output Format

Keep it fast and concise:

```
## Found: [Item Name]

Location: [file:line]

```code
[relevant snippet]
```

[Additional context if helpful]
```

## Anti-Patterns to Avoid

1. **Too broad search**
   - BAD: Grep(pattern="user")  # Too many results
   - GOOD: Grep(pattern="class.*User.*Service")

2. **Wrong tool**
   - BAD: Reading all files to find one
   - GOOD: Use Glob or Grep

3. **No context**
   - BAD: Just file path
   - GOOD: File path + code snippet

4. **Slow searches**
   - BAD: Multiple sequential searches
   - GOOD: One efficient search

## Success Criteria

Explore completes when:
- [ ] Target found or definitively not present
- [ ] Relevant context provided
- [ ] File paths are absolute
- [ ] Fast turnaround (< 10 seconds)