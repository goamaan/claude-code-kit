# Documentation Orchestration

Domain-specific orchestration recipes for documentation workflows.

## API Documentation Generation

**Pattern**: Map-Reduce

### Phases

1. **Map** (Fan-Out)
   - Spawn explore agents to find all public API surfaces
   - Extract function signatures, types, and existing JSDoc

2. **Generate** (Fan-Out)
   - Spawn writer agents per module to generate documentation
   - Include: description, parameters, return types, examples, error conditions

3. **Review** (Pipeline)
   - Spawn architect to verify technical accuracy
   - Spawn writer to ensure consistency and completeness

## README Generation

**Pattern**: Pipeline

### Phases
1. **Explore** - Gather project structure, key features, setup requirements
2. **Draft** - Writer agent creates comprehensive README
3. **Review** - Architect verifies technical accuracy
4. **Polish** - Writer refines language and formatting

## Changelog Generation

**Pattern**: Pipeline

### Phases
1. **Gather** - Spawn git-history-analyzer to extract commits since last release
2. **Classify** - Spawn architect to categorize changes (features, fixes, breaking)
3. **Write** - Spawn writer to format changelog entry

## Inline Documentation

**Pattern**: Map-Reduce

### Phases
1. **Map** - Identify functions/classes lacking documentation
2. **Generate** - Fan-out writer agents to add JSDoc/TSDoc
3. **Review** - Architect verifies accuracy
