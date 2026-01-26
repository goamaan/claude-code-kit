/**
 * Swarm Module
 * Multi-agent orchestration for complex task execution
 */

// =============================================================================
// Dependency Graph
// =============================================================================

export {
  buildGraph,
  calculateDepths,
  topologicalSort,
  getParallelGroups,
  getReadyTasks,
  detectCycle,
  getCriticalPath,
  validateDependencies,
} from './dependency-graph.js';

// =============================================================================
// Worker Spawner
// =============================================================================

export {
  // Types
  type WorkerContext,
  type SpawnConfig,
  // Prompt Generation
  generateWorkerPrompt,
  // Model Selection
  selectModel,
  // Spawn Configuration
  createSpawnConfig,
  // Domain Mapping
  getAgentForDomain,
  // Batch Configuration
  buildBatchSpawnConfigs,
} from './spawner.js';

// =============================================================================
// Persistence
// =============================================================================

export {
  // Helper Functions
  getSwarmStorageDir,
  // Initialization
  initPersistence,
  // State Management
  saveSwarmState,
  loadSwarmState,
  clearSwarmState,
  // Task Tracking
  recordTaskCompletion,
  // History Management
  getSwarmHistory,
  recordSwarmCompletion,
  // Active Swarms
  getActiveSwarms,
  // Claude Settings Integration
  setTaskListId,
  clearTaskListId,
} from './persistence.js';

// =============================================================================
// Task Planner
// =============================================================================

export {
  // Complexity Classification
  classifyComplexity,
  // Decomposition Decisions
  shouldDecompose,
  getSuggestedSubtasks,
  // Task Template Creation
  createTaskTemplate,
  // Plan Builders
  buildImplementationPlan,
  buildDebuggingPlan,
  buildRefactoringPlan,
  buildResearchPlan,
  // Main Entry Points
  createSwarmPlan,
  getSwarmRecommendation,
} from './planner.js';
