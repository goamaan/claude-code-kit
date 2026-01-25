---
name: typescript-expert
description: TypeScript-specific guidance, patterns, and best practices. Expert-level TypeScript knowledge.
model: sonnet
user-invocable: true
---

# TypeScript Expert Skill

Expert TypeScript guidance for types, patterns, configuration, and best practices.

## Purpose

The TypeScript expert skill provides:
- Type system guidance
- Advanced typing patterns
- Generic type solutions
- tsconfig.json optimization
- Type error resolution
- Best practices enforcement

## When to Use

Use typescript-expert (sonnet-tier) for:
- Complex type definitions
- Type errors and fixes
- Generic type patterns
- TypeScript configuration
- Type narrowing strategies
- Utility type usage

## When NOT to Use

- General implementation → Use `executor`
- Code review → Use `code-review`
- Debugging logic → Use `architect`

## TypeScript Expertise Areas

### Type System

#### Basic Types
```typescript
// Primitives
const str: string = "hello";
const num: number = 42;
const bool: boolean = true;
const nothing: null = null;
const undef: undefined = undefined;

// Arrays
const nums: number[] = [1, 2, 3];
const strs: Array<string> = ["a", "b"];

// Tuples
const pair: [string, number] = ["age", 25];

// Enums
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE"
}
```

#### Advanced Types
```typescript
// Union types
type Result = Success | Error;
type ID = string | number;

// Intersection types
type Employee = Person & Worker;

// Literal types
type Direction = "north" | "south" | "east" | "west";

// Type aliases
type UserID = string;
type Point = { x: number; y: number };

// Interfaces
interface User {
  id: string;
  name: string;
  email?: string; // Optional
  readonly created: Date; // Readonly
}

// Index signatures
interface Dictionary {
  [key: string]: any;
}

// Callable interfaces
interface SearchFunc {
  (source: string, subString: string): boolean;
}
```

### Generics

#### Generic Functions
```typescript
function identity<T>(arg: T): T {
  return arg;
}

function map<T, U>(arr: T[], fn: (item: T) => U): U[] {
  return arr.map(fn);
}

// Multiple type parameters
function pair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}
```

#### Generic Constraints
```typescript
// Constraint with extends
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Constraint with interface
interface HasLength {
  length: number;
}

function logLength<T extends HasLength>(arg: T): void {
  console.log(arg.length);
}
```

#### Generic Classes
```typescript
class Container<T> {
  private value: T;

  constructor(value: T) {
    this.value = value;
  }

  getValue(): T {
    return this.value;
  }
}

const numberContainer = new Container<number>(42);
```

### Utility Types

```typescript
// Partial - make all properties optional
type PartialUser = Partial<User>;

// Required - make all properties required
type RequiredUser = Required<User>;

// Readonly - make all properties readonly
type ReadonlyUser = Readonly<User>;

// Pick - select specific properties
type UserPreview = Pick<User, 'id' | 'name'>;

// Omit - exclude specific properties
type UserWithoutEmail = Omit<User, 'email'>;

// Record - create object type with specific keys
type UserRoles = Record<string, User[]>;

// Exclude - exclude from union
type NonNullString = Exclude<string | null, null>;

// Extract - extract from union
type StringOrNumber = Extract<string | number | boolean, string | number>;

// NonNullable - remove null and undefined
type NonNullUser = NonNullable<User | null | undefined>;

// ReturnType - get function return type
type Result = ReturnType<typeof myFunction>;

// Parameters - get function parameters
type Params = Parameters<typeof myFunction>;

// Awaited - unwrap Promise type
type UserData = Awaited<Promise<User>>;
```

### Type Narrowing

```typescript
// Type guards
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Using typeof
if (typeof value === 'string') {
  // value is string here
}

// Using instanceof
if (value instanceof Date) {
  // value is Date here
}

// Using in operator
if ('email' in user) {
  // user has email property
}

// Discriminated unions
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
  }
}

// Non-null assertion (use sparingly!)
const value = maybeNull!; // Asserts non-null
```

### Advanced Patterns

