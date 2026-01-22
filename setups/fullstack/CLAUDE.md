# Fullstack Development Setup

Optimized for full-stack web development with React and Node.js.

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express/Fastify, TypeScript
- **Database**: PostgreSQL, MongoDB, Redis
- **Testing**: Vitest, Playwright, Jest

## Development Patterns

### Component Architecture
- Use functional components with hooks
- Prefer composition over inheritance
- Keep components small and focused
- Use TypeScript for type safety

### API Design
- RESTful endpoints with clear naming
- Proper HTTP methods and status codes
- Input validation at API boundaries
- Consistent error response format

### State Management
- Use React Query for server state
- Use Zustand or Jotai for client state
- Avoid prop drilling with context
- Keep state close to where it's used

## Code Quality

### Before Committing
1. Run `npm run lint` to check code style
2. Run `npm run typecheck` for type errors
3. Run `npm test` to verify all tests pass
4. Run `npm run build` to check build succeeds

### Testing Strategy
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Minimum 80% code coverage target

## Git Workflow

- Use conventional commits (feat:, fix:, docs:, etc.)
- Keep commits atomic and focused
- Write descriptive commit messages
- Create feature branches for new work
