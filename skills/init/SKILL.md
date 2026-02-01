---
name: init
description: Interactive project setup - scan codebase and generate .claude/ configuration
user-invocable: true
disable-model-invocation: true
allowed-tools: [Bash, Read, Write, Glob, Grep, Edit, AskUserQuestion]
---

# Project Initialization Skill

Initialize a project with claudeops by scanning the codebase and generating `.claude/` configuration files.

## Execution Steps

### 1. Run the Scanner

Execute the deterministic scanner to detect project characteristics:

```bash
node <plugin>/scripts/scan.mjs "$PWD"
```

**Note**: `<plugin>` refers to the claudeops plugin directory. Claude Code automatically resolves this to the installed plugin location.

The scanner outputs JSON containing:
- Detected languages and frameworks
- Build tools and package managers
- Test frameworks
- Project structure
- Configuration files
- Common commands

### 2. Parse Scanner Output

Extract the following from the JSON:
- `projectName`: from package.json or directory name
- `languages`: detected programming languages
- `frameworks`: web frameworks, test frameworks, build tools
- `buildCommands`: detected build/test/dev commands
- `structure`: key directories and their purposes
- `configFiles`: important configuration files
- `packageManager`: npm, yarn, pnpm, bun, etc.

### 3. Clarify with User

Use AskUserQuestion to resolve ambiguities and gather preferences:

- If multiple build commands detected: "Which is your primary build command?"
- If multiple test runners: "Which test framework should I prioritize?"
- "Are there any code conventions or patterns I should enforce?"
- "Any critical files or directories I should highlight?"
- "Should I add any custom build permissions to settings.json?"

**Anti-pattern**: Do NOT ask questions the scanner already answered (e.g., "what package manager do you use?" when package.json exists).

### 4. Check for Existing Configuration

Before generating files, check if `.claude/CLAUDE.md` exists:

```bash
ls .claude/CLAUDE.md 2>/dev/null
```

If it exists:
- Read the current file
- Ask: "A .claude/CLAUDE.md already exists. Should I (o)verwrite, (m)erge, or (c)ancel?"
- If merge: preserve user-added sections, update detected content

### 5. Generate .claude/CLAUDE.md

Create a concise, scannable reference document. Claude reads this every session, so brevity is critical.

**Template**:

```markdown
# {Project Name}

{One-line description from package.json or user input}

## Build & Test

```bash
{primary-build-command}    # Build description
{primary-test-command}     # Test description
{dev-command}              # Dev server (if applicable)
```

## Tech Stack

- **Language**: {detected language + version}
- **Framework**: {primary framework}
- **Build Tool**: {build tool}
- **Test Framework**: {test framework}
- **Package Manager**: {npm/yarn/pnpm/bun}

## Architecture

```
{key directories from scanner with brief descriptions}
```

## Code Style

- {convention 1}
- {convention 2}
- {detected linter config, e.g., "ESLint + Prettier"}

## Important Files

- `{file}`: {purpose}
- `{file}`: {purpose}
```

**Guidelines**:
- Keep total length under 100 lines
- Use bullet points, not paragraphs
- Highlight only critical information
- Skip empty sections
- Focus on what Claude needs to know to make code changes

### 6. Generate/Merge .claude/settings.json

Create or update settings.json with appropriate permissions for detected tools.

**Example structure**:

```json
{
  "allowedCommands": {
    "{packageManager} install": "allow",
    "{packageManager} run build": "allow",
    "{packageManager} run test": "allow",
    "{buildTool}": "allow"
  },
  "allowedPaths": {
    "read": ["**/*"],
    "write": [
      "src/**/*",
      "tests/**/*",
      "{other-source-dirs}/**/*"
    ]
  }
}
```

If settings.json exists, merge the allowedCommands and allowedPaths arrays intelligently:
- Read existing file
- Add new detected commands that aren't already present
- Preserve user-added custom commands
- Sort alphabetically for consistency

### 7. Verify and Report

After generation:
- Confirm files were written
- Show the user where files were created
- List the key detected features
- Suggest next steps (e.g., "Review and customize `.claude/CLAUDE.md`")

## Anti-Patterns

- Don't ask the user to confirm information the scanner already detected
- Don't generate verbose documentation - this is a reference, not a tutorial
- Don't add speculative sections (e.g., "Deployment" if no deploy config exists)
- Don't overwrite user content without asking
- Don't add commands to allowedCommands that weren't actually detected

## Example Output

```
Project initialized successfully.

Created:
- .claude/CLAUDE.md (87 lines)
- .claude/settings.json (merged with existing)

Detected:
- TypeScript + Node.js project
- Bun package manager
- Vitest test framework
- tsdown bundler

Next steps:
1. Review .claude/CLAUDE.md and customize as needed
2. Run `/claudeops:scan` for AI-enhanced analysis
```
