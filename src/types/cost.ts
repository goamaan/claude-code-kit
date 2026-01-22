/**
 * Cost tracking types
 * Defines cost entry and summary structures
 */

import type { ModelName } from './config.js';

// =============================================================================
// Cost Entry
// =============================================================================

export interface CostEntry {
  /** Unique entry ID */
  id: string;

  /** Timestamp of the entry */
  timestamp: Date;

  /** Session ID this entry belongs to */
  sessionId: string;

  /** Model used */
  model: ModelName;

  /** Token usage */
  tokens: {
    /** Input/prompt tokens */
    input: number;

    /** Output/completion tokens */
    output: number;

    /** Cache read tokens (if applicable) */
    cacheRead?: number;

    /** Cache write tokens (if applicable) */
    cacheWrite?: number;

    /** Total tokens */
    total: number;
  };

  /** Cost in USD */
  cost: {
    /** Input token cost */
    input: number;

    /** Output token cost */
    output: number;

    /** Cache cost (if applicable) */
    cache?: number;

    /** Total cost */
    total: number;
  };

  /** Operation type */
  operation: 'chat' | 'tool_use' | 'subagent' | 'other';

  /** Tool name if operation is 'tool_use' */
  toolName?: string;

  /** Agent type if operation is 'subagent' */
  agentType?: string;

  /** Profile active at time of entry */
  profile?: string;

  /** Project path (if in project context) */
  project?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Cost Summary
// =============================================================================

export interface CostSummary {
  /** Time period for this summary */
  period: {
    start: Date;
    end: Date;
    type: 'hour' | 'day' | 'week' | 'month' | 'custom';
  };

  /** Total token usage */
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };

  /** Total cost in USD */
  cost: {
    input: number;
    output: number;
    cache: number;
    total: number;
  };

  /** Number of entries */
  entryCount: number;

  /** Number of sessions */
  sessionCount: number;

  /** Breakdown by model */
  byModel: Record<ModelName, {
    tokens: {
      input: number;
      output: number;
      total: number;
    };
    cost: {
      total: number;
    };
    entryCount: number;
  }>;

  /** Breakdown by operation type */
  byOperation: Record<string, {
    tokens: {
      total: number;
    };
    cost: {
      total: number;
    };
    entryCount: number;
  }>;

  /** Breakdown by profile */
  byProfile: Record<string, {
    tokens: {
      total: number;
    };
    cost: {
      total: number;
    };
    entryCount: number;
  }>;

  /** Breakdown by project */
  byProject: Record<string, {
    tokens: {
      total: number;
    };
    cost: {
      total: number;
    };
    entryCount: number;
  }>;

  /** Budget status */
  budget?: {
    daily?: {
      limit: number;
      used: number;
      remaining: number;
      exceeded: boolean;
    };
    weekly?: {
      limit: number;
      used: number;
      remaining: number;
      exceeded: boolean;
    };
    monthly?: {
      limit: number;
      used: number;
      remaining: number;
      exceeded: boolean;
    };
  };

  /** Comparison with previous period */
  comparison?: {
    costChange: number;
    costChangePercent: number;
    tokenChange: number;
    tokenChangePercent: number;
  };
}

// =============================================================================
// Cost Query Options
// =============================================================================

export interface CostQueryOptions {
  /** Start date (inclusive) */
  startDate?: Date;

  /** End date (inclusive) */
  endDate?: Date;

  /** Filter by model */
  model?: ModelName[];

  /** Filter by operation type */
  operation?: string[];

  /** Filter by profile */
  profile?: string[];

  /** Filter by project */
  project?: string[];

  /** Filter by session ID */
  sessionId?: string;

  /** Maximum number of entries to return */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Sort order */
  sort?: {
    field: 'timestamp' | 'cost' | 'tokens';
    order: 'asc' | 'desc';
  };
}

// =============================================================================
// Cost Report Options
// =============================================================================

export interface CostReportOptions {
  /** Report period type */
  period: 'hour' | 'day' | 'week' | 'month' | 'custom';

  /** Custom start date (for 'custom' period) */
  startDate?: Date;

  /** Custom end date (for 'custom' period) */
  endDate?: Date;

  /** Include breakdowns */
  include?: {
    byModel?: boolean;
    byOperation?: boolean;
    byProfile?: boolean;
    byProject?: boolean;
    comparison?: boolean;
  };

  /** Output format */
  format?: 'json' | 'csv' | 'markdown' | 'table';
}

// =============================================================================
// Cost Pricing
// =============================================================================

export interface ModelPricing {
  /** Model name */
  model: ModelName;

  /** Cost per 1M input tokens */
  inputPer1M: number;

  /** Cost per 1M output tokens */
  outputPer1M: number;

  /** Cost per 1M cache read tokens */
  cacheReadPer1M?: number;

  /** Cost per 1M cache write tokens */
  cacheWritePer1M?: number;

  /** Effective date of this pricing */
  effectiveDate: Date;
}

export const DEFAULT_PRICING: Record<ModelName, ModelPricing> = {
  haiku: {
    model: 'haiku',
    inputPer1M: 0.25,
    outputPer1M: 1.25,
    cacheReadPer1M: 0.025,
    cacheWritePer1M: 0.30,
    effectiveDate: new Date('2024-01-01'),
  },
  sonnet: {
    model: 'sonnet',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    cacheReadPer1M: 0.30,
    cacheWritePer1M: 3.75,
    effectiveDate: new Date('2024-01-01'),
  },
  opus: {
    model: 'opus',
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    cacheReadPer1M: 1.50,
    cacheWritePer1M: 18.75,
    effectiveDate: new Date('2024-01-01'),
  },
};

// =============================================================================
// Cost Alert
// =============================================================================

export interface CostAlert {
  /** Alert ID */
  id: string;

  /** Alert type */
  type: 'budget_warning' | 'budget_exceeded' | 'unusual_usage' | 'rate_limit';

  /** Severity */
  severity: 'info' | 'warning' | 'error';

  /** Alert message */
  message: string;

  /** Timestamp */
  timestamp: Date;

  /** Related data */
  data?: {
    budget?: string;
    limit?: number;
    current?: number;
    threshold?: number;
  };

  /** Whether alert has been acknowledged */
  acknowledged: boolean;
}
