---
name: git-master
description: Git expertise for commits, branches, and history management. Ensures clean commit messages, proper branch workflow, and safe history management. Use for any version control operations.
---

# Git Master Skill

Git expertise that activates silently when working with version control, ensuring clean history and proper workflow.

## Purpose

This skill provides:
- Proper commit practices
- Clean branch management
- Merge/rebase strategies
- History maintenance
- Conflict resolution

## Silent Activation

Activates automatically when:
- Making commits
- Creating/managing branches
- Merging or rebasing
- Resolving conflicts
- Any git operations

No announcement - just applies best practices.

## Commit Best Practices

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
| Type | Description |
|------|-------------|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation |
| style | Formatting, no code change |
| refactor | Code change, no new feature or fix |
| perf | Performance improvement |
| test | Adding tests |
| chore | Maintenance |

### Examples

```
feat(auth): add password reset functionality

Implement password reset flow with email verification.
Users can now request a reset link and set new password.

Closes #123
```

```
fix(api): handle null user in profile endpoint

Return 404 instead of crashing when user not found.
```

### Rules
- Subject: imperative mood ("add" not "added")
- Subject: max 50 characters
- Body: wrap at 72 characters
- Body: explain what and why, not how

## Atomic Commits

### One Logical Change Per Commit

```
# Good: Separate commits for separate changes
git commit -m "feat(user): add email validation"
git commit -m "test(user): add email validation tests"
git commit -m "docs(user): document email requirements"

# Bad: Everything in one commit
git commit -m "add email stuff and tests and docs"
```

### When to Commit
- After completing a logical unit
- When tests pass
- Before switching context
- Frequently (easier to revert)

## Branch Management

### Branch Naming

```
feature/short-description
bugfix/issue-description
hotfix/urgent-fix
release/v1.2.0
```

### Branch Workflow

```
main (production)
  └── develop (integration)
       ├── feature/user-auth
       ├── feature/dashboard
       └── bugfix/login-error
```

### Creating Branches

```bash
# From latest main
git checkout main
git pull origin main
git checkout -b feature/new-feature
```

### Keeping Branches Updated

```bash
# Rebase onto latest main (preferred for feature branches)
git fetch origin
git rebase origin/main

# Or merge (if shared branch)
git fetch origin
git merge origin/main
```

## Merge Strategies

### When to Merge

```bash
# For shared branches or when history needs preserving
git checkout main
git merge --no-ff feature/branch
```

### When to Rebase

```bash
# For personal feature branches (cleaner history)
git checkout feature/branch
git rebase main
```

### Merge Commit Messages

```
Merge branch 'feature/user-auth' into main

Adds user authentication with:
- Login/logout
- Session management
- Password hashing
```

## Conflict Resolution

### Strategy

```
1. Understand both changes
2. Decide correct outcome
3. Edit to resolve
4. Test after resolution
5. Commit resolution
```

### Resolution Commands

```bash
# See conflict markers
git status
git diff

# After manual resolution
git add <resolved-files>
git commit -m "resolve: merge conflict in user.ts"

# Or abort if needed
git merge --abort
git rebase --abort
```

## History Management

### Interactive Rebase (for local commits)

```bash
# Squash last 3 commits
git rebase -i HEAD~3

# In editor:
pick abc123 First commit
squash def456 WIP
squash ghi789 Fixup
```

### Amending Last Commit

```bash
# Add to last commit
git add .
git commit --amend --no-edit

# Change last message
git commit --amend -m "new message"
```

### NEVER on Shared Branches

```
FORBIDDEN on main/develop:
- git push --force
- git reset --hard
- git rebase (that rewrites shared history)
```

## Safe Git Commands

### Always Safe

```bash
git status
git log
git diff
git fetch
git branch
git stash
git checkout <branch>
```

### Safe with Caution

```bash
git pull              # Use with clean working directory
git merge             # Ensure target branch is correct
git commit            # Review changes first
git push              # To correct remote/branch
```

### Dangerous (Require Confirmation)

```bash
git reset --hard      # Loses uncommitted changes
git push --force      # Rewrites remote history
git clean -f          # Deletes untracked files
git checkout -- .     # Discards all changes
```

## Git Workflow for Claude

### Before Making Commits

```bash
# Always check status first
git status

# Review what will be committed
git diff --staged

# Check recent history for style
git log --oneline -5
```

### Making Commits

```bash
# Stage specific files (preferred)
git add src/specific-file.ts
git add tests/specific-test.ts

# Avoid staging everything
# git add -A (risky: may include unwanted files)

# Commit with proper message
git commit -m "feat(scope): description"
```

### After Making Commits

```bash
# Verify commit
git log -1

# Check status is clean
git status
```

## Output Format

When performing git operations:

```
## Git Operation

### Action
Created commit: abc123

### Commit Details
Type: feat
Scope: auth
Subject: add login endpoint

### Files Changed
- src/auth/login.ts (added)
- src/routes/auth.ts (modified)
- tests/auth.test.ts (added)

### Status
Working tree clean, ready for push
```

## Anti-Patterns to Avoid

### Commit Messages
```
BAD:
- "fix"
- "WIP"
- "changes"
- "stuff"
- "asdf"

GOOD:
- "fix(api): handle null response from user service"
- "feat(auth): implement JWT refresh token flow"
```

### Commits
```
BAD:
- Mixing unrelated changes
- Committing broken code
- Giant commits
- Committing secrets

GOOD:
- One logical change
- Tests pass
- Small, focused
- .gitignore sensitive files
```

### Branch Management
```
BAD:
- Working directly on main
- Long-lived feature branches
- Not updating from main

GOOD:
- Feature branches
- Regular merges from main
- Clean up merged branches
```

## Pre-Commit Checks

Before every commit:
- [ ] Tests pass
- [ ] Linting clean
- [ ] No secrets/credentials
- [ ] Commit message follows format
- [ ] Changes are related

## Combining with Other Skills

- **code-review + git-master**: Review includes history quality
- **autopilot + git-master**: Proper commits throughout
- **ralph + git-master**: Atomic commits at each step

## Success Criteria

Git operations complete when:
- [ ] Commits are atomic and well-messaged
- [ ] Branch is up to date
- [ ] History is clean
- [ ] No untracked files that should be committed
- [ ] Working tree clean