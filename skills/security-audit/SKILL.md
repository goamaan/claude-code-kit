---
name: security-audit
description: Comprehensive security audit orchestration with OWASP coverage and threat modeling
triggers:
  - security audit
  - vulnerability
  - pentest
  - threat model
  - security review
---

# Security Audit Skill (v5.0)

Security-focused orchestration that performs comprehensive security analysis using parallel OWASP category scanning, attack surface mapping, and dependency auditing.

## When to Activate

- User says "security audit", "vulnerability scan", "security review"
- User asks about threat modeling or attack surface
- User wants dependency security audit
- User requests penetration testing preparation

## Workflows

### 1. OWASP-Parallel Audit

**Pattern**: Fan-Out (one agent per OWASP category)

#### Phase 1: Scope (Pipeline)
```
Task(subagent_type="explore", model="haiku",
     prompt="Map all entry points: API endpoints, form handlers, file uploads, WebSocket connections, CLI inputs...")
```

#### Phase 2: Parallel Analysis (Fan-Out)
Spawn one agent per OWASP category:

```
Task(subagent_type="security-sentinel", model="opus", run_in_background=True,
     prompt="OWASP A01 - Broken Access Control: Review authorization checks on all endpoints. Look for: missing auth, horizontal privilege escalation, CORS misconfiguration, directory traversal...")

Task(subagent_type="security", model="opus", run_in_background=True,
     prompt="OWASP A02 - Cryptographic Failures: Review encryption at rest/transit. Check: algorithm strength, key management, sensitive data exposure, certificate handling...")

Task(subagent_type="security-sentinel", model="opus", run_in_background=True,
     prompt="OWASP A03 - Injection: Review all user input handling. Check: SQL injection, XSS (stored/reflected/DOM), command injection, template injection, path traversal...")

Task(subagent_type="security", model="opus", run_in_background=True,
     prompt="OWASP A07 - Authentication Failures: Review auth implementation. Check: password storage, session management, JWT handling, MFA implementation, brute force protection...")

Task(subagent_type="security-sentinel", model="opus", run_in_background=True,
     prompt="OWASP A05 - Security Misconfiguration: Review config files, environment variables, headers. Check: default credentials, debug mode, unnecessary features, missing security headers...")

Task(subagent_type="security", model="opus", run_in_background=True,
     prompt="OWASP A09 - Security Logging and Monitoring: Review logging practices. Check: sensitive data in logs, audit trail coverage, error information leakage...")
```

#### Phase 3: Synthesis (Reduce)
Collect all findings and produce unified security report ranked by severity.

### 2. Attack Surface Mapping

**Pattern**: Fan-Out + Pipeline

#### Phase 1: Map Entry Points (Fan-Out)
```
Task(subagent_type="explore", model="haiku", run_in_background=True,
     prompt="Find all HTTP/API endpoints and their authentication requirements...")

Task(subagent_type="explore", model="haiku", run_in_background=True,
     prompt="Find all file upload/download handlers, WebSocket endpoints, background job entry points...")

Task(subagent_type="explore", model="haiku", run_in_background=True,
     prompt="Find all external service integrations, database connections, third-party API calls...")
```

#### Phase 2: Analyze (Fan-Out)
For each entry point category, spawn security agent to analyze:
```
Task(subagent_type="security-sentinel", model="opus", run_in_background=True,
     prompt="Analyze these entry points for vulnerabilities: [entry points]. Produce threat model with: asset, threat, likelihood, impact, mitigation...")
```

#### Phase 3: Synthesize (Pipeline)
Spawn architect to produce comprehensive threat model.

### 3. Dependency Audit

**Pattern**: Pipeline

1. **Scan** — Spawn security agent to run CVE scan:
   ```
   Task(subagent_type="security", model="opus",
        prompt="Audit all project dependencies. Run: npm audit (or equivalent). Check for known CVEs. List all outdated packages. Analyze transitive dependency risks...")
   ```

2. **Analyze** — Spawn architect to prioritize findings:
   ```
   Task(subagent_type="architect", model="opus",
        prompt="Given these dependency audit results, create a prioritized upgrade plan. Consider: severity, exploitability, transitive risk, upgrade effort, breaking changes...")
   ```

3. **Report** — Produce prioritized upgrade plan with:
   - Critical CVEs requiring immediate action
   - High-risk outdated dependencies
   - Transitive dependency risks
   - Recommended upgrade order

## Agent Assignment

| Task | Agent | Model |
|------|-------|-------|
| Entry point mapping | explore | haiku |
| OWASP A01 (Access Control) | security-sentinel | opus |
| OWASP A02 (Crypto) | security | opus |
| OWASP A03 (Injection) | security-sentinel | opus |
| OWASP A07 (Auth) | security | opus |
| OWASP A05 (Misconfig) | security-sentinel | opus |
| OWASP A09 (Logging) | security | opus |
| Threat modeling | architect | opus |
| Dependency audit | security | opus |
| Report synthesis | architect | opus |

## Output Format

```
## Security Audit Report

### Executive Summary
[Overall security posture assessment]

### Risk Rating: [Critical/High/Medium/Low]

### Findings by Severity

#### Critical
- **[Finding Title]**
  - Location: [file:line]
  - OWASP: [category]
  - CWE: [CWE-XXX]
  - Impact: [description]
  - Remediation: [steps]

#### High
[...]

#### Medium
[...]

#### Low
[...]

### Threat Model
| Asset | Threat | Likelihood | Impact | Risk | Mitigation |
|-------|--------|------------|--------|------|------------|
| [asset] | [threat] | [H/M/L] | [H/M/L] | [score] | [action] |

### Dependency Vulnerabilities
| Package | Version | CVE | Severity | Fix Version |
|---------|---------|-----|----------|-------------|
| [pkg] | [ver] | [CVE] | [sev] | [fix] |

### Recommendations
1. [Immediate actions]
2. [Short-term improvements]
3. [Long-term security strategy]
```

## Anti-Patterns
1. **Surface-level scanning** — Dig deep into each OWASP category
2. **Missing context** — Always map attack surface before auditing
3. **No remediation** — Every finding must include fix guidance
4. **Ignoring dependencies** — Transitive vulnerabilities are real threats
5. **Single-agent audit** — Use parallel specialists for thorough coverage
