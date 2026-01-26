/**
 * Dependency Graph Module
 *
 * Analyzes task dependencies for swarm orchestration.
 * Provides graph building, cycle detection, topological sorting,
 * and parallel execution grouping for SwarmTask dependencies.
 */

import type { SwarmTask, DependencyNode } from '../../types/swarm.js';

/**
 * Builds a dependency graph from a list of swarm tasks.
 *
 * Creates a DependencyNode for each task, copying the blockedBy and blocks
 * arrays, and calculating the depth using BFS from root nodes.
 *
 * @param tasks - Array of SwarmTask objects to build the graph from
 * @returns Map of task IDs to their corresponding DependencyNode
 *
 * @example
 * ```typescript
 * const tasks = [
 *   { id: 'a', blockedBy: [], blocks: ['b'], ... },
 *   { id: 'b', blockedBy: ['a'], blocks: [], ... }
 * ];
 * const graph = buildGraph(tasks);
 * // graph.get('a').depth === 0
 * // graph.get('b').depth === 1
 * ```
 */
export function buildGraph(tasks: SwarmTask[]): Map<string, DependencyNode> {
  const graph = new Map<string, DependencyNode>();

  // Create nodes for each task
  for (const task of tasks) {
    graph.set(task.id, {
      taskId: task.id,
      blockedBy: [...task.blockedBy],
      blocks: [...task.blocks],
      depth: 0,
    });
  }

  // Calculate depths
  calculateDepths(graph);

  return graph;
}

/**
 * Calculates the depth for each node in the dependency graph using BFS.
 *
 * Nodes with no dependencies (empty blockedBy) have depth 0.
 * A node's depth is max(parent depths) + 1, where parents are the tasks
 * that this node is blocked by.
 *
 * @param graph - Map of task IDs to DependencyNode to update in place
 *
 * @example
 * ```typescript
 * const graph = new Map([
 *   ['a', { taskId: 'a', blockedBy: [], blocks: ['b'], depth: 0 }],
 *   ['b', { taskId: 'b', blockedBy: ['a'], blocks: [], depth: 0 }]
 * ]);
 * calculateDepths(graph);
 * // graph.get('b').depth === 1
 * ```
 */
export function calculateDepths(graph: Map<string, DependencyNode>): void {
  // Find root nodes (no dependencies)
  const queue: string[] = [];
  const depths = new Map<string, number>();

  for (const [id, node] of graph) {
    if (node.blockedBy.length === 0) {
      queue.push(id);
      depths.set(id, 0);
      node.depth = 0;
    }
  }

  // BFS to calculate depths
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentNode = graph.get(currentId)!;
    const currentDepth = depths.get(currentId)!;

    // Process all nodes that this node blocks
    for (const blockedId of currentNode.blocks) {
      const blockedNode = graph.get(blockedId);
      if (!blockedNode) continue;

      // Calculate new depth as max(current depths) + 1
      const newDepth = currentDepth + 1;
      const existingDepth = depths.get(blockedId);

      if (existingDepth === undefined || newDepth > existingDepth) {
        depths.set(blockedId, newDepth);
        blockedNode.depth = newDepth;
      }

      // Check if all dependencies have been processed
      const allDepsProcessed = blockedNode.blockedBy.every((depId) =>
        depths.has(depId)
      );

      if (allDepsProcessed && !queue.includes(blockedId)) {
        // Update depth to max of all parents + 1
        const maxParentDepth = Math.max(
          ...blockedNode.blockedBy.map((depId) => depths.get(depId) ?? 0)
        );
        blockedNode.depth = maxParentDepth + 1;
        depths.set(blockedId, blockedNode.depth);
        queue.push(blockedId);
      }
    }
  }
}

/**
 * Performs a topological sort of tasks using Kahn's algorithm.
 *
 * Returns task IDs in execution order, where each task appears after
 * all tasks it depends on (blockedBy).
 *
 * @param tasks - Array of SwarmTask objects to sort
 * @returns Array of task IDs in topological order
 * @throws Error if the graph contains a cycle
 *
 * @example
 * ```typescript
 * const tasks = [
 *   { id: 'c', blockedBy: ['b'], blocks: [], ... },
 *   { id: 'a', blockedBy: [], blocks: ['b'], ... },
 *   { id: 'b', blockedBy: ['a'], blocks: ['c'], ... }
 * ];
 * const order = topologicalSort(tasks);
 * // order === ['a', 'b', 'c']
 * ```
 */
export function topologicalSort(tasks: SwarmTask[]): string[] {
  // Build adjacency and in-degree maps
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const task of tasks) {
    inDegree.set(task.id, task.blockedBy.length);
    adjacency.set(task.id, [...task.blocks]);
  }

  // Find all nodes with in-degree 0
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    // Reduce in-degree of dependents
    const dependents = adjacency.get(current) ?? [];
    for (const dependent of dependents) {
      const newDegree = (inDegree.get(dependent) ?? 0) - 1;
      inDegree.set(dependent, newDegree);

      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  // Check for cycle - if not all nodes processed, there's a cycle
  if (result.length !== tasks.length) {
    throw new Error('Dependency graph contains a cycle');
  }

  return result;
}

