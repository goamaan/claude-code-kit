---
description: >
  Natural language to SQL/database query translation and result analysis. Use when the user
  says "query", "SQL", "BigQuery", "run a query", "analytics", "data analysis", "find in
  database", wants metrics, asks about data patterns, or describes data they want to extract.
user-invocable: true
allowed-tools: [Bash, Read, Glob, Grep, AskUserQuestion]
---

# Query Skill

Translate natural language questions into database queries, execute them safely, and analyze results.

## When to Activate

- User says "query", "SQL", "run a query", "analytics", "data analysis"
- User says "BigQuery", "find in database", "look up in the database"
- User asks about metrics, counts, aggregations, or data patterns
- User describes data they want to extract from a database

## Workflow

### Step 1: Detect Database

Check for database CLIs and configuration:

```bash
# Check CLIs in PATH
which psql mysql sqlite3 bq mongosh 2>/dev/null

# Check for config files
ls .env prisma/schema.prisma database.yml config/database.yml knexfile.* drizzle.config.* 2>/dev/null
```

If a `.env` file exists, check for DATABASE_URL or similar connection strings (display only the host/db name, never the password).

If no database is detected, ask the user which database to use.

### Step 2: Discover Schema

Run the appropriate introspection command:

| Database | Command |
|----------|---------|
| PostgreSQL | `psql -c '\dt' -c '\d+ <table>'` |
| MySQL | `mysql -e 'SHOW TABLES; DESCRIBE <table>'` |
| SQLite | `sqlite3 <db> '.tables' '.schema <table>'` |
| BigQuery | `bq ls <dataset>; bq show <dataset>.<table>` |
| MongoDB | `mongosh --eval 'db.getCollectionNames()'` |
| Prisma | `cat prisma/schema.prisma` |
| Drizzle | Read the schema files from drizzle config |

### Step 3: Translate Natural Language to Query

Convert the user's question into the appropriate query language.

Guidelines:
- Default to `LIMIT 100` on SELECT queries to prevent runaway results
- Use appropriate joins, not subqueries where possible
- Include comments explaining the query logic
- For aggregations, include appropriate GROUP BY and ORDER BY

### Step 4: Review Gate (MANDATORY)

**NEVER execute a query without showing it to the user first.**

Present the generated query using AskUserQuestion:
- Option 1: "Run this query"
- Option 2: "Modify the query"
- Option 3: "Cancel"

For read-only SELECT queries, this is informational.
For write operations (INSERT, UPDATE, DELETE), require explicit confirmation.

**Refuse DROP/DELETE/TRUNCATE without explicit user confirmation and a clear reason.**

### Step 5: Execute

Run the query via the appropriate CLI:

```bash
# PostgreSQL
psql -c "SELECT ..." --csv

# MySQL
mysql -e "SELECT ..." --batch

# SQLite
sqlite3 <db> "SELECT ..."

# BigQuery
bq query --use_legacy_sql=false "SELECT ..."
```

Capture output and handle errors gracefully.

### Step 6: Analyze Results

Interpret the results:
- Summarize key findings
- Highlight outliers or unexpected patterns
- Suggest follow-up queries if relevant
- Format large result sets as readable tables

### Step 7: Store Useful Queries (Optional)

If the query is non-trivial and likely reusable:

```bash
mkdir -p .claude/queries
```

Save as `.claude/queries/<slug>.sql` with a comment header explaining what it does.

## Output Format

```
## Query Results

### Query
```sql
[the executed query]
```

### Results
[formatted table or summary]

### Analysis
[key findings, patterns, outliers]

### Suggested Follow-ups
- [follow-up query 1]
- [follow-up query 2]
```

## Safety Rules

1. **Always show the query before executing** — no exceptions
2. **Default LIMIT 100** on SELECT queries
3. **Refuse destructive operations** (DROP, TRUNCATE) without explicit confirmation
4. **Never display credentials** — mask passwords in connection strings
5. **Read-only by default** — only execute writes when explicitly requested
6. **Timeout protection** — set reasonable timeouts on long-running queries

## Anti-Patterns

1. **Executing without review** — Always show the query first
2. **No LIMIT on selects** — Default to LIMIT 100
3. **Exposing credentials** — Mask all passwords and tokens
4. **Guessing schema** — Always introspect first
5. **Raw output dump** — Summarize and analyze, don't just paste
