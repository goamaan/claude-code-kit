---
name: research
description: Parallel research orchestration with multiple scientist agents
auto_trigger:
  - research
  - analyze data
  - statistical analysis
  - data science
  - explore dataset
allowed_tools:
  - Task
  - Read
  - Glob
  - Grep
  - Bash
  - TodoWrite
---

# Research Skill

Parallel research orchestration using multiple scientist agents for comprehensive data analysis and investigation.

## Purpose

Research mode provides:
- Parallel analysis from multiple angles
- Statistical rigor
- Hypothesis testing
- Comprehensive data exploration
- Evidence-based conclusions

## When to Activate

Activate when user says:
- "research [topic]"
- "analyze this data"
- "statistical analysis of"
- "data science task"
- "explore this dataset"
- "investigate patterns in"

## Research Methodology

### The Research Framework

```
1. QUESTION:    What are we trying to learn?
2. EXPLORE:     Understand the data/domain
3. HYPOTHESIZE: Form testable hypotheses
4. ANALYZE:     Test hypotheses with data
5. SYNTHESIZE:  Combine findings
6. CONCLUDE:    Draw actionable insights
```

## Workflow

### Phase 1: Research Question Definition

1. **Clarify the question:**
   ```
   What specifically are we trying to learn?
   What decisions will this inform?
   What would a useful answer look like?
   ```

2. **Scope the research:**
   ```
   What data is available?
   What time frame?
   What constraints?
   ```

### Phase 2: Data Exploration

Spawn scientist agents for parallel exploration:

```
# Explore multiple dimensions in parallel
Task(subagent="scientist", prompt="Explore data structure and quality")
Task(subagent="scientist", prompt="Identify key variables and distributions")
Task(subagent="scientist", prompt="Check for missing data and anomalies")
```

### Phase 3: Hypothesis Generation

Based on exploration:

```
Task(subagent_type="oh-my-claudecode:scientist-high",
     model="opus",
     prompt="Based on exploration, generate testable hypotheses")
```

### Phase 4: Parallel Analysis

Run multiple analyses in parallel:

```
# Different analysis angles
Task(subagent="scientist", prompt="Test hypothesis 1 with [method]")
Task(subagent="scientist", prompt="Test hypothesis 2 with [method]")
Task(subagent="scientist", prompt="Look for confounding factors")
Task(subagent="scientist", prompt="Validate assumptions")
```

### Phase 5: Synthesis

Combine findings:

```
Task(subagent_type="oh-my-claudecode:scientist-high",
     model="opus",
     prompt="Synthesize findings from all analyses into conclusions")
```

## Agent Delegation

| Task | Agent | Model |
|------|-------|-------|
| Quick data check | scientist-low | haiku |
| Standard analysis | scientist | sonnet |
| Complex analysis | scientist-high | opus |
| Hypothesis generation | scientist-high | opus |
| Synthesis | scientist-high | opus |

### Scientist Agent Tiers

**scientist-low (haiku):**
- Quick data inspection
- Simple statistics
- Data quality checks

**scientist (sonnet):**
- Exploratory analysis
- Standard statistical tests
- Visualization suggestions

**scientist-high (opus):**
- Complex hypothesis testing
- Advanced statistical methods
- Causal analysis
- Synthesis and conclusions

## Analysis Patterns

### Exploratory Data Analysis
```
parallel_spawn([
    Task(scientist, "Describe data shape and types"),
    Task(scientist, "Calculate summary statistics"),
    Task(scientist, "Identify missing values"),
    Task(scientist, "Check for outliers"),
    Task(scientist, "Visualize distributions"),
])
```

### Hypothesis Testing
```
1. State null and alternative hypotheses
2. Choose appropriate test
3. Check assumptions
4. Calculate test statistic
5. Interpret p-value
6. Draw conclusion
```

### Comparative Analysis
```
parallel_spawn([
    Task(scientist, "Compare group A vs B on metric X"),
    Task(scientist, "Compare group A vs B on metric Y"),
    Task(scientist, "Check for interaction effects"),
])
```

### Trend Analysis
```
parallel_spawn([
    Task(scientist, "Identify time-based trends"),
    Task(scientist, "Check for seasonality"),
    Task(scientist, "Detect change points"),
])
```

## Output Format

### Research Report
```
## Research Report: [Topic]

### Executive Summary
[1-2 paragraph summary of key findings]

### Research Question
[Clear statement of what we investigated]

### Data Overview
- Source: [Where data came from]
- Size: [N observations, M variables]
- Time frame: [Date range]
- Quality: [Any issues noted]

### Methodology
[Analytical approaches used]

### Findings

#### Finding 1: [Title]
**Evidence:** [Statistical evidence]
**Confidence:** [High/Medium/Low]
**Implications:** [What this means]

#### Finding 2: [Title]
[Same structure]

### Statistical Details
| Analysis | Result | p-value | Effect Size |
|----------|--------|---------|-------------|
| [Test 1] | [Result] | [p] | [d/r/etc] |

### Limitations
- [Limitation 1]
- [Limitation 2]

### Recommendations
1. [Actionable recommendation]
2. [Actionable recommendation]

### Next Steps
- [Suggested follow-up research]
```

### Quick Analysis Format
```
## Quick Analysis

**Question:** [What we asked]
**Answer:** [Direct answer]
**Evidence:** [Key supporting stat]
**Confidence:** [High/Medium/Low]
```

## Statistical Rigor

### Always Report
- Sample sizes
- Confidence intervals
- Effect sizes (not just p-values)
- Assumptions checked

### Red Flags to Address
- Small sample sizes
- Multiple comparisons
- Missing data
- Selection bias
- Confounding variables

### Interpretation Guidelines
```
p < 0.05: Statistically significant
p < 0.01: Highly significant
But always consider:
- Effect size (practical significance)
- Sample size
- Context
```

## Tool Usage

### For Data Analysis
```bash
# Python for statistics
python analysis.py

# R for statistics
Rscript analysis.R

# SQL for data extraction
sqlite3 database.db < query.sql
```

### For Visualization
```
Describe visualizations for user to create
Or generate code that produces them
```

## Anti-Patterns to Avoid

1. **Conclusion before analysis**
   - BAD: "The data shows..." without actually analyzing
   - GOOD: Run analysis, then conclude

2. **Cherry-picking results**
   - BAD: Only report favorable findings
   - GOOD: Report all results, including null findings

3. **Over-claiming**
   - BAD: "This proves causation"
   - GOOD: "This correlation suggests..."

4. **Ignoring assumptions**
   - BAD: Run t-test without checking normality
   - GOOD: Verify assumptions first

5. **No effect sizes**
   - BAD: "p < 0.05, significant!"
   - GOOD: "p < 0.05, d = 0.3 (small effect)"

## Combining with Other Skills

- **deepsearch + research**: Find data, then analyze
- **autopilot + research**: Automated analysis pipeline
- **ralph + research**: Persist until analysis complete

## Success Criteria

Research complete when:
- [ ] Question clearly answered
- [ ] Statistical evidence provided
- [ ] Confidence levels stated
- [ ] Limitations acknowledged
- [ ] Actionable recommendations given
- [ ] Reproducible methods documented
