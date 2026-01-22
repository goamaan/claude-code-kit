# Cost Tracking Guide

Claude Code Kit includes comprehensive cost tracking to help you monitor API usage and control spending across Claude models. This guide covers everything you need to know about tracking costs, setting budgets, and understanding your usage patterns.

## Overview

Cost tracking automatically monitors:

- **API token usage** (input, output, cache read/write)
- **Cost in USD** for each API call
- **Usage by model** (Haiku, Sonnet, Opus)
- **Usage by operation** (chat, tool use, subagent calls)
- **Usage by profile** (different Claude Code configurations)
- **Usage by project** (per-project cost attribution)
- **Session-based tracking** (linked to Claude Code sessions)

All cost data is stored locally on your machine in `~/.claude-code-kit/costs/` directory.

## Quick Start

### View Today's Usage

```bash
cck cost
# or
cck cost today
```

Shows your current day's API usage, token count, and budget status.

### View This Week's Usage

```bash
cck cost week
```

Displays daily breakdown for the current week with comparison to your weekly budget.

### Check Budget Status

```bash
cck cost budget
```

Shows all configured budgets (daily, weekly, monthly) and how much you've used.

### See Model Pricing

```bash
cck cost pricing
```

Displays current per-token pricing for all available Claude models.

## Configuration

### Enable Cost Tracking

Cost tracking is configured in your Claude Code Kit config file (typically `~/.claude-code-kit/config.toml`):

```toml
[cost]
tracking = true
```

### Set Budgets

Configure spending limits to stay within your budget:

```toml
[cost]
tracking = true
budget_daily = 10.0      # Maximum $10.00 per day
budget_weekly = 50.0     # Maximum $50.00 per week
budget_monthly = 200.0   # Maximum $200.00 per month
```

All budget values are in USD. Set any combination of daily, weekly, or monthly budgets. Leave a budget unset to disable alerts for that period.

**Budget Alerts:**
- **80% threshold**: Warning displayed when approaching limit
- **100% threshold**: Alert displayed when budget exceeded
- Alerts appear in your cost reports and during operations

## Models and Pricing

Claude Code Kit supports three models with different capabilities and costs:

### Model Overview

| Model | Speed | Capability | Best For | Input Cost* | Output Cost* |
|-------|-------|-----------|----------|------------|--------------|
| **Haiku** | Fastest | Basic reasoning | Simple tasks, lookups, quick operations | $0.25/M tokens | $1.25/M tokens |
| **Sonnet** | Balanced | Strong reasoning | Standard tasks, most operations | $3.00/M tokens | $15.00/M tokens |
| **Opus** | Slowest | Advanced reasoning | Complex analysis, deep debugging | $15.00/M tokens | $75.00/M tokens |

*Pricing per 1 million tokens as of January 2024

### Full Pricing Table

```bash
cck cost pricing
```

Shows detailed pricing including cache operation costs:

```
Model Pricing (per 1M tokens)
────────────────────────────────────────────────────────
Model     │ Input   │ Output   │ Cache Read │ Cache Write
────────────────────────────────────────────────────────
haiku     │ $0.25   │ $1.25    │ $0.025     │ $0.30
sonnet    │ $3.00   │ $15.00   │ $0.30      │ $3.75
opus      │ $15.00  │ $75.00   │ $1.50      │ $18.75
────────────────────────────────────────────────────────
```

### Model Selection Strategy

**Use Haiku for:**
- Simple lookups (definitions, current information)
- Quick searches in documentation
- Basic file reading
- Simple text transformations
- Status checks and information gathering

**Use Sonnet for:**
- General feature implementation
- Standard code review
- Documentation writing
- Most day-to-day tasks
- Balanced speed and capability

**Use Opus for:**
- Complex debugging and investigation
- Architectural decisions
- Deep code analysis
- Long-context requirements
- Advanced reasoning tasks

## Commands

### `cck cost` (Default)

Show today's cost summary.

**Options:**
- `--json` - Output as JSON for scripting

**Example:**
```bash
cck cost
cck cost --json
```

**Output:**
```
Cost Summary - Today
─────────────────────────────────────
Total cost:        $3.12
Total tokens:      625,000
Sessions:          2
Requests:          15

Daily Budget:
  Limit:           $10.00
  Used:            $3.12 (31%)
  Remaining:       $6.88

By Model:
  Model    │ Cost    │ Tokens     │ Requests
  ─────────┼─────────┼────────────┼──────────
  haiku    │ $0.12   │ 125,000    │ 8
  sonnet   │ $2.25   │ 450,000    │ 5
  opus     │ $0.75   │ 50,000     │ 2
```

