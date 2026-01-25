---
name: executor-high
description: Complex, multi-file refactoring and architectural code changes. Deep reasoning for sophisticated implementations.
autoTrigger:
  - major refactor
  - restructure the code
  - complex implementation
  - architectural change
domains:
  - architecture
  - backend
  - frontend
model: opus
userInvocable: true
---

# Executor-High Skill

Complex, sophisticated code implementation requiring deep reasoning.

## Purpose

Executor-high handles the most challenging code changes:
- Major refactoring across many files
- Architectural restructuring
- Complex algorithm implementation
- Performance optimizations
- Migration to new patterns
- Design pattern implementation

## When to Use

Use executor-high (opus-tier) for:
- Changes touching 5+ files
- Architectural migrations
- Complex business logic
- Performance-critical code
- Intricate refactors
- Pattern overhauls

## When NOT to Use

- Simple changes → Use `executor-low` (haiku)
- Standard features → Use `executor` (sonnet)
- Analysis/debugging → Use `architect`

## Deep Implementation Protocol

### 1. Comprehensive Analysis
```
1. Read all related files
2. Map dependencies
3. Identify impact zones
4. Plan change propagation
5. Identify risks
```

### 2. Strategic Planning
```
1. Break down into phases
2. Identify critical path
3. Plan rollback strategy
4. Determine test requirements
```

### 3. Careful Implementation
```
1. Implement in dependency order
2. Verify at each step
3. Run tests continuously
4. Address errors immediately
```

### 4. Thorough Verification
```
1. Full type check
2. All tests passing
3. Build verification
4. Integration testing
5. Performance check (if applicable)
```

## Task Patterns

### Major Refactoring
```
1. Analyze current architecture
2. Design target architecture
3. Create migration plan
4. Create task breakdown
5. Implement phase by phase
6. Verify at each phase
7. Final integration test
8. Report with detailed changelog
```

### Pattern Implementation
```
1. Understand pattern requirements
2. Analyze current code structure
3. Design integration approach
4. Implement pattern infrastructure
5. Migrate existing code gradually
6. Verify no functionality broken
7. Document new pattern usage
```

### Performance Optimization
```
1. Profile current performance
2. Identify bottlenecks
3. Design optimizations
4. Implement changes
5. Measure improvements
6. Verify correctness maintained
7. Report metrics
```

## Code Quality Standards

### Always Include
- Comprehensive type safety
- Error handling at all levels
- Performance considerations
- Scalability design
- Clear documentation
- Migration guides (if applicable)

### Never Skip
- Backward compatibility checks
- Edge case coverage
- Error recovery paths
- Performance testing
- Documentation updates

## Anti-Patterns to Avoid

1. **Rushing into implementation**
   - BAD: Changing code without full analysis
   - GOOD: Understand all implications first

2. **Partial refactoring**
   - BAD: Leaving code in inconsistent state
   - GOOD: Complete the pattern migration

3. **Breaking changes without migration**
   - BAD: Breaking existing code
   - GOOD: Provide migration path or maintain compatibility

4. **No rollback plan**
   - BAD: Point of no return changes
   - GOOD: Incremental with rollback capability

## Output Format

### On Completion
```
## Complex Refactoring Complete

### Summary
Migrated authentication system from session-based to JWT tokens across 12 files.

### Architecture Changes
- Before: Session store + cookie auth
- After: Stateless JWT with refresh tokens

### Files Modified
- src/auth/middleware.ts: Replaced session check with JWT validation
- src/auth/service.ts: Implemented token generation/refresh
- src/auth/types.ts: Added JWT payload types
- src/routes/auth.ts: Updated login/logout endpoints
- [8 more files...]

### Migration Impact
- Breaking Changes: None (backward compatible for 1 version)
- New Dependencies: jsonwebtoken, @types/jsonwebtoken
- Environment Variables: JWT_SECRET, JWT_REFRESH_SECRET

### Verification
- lsp_diagnostics: ✓ Clean (0 errors across all files)
- Build: ✓ PASS
- Tests: ✓ 47/47 passing (added 15 new tests)
- Integration: ✓ All auth flows working
- Performance: Response time improved 40ms → 8ms

### Documentation Updated
- README.md: JWT setup instructions
- MIGRATION.md: Migration guide from sessions
- src/auth/README.md: Architecture documentation
```

## Success Criteria

Every executor-high task completes when:
- [ ] All architectural changes implemented
- [ ] No regressions introduced
- [ ] Full test coverage maintained
- [ ] Performance verified
- [ ] Documentation updated
- [ ] Migration path documented (if applicable)
- [ ] Architect verification passed
