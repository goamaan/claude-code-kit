# MCP Server Management Guide

## Overview

**MCP** (Model Context Protocol) enables Claude Code to interact with external tools and services through standardized servers. This guide covers configuring, managing, and optimizing MCP servers in your claude-code-kit environment.

### What is MCP?

Model Context Protocol is a standard that allows Claude to:
- Access file systems and git repositories
- Query databases and APIs
- Execute specialized tools
- Integrate with external services
- Extend Claude's capabilities beyond its base knowledge

## Quick Start

### List All MCP Servers

```bash
ck mcp list
```

Shows all configured MCP servers with their status and commands.

### Get Server Information

```bash
ck mcp info <server-name>
```

Display detailed information about a specific server, including command, arguments, and environment variables.

### View Context Budget

```bash
ck mcp budget
```

See estimated context token usage across all enabled servers.

## Configuration

### Global Configuration

MCP servers are stored in Claude's settings file at `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allow"],
      "env": {}
    },
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git"],
      "env": {}
    }
  }
}
```

### Profile Configuration

Enable or disable servers per profile in `~/.claude-code-kit/profiles/{name}.toml`:

```toml
[mcp]
enabled = ["filesystem", "git"]
disabled = ["postgres"]
```

### Project Configuration

Override MCP settings for a specific project in `.claude-code-kit.yaml`:

```yaml
mcp:
  enabled:
    - filesystem
    - git
    - fetch
  disabled:
    - postgres
```

### Configuration Priority

MCP configuration is merged across layers (highest to lowest priority):

1. **Project** (`.claude-code-kit.yaml`) - Most specific
2. **Profile** (`~/.claude-code-kit/profiles/{name}.toml`)
3. **Global** (`~/.claude/claude_desktop_config.json`) - Least specific

Settings from higher priority layers override lower ones.

## Adding MCP Servers

### Add via CLI

```bash
ck mcp add <name> --command <cmd> [--args arg1 arg2 ...]
```

Example - Add SQLite server:

```bash
ck mcp add sqlite \
  --command npx \
  --args -y @modelcontextprotocol/server-sqlite /path/to/db.sqlite
```

### Add with Environment Variables

Edit `~/.claude/claude_desktop_config.json` directly:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost/dbname"
      }
    }
  }
}
```

## Common MCP Servers

### File System Access

Access files and directories with safety limits.

```toml
[mcp.servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allow"]
enabled = true
```

**Capabilities**: Read files, write files, list directories, create/delete files

**Context Cost**: ~1000 tokens

---

### Git Operations

Execute git commands and query repository history.

```toml
[mcp.servers.git]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-git"]
enabled = true
```

**Capabilities**: Log history, diff branches, status, commit info, file history

**Context Cost**: ~2000 tokens

---

### HTTP Fetch

Make HTTP requests to external APIs.

```toml
[mcp.servers.fetch]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-fetch"]
enabled = true
```

**Capabilities**: GET/POST requests, custom headers, JSON handling

**Context Cost**: ~600 tokens

---

### PostgreSQL Database

Query and manage PostgreSQL databases.

```toml
[mcp.servers.postgres]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-postgres"]
env = { DATABASE_URL = "postgresql://user:pass@localhost/dbname" }
enabled = true
```

**Capabilities**: Execute queries, inspect schema, manage connections

**Context Cost**: ~1500 tokens

**Requirements**:
- PostgreSQL installed
- DATABASE_URL environment variable set
- Database credentials configured

---

### SQLite Database

Query SQLite databases with full schema access.

```toml
[mcp.servers.sqlite]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-sqlite", "/path/to/db.sqlite"]
enabled = true
```

**Capabilities**: Execute queries, inspect schema, analyze tables

**Context Cost**: ~1200 tokens

---

### Browser Automation (Puppeteer)

Control a headless browser and capture screenshots.

```toml
[mcp.servers.puppeteer]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-puppeteer"]
enabled = true
timeout = 60000
```

**Capabilities**: Navigate URLs, take screenshots, interact with pages

**Context Cost**: ~1500 tokens

---

### Web Search (Brave Search)

Perform web searches using the Brave Search API.

```toml
[mcp.servers.brave-search]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-brave-search"]
env = { BRAVE_SEARCH_API_KEY = "your-api-key" }
enabled = true
```

**Capabilities**: Web search, news search, content retrieval

**Context Cost**: ~800 tokens

---

### GitHub Integration

Interact with GitHub repositories and issues.

```toml
[mcp.servers.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env = { GITHUB_TOKEN = "your-github-token" }
enabled = true
```

**Capabilities**: Repository access, issue management, pull requests

**Context Cost**: ~2000 tokens

---

## Server Status

Each MCP server has a lifecycle state:

