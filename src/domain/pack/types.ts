/**
 * Pack Types - Type definitions for AI-powered pack analysis
 */

// =============================================================================
// Pack Types
// =============================================================================

export type PackType = 'agent-pack' | 'skill-pack' | 'hook-pack' | 'mcp-server' | 'guardrail' | 'rules' | 'mixed';

export interface PackComponent {
  type: 'agent' | 'skill' | 'hook' | 'rule' | 'mcp' | 'script';
  name: string;
  path: string;
  description: string;
  model?: 'haiku' | 'sonnet' | 'opus';
  dependencies?: string[];
}

export interface PackAnalysis {
  name: string;
  source: string;
  type: PackType;
  description: string;
  components: PackComponent[];
  requirements: {
    npm?: string[];
    mcp?: string[];
    env?: string[];
  };
  installInstructions: string;
  confidence: number;
}

export interface InstalledPack {
  name: string;
  source: string;
  installedAt: string;
  components: PackComponent[];
  enabled: boolean;
}
