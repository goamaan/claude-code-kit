---
name: doctor
description: Diagnose and fix installation and configuration issues
auto_trigger:
  - doctor
  - diagnose
  - not working
  - broken
  - troubleshoot
allowed_tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Doctor Skill

Diagnose and fix installation, configuration, and runtime issues.

## Purpose

Doctor mode provides:
- System health checks
- Configuration validation
- Dependency verification
- Issue diagnosis
- Automated fixes

## When to Activate

Activate when:
- User says "doctor"
- Something isn't working
- Configuration seems wrong
- Dependencies are missing
- User asks to troubleshoot

## Diagnostic Checks

### Check 1: ClaudeOps Installation

```bash
# Verify claudeops is installed
which claudeops || npm list -g claudeops

# Check version
claudeops --version
```

**Issues to detect:**
- Not installed globally
- Outdated version
- Multiple installations

### Check 2: Configuration Files

```bash
# Check for config files
ls -la ~/.claude/
ls -la .claude/
```

**Files to verify:**
- `~/.claude/CLAUDE.md` - Global instructions
- `.claude/CLAUDE.md` - Project instructions
- `claudeops.config.toml` - Kit configuration

**Issues to detect:**
- Missing files
- Invalid syntax
- Conflicting settings

### Check 3: Node.js Environment

```bash
# Check Node version
node --version

# Should be 18+
```

**Issues to detect:**
- Node too old
- Node not installed
- Wrong Node version

### Check 4: Dependencies

```bash
# Check project dependencies
npm ls

# Check for missing peer deps
npm ls --depth=0
```

**Issues to detect:**
- Missing dependencies
- Version conflicts
- Peer dependency issues

### Check 5: Git Configuration

```bash
# Check git is available
git --version

# Check git user
git config user.name
git config user.email
```

**Issues to detect:**
- Git not installed
- User not configured
- Repository not initialized

### Check 6: File Permissions

```bash
# Check key file permissions
ls -la ~/.claude/
```

**Issues to detect:**
- Wrong permissions
- Files not readable
- Directories not writable

### Check 7: TypeScript Environment (if applicable)

```bash
# Check TypeScript
npx tsc --version

# Check for tsconfig
ls tsconfig.json
```

**Issues to detect:**
- TypeScript not installed
- Invalid tsconfig
- Type errors

## Diagnostic Report Format

```
# ClaudeOps Doctor Report

## System Status: [HEALTHY/WARNING/ERROR]

### Checks Passed
- [x] ClaudeOps installed (v1.0.0)
- [x] Node.js (v20.10.0)
- [x] Git configured
- [x] Configuration valid

### Issues Found

#### [ERROR] Missing global CLAUDE.md
Location: ~/.claude/CLAUDE.md
Status: Not found

**Fix:** Run `claudeops init --global`

#### [WARNING] Outdated dependency
Package: typescript
Current: 4.9.0
Latest: 5.3.0

**Fix:** Run `npm update typescript`

### Automatic Fixes Available

The following issues can be fixed automatically:
1. Create missing CLAUDE.md
2. Update outdated dependencies

Run `claudeops doctor --fix` to apply fixes.

### Manual Actions Required

The following need manual attention:
1. Git user.email not configured
   Run: `git config --global user.email "you@example.com"`

## Recommendations

- Consider updating to latest claudeops
- Review CLAUDE.md for project-specific settings
```

## Common Issues and Fixes

### Issue: "command not found: claudeops"

**Diagnosis:**
```bash
npm list -g claudeops
which claudeops
echo $PATH
```

**Fix:**
```bash
npm install -g claudeops
# Or ensure npm global bin is in PATH
export PATH="$PATH:$(npm config get prefix)/bin"
```

### Issue: "Cannot find CLAUDE.md"

**Diagnosis:**
```bash
ls -la ~/.claude/
ls -la .claude/
```

**Fix:**
```bash
claudeops init
# Or manually create
mkdir -p ~/.claude
touch ~/.claude/CLAUDE.md
```

### Issue: "Skills not loading"

**Diagnosis:**
```bash
ls -la skills/
cat skills/*/SKILL.md | head
```

**Fix:**
```bash
# Verify SKILL.md format
# Check YAML frontmatter
# Ensure allowed_tools is valid
```

### Issue: "Agents not responding"

**Diagnosis:**
```bash
# Check Claude API access
claude api status

# Check environment
echo $ANTHROPIC_API_KEY
```

**Fix:**
```bash
# Ensure API key is set
export ANTHROPIC_API_KEY="your-key"
```

### Issue: "Build errors in project"

**Diagnosis:**
```bash
npm run build 2>&1 | head -50
npx tsc --noEmit
```

**Fix:**
- Address TypeScript errors
- Update dependencies
- Check tsconfig.json

## Automated Fix Capabilities

Doctor can automatically fix:
- Create missing directories
- Initialize missing files with defaults
- Update npm dependencies
- Fix simple configuration issues

Doctor requires manual fix for:
- API key configuration
- Git user setup
- Complex configuration decisions
- Permission issues

## Output Format

### During Diagnosis
```
## Running Diagnostics...

Checking installation... OK
Checking configuration... WARNING
Checking dependencies... OK
Checking permissions... OK

Found 1 issue.
```

### Final Report
```
## Doctor Report

### Status: WARNING

### Summary
- 6 checks passed
- 1 warning found
- 0 errors found

### Warning Details
[Details of the warning]

### Recommendations
[What to do next]
```

## Anti-Patterns to Avoid

1. **Making destructive changes**
   - BAD: Delete and recreate configs
   - GOOD: Backup before modifying

2. **Ignoring errors**
   - BAD: Continue with broken state
   - GOOD: Report and suggest fixes

3. **Silent failures**
   - BAD: No output when check fails
   - GOOD: Clear error message and fix

4. **Over-fixing**
   - BAD: Change everything automatically
   - GOOD: Ask before major changes

## Success Criteria

Doctor complete when:
- [ ] All checks run
- [ ] Issues identified
- [ ] Fixes suggested/applied
- [ ] System status clear
- [ ] Next steps provided
