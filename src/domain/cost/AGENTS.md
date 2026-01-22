<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-01-22 -->

# src/domain/cost/

## Purpose

Cost tracking for API usage. Records token consumption per model/operation/profile/project, calculates costs against pricing tiers, tracks budgets (daily/weekly/monthly), and provides aggregated summaries with breakdowns.

## Key Files

| File | Purpose |
|------|---------|
| `tracker.ts` | High-level cost tracking API (489 lines) |
| `storage.ts` | Persistent storage for cost entries |
| `index.ts` | Public API exports |

## For AI Agents

### Working In This Directory

- **Entry structure**: `{ id, timestamp, sessionId, model, operation, tokens: { input, output, cacheRead?, cacheWrite?, total }, cost: { input, output, cache?, total }, profile?, project? }`
- **Token costs**: Calculated from pricing tables (per 1M tokens): inputPer1M, outputPer1M, cacheReadPer1M, cacheWritePer1M
- **Storage format**: Line-delimited JSON files organized by date (YYYY-MM-DD.jsonl) in `~/.claude-code-kit/cost/`
- **Budget tracking**: Store limits in `cost-budget.json` (daily, weekly, monthly), check against actual usage
- **Pricing config**: Custom pricing overrides in `cost-pricing.json`, merge with DEFAULT_PRICING
- **Aggregation periods**: Today, this week (Sunday-Saturday), this month (1st-last day)
- **Summary structure**: `{ period, tokens, cost, entryCount, sessionCount, byModel, byOperation, byProfile, byProject }`
- **Export formats**: CSV (headers + rows) or JSON (raw entries array)
- **UUID generation**: Each entry gets unique ID via `randomUUID()`

### Testing Requirements

- Test cost calculation with various token counts and pricing tiers
- Test budget checking with exceeded/within limits scenarios
- Test aggregation for different time periods (day/week/month)
- Test pricing override merging with defaults
- Test summary breakdowns (byModel, byOperation, etc.)
- Test export in both CSV and JSON formats
- Mock storage layer for unit tests
- Test edge cases: cache tokens, multiple models, missing optional fields

### Common Patterns

- **Record flow**: `record(entry)` → load pricing → `calculateCost()` → add timestamp/ID/cost → `storage.append()`
- **Cost calculation**: `(tokens.input / 1_000_000) * pricing.inputPer1M + (tokens.output / 1_000_000) * pricing.outputPer1M + cache costs`
- **Summary building**: Load entries → aggregate tokens/costs → group by model/operation/profile/project → return structured summary
- **Budget check**: Load budget limits → get summaries for each period → compare usage vs limit → return exceeded status
- **Pricing merge**: Load custom pricing → merge with DEFAULT_PRICING → return merged object
- **Storage queries**: `getToday()`, `getThisWeek()`, `getThisMonth()`, `query({ start, end })`
- **Session tracking**: Use `sessionId` to group entries and count unique sessions in summary

## Dependencies

### Internal
- `@/types` - CostEntry, CostSummary, ModelPricing, ModelName, DEFAULT_PRICING types
- `@/utils/paths` - Path resolution (getGlobalConfigDir)
- `@/utils/fs` - File operations (readJsonSafe, writeJson, exists)
- `storage.ts` - CostStorage interface for persistence

### External
- `node:path` - Path manipulation (join)
- `node:crypto` - UUID generation (randomUUID)
- `node:fs/promises` - Async file system operations
- JSON parsing/serialization for entries and config

<!-- MANUAL -->
