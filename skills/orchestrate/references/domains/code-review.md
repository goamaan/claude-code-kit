# Code Review Orchestration

Domain-specific orchestration recipes for code review workflows.

## PR Review: Multi-Dimensional Analysis

**Pattern**: Fan-Out + Reduce

### Phases

1. **Context Gathering** (Pipeline)
   - Spawn explore agent to identify all changed files and their purposes
   - Gather PR description, linked issues, and commit history

2. **Parallel Review** (Fan-Out)
   - Spawn security agent: Vulnerability analysis, OWASP checks
   - Spawn architect agent: Design patterns, architecture compliance
   - Spawn executor agent: Code quality, logic correctness, edge cases
   - Spawn code-simplicity-reviewer: YAGNI, over-engineering checks

3. **Synthesis** (Reduce)
   - Architect synthesizes all findings
   - Output format: Risk Assessment → Must Fix → Should Fix → Consider

### Output Format
```
## Review Summary
**Risk Level**: [Low/Medium/High/Critical]

### Must Fix (Blocking)
- [Finding with file:line reference]

### Should Fix (Non-blocking)
- [Finding with rationale]

### Consider
- [Suggestion with trade-off analysis]

### Strengths
- [What was done well]
```

## Security Audit: OWASP-Parallel

**Pattern**: Fan-Out (one agent per OWASP category)

### Agent Assignments
| Category | Agent | Focus |
|----------|-------|-------|
| Injection | security-sentinel | SQL, XSS, command injection |
| Authentication | security | Auth flows, session management |
| Access Control | security | Authorization checks, RBAC |
| Cryptography | security-sentinel | Encryption, key management |
| Data Exposure | security | PII handling, data leaks |
| Misconfiguration | security | Config files, defaults, headers |

### Output: Risk-ranked findings with severity, location, and remediation.

## Architecture Review: Multi-Stakeholder

**Pattern**: Fan-Out (one agent per stakeholder perspective)

### Agent Assignments
| Perspective | Agent | Evaluates |
|-------------|-------|-----------|
| Scalability | architect | Load handling, bottlenecks |
| Maintainability | code-simplicity-reviewer | Complexity, coupling |
| Security | security | Attack surface, trust boundaries |
| Performance | performance-oracle | Efficiency, resource usage |
| Developer Experience | architect | API ergonomics, documentation |

### Output: Architecture Decision Record format.

## Pre-merge Validation

**Pattern**: Pipeline (gate-based)

### Gates (all must pass)
1. Build compiles successfully
2. All tests pass
3. No critical review findings
4. Documentation updated (if API changes)
5. No merge conflicts