| Status | Meaning |
|--------|---------|
| **running** | Server is active and available |
| **stopped** | Server configured but not running |
| **starting** | Server is initializing |
| **error** | Server failed to start or encountered an error |
| **disabled** | Server explicitly disabled in config |

Check status with:

```bash
ck mcp list
```

## Context Budget and Performance

### Understanding Context Cost

Each enabled MCP server consumes context tokens. This affects:
- Claude's available context window
- Response latency
- Token usage tracking

### Viewing Budget

```bash
ck mcp budget
```

Shows:
- Number of active servers
- Estimated token consumption
- Percentage of total context window
- Recommendations for optimization

### Estimated Token Costs

Typical costs per server (including overhead):

| Server | Tokens |
|--------|--------|
| memory | ~400 |
| time | ~200 |
| fetch | ~600 |
| brave-search | ~800 |
| google-maps | ~1200 |
| sqlite | ~1200 |
| filesystem | ~1000 |
| puppeteer | ~1500 |
| postgres | ~1500 |
| slack | ~1800 |
| github | ~2000 |
| context7 | ~3000 |

### Budget Management

**Optimize context usage:**

1. **Disable unused servers** - Only enable servers you actively use
2. **Profile-specific servers** - Use profiles to enable servers only when needed
3. **Monitor total cost** - Keep total under 15-20% of context window
4. **Review regularly** - Check budget when adding new servers

**Example**: If using Opus (200k context), aim for 30-40k tokens max for MCP.

---

### Example: Minimal Setup

For basic development:

```toml
[mcp.servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
enabled = true

[mcp.servers.git]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-git"]
enabled = true
```

**Total Cost**: ~3000 tokens (1.5% of 200k context)

---

### Example: Full-Stack Development

For web development with databases:

```toml
[mcp.servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
enabled = true

[mcp.servers.git]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-git"]
enabled = true

[mcp.servers.fetch]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-fetch"]
enabled = true

[mcp.servers.postgres]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-postgres"]
env = { DATABASE_URL = "postgresql://..." }
enabled = true
```

**Total Cost**: ~6100 tokens (3% of 200k context)

---

### Example: Data Science Setup

For data analysis and databases:

```toml
[mcp.servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
enabled = true

[mcp.servers.git]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-git"]
enabled = true

[mcp.servers.postgres]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-postgres"]
env = { DATABASE_URL = "postgresql://..." }
enabled = true

[mcp.servers.fetch]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-fetch"]
enabled = true
```

**Total Cost**: ~6100 tokens (3% of 200k context)

## Setup Integration

claude-code-kit includes setup templates that recommend relevant MCP servers:

### Fullstack Setup

```toml
[mcp]
recommended = ["filesystem", "git", "fetch"]
```

Recommended for React + Node.js development.

### Data Science Setup

```toml
[mcp]
recommended = ["filesystem", "git", "postgres", "fetch"]
```

Recommended for data analysis and ML projects.

### Backend Setup

```toml
[mcp]
recommended = ["filesystem", "git", "fetch"]
```

Recommended for API and backend development.

### DevOps Setup

```toml
[mcp]
recommended = ["filesystem", "git", "fetch"]
```

Recommended for infrastructure and deployment work.

### Enterprise Setup

```toml
[mcp]
recommended = ["filesystem", "git", "fetch", "postgres"]
```

Recommended for large-scale projects with databases.

## Troubleshooting

### Server Not Starting

If a server fails to start:

1. **Check configuration**
   ```bash
   ck mcp info <server-name>
   ```
   Verify command and arguments are correct.

2. **Test command directly**
   ```bash
   npx -y @modelcontextprotocol/server-filesystem /path
   ```
   Run the command manually to catch errors.

3. **Check environment variables**
   Verify all required environment variables are set and accessible.

4. **Review server logs**
   Many MCP servers output diagnostic information to stderr.

### Environment Variable Issues

For servers requiring credentials:

1. **Verify variables are set**
   ```bash
   echo $DATABASE_URL
   echo $API_KEY
   ```

2. **Check file permissions**
   If reading from files, ensure Claude Code process can access them.

3. **Test connectivity**
   For database servers, verify connection string is correct:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

### Context Budget Exceeded

If using too many servers:

1. **Review active servers**
   ```bash
   ck mcp list
   ```

2. **Disable unnecessary servers**
   Update your profile or project config to disable unused servers.

3. **Use profiles strategically**
   Create separate profiles for different projects to minimize context usage.

### Server Timeout Issues

For servers that take longer to initialize:

1. **Increase timeout in config**
   ```toml
   [mcp.servers.puppeteer]
   timeout = 60000  # 60 seconds
   ```

