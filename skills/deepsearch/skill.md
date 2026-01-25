---
name: deepsearch
description: Thorough, multi-pattern codebase search. Comprehensive searches for complex queries and analysis.
autoTrigger:
  - deep search
  - thorough search
  - find all occurrences
  - comprehensive search
  - search everywhere for
domains:
  - search
  - analysis
model: sonnet
userInvocable: true
---

# Deep Search Skill

Thorough, comprehensive codebase searching for complex queries and analysis.

## Purpose

The deepsearch skill provides:
- Multi-pattern searches
- Cross-reference analysis
- Dependency tracing
- Usage pattern analysis
- Comprehensive code audits
- Impact analysis searches

## When to Use

Use deepsearch (sonnet-tier) for:
- Complex multi-pattern searches
- Finding all uses of a pattern
- Tracing dependencies
- Impact analysis
- Code audit searches
- Refactoring preparation

## When NOT to Use

- Simple file lookup → Use `explore` (haiku)
- Implementation → Use `executor`
- Debugging → Use `architect`

## Search Protocol

### 1. Plan Search Strategy
```
1. Break query into patterns
2. Identify search scope
3. Plan search sequence
4. Define success criteria
```

### 2. Execute Searches
```
1. Run multiple searches in parallel
2. Correlate results
3. Trace relationships
4. Map dependencies
```

### 3. Analyze and Report
```
1. Categorize findings
2. Identify patterns
3. Assess impact
4. Provide comprehensive report
```

## Task Patterns

### Dependency Trace
```
## Dependency Trace: [Component]

### Search Strategy
1. Find all imports of [Component]
2. Find all uses within those files
3. Trace secondary dependencies
4. Map complete dependency tree

### Direct Dependencies ([N] files)
1. **src/file1.ts**
   - Usage: [how it's used]
   - Risk: [impact of changes]

2. **src/file2.ts**
   - Usage: [how it's used]
   - Risk: [impact of changes]

### Indirect Dependencies ([N] files)
- [File] → [uses direct dep] → [uses Component]

### Dependency Tree
```
Component
├── DirectDep1
│   ├── IndirectDep1
│   └── IndirectDep2
└── DirectDep2
    └── IndirectDep3
```

### Impact Assessment
Changes to [Component] will affect:
- Direct: [N] files
- Indirect: [M] files
- Total: [N+M] files

### Risk Level
[LOW/MEDIUM/HIGH] based on usage patterns
```

### Usage Pattern Analysis
```
## Usage Analysis: [API/Function]

### Search Patterns
- Function calls: [pattern]
- Method access: [pattern]
- Import statements: [pattern]

### Usage Categories

#### Standard Usage ([N] occurrences)
```typescript
// Common pattern
const result = api.method(standardArgs);
```
Files: [list]

#### Advanced Usage ([M] occurrences)
```typescript
// Complex pattern
const result = api.method({
  advanced: options
});
```
Files: [list]

#### Edge Cases ([K] occurrences)
```typescript
// Unusual pattern
const result = api.method(edgeCase);
```
Files: [list]

#### Potential Issues ([X] occurrences)
```typescript
// Problematic pattern
const result = api.method(problematicUsage);
```
Files: [list]
Concern: [Why this is problematic]

### Statistics
- Total usages: [count]
- Files affected: [count]
- Most common pattern: [pattern name]
- Recommended pattern: [pattern name]
```

### Refactoring Impact Analysis
```
## Refactoring Impact: [Proposed Change]

### Scope of Change
What's changing: [description]

### Search Executed
1. Pattern: [search pattern 1]
   Results: [count] matches

2. Pattern: [search pattern 2]
   Results: [count] matches

3. Pattern: [search pattern 3]
   Results: [count] matches

### Affected Areas

#### Files Requiring Changes ([N])
1. src/file1.ts - Lines: [10, 25, 67]
   - Change: [what needs updating]
   - Risk: [assessment]

2. src/file2.ts - Lines: [5, 42]
   - Change: [what needs updating]
   - Risk: [assessment]

#### Tests Requiring Updates ([M])
- test/file1.test.ts: [what to update]
- test/file2.test.ts: [what to update]

#### Documentation Updates ([K])
- README.md: [section]
- docs/api.md: [section]

### Migration Complexity
- Files: [count]
- Lines: [approximate count]
- Estimated effort: [time estimate]
- Risk level: [LOW/MEDIUM/HIGH]

### Recommended Approach
1. [Step 1]
2. [Step 2]
3. [Step 3]
```

### Code Audit Search
```
## Code Audit: [Pattern/Issue]

### Audit Criteria
Looking for: [what we're auditing]
Concern: [why we're looking]

### Search Patterns
1. [Pattern 1]: [rationale]
2. [Pattern 2]: [rationale]
3. [Pattern 3]: [rationale]

### Findings

#### Critical Issues ([N])
1. **src/file1.ts:45**
   ```typescript
   // Problematic code
   ```
   Issue: [description]
   Fix: [recommendation]

#### Warnings ([M])
[Similar structure]

#### Info ([K])
[Similar structure]

### Summary
- Total scanned: [count] files
- Issues found: [count]
- Critical: [count]
- Warning: [count]
- Info: [count]

### Recommendations
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]
```

## Advanced Search Techniques

### Multi-Pattern Search
```
# Search for function definitions AND usages
Pattern 1: "function apiCall|const apiCall ="
Pattern 2: "apiCall\\("

# Correlate results
```

### Cross-Reference Search
```
# Find interface definition
Pattern 1: "interface UserData"

# Find all implementations
Pattern 2: "implements UserData"

# Find all usages
Pattern 3: ": UserData"
```

### Dependency Chain Search
```
# Level 1: Direct imports
Pattern: "import.*from.*Component"

# Level 2: What imports those?
For each result, search: "import.*from.*[result]"

# Build complete graph
```

## Search Optimization

### Parallel Searches
Run multiple searches simultaneously:
```
Grep(pattern="pattern1") +
Grep(pattern="pattern2") +
Grep(pattern="pattern3")
```

### Scoped Searches
Limit search space:
```
Grep(pattern="...", path="src/specific/")
Grep(pattern="...", glob="*.ts", exclude_glob="*.test.ts")
```

### Incremental Narrowing
```
1. Broad search → [1000 results]
2. Add filter → [100 results]
3. Add context → [10 relevant results]
```

## Anti-Patterns to Avoid

1. **Sequential searches**
   - BAD: Search 1, wait, Search 2, wait...
   - GOOD: Run all searches in parallel

2. **No correlation**
   - BAD: Just listing all results
   - GOOD: Analyze relationships between results

3. **Too narrow scope**
   - BAD: Only searching one directory
   - GOOD: Comprehensive codebase search

4. **No categorization**
   - BAD: Dumping 100 results
   - GOOD: Categorize by type/severity/area

## Success Criteria

Deepsearch completes when:
- [ ] All relevant patterns searched
- [ ] Results categorized meaningfully
- [ ] Relationships mapped
- [ ] Impact assessed
- [ ] Comprehensive report provided
- [ ] Actionable recommendations given
