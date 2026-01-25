/**
 * CLAUDE.md Generator - Generate CLAUDE.md configuration file
 * Combines setup content with profile-specific additions
 */

import type { MergedSetup, MergedConfig } from '@/types';
import { AGENT_CATALOG } from '@/core/router/agent-catalog.js';

// =============================================================================
// Constants
// =============================================================================

/** Marker for start of claudeops managed section */
const MANAGED_START = '<!-- claudeops:managed:start -->';

/** Marker for end of claudeops managed section */
const MANAGED_END = '<!-- claudeops:managed:end -->';

/** Default header for managed section */
const MANAGED_HEADER = `
# claudeops Configuration

This section is automatically managed by claudeops.
Do not edit manually - changes will be overwritten on sync.
`;

// =============================================================================
// Types
// =============================================================================

/**
 * Options for CLAUDE.md generation
 */
export interface GenerateClaudeMdOptions {
  /** Include profile information */
  includeProfile?: boolean;

  /** Include agent configurations */
  includeAgents?: boolean;

  /** Include skill configurations */
  includeSkills?: boolean;

  /** Include hook templates info */
  includeHooks?: boolean;

  /** Custom header text */
  customHeader?: string;

  /** Preserve user content outside managed sections */
  preserveUserContent?: boolean;

  /** Existing CLAUDE.md content (for preservation) */
  existingContent?: string;
}

/**
 * Result of CLAUDE.md generation
 */
export interface GeneratedClaudeMd {
  /** Generated content */
  content: string;

  /** Whether user content was preserved */
  preservedUserContent: boolean;