/**
 * Groups tasks by depth level for parallel execution.
 *
 * Tasks at the same depth level have no dependencies on each other
 * and can be executed in parallel. Returns an array of arrays,
 * where each inner array contains task IDs at that depth.
 *
 * @param tasks - Array of SwarmTask objects to group
 * @returns Array of arrays, each containing task IDs that can run in parallel
 *
 * @example
 * ```typescript
 * const tasks = [
 *   { id: 'a', blockedBy: [], blocks: ['c'], ... },
 *   { id: 'b', blockedBy: [], blocks: ['c'], ... },
 *   { id: 'c', blockedBy: ['a', 'b'], blocks: [], ... }
 * ];
 * const groups = getParallelGroups(tasks);
 * // groups === [['a', 'b'], ['c']]
 * ```
 */
export function getParallelGroups(tasks: SwarmTask[]): string[][] {
  if (tasks.length === 0) {
    return [];
  }

  const graph = buildGraph(tasks);

  // Group by depth
  const depthGroups = new Map<number, string[]>();
  let maxDepth = 0;

  for (const [id, node] of graph) {
    const depth = node.depth;
    if (!depthGroups.has(depth)) {
      depthGroups.set(depth, []);
    }
    depthGroups.get(depth)!.push(id);
    maxDepth = Math.max(maxDepth, depth);
  }

  // Convert to array ordered by depth
  const result: string[][] = [];
  for (let depth = 0; depth <= maxDepth; depth++) {
    const group = depthGroups.get(depth);
    if (group && group.length > 0) {
      result.push(group);
    }
  }

  return result;
}

/**
 * Returns IDs of tasks that are ready to execute.
 *
 * A task is ready if:
 * - Its status is 'pending'
 * - All tasks in its blockedBy array are in the completedIds set
 *
 * @param tasks - Array of SwarmTask objects to check
 * @param completedIds - Array of task IDs that have completed
 * @returns Array of task IDs that are ready to execute
 *
 * @example
 * ```typescript
 * const tasks = [
 *   { id: 'a', status: 'completed', blockedBy: [], ... },
 *   { id: 'b', status: 'pending', blockedBy: ['a'], ... },
 *   { id: 'c', status: 'pending', blockedBy: ['b'], ... }
 * ];
 * const ready = getReadyTasks(tasks, ['a']);
 * // ready === ['b']
 * ```
 */
export function getReadyTasks(
  tasks: SwarmTask[],
  completedIds: string[]
): string[] {
  const completedSet = new Set(completedIds);
  const ready: string[] = [];

  for (const task of tasks) {
    if (task.status !== 'pending') {
      continue;
    }

    // Check if all dependencies are completed
    const allDepsCompleted = task.blockedBy.every((depId) =>
      completedSet.has(depId)
    );

    if (allDepsCompleted) {
      ready.push(task.id);
    }
  }

  return ready;
}

/**
 * Detects if there is a cycle in the dependency graph.
 *
 * Uses depth-first search with coloring to detect back edges.
 *
 * @param tasks - Array of SwarmTask objects to check
 * @returns null if no cycle exists, or an array of task IDs forming the cycle
 *
 * @example
 * ```typescript
 * // No cycle
 * const tasks1 = [
 *   { id: 'a', blockedBy: [], blocks: ['b'], ... },
 *   { id: 'b', blockedBy: ['a'], blocks: [], ... }
 * ];
 * detectCycle(tasks1); // null
 *
 * // Has cycle: a -> b -> c -> a
 * const tasks2 = [
 *   { id: 'a', blockedBy: ['c'], blocks: ['b'], ... },
 *   { id: 'b', blockedBy: ['a'], blocks: ['c'], ... },
 *   { id: 'c', blockedBy: ['b'], blocks: ['a'], ... }
 * ];
 * detectCycle(tasks2); // ['a', 'b', 'c'] or similar cycle
 * ```
 */
export function detectCycle(tasks: SwarmTask[]): string[] | null {
  if (tasks.length === 0) {
    return null;
  }

  // Build adjacency map (task -> tasks it blocks)
  const adjacency = new Map<string, string[]>();
  for (const task of tasks) {
    adjacency.set(task.id, [...task.blocks]);
  }

  // Color states: 0 = white (unvisited), 1 = gray (visiting), 2 = black (done)
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();

  for (const task of tasks) {
    color.set(task.id, 0);
    parent.set(task.id, null);
  }

  // DFS to find cycle
  function dfs(nodeId: string, path: string[]): string[] | null {
    color.set(nodeId, 1); // Mark as visiting
    path.push(nodeId);

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!color.has(neighbor)) {
        // Neighbor doesn't exist in graph, skip
        continue;
      }

      if (color.get(neighbor) === 1) {
        // Found back edge - cycle detected
        const cycleStart = path.indexOf(neighbor);
        return path.slice(cycleStart);
      }

      if (color.get(neighbor) === 0) {
        const cycle = dfs(neighbor, path);
        if (cycle) {
          return cycle;
        }
      }
    }

    path.pop();
    color.set(nodeId, 2); // Mark as done
    return null;
  }

  // Try DFS from each unvisited node
  for (const task of tasks) {
    if (color.get(task.id) === 0) {
      const cycle = dfs(task.id, []);
      if (cycle) {
        return cycle;
      }
    }
  }

  return null;
}

