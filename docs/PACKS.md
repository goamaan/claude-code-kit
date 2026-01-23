# Pack System Documentation

The claudeops pack system lets you extend capabilities by installing components from GitHub repositories. AI automatically analyzes repos to detect agents, skills, hooks, and more.

## Quick Start

Install a pack from any GitHub repository:

```bash
claudeops pack add https://github.com/user/repo
```

The system will:
1. Clone the repository
2. Use AI to analyze and detect components
3. Show you what was found
4. Let you interactively select what to install
5. Install selected components to your claudeops configuration

---

## Pack Commands

### Add a Pack

```bash
claudeops pack add <source>
```

**Source can be:**
- GitHub URL: `https://github.com/user/repo`
- GitHub shorthand: `user/repo`
- Git URL: `git@github.com:user/repo.git`
- Local path: `/path/to/local/repo`

**Examples:**

```bash
# From GitHub URL
claudeops pack add https://github.com/vercel-labs/agent-browser

# Using GitHub shorthand
claudeops pack add vercel-labs/agent-skills

# From local directory
claudeops pack add /path/to/my-custom-agents
```

**What happens during installation:**

1. **Analysis Phase** - AI examines the repository structure
   - Scans for agents, skills, hooks, rules, MCP servers
   - Reads documentation and code to understand components
   - Generates descriptions and metadata

2. **Detection Phase** - Shows what was found
   ```
   Found 5 components:
   ✓ Agent: browser-agent (Automated browser interaction)
   ✓ Skill: screenshot (Capture webpage screenshots)
   ✓ Hook: pre-browser (Setup browser automation)
   ✓ Rule: browser-best-practices
   ✓ MCP: browser-server
   ```

3. **Selection Phase** - Interactive component selection
   - Choose which components to install
   - Review dependencies and requirements
   - Confirm installation

4. **Installation Phase** - Components are copied to claudeops
   - Agents → `~/.claudeops/packs/<name>/agents/`
   - Skills → `~/.claudeops/packs/<name>/skills/`
   - Hooks → `~/.claudeops/packs/<name>/hooks/`
   - Rules → `~/.claudeops/packs/<name>/rules/`
   - MCP servers → Config updated

### List Installed Packs

```bash
claudeops pack list
```

**Example output:**

```
Installed Packs

Name              Source                              Components  Enabled  Installed
agent-browser     vercel-labs/agent-browser                    5  yes      2 days ago
agent-skills      vercel-labs/agent-skills                    12  yes      1 week ago
custom-agents     github.com/myteam/agents                     3  no       3 days ago
```

**Options:**

```bash
# Show all packs including disabled
claudeops pack list --all

# Output as JSON
claudeops pack list --json
```

### Get Pack Info

```bash
claudeops pack info <name>
```

Shows detailed information about an installed pack:

```
Pack: agent-browser
Source: https://github.com/vercel-labs/agent-browser
Enabled: yes
Installed: Jan 20, 2026 3:45 PM

Components

agents: 1 component(s)
  browser-agent              Automated browser interaction and testing

skills: 3 component(s)
  screenshot                 Capture webpage screenshots
  click-element              Click elements on a page
  fill-form                  Fill out web forms

hooks: 1 component(s)
  pre-browser                Setup browser automation environment
```

**Options:**

```bash
# Output as JSON
claudeops pack info agent-browser --json
```

### Remove a Pack

```bash
claudeops pack remove <name>
```

Uninstalls a pack and removes all its components:

```bash
# Remove with confirmation
claudeops pack remove agent-browser

# Remove without confirmation
claudeops pack remove agent-browser --force
```

**Warning:** This removes all components provided by the pack. This cannot be undone.

### Enable/Disable Packs

```bash
# Disable a pack (keeps it installed but inactive)
claudeops pack disable <name>

# Re-enable a disabled pack
claudeops pack enable <name>
```

**Examples:**

```bash
# Temporarily disable browser automation
claudeops pack disable agent-browser

# Re-enable when needed
claudeops pack enable agent-browser
```

### Update Packs

```bash
# Update specific pack
claudeops pack update <name>

# Update all packs
claudeops pack update --all
```

Updates reinstall packs from their original source, pulling latest changes:

```bash
# Update browser pack to latest version
claudeops pack update agent-browser

# Update all installed packs
claudeops pack update --all
```

---

## Supported Pack Types

### 1. Agent Packs

Collections of specialized AI agents for specific domains.

**Example structure:**

```
repo/
  agents/
    browser-agent.md
    test-agent.md
    security-agent.md
```

