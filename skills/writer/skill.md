---
name: writer
description: Documentation and technical writing. Clear, comprehensive documentation for code and systems.
autoTrigger:
  - write documentation
  - document this
  - add comments
  - create readme
  - write docs for
domains:
  - documentation
model: haiku
userInvocable: true
---

# Writer Skill

Clear, comprehensive technical documentation and code comments.

## Purpose

The writer skill provides:
- README files
- API documentation
- Code comments
- Architecture docs
- User guides
- Migration guides
- Changelog entries

## When to Use

Use writer (haiku-tier) for:
- Creating documentation files
- Adding code comments
- Writing README content
- API documentation
- Usage examples
- Migration guides

## When NOT to Use

- Code implementation → Use `executor`
- Code review → Use `architect` or `code-review`
- Analysis → Use `analyze`

## Documentation Protocol

### 1. Understand Content
```
1. Read relevant code
2. Identify audience
3. Determine scope
4. Gather examples
```

### 2. Write Clearly
```
1. Start with overview
2. Provide examples
3. Document edge cases
4. Include troubleshooting
```

### 3. Format Properly
```
1. Use proper markdown
2. Add code blocks with syntax highlighting
3. Structure with headers
4. Add links/references
```

## Documentation Types

### README.md
```markdown
# Project Name

Brief description of what this project does.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

```bash
npm install project-name
```

## Usage

```typescript
import { feature } from 'project-name';

const result = feature.doSomething();
```

## API Reference

### `feature.doSomething(options)`

Does something useful.

**Parameters:**
- `options.param1` (string): Description
- `options.param2` (number, optional): Description

**Returns:** `ResultType` - Description

**Example:**
```typescript
const result = feature.doSomething({
  param1: 'value',
  param2: 42
});
```

## Configuration

[Configuration options]

## Contributing

[Contribution guidelines]

## License

[License information]
```

### Code Comments
```typescript
/**
 * Validates user input and creates a new user account.
 *
 * @param userData - User registration data
 * @param userData.email - Must be valid email format
 * @param userData.displayName - Display name for the user
 *
 * @returns Promise resolving to created user object
 *
 * @throws {ValidationError} If input validation fails
 * @throws {DuplicateError} If email already exists
 *
 * @example
 * ```typescript
 * const user = await createUser({
 *   email: 'user@example.com',
 *   displayName: 'John Doe'
 * });
 * ```
 */
async function createUser(userData: UserInput): Promise<User> {
  // Implementation
}
```

### API Documentation
```markdown
## API Endpoints

### POST /api/users

Create a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "id": "123",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Errors:**
- `400 Bad Request` - Invalid input
- `409 Conflict` - Email already exists
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X POST http://api.example.com/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"John"}'
```
```

### Architecture Documentation
```markdown
# System Architecture

## Overview

[High-level description]

## Components

### Frontend
- Technology: React + TypeScript
- Location: `src/frontend/`
- Responsibilities:
  - User interface
  - State management
  - API communication

### Backend
- Technology: Node.js + Express
- Location: `src/backend/`
- Responsibilities:
  - API endpoints
  - Business logic
  - Database access

### Database
- Technology: PostgreSQL
- Schema: `database/schema.sql`
- Responsibilities:
  - Data persistence
  - Relational integrity

## Data Flow

```
User → Frontend → API → Backend → Database
                   ↓
                  Auth
```

## Key Design Decisions

### Decision 1: [Decision Name]
- **Context:** [Why decision was needed]
- **Choice:** [What was chosen]
- **Rationale:** [Why this choice]
- **Trade-offs:** [What was sacrificed]
```

### Migration Guide
```markdown
# Migration Guide: v1 to v2

## Breaking Changes

### 1. API Endpoint Changes

**Before (v1):**
```typescript
GET /users/:id
```

**After (v2):**
```typescript
GET /api/v2/users/:id
```

**Migration:**
Update all API calls to include `/api/v2/` prefix.

### 2. Configuration Format

**Before (v1):**
```json
{
  "port": 3000
}
```

**After (v2):**
```json
{
  "server": {
    "port": 3000
  }
}
```

**Migration:**
Nest configuration under `server` key.

## Step-by-Step Migration

1. **Update dependencies**
   ```bash
   npm install package@2.0.0
   ```

2. **Update configuration**
   - Rename `config.json` to `config.v1.json`
   - Create new `config.json` with v2 format
   - Run migration script: `npm run migrate-config`

3. **Update code**
   - Replace old API calls with new format
   - Update imports: `import { X } from 'old'` → `import { X } from 'new'`

4. **Test**
   ```bash
   npm test
   ```

5. **Deploy**
   - Deploy to staging first
   - Verify functionality
   - Deploy to production

## Rollback Plan

If issues occur:
1. Revert to v1 package: `npm install package@1.x`
2. Restore old config: `mv config.v1.json config.json`
3. Redeploy previous version
```

## Writing Style

### Principles
1. **Clear** - Use simple language
2. **Concise** - No unnecessary words
3. **Complete** - Cover all necessary details
4. **Correct** - Accurate and tested
5. **Consistent** - Follow project conventions

### Voice
- Active voice preferred
- Second person for instructions ("You can...")
- Present tense

### Structure
- Start with overview
- Use headers for organization
- Provide examples
- Include troubleshooting

## Anti-Patterns to Avoid

1. **No examples**
   - BAD: Only describing what function does
   - GOOD: Include usage examples

2. **Outdated docs**
   - BAD: Documentation doesn't match code
   - GOOD: Update docs with code changes

3. **Assuming knowledge**
   - BAD: Using jargon without explanation
   - GOOD: Define terms, provide context

4. **Wall of text**
   - BAD: Long paragraphs without structure
   - GOOD: Headers, bullets, code blocks

## Success Criteria

Documentation completes when:
- [ ] Content is clear and accurate
- [ ] Examples provided and tested
- [ ] Proper markdown formatting
- [ ] Covers all necessary topics
- [ ] Audience-appropriate level
