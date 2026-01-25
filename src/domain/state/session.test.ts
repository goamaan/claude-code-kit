import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  saveSessionState,
  loadSessionState,
  clearSessionState,
  type SessionState,
} from './session.js';

describe('session state management', () => {
  const testStateDir = join(process.cwd(), '.claudeops', 'state');
  const testStateFile = join(testStateDir, 'session.json');

  beforeEach(() => {
    // Clean up before each test
    if (existsSync(testStateFile)) {
      rmSync(testStateFile);
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (existsSync(testStateFile)) {
      rmSync(testStateFile);
    }
  });

  describe('saveSessionState', () => {
    it('should create state directory if it does not exist', () => {
      if (existsSync(testStateDir)) {
        rmSync(testStateDir, { recursive: true });
      }

      const state: SessionState = {
        timestamp: '2024-01-24T12:00:00.000Z',
        prompt: 'test prompt',
        classification: {
          type: 'code_change',
          complexity: 'medium',
          confidence: 0.95,
        },
      };

      saveSessionState(state);

      expect(existsSync(testStateDir)).toBe(true);
      expect(existsSync(testStateFile)).toBe(true);
    });

    it('should save session state to file', () => {
      const state: SessionState = {
        timestamp: '2024-01-24T12:00:00.000Z',
        prompt: 'fix the bug',
        classification: {
          type: 'code_change',
          complexity: 'medium',
          confidence: 0.95,
          reasoning: 'detected code modification intent',
        },
        routing: {
          agent: 'executor',
          model: 'sonnet',
          skills: ['debugging'],
        },
      };

      saveSessionState(state);

      expect(existsSync(testStateFile)).toBe(true);
    });

    it('should overwrite existing state', () => {
      const state1: SessionState = {
        timestamp: '2024-01-24T12:00:00.000Z',
        prompt: 'first prompt',
        classification: {
          type: 'question',
          complexity: 'low',
          confidence: 0.9,
        },
      };

      const state2: SessionState = {
        timestamp: '2024-01-24T12:01:00.000Z',
        prompt: 'second prompt',
        classification: {
          type: 'code_change',
          complexity: 'high',
          confidence: 0.98,
        },
      };

      saveSessionState(state1);
      saveSessionState(state2);

      const loaded = loadSessionState();
      expect(loaded).toBeDefined();
      expect(loaded?.prompt).toBe('second prompt');
      expect(loaded?.classification.type).toBe('code_change');
    });
  });

  describe('loadSessionState', () => {
    it('should return null if state file does not exist', () => {
      const loaded = loadSessionState();
      expect(loaded).toBeNull();
    });

    it('should load saved session state', () => {
      const state: SessionState = {
        timestamp: '2024-01-24T12:00:00.000Z',
        prompt: 'test prompt',
        classification: {
          type: 'code_change',
          complexity: 'medium',
          confidence: 0.95,
          reasoning: 'test reasoning',
        },
        routing: {
          agent: 'executor',
          model: 'sonnet',
          skills: ['debugging', 'refactoring'],
        },
      };

      saveSessionState(state);
      const loaded = loadSessionState();

      expect(loaded).toBeDefined();
      expect(loaded?.timestamp).toBe(state.timestamp);
      expect(loaded?.prompt).toBe(state.prompt);
      expect(loaded?.classification).toEqual(state.classification);
      expect(loaded?.routing).toEqual(state.routing);
    });

    it('should handle malformed JSON gracefully', () => {
      // Ensure directory exists
      if (!existsSync(testStateDir)) {
        mkdirSync(testStateDir, { recursive: true });
      }

      // Write invalid JSON
      const fs = require('fs');
      fs.writeFileSync(testStateFile, 'invalid json{', 'utf-8');

      const loaded = loadSessionState();
      expect(loaded).toBeNull();
    });
  });

  describe('clearSessionState', () => {
    it('should remove state file if it exists', () => {
      const state: SessionState = {
        timestamp: '2024-01-24T12:00:00.000Z',
        prompt: 'test prompt',
        classification: {
          type: 'code_change',
          complexity: 'medium',
          confidence: 0.95,
        },
      };

      saveSessionState(state);
      expect(existsSync(testStateFile)).toBe(true);

      clearSessionState();
      expect(existsSync(testStateFile)).toBe(false);
    });

    it('should not throw if state file does not exist', () => {
      expect(() => clearSessionState()).not.toThrow();
    });
  });

  describe('state structure', () => {
    it('should preserve all classification fields', () => {
      const state: SessionState = {
        timestamp: '2024-01-24T12:00:00.000Z',
        prompt: 'complex prompt',
        classification: {
          type: 'refactor',
          complexity: 'high',
          confidence: 0.88,
          reasoning: 'multi-file refactoring detected',
          extra: 'additional field',
        },
      };

      saveSessionState(state);
      const loaded = loadSessionState();

      expect(loaded?.classification.extra).toBe('additional field');
    });

    it('should preserve all routing fields', () => {
      const state: SessionState = {
        timestamp: '2024-01-24T12:00:00.000Z',
        prompt: 'test',
        classification: {
          type: 'code_change',
          complexity: 'low',
          confidence: 0.9,
        },
        routing: {
          agent: 'executor',
          model: 'haiku',
          skills: ['quick-fix'],
          custom: 'custom value',
        },
      };

      saveSessionState(state);
      const loaded = loadSessionState();

      expect(loaded?.routing?.custom).toBe('custom value');
    });
  });
});
