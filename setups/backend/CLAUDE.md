# Backend Development Setup

Optimized for API development with security and scalability focus.

## Technology Stack

- **Languages**: TypeScript, Python, Go
- **Frameworks**: Express, Fastify, FastAPI, Gin
- **Databases**: PostgreSQL, MongoDB, Redis
- **Message Queues**: RabbitMQ, Kafka, Redis Pub/Sub

## Available Agents

This setup includes specialized agents automatically selected based on your needs:

- **executor** - API implementation and bug fixes
- **architect** - System design, debugging, and performance analysis
- **security** - Security audits, vulnerability scanning, and threat modeling
- **qa-tester** - API testing, integration tests, and test automation
- **planner** - Architecture planning and requirements analysis

Just describe what you need - the system routes to appropriate agents automatically.

## API Design

### RESTful Conventions
- `GET /resources` - List resources
- `GET /resources/:id` - Get single resource
- `POST /resources` - Create resource
- `PUT /resources/:id` - Replace resource
- `PATCH /resources/:id` - Update resource
- `DELETE /resources/:id` - Delete resource

### Response Format
```json
{
  "data": {},
  "meta": {
    "page": 1,
    "total": 100
  },
  "errors": []
}
```

### Error Handling
- 400: Bad Request (validation errors)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

## Security

### Authentication
- Use JWT tokens with short expiry (15-60 min)
- Implement refresh token rotation
- Store tokens securely (httpOnly cookies)
- Support OAuth2 for third-party auth

### Input Validation
- Validate ALL user input
- Use schema validation (Zod, Joi, Pydantic)
- Sanitize inputs to prevent injection
- Limit request body size

### Data Protection
- Encrypt sensitive data at rest
- Use parameterized queries (no string concat)
- Implement rate limiting
- Log security events

### Secrets Management
- Never commit secrets to git
- Use environment variables
- Rotate secrets regularly
- Use secret managers in production

## Database Patterns

### Migrations
- Version all schema changes
- Make migrations reversible
- Test migrations in staging first
- Back up before major changes

### Query Optimization
- Add indexes for frequent queries
- Use EXPLAIN to analyze slow queries
- Paginate large result sets
- Cache repeated reads (Redis)

## Testing

### Test Pyramid
- Unit tests: Business logic (70%)
- Integration tests: API endpoints (20%)
- E2E tests: Critical flows (10%)

### Security Testing
- Run OWASP ZAP scans
- Test authentication bypasses
- Verify authorization rules
- Check for SQL injection