2. **Check resource constraints**
   Some servers (like Puppeteer) require significant resources. Verify your system has sufficient memory and CPU.

3. **Reduce concurrent servers**
   Running many servers simultaneously can cause initialization delays.

## Advanced Configuration

### Server with Custom Working Directory

```toml
[mcp.servers.myserver]
command = "npx"
args = ["-y", "my-mcp-server"]
cwd = "/path/to/working/directory"
enabled = true
```

### Multiple Environment Variables

```toml
[mcp.servers.complex]
command = "npx"
args = ["-y", "complex-mcp"]
env = {
  API_KEY = "your-key",
  API_URL = "https://api.example.com",
  DEBUG = "true"
}
enabled = true
```

### Server Timeout Configuration

```toml
[mcp.servers.slowserver]
command = "npx"
args = ["-y", "slow-mcp-server"]
timeout = 30000  # 30 seconds
enabled = true
```

Default timeout is 10 seconds. Increase for servers that need more startup time.

## Security Best Practices

### Protect Sensitive Credentials

1. **Never commit credentials** to version control
2. **Use environment variables** for API keys and passwords
3. **Limit file access** with filesystem server restricted paths
4. **Disable unused servers** to reduce attack surface

### File System Server Security

When enabling filesystem access:

```toml
[mcp.servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
enabled = true
```

**Always specify an allowed root directory** - this restricts Claude to only access files under that path.

### API Key Management

For servers requiring API keys:

1. Store keys in environment variables (not config files)
2. Use `.env` files (add to `.gitignore`)
3. Rotate keys regularly
4. Limit key permissions to required scopes

### Database Connection Security

For database servers:

1. **Use connection strings with authentication**
   ```
   postgresql://user:password@localhost/database
   ```

2. **Never use root/admin credentials** - create limited accounts
3. **Restrict network access** - database should only accept local connections
4. **Encrypt sensitive connections** - use SSL/TLS for remote databases

## Workflow Examples

### Development with Multiple MCP Servers

Create a development profile with all needed servers:

```toml
# ~/.claude-code-kit/profiles/dev.toml

name = "dev"
description = "Development profile with full access"

[mcp]
enabled = ["filesystem", "git", "fetch", "sqlite"]
disabled = []
```

Use it with:

```bash
ck profile switch dev
ck sync
```

### Production-Safe Profile

Create a minimal profile for production work:

```toml
# ~/.claude-code-kit/profiles/prod.toml

name = "prod"
description = "Production profile with limited access"

[mcp]
enabled = ["filesystem", "git"]
disabled = ["fetch", "sqlite"]
```

Switch with:

```bash
ck profile switch prod
ck sync
```

### Project-Specific Configuration

Create a `.claude-code-kit.yaml` in your project:

```yaml
mcp:
  enabled:
    - filesystem
    - git
    - postgres  # Only enable for this project
  disabled:
    - fetch     # Don't allow external API calls
```

This configuration applies only when working in that project directory.

## Integration with Claude Code Commands

### Sync Configuration

After modifying MCP configuration, sync to apply changes:

```bash
ck sync
```

This:
- Reads configuration from all layers
- Generates Claude Desktop settings
- Validates server configurations
- Updates `~/.claude/claude_desktop_config.json`

### Check Configuration

Verify your merged configuration:

```bash
ck config get
```

Shows the final merged configuration after applying all layers.

## FAQ

**Q: How many MCP servers can I enable?**

A: Technically unlimited, but practically limited by context window. Most developers use 3-8 servers. Beyond 10 servers, context consumption becomes significant.

---

**Q: Do I need to restart Claude Code after changing MCP config?**

A: Yes, MCP servers are initialized when Claude Code starts. After modifying `~/.claude/claude_desktop_config.json`, restart the application.

---

**Q: Can I enable servers only for specific projects?**

A: Yes. Use project-level `.claude-code-kit.yaml` configuration or create profiles and switch between them.

---

**Q: What if a server crashes during use?**

A: Claude Code will catch the error and you'll see an error message. Fix the server configuration and restart Claude Code.

---

**Q: How do I measure actual token usage?**

A: Use `ck mcp budget` for estimates. For precise tracking, enable cost tracking in your configuration and review logs.

---

**Q: Can multiple projects share the same MCP server?**

A: Yes. Servers defined in `~/.claude/claude_desktop_config.json` are global and available to all projects. Use project config to selectively enable/disable them.

---

**Q: What's the performance impact of MCP servers?**

A: Minimal at runtime. The main impact is context window usage (affects token cost) and initialization time (a few seconds on startup).

---

## Related Documentation

- [Configuration Guide](./configuration.md) - Full configuration system documentation
- [Profile Management](./profiles.md) - Using and creating profiles
- [Setup Templates](./setups.md) - Built-in project setups