### `cck cost today`

Detailed breakdown for the current day.

Same as `cck cost` but explicitly named.

**Options:**
- `--json` - Output as JSON

### `cck cost week`

Show weekly cost breakdown with daily details.

Displays total weekly cost, weekly budget status, and a day-by-day breakdown showing cost, tokens, and requests for each day of the week.

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
cck cost week
```

**Output:**
```
Cost Summary - This Week
─────────────────────────────────────
Period:            Jan 15 - Jan 21
Total cost:        $18.75
Total tokens:      1,250,000
Sessions:          10
Requests:          42

Weekly Budget:
  Limit:           $50.00
  Used:            $18.75 (38%)
  Remaining:       $31.25

Daily Breakdown:
  Day           │ Cost    │ Tokens     │ Requests
  ──────────────┼─────────┼────────────┼──────────
  Mon, Jan 15   │ $2.50   │ 175,000    │ 6
  Tue, Jan 16   │ $2.75   │ 195,000    │ 7
  Wed, Jan 17   │ $3.25   │ 210,000    │ 8
  Thu, Jan 18   │ $4.00   │ 250,000    │ 9
  Fri, Jan 19   │ $3.50   │ 220,000    │ 7
  Sat, Jan 20   │ $1.50   │ 100,000    │ 3
  Sun, Jan 21   │ $1.25   │ 100,000    │ 2
```

### `cck cost month`

Show monthly cost breakdown.

Displays total monthly cost, monthly budget status, and trends compared to the previous month.

**Options:**
- `--json` - Output as JSON

### `cck cost budget`

Display all configured budgets and current usage.

Shows usage for daily, weekly, and monthly budgets with remaining balance and alert status.

**Options:**
- `--json` - Output as JSON

**Example:**
```bash
cck cost budget
```

**Output:**
```
Budget Status:

Daily Budget:
  Limit:           $10.00
  Used:            $3.12 (31%)
  Remaining:       $6.88

Weekly Budget:
  Limit:           $50.00
  Used:            $18.75 (38%)
  Remaining:       $31.25

Monthly Budget:
  Limit:           $200.00
  Used:            $45.00 (23%)
  Remaining:       $155.00
```

### `cck cost export`

Export cost data for analysis in spreadsheets or other tools.

**Options:**
- `-f, --format` (default: json) - Output format: `json` or `csv`
- `-o, --output` - File path to save export (if omitted, prints to stdout)
- `--start YYYY-MM-DD` - Filter from start date
- `--end YYYY-MM-DD` - Filter to end date

**Examples:**

```bash
# Export all cost data as JSON
cck cost export --format json --output costs.json

# Export data as CSV for spreadsheet
cck cost export --format csv --output costs.csv

# Export January 2024 data
cck cost export --format csv --start 2024-01-01 --end 2024-01-31 --output jan2024.csv