**Agent file format:**

```markdown
# Browser Agent

Specialized agent for browser automation and web testing.

## Capabilities

- Navigate web pages
- Interact with elements
- Capture screenshots
- Run automated tests

## Model

sonnet

## Domains

- frontend
- testing
- automation
```

### 2. Skill Packs

Reusable workflows and capabilities that agents can use.

**Example structure:**

```
repo/
  skills/
    screenshot.md
    click-element.md
    fill-form.md
```

**Skill file format:**

```markdown
# Screenshot Skill

Capture screenshots of web pages.

## Usage

```javascript
await screenshot({
  url: 'https://example.com',
  selector: '#main-content',
  output: 'screenshot.png'
});
```

## Dependencies

- browser-agent
- playwright
```

### 3. Hook Packs

Lifecycle hooks that run at specific points in Claude Code.

**Example structure:**

```
repo/
  hooks/
    pre-browser.js
    post-test.js
    user-prompt-submit.js
```

**Hook types:**
- `UserPromptSubmit` - Before Claude processes user input
- `PreToolUse` - Before tools like Bash, Edit, Write execute
- `PostToolUse` - After tools complete

### 4. Rule Packs

Best practices, coding standards, and guidelines.

**Example structure:**

```
repo/
  rules/
    browser-best-practices.md
    testing-standards.md
    security-guidelines.md
```

**Rule file format:**

```markdown
# Browser Best Practices

Guidelines for browser automation and testing.

## Rules

1. Always wait for elements to be visible before interacting
2. Use data-testid attributes for reliable selectors
3. Handle loading states and timeouts gracefully
4. Close browser sessions when done

## Examples

Good:
```javascript
await page.waitForSelector('[data-testid="submit"]');
await page.click('[data-testid="submit"]');
```

Bad:
```javascript
await page.click('#submit'); // Fragile selector
```
```

### 5. MCP Server Packs

Model Context Protocol server integrations.

**Example structure:**

```
repo/
  mcp-servers/
    browser-server/
      package.json
      index.js
      config.json
```

**Config format:**

```json
{
  "name": "browser-server",
  "command": "node",
  "args": ["index.js"],
  "env": {
    "BROWSER_HEADLESS": "true"
  }
}
```

### 6. Guardrail Packs

Safety and security protections.

**Example structure:**

```
repo/
  guardrails/
    sql-injection-check.js
    xss-prevention.js
    auth-validation.js
```

---

## Creating Your Own Pack

### Basic Pack Structure

```
my-pack/
  README.md              # Pack description and documentation
  agents/                # Optional: Custom agents
    my-agent.md
  skills/                # Optional: Reusable skills
    my-skill.md
  hooks/                 # Optional: Lifecycle hooks
    my-hook.js
  rules/                 # Optional: Best practices
    my-rules.md
  mcp-servers/           # Optional: MCP servers
    my-server/
```

### Pack Metadata (Optional)

Create a `pack.json` file to provide metadata:

```json
{
  "name": "my-pack",
  "version": "1.0.0",
  "description": "My custom claudeops pack",
  "author": "Your Name",
  "components": {
    "agents": ["agents/my-agent.md"],
    "skills": ["skills/my-skill.md"],
    "hooks": ["hooks/my-hook.js"],
    "rules": ["rules/my-rules.md"]
  },
  "requirements": {
    "npm": ["playwright", "axios"],
    "env": ["BROWSER_API_KEY"]
  }
}
```

If `pack.json` is not provided, AI will analyze the repository and generate metadata automatically.

### Publishing Your Pack

1. **Create GitHub repository** with your pack components
2. **Add documentation** in README.md
3. **Test locally** using `claudeops pack add /path/to/local/pack`
4. **Push to GitHub**
5. **Share the URL** so others can install with `claudeops pack add <url>`

**Example README.md:**

```markdown
# My Custom Pack

Description of what your pack provides.

## Installation

```bash
claudeops pack add https://github.com/yourusername/my-pack
```

## Components

- **my-agent** - Agent for X functionality
- **my-skill** - Skill for Y capability
- **my-hook** - Hook for Z automation

## Requirements

- Node.js >= 18
- npm packages: playwright, axios
- Environment: BROWSER_API_KEY

## Usage

Examples of how to use your pack...
```

---

## Pack Examples

### Example 1: Browser Automation Pack

```bash
claudeops pack add vercel-labs/agent-browser
```

**Provides:**
- `browser-agent` - Agent for web automation
- `screenshot` skill - Capture screenshots
- `click-element` skill - Interact with pages
- `fill-form` skill - Form automation
- `pre-browser` hook - Setup automation

