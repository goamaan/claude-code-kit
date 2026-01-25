---
name: analyze
description: General code analysis and investigation. Quick to medium-depth analysis for understanding code behavior and issues.
autoTrigger:
  - analyze this
  - what does this do
  - explain the code
  - how does this work
  - understand the
domains:
  - analysis
  - investigation
model: sonnet
userInvocable: true
---

# Analyze Skill

General-purpose code analysis and investigation for understanding systems.

## Purpose

The analyze skill provides:
- Code behavior explanation
- Flow tracing
- Impact analysis
- Pattern identification
- Quick debugging
- System understanding

## When to Use

Use analyze (sonnet-tier) for:
- Understanding existing code
- Tracing execution flows
- Impact analysis of changes
- Pattern recognition
- Medium-complexity debugging
- Code behavior explanation

## When NOT to Use

- Deep debugging → Use `architect` (opus)
- Simple lookups → Use `explore` (haiku)
- Implementation → Use `executor`
- Architecture design → Use `architect`

## Analysis Protocol

### 1. Read and Map
```
1. Read target files
2. Identify entry points
3. Map dependencies
4. Note key patterns
```

### 2. Trace and Explain
```
1. Trace execution flow
2. Identify decision points
3. Note side effects
4. Explain behavior
```

### 3. Report Findings
```
1. Summarize functionality
2. Highlight concerns
3. Note patterns
4. Suggest next steps
```

## Task Patterns

### Code Explanation
```
## Code Analysis

### Purpose
[What this code does]

### Flow
1. [Entry point] - [what happens]
2. [Next step] - [what happens]
3. [Final step] - [what happens]

### Key Components
- [Component 1]: [role]
- [Component 2]: [role]

### Patterns Used
- [Pattern 1]: [where, why]
- [Pattern 2]: [where, why]

### Notes
- [Important detail 1]
- [Important detail 2]
```

### Impact Analysis
```
## Impact Analysis

### Proposed Change
[Description]

### Direct Impact
- [File 1]: [how affected]
- [File 2]: [how affected]

### Indirect Impact
- [System 1]: [how affected]
- [System 2]: [how affected]

### Risks
- [Risk 1]: [likelihood, severity]
- [Risk 2]: [likelihood, severity]

### Testing Required
- [Test 1]
- [Test 2]
```

### Bug Investigation
```
## Investigation

### Symptom
[What's wrong]

### Analysis
[Findings from code review]

### Likely Cause
[File:line] - [Explanation]

### Suggested Fix
[Approach with rationale]

### Verification
[How to verify fix works]
```

## Output Format

Keep explanations clear and actionable:

```
## Analysis Complete

### Summary
[High-level findings]

### Details
[Key points with file references]

### Recommendations
1. [Action 1]
2. [Action 2]

### Next Steps
[Suggested actions]
```

## Success Criteria

- [ ] Code behavior explained clearly
- [ ] Impact areas identified
- [ ] Risks highlighted
- [ ] Actionable recommendations provided
