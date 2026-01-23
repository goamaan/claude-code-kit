---
name: analyze
description: Deep debugging and investigation for complex issues
auto_trigger:
  - analyze
  - debug
  - investigate
  - why is
  - figure out
  - understand why
  - what's causing
allowed_tools:
  - Task
  - Read
  - Glob
  - Grep
  - Bash
  - TodoWrite
---

# Analyze Skill

Deep analysis and debugging for complex issues that require systematic investigation.

## Purpose

Analyze mode provides:
- Systematic debugging methodology
- Root cause analysis
- Hypothesis-driven investigation
- Evidence-based conclusions

## When to Activate

Activate when user says:
- "analyze this issue"
- "debug [problem]"
- "investigate why"
- "why is [X] happening"
- "figure out what's wrong"
- "what's causing [issue]"

## Investigation Methodology

### The Scientific Method for Debugging

```
1. OBSERVE:    What is the symptom?
2. HYPOTHESIZE: What could cause this?
3. PREDICT:    If hypothesis is true, what else should we see?
4. TEST:       Check predictions
5. CONCLUDE:   Confirm or reject hypothesis
6. REPEAT:     Until root cause found
```

## Workflow

### Phase 1: Observation

1. **Understand the symptom:**
   ```
   What is happening?
   What should be happening?
   When did it start?
   Is it consistent or intermittent?
   ```

2. **Gather evidence:**
   ```
   - Error messages
   - Stack traces
   - Logs
   - User reports
   - Screenshots
   ```

3. **Reproduce (if possible):**
   ```
   What steps trigger the issue?
   Can we reproduce consistently?
   ```

### Phase 2: Hypothesis Generation

1. **List possible causes:**
   ```
   Spawn architect for analysis:
   Task(subagent_type="oh-my-claudecode:architect",
        model="opus",
        prompt="Analyze this issue and list possible causes: [evidence]")
   ```

2. **Prioritize by likelihood:**
   - Most common causes first
   - Consider recent changes
   - Check similar past issues

### Phase 3: Investigation

For each hypothesis:

1. **Predict what we'd see if true:**
   ```
   If hypothesis X is correct, then:
   - We should see Y in logs
   - Variable Z would be null
   - This other test would fail
   ```

2. **Test the prediction:**
   ```
   Search for evidence:
   Grep(pattern="[predicted pattern]")
   Read(file="[relevant file]")
   Bash(command="[diagnostic command]")
   ```

3. **Evaluate result:**
   - Prediction confirmed: hypothesis likely
   - Prediction failed: hypothesis unlikely, move on

### Phase 4: Root Cause Confirmation

Once hypothesis confirmed:

1. **Verify causation:**
   ```
   Can we prove this causes the issue?
   If we fix this, does issue resolve?
   ```

2. **Trace execution path:**
   ```
   Follow the code from entry to error:
   - What function is called?
   - What state is passed?
   - Where does it diverge from expected?
   ```

### Phase 5: Solution

1. **Propose fix:**
   ```
   Task(subagent_type="oh-my-claudecode:architect",
        model="opus",
        prompt="Given root cause [X], propose fix strategy")
   ```

2. **Implement:**
   ```
   Task(subagent_type="oh-my-claudecode:executor",
        prompt="Implement fix for [root cause]")
   ```

3. **Verify:**
   ```
   - Does original issue resolve?
   - Any new issues introduced?
   - Tests pass?
   ```

## Agent Delegation

| Task | Agent | Model |
|------|-------|-------|
| Initial analysis | architect | opus |
| Quick lookups | explore | haiku |
| Code search | explore-medium | sonnet |
| Deep analysis | architect | opus |
| Fix implementation | executor | sonnet |
| Verification | qa-tester | sonnet |

### Architect for Deep Analysis

The architect agent is your primary debugger:
```
Task(subagent_type="oh-my-claudecode:architect",
     model="opus",
     prompt="Deep analysis needed for: [issue]
             Evidence:
             - [Error message]
             - [Stack trace]
             - [Relevant code]

             Questions:
             1. What are the possible causes?
             2. What should we check first?
             3. How can we confirm the root cause?")
```

## Common Investigation Patterns

### Type Error Investigation
```
1. Read the exact error message
2. Find the file:line reference
3. Understand expected vs actual type
4. Trace where incorrect type originates
5. Fix at source
```

### Runtime Error Investigation
```
1. Get full stack trace
2. Identify first non-library frame
3. Read surrounding code
4. Understand execution context
5. Identify missing check or invalid state
```

### Logic Bug Investigation
```
1. Understand expected behavior
2. Identify actual behavior
3. Add logging/debugging at key points
4. Trace execution path
5. Find divergence point
6. Understand why divergence occurs
```

### Performance Investigation
```
1. Measure before optimization
2. Profile to find hotspots
3. Analyze hotspot code
4. Identify inefficiency (algorithm, queries, etc.)
5. Propose optimization
6. Measure after
```

### Race Condition Investigation
```
1. Identify shared state
2. Map all access points
3. Check synchronization
4. Consider timing scenarios
5. Add appropriate locking/sequencing
```

## Output Format

### Investigation Report
```
## Analysis: [Issue Title]

### Symptom
[What is happening]

### Root Cause
[What is causing it]

### Evidence
1. [Evidence 1 and what it shows]
2. [Evidence 2 and what it shows]

### Investigation Path
1. Hypothesis: [First guess]
   - Tested: [How]
   - Result: [Confirmed/Rejected]

2. Hypothesis: [Second guess]
   - Tested: [How]
   - Result: [Confirmed] ← ROOT CAUSE

### Explanation
[Detailed explanation of why this causes the symptom]

### Fix
[Proposed or implemented solution]

### Verification
[How we confirmed the fix works]

### Prevention
[How to prevent similar issues in future]
```

### Quick Analysis Format
```
## Quick Analysis

**Issue:** [One line description]
**Cause:** [Root cause]
**Fix:** [Solution]
**Verification:** [How confirmed]
```

## Diagnostic Commands

### JavaScript/TypeScript
```bash
# Type checking
npx tsc --noEmit

# Find type errors in specific file
npx tsc --noEmit src/file.ts

# Run specific test
npm test -- --testNamePattern="failing test"
```

### General
```bash
# Check for circular dependencies
npx madge --circular src/

# Memory profiling
node --inspect src/index.js

# CPU profiling
node --prof src/index.js
```

## Anti-Patterns to Avoid

1. **Guessing without evidence**
   - BAD: "It's probably X, let's fix X"
   - GOOD: "Let's verify if X is the cause first"

2. **Fixing symptoms not causes**
   - BAD: Adding null check without understanding why null
   - GOOD: Finding why value is null in first place

3. **Incomplete investigation**
   - BAD: "First hypothesis confirmed, done"
   - GOOD: "Confirmed AND verified fix resolves issue"

4. **No verification**
   - BAD: "Fixed it" (without testing)
   - GOOD: "Fixed it, verified by [test/reproduction]"

5. **Tunnel vision**
   - BAD: Stuck on one hypothesis
   - GOOD: Consider multiple causes, test each

## Success Criteria

Analysis complete when:
- [ ] Root cause identified with evidence
- [ ] Hypothesis tested and confirmed
- [ ] Fix implemented (if requested)
- [ ] Fix verified to resolve issue
- [ ] No new issues introduced
- [ ] Prevention strategy documented (if applicable)
