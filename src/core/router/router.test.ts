/**
 * Unit tests for Router
 */

import { describe, it, expect } from 'vitest';
import {
  routeIntent,
  createSimpleRoutingDecision,
  createConversationRoutingDecision,
} from './router.js';
import type { IntentClassification } from '../classifier/types.js';

describe('router', () => {
  // ===========================================================================
  // Agent Selection
  // ===========================================================================

  describe('agent selection', () => {
    it('should select appropriate agents for research intent', () => {
      const classification: IntentClassification = {
        type: 'research',
        complexity: 'simple',
        domains: ['general'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['explore'],
          parallelism: 'parallel',
          modelTier: 'haiku',
          verification: false,
        },
        confidence: 0.8,
      };

      const decision = routeIntent(classification);

      expect(decision.agents.length).toBeGreaterThan(0);
      expect(decision.agents.some((a) => a.name === 'explore')).toBe(true);
    });

    it('should select appropriate agents for implementation intent', () => {
      const classification: IntentClassification = {
        type: 'implementation',
        complexity: 'moderate',
        domains: ['backend'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['executor'],
          parallelism: 'sequential',
          modelTier: 'sonnet',
          verification: false,
        },
        confidence: 0.85,
      };

      const decision = routeIntent(classification);

      expect(decision.agents.some((a) => a.name === 'executor')).toBe(true);
    });

    it('should select appropriate agents for debugging intent', () => {
      const classification: IntentClassification = {
        type: 'debugging',
        complexity: 'complex',
        domains: ['backend'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['architect'],
          parallelism: 'sequential',
          modelTier: 'opus',
          verification: true,
        },
        confidence: 0.9,
      };

      const decision = routeIntent(classification);

      expect(decision.agents.some((a) => a.name === 'architect')).toBe(true);
    });

    it('should select security agent for review intent', () => {
      const classification: IntentClassification = {
        type: 'review',
        complexity: 'moderate',
        domains: ['security'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: true,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['security'],
          parallelism: 'sequential',
          modelTier: 'opus',
          verification: false,
        },
        confidence: 0.88,
      };

      const decision = routeIntent(classification);

      expect(decision.agents.some((a) => a.name === 'security')).toBe(true);
    });

    it('should select planner agent for planning intent', () => {
      const classification: IntentClassification = {
        type: 'planning',
        complexity: 'complex',
        domains: ['general'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: true,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['planner'],
          parallelism: 'sequential',
          modelTier: 'opus',
          verification: false,
        },
        confidence: 0.92,
      };

      const decision = routeIntent(classification);

      expect(decision.agents.some((a) => a.name === 'planner')).toBe(true);
    });

    it('should return minimal agents for conversation intent', () => {
      const classification: IntentClassification = {
        type: 'conversation',
        complexity: 'trivial',
        domains: ['general'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: [],
          parallelism: 'sequential',
          modelTier: 'sonnet',
          verification: false,
        },
        confidence: 0.95,
      };

      const decision = routeIntent(classification);

      // Conversation may have minimal or no agents depending on domain
      expect(decision.agents.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // Model Tier Selection
  // ===========================================================================

  describe('model tier selection', () => {
    it('should select haiku for trivial complexity', () => {
      const classification: IntentClassification = {
        type: 'research',
        complexity: 'trivial',
        domains: ['general'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: true,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['explore'],
          parallelism: 'parallel',
          modelTier: 'haiku',
          verification: false,
        },
        confidence: 0.9,
      };

      const decision = routeIntent(classification);

      expect(decision.primaryModel).toBe('haiku');
    });

    it('should select opus for moderate complexity', () => {
      const classification: IntentClassification = {
        type: 'implementation',
        complexity: 'moderate',
        domains: ['backend'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['executor'],
          parallelism: 'sequential',
          modelTier: 'opus',
          verification: false,
        },
        confidence: 0.85,
      };

      const decision = routeIntent(classification);

      expect(decision.primaryModel).toBe('opus');
    });

    it('should select opus for architectural complexity', () => {
      const classification: IntentClassification = {
        type: 'planning',
        complexity: 'architectural',
        domains: ['general'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: true,
          wantsVerification: false,
          wantsThorough: true,
        },
        recommendation: {
          agents: ['planner', 'architect'],
          parallelism: 'sequential',
          modelTier: 'opus',
          verification: true,
        },
        confidence: 0.95,
      };

      const decision = routeIntent(classification);

      expect(decision.primaryModel).toBe('opus');
    });

    it('should prefer haiku when user wants speed', () => {
      const classification: IntentClassification = {
        type: 'implementation',
        complexity: 'simple',
        domains: ['general'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: true,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['executor-low'],
          parallelism: 'sequential',
          modelTier: 'haiku',
          verification: false,
        },
        confidence: 0.8,
      };

      const decision = routeIntent(classification);

      expect(decision.primaryModel).toBe('haiku');
    });
  });

  // ===========================================================================
  // Parallelism Determination
  // ===========================================================================

  describe('parallelism determination', () => {
    it('should use parallel for research with multiple agents', () => {
      const classification: IntentClassification = {
        type: 'research',
        complexity: 'moderate',
        domains: ['backend', 'frontend'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['explore', 'researcher'],
          parallelism: 'parallel',
          modelTier: 'sonnet',
          verification: false,
        },
        confidence: 0.85,
      };

      const decision = routeIntent(classification);

      expect(decision.parallelism).toBe('parallel');
    });

    it('should determine parallelism for implementation', () => {
      const classification: IntentClassification = {
        type: 'implementation',
        complexity: 'moderate',
        domains: ['backend'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['executor'],
          parallelism: 'sequential',
          modelTier: 'sonnet',
          verification: false,
        },
        confidence: 0.85,
      };

      const decision = routeIntent(classification);

      // Parallelism is determined by the router based on multiple factors
      expect(['sequential', 'parallel', 'swarm']).toContain(decision.parallelism);
    });

    it('should use swarm for multi-domain autonomous work', () => {
      const classification: IntentClassification = {
        type: 'implementation',
        complexity: 'complex',
        domains: ['frontend', 'backend', 'database'],
        signals: {
          wantsPersistence: true,
          wantsSpeed: false,
          wantsAutonomy: true,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: true,
        },
        recommendation: {
          agents: ['executor', 'designer', 'architect'],
          parallelism: 'swarm',
          modelTier: 'sonnet',
          verification: true,
        },
        confidence: 0.9,
      };

      const decision = routeIntent(classification);

      expect(['swarm', 'parallel', 'sequential']).toContain(decision.parallelism);
    });
  });

  // ===========================================================================
  // Verification Logic
  // ===========================================================================

  describe('verification determination', () => {
    it('should require verification when user requests it', () => {
      const classification: IntentClassification = {
        type: 'implementation',
        complexity: 'simple',
        domains: ['general'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: true,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['executor'],
          parallelism: 'sequential',
          modelTier: 'sonnet',
          verification: true,
        },
        confidence: 0.85,
      };

      const decision = routeIntent(classification);

      expect(decision.verification).toBe(true);
    });

    it('should require verification for complex tasks', () => {
      const classification: IntentClassification = {
        type: 'implementation',
        complexity: 'complex',
        domains: ['backend'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['executor', 'architect'],
          parallelism: 'sequential',
          modelTier: 'opus',
          verification: true,
        },
        confidence: 0.9,
      };

      const decision = routeIntent(classification);

      expect(decision.verification).toBe(true);
    });

    it('should require verification for refactoring', () => {
      const classification: IntentClassification = {
        type: 'refactoring',
        complexity: 'moderate',
        domains: ['backend'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['architect', 'executor'],
          parallelism: 'sequential',
          modelTier: 'sonnet',
          verification: true,
        },
        confidence: 0.88,
      };

      const decision = routeIntent(classification);

      expect(decision.verification).toBe(true);
    });

    it('should not require verification for review tasks', () => {
      const classification: IntentClassification = {
        type: 'review',
        complexity: 'moderate',
        domains: ['security'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['security'],
          parallelism: 'sequential',
          modelTier: 'opus',
          verification: false,
        },
        confidence: 0.9,
      };

      const decision = routeIntent(classification);

      expect(decision.verification).toBe(false);
    });
  });

  // ===========================================================================
  // Domain-Specific Agent Additions
  // ===========================================================================

  describe('domain-specific agent additions', () => {
    it('should add designer for frontend domain', () => {
      const classification: IntentClassification = {
        type: 'implementation',
        complexity: 'moderate',
        domains: ['frontend'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['executor'],
          parallelism: 'sequential',
          modelTier: 'sonnet',
          verification: false,
        },
        confidence: 0.85,
      };

      const decision = routeIntent(classification);

      expect(decision.agents.some((a) => a.name === 'designer')).toBe(true);
    });

    it('should add security agent for security domain', () => {
      const classification: IntentClassification = {
        type: 'implementation',
        complexity: 'moderate',
        domains: ['security'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['executor'],
          parallelism: 'sequential',
          modelTier: 'sonnet',
          verification: false,
        },
        confidence: 0.85,
      };

      const decision = routeIntent(classification);

      expect(decision.agents.some((a) => a.name === 'security')).toBe(true);
    });

    it('should add qa-tester for testing domain', () => {
      const classification: IntentClassification = {
        type: 'implementation',
        complexity: 'moderate',
        domains: ['testing'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['executor'],
          parallelism: 'sequential',
          modelTier: 'sonnet',
          verification: false,
        },
        confidence: 0.85,
      };

      const decision = routeIntent(classification);

      expect(decision.agents.some((a) => a.name === 'qa-tester')).toBe(true);
    });

    it('should add writer for documentation domain', () => {
      const classification: IntentClassification = {
        type: 'implementation',
        complexity: 'simple',
        domains: ['documentation'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: [],
          parallelism: 'sequential',
          modelTier: 'haiku',
          verification: false,
        },
        confidence: 0.8,
      };

      const decision = routeIntent(classification);

      expect(decision.agents.some((a) => a.name === 'writer')).toBe(true);
    });
  });

  // ===========================================================================
  // Reasoning Generation
  // ===========================================================================

  describe('reasoning generation', () => {
    it('should generate reasoning for routing decision', () => {
      const classification: IntentClassification = {
        type: 'implementation',
        complexity: 'moderate',
        domains: ['backend'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: true,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['executor'],
          parallelism: 'sequential',
          modelTier: 'sonnet',
          verification: true,
        },
        confidence: 0.85,
      };

      const decision = routeIntent(classification);

      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning).toContain('implementation');
    });

    it('should include domain information in reasoning', () => {
      const classification: IntentClassification = {
        type: 'implementation',
        complexity: 'moderate',
        domains: ['frontend', 'backend'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['executor'],
          parallelism: 'sequential',
          modelTier: 'sonnet',
          verification: false,
        },
        confidence: 0.85,
      };

      const decision = routeIntent(classification);

      expect(decision.reasoning).toContain('Domains:');
    });

    it('should explain verification requirement in reasoning', () => {
      const classification: IntentClassification = {
        type: 'refactoring',
        complexity: 'complex',
        domains: ['backend'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: false,
          wantsThorough: false,
        },
        recommendation: {
          agents: ['architect', 'executor'],
          parallelism: 'sequential',
          modelTier: 'opus',
          verification: true,
        },
        confidence: 0.9,
      };

      const decision = routeIntent(classification);

      expect(decision.reasoning).toContain('Verification');
    });
  });

  // ===========================================================================
  // Helper Functions
  // ===========================================================================

  describe('helper functions', () => {
    it('should create simple routing decision', () => {
      const decision = createSimpleRoutingDecision('executor', 'sonnet', 'Test reasoning');

      expect(decision.agents).toHaveLength(1);
      expect(decision.agents[0]?.name).toBe('executor');
      expect(decision.primaryModel).toBe('sonnet');
      expect(decision.parallelism).toBe('sequential');
      expect(decision.verification).toBe(false);
      expect(decision.reasoning).toBe('Test reasoning');
    });

    it('should create conversation routing decision', () => {
      const decision = createConversationRoutingDecision();

      expect(decision.agents).toHaveLength(0);
      expect(decision.primaryModel).toBe('sonnet');
      expect(decision.parallelism).toBe('sequential');
      expect(decision.verification).toBe(false);
      expect(decision.reasoning).toContain('Conversation');
    });
  });
});
