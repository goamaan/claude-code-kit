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

    console.log("Getting Started:");
    console.log("  cck install        Interactive installation wizard");
    console.log("  cck config init    Initialize configuration");
    console.log("  cck doctor         Diagnose and fix issues");
    console.log("  cck sync           Sync to Claude Code");
    console.log("");

    console.log("Core Commands:");
    console.log("  profile            Manage profiles (list, use, create, delete)");
    console.log("  config             Manage configuration (init, edit, show, validate)");
    console.log("  sync               Sync configuration to Claude Code");
    console.log("");

    console.log("Extensions:");
    console.log("  setup              Manage setups (list, info, use, create)");
    console.log("  addon              Manage addons (search, install, update, remove)");
    console.log("  pack               Manage packs (add, list, info, enable, disable)");
    console.log("  skill              Manage skills (list, info, install, sync)");
    console.log("  mcp                Manage MCP servers (list, add, enable, disable)");
    console.log("  hook               Manage hooks (list, debug, test)");
    console.log("");

    console.log("AI Features:");
    console.log("  classify           Test intent classification and routing");
    console.log("");

    console.log("Utilities:");
    console.log("  cost               Cost tracking (today, week, budget, pricing)");
    console.log("  doctor             Diagnose configuration issues");
    console.log("  upgrade            Check for and install updates");
    console.log("");

    console.log("Examples:");
    console.log("  cck config init              Create initial configuration");
    console.log("  cck profile create work      Create a work profile");
    console.log("  cck addon search react       Search for React addons");
    console.log("  cck pack add typescript      Add TypeScript pack");
    console.log("  cck upgrade --check          Check for updates");
    console.log("");

    console.log("For detailed help:");
    console.log("  cck <command> --help         Show help for a specific command");
    console.log("  cck doctor                   Diagnose installation issues");
    console.log("");

    console.log("Documentation:");
    console.log("  https://github.com/anthropics/claudeops");
  },
});

runMain(main);
