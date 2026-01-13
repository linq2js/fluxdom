/**
 * Domain configuration for the Todo application.
 *
 * This module defines the complete state management setup using FluxDom:
 * - Types: Data models and action definitions
 * - Modules: Injectable services (API layer)
 * - Domain: The root container for stores and modules
 * - Thunks: Async action creators
 * - Store: State container with Immer-powered reducer
 *
 * @module domain
 */

import { produce } from "immer";
import { domain, module } from "fluxdom";
import type { DomainContext } from "fluxdom";

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
 * Union of all actions that can be dispatched in the todo domain.
 *
 * Actions follow the Flux Standard Action pattern with a `type` discriminator.
 */
export type TodoAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; payload: Todo[] }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "ADD"; title: string }
  | { type: "ADD_SUCCESS"; item: Todo }
  | { type: "TOGGLE"; id: number }
  | { type: "REMOVE"; id: number };

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
export const TodoApiModule = module<ApiService, TodoAction>("todo-api", () => ({
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
 * - Stores (state containers)
 * - Modules (injectable services)
 * - Action dispatching and routing
 */
export const appDomain = domain<TodoAction>("app");

// =============================================================================
// Thunks (Async Actions)
// =============================================================================

/**
 * Fetches todos from the API and updates the store.
 *
 * Dispatches:
 * - LOAD_START: Before fetching
 * - LOAD_SUCCESS: On success with fetched todos
 * - LOAD_ERROR: On failure with error message
 *
 * @example
 * ```ts
 * appDomain.dispatch(fetchTodos());
 * ```
 */
export const fetchTodos =
  () =>
  ({ dispatch, get }: DomainContext<TodoAction>) => {
    dispatch({ type: "LOAD_START" });
    const api = get(TodoApiModule);

    void api
      .getTodos()
      .then((todos) => {
        dispatch({ type: "LOAD_SUCCESS", payload: todos });
      })
      .catch((err: unknown) => {
        dispatch({ type: "LOAD_ERROR", error: String(err) });
      });
  };

/**
 * Creates a new todo via the API.
 *
 * @param title - The title for the new todo
 * @returns A thunk function to dispatch
 *
 * @example
 * ```ts
 * appDomain.dispatch(addTodoThunk("Buy groceries"));
 * ```
 */
export const addTodoThunk =
  (title: string) =>
  ({ dispatch, get }: DomainContext<TodoAction>) => {
    const api = get(TodoApiModule);
    dispatch({ type: "LOAD_START" });
    void api.addTodo(title).then((newTodo) => {
      // JSONPlaceholder always returns ID 201, so we generate a unique ID
      dispatch({ type: "ADD_SUCCESS", item: { ...newTodo, id: Date.now() } });
    });
  };

// =============================================================================
// Store
// =============================================================================

/**
 * Shape of the todo store state.
 */
export interface TodoState {
  /** List of todo items */
  items: Todo[];
  /** Whether an async operation is in progress */
  loading: boolean;
  /** Error message from the last failed operation, or null */
  error: string | null;
}

/** Initial state for the todo store */
const initialState: TodoState = {
  items: [],
  loading: false,
  error: null,
};

/**
 * Todo store - manages the todo list state.
 *
 * Uses Immer for immutable updates with mutable syntax.
 * The reducer handles all TodoAction types and updates state accordingly.
 *
 * @example
 * ```tsx
 * // In React components
 * const { items, loading } = useSelector(todoStore);
 *
 * // Direct access
 * const state = todoStore.getState();
 * ```
 */
export const todoStore = appDomain.store<TodoState, TodoAction>({
  name: "todos",
  initial: initialState,
  reducer: produce((draft: TodoState, action: TodoAction) => {
    switch (action.type) {
      case "LOAD_START":
        draft.loading = true;
        draft.error = null;
        break;

      case "LOAD_SUCCESS":
        draft.loading = false;
        draft.items = action.payload;
        break;

      case "ADD_SUCCESS":
        draft.loading = false;
        draft.items.unshift(action.item); // Add to beginning
        break;

      case "ADD":
        // Optimistic local add (without API)
        draft.items.unshift({
          userId: 1,
          id: Date.now(),
          title: action.title,
          completed: false,
        });
        break;

      case "TOGGLE": {
        const todo = draft.items.find((t: Todo) => t.id === action.id);
        if (todo) todo.completed = !todo.completed;
        break;
      }

      case "REMOVE": {
        const index = draft.items.findIndex((t: Todo) => t.id === action.id);
        if (index !== -1) draft.items.splice(index, 1);
        break;
      }

      case "LOAD_ERROR":
        draft.loading = false;
        draft.error = action.error;
        break;
    }
  }),
});
