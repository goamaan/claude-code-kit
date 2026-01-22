/**
 * Setup merger
 * Combines multiple setups into a single merged configuration
 */

import type {
  LoadedSetup,
  MergedSetup,
  HookTemplate,
  SetupManifest,
} from '@/types';

// =============================================================================
// Merge Error
// =============================================================================

export class SetupMergeError extends Error {
  public readonly sources: string[];
  public readonly originalCause?: unknown;

  constructor(
    message: string,
    sources: string[],
    originalCause?: unknown,
  ) {
    super(message);
    this.name = 'SetupMergeError';
    this.sources = sources;
    this.originalCause = originalCause;
  }
}

// =============================================================================
// Merge Options
// =============================================================================

export interface MergeOptions {
  /**
   * How to handle skill conflicts
   * - 'union': Enable skills from all setups
   * - 'override': Later setup's skills override earlier
   */
  skillStrategy?: 'union' | 'override';

  /**
   * How to handle hook conflicts
   * - 'merge': Combine all hooks
   * - 'override': Later setup's hooks override earlier
   */
  hookStrategy?: 'merge' | 'override';

  /**
   * How to handle content
   * - 'concat': Concatenate all content
   * - 'override': Later setup's content overrides earlier
   */
  contentStrategy?: 'concat' | 'override';
}

const DEFAULT_MERGE_OPTIONS: Required<MergeOptions> = {
  skillStrategy: 'union',
  hookStrategy: 'merge',
  contentStrategy: 'concat',
};

// =============================================================================
// Main Merge Function
// =============================================================================

/**
 * Merge multiple loaded setups into a single merged setup
 * Later setups override earlier ones for conflicting values
 *
 * @param setups - Array of loaded setups to merge (order matters)
 * @param options - Merge options
 * @returns Merged setup configuration
 */
