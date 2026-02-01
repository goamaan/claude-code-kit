# claudeops

Claude Code plugin: multi-agent orchestration, codebase scanning, quality hooks, and workflow skills.

## Structure

- `.claude-plugin/plugin.json` - Plugin manifest
- `skills/` - SKILL.md directories (invoked as /claudeops:name)
- `agents/` - Subagent definitions (.md with YAML frontmatter)
- `hooks/` - Event hooks (.mjs scripts + hooks.json registry)
- `scripts/` - Standalone scripts (scanner)

## Development

No build step. Edit files directly. Test with: `claude --plugin-dir .`

- Skills: `skills/<name>/SKILL.md` - YAML frontmatter (kebab-case fields) + markdown
- Agents: `agents/<name>.md` - YAML frontmatter + markdown system prompt
- Hooks: `.mjs` files in `hooks/`, registered in `hooks/hooks.json`
- Hook protocol: read JSON from stdin, output JSON to stdout, exit 0 (continue) or exit 2 (block)
- Scanner: `scripts/scan.mjs` - pure ESM JavaScript, no dependencies, outputs JSON to stdout
