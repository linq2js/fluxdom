/**
 * Domain configuration for the Todo application.
 *
 * This module defines the complete state management setup using FluxDom:
 * - Types: Data models
 * - Modules: Injectable services (API layer)
 * - Domain: The root container for models and modules
 * - Model: State container with bound actions and effects
 *
 * @module domain
 */

import { domain, module } from "fluxdom";
import { getDevTools } from "fluxdom/devtools";
import { produce } from "immer";

// =============================================================================
// DevTools
// =============================================================================

/**
 * Global DevTools instance for debugging.
 * Connect to the domain to track state changes.
 */
export const devtools = getDevTools();

// =============================================================================
// Types
// =============================================================================

/**
 * Represents a single todo item from the API.
 */
export interface Todo {
  /** User ID that owns this todo */
  userId: number;
  /** Unique identifier */
  id: number;
  /** Todo title/description */
  title: string;
  /** Whether the todo is completed */
  completed: boolean;
}

/**
 * Shape of the todo model state.
 */
export interface TodoState {
  /** List of todo items */
  items: Todo[];
  /** Whether an async operation is in progress */
  loading: boolean;
  /** Error message from the last failed operation, or null */
  error: string | null;
}

// =============================================================================
// Modules (Dependency Injection)
// =============================================================================

/**
 * API service interface for todo operations.
 */
interface ApiService {
  /** Fetches a list of todos from the server */
  getTodos(): Promise<Todo[]>;
  /** Creates a new todo on the server */
  addTodo(title: string): Promise<Todo>;
}

/**
 * Todo API module - provides HTTP operations for todos.
 *
 * Uses JSONPlaceholder as a mock API for demonstration.
 * This module can be overridden in tests with a mock implementation.
 *
 * @example
 * ```ts
 * // Override in tests
 * appDomain.override(TodoApiModule, module("mock-api", () => ({
 *   getTodos: async () => [],
 *   addTodo: async (t) => ({ ... })
 * })));
 * ```
 */
export const TodoApiModule = module<ApiService>("todo-api", () => ({
  async getTodos() {
    const res = await fetch(
      "https://jsonplaceholder.typicode.com/todos?_limit=10"
    );
    return res.json() as Promise<Todo[]>;
  },
  async addTodo(title: string) {
    const res = await fetch("https://jsonplaceholder.typicode.com/todos", {
      method: "POST",
      body: JSON.stringify({
        title,
        userId: 1,
        completed: false,
      }),
      headers: { "Content-type": "application/json; charset=UTF-8" },
    });
    return res.json() as Promise<Todo>;
  },
}));

// =============================================================================
// Domain
// =============================================================================

/**
 * Root domain for the todo application.
 *
 * The domain acts as a container for:
 * - Models (state containers with bound methods)
 * - Modules (injectable services)
 * - Action dispatching and routing
 */
export const appDomain = domain("app");

// Connect DevTools to track this domain
devtools.connect(appDomain);

// =============================================================================
// Todo Model
// =============================================================================

/** Initial state for the todo model */
const initialState: TodoState = {
  items: [],
  loading: false,
  error: null,
};

/**
 * Todo Model - state container with bound action and effect methods.
 *
 * Actions mutate state (wrapped with Immer internally if needed):
 * - setLoading(): Mark loading state
 * - setItems(items): Set the todo list
 * - setError(error): Set error message
 * - add(title): Add a new todo locally
 * - addItem(item): Add a fetched todo
 * - toggle(id): Toggle todo completion
 * - remove(id): Remove a todo
 * - reset(): Reset to initial state
 *
 * Effects handle async operations (with lifecycle via task()):
 * - fetchTodos(): Fetch todos from API
 * - addTodo(title): Create a todo via API
 */
export const todoModel = appDomain.model({
  name: "todos",
  initial: initialState,

  actions: (ctx) => ({
    // Loading state
    setLoading: produce((draft: TodoState) => {
      draft.loading = true;
      draft.error = null;
    }),

    // Success: set items from API
    setItems: produce((draft: TodoState, items: Todo[]) => {
      draft.loading = false;
      draft.items = items;
    }),

    // Error handling
    setError: produce((draft: TodoState, error: string) => {
      draft.loading = false;
      draft.error = error;
    }),

    // Optimistic local add (without API)
    add: produce((draft: TodoState, title: string) => {
      draft.items.unshift({
        userId: 1,
        id: Date.now(),
        title,
        completed: false,
      });
    }),

    // Add from API response
    addItem: produce((draft: TodoState, item: Todo) => {
      draft.loading = false;
      draft.items.unshift(item);
    }),

    // Toggle completion
    toggle: produce((draft: TodoState, id: number) => {
      const todo = draft.items.find((t) => t.id === id);
      if (todo) todo.completed = !todo.completed;
    }),

    // Remove todo
    remove: produce((draft: TodoState, id: number) => {
      const index = draft.items.findIndex((t) => t.id === id);
      if (index !== -1) draft.items.splice(index, 1);
    }),

    // Reset to initial state
    reset: ctx.reducers.reset,
  }),

  effects: ({ task, actions, domain }) => ({
    /**
     * Fetches todos from the API and updates the model.
     * Uses task() for automatic lifecycle dispatching.
     */
    fetchTodos: task(
      async () => {
        const api = domain.get(TodoApiModule);
        return await api.getTodos();
      },
      {
        start: () => actions.setLoading(),
        done: (todos) => actions.setItems(todos),
        fail: (err) => actions.setError(String(err)),
      }
    ),

    /**
     * Creates a new todo via the API.
     * Uses task() for automatic lifecycle dispatching.
     */
    addTodo: task(
      async (title: string) => {
        const api = domain.get(TodoApiModule);
        const newTodo = await api.addTodo(title);
        // JSONPlaceholder always returns ID 201, so we generate a unique ID
        return { ...newTodo, id: Date.now() };
      },
      {
        start: () => actions.setLoading(),
        done: (item) => actions.addItem(item),
        fail: (err) => actions.setError(String(err)),
      }
    ),
  }),
});
