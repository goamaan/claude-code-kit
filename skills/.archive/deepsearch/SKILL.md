---
name: deepsearch
description: Thorough codebase search to find anything
auto_trigger:
  - search
  - find
  - where is
  - locate
  - looking for
  - search codebase
allowed_tools:
  - Task
  - Read
  - Glob
  - Grep
  - Bash
---

# Deepsearch Skill

Thorough, multi-strategy codebase search to find anything: code, patterns, usages, definitions, and more.

## Purpose

Deepsearch provides:
- Multi-strategy searching (glob, grep, AST-aware)
- Cross-reference finding
- Usage tracking
- Definition location
- Pattern discovery

## When to Activate

Activate when user says:
- "find [something]"
- "where is [thing] defined"
- "search for [pattern]"
- "locate all usages of"
- "looking for [code/file]"

## Search Strategies

### Strategy 1: Glob (File Search)
Find files by name pattern:
```
Glob(pattern="**/*user*.ts")
Glob(pattern="**/test/**/*.spec.ts")
Glob(pattern="src/**/*.{ts,tsx}")
```

**Use for:**
- Finding files by name
- Locating test files
- Finding config files
- Listing files in directories

### Strategy 2: Grep (Content Search)
Find content within files:
```
Grep(pattern="function createUser", type="ts")
Grep(pattern="TODO|FIXME", glob="**/*.ts")
Grep(pattern="import.*from.*lodash")
```

**Use for:**
- Finding function definitions
- Locating usages
- Finding imports
- Searching for patterns

### Strategy 3: Agent Search (Semantic)
For complex or semantic searches:
```
Task(subagent_type="oh-my-claudecode:explore",
     prompt="Find all places where user authentication happens")
```

**Use for:**
- Semantic searches
- Complex patterns
- Cross-file relationships
- Architecture discovery

## Search Patterns

### Find Definition
```
# Function definition
Grep(pattern="function functionName", output_mode="content")
Grep(pattern="const functionName = ", output_mode="content")
Grep(pattern="class ClassName", output_mode="content")

# Type/Interface definition
Grep(pattern="interface TypeName", output_mode="content")
Grep(pattern="type TypeName = ", output_mode="content")
```

### Find All Usages
```
# Import usages
Grep(pattern="import.*functionName")
Grep(pattern="from.*moduleName")

# Call usages
Grep(pattern="functionName\\(")
Grep(pattern="\\.methodName\\(")
```

### Find Files by Type
```
# Test files
Glob(pattern="**/*.test.ts")
Glob(pattern="**/*.spec.ts")
Glob(pattern="**/test/**/*.ts")

# Component files
Glob(pattern="**/*.tsx")
Glob(pattern="**/components/**/*")

# Config files
Glob(pattern="**/*.config.{js,ts}")
Glob(pattern="**/.*rc")
```

### Find TODOs and Issues
```
Grep(pattern="TODO", output_mode="content")
Grep(pattern="FIXME", output_mode="content")
Grep(pattern="HACK|XXX", output_mode="content")
```

### Find Dead Code
```
# Export not imported elsewhere
1. Grep(pattern="export.*functionName")
2. Grep(pattern="import.*functionName")
3. Compare results
```

## Multi-Strategy Workflow

For thorough searches, combine strategies:

### Example: Find all authentication code
```
# Strategy 1: File names
Glob(pattern="**/*auth*")
Glob(pattern="**/*login*")
Glob(pattern="**/*session*")

# Strategy 2: Content patterns
Grep(pattern="authenticate|authorize")
Grep(pattern="jwt|token")
Grep(pattern="password|credential")

# Strategy 3: Semantic search
Task(subagent="explore", prompt="Find authentication flow entry points")
```

### Example: Find where function is used
```
# Step 1: Find definition
Grep(pattern="function targetFunction")

# Step 2: Find imports
Grep(pattern="import.*targetFunction")

# Step 3: Find calls
Grep(pattern="targetFunction\\(")

# Step 4: Find references
Grep(pattern="targetFunction[^(]")
```

## Agent Delegation

| Task | Agent | Model |
|------|-------|-------|
| Quick file search | explore | haiku |
| Complex pattern search | explore-medium | sonnet |
| Semantic/architectural | explore-medium | sonnet |
| Cross-reference analysis | architect-low | haiku |

### Using Explore Agent
```
Task(subagent_type="oh-my-claudecode:explore",
     model="haiku",
     prompt="Find all files related to user management")
```

### For Complex Searches
```
Task(subagent_type="oh-my-claudecode:explore-medium",
     model="sonnet",
     prompt="Map out the data flow from API request to database for user creation")
```

## Output Format

### File Search Results
```
## Search: Files matching "*auth*"

### Found 8 files

#### Source Files
- src/services/auth.ts - Authentication service
- src/middleware/auth.ts - Auth middleware
- src/routes/auth.ts - Auth routes

#### Test Files
- tests/auth.test.ts - Auth tests

#### Config
- config/auth.config.ts - Auth configuration
```

### Content Search Results
```
## Search: "createUser" usages

### Found 12 occurrences in 5 files

#### src/services/user.ts
- Line 42: export function createUser(data: UserInput)
- Line 85: const user = await createUser(validated)

#### src/routes/api.ts
- Line 23: import { createUser } from '../services/user'
- Line 67: const result = await createUser(req.body)

#### tests/user.test.ts
- Line 12: import { createUser } from '../src/services/user'
- Line 45: const user = await createUser(testData)
```

### Comprehensive Search Results
```
## Comprehensive Search: Authentication System

### Entry Points
- src/routes/auth.ts - HTTP endpoints
- src/middleware/auth.ts - Request authentication

### Core Logic
- src/services/auth.ts - AuthService class
- src/utils/jwt.ts - Token handling

### Data Layer
- src/repositories/user.ts - User storage
- src/models/user.ts - User entity

### Configuration
- config/auth.config.ts - Auth settings
- .env - JWT_SECRET, etc.

### Tests
- tests/auth.test.ts - Auth service tests
- tests/middleware.test.ts - Middleware tests

### Flow
1. Request → auth middleware (verify token)
2. Routes → AuthService.login/register
3. AuthService → UserRepository
4. JWT utilities for token ops
```

## Advanced Search Techniques

### Regex Patterns
```
# Function with specific parameter
Grep(pattern="function \\w+\\(.*userId.*\\)")

# Async functions
Grep(pattern="async function|async \\(")

# Error throwing
Grep(pattern="throw new \\w+Error")
```

### Negative Search
```
# Find files NOT matching
Glob all → filter out matches

# Find code without something
Look for patterns missing expected elements
```

### Cross-Reference Search
```
1. Find all exports
2. Find all imports
3. Match to find unused exports
```

## Anti-Patterns to Avoid

1. **Single strategy only**
   - BAD: Only grep, miss file names
   - GOOD: Combine glob + grep + semantic

2. **Too broad patterns**
   - BAD: Grep(pattern="user") - too many matches
   - GOOD: Grep(pattern="createUser\\(") - specific

3. **Missing context**
   - BAD: Just list matching files
   - GOOD: Show relevant lines with context

4. **No follow-up**
   - BAD: List usages, stop
   - GOOD: Read relevant files to understand context

## Success Criteria

Search complete when:
- [ ] All relevant files identified
- [ ] All usages found
- [ ] Context provided for findings
- [ ] Results organized clearly
- [ ] Follow-up searches done if needed