# Print to stdout
cck cost export --format json
```

**CSV Format:**

```csv
id,timestamp,sessionId,model,operation,inputTokens,outputTokens,totalTokens,inputCost,outputCost,totalCost,profile,project
abc123,2024-01-15T10:30:00Z,sess-001,haiku,chat,1500,2000,3500,0.000375,0.0025,0.002875,default,
def456,2024-01-15T10:35:00Z,sess-001,sonnet,tool_use,5000,3000,8000,0.015,0.045,0.06,default,~/projects/myapp
```

### `cck cost pricing`

Show current model pricing.

Displays pricing per 1 million tokens for each Claude model, including cache operation costs.

**Options:**
- `--json` - Output as JSON

## Understanding Cost Reports

### Cost Summary Structure

Every cost report includes these sections:

#### Overview
- **Total cost**: USD spent in the period
- **Total tokens**: Input + output tokens used
- **Sessions**: Number of Claude Code sessions
- **Requests**: Number of API calls

#### Budget Status
If budgets are configured:
- **Limit**: Your budget for this period
- **Used**: Amount spent (shown as percentage)
- **Remaining**: Budget remaining
- **Alert**: Warning if approaching or exceeding limit

#### By Model Breakdown
Cost and token usage for each model:
- Haiku, Sonnet, Opus
- Useful for identifying which models you use most
- Can help optimize model selection

#### By Operation Breakdown
Usage categorized by operation type:
- **chat**: Standard Claude conversations
- **tool_use**: Function/tool calls
- **subagent**: Delegated agent tasks
- **other**: Miscellaneous operations

#### By Profile Breakdown
Usage across different profiles (if using multiple configs).

#### By Project Breakdown
Cost attribution by project directory (if tracking projects).

#### Comparison
For weekly and monthly reports:
- Change in cost compared to previous period
- Change in token count
- Percentage changes

### Reading the Metrics

**Token Usage:**
- More tokens = more computation
- Output tokens typically cost more than input tokens
- Cache operations significantly reduce token costs

**Cost Distribution:**
- Look at "By Model" to see cost split across models
- Look at "By Operation" to identify expensive operation types
- Use "By Project" to understand project-specific costs

**Budget Tracking:**
- Daily budget: Short-term spending control
- Weekly budget: Better captures usage patterns
- Monthly budget: Overall cost management

## Best Practices

### 1. Set Realistic Budgets

Start by observing your usage for a few days, then set budgets:

```bash
cck cost today
cck cost week
```

**Recommended starting budgets:**
- **Daily**: 1.5x to 2x your average daily spend
- **Weekly**: 8x to 10x your average daily spend
- **Monthly**: 4x your average weekly spend

**Example progression:**
- Average daily: $3.00
- Daily budget: $5.00
- Weekly budget: $30.00
- Monthly budget: $140.00

### 2. Review Trends Weekly

Check your weekly summary every Sunday:

```bash
cck cost week
```

Look for:
- Days with unusually high costs
- Model selection patterns
- Seasonal or project-based variations

### 3. Optimize Model Selection

Monitor which models you're using and costs:

```bash
cck cost --json | grep -A 10 byModel
```

**Optimization strategies:**
- Use Haiku for simple, fast tasks (saves 95% vs Opus)
- Reserve Sonnet for standard work
- Use Opus only for genuinely complex tasks
- Estimate token count before using Opus for large contexts

**Example savings:**
```
Task: Simple lookup
Haiku:  1,000 tokens × $0.0005 avg = $0.0005  ✓
Sonnet: 1,000 tokens × $0.018 avg  = $0.018   (36x more)
Opus:   1,000 tokens × $0.045 avg  = $0.045   (90x more)
```

### 4. Export for Analysis

Export monthly reports for deeper analysis:

```bash
# Export all January data as CSV
cck cost export --format csv \
  --start 2024-01-01 \
  --end 2024-01-31 \
  --output jan2024.csv
```

Use spreadsheet tools to:
- Create cost trend charts
- Identify peak usage days
- Analyze cost per project
- Compare model efficiency

### 5. Monitor Budget Alerts

Pay attention to warning messages:

```
⚠️  Approaching daily budget limit (80% used)
⚠️  Daily budget exceeded!
```

When approaching limits:
- Switch to Haiku for remaining tasks
- Pause non-critical work
- Review upcoming high-cost operations

### 6. Document Project Costs

Use project tracking to understand cost per project:

```bash
# View costs by project
cck cost --json | jq '.byProject'
```

Set up multiple configs per project if needed to track costs separately.

## Troubleshooting

### No Cost Data Showing

**Problem:** `cck cost` shows "No cost data recorded yet"

**Causes:**
- Cost tracking is disabled in config
- No Claude Code operations have been performed yet
- Cost data file is corrupted or missing

**Solutions:**
1. Verify tracking is enabled:
   ```bash
   grep -A 2 "\[cost\]" ~/.claude-code-kit/config.toml
   ```
   Should show `tracking = true`

2. Perform a Claude Code operation (chat, file read, etc.)

3. Check cost data file exists:
   ```bash
   ls -la ~/.claude-code-kit/costs/
   ```

### Budget Not Alerting

**Problem:** Budget alerts don't appear even when exceeded

**Solutions:**
1. Verify budget is configured:
   ```bash
   cck cost budget
   ```

2. Budgets are checked when:
   - Running `cck cost` command
   - Running `cck cost budget` command
   - At end of Claude Code operations (if integration enabled)

3. For continuous monitoring, run:
   ```bash
   watch -n 300 'cck cost budget'  # Check every 5 minutes
   ```

### Exports Not Working

**Problem:** `cck cost export` produces empty or incorrect output

**Solutions:**
1. Verify date format (must be YYYY-MM-DD):
   ```bash
   cck cost export --start 2024-01-15 --end 2024-01-21
   ```

2. Check that data exists for date range:
   ```bash
   cck cost --json | jq '.period'
   ```

3. Try without date filters:
   ```bash
   cck cost export --format csv --output all.csv
   ```

## Advanced Usage

### Integration with Scripts

Use JSON output for automation:

```bash
# Get today's total cost as plain number
COST=$(cck cost --json | jq -r '.cost.total')
echo "Today's cost: \$$COST"

