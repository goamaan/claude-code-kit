#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
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

    // Pack management
    pack: () => import("./commands/pack.js").then((m) => m.default),

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

    // Hook management
    hook: () => import("./commands/hook.js").then((m) => m.default),

    // Sync configuration to Claude Code
    sync: () => import("./commands/sync.js").then((m) => m.default),

    // Diagnostic tool
    doctor: () => import("./commands/doctor.js").then((m) => m.default),

    // Installation wizard
    install: () => import("./commands/install.js").then((m) => m.default),

    // Upgrade claudeops
    upgrade: () => import("./commands/upgrade.js").then((m) => m.default),
  },
  run({ args: _args }) {
    // Default behavior when no subcommand is provided
    console.log(`${NAME} v${VERSION}`);
    console.log("Batteries-included Claude Code enhancement toolkit");
    console.log("");
    console.log("Commands:");
    console.log("  profile   Manage profiles (list, use, create, delete, export, import)");
    console.log("  setup     Manage setups (list, info, use, create, export, import)");
    console.log("  addon     Manage addons (list, search, install, update, remove, create)");
    console.log("  pack      Manage packs (add, list, info, remove, enable, disable, update)");
    console.log("  skill     Manage skills (list, info, install, enable, disable, sync)");
    console.log("  classify  Test intent classification and routing for a prompt");
    console.log("  config    Manage configuration (init, edit, show, validate, export)");
    console.log("  mcp       Manage MCP servers (list, add, remove, enable, disable)");
    console.log("  cost      Cost tracking (today, week, budget, export, pricing)");
    console.log("  hook      Manage hooks (list, debug, test)");
    console.log("  sync      Sync configuration to Claude Code");
    console.log("  doctor    Diagnose configuration issues");
    console.log("  install   Interactive installation wizard");
    console.log("  upgrade   Check for and install updates");
    console.log("");
    console.log("Run 'cck <command> --help' for more information on a command.");
  },
});

runMain(main);
