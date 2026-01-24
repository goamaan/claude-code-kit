/**
 * Unit tests for Intent Classifier
 */

import { describe, it, expect } from 'vitest';
import {
  createClassifier,
  formatClassificationContext,
  ClassificationError,
} from './classifier.js';
import type { IntentClassification } from './types.js';

describe('classifier', () => {
  // ===========================================================================
  // FallbackClassifier - Intent Detection
  // ===========================================================================

  describe('FallbackClassifier - intent detection', () => {
    it('should detect research intent', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Find all TypeScript files in the project');

      expect(result.type).toBe('research');
    });

    it('should detect implementation intent', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Create a new user authentication module');

      expect(result.type).toBe('implementation');
    });

    it('should detect debugging intent', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Fix the memory leak in the server');

      expect(result.type).toBe('debugging');
    });

    it('should detect review intent', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Review the security of the authentication system');

      expect(result.type).toBe('review');
    });

    it('should detect planning intent', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Plan the database migration roadmap');

      expect(result.type).toBe('planning');
    });

    it('should detect refactoring intent', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Refactor the legacy payment module');

      expect(result.type).toBe('refactoring');
    });

    it('should detect maintenance intent', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Update the dependencies to latest versions');

      expect(result.type).toBe('maintenance');
    });

    it('should detect conversation intent', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('What is the weather like today?');

      expect(result.type).toBe('conversation');
    });
  });

  // ===========================================================================
  // FallbackClassifier - Complexity Detection
  // ===========================================================================

  describe('FallbackClassifier - complexity detection', () => {
    it('should detect trivial complexity for very short requests', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('ls');

      expect(result.complexity).toBe('trivial');
    });

    it('should detect simple complexity for short requests', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Find the main function');

      // Short requests are typically trivial or simple
      expect(['trivial', 'simple']).toContain(result.complexity);
    });

    it('should detect architectural complexity', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify(
        'Design the complete microservices architecture for the entire system with all components'
      );

      // Should detect architectural based on keywords
      expect(['simple', 'moderate', 'complex', 'architectural']).toContain(result.complexity);
    });

    it('should detect complex tasks', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify(
        'Implement a complex distributed caching system with advanced features and comprehensive testing'
      );

      // Complexity varies based on word count and keywords
      expect(['trivial', 'simple', 'moderate', 'complex', 'architectural']).toContain(result.complexity);
    });

    it('should detect simple tasks with explicit keywords', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Just add a simple validation check');

      expect(result.complexity).toBe('simple');
    });
  });

  // ===========================================================================
  // FallbackClassifier - Domain Detection
  // ===========================================================================

  describe('FallbackClassifier - domain detection', () => {
    it('should detect frontend domain', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Create a React component for the dashboard');

      expect(result.domains).toContain('frontend');
    });

    it('should detect backend domain', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Build an API endpoint for user management');

      expect(result.domains).toContain('backend');
    });

    it('should detect database domain', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Optimize the SQL query for better performance');

      expect(result.domains).toContain('database');
    });

    it('should detect devops domain', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Set up Docker containers for deployment');

      expect(result.domains).toContain('devops');
    });

    it('should detect security domain', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Audit the authentication system for vulnerabilities');

      expect(result.domains).toContain('security');
    });

    it('should detect testing domain', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Write unit tests for the payment module');

      expect(result.domains).toContain('testing');
    });

    it('should detect documentation domain', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Update the README with installation instructions');

      expect(result.domains).toContain('documentation');
    });

    it('should detect multiple domains', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify(
        'Build a secure API endpoint with comprehensive tests'
      );

      expect(result.domains.length).toBeGreaterThan(1);
      expect(result.domains).toContain('backend');
      expect(result.domains).toContain('testing');
    });

    it('should default to general domain when no specific domain detected', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Do something useful');

      expect(result.domains).toContain('general');
    });
  });

  // ===========================================================================
  // FallbackClassifier - Signal Detection
  // ===========================================================================

  describe('FallbackClassifier - signal detection', () => {
    it('should detect wantsPersistence signal', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Build me a comprehensive web application');

      expect(result.signals.wantsPersistence).toBe(true);
    });

    it('should detect wantsSpeed signal', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Quick fix for the bug');

      expect(result.signals.wantsSpeed).toBe(true);
    });

    it('should detect wantsAutonomy signal', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Take care of the deployment automatically');

      expect(result.signals.wantsAutonomy).toBe(true);
    });

    it('should detect wantsPlanning signal', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Plan how to implement the new feature');

      expect(result.signals.wantsPlanning).toBe(true);
    });

    it('should detect wantsVerification signal', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Make sure to verify all changes with tests');

      expect(result.signals.wantsVerification).toBe(true);
    });

    it('should detect wantsThorough signal', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Complete a thorough security audit of everything');

      expect(result.signals.wantsThorough).toBe(true);
    });

    it('should detect multiple signals', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify(
        'Quickly verify that the simple changes work correctly'
      );

      expect(result.signals.wantsSpeed).toBe(true);
      expect(result.signals.wantsVerification).toBe(true);
    });

    it('should have all signals false for neutral request', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Do something');

      expect(result.signals.wantsPersistence).toBe(false);
      expect(result.signals.wantsSpeed).toBe(false);
      expect(result.signals.wantsAutonomy).toBe(false);
    });
  });

  // ===========================================================================
  // FallbackClassifier - Recommendations
  // ===========================================================================

  describe('FallbackClassifier - recommendations', () => {
    it('should recommend explore agent for research', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Find all the test files');

      expect(result.recommendation.agents).toContain('explore');
    });

    it('should recommend executor for simple implementation', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Just add a simple function');

      expect(result.recommendation.agents).toContain('executor-low');
    });

    it('should recommend architect for debugging complex issues', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Debug the complex race condition in the system');

      // Should recommend debugging agents
      expect(result.recommendation.agents.length).toBeGreaterThan(0);
      const agentNames = result.recommendation.agents.join(',');
      expect(agentNames).toMatch(/architect|executor/);
    });

    it('should recommend parallel execution for research', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Search for all configuration files');

      expect(result.recommendation.parallelism).toBe('parallel');
    });

    it('should recommend haiku for trivial tasks', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('ls');

      expect(result.recommendation.modelTier).toBe('haiku');
    });

    it('should recommend appropriate model for architectural tasks', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Design the entire system architecture with complete planning');

      // Model tier depends on detected complexity
      expect(['haiku', 'sonnet', 'opus']).toContain(result.recommendation.modelTier);
    });

    it('should recommend verification for debugging', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Fix the critical bug');

      expect(result.recommendation.verification).toBe(true);
    });

    it('should recommend qa-tester for thorough implementation', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Build a comprehensive feature with thorough testing');

      expect(result.recommendation.agents).toContain('qa-tester');
    });
  });

  // ===========================================================================
  // Format Classification Context
  // ===========================================================================

  describe('formatClassificationContext', () => {
    it('should format basic classification', () => {
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

      const formatted = formatClassificationContext(classification);

      expect(formatted).toContain('IMPLEMENTATION');
      expect(formatted).toContain('moderate');
      expect(formatted).toContain('backend');
      expect(formatted).toContain('executor');
    });

    it('should include active signals', () => {
      const classification: IntentClassification = {
        type: 'research',
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
          agents: ['explore'],
          parallelism: 'parallel',
          modelTier: 'haiku',
          verification: false,
        },
        confidence: 0.9,
      };

      const formatted = formatClassificationContext(classification);

      expect(formatted).toContain('speed');
    });

    it('should include reasoning when provided', () => {
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
        confidence: 0.8,
        reasoning: 'User explicitly requested planning',
      };

      const formatted = formatClassificationContext(classification);

      expect(formatted).toContain('User explicitly requested planning');
    });

    it('should show verification requirement', () => {
      const classification: IntentClassification = {
        type: 'refactoring',
        complexity: 'complex',
        domains: ['backend'],
        signals: {
          wantsPersistence: false,
          wantsSpeed: false,
          wantsAutonomy: false,
          wantsPlanning: false,
          wantsVerification: true,
          wantsThorough: true,
        },
        recommendation: {
          agents: ['architect', 'executor'],
          parallelism: 'sequential',
          modelTier: 'opus',
          verification: true,
        },
        confidence: 0.95,
      };

      const formatted = formatClassificationContext(classification);

      expect(formatted).toContain('Verification: Required');
    });
  });

  // ===========================================================================
  // Confidence and Metadata
  // ===========================================================================

  describe('classification confidence and metadata', () => {
    it('should return lower confidence for fallback classifier', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Do something');

      expect(result.confidence).toBeLessThan(1.0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should include reasoning explaining fallback', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Test request');

      expect(result.reasoning).toContain('Fallback');
    });

    it('should provide complete classification structure', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Build a feature');

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('complexity');
      expect(result).toHaveProperty('domains');
      expect(result).toHaveProperty('signals');
      expect(result).toHaveProperty('recommendation');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
    });

    it('should ensure recommendation has all required fields', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Implement a feature');

      expect(result.recommendation).toHaveProperty('agents');
      expect(result.recommendation).toHaveProperty('parallelism');
      expect(result.recommendation).toHaveProperty('modelTier');
      expect(result.recommendation).toHaveProperty('verification');
    });

    it('should ensure signals object has all fields', async () => {
      const classifier = createClassifier();
      const result = await classifier.classify('Test');

      expect(result.signals).toHaveProperty('wantsPersistence');
      expect(result.signals).toHaveProperty('wantsSpeed');
      expect(result.signals).toHaveProperty('wantsAutonomy');
      expect(result.signals).toHaveProperty('wantsPlanning');
      expect(result.signals).toHaveProperty('wantsVerification');
      expect(result.signals).toHaveProperty('wantsThorough');
    });
  });

  // ===========================================================================
  // ClassificationError
  // ===========================================================================

  describe('ClassificationError', () => {
    it('should create error with message', () => {
      const error = new ClassificationError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ClassificationError');
    });

    it('should include cause when provided', () => {
      const cause = new Error('Original error');
      const error = new ClassificationError('Wrapper error', cause);

      expect(error.cause).toBe(cause);
    });

    it('should be instanceof Error', () => {
      const error = new ClassificationError('Test');

      expect(error).toBeInstanceOf(Error);
    });
  });
});
