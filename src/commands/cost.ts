/**
 * Cost tracking commands
 * cops cost [today|week|budget|export]
 */

import { defineCommand } from 'citty';
import * as output from '../ui/output.js';
import { loadConfig } from '../core/config/loader.js';
import { getGlobalConfigDir } from '../utils/paths.js';
import { exists, readFile, writeFile } from '../utils/fs.js';
import { join } from 'node:path';
import type { CostEntry, CostSummary, ModelName } from '../types/index.js';
import { DEFAULT_PRICING } from '../types/cost.js';

// =============================================================================
// Helper Functions
// =============================================================================

const COST_DATA_FILE = 'cost-data.json';

interface CostData {
  entries: CostEntry[];
  lastUpdated: string;
}

async function loadCostData(): Promise<CostData> {
  const dataPath = join(getGlobalConfigDir(), COST_DATA_FILE);

  if (!(await exists(dataPath))) {
    return { entries: [], lastUpdated: new Date().toISOString() };
  }

  try {
    const content = await readFile(dataPath);
    const data = JSON.parse(content) as CostData;
    // Parse dates
    data.entries = data.entries.map(e => ({
      ...e,
      timestamp: new Date(e.timestamp),
    }));
    return data;
  } catch {
    return { entries: [], lastUpdated: new Date().toISOString() };
  }
}

// Reserved for future use when cost data is written
// async function saveCostData(data: CostData): Promise<void> {
//   const dataDir = getGlobalConfigDir();
//   await ensureDir(dataDir);
//   const dataPath = join(dataDir, COST_DATA_FILE);
//   await writeFile(dataPath, JSON.stringify(data, null, 2));
// }

function filterEntriesByDate(entries: CostEntry[], start: Date, end: Date): CostEntry[] {
  return entries.filter(e => {
    const timestamp = new Date(e.timestamp);
    return timestamp >= start && timestamp <= end;
  });
}

function calculateSummary(entries: CostEntry[], start: Date, end: Date, periodType: CostSummary['period']['type']): CostSummary {
  const filteredEntries = filterEntriesByDate(entries, start, end);

  const summary: CostSummary = {
    period: { start, end, type: periodType },
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    cost: { input: 0, output: 0, cache: 0, total: 0 },
    entryCount: filteredEntries.length,
    sessionCount: new Set(filteredEntries.map(e => e.sessionId)).size,
    byModel: {} as CostSummary['byModel'],
    byOperation: {},
    byProfile: {},
    byProject: {},
  };

  for (const entry of filteredEntries) {
    // Aggregate tokens
    summary.tokens.input += entry.tokens.input;
    summary.tokens.output += entry.tokens.output;
    summary.tokens.cacheRead += entry.tokens.cacheRead ?? 0;
    summary.tokens.cacheWrite += entry.tokens.cacheWrite ?? 0;
    summary.tokens.total += entry.tokens.total;

    // Aggregate cost
    summary.cost.input += entry.cost.input;
    summary.cost.output += entry.cost.output;
    summary.cost.cache += entry.cost.cache ?? 0;
    summary.cost.total += entry.cost.total;

    // By model
    const model = entry.model;
    if (!summary.byModel[model]) {
      summary.byModel[model] = {
        tokens: { input: 0, output: 0, total: 0 },
        cost: { total: 0 },
        entryCount: 0,
      };
    }
    summary.byModel[model]!.tokens.input += entry.tokens.input;
    summary.byModel[model]!.tokens.output += entry.tokens.output;
    summary.byModel[model]!.tokens.total += entry.tokens.total;
    summary.byModel[model]!.cost.total += entry.cost.total;
    summary.byModel[model]!.entryCount++;

    // By operation
    const op = entry.operation;
    if (!summary.byOperation[op]) {
      summary.byOperation[op] = { tokens: { total: 0 }, cost: { total: 0 }, entryCount: 0 };
    }
    summary.byOperation[op]!.tokens.total += entry.tokens.total;
    summary.byOperation[op]!.cost.total += entry.cost.total;
    summary.byOperation[op]!.entryCount++;

    // By profile
    if (entry.profile) {
      if (!summary.byProfile[entry.profile]) {
        summary.byProfile[entry.profile] = { tokens: { total: 0 }, cost: { total: 0 }, entryCount: 0 };
      }
      summary.byProfile[entry.profile]!.tokens.total += entry.tokens.total;
      summary.byProfile[entry.profile]!.cost.total += entry.cost.total;
      summary.byProfile[entry.profile]!.entryCount++;
    }

    // By project
    if (entry.project) {
      if (!summary.byProject[entry.project]) {
        summary.byProject[entry.project] = { tokens: { total: 0 }, cost: { total: 0 }, entryCount: 0 };
      }
      summary.byProject[entry.project]!.tokens.total += entry.tokens.total;
      summary.byProject[entry.project]!.cost.total += entry.cost.total;
      summary.byProject[entry.project]!.entryCount++;
    }
  }

  return summary;
}

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// =============================================================================
// Default Command (Today's Summary)
// =============================================================================