  /** Sections included in generation */
  sections: string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract user content from existing CLAUDE.md
 * Returns content outside managed sections
 */
export function extractUserContent(existing: string): {
  before: string;
  after: string;
} {
  const startIdx = existing.indexOf(MANAGED_START);
  const endIdx = existing.indexOf(MANAGED_END);

  if (startIdx === -1 || endIdx === -1) {
    // No managed section found, treat all as "before"
    return {
      before: existing.trim(),
      after: '',
    };
  }

  const before = existing.substring(0, startIdx).trim();
  const after = existing.substring(endIdx + MANAGED_END.length).trim();

  return { before, after };
}

/**
 * Generate profile information section
 */
function generateProfileSection(config: MergedConfig): string {
  const lines: string[] = [
    '## Active Profile',
    '',
    `**Name:** ${config.profile.name}`,
  ];

  if (config.profile.description) {
    lines.push(`**Description:** ${config.profile.description}`);
  }

  lines.push(`**Source:** ${config.profile.source}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate model configuration section
 */
function generateModelSection(config: MergedConfig): string {
  const lines: string[] = [
    '## Model Configuration',
    '',
    `**Default Model:** ${config.model.default}`,
    '',
    '### Routing',
    '',
    `- Simple tasks: ${config.model.routing.simple}`,
    `- Standard tasks: ${config.model.routing.standard}`,
    `- Complex tasks: ${config.model.routing.complex}`,
  ];

  if (Object.keys(config.model.overrides).length > 0) {
    lines.push('');
    lines.push('### Overrides');
    lines.push('');
    for (const [agent, model] of Object.entries(config.model.overrides)) {
      lines.push(`- ${agent}: ${model}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate skills configuration section
 */
function generateSkillsSection(setup: MergedSetup, config: MergedConfig): string {
  const enabledSkills = [...new Set([...setup.skills.enabled, ...config.skills.enabled])];
  const disabledSkills = [...new Set([...setup.skills.disabled, ...config.skills.disabled])];

  // Filter out skills that are explicitly disabled
  const effectiveEnabled = enabledSkills.filter(s => !disabledSkills.includes(s));

  if (effectiveEnabled.length === 0 && disabledSkills.length === 0) {
    return '';
  }

  const lines: string[] = [
    '## Skills',
    '',
  ];

  if (effectiveEnabled.length > 0) {
    lines.push('### Enabled');
    lines.push('');
    for (const skill of effectiveEnabled.sort()) {
      lines.push(`- ${skill}`);
    }
    lines.push('');
  }

  if (disabledSkills.length > 0) {
    lines.push('### Disabled');
    lines.push('');
    for (const skill of disabledSkills.sort()) {
      lines.push(`- ${skill}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate agents configuration section
 */
function generateAgentsSection(setup: MergedSetup, config: MergedConfig): string {
  const agents = { ...setup.agents };

  // Merge in config overrides
  for (const [name, agentConfig] of Object.entries(config.agents)) {
    if (agents[name]) {
      agents[name] = {
        ...agents[name],
        model: agentConfig.model,
        priority: agentConfig.priority,
      };
    } else {
      agents[name] = {
        model: agentConfig.model,
        priority: agentConfig.priority,
        enabled: true,
      };
    }
  }

  // Filter out disabled agents
  const enabledAgents = Object.entries(agents)
    .filter(([_, a]) => a.enabled !== false)
    .sort(([a], [b]) => a.localeCompare(b));

  if (enabledAgents.length === 0) {
    return '';
  }

  const lines: string[] = [
    '## Agents',
    '',
    '| Agent | Model | Priority |',
    '|-------|-------|----------|',
  ];

  for (const [name, agent] of enabledAgents) {
    lines.push(`| ${name} | ${agent.model ?? 'default'} | ${agent.priority} |`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate hooks information section
 */
function generateHooksSection(setup: MergedSetup): string {
  const templates = setup.hooks.templates;

  if (templates.length === 0) {
    return '';
  }

  const lines: string[] = [
    '## Hooks',
    '',
    'The following hooks are configured:',
    '',
  ];

  for (const template of templates) {
    lines.push(`### ${template.name}`);
    lines.push('');
    if (template.description) {
      lines.push(template.description);
      lines.push('');
    }
    lines.push(`- **Matcher:** \`${template.matcher}\``);
    lines.push(`- **Handler:** \`${template.handler}\``);
    lines.push(`- **Priority:** ${template.priority}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate MCP information section
 */
function generateMcpSection(setup: MergedSetup, config: MergedConfig): string {
  const required = setup.mcp.required;
  const recommended = setup.mcp.recommended;
  const enabled = config.mcp.enabled;
  const disabled = config.mcp.disabled;

  if (required.length === 0 && recommended.length === 0 && enabled.length === 0) {
    return '';
  }

  const lines: string[] = [
    '## MCP Servers',
    '',
  ];

  if (required.length > 0) {
    lines.push('### Required');
    lines.push('');
    for (const server of required.sort()) {
      const isDisabled = disabled.includes(server);
      lines.push(`- ${server}${isDisabled ? ' (disabled)' : ''}`);
    }
    lines.push('');
  }

  if (recommended.length > 0) {
    lines.push('### Recommended');
    lines.push('');
    for (const server of recommended.sort()) {
      const isEnabled = enabled.includes(server);
      lines.push(`- ${server}${isEnabled ? ' (enabled)' : ''}`);
    }
    lines.push('');
  }

  // Additional enabled servers not in required/recommended
  const additional = enabled.filter(s =>
    !required.includes(s) && !recommended.includes(s)
  );

  if (additional.length > 0) {
    lines.push('### Additional');
    lines.push('');
    for (const server of additional.sort()) {
      lines.push(`- ${server}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate package manager instructions section
 */
function generatePackageManagerSection(config: MergedConfig): string {
  const pm = config.packageManager;
  if (!pm) return '';

  const cmds: Record<string, { run: string; exec: string; install: string }> = {
    npm: { run: 'npm run', exec: 'npx', install: 'npm install' },
    yarn: { run: 'yarn', exec: 'yarn dlx', install: 'yarn add' },
    pnpm: { run: 'pnpm', exec: 'pnpm exec', install: 'pnpm add' },
    bun: { run: 'bun run', exec: 'bunx', install: 'bun add' },
  };

  const commands = cmds[pm];
  if (!commands) return '';

  return [
    '## Package Manager',
    '',
    `This project uses **${pm}**. Always use these commands:`,
    '',
    `- Run scripts: \`${commands.run} <script>\``,
    `- Execute packages: \`${commands.exec} <package>\``,
    `- Install dependencies: \`${commands.install} <package>\``,
    '',
    '**Do NOT use npm/npx if a different manager is specified above.**',
    '',
  ].join('\n');
}

/**
 * Generate dynamic context section with intelligent orchestration info
 */
async function generateDynamicContext(): Promise<string> {
  const lines: string[] = [
    '## Intelligent Orchestration',
    '',
    'claudeops v3 uses semantic intent classification - no keywords required.',
    '',
    '### How It Works',
    '',
    '1. **Semantic Analysis**: System analyzes your natural language request',
    '2. **Intent Classification**: Determines type, complexity, and domains',
    '3. **Agent Selection**: Automatically selects appropriate agents and models',
    '4. **Parallel Execution**: Applies parallelism when beneficial',
    '',
    'Just describe what you want - the system handles the rest.',
    '',
  ];

  // Agent Catalog
  lines.push('## Available Agents');
  lines.push('');
  lines.push('| Agent | Model | Description |');
  lines.push('|-------|-------|-------------|');

  const agents = Object.values(AGENT_CATALOG).sort((a, b) => a.name.localeCompare(b.name));
  for (const agent of agents) {
    lines.push(`| ${agent.name} | ${agent.model} | ${agent.description} |`);
  }
  lines.push('');

  // Model Routing
  lines.push('### Smart Model Routing');
  lines.push('');
  lines.push('| Complexity | Model | Use For |');
  lines.push('|------------|-------|---------|');
  lines.push('| Trivial/Simple | haiku | Lookups, boilerplate, simple fixes |');
  lines.push('| Moderate/Standard | sonnet | Features, refactoring, testing |');
  lines.push('| Complex/Architectural | opus | Architecture, debugging, planning |');
  lines.push('');

  // Guardrails
  lines.push('## Active Guardrails');
  lines.push('');
  lines.push('The following safety checks are active:');
  lines.push('');
  lines.push('- **Deletion Protection**: Prevents accidental data loss');
  lines.push('- **Secret Scanning**: Detects sensitive data in code and commits');
  lines.push('- **Dangerous Command Detection**: Warns about risky operations');
  lines.push('');

  return lines.join('\n');
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Generate CLAUDE.md content from setup and config
 *
 * @param setup - Merged setup
 * @param config - Merged configuration
 * @param options - Generation options
 * @returns Generated CLAUDE.md result
 */
export async function generateClaudeMd(
  setup: MergedSetup,
  config: MergedConfig,
  options: GenerateClaudeMdOptions = {},
): Promise<GeneratedClaudeMd> {
  const {
    includeProfile = true,
    includeAgents = true,
    includeSkills = true,
    includeHooks = true,
    customHeader,
    preserveUserContent = true,
    existingContent,
  } = options;

  const includedSections: string[] = [];

  // Extract user content if preserving
  let userBefore = '';
  let userAfter = '';

  if (preserveUserContent && existingContent) {
    const userContent = extractUserContent(existingContent);
    userBefore = userContent.before;
    userAfter = userContent.after;
  }

  // Build managed section content
  const managedParts: string[] = [];

  // Setup content first (if any) - INSIDE managed section
  if (setup.content.trim()) {
    managedParts.push(setup.content.trim());
    managedParts.push('');
    includedSections.push('setup-content');
  }

  // Header
  managedParts.push(customHeader ?? MANAGED_HEADER.trim());
  managedParts.push('');

  // Dynamic context section (v3 intelligent orchestration)
  const dynamicContext = await generateDynamicContext();
  managedParts.push(dynamicContext);
  includedSections.push('dynamic-context');

  // Profile section
  if (includeProfile) {
    const profileSection = generateProfileSection(config);
    if (profileSection) {
      managedParts.push(profileSection);
      includedSections.push('profile');
    }
  }

  // Model section
  const modelSection = generateModelSection(config);
  managedParts.push(modelSection);
  includedSections.push('model');

  // Package manager section
  const packageManagerSection = generatePackageManagerSection(config);
  if (packageManagerSection) {
    managedParts.push(packageManagerSection);
    includedSections.push('package-manager');
  }

  // Skills section
  if (includeSkills) {
    const skillsSection = generateSkillsSection(setup, config);
    if (skillsSection) {
      managedParts.push(skillsSection);
      includedSections.push('skills');
    }
  }

  // Agents section
  if (includeAgents) {
    const agentsSection = generateAgentsSection(setup, config);
    if (agentsSection) {
      managedParts.push(agentsSection);
      includedSections.push('agents');
    }
  }

  // Hooks section
  if (includeHooks) {
    const hooksSection = generateHooksSection(setup);
    if (hooksSection) {
      managedParts.push(hooksSection);
      includedSections.push('hooks');
    }
  }

  // MCP section
  const mcpSection = generateMcpSection(setup, config);
  if (mcpSection) {
    managedParts.push(mcpSection);
    includedSections.push('mcp');
  }

  // Build managed section with markers
  const managedSection = [
    MANAGED_START,
    '',
    managedParts.join('\n'),
    MANAGED_END,
  ].join('\n');

  // Assemble final content
  const parts: string[] = [];

  // User content before managed section
  if (userBefore) {
    parts.push(userBefore);
    parts.push('');
  }

  // Managed section
  parts.push(managedSection);

  // User content after managed section
  if (userAfter) {
    parts.push('');
    parts.push(userAfter);
  }

  const content = parts.join('\n').trim() + '\n';

  return {
    content,
    preservedUserContent: Boolean(userBefore || userAfter),
    sections: includedSections,
  };
}

/**
 * Check if content contains managed section markers
 */
export function hasManagedSection(content: string): boolean {
  return content.includes(MANAGED_START) && content.includes(MANAGED_END);
}

/**
 * Get the managed section content from CLAUDE.md
 */
export function getManagedSection(content: string): string | null {
  const startIdx = content.indexOf(MANAGED_START);
  const endIdx = content.indexOf(MANAGED_END);

  if (startIdx === -1 || endIdx === -1) {
    return null;
  }

  return content.substring(
    startIdx + MANAGED_START.length,
    endIdx,
  ).trim();
}

/**
 * Replace managed section in existing content
 */
export function replaceManagedSection(
  existing: string,
  newManaged: string,
): string {
  if (!hasManagedSection(existing)) {
    // No existing managed section, append to end
    return existing.trim() + '\n\n' + MANAGED_START + '\n\n' + newManaged + '\n' + MANAGED_END + '\n';
  }

  const startIdx = existing.indexOf(MANAGED_START);
  const endIdx = existing.indexOf(MANAGED_END);

  const before = existing.substring(0, startIdx);
  const after = existing.substring(endIdx + MANAGED_END.length);

  return before + MANAGED_START + '\n\n' + newManaged + '\n' + MANAGED_END + after;
}

/**
 * Create minimal CLAUDE.md with only essential information
 */
export async function createMinimalClaudeMd(
  setup: MergedSetup,
  config: MergedConfig,
): Promise<string> {
  const result = await generateClaudeMd(setup, config, {
    includeProfile: false,
    includeAgents: false,
    includeSkills: false,
    includeHooks: false,
  });
  return result.content;
}

/**
 * Parse CLAUDE.md to extract configuration info
 * (Inverse of generation - for validation/diff)
 */
export function parseClaudeMdInfo(content: string): {
  hasManaged: boolean;
  profile?: string;
  model?: string;
  skills: { enabled: string[]; disabled: string[] };
  agents: string[];
} {
  const result = {
    hasManaged: hasManagedSection(content),
    profile: undefined as string | undefined,
    model: undefined as string | undefined,
    skills: { enabled: [] as string[], disabled: [] as string[] },
    agents: [] as string[],
  };

  // Extract profile name
  const profileMatch = content.match(/\*\*Name:\*\*\s*(.+)/);
  if (profileMatch && profileMatch[1]) {
    result.profile = profileMatch[1].trim();
  }

  // Extract default model
  const modelMatch = content.match(/\*\*Default Model:\*\*\s*(.+)/);
  if (modelMatch && modelMatch[1]) {
    result.model = modelMatch[1].trim();
  }

  // Extract skills (basic parsing)
  const enabledSection = content.match(/### Enabled\s*\n([\s\S]*?)(?=###|##|$)/);
  if (enabledSection && enabledSection[1]) {
    const skills = enabledSection[1].match(/^-\s+(.+)$/gm);
    if (skills) {
      result.skills.enabled = skills.map(s => s.replace(/^-\s+/, '').trim());
    }
  }

  const disabledSection = content.match(/### Disabled\s*\n([\s\S]*?)(?=###|##|$)/);
  if (disabledSection && disabledSection[1]) {
    const skills = disabledSection[1].match(/^-\s+(.+)$/gm);
    if (skills) {
      result.skills.disabled = skills.map(s => s.replace(/^-\s+/, '').trim());
    }
  }

  // Extract agents from table
  const agentMatches = content.matchAll(/^\|\s*([a-z][\w-]*)\s*\|/gm);
  for (const match of agentMatches) {
    if (match[1] && match[1] !== 'Agent') {
      result.agents.push(match[1]);
    }
  }

  return result;
}
