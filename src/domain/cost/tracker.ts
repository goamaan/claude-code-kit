/**
 * Cost Tracker Module
 * High-level API for cost tracking and budget management
 */

import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  CostEntry,
  CostSummary,
  ModelPricing,
  ModelName,
  TaskCostEntry,
} from '@/types/index.js';
import { DEFAULT_PRICING } from '@/types/index.js';
import { getGlobalConfigDir } from '@/utils/paths.js';
import { readJsonSafe, writeJson, exists } from '@/utils/fs.js';
import { createCostStorage, type CostStorage } from './storage.js';

// =============================================================================
// Interface
// =============================================================================

export interface CostTracker {
  /** Record a new cost entry */
  record(
    entry: Omit<CostEntry, 'timestamp' | 'cost' | 'id'>
  ): Promise<void>;

  /** Get cost summary for today */
  today(): Promise<CostSummary>;

  /** Get cost summary for this week */
  thisWeek(): Promise<CostSummary>;

  /** Get cost summary for this month */
  thisMonth(): Promise<CostSummary>;

  /** Get cost summary for a specific period */
  summary(period: 'day' | 'week' | 'month'): Promise<CostSummary>;

  /** Export cost data in specified format */
  export(format: 'csv' | 'json'): Promise<string>;

  /** Set a budget limit */
  setBudget(period: 'daily' | 'weekly' | 'monthly', amount: number): Promise<void>;

  /** Get current budget limits */
  getBudget(): Promise<{ daily?: number; weekly?: number; monthly?: number }>;

  /** Check if any budget is exceeded */
  checkBudget(): Promise<
    { exceeded: boolean; period: string; used: number; limit: number }[]
  >;

  /** Get raw entries for a date range */
  getEntries(start: Date, end: Date): Promise<CostEntry[]>;

  /** Update pricing configuration */
  setPricing(pricing: Record<ModelName, Partial<ModelPricing>>): Promise<void>;

  /** Get current pricing configuration */
  getPricing(): Promise<Record<ModelName, ModelPricing>>;

  /** Record cost for a specific task */
  recordTaskCost(entry: TaskCostEntry): Promise<void>;

  /** Get costs for all tasks in a swarm */
  getTaskCosts(swarmId: string): Promise<TaskCostEntry[]>;

  /** Get total cost for a swarm */
  getSwarmTotalCost(swarmId: string): Promise<number>;
}

// =============================================================================
// Constants
// =============================================================================

const BUDGET_FILE = 'cost-budget.json';
const PRICING_FILE = 'cost-pricing.json';
const TASK_COSTS_FILE = 'task-costs.json';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Calculate cost for a token usage entry
 */
function calculateCost(
  tokens: CostEntry['tokens'],
  model: ModelName,
  pricing: Record<ModelName, ModelPricing>
): CostEntry['cost'] {
  const modelPricing = pricing[model] ?? DEFAULT_PRICING[model];

  const inputCost = (tokens.input / 1_000_000) * modelPricing.inputPer1M;
  const outputCost = (tokens.output / 1_000_000) * modelPricing.outputPer1M;

  let cacheCost = 0;
  if (tokens.cacheRead !== undefined && modelPricing.cacheReadPer1M !== undefined) {
    cacheCost += (tokens.cacheRead / 1_000_000) * modelPricing.cacheReadPer1M;
  }
  if (tokens.cacheWrite !== undefined && modelPricing.cacheWritePer1M !== undefined) {
    cacheCost += (tokens.cacheWrite / 1_000_000) * modelPricing.cacheWritePer1M;
  }

  return {
    input: inputCost,
    output: outputCost,
    cache: cacheCost > 0 ? cacheCost : undefined,
    total: inputCost + outputCost + cacheCost,
  };
}

/**
 * Build a cost summary from entries
 */
