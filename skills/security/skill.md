---
name: security
description: Comprehensive security analysis with OWASP coverage, threat modeling, and dependency auditing
license: MIT
metadata:
  author: claudeops
  version: "4.0.0"
  claudeops:
    triggers: [security audit, vulnerability, pentest, threat model, security review]
    domains: [security]
    model: opus
    userInvocable: true
    disableModelInvocation: false
---

# Security Skill

Comprehensive security analysis using parallel OWASP category scanning, attack surface mapping, threat modeling, and dependency auditing.

## When to Activate

- User says "security audit", "vulnerability scan", "security review"
- User asks about threat modeling or attack surface
- User wants dependency security audit
- Pre-deployment security review

## Workflows

### 1. OWASP-Parallel Audit

**Pattern**: Fan-Out (one agent per OWASP category)

#### Phase 1: Scope
Map all entry points: API endpoints, form handlers, file uploads, WebSocket connections, CLI inputs.

#### Phase 2: Parallel Analysis (Fan-Out)
Spawn one agent per OWASP category:

```
Task(subagent_type="security", model="opus", run_in_background=True,
     prompt="OWASP A01 - Broken Access Control: Review authorization on all endpoints...")

Task(subagent_type="security", model="opus", run_in_background=True,
     prompt="OWASP A02 - Cryptographic Failures: Review encryption at rest/transit...")

Task(subagent_type="security", model="opus", run_in_background=True,
     prompt="OWASP A03 - Injection: Review all user input handling for SQL, XSS, command injection...")

Task(subagent_type="security", model="opus", run_in_background=True,
     prompt="OWASP A07 - Authentication: Review auth flows, session management, JWT, MFA...")

Task(subagent_type="security", model="opus", run_in_background=True,
     prompt="OWASP A05 - Security Misconfiguration: Review config, headers, defaults...")

Task(subagent_type="security", model="opus", run_in_background=True,
     prompt="OWASP A09 - Logging & Monitoring: Review logging, audit trails, error leakage...")
```

#### Phase 3: Synthesis
Collect all findings and produce unified report ranked by severity.

### 2. Threat Modeling

1. **Identify assets** — What needs protection (data, services, credentials)
2. **Map attack surface** — Entry points, trust boundaries, data flows
3. **Identify threats (STRIDE)** — Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation
4. **Assess risk** — Likelihood x Impact for each threat
5. **Define mitigations** — Security controls for each high-risk threat

### 3. Dependency Audit

1. **Scan** — Run `npm audit` (or equivalent) + check for known CVEs
2. **Analyze** — Prioritize by severity, exploitability, transitive risk
3. **Report** — Prioritized upgrade plan with breaking change analysis

## Security Checklist

### Input Validation
- [ ] All user inputs validated and sanitized
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] Command injection prevention
- [ ] Path traversal prevention
- [ ] Type and length validation

### Authentication & Authorization
- [ ] Secure password storage (bcrypt/Argon2)
- [ ] Session management (secure cookies, expiry)
- [ ] Token security (JWT validation, refresh strategy)
- [ ] Authorization checks on all routes
- [ ] Principle of least privilege

### Data Protection
- [ ] Sensitive data encrypted at rest and in transit
- [ ] No secrets in code, logs, or error messages
- [ ] PII handling compliance
- [ ] Secure data deletion

### Infrastructure
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] No default credentials
- [ ] Debug mode disabled in production
- [ ] Rate limiting on sensitive operations

## Output Format

```
## Security Audit Report

### Executive Summary
[Overall security posture assessment]

### Risk Rating: [Critical/High/Medium/Low]

### Findings by Severity

#### Critical
- **[Finding]** — [file:line]
  - OWASP: [category], CWE: [CWE-XXX]
  - Impact: [description]
  - Remediation: [steps]

#### High
[...]

#### Medium
[...]

### Threat Model
| Asset | Threat | Likelihood | Impact | Risk | Mitigation |
|-------|--------|------------|--------|------|------------|

### Dependency Vulnerabilities
| Package | Version | CVE | Severity | Fix Version |
|---------|---------|-----|----------|-------------|

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
5. **Security through obscurity** — Proper encryption and access control, not hiding
6. **Rolling your own crypto** — Use proven libraries
7. **Trusting user input** — Validate, sanitize, escape everything
