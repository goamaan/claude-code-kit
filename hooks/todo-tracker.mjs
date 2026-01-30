#!/usr/bin/env node
/**
 * Hook: todo-tracker
 * Event: UserPromptSubmit
 * Description: Tracks TODO items mentioned in prompts
 * Matcher: *
 * Enabled: false
 *
 * todo-tracker - UserPromptSubmit Hook
 *
 * Tracks TODO items mentioned in user prompts.
 * Builds a session todo list and reminds of outstanding items.
 *
 * Hook type: UserPromptSubmit
 * Triggers: Before each user prompt is processed
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * TODO patterns to detect
 */
const TODO_PATTERNS = [
  /(?:^|\s)TODO:?\s+(.+?)(?:\n|$)/gi,
  /(?:^|\s)FIXME:?\s+(.+?)(?:\n|$)/gi,
  /(?:^|\s)HACK:?\s+(.+?)(?:\n|$)/gi,
  /(?:^|\s)\[\s*\]\s+(.+?)(?:\n|$)/gi, // Checkbox format
];

/**
 * Completion indicators
 */
const DONE_PATTERNS = [
  /(?:^|\s)(?:done|completed|finished|fixed)\s*:?\s+(.+?)(?:\n|$)/gi,
  /(?:^|\s)\[x\]\s+(.+?)(?:\n|$)/gi, // Checked checkbox
];

/**
 * Get todo state file path
 */
function getTodoFilePath() {
  const stateDir = join(homedir(), '.claudeops', 'state');
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  return join(stateDir, 'session-todos.json');
}

/**
 * Load session todos
 */
function loadTodos() {
  const filePath = getTodoFilePath();

  if (!existsSync(filePath)) {
    return { todos: [], completed: [], sessionStart: new Date().toISOString() };
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return { todos: [], completed: [], sessionStart: new Date().toISOString() };
  }
}

/**
 * Save todos
 */
function saveTodos(data) {
  const filePath = getTodoFilePath();
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Extract todos from text
 */
function extractTodos(text) {
  const todos = [];

  for (const pattern of TODO_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const todo = match[1]?.trim();
      if (todo && todo.length > 5) {
        todos.push({
          text: todo,
          timestamp: new Date().toISOString(),
          status: 'pending',
        });
      }
    }
  }

  return todos;
}

/**
 * Extract completed items from text
 */
function extractCompleted(text) {
  const completed = [];

  for (const pattern of DONE_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const item = match[1]?.trim();
      if (item && item.length > 5) {
        completed.push(item.toLowerCase());
      }
    }
  }

  return completed;
}

/**
 * Match completed items to todos
 */
function markCompleted(todos, completedTexts) {
  for (const todo of todos) {
    if (todo.status === 'completed') continue;

    const todoLower = todo.text.toLowerCase();
    for (const completed of completedTexts) {
      // Fuzzy match - if completed text contains most of todo text
      if (completed.includes(todoLower) || todoLower.includes(completed)) {
        todo.status = 'completed';
        todo.completedAt = new Date().toISOString();
        break;
      }
    }
  }
}

/**
 * Main hook function
 */
async function main() {
  // Read hook input from stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const data = JSON.parse(input);

    const userMessage = data.message || '';

    if (!userMessage.trim()) {
      process.exit(0);
      return;
    }

    // Load existing todos
    const todoData = loadTodos();

    // Extract new todos
    const newTodos = extractTodos(userMessage);

    // Extract completed items
    const completed = extractCompleted(userMessage);

    // Add new todos
    todoData.todos.push(...newTodos);

    // Mark completed todos
    if (completed.length > 0) {
      markCompleted(todoData.todos, completed);
    }

    // Save updated todos
    saveTodos(todoData);

    // Get pending todos
    const pending = todoData.todos.filter(t => t.status === 'pending');

    // Show reminder if there are pending todos
    if (pending.length > 0 && pending.length % 5 === 0) {
      const reminderMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TODO TRACKER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Outstanding items: ${pending.length}

Recent:
${pending.slice(-3).map((t, i) => `  ${i + 1}. ${t.text}`).join('\n')}

Mark as done: "done: <task>"
Clear all: export CLEAR_SESSION_TODOS=1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: reminderMessage,
        },
      }));
    }

    // Clear todos if requested
    if (process.env.CLEAR_SESSION_TODOS === '1') {
      saveTodos({ todos: [], completed: [], sessionStart: new Date().toISOString() });
    }

    process.exit(0);
  } catch {
    // On error, just continue without blocking
    process.exit(0);
  }
}

main();