const defaultRun = async (args: { json: boolean }) => {
  const config = await loadConfig();
  const data = await loadCostData();

  const today = new Date();
  const start = getStartOfDay(today);
  const end = getEndOfDay(today);

  const summary = calculateSummary(data.entries, start, end, 'day');

  if (args.json) {
    output.json(summary);
    return;
  }

  output.header('Cost Summary - Today');

  output.kv('Total cost', output.formatCurrency(summary.cost.total));
  output.kv('Total tokens', summary.tokens.total.toLocaleString());
  output.kv('Sessions', summary.sessionCount.toString());
  output.kv('Requests', summary.entryCount.toString());

  // Budget status
  if (config.cost.budget_daily) {
    const used = summary.cost.total;
    const limit = config.cost.budget_daily;
    const remaining = limit - used;
    const percent = (used / limit * 100).toFixed(1);

    console.log();
    output.header('Daily Budget');
    output.kv('Limit', output.formatCurrency(limit));
    output.kv('Used', `${output.formatCurrency(used)} (${percent}%)`);
    output.kv('Remaining', output.formatCurrency(remaining));

    if (remaining < 0) {
      output.warn('Daily budget exceeded!');
    } else if (remaining < limit * 0.2) {
      output.warn('Approaching daily budget limit');
    }
  }

  // By model breakdown
  const modelNames = Object.keys(summary.byModel) as ModelName[];
  if (modelNames.length > 0) {
    console.log();
    output.header('By Model');
    output.table(
      modelNames.map(model => ({
        model,
        cost: output.formatCurrency(summary.byModel[model]!.cost.total),
        tokens: summary.byModel[model]!.tokens.total.toLocaleString(),
        requests: summary.byModel[model]!.entryCount,
      })),
      [
        { key: 'model', header: 'Model', width: 10 },
        { key: 'cost', header: 'Cost', width: 12, align: 'right' },
        { key: 'tokens', header: 'Tokens', width: 15, align: 'right' },
        { key: 'requests', header: 'Requests', width: 10, align: 'right' },
      ]
    );
  }

  if (data.entries.length === 0) {
    console.log();
    output.info('No cost data recorded yet.');
    output.dim('Cost tracking integrates with Claude Code usage data.');
  }
};

// =============================================================================
// Today Command
// =============================================================================

const todayCommand = defineCommand({
  meta: {
    name: 'today',
    description: 'Show detailed cost for today',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    await defaultRun(args);
  },
});

// =============================================================================
// Week Command
// =============================================================================

const weekCommand = defineCommand({
  meta: {
    name: 'week',
    description: 'Show weekly cost breakdown',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const config = await loadConfig();
    const data = await loadCostData();

    const today = new Date();
    const start = getStartOfWeek(today);
    const end = getEndOfDay(today);

    const summary = calculateSummary(data.entries, start, end, 'week');

    if (args.json) {
      output.json(summary);
      return;
    }

    output.header('Cost Summary - This Week');

    output.kv('Period', `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
    output.kv('Total cost', output.formatCurrency(summary.cost.total));
    output.kv('Total tokens', summary.tokens.total.toLocaleString());
    output.kv('Sessions', summary.sessionCount.toString());
    output.kv('Requests', summary.entryCount.toString());

    // Weekly budget
    if (config.cost.budget_weekly) {
      const used = summary.cost.total;
      const limit = config.cost.budget_weekly;
      const remaining = limit - used;
      const percent = (used / limit * 100).toFixed(1);

      console.log();
      output.header('Weekly Budget');
      output.kv('Limit', output.formatCurrency(limit));
      output.kv('Used', `${output.formatCurrency(used)} (${percent}%)`);
      output.kv('Remaining', output.formatCurrency(remaining));

      if (remaining < 0) {
        output.warn('Weekly budget exceeded!');
      }
    }

    // Daily breakdown
    console.log();
    output.header('Daily Breakdown');

    const dailyData: Array<{ day: string; cost: string; tokens: string; requests: number }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d > today) break;

      const dayStart = getStartOfDay(d);
      const dayEnd = getEndOfDay(d);
      const dayEntries = filterEntriesByDate(data.entries, dayStart, dayEnd);

      const dayCost = dayEntries.reduce((sum, e) => sum + e.cost.total, 0);
      const dayTokens = dayEntries.reduce((sum, e) => sum + e.tokens.total, 0);

      dailyData.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        cost: output.formatCurrency(dayCost),
        tokens: dayTokens.toLocaleString(),
        requests: dayEntries.length,
      });
    }

    output.table(dailyData, [
      { key: 'day', header: 'Day', width: 20 },
      { key: 'cost', header: 'Cost', width: 12, align: 'right' },
      { key: 'tokens', header: 'Tokens', width: 15, align: 'right' },
      { key: 'requests', header: 'Requests', width: 10, align: 'right' },
    ]);
  },
});

// =============================================================================
// Budget Command
// =============================================================================

const budgetCommand = defineCommand({
  meta: {
    name: 'budget',
    description: 'Manage cost budgets',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const config = await loadConfig();
    const data = await loadCostData();

    const today = new Date();

    // Calculate usage for each period
    const dayStart = getStartOfDay(today);
    const dayEnd = getEndOfDay(today);
    const weekStart = getStartOfWeek(today);
    const monthStart = getStartOfMonth(today);

    const daySummary = calculateSummary(data.entries, dayStart, dayEnd, 'day');
    const weekSummary = calculateSummary(data.entries, weekStart, dayEnd, 'week');
    const monthSummary = calculateSummary(data.entries, monthStart, dayEnd, 'month');

    const budgetInfo = {
      daily: config.cost.budget_daily ? {
        limit: config.cost.budget_daily,
        used: daySummary.cost.total,
        remaining: config.cost.budget_daily - daySummary.cost.total,
        exceeded: daySummary.cost.total > config.cost.budget_daily,
      } : null,
      weekly: config.cost.budget_weekly ? {
        limit: config.cost.budget_weekly,
        used: weekSummary.cost.total,
        remaining: config.cost.budget_weekly - weekSummary.cost.total,
        exceeded: weekSummary.cost.total > config.cost.budget_weekly,
      } : null,
      monthly: config.cost.budget_monthly ? {
        limit: config.cost.budget_monthly,
        used: monthSummary.cost.total,
        remaining: config.cost.budget_monthly - monthSummary.cost.total,
        exceeded: monthSummary.cost.total > config.cost.budget_monthly,
      } : null,
    };

    if (args.json) {
      output.json(budgetInfo);
      return;
    }

    output.header('Budget Status');

    if (!budgetInfo.daily && !budgetInfo.weekly && !budgetInfo.monthly) {
      output.info('No budgets configured.');
      output.info('Set budgets in your config:');
      console.log();
      output.box([
        '[cost]',
        'tracking = true',
        'budget_daily = 10.00',
        'budget_weekly = 50.00',
        'budget_monthly = 200.00',
      ], 'config.toml');
      return;
    }

    const printBudget = (label: string, info: typeof budgetInfo.daily) => {
      if (!info) return;

      const percent = (info.used / info.limit * 100).toFixed(1);

      console.log();
      output.label(`${label}:`, '');
      output.kv('  Limit', output.formatCurrency(info.limit), 2);
      output.kv('  Used', `${output.formatCurrency(info.used)} (${percent}%)`, 2);
      output.kv('  Remaining', output.formatCurrency(info.remaining), 2);

      if (info.exceeded) {
        output.warn('  Budget exceeded!');
      } else if (info.remaining < info.limit * 0.2) {
        output.warn('  Approaching limit');
      }
    };

    printBudget('Daily Budget', budgetInfo.daily);
    printBudget('Weekly Budget', budgetInfo.weekly);
    printBudget('Monthly Budget', budgetInfo.monthly);
  },
});

// =============================================================================
// Export Command
// =============================================================================

const exportCommand = defineCommand({
  meta: {
    name: 'export',
    description: 'Export cost data',
  },
  args: {
    format: {
      type: 'string',
      alias: 'f',
      description: 'Output format (json, csv)',
      default: 'json',
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'Output file path',
    },
    start: {
      type: 'string',
      description: 'Start date (YYYY-MM-DD)',
    },
    end: {
      type: 'string',
      description: 'End date (YYYY-MM-DD)',
    },
  },
  async run({ args }) {
    const data = await loadCostData();

    let entries = data.entries;

    // Apply date filters
    if (args.start) {
      const startDate = new Date(args.start);
      entries = entries.filter(e => new Date(e.timestamp) >= startDate);
    }
    if (args.end) {
      const endDate = new Date(args.end);
      endDate.setHours(23, 59, 59, 999);
      entries = entries.filter(e => new Date(e.timestamp) <= endDate);
    }

    let content: string;

    if (args.format === 'csv') {
      // CSV format
      const headers = [
        'id', 'timestamp', 'sessionId', 'model', 'operation',
        'inputTokens', 'outputTokens', 'totalTokens',
        'inputCost', 'outputCost', 'totalCost',
        'profile', 'project',
      ];
      const rows = entries.map(e => [
        e.id,
        new Date(e.timestamp).toISOString(),
        e.sessionId,
        e.model,
        e.operation,
        e.tokens.input,
        e.tokens.output,
        e.tokens.total,
        e.cost.input,
        e.cost.output,
        e.cost.total,
        e.profile ?? '',
        e.project ?? '',
      ].join(','));

      content = [headers.join(','), ...rows].join('\n');
    } else {
      // JSON format
      content = JSON.stringify(entries, null, 2);
    }

    if (args.output) {
      await writeFile(args.output, content);
      output.success(`Exported ${entries.length} entries to: ${args.output}`);
    } else {
      console.log(content);
    }
  },
});

// =============================================================================
// Pricing Command
// =============================================================================

const pricingCommand = defineCommand({
  meta: {
    name: 'pricing',
    description: 'Show current model pricing',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    if (args.json) {
      output.json(DEFAULT_PRICING);
      return;
    }

    output.header('Model Pricing (per 1M tokens)');

    output.table(
      Object.values(DEFAULT_PRICING).map(p => ({
        model: p.model,
        input: `$${p.inputPer1M.toFixed(2)}`,
        output: `$${p.outputPer1M.toFixed(2)}`,
        cacheRead: p.cacheReadPer1M ? `$${p.cacheReadPer1M.toFixed(2)}` : '-',
        cacheWrite: p.cacheWritePer1M ? `$${p.cacheWritePer1M.toFixed(2)}` : '-',
      })),
      [
        { key: 'model', header: 'Model', width: 10 },
        { key: 'input', header: 'Input', width: 10, align: 'right' },
        { key: 'output', header: 'Output', width: 10, align: 'right' },
        { key: 'cacheRead', header: 'Cache Read', width: 12, align: 'right' },
        { key: 'cacheWrite', header: 'Cache Write', width: 12, align: 'right' },
      ]
    );

    console.log();
    output.dim('Pricing as of January 2024. Subject to change.');
  },
});

// =============================================================================
// Main Command
// =============================================================================

export default defineCommand({
  meta: {
    name: 'cost',
    description: 'Cost tracking and budgets',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  subCommands: {
    today: todayCommand,
    week: weekCommand,
    budget: budgetCommand,
    export: exportCommand,
    pricing: pricingCommand,
  },
  async run({ args }) {
    // Default: show today's summary
    await defaultRun(args);
  },
});
