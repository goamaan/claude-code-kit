#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import pc from "picocolors";
import { VERSION, NAME } from "./index.js";

const main = defineCommand({
  meta: {
    name: NAME,
    version: VERSION,
    description: "Batteries-included Claude Code enhancement toolkit",
  },
  subCommands: {
    // Profile management
    profile: () => import("./commands/profile.js").then((m) => m.default),

    // Setup management
    setup: () => import("./commands/setup.js").then((m) => m.default),

    // Add-on management
    addon: () => import("./commands/addon.js").then((m) => m.default),

    // Skill management
    skill: () => import("./commands/skill.js").then((m) => m.default),

    // Intent classification
    classify: () => import("./commands/classify.js").then((m) => m.default),

    // Configuration management
    config: () => import("./commands/config.js").then((m) => m.default),

    // MCP server management
    mcp: () => import("./commands/mcp.js").then((m) => m.default),

    // Cost tracking
    cost: () => import("./commands/cost.js").then((m) => m.default),

    // Swarm orchestration
    swarm: () => import("./commands/swarm.js").then((m) => m.default),

    // Hook management
    hook: () => import("./commands/hook.js").then((m) => m.default),

    // Sync configuration to Claude Code
    sync: () => import("./commands/sync.js").then((m) => m.default),

    // Diagnostic tool
    doctor: () => import("./commands/doctor.js").then((m) => m.default),

    // Installation wizard
    install: () => import("./commands/install.js").then((m) => m.default),

    // Zero-config swarm setup
    init: () => import("./commands/init.js").then((m) => m.default),

    // Upgrade claudeops
    upgrade: () => import("./commands/upgrade.js").then((m) => m.default),
  },
  run({ args: _args }) {
    // Default behavior when no subcommand is provided
    // Header
    console.log(pc.bold(pc.cyan(NAME)) + pc.dim(` v${VERSION}`));
    console.log("Batteries-included Claude Code enhancement toolkit");
    console.log("");

    // Usage
    console.log(pc.bold("Usage:"));
    console.log(`  ${pc.cyan("cops")} ${pc.yellow("<command>")} ${pc.dim("[options]")}`);

    // Aliases
    console.log(pc.bold("\nAliases:"));
    console.log(`  ${pc.cyan("claudeops")}  ${pc.dim("Full name")}`);
    console.log(`  ${pc.cyan("cops")}       ${pc.dim("Recommended")}`);
    console.log(`  ${pc.cyan("co")}         ${pc.dim("Shorthand")}`);

    // Global Options
    console.log(pc.bold("\nGlobal Options:"));
    console.log(`  ${pc.yellow("-h, --help")}     Show help`);
    console.log(`  ${pc.yellow("-V, --version")}  Show version`);

    // Getting Started
    console.log(pc.bold("\nGetting Started:"));
    console.log(`  ${pc.cyan("init")}           ${pc.dim("Zero-config swarm setup (recommended)")}`);
    console.log(`  ${pc.cyan("install")}        ${pc.dim("Interactive installation wizard")}`);
    console.log(`  ${pc.cyan("config init")}    ${pc.dim("Initialize configuration")}`);
    console.log(`  ${pc.cyan("doctor")}         ${pc.dim("Diagnose and fix issues")}`);
    console.log(`  ${pc.cyan("sync")}           ${pc.dim("Sync to Claude Code")}`);

    // Core Commands
    console.log(pc.bold("\nCore Commands:"));
    console.log(`  ${pc.cyan("profile")}        ${pc.dim("Manage profiles (list, use, create, delete)")}`);
    console.log(`  ${pc.cyan("config")}         ${pc.dim("Manage configuration (init, edit, show, validate)")}`);
    console.log(`  ${pc.cyan("sync")}           ${pc.dim("Sync configuration to Claude Code")}`);

    // Extensions
    console.log(pc.bold("\nExtensions:"));
    console.log(`  ${pc.cyan("setup")}          ${pc.dim("Manage setups (list, info, use, create)")}`);
    console.log(`  ${pc.cyan("addon")}          ${pc.dim("Manage addons (search, install, update, remove)")}`);
    console.log(`  ${pc.cyan("skill")}          ${pc.dim("Manage skills (list, info, install, sync)")}`);
    console.log(`  ${pc.cyan("mcp")}            ${pc.dim("Manage MCP servers (list, add, enable, disable)")}`);
    console.log(`  ${pc.cyan("hook")}           ${pc.dim("Manage hooks (list, debug, test)")}`);

    // AI Features
    console.log(pc.bold("\nAI Features:"));
    console.log(`  ${pc.cyan("classify")}       ${pc.dim("Test intent classification and routing")}`);

    // Utilities
    console.log(pc.bold("\nUtilities:"));
    console.log(`  ${pc.cyan("cost")}           ${pc.dim("Cost tracking (today, week, budget, pricing)")}`);
    console.log(`  ${pc.cyan("swarm")}          ${pc.dim("Swarm orchestration (status, tasks, init, stop)")}`);
    console.log(`  ${pc.cyan("doctor")}         ${pc.dim("Diagnose configuration issues")}`);
    console.log(`  ${pc.cyan("upgrade")}        ${pc.dim("Check for and install updates")}`);

    // Examples
    console.log(pc.bold("\nExamples:"));
    console.log(pc.dim("  # Create initial configuration"));
    console.log(`  ${pc.cyan("cops config init")}`);
    console.log("");
    console.log(pc.dim("  # Create a work profile"));
    console.log(`  ${pc.cyan("cops profile create work")}`);
    console.log("");
    console.log(pc.dim("  # Search for React addons"));
    console.log(`  ${pc.cyan("cops addon search react")}`);
    console.log("");
    console.log(pc.dim("  # Check for updates"));
    console.log(`  ${pc.cyan("cops upgrade --check")}`);

    // Help
    console.log(pc.bold("\nFor detailed help:"));
    console.log(`  ${pc.cyan("cops <command> --help")}   ${pc.dim("Show help for a specific command")}`);
    console.log(`  ${pc.cyan("cops doctor")}             ${pc.dim("Diagnose installation issues")}`);

    // Documentation
    console.log(pc.bold("\nDocumentation:"));
    console.log(`  ${pc.dim("https://github.com/goamaan/claudeops")}`);
  },
});

runMain(main);
