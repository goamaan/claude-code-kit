---
name: frontend-ui-ux
description: UI/UX design principles for frontend development. Covers accessibility, responsive design, component patterns, and styling best practices. Use when building user interfaces or reviewing frontend code.
---

# Frontend UI/UX Skill

Design sensibility that activates silently when working on frontend code, ensuring beautiful and usable interfaces.

## Purpose

This skill provides:
- Design principles for UI work
- UX best practices
- Accessibility standards
- Visual consistency
- Component design patterns

## Silent Activation

Unlike other skills, frontend-ui-ux activates SILENTLY when:
- Working on components (*.tsx, *.vue, *.svelte)
- Editing CSS/SCSS/Tailwind
- Discussing UI/UX
- Creating user-facing features

No announcement needed - just apply these principles.

## Design Principles

### Visual Hierarchy

```
1. Size: Larger = more important
2. Color: Contrast draws attention
3. Space: Whitespace creates breathing room
4. Position: Top/left scanned first
5. Typography: Bold/different fonts stand out
```

### Consistency

```
- Same actions = same appearance
- Predictable patterns
- Consistent spacing (8px grid)
- Unified color palette
- Typography scale
```

### Accessibility (A11y)

```
- Color contrast 4.5:1 minimum
- Keyboard navigable
- Screen reader friendly
- Focus indicators
- Alt text for images
- ARIA labels where needed
```

### Responsive Design

```
- Mobile-first approach
- Breakpoints: 640, 768, 1024, 1280
- Flexible layouts (flexbox, grid)
- Touch-friendly targets (44px minimum)
- Content adapts, not just shrinks
```

## Component Design Patterns

### Atomic Design

```
Atoms → Molecules → Organisms → Templates → Pages

Atoms: Button, Input, Label
Molecules: FormField (Label + Input + Error)
Organisms: LoginForm (Multiple FormFields + Button)
Templates: AuthLayout (Header + Form + Footer)
Pages: LoginPage (Template + Data)
```

### Component Structure

```typescript
// Good component structure
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// Compound components for complex UI
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

### State Handling

```
- Loading states (skeleton, spinner)
- Empty states (helpful message, action)
- Error states (clear message, retry option)
- Success states (confirmation, next steps)
```

## Styling Best Practices

### Tailwind CSS

```jsx
// Good: Semantic grouping
<button className="
  px-4 py-2 rounded-lg
  bg-blue-600 text-white
  hover:bg-blue-700
  focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-colors duration-200
">

// Extract repeated patterns
const buttonStyles = {
  base: "px-4 py-2 rounded-lg transition-colors duration-200",
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
};
```

### CSS Modules

```css
/* Use semantic class names */
.card { }
.cardHeader { }
.cardTitle { }

/* BEM-style for complex components */
.form { }
.form__field { }
.form__field--error { }
```

### Design Tokens

```javascript
// Consistent design tokens
const tokens = {
  colors: {
    primary: { 50: '#eff6ff', 500: '#3b82f6', 900: '#1e3a8a' },
    gray: { 50: '#f9fafb', 500: '#6b7280', 900: '#111827' },
  },
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
  },
  typography: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  }
};
```

## UX Patterns

### Forms

```
- Clear labels
- Helpful placeholders
- Real-time validation
- Error messages near fields
- Disabled submit until valid
- Loading state on submit
- Success confirmation
```

### Navigation

```
- Current location clear
- Breadcrumbs for deep hierarchies
- Consistent placement
- Mobile: hamburger or bottom nav
- Keyboard accessible
```

### Feedback

```
- Immediate response to actions
- Toast notifications for async
- Progress indicators for long tasks
- Confirmation for destructive actions
- Undo when possible
```

### Loading States

```jsx
// Skeleton loading (preferred)
<Skeleton className="h-4 w-3/4" />

// Spinner for small areas
<Spinner size="sm" />

// Progress for known duration
<Progress value={75} />
```

## Agent Delegation

| Task | Agent | Model |
|------|-------|-------|
| Simple component | designer | haiku |
| Standard UI work | designer | sonnet |
| Complex UI system | designer | opus |
| Component implementation | executor | sonnet |

### Designer Agent Usage

```
Task(subagent_type="claudeops:designer",
     model="sonnet",
     prompt="Create a responsive card component with image, title, description, and action buttons")
```

### For Complex UI

```
Task(subagent_type="claudeops:designer",
     model="opus",
     prompt="Design a complete data table system with sorting, filtering, pagination, and row selection")
```

## Output Format

When creating UI components:

```
## Component: [Name]

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | string | 'primary' | Visual style |

### Usage
```jsx
<Button variant="primary" size="md">
  Click me
</Button>
```

### Accessibility
- Role: button
- Keyboard: Space/Enter activates
- Focus: Visible ring
- Screen reader: Announces label

### States
- Default
- Hover
- Focus
- Active
- Disabled
- Loading
```

## Anti-Patterns to Avoid

### Visual
```
- Inconsistent spacing
- Too many colors
- Poor contrast
- Tiny click targets
- No hover states
- Invisible focus
```

### UX
```
- No loading states
- Unclear errors
- No empty states
- Unexpected navigation
- Lost form data
- No confirmation for destructive
```

### Code
```
- Inline styles everywhere
- Magic numbers
- Inconsistent naming
- No component abstraction
- Accessibility ignored
```

## Checklist for UI Work

Before considering UI complete:
- [ ] Visual hierarchy clear
- [ ] Consistent with design system
- [ ] Responsive (mobile to desktop)
- [ ] Accessible (keyboard, screen reader)
- [ ] Loading/empty/error states handled
- [ ] Hover/focus states present
- [ ] Animations smooth
- [ ] Touch targets adequate

## Combining with Other Skills

- **code-review + frontend-ui-ux**: Review includes UI/UX check
- **autopilot + frontend-ui-ux**: Auto-apply design principles
- **tdd + frontend-ui-ux**: Test user interactions

## Success Criteria

Frontend work complete when:
- [ ] Looks good on all breakpoints
- [ ] Accessible
- [ ] All states handled
- [ ] Consistent with existing UI
- [ ] Performant
- [ ] User-friendly