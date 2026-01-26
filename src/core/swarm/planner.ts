/**
 * Task Planner Module
 *
 * Plans and decomposes tasks for swarm orchestration.
 * Analyzes intent classifications and builds execution plans
 * with appropriate agent assignments and dependencies.
 */

import { randomUUID } from 'node:crypto';
import type {
  SwarmTask,
  SwarmPlan,
  SwarmRecommendation,
  ModelTier,
  ParallelismMode,
} from '../../types/swarm.js';
import type { IntentClassification, Complexity } from '../classifier/types.js';
import { selectModel } from './spawner.js';

// =============================================================================
// Complexity Classification
// =============================================================================

/**
 * Classify task complexity from an intent classification.
 *
 * Uses the complexity from the classification directly, but may adjust
 * based on additional signals like domain count or user preferences.
 *
 * @param classification - The intent classification result
 * @returns The determined complexity level
 *
 * @example
 * ```typescript
 * const complexity = classifyComplexity(classification);
 * // 'moderate'
 * ```
 */
export function classifyComplexity(
  classification: IntentClassification
): Complexity {
  // Start with the classification's complexity
  let complexity = classification.complexity;

  // Upgrade complexity if user signals indicate thorough work
  if (classification.signals.wantsThorough && complexity === 'simple') {
    complexity = 'moderate';
  }

  // Upgrade complexity if multiple domains are involved
  if (classification.domains.length >= 3 && complexity === 'moderate') {
    complexity = 'complex';
  }

  // Upgrade for planning requests on complex tasks
  if (classification.signals.wantsPlanning && complexity === 'complex') {
    complexity = 'architectural';
  }

  return complexity;
}

// =============================================================================
// Decomposition Decisions
// =============================================================================

/**
 * Determine whether a task should be decomposed into subtasks.
 *
 * Trivial and simple tasks are handled directly.
 * Moderate, complex, and architectural tasks benefit from decomposition.
 *
 * @param complexity - The complexity level of the task
 * @returns Whether the task should be decomposed
 *
 * @example
 * ```typescript
 * shouldDecompose('trivial'); // false
 * shouldDecompose('moderate'); // true
 * shouldDecompose('architectural'); // true
 * ```
 */
export function shouldDecompose(complexity: Complexity): boolean {
  switch (complexity) {
    case 'trivial':
    case 'simple':
      return false;
    case 'moderate':
    case 'complex':
    case 'architectural':
      return true;
    default:
      return false;
  }
}

/**
 * Get suggested number of subtasks based on complexity and intent.
 *
 * @param complexity - The complexity level of the task
 * @param intent - The intent type (e.g., 'implementation', 'debugging')
 * @returns Suggested number of subtasks
 *
 * @example
 * ```typescript
 * getSuggestedSubtasks('trivial', 'implementation'); // 1
 * getSuggestedSubtasks('moderate', 'implementation'); // 3
 * getSuggestedSubtasks('complex', 'refactoring'); // 7
 * getSuggestedSubtasks('architectural', 'implementation'); // 10
 * ```
 */
export function getSuggestedSubtasks(
  complexity: Complexity,
  intent: string
): number {
  switch (complexity) {
    case 'trivial':
      return 1;

    case 'simple':
      return 1;

    case 'moderate':
      // 2-4 subtasks for moderate complexity
      if (intent === 'research') return 2;
      if (intent === 'debugging') return 3;
      return 3; // default for implementation, refactoring, etc.

    case 'complex':
      // 5-10 subtasks for complex tasks
      if (intent === 'research') return 5;
      if (intent === 'debugging') return 6;
      if (intent === 'refactoring') return 7;
      return 8; // default for implementation

    case 'architectural':
      // Higher counts for architectural work, depends on scope
      if (intent === 'research') return 6;
      if (intent === 'planning') return 8;
      return 10; // default for large implementations

    default:
      return 1;
  }
}

// =============================================================================
// Task Template Creation
// =============================================================================

