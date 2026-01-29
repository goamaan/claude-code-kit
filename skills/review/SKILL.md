---
name: review
description: Multi-specialist parallel code review system with security, performance, and architecture analysis
triggers:
  - review
  - audit
  - code review
  - PR review
  - review this
---

# Review Skill (v5.0)

Multi-specialist parallel code review system. Spawns parallel review agents covering security, performance, architecture, and simplicity, then synthesizes findings into a unified review report.

## When to Activate

- User says "review", "audit", "code review", "PR review"
- User asks for security review, architecture review, or performance review
- User wants pre-merge validation

## Workflows

### 1. PR Review: Multi-Dimensional Analysis

**Pattern**: Fan-Out + Reduce

#### Phase 1: Context Gathering
1. Spawn explore agent (haiku) to identify all changed files
2. Gather PR context: description, commits, linked issues
3. Load `references/domains/code-review.md` domain guide

#### Phase 2: Parallel Review (Fan-Out)
Spawn 4 specialist agents simultaneously:

```
Task(subagent_type="security-sentinel", model="opus", run_in_background=True,
     prompt="Review these files for security vulnerabilities: [files]. Focus on OWASP Top 10...")

Task(subagent_type="performance-oracle", model="opus", run_in_background=True,
     prompt="Review these files for performance issues: [files]. Check algorithms, queries...")

Task(subagent_type="architecture-strategist", model="opus", run_in_background=True,
     prompt="Review these files for architecture compliance: [files]. Check patterns...")

Task(subagent_type="code-simplicity-reviewer", model="sonnet", run_in_background=True,
     prompt="Review these files for over-engineering: [files]. Check YAGNI, complexity...")
```

#### Phase 3: Synthesis (Reduce)
Collect all results via TaskOutput, then synthesize:

```
## Code Review Report

### Risk Level: [Low/Medium/High/Critical]

### Must Fix (Blocking)
- [Finding] — [file:line] — [severity]
  [Description and remediation]

### Should Fix (Non-blocking)
- [Finding] — [file:line]
  [Description and suggestion]

### Consider
- [Suggestion] — [file:line]
  [Trade-off analysis]

### Strengths
- [What was done well]

### Summary by Specialist
- **Security**: [N findings] ([critical/high/medium/low])
- **Performance**: [N findings]
- **Architecture**: [N findings]
- **Simplicity**: [N findings]
```

### 2. Security Audit: OWASP-Parallel

**Pattern**: Fan-Out (one agent per OWASP category)

#### Agent Assignments
| Category | Agent | Focus |
|----------|-------|-------|
| Injection | security-sentinel | SQL, XSS, command injection |
| Authentication | security | Auth flows, session management, JWT |
| Access Control | security-sentinel | Authorization, RBAC, privilege escalation |
| Cryptography | security | Encryption, key management, RNG |
| Data Exposure | security-sentinel | PII, logging, error messages |
| Misconfiguration | security | Config files, headers, defaults |

#### Output
Risk-ranked findings with:
- Severity (Critical/High/Medium/Low)
- OWASP category
- File:line location
- Description and impact
- Remediation steps
- CWE/CVE references

### 3. Architecture Review: Multi-Stakeholder

**Pattern**: Fan-Out (one agent per perspective)

#### Agent Assignments
| Perspective | Agent | Evaluates |
|-------------|-------|-----------|
| Scalability | architect | Load handling, bottlenecks |
| Maintainability | code-simplicity-reviewer | Complexity, coupling, YAGNI |
| Security | security | Attack surface, trust boundaries |
| Performance | performance-oracle | Efficiency, resource usage |
| Developer Experience | architecture-strategist | API ergonomics, conventions |

#### Output
Architecture Decision Record format with findings per perspective.

### 4. Pre-merge Validation

**Pattern**: Pipeline (gate-based)

#### Gates (all must pass)
1. **Build** — `npm run build` succeeds
2. **Tests** — `npm test` all pass
3. **Review** — No critical findings from parallel review
4. **Docs** — Documentation updated if API changed
5. **Conflicts** — No merge conflicts

#### Execution
```
1. Run build + tests (parallel)
2. If pass → spawn review workflow
3. If review clean → approve merge
4. If issues → report blocking findings
```

## Team Mode (When TeammateTool Available)

When native Teams are available:
1. Create review team via `spawnTeam`
2. Spawn named specialist teammates (security-reviewer, perf-reviewer, arch-reviewer, simplicity-reviewer)
3. Each teammate reviews independently and sends findings via inbox
4. Leader (orchestrator) synthesizes all findings
5. Graceful shutdown after synthesis

## Configuration

Specialists can be configured in profile TOML:

```toml
[review]
specialists = ["security", "performance", "architecture", "simplicity"]
```

## Anti-Patterns
1. **Sequential review** — Always use parallel Fan-Out for specialists
2. **Single-reviewer** — Use multiple perspectives for comprehensive coverage
3. **No synthesis** — Always produce a unified report from parallel findings
4. **Ignoring context** — Load domain guide and explore codebase first