**Use cases:**
- Automated testing
- Web scraping
- Screenshot generation
- Form interaction

### Example 2: React Development Pack

```bash
claudeops pack add vercel-labs/agent-skills
```

**Provides:**
- React component generation skills
- TypeScript helpers
- Testing utilities
- Component best practices

**Use cases:**
- Component creation
- Prop type generation
- Test scaffolding
- Code generation

### Example 3: Security Pack

```bash
claudeops pack add myteam/security-standards
```

**Provides:**
- `security-agent` - Security auditing
- SQL injection detection
- XSS prevention rules
- Authentication guidelines
- Pre-commit security hooks

**Use cases:**
- Security audits
- Vulnerability scanning
- Best practice enforcement
- Compliance checks

### Example 4: Company Standards Pack

```bash
claudeops pack add mycompany/coding-standards
```

**Provides:**
- Code style rules
- Architecture guidelines
- Testing requirements
- Documentation standards
- Pre-commit linting hooks

**Use cases:**
- Enforce company standards
- Onboard new developers
- Maintain consistency
- Automated code review

---

## Advanced Usage

### Combining Multiple Packs

Install multiple packs to combine capabilities:

```bash
# Base development setup
claudeops pack add vercel-labs/agent-skills

# Add browser automation
claudeops pack add vercel-labs/agent-browser

# Add company standards
claudeops pack add mycompany/standards

# Add security
claudeops pack add security/best-practices
```

All packs work together - agents can use skills from any installed pack.

### Pack Dependencies

Packs can depend on other packs. When installing a pack with dependencies:

```bash
claudeops pack add mypack/advanced-testing
```

If it depends on `agent-browser`, you'll be prompted:

```
This pack requires:
  - agent-browser (not installed)

Install dependencies? (y/n)
```

### Customizing Installed Components

After installing a pack, you can customize components:

```bash
# Components are installed to:
~/.claudeops/packs/<pack-name>/

# Edit agent definitions
~/.claudeops/packs/<pack-name>/agents/

# Edit skills
~/.claudeops/packs/<pack-name>/skills/

# Edit hooks
~/.claudeops/packs/<pack-name>/hooks/
```

**Note:** Customizations will be overwritten if you run `claudeops pack update`. Consider creating a separate custom pack for your modifications.

### Pack Namespacing

Components from different packs are namespaced:

```
# Agent from pack "browser"
claudeops:browser:browser-agent

# Skill from pack "testing"
testing:screenshot

# Default claudeops agents
claudeops:executor
claudeops:architect
```

### Troubleshooting

**Pack installation fails:**

```bash
# Check pack source is accessible
git clone <source>

# Try local installation
claudeops pack add /path/to/cloned/repo

# Check logs
claudeops pack add <source> --verbose
```

**Components not detected:**

```bash
# Ensure proper directory structure
repo/
  agents/    # Must contain .md files
  skills/    # Must contain .md files
  hooks/     # Must contain .js files

# Check pack info after install
claudeops pack info <name>
```

**Pack not working after install:**

```bash
# Ensure pack is enabled
claudeops pack enable <name>

# Sync configuration
claudeops sync

# Restart Claude Code
```

---

## Pack Registry (Coming Soon)

A central registry of community packs is planned for future releases:

```bash
# Search for packs
claudeops pack search browser

# Install by name
claudeops pack install browser-automation

# Browse categories
claudeops pack browse --category testing
```

Until then, install packs directly from GitHub URLs.

---

## Best Practices

### For Pack Users

1. **Review before installing** - Use `pack info` to see what will be installed
2. **Enable selectively** - Disable packs you're not actively using
3. **Keep updated** - Run `pack update --all` regularly
4. **Check dependencies** - Ensure required tools are installed

### For Pack Creators

1. **Clear documentation** - Include README with examples
2. **Descriptive names** - Use clear, searchable names
3. **Minimal dependencies** - Reduce external requirements
4. **Version carefully** - Use semantic versioning
5. **Test locally** - Install and test before publishing
6. **Include metadata** - Provide pack.json for better detection

---

## Getting Help

- **Issues:** https://github.com/goamaan/claudeops/issues
- **Discussions:** https://github.com/goamaan/claudeops/discussions
- **Examples:** See `examples/packs/` in the claudeops repo

---

## Next Steps

1. Browse community packs on GitHub
2. Install packs that match your workflow
3. Create your own pack for team use
4. Share your packs with the community

Happy packing!