export function mergeSetups(
  setups: LoadedSetup[],
  options: MergeOptions = {},
): MergedSetup {
  if (setups.length === 0) {
    throw new SetupMergeError('Cannot merge empty setup list', []);
  }

  const opts = { ...DEFAULT_MERGE_OPTIONS, ...options };
  const sources = setups.map(s => s.sourcePath);

  try {
    // Start with the first setup as base
    const base = setups[0];
    if (!base) {
      throw new SetupMergeError('Cannot merge empty setup list', sources);
    }

    // Use the root setup (last one) for name/version
    const root = setups[setups.length - 1];
    if (!root) {
      throw new SetupMergeError('Cannot merge empty setup list', sources);
    }

    // Initialize merged structure
    const merged: MergedSetup = {
      name: root.manifest.name,
      version: root.manifest.version,
      description: root.manifest.description,
      requires: {
        addons: [],
      },
      skills: {
        enabled: [],
        disabled: [],
      },
      agents: {},
      mcp: {
        recommended: [],
        required: [],
      },
      hooks: {
        templates: [],
      },
      commands: {},
      content: '',
      sources,
    };

    // Merge each setup in order
    for (const setup of setups) {
      mergeManifestInto(merged, setup.manifest, opts);
      mergeContentInto(merged, setup.content, opts);
    }

    // Deduplicate arrays
    merged.requires.addons = [...new Set(merged.requires.addons)];
    merged.skills.enabled = [...new Set(merged.skills.enabled)];
    merged.skills.disabled = [...new Set(merged.skills.disabled)];
    merged.mcp.recommended = [...new Set(merged.mcp.recommended)];
    merged.mcp.required = [...new Set(merged.mcp.required)];

    // Remove disabled skills from enabled list
    merged.skills.enabled = merged.skills.enabled.filter(
      s => !merged.skills.disabled.includes(s),
    );

    // Deduplicate hooks by name (keep higher priority / later)
    merged.hooks.templates = deduplicateHooks(merged.hooks.templates);

    return merged;
  } catch (error) {
    if (error instanceof SetupMergeError) {
      throw error;
    }
    throw new SetupMergeError(
      `Failed to merge setups: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sources,
      error,
    );
  }
}

// =============================================================================
// Merge Helpers
// =============================================================================

/**
 * Merge a single manifest into the merged structure
 */
function mergeManifestInto(
  merged: MergedSetup,
  manifest: SetupManifest,
  opts: Required<MergeOptions>,
): void {
  // Merge requires
  if (manifest.requires) {
    if (manifest.requires['oh-my-claudecode']) {
      merged.requires['oh-my-claudecode'] = manifest.requires['oh-my-claudecode'];
    }
    if (manifest.requires.addons) {
      merged.requires.addons.push(...manifest.requires.addons);
    }
  }

  // Merge skills
  if (manifest.skills) {
    if (opts.skillStrategy === 'union') {
      if (manifest.skills.enabled) {
        merged.skills.enabled.push(...manifest.skills.enabled);
      }
      if (manifest.skills.disabled) {
        merged.skills.disabled.push(...manifest.skills.disabled);
      }
    } else {
      // Override strategy
      if (manifest.skills.enabled) {
        merged.skills.enabled = [...manifest.skills.enabled];
      }
      if (manifest.skills.disabled) {
        merged.skills.disabled = [...manifest.skills.disabled];
      }
    }
  }

  // Merge agents (always override - later wins)
  if (manifest.agents) {
    for (const [name, config] of Object.entries(manifest.agents)) {
      merged.agents[name] = {
        model: config.model,
        priority: config.priority ?? 50,
        enabled: config.enabled ?? true,
      };
    }
  }

  // Merge MCP
  if (manifest.mcp) {
    if (manifest.mcp.recommended) {
      merged.mcp.recommended.push(...manifest.mcp.recommended);
    }
    if (manifest.mcp.required) {
      merged.mcp.required.push(...manifest.mcp.required);
    }
    if (manifest.mcp.max_enabled !== undefined) {
      merged.mcp.max_enabled = manifest.mcp.max_enabled;
    }
  }

  // Merge hooks
  if (manifest.hooks?.templates) {
    if (opts.hookStrategy === 'merge') {
      merged.hooks.templates.push(...manifest.hooks.templates);
    } else {
      // Override strategy - replace all hooks
      merged.hooks.templates = [...manifest.hooks.templates];
    }
  }

  // Merge commands (always override - later wins)
  if (manifest.commands) {
    for (const [name, config] of Object.entries(manifest.commands)) {
      merged.commands[name] = {
        enabled: config.enabled ?? true,
        alias: config.alias,
        description: config.description,
      };
    }
  }
}

/**
 * Merge content into the merged structure
 */
function mergeContentInto(
  merged: MergedSetup,
  content: string,
  opts: Required<MergeOptions>,
): void {
  if (!content.trim()) {
    return;
  }

  if (opts.contentStrategy === 'concat') {
    if (merged.content) {
      merged.content = `${merged.content}\n\n${content}`;
    } else {
      merged.content = content;
    }
  } else {
    // Override strategy
    merged.content = content;
  }
}

/**
 * Deduplicate hooks by name, keeping higher priority ones
 */
function deduplicateHooks(hooks: HookTemplate[]): HookTemplate[] {
  const byName = new Map<string, HookTemplate>();

  for (const hook of hooks) {
    const existing = byName.get(hook.name);
    if (!existing || (hook.priority ?? 0) >= (existing.priority ?? 0)) {
      byName.set(hook.name, hook);
    }
  }

  // Sort by priority (descending)
  return Array.from(byName.values()).sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create an empty merged setup
 */
export function createEmptyMergedSetup(name: string, version: string = '1.0.0'): MergedSetup {
  return {
    name,
    version,
    requires: {
      addons: [],
    },
    skills: {
      enabled: [],
      disabled: [],
    },
    agents: {},
    mcp: {
      recommended: [],
      required: [],
    },
    hooks: {
      templates: [],
    },
    commands: {},
    content: '',
    sources: [],
  };
}

/**
 * Check if two merged setups are equivalent
 */
export function areMergedSetupsEqual(a: MergedSetup, b: MergedSetup): boolean {
  // Quick structural comparison
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Get a diff between two merged setups
 */
export interface SetupDiff {
  added: {
    skills: string[];
    agents: string[];
    hooks: string[];
  };
  removed: {
    skills: string[];
    agents: string[];
    hooks: string[];
  };
  modified: {
    agents: string[];
    hooks: string[];
  };
}

export function diffMergedSetups(before: MergedSetup, after: MergedSetup): SetupDiff {
  const beforeSkills = new Set([...before.skills.enabled]);
  const afterSkills = new Set([...after.skills.enabled]);

  const beforeAgents = new Set(Object.keys(before.agents));
  const afterAgents = new Set(Object.keys(after.agents));

  const beforeHooks = new Set(before.hooks.templates.map(h => h.name));
  const afterHooks = new Set(after.hooks.templates.map(h => h.name));

  return {
    added: {
      skills: [...afterSkills].filter(s => !beforeSkills.has(s)),
      agents: [...afterAgents].filter(a => !beforeAgents.has(a)),
      hooks: [...afterHooks].filter(h => !beforeHooks.has(h)),
    },
    removed: {
      skills: [...beforeSkills].filter(s => !afterSkills.has(s)),
      agents: [...beforeAgents].filter(a => !afterAgents.has(a)),
      hooks: [...beforeHooks].filter(h => !afterHooks.has(h)),
    },
    modified: {
      agents: [...afterAgents].filter(a =>
        beforeAgents.has(a) &&
        JSON.stringify(before.agents[a]) !== JSON.stringify(after.agents[a]),
      ),
      hooks: [...afterHooks].filter(h => {
        if (!beforeHooks.has(h)) return false;
        const bh = before.hooks.templates.find(t => t.name === h);
        const ah = after.hooks.templates.find(t => t.name === h);
        return JSON.stringify(bh) !== JSON.stringify(ah);
      }),
    },
  };
}
