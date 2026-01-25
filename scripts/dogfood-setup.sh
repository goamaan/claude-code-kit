#!/bin/bash
# Dogfood Setup Script
# Links claudeops repo assets to ~/.claude/ and ~/.claudeops/ for development testing

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"
CLAUDEOPS_DIR="$HOME/.claudeops"

echo "Setting up dogfood environment..."
echo "Repo: $REPO_DIR"
echo "Claude Code: $CLAUDE_DIR"
echo "ClaudeOps: $CLAUDEOPS_DIR"
echo ""

# Ensure directories exist
mkdir -p "$CLAUDE_DIR/skills"
mkdir -p "$CLAUDE_DIR/hooks"
mkdir -p "$CLAUDE_DIR/agents"
mkdir -p "$CLAUDEOPS_DIR/skills"
mkdir -p "$CLAUDEOPS_DIR/hooks"

# Backup existing files (skip symlinks - they'll be replaced)
backup_if_needed() {
    local target="$1"
    # Only backup real files, not symlinks
    if [ -f "$target" ] && [ ! -L "$target" ]; then
        echo "Backing up $target to ${target}.backup"
        mv "$target" "${target}.backup"
    fi
}

# Link skills from repo to both ~/.claude/skills/ and ~/.claudeops/skills/
echo "Linking skills..."
for skill_dir in "$REPO_DIR/skills"/*; do
    if [ -d "$skill_dir" ]; then
        skill_name=$(basename "$skill_dir")
        skill_file="$skill_dir/SKILL.md"

        if [ -f "$skill_file" ]; then
            # Link to Claude Code directory
            target="$CLAUDE_DIR/skills/${skill_name}.md"
            backup_if_needed "$target"
            [ -L "$target" ] && rm "$target"
            ln -sf "$skill_file" "$target"

            # Link to ClaudeOps directory (for cops CLI)
            target_cops="$CLAUDEOPS_DIR/skills/${skill_name}.md"
            backup_if_needed "$target_cops"
            [ -L "$target_cops" ] && rm "$target_cops"
            ln -sf "$skill_file" "$target_cops"

            echo "  + $skill_name"
        fi
    fi
done

# Link hooks from repo to both ~/.claude/hooks/ and ~/.claudeops/hooks/
echo ""
echo "Linking hooks..."
for hook_file in "$REPO_DIR/hooks"/*.mjs; do
    if [ -f "$hook_file" ]; then
        hook_name=$(basename "$hook_file")

        # Link to Claude Code directory (no prefix - consistent naming)
        target="$CLAUDE_DIR/hooks/${hook_name}"
        backup_if_needed "$target"
        [ -L "$target" ] && rm "$target"
        ln -sf "$hook_file" "$target"

        # Link to ClaudeOps directory (for cops CLI)
        target_cops="$CLAUDEOPS_DIR/hooks/${hook_name}"
        backup_if_needed "$target_cops"
        [ -L "$target_cops" ] && rm "$target_cops"
        ln -sf "$hook_file" "$target_cops"

        echo "  + $hook_name"
    fi
done

# Link agents from repo to ~/.claude/agents/ (if exists)
if [ -d "$REPO_DIR/agents" ]; then
    echo ""
    echo "Linking agents..."
    for agent_dir in "$REPO_DIR/agents"/*; do
        if [ -d "$agent_dir" ]; then
            agent_name=$(basename "$agent_dir")
            target="$CLAUDE_DIR/agents/$agent_name"
            
            backup_if_needed "$target"
            [ -L "$target" ] && rm "$target"
            ln -sf "$agent_dir" "$target"
            echo "  + $agent_name"
        fi
    done
fi

echo ""
echo "Dogfood setup complete!"
echo ""
echo "Development workflow:"
echo "  1. Run 'npm run dev' in one terminal (watches for changes)"
echo "  2. Skills/hooks are symlinked - changes are immediate"
echo "  3. CLI is linked via 'npm link' - rebuild applies automatically"
