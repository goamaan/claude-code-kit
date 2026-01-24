# Frontend Development Setup

Optimized for frontend development with modern frameworks and design systems.

## Supported Frameworks

- **React**: Components, hooks, context, React Query
- **Vue**: Composition API, Pinia, Vue Router
- **Svelte**: Components, stores, SvelteKit

## Available Agents

This setup includes specialized agents automatically selected based on your needs:

- **designer** - UI/UX design, component creation, and styling
- **executor** - Feature implementation and bug fixes
- **architect** - Performance optimization and architecture review
- **qa-tester** - Component testing, visual regression, and accessibility testing
- **planner** - Feature planning and component design

Just describe what you need - the system routes to appropriate agents automatically.

## Design Principles

### Component Design
- Design components before implementation
- Consider responsive breakpoints
- Plan accessibility from the start
- Document component props and variants

### Visual Hierarchy
- Establish clear visual hierarchy
- Use consistent spacing (8px grid)
- Limit color palette to 5-7 colors
- Typography scale for headings/body

### Animation & Interaction
- Use subtle animations (150-300ms)
- Provide feedback for user actions
- Consider reduced motion preferences
- Loading states for async operations

## UI Patterns

### Component Structure
```
components/
  ui/           # Base UI components (Button, Input, Card)
  features/     # Feature-specific components
  layouts/      # Page layouts and containers
```

### Styling Approach
- Use Tailwind CSS for utility-first styling
- Extract common patterns to components
- Use CSS custom properties for theming
- Keep specificity low

### State Management
- Local state for UI-only concerns
- Server state with React Query/SWR
- Global state sparingly (auth, theme)

## Accessibility

### WCAG 2.1 AA Compliance
- Color contrast ratio >= 4.5:1
- Keyboard navigation support
- Screen reader compatibility
- Focus indicators visible

### Testing
- Axe-core for automated a11y testing
- Manual keyboard navigation tests
- Screen reader testing (VoiceOver/NVDA)

## Performance

### Core Web Vitals
- LCP < 2.5s (Largest Contentful Paint)
- FID < 100ms (First Input Delay)
- CLS < 0.1 (Cumulative Layout Shift)

### Optimization
- Code splitting by route
- Lazy load below-fold content
- Optimize images (WebP, responsive)
- Minimize JavaScript bundles