# Alert if exceeding limit
LIMIT=10.00
if (( $(echo "$COST > $LIMIT" | bc -l) )); then
  echo "WARNING: Daily limit exceeded!"
fi
```

### Cost Per Operation

Analyze cost breakdown by operation:

```bash
cck cost --json | jq '.byOperation'
```

**Output example:**
```json
{
  "chat": {
    "tokens": { "total": 500000 },
    "cost": { "total": 7.5 },
    "entryCount": 25
  },
  "tool_use": {
    "tokens": { "total": 100000 },
    "cost": { "total": 1.5 },
    "entryCount": 8
  },
  "subagent": {
    "tokens": { "total": 25000 },
    "cost": { "total": 0.3 },
    "entryCount": 2
  }
}
```

### Monthly Analysis

Create a monthly report:

```bash
#!/bin/bash
MONTH=$1  # e.g., "2024-01"
START="${MONTH}-01"
END="${MONTH}-31"

cck cost export --format csv \
  --start "$START" \
  --end "$END" \
  --output "${MONTH}_costs.csv"

echo "✓ Exported $MONTH costs to ${MONTH}_costs.csv"
```

### Profile Comparison

Compare costs across different profiles:

```bash
# If using multiple profiles
cck cost --json | jq '.byProfile | to_entries | sort_by(-.value.cost.total)'
```

## Cost Data Storage

### Location

All cost data is stored locally in:
```
~/.claude-code-kit/costs/
```

This directory contains:
- `cost-data.json` - Raw cost entries
- `.gitignore` - Prevents accidental commit of cost data

### Data Structure

Each cost entry includes:
- **id**: Unique identifier
- **timestamp**: When the operation occurred
- **sessionId**: Claude Code session ID
- **model**: Which Claude model (haiku, sonnet, opus)
- **tokens**: Input, output, and cache token counts
- **cost**: Input, output, and cache costs in USD
- **operation**: Type (chat, tool_use, subagent, other)
- **profile**: Configuration profile name
- **project**: Project directory if tracked
- **metadata**: Additional context

### Data Privacy

Cost data:
- Is stored only on your machine
- Is never sent to Anthropic (except actual API calls)
- Can be safely backed up or archived
- Should be protected like any financial data

### Exporting Cost Data

Regularly export cost data for backup:

```bash
# Monthly backup
cck cost export --format json --output "backup-$(date +%Y-%m).json"

# Or use CSV for spreadsheet import
cck cost export --format csv --output "costs-$(date +%Y-%m).csv"
```

## FAQ

**Q: Does cost tracking affect performance?**

A: No. Cost tracking is asynchronous and has minimal impact on Claude Code Kit's operation.

**Q: Can I access cost data programmatically?**

A: Yes. Export as JSON and parse with your preferred tools:
```bash
cck cost export --format json | jq '.entries'
```

**Q: How often is cost data updated?**

A: Cost data is logged immediately when operations complete. Run `cck cost` anytime to view current costs.

**Q: Can I reset cost history?**

A: Cost history cannot be selectively deleted through the CLI. If needed, you can:
1. Archive the cost data file
2. Let it rebuild from current date forward

**Q: Are cached token costs lower?**

A: Yes. Cache operations cost significantly less:
- Haiku cache read: $0.025/M (vs $0.25/M input normal)
- Sonnet cache read: $0.30/M (vs $3.00/M input normal)
- Opus cache read: $1.50/M (vs $15.00/M input normal)

Cache hits can reduce costs by 10-90% depending on cache usage.

**Q: How accurate is the pricing?**

A: Pricing matches Anthropic's official Claude API pricing as of January 2024. Pricing may change; check `cck cost pricing` for current rates and visit [Anthropic's pricing page](https://www.anthropic.com/pricing) for the latest.

**Q: Can I budget by project?**

A: Currently, budgets are global (daily/weekly/monthly). Future versions may support per-project budgets. In the meantime, export data by date range to analyze project-specific costs.

**Q: What happens when I exceed a budget?**

A: Current behavior:
- Warning displayed in cost reports
- No automatic stopping of operations

Future versions may support:
- Hard limits with operation blocking
- Escalating alerts
- Per-project limits

## Next Steps

1. **Set up budgets**: Configure `[cost]` section in your config
2. **Monitor usage**: Run `cck cost` daily for the first week
3. **Optimize models**: Review usage by model and adjust selection
4. **Export reports**: Create monthly reports for analysis
5. **Refine budgets**: Adjust limits based on observed patterns

For more help:
- Check config documentation for additional cost options
- Run `cck --help` to see all available commands
- Inspect raw cost data: `cck cost export --format json`