#### Conditional Types
```typescript
type IsString<T> = T extends string ? true : false;

type NonNullable<T> = T extends null | undefined ? never : T;

// Distributive conditional types
type ToArray<T> = T extends any ? T[] : never;
type Result = ToArray<string | number>; // string[] | number[]
```

#### Mapped Types
```typescript
// Make all properties optional
type Optional<T> = {
  [P in keyof T]?: T[P];
};

// Make all properties readonly
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

// Nullable properties
type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

// With key remapping
type Getters<T> = {
  [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};
```

#### Template Literal Types
```typescript
type EventName = 'click' | 'focus' | 'blur';
type Handler = `on${Capitalize<EventName>}`; // 'onClick' | 'onFocus' | 'onBlur'

// Pattern matching
type ExtractParam<T> = T extends `${infer _}/users/${infer ID}` ? ID : never;
```

## Common Type Error Solutions

### Error: Type 'X' is not assignable to type 'Y'

```typescript
// Problem
const num: number = "42"; // Error

// Solutions
const num1: number = parseInt("42");
const num2: string | number = "42";
const num3 = "42" as unknown as number; // Last resort
```

### Error: Object is possibly 'null' or 'undefined'

```typescript
// Problem
const user: User | null = getUser();
user.name; // Error

// Solutions
// 1. Optional chaining
user?.name;

// 2. Nullish coalescing
const name = user?.name ?? 'Unknown';

// 3. Type guard
if (user) {
  user.name; // OK here
}

// 4. Non-null assertion (if you're certain)
user!.name;
```

### Error: Property does not exist on type

```typescript
// Problem
interface User {
  name: string;
}
const user: User = { name: 'John', age: 30 }; // Error

// Solutions
// 1. Extend interface
interface User {
  name: string;
  age?: number;
}

// 2. Use type intersection
type ExtendedUser = User & { age: number };

// 3. Index signature
interface User {
  name: string;
  [key: string]: any; // Flexible but less safe
}
```

### Error: No index signature

```typescript
// Problem
const key: string = 'name';
const value = user[key]; // Error

// Solution
const key = 'name' as keyof User;
const value = user[key]; // OK

// Or with function
function get<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

## TypeScript Best Practices

### 1. Prefer Interfaces for Object Shapes
```typescript
// Good
interface User {
  id: string;
  name: string;
}

// Use type for unions, intersections, utilities
type ID = string | number;
```

### 2. Use Strict Mode
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### 3. Avoid 'any'
```typescript
// Bad
function process(data: any) {}

// Good
function process(data: unknown) {
  if (typeof data === 'string') {
    // Now data is string
  }
}
```

### 4. Use Type Inference
```typescript
// Bad - redundant type
const message: string = "hello";

// Good - inferred
const message = "hello";

// Specify only when needed
const messages: string[] = [];
```

### 5. Discriminated Unions for State
```typescript
// Good pattern
type State =
  | { status: 'loading' }
  | { status: 'success'; data: Data }
  | { status: 'error'; error: Error };

function render(state: State) {
  switch (state.status) {
    case 'loading':
      return <Spinner />;
    case 'success':
      return <Data data={state.data} />;
    case 'error':
      return <Error error={state.error} />;
  }
}
```

## tsconfig.json Recommendations

```json
{
  "compilerOptions": {
    // Strict type checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Additional checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,

    // Module resolution
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,

    // Output
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",

    // Other
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Anti-Patterns to Avoid

1. **Using 'any' everywhere**
   - BAD: Defeats TypeScript's purpose
   - GOOD: Use proper types or 'unknown'

2. **Type assertions without validation**
   - BAD: `data as User` without checking
   - GOOD: Type guard then narrow

3. **Ignoring strict mode errors**
   - BAD: Using `@ts-ignore` liberally
   - GOOD: Fix the root cause

4. **Not using utility types**
   - BAD: Manually making all props optional
   - GOOD: `Partial<Type>`

## Success Criteria

TypeScript assistance completes when:
- [ ] Type error resolved or solution provided
- [ ] Type pattern recommended with example
- [ ] Best practices followed
- [ ] Types are accurate and maintainable
- [ ] Code is type-safe