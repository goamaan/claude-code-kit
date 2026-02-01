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
    // Initialization
    init: () => import("./commands/init.js").then((m) => m.default),

    // Profile management
    profile: () => import("./commands/profile.js").then((m) => m.default),

    // Sync configuration to Claude Code
    sync: () => import("./commands/sync.js").then((m) => m.default),

    // Diagnostic tool
    doctor: () => import("./commands/doctor.js").then((m) => m.default),

    // Ecosystem: skill and hook management
    skill: () => import("./commands/skill.js").then((m) => m.default),
    hook: () => import("./commands/hook.js").then((m) => m.default),

    // Learning system
    learn: () => import("./commands/learn.js").then((m) => m.default),

    // Team sharing
    team: () => import("./commands/team.js").then((m) => m.default),

    // Codebase analysis
    scan: () => import("./commands/scan.js").then((m) => m.default),

    // Reset claudeops artifacts
    reset: () => import("./commands/reset.js").then((m) => m.default),

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
    console.log(`  ${pc.cyan("init")}           ${pc.dim("Initialize claudeops + project .claude/ artifacts")}`);
    console.log(`  ${pc.cyan("doctor")}         ${pc.dim("Diagnose and fix issues")}`);
    console.log(`  ${pc.cyan("sync")}           ${pc.dim("Sync configuration to Claude Code")}`);

    // Core Commands
    console.log(pc.bold("\nCore Commands:"));
    console.log(`  ${pc.cyan("profile")}        ${pc.dim("Manage profiles (list, use, create, delete)")}`);
    console.log(`  ${pc.cyan("sync")}           ${pc.dim("Sync configuration to Claude Code")}`);

    // Ecosystem
    console.log(pc.bold("\nEcosystem:"));
    console.log(`  ${pc.cyan("skill")}          ${pc.dim("Manage skills (add, remove, list)")}`);
    console.log(`  ${pc.cyan("hook")}           ${pc.dim("Manage hooks (add, remove, list)")}`);
    console.log(`  ${pc.cyan("learn")}          ${pc.dim("Manage learnings (list, show, evolve, clear)")}`);

    // Sharing
    console.log(pc.bold("\nSharing:"));
    console.log(`  ${pc.cyan("team")}           ${pc.dim("Export and import team configurations")}`);

    // Analysis
    console.log(pc.bold("\nAnalysis:"));
    console.log(`  ${pc.cyan("scan")}           ${pc.dim("Scan codebase and display analysis")}`);

    // Utilities
    console.log(pc.bold("\nUtilities:"));
    console.log(`  ${pc.cyan("doctor")}         ${pc.dim("Diagnose configuration issues")}`);
    console.log(`  ${pc.cyan("reset")}          ${pc.dim("Remove claudeops-generated artifacts")}`);
    console.log(`  ${pc.cyan("upgrade")}        ${pc.dim("Check for and install updates")}`);

    // Examples
    console.log(pc.bold("\nExamples:"));
    console.log(pc.dim("  # Initialize claudeops"));
    console.log(`  ${pc.cyan("cops init")}`);
    console.log("");
    console.log(pc.dim("  # Create a work profile"));
    console.log(`  ${pc.cyan("cops profile create work")}`);
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
