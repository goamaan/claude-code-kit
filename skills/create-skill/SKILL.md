---
description: >
  Generate a new claudeops skill from a template. Creates the skill directory structure
  with SKILL.md frontmatter and execution steps.
user-invocable: true
disable-model-invocation: true
allowed-tools: [Read, Write, Glob, AskUserQuestion]
---

# Create Skill

Generate a new claudeops skill from a template. Scaffolds the directory structure, SKILL.md with proper frontmatter, and execution steps.

## When to Activate

- User says "create skill", "new skill", "add a skill", "generate skill"
- User invokes `/claudeops:create-skill`

## Execution Steps

### Step 1: Gather Information

Use AskUserQuestion to collect:

1. **Skill name** (kebab-case, e.g., "deploy", "migrate", "benchmark")
2. **Description** — What does this skill do? What trigger phrases should activate it?
3. **Auto-invoke or user-only?**
   - Auto-invoke: Claude activates based on description matching (most skills)
   - User-only (`disable-model-invocation: true`): Only via `/claudeops:<name>` command
4. **Allowed tools** — Which tools does this skill need? (Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion)

### Step 2: Read Existing Skills for Reference

```
Glob: skills/*/SKILL.md
```

Read 1-2 existing skills to match the project's conventions and style.

### Step 3: Generate SKILL.md

Create `skills/<name>/SKILL.md` with this template:

````markdown
---
description: >
  [User-provided description with trigger phrases]
user-invocable: true
{if user-only:}disable-model-invocation: true
allowed-tools: [{selected tools}]
---

# [Skill Name]

[One-line summary of what this skill does.]

## When to Activate

- [Trigger phrase 1]
- [Trigger phrase 2]
- [Trigger phrase 3]

## Execution Steps

### Step 1: [First Step Name]

[Description of what to do]

```
[Example command or agent delegation]
```

### Step 2: [Second Step Name]

[Description of what to do]

### Step 3: [Third Step Name]

[Description of what to do]

## Agent Assignment

| Phase | Agent | Purpose |
|-------|-------|---------|
| [phase] | [agent] | [what they do] |

## Output Format

```
## [Skill Name] Report

### [Section 1]
[template]

### [Section 2]
[template]
```

## Anti-Patterns

1. **[Anti-pattern 1]** — [why to avoid]
2. **[Anti-pattern 2]** — [why to avoid]
````

### Step 4: Verify Structure

Confirm the file was created:

```
Glob: skills/<name>/SKILL.md
Read: skills/<name>/SKILL.md
```

### Step 5: Report

```
Skill created successfully.

File: skills/<name>/SKILL.md
Type: [auto-invoke / user-only]
Tools: [list of allowed tools]

Test it with: /claudeops:<name>

To customize further, edit skills/<name>/SKILL.md directly.
```

## Template Guidelines

- Keep descriptions under 3 lines — Claude reads them on every skill match
- Include 3-5 trigger phrases in the description for reliable auto-invocation
- Use the 5-element worker prompt template when delegating to agents
- Include at least 3 anti-patterns to prevent common mistakes
- Keep the total SKILL.md under 150 lines — concise skills are better skills

## Anti-Patterns

1. **Over-engineering the template** — Start simple, iterate later
2. **Missing trigger phrases** — Without them, auto-invoke won't fire
3. **Too many allowed tools** — Only include tools the skill actually needs
4. **No anti-patterns section** — Learn from others' mistakes
5. **Duplicating existing skills** — Check existing skills first