/**
 * Finds the critical path through the dependency graph.
 *
 * The critical path is the longest path from any root node to any leaf node.
 * This represents the minimum time required to complete all tasks
 * (assuming tasks on the same level can be parallelized).
 *
 * @param tasks - Array of SwarmTask objects to analyze
 * @returns Array of task IDs forming the critical path
 *
 * @example
 * ```typescript
 * const tasks = [
 *   { id: 'a', blockedBy: [], blocks: ['c'], ... },
 *   { id: 'b', blockedBy: [], blocks: ['c'], ... },
 *   { id: 'c', blockedBy: ['a', 'b'], blocks: ['d'], ... },
 *   { id: 'd', blockedBy: ['c'], blocks: [], ... }
 * ];
 * const path = getCriticalPath(tasks);
 * // path === ['a', 'c', 'd'] or ['b', 'c', 'd']
 * ```
 */
export function getCriticalPath(tasks: SwarmTask[]): string[] {
  if (tasks.length === 0) {
    return [];
  }

  // Build task map for quick lookup
  const taskMap = new Map<string, SwarmTask>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }

  // Find all root nodes (no dependencies)
  const roots = tasks.filter((t) => t.blockedBy.length === 0);
  if (roots.length === 0) {
    // All nodes have dependencies - likely a cycle, return empty
    return [];
  }

  // Use dynamic programming to find longest path
  // longestPath[id] = [longest path ending at id]
  const longestPath = new Map<string, string[]>();

  // Get topological order for processing
  let order: string[];
  try {
    order = topologicalSort(tasks);
  } catch {
    // Cycle detected, return empty
    return [];
  }

  // Process in topological order
  for (const id of order) {
    const task = taskMap.get(id)!;

    if (task.blockedBy.length === 0) {
      // Root node
      longestPath.set(id, [id]);
    } else {
      // Find the longest path among dependencies
      let maxPath: string[] = [];
      for (const depId of task.blockedBy) {
        const depPath = longestPath.get(depId) ?? [];
        if (depPath.length > maxPath.length) {
          maxPath = depPath;
        }
      }
      longestPath.set(id, [...maxPath, id]);
    }
  }

  // Find the longest path overall
  let criticalPath: string[] = [];
  for (const path of longestPath.values()) {
    if (path.length > criticalPath.length) {
      criticalPath = path;
    }
  }

  return criticalPath;
}

/**
 * Validates the dependency graph for consistency and correctness.
 *
 * Checks for:
 * - Cycles in the dependency graph
 * - References to non-existent tasks in blockedBy/blocks arrays
 * - Self-references (task depending on itself)
 *
 * @param tasks - Array of SwarmTask objects to validate
 * @returns Object with valid boolean and array of error messages
 *
 * @example
 * ```typescript
 * const tasks = [
 *   { id: 'a', blockedBy: ['nonexistent'], blocks: ['a'], ... }
 * ];
 * const result = validateDependencies(tasks);
 * // result === {
 * //   valid: false,
 * //   errors: [
 * //     "Task 'a' references non-existent task 'nonexistent' in blockedBy",
 * //     "Task 'a' has self-reference in blocks"
 * //   ]
 * // }
 * ```
 */
export function validateDependencies(tasks: SwarmTask[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const taskIds = new Set(tasks.map((t) => t.id));

  // Check for missing references and self-references
  for (const task of tasks) {
    // Check blockedBy references
    for (const depId of task.blockedBy) {
      if (depId === task.id) {
        errors.push(`Task '${task.id}' has self-reference in blockedBy`);
      } else if (!taskIds.has(depId)) {
        errors.push(
          `Task '${task.id}' references non-existent task '${depId}' in blockedBy`
        );
      }
    }

    // Check blocks references
    for (const depId of task.blocks) {
      if (depId === task.id) {
        errors.push(`Task '${task.id}' has self-reference in blocks`);
      } else if (!taskIds.has(depId)) {
        errors.push(
          `Task '${task.id}' references non-existent task '${depId}' in blocks`
        );
      }
    }
  }

  // Check for cycles
  const cycle = detectCycle(tasks);
  if (cycle) {
    errors.push(`Dependency cycle detected: ${cycle.join(' -> ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