/**
 * Create a SwarmTask object with the given parameters.
 *
 * Initializes the task in 'pending' status with proper timestamps.
 * The blocks array is initialized empty and should be populated
 * after all tasks are created to maintain bidirectional references.
 *
 * @param id - Unique task identifier
 * @param subject - Short subject line describing the task
 * @param description - Detailed description of what the task should accomplish
 * @param agent - Agent type to use (e.g., 'executor', 'architect')
 * @param model - Model tier to use for execution
 * @param blockedBy - Optional array of task IDs this task depends on
 * @returns A new SwarmTask object
 *
 * @example
 * ```typescript
 * const task = createTaskTemplate(
 *   'task-1',
 *   'Explore codebase',
 *   'Search for relevant files and understand the structure',
 *   'explore',
 *   'haiku',
 * );
 * ```
 */
export function createTaskTemplate(
  id: string,
  subject: string,
  description: string,
  agent: string,
  model: ModelTier,
  blockedBy?: string[]
): SwarmTask {
  return {
    id,
    subject,
    description,
    status: 'pending',
    agent,
    model,
    blockedBy: blockedBy ?? [],
    blocks: [], // Populated later to maintain consistency
    createdAt: new Date(),
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Populate the blocks arrays for all tasks based on blockedBy relationships.
 *
 * @param tasks - Array of tasks to update
 */
function populateBlocksArrays(tasks: SwarmTask[]): void {
  // Build a map for quick lookup
  const taskMap = new Map<string, SwarmTask>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  // Populate blocks arrays based on blockedBy
  for (const task of tasks) {
    for (const blockedById of task.blockedBy) {
      const blockerTask = taskMap.get(blockedById);
      if (blockerTask && !blockerTask.blocks.includes(task.id)) {
        blockerTask.blocks.push(task.id);
      }
    }
  }
}

/**
 * Generate a unique task ID with optional prefix.
 *
 * @param prefix - Optional prefix for the ID
 * @returns A unique task ID
 */
function generateTaskId(prefix?: string): string {
  const uuid = randomUUID().slice(0, 8);
  return prefix ? `${prefix}-${uuid}` : uuid;
}

/**
 * Get the request subject from classification for plan naming.
 *
 * @param classification - The intent classification
 * @returns A subject string for the plan
 */
function getSubjectFromClassification(
  classification: IntentClassification
): string {
  const type = classification.type;
  const domain = classification.domains[0] ?? 'general';
  return `${type} task (${domain})`;
}

// =============================================================================
// Plan Builders
// =============================================================================

/**
 * Build a plan for implementation tasks.
 *
 * Workflow: explore -> architect -> executor + qa-tester (parallel) -> verify
 *
 * @param classification - The intent classification for the task
 * @returns A SwarmPlan with implementation workflow
 *
 * @example
 * ```typescript
 * const plan = buildImplementationPlan(classification);
 * // Creates tasks: explore, architect, executor, qa-tester (parallel), verify
 * ```
 */
export function buildImplementationPlan(
  classification: IntentClassification
): SwarmPlan {
  const complexity = classifyComplexity(classification);
  const subject = getSubjectFromClassification(classification);

  const exploreId = generateTaskId('explore');
  const architectId = generateTaskId('architect');
  const executorId = generateTaskId('executor');
  const qaTesterforImplementationId = generateTaskId('qa-impl');
  const verifyId = generateTaskId('verify');

  const tasks: SwarmTask[] = [
    createTaskTemplate(
      exploreId,
      'Explore codebase',
      'Search for relevant files, understand existing patterns, and identify areas to modify.',
      'explore',
      selectModel(complexity, 'explore')
    ),
    createTaskTemplate(
      architectId,
      'Design implementation',
      'Based on exploration results, design the implementation approach and identify all files to modify.',
      'architect',
      selectModel(complexity, 'architect'),
      [exploreId]
    ),
    createTaskTemplate(
      executorId,
      'Implement changes',
      'Execute the implementation plan, making all necessary code changes.',
      'executor',
      selectModel(complexity, 'executor'),
      [architectId]
    ),
    createTaskTemplate(
      qaTesterforImplementationId,
      'Write tests',
      'Write or update tests to cover the new implementation.',
      'qa-tester',
      selectModel(complexity, 'qa-tester'),
      [architectId] // Can run in parallel with executor
    ),
    createTaskTemplate(
      verifyId,
      'Verify implementation',
      'Run tests, check for errors, and verify the implementation is complete.',
      'qa-tester',
      selectModel(complexity, 'qa-tester'),
      [executorId, qaTesterforImplementationId] // Depends on both completing
    ),
  ];

  populateBlocksArrays(tasks);

  return {
    id: randomUUID(),
    name: `Implementation: ${subject}`,
    tasks,
    parallelism: 'hybrid',
    createdAt: new Date(),
  };
}

/**
 * Build a plan for debugging tasks.
 *
 * Workflow: explore -> architect -> executor -> qa-tester
 *
 * @param classification - The intent classification for the task
 * @returns A SwarmPlan with debugging workflow
 *
 * @example
 * ```typescript
 * const plan = buildDebuggingPlan(classification);
 * // Creates tasks: explore, architect, executor, qa-tester (sequential)
 * ```
 */
export function buildDebuggingPlan(
  classification: IntentClassification
): SwarmPlan {
  const complexity = classifyComplexity(classification);
  const subject = getSubjectFromClassification(classification);

  const exploreId = generateTaskId('explore');
  const architectId = generateTaskId('architect');
  const executorId = generateTaskId('executor');
  const qaTester = generateTaskId('qa');

  const tasks: SwarmTask[] = [
    createTaskTemplate(
      exploreId,
      'Investigate issue',
      'Search for relevant code, error patterns, and potential root causes.',
      'explore',
      selectModel(complexity, 'explore')
    ),
    createTaskTemplate(
      architectId,
      'Diagnose root cause',
      'Analyze the findings, identify the root cause, and plan the fix.',
      'architect',
      selectModel(complexity, 'architect'),
      [exploreId]
    ),
    createTaskTemplate(
      executorId,
      'Implement fix',
      'Apply the fix based on the diagnosis.',
      'executor',
      selectModel(complexity, 'executor'),
      [architectId]
    ),
    createTaskTemplate(
      qaTester,
      'Verify fix',
      'Run tests and verify the bug is fixed without regressions.',
      'qa-tester',
      selectModel(complexity, 'qa-tester'),
      [executorId]
    ),
  ];

  populateBlocksArrays(tasks);

  return {
    id: randomUUID(),
    name: `Debugging: ${subject}`,
    tasks,
    parallelism: 'sequential',
    createdAt: new Date(),
  };
}

/**
 * Build a plan for refactoring tasks.
 *
 * Workflow: explore -> architect -> executor -> qa-tester
 *
 * @param classification - The intent classification for the task
 * @returns A SwarmPlan with refactoring workflow
 *
 * @example
 * ```typescript
 * const plan = buildRefactoringPlan(classification);
 * // Creates tasks: explore, architect, executor, qa-tester (sequential)
 * ```
 */
export function buildRefactoringPlan(
  classification: IntentClassification
): SwarmPlan {
  const complexity = classifyComplexity(classification);
  const subject = getSubjectFromClassification(classification);

  const exploreId = generateTaskId('explore');
  const architectId = generateTaskId('architect');
  const executorId = generateTaskId('executor');
  const qaTester = generateTaskId('qa');

  const tasks: SwarmTask[] = [
    createTaskTemplate(
      exploreId,
      'Map refactoring scope',
      'Identify all code to refactor, dependencies, and usage patterns.',
      'explore',
      selectModel(complexity, 'explore')
    ),
    createTaskTemplate(
      architectId,
      'Plan refactoring',
      'Design the refactoring approach, identify breaking changes, and plan migration.',
      'architect',
      selectModel(complexity, 'architect'),
      [exploreId]
    ),
    createTaskTemplate(
      executorId,
      'Execute refactoring',
      'Apply the refactoring changes across all affected files.',
      'executor',
      selectModel(complexity, 'executor'),
      [architectId]
    ),
    createTaskTemplate(
      qaTester,
      'Validate refactoring',
      'Run tests, verify behavior is preserved, and check for regressions.',
      'qa-tester',
      selectModel(complexity, 'qa-tester'),
      [executorId]
    ),
  ];

  populateBlocksArrays(tasks);

  return {
    id: randomUUID(),
    name: `Refactoring: ${subject}`,
    tasks,
    parallelism: 'sequential',
    createdAt: new Date(),
  };
}

/**
 * Build a plan for research tasks.
 *
 * Workflow: explore (fan-out) -> synthesize
 *
 * Creates multiple parallel exploration tasks that feed into a synthesis task.
 *
 * @param classification - The intent classification for the task
 * @returns A SwarmPlan with research workflow
 *
 * @example
 * ```typescript
 * const plan = buildResearchPlan(classification);
 * // Creates tasks: multiple explore tasks (parallel) -> architect (synthesize)
 * ```
 */
export function buildResearchPlan(
  classification: IntentClassification
): SwarmPlan {
  const complexity = classifyComplexity(classification);
  const subject = getSubjectFromClassification(classification);
  const domains = classification.domains;

  // Create exploration tasks based on domains or create 2-3 general ones
  const exploreTaskIds: string[] = [];
  const tasks: SwarmTask[] = [];

  if (domains.length >= 2) {
    // Create one explore task per domain
    for (const domain of domains) {
      const exploreId = generateTaskId(`explore-${domain}`);
      exploreTaskIds.push(exploreId);
      tasks.push(
        createTaskTemplate(
          exploreId,
          `Explore ${domain}`,
          `Research ${domain}-related aspects, patterns, and relevant information.`,
          'explore',
          selectModel(complexity, 'explore')
        )
      );
    }
  } else {
    // Create 2-3 generic exploration tasks
    const numExploreTasks = complexity === 'trivial' ? 1 : complexity === 'simple' ? 2 : 3;
    for (let i = 0; i < numExploreTasks; i++) {
      const exploreId = generateTaskId(`explore-${i + 1}`);
      exploreTaskIds.push(exploreId);
      tasks.push(
        createTaskTemplate(
          exploreId,
          `Explore area ${i + 1}`,
          `Research and gather information on relevant aspects.`,
          'explore',
          selectModel(complexity, 'explore')
        )
      );
    }
  }

  // Add synthesis task that depends on all exploration tasks
  const synthesizeId = generateTaskId('synthesize');
  tasks.push(
    createTaskTemplate(
      synthesizeId,
      'Synthesize findings',
      'Combine research findings into a coherent summary with recommendations.',
      'architect',
      selectModel(complexity, 'architect'),
      exploreTaskIds
    )
  );

  populateBlocksArrays(tasks);

  return {
    id: randomUUID(),
    name: `Research: ${subject}`,
    tasks,
    parallelism: 'hybrid',
    createdAt: new Date(),
  };
}

/**
 * Build a plan for review tasks.
 *
 * Workflow: explore -> security + architect (parallel) -> synthesize
 *
 * @param classification - The intent classification for the task
 * @returns A SwarmPlan with review workflow
 */
function buildReviewPlan(classification: IntentClassification): SwarmPlan {
  const complexity = classifyComplexity(classification);
  const subject = getSubjectFromClassification(classification);

  const exploreId = generateTaskId('explore');
  const securityId = generateTaskId('security');
  const architectId = generateTaskId('architect');
  const synthesizeId = generateTaskId('synthesize');

  const tasks: SwarmTask[] = [
    createTaskTemplate(
      exploreId,
      'Gather code context',
      'Identify all relevant code to review and understand the scope.',
      'explore',
      selectModel(complexity, 'explore')
    ),
    createTaskTemplate(
      securityId,
      'Security review',
      'Analyze code for security vulnerabilities and best practices.',
      'security',
      selectModel(complexity, 'security'),
      [exploreId]
    ),
    createTaskTemplate(
      architectId,
      'Architecture review',
      'Review code structure, patterns, and architectural decisions.',
      'architect',
      selectModel(complexity, 'architect'),
      [exploreId]
    ),
    createTaskTemplate(
      synthesizeId,
      'Compile review',
      'Synthesize findings into a comprehensive review report.',
      'architect',
      selectModel(complexity, 'architect'),
      [securityId, architectId]
    ),
  ];

  populateBlocksArrays(tasks);

  return {
    id: randomUUID(),
    name: `Review: ${subject}`,
    tasks,
    parallelism: 'hybrid',
    createdAt: new Date(),
  };
}

/**
 * Build a simple single-agent plan for trivial tasks.
 *
 * @param classification - The intent classification for the task
 * @returns A SwarmPlan with a single task
 */
function buildSimplePlan(classification: IntentClassification): SwarmPlan {
  const complexity = classifyComplexity(classification);
  const subject = getSubjectFromClassification(classification);
  const agent = classification.recommendation.agents[0] ?? 'executor';

  const taskId = generateTaskId(agent);

  const tasks: SwarmTask[] = [
    createTaskTemplate(
      taskId,
      subject,
      `Execute the ${classification.type} task directly.`,
      agent,
      selectModel(complexity, agent)
    ),
  ];

  return {
    id: randomUUID(),
    name: `Task: ${subject}`,
    tasks,
    parallelism: 'sequential',
    createdAt: new Date(),
  };
}

// =============================================================================
// Main Entry Points
// =============================================================================

/**
 * Create a swarm plan based on intent classification.
 *
 * Routes to the appropriate plan builder based on the intent type.
 * For trivial/simple tasks that don't need decomposition, creates a simple plan.
 *
 * @param classification - The intent classification for the task
 * @returns A SwarmPlan tailored to the task type
 *
 * @example
 * ```typescript
 * const classification = await classifyIntent(prompt);
 * const plan = createSwarmPlan(classification);
 * // Plan is now ready for execution
 * ```
 */
export function createSwarmPlan(
  classification: IntentClassification
): SwarmPlan {
  const complexity = classifyComplexity(classification);

  // For trivial/simple tasks, use a simple single-agent plan
  if (!shouldDecompose(complexity)) {
    return buildSimplePlan(classification);
  }

  // Route to appropriate plan builder based on intent type
  switch (classification.type) {
    case 'implementation':
      return buildImplementationPlan(classification);

    case 'debugging':
      return buildDebuggingPlan(classification);

    case 'refactoring':
      return buildRefactoringPlan(classification);

    case 'research':
      return buildResearchPlan(classification);

    case 'review':
      return buildReviewPlan(classification);

    case 'planning':
      // Planning tasks use research-style fan-out
      return buildResearchPlan(classification);

    case 'maintenance':
      // Maintenance uses refactoring workflow
      return buildRefactoringPlan(classification);

    case 'conversation':
      // Conversation doesn't need a swarm, use simple plan
      return buildSimplePlan(classification);

    default:
      // Default to implementation workflow
      return buildImplementationPlan(classification);
  }
}

/**
 * Get a swarm recommendation for router integration.
 *
 * Provides guidance on whether to decompose, how many subtasks,
 * and what parallelism mode to use.
 *
 * @param classification - The intent classification for the task
 * @returns A SwarmRecommendation for the router
 *
 * @example
 * ```typescript
 * const recommendation = getSwarmRecommendation(classification);
 * if (recommendation.decompose) {
 *   const plan = createSwarmPlan(classification);
 *   // Execute plan with recommendation.parallelism
 * }
 * ```
 */
export function getSwarmRecommendation(
  classification: IntentClassification
): SwarmRecommendation {
  const complexity = classifyComplexity(classification);
  const decompose = shouldDecompose(complexity);
  const suggestedSubtasks = getSuggestedSubtasks(complexity, classification.type);

  // Determine parallelism mode based on complexity and intent
  let parallelism: ParallelismMode;

  if (!decompose) {
    parallelism = 'sequential';
  } else if (classification.type === 'research') {
    // Research benefits from parallel exploration
    parallelism = 'parallel';
  } else if (classification.type === 'debugging') {
    // Debugging requires sequential analysis
    parallelism = 'sequential';
  } else if (complexity === 'architectural') {
    // Architectural work benefits from hybrid (parallel where possible)
    parallelism = 'hybrid';
  } else {
    // Default to hybrid for flexible execution
    parallelism = 'hybrid';
  }

  return {
    decompose,
    suggestedSubtasks,
    parallelism,
  };
}