function buildSummary(
  entries: CostEntry[],
  period: { start: Date; end: Date; type: CostSummary['period']['type'] }
): CostSummary {
  // Initialize accumulators
  const tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 };
  const cost = { input: 0, output: 0, cache: 0, total: 0 };
  const byModel: CostSummary['byModel'] = {} as CostSummary['byModel'];
  const byOperation: CostSummary['byOperation'] = {};
  const byProfile: CostSummary['byProfile'] = {};
  const byProject: CostSummary['byProject'] = {};
  const sessions = new Set<string>();

  for (const entry of entries) {
    // Aggregate tokens
    tokens.input += entry.tokens.input;
    tokens.output += entry.tokens.output;
    tokens.cacheRead += entry.tokens.cacheRead ?? 0;
    tokens.cacheWrite += entry.tokens.cacheWrite ?? 0;
    tokens.total += entry.tokens.total;

    // Aggregate costs
    cost.input += entry.cost.input;
    cost.output += entry.cost.output;
    cost.cache += entry.cost.cache ?? 0;
    cost.total += entry.cost.total;

    // Track sessions
    sessions.add(entry.sessionId);

    // By model
    if (!byModel[entry.model]) {
      byModel[entry.model] = {
        tokens: { input: 0, output: 0, total: 0 },
        cost: { total: 0 },
        entryCount: 0,
      };
    }
    byModel[entry.model].tokens.input += entry.tokens.input;
    byModel[entry.model].tokens.output += entry.tokens.output;
    byModel[entry.model].tokens.total += entry.tokens.total;
    byModel[entry.model].cost.total += entry.cost.total;
    byModel[entry.model].entryCount++;

    // By operation
    if (!byOperation[entry.operation]) {
      byOperation[entry.operation] = {
        tokens: { total: 0 },
        cost: { total: 0 },
        entryCount: 0,
      };
    }
    byOperation[entry.operation]!.tokens.total += entry.tokens.total;
    byOperation[entry.operation]!.cost.total += entry.cost.total;
    byOperation[entry.operation]!.entryCount++;

    // By profile
    if (entry.profile) {
      if (!byProfile[entry.profile]) {
        byProfile[entry.profile] = {
          tokens: { total: 0 },
          cost: { total: 0 },
          entryCount: 0,
        };
      }
      byProfile[entry.profile]!.tokens.total += entry.tokens.total;
      byProfile[entry.profile]!.cost.total += entry.cost.total;
      byProfile[entry.profile]!.entryCount++;
    }

    // By project
    if (entry.project) {
      if (!byProject[entry.project]) {
        byProject[entry.project] = {
          tokens: { total: 0 },
          cost: { total: 0 },
          entryCount: 0,
        };
      }
      byProject[entry.project]!.tokens.total += entry.tokens.total;
      byProject[entry.project]!.cost.total += entry.cost.total;
      byProject[entry.project]!.entryCount++;
    }
  }

  return {
    period,
    tokens,
    cost,
    entryCount: entries.length,
    sessionCount: sessions.size,
    byModel,
    byOperation,
    byProfile,
    byProject,
  };
}

// =============================================================================
// Implementation
// =============================================================================

export function createCostTracker(storage?: CostStorage, configDir?: string): CostTracker {
  const costStorage = storage ?? createCostStorage();

  /**
   * Get the config directory to use
   */
  function getConfigDir(): string {
    return configDir ?? getGlobalConfigDir();
  }

  /**
   * Get path to budget config file
   */
  function getBudgetPath(): string {
    return join(getConfigDir(), BUDGET_FILE);
  }

  /**
   * Get path to pricing config file
   */
  function getPricingPath(): string {
    return join(getConfigDir(), PRICING_FILE);
  }

  /**
   * Load pricing configuration
   */
  async function loadPricing(): Promise<Record<ModelName, ModelPricing>> {
    const pricingPath = getPricingPath();

    if (await exists(pricingPath)) {
      const custom = await readJsonSafe<Partial<Record<ModelName, ModelPricing>>>(pricingPath);
      if (custom) {
        return { ...DEFAULT_PRICING, ...custom };
      }
    }

    return { ...DEFAULT_PRICING };
  }

  /**
   * Record a new cost entry
   */
  async function record(
    entry: Omit<CostEntry, 'timestamp' | 'cost' | 'id'>
  ): Promise<void> {
    const pricing = await loadPricing();
    const cost = calculateCost(entry.tokens, entry.model, pricing);

    const fullEntry: CostEntry = {
      ...entry,
      id: randomUUID(),
      timestamp: new Date(),
      cost,
    };

    await costStorage.append(fullEntry);
  }

  /**
   * Get cost summary for today
   */
  async function today(): Promise<CostSummary> {
    const entries = await costStorage.getToday();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return buildSummary(entries, { start, end, type: 'day' });
  }

  /**
   * Get cost summary for this week
   */
  async function thisWeek(): Promise<CostSummary> {
    const entries = await costStorage.getThisWeek();
    const now = new Date();
    const dayOfWeek = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return buildSummary(entries, { start, end, type: 'week' });
  }

  /**
   * Get cost summary for this month
   */
  async function thisMonth(): Promise<CostSummary> {
    const entries = await costStorage.getThisMonth();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return buildSummary(entries, { start, end, type: 'month' });
  }

  /**
   * Get cost summary for a specific period
   */
  async function summary(period: 'day' | 'week' | 'month'): Promise<CostSummary> {
    switch (period) {
      case 'day':
        return today();
      case 'week':
        return thisWeek();
      case 'month':
        return thisMonth();
    }
  }

  /**
   * Export cost data in specified format
   */
  async function exportData(format: 'csv' | 'json'): Promise<string> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const entries = await costStorage.query({ start: startOfMonth, end: now });

    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    }

    // CSV format
    const headers = [
      'id',
      'timestamp',
      'sessionId',
      'model',
      'operation',
      'tokens_input',
      'tokens_output',
      'tokens_total',
      'cost_input',
      'cost_output',
      'cost_total',
      'profile',
      'project',
    ];

    const rows = entries.map((e) => [
      e.id,
      e.timestamp.toISOString(),
      e.sessionId,
      e.model,
      e.operation,
      e.tokens.input,
      e.tokens.output,
      e.tokens.total,
      e.cost.input.toFixed(6),
      e.cost.output.toFixed(6),
      e.cost.total.toFixed(6),
      e.profile ?? '',
      e.project ?? '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Set a budget limit
   */
  async function setBudget(
    period: 'daily' | 'weekly' | 'monthly',
    amount: number
  ): Promise<void> {
    const budgetPath = getBudgetPath();
    const existing = (await readJsonSafe<Record<string, number>>(budgetPath)) ?? {};

    existing[period] = amount;
    await writeJson(budgetPath, existing);
  }

  /**
   * Get current budget limits
   */
  async function getBudget(): Promise<{
    daily?: number;
    weekly?: number;
    monthly?: number;
  }> {
    const budgetPath = getBudgetPath();
    const budget = await readJsonSafe<{
      daily?: number;
      weekly?: number;
      monthly?: number;
    }>(budgetPath);

    return budget ?? {};
  }

  /**
   * Check if any budget is exceeded
   */
  async function checkBudget(): Promise<
    { exceeded: boolean; period: string; used: number; limit: number }[]
  > {
    const budget = await getBudget();
    const results: { exceeded: boolean; period: string; used: number; limit: number }[] = [];

    if (budget.daily !== undefined) {
      const daySummary = await today();
      results.push({
        exceeded: daySummary.cost.total > budget.daily,
        period: 'daily',
        used: daySummary.cost.total,
        limit: budget.daily,
      });
    }

    if (budget.weekly !== undefined) {
      const weekSummary = await thisWeek();
      results.push({
        exceeded: weekSummary.cost.total > budget.weekly,
        period: 'weekly',
        used: weekSummary.cost.total,
        limit: budget.weekly,
      });
    }

    if (budget.monthly !== undefined) {
      const monthSummary = await thisMonth();
      results.push({
        exceeded: monthSummary.cost.total > budget.monthly,
        period: 'monthly',
        used: monthSummary.cost.total,
        limit: budget.monthly,
      });
    }

    return results;
  }

  /**
   * Get raw entries for a date range
   */
  async function getEntries(start: Date, end: Date): Promise<CostEntry[]> {
    return costStorage.query({ start, end });
  }

  /**
   * Update pricing configuration
   */
  async function setPricing(
    pricing: Record<ModelName, Partial<ModelPricing>>
  ): Promise<void> {
    const pricingPath = getPricingPath();
    const existing: Record<ModelName, ModelPricing> =
      (await readJsonSafe<Record<ModelName, ModelPricing>>(pricingPath)) ?? { ...DEFAULT_PRICING };

    for (const [model, updates] of Object.entries(pricing) as [ModelName, Partial<ModelPricing>][]) {
      const base = existing[model] ?? DEFAULT_PRICING[model];
      existing[model] = {
        ...base,
        ...updates,
      };
    }

    await writeJson(pricingPath, existing);
  }

  /**
   * Get current pricing configuration
   */
  async function getPricing(): Promise<Record<ModelName, ModelPricing>> {
    return loadPricing();
  }

  /**
   * Record cost for a specific task
   */
  async function recordTaskCost(entry: TaskCostEntry): Promise<void> {
    const taskCostsPath = join(getConfigDir(), TASK_COSTS_FILE);
    const existing = (await readJsonSafe<Record<string, TaskCostEntry[]>>(taskCostsPath)) ?? {};

    // Group by swarm (using first part of taskId before colon, or 'default')
    const swarmId = entry.taskId.includes(':')
      ? entry.taskId.split(':')[0]!
      : 'default';

    if (!existing[swarmId]) {
      existing[swarmId] = [];
    }
    existing[swarmId].push(entry);

    await writeJson(taskCostsPath, existing);
  }

  /**
   * Get costs for all tasks in a swarm
   */
  async function getTaskCosts(swarmId: string): Promise<TaskCostEntry[]> {
    const taskCostsPath = join(getConfigDir(), TASK_COSTS_FILE);
    const existing = (await readJsonSafe<Record<string, TaskCostEntry[]>>(taskCostsPath)) ?? {};
    return existing[swarmId] ?? [];
  }

  /**
   * Get total cost for a swarm
   */
  async function getSwarmTotalCost(swarmId: string): Promise<number> {
    const costs = await getTaskCosts(swarmId);
    return costs.reduce((sum, entry) => sum + entry.cost, 0);
  }

  return {
    record,
    today,
    thisWeek,
    thisMonth,
    summary,
    export: exportData,
    setBudget,
    getBudget,
    checkBudget,
    getEntries,
    setPricing,
    getPricing,
    recordTaskCost,
    getTaskCosts,
    getSwarmTotalCost,
  };
}
