---
name: security
description: Security review and vulnerability detection. Comprehensive security analysis and threat modeling.
autoTrigger:
  - security review
  - check for vulnerabilities
  - security audit
  - threat model
  - secure this code
domains:
  - security
  - audit
model: opus
userInvocable: true
---

# Security Skill

Comprehensive security analysis, vulnerability detection, and threat modeling.

## Purpose

The security skill provides:
- Vulnerability detection
- Security best practices review
- Threat modeling
- Access control analysis
- Input validation review
- Dependency security audit

## When to Use

Use security (opus-tier) for:
- Pre-deployment security review
- Authentication/authorization code
- Input handling review
- API security audit
- Dependency vulnerability check
- Compliance verification

## When NOT to Use

- Simple code review → Use `code-review`
- Architecture review → Use `architect`
- General testing → Use `qa-tester`

## Security Review Protocol

### 1. Threat Modeling
```
1. Identify assets
2. Map attack surface
3. Identify threat actors
4. Enumerate threats
5. Assess risk levels
```

### 2. Code Review
```
1. Input validation
2. Authentication/authorization
3. Data protection
4. Error handling
5. Dependency security
```

### 3. Report Findings
```
1. Critical vulnerabilities
2. High-risk issues
3. Medium-risk issues
4. Best practice violations
5. Recommendations
```

## Review Checklist

### Input Validation
- [ ] All user inputs validated
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Command injection prevention
- [ ] Path traversal prevention
- [ ] Type validation
- [ ] Length/size limits

### Authentication & Authorization
- [ ] Strong password requirements
- [ ] Secure session management
- [ ] Token security (JWT/OAuth)
- [ ] MFA support
- [ ] Authorization checks on all routes
- [ ] Principle of least privilege
- [ ] Secure password storage (hashing)

### Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] Sensitive data encrypted in transit (HTTPS)
- [ ] No secrets in code/logs
- [ ] Secure data deletion
- [ ] PII handling compliance
- [ ] Database query parameterization

### Error Handling
- [ ] No sensitive info in errors
- [ ] Secure error logging
- [ ] Graceful degradation
- [ ] No stack traces to users
- [ ] Rate limiting on sensitive ops

### Dependencies
- [ ] No known vulnerabilities
- [ ] Dependencies up to date
- [ ] Supply chain security
- [ ] License compliance

## Task Patterns

### Security Audit Report
```
## Security Audit Report

### Scope
Files reviewed: [count]
Components: [list]
Focus areas: [areas]

### Executive Summary
Risk level: [CRITICAL/HIGH/MEDIUM/LOW]
Critical issues: [count]
High issues: [count]
Recommendations: [key actions]

---

### CRITICAL Issues

#### 1. [Vulnerability Name]
- Location: [file:line]
- Risk: [specific threat]
- Impact: [what could happen]
- CVSS Score: [if applicable]

**Vulnerable Code:**
```
[code snippet]
```

**Exploit Scenario:**
[How attacker could exploit this]

**Fix:**
```
[secure code]
```

**Priority:** IMMEDIATE

---

### HIGH Issues

#### 1. [Issue Name]
- Location: [file:line]
- Risk: [threat]
- Impact: [consequences]

**Current Code:**
```
[code]
```

**Recommendation:**
```
[fix]
```

**Priority:** Within 48 hours

---

### MEDIUM Issues

[Similar structure]

---

### Security Best Practices

#### Followed ✓
- [Practice 1]
- [Practice 2]

#### Not Followed ✗
- [Practice 1]: [recommendation]
- [Practice 2]: [recommendation]

---

### Dependency Security

#### Vulnerabilities Found
1. [Package@version]: [CVE-ID]
   - Severity: [Critical/High/Medium/Low]
   - Fix: Upgrade to [version]

#### Outdated Packages
- [Package]: [current] → [latest]

---

### Compliance

#### OWASP Top 10
- A01 Broken Access Control: [PASS/FAIL]
- A02 Cryptographic Failures: [PASS/FAIL]
- A03 Injection: [PASS/FAIL]
- [etc...]

---

### Recommendations

#### Immediate (Critical)
1. [Action 1]
2. [Action 2]

#### Short-term (High)
1. [Action 1]
2. [Action 2]

#### Long-term (Medium)
1. [Action 1]
2. [Action 2]

---

### Conclusion
[Overall assessment and approval status]
```

### Threat Model
```
## Threat Model: [Component]

### Assets
1. [Asset 1]: [value, sensitivity]
2. [Asset 2]: [value, sensitivity]

### Attack Surface
- Entry points: [list]
- Trust boundaries: [list]
- Data flows: [description]

### Threat Actors
1. [Actor type]: [motivation, capability]
2. [Actor type]: [motivation, capability]

### Threats (STRIDE)

#### Spoofing
- [Threat]: [likelihood, impact]
  - Mitigation: [control]

#### Tampering
- [Threat]: [likelihood, impact]
  - Mitigation: [control]

#### Repudiation
- [Threat]: [likelihood, impact]
  - Mitigation: [control]

#### Information Disclosure
- [Threat]: [likelihood, impact]
  - Mitigation: [control]

#### Denial of Service
- [Threat]: [likelihood, impact]
  - Mitigation: [control]

#### Elevation of Privilege
- [Threat]: [likelihood, impact]
  - Mitigation: [control]

### Risk Assessment
[Summary of highest risks]

### Security Controls
[Recommended mitigations]
```

## Common Vulnerabilities

### Injection Flaws
- SQL injection
- Command injection
- LDAP injection
- XPath injection
- NoSQL injection

### Broken Authentication
- Weak passwords
- Session fixation
- Insecure session management
- Missing MFA

### Sensitive Data Exposure
- Unencrypted data
- Weak encryption
- Secrets in code
- Sensitive logs

### XXE (XML External Entities)
- XML parser vulnerabilities
- SSRF via XXE

### Broken Access Control
- Missing authorization
- Insecure direct object references
- Path traversal

### Security Misconfiguration
- Default credentials
- Unnecessary features enabled
- Verbose error messages
- Missing security headers

### XSS (Cross-Site Scripting)
- Reflected XSS
- Stored XSS
- DOM-based XSS

### Deserialization
- Insecure deserialization
- Object injection

### Known Vulnerabilities
- Outdated dependencies
- Unpatched libraries

### Insufficient Logging
- Missing audit logs
- No intrusion detection

## Anti-Patterns to Avoid

1. **Security through obscurity**
   - BAD: Hiding secrets in complex code
   - GOOD: Proper encryption and access control

2. **Trusting user input**
   - BAD: Direct use of user data
   - GOOD: Validate, sanitize, escape

3. **Rolling your own crypto**
   - BAD: Custom encryption algorithms
   - GOOD: Use proven libraries

4. **Storing passwords in plaintext**
   - BAD: Readable passwords
   - GOOD: bcrypt, Argon2, PBKDF2

## Success Criteria

Security review completes when:
- [ ] All code paths reviewed
- [ ] Vulnerabilities identified by severity
- [ ] Fixes provided for all issues
- [ ] Threat model completed
- [ ] Dependency audit complete
- [ ] Clear risk assessment provided
