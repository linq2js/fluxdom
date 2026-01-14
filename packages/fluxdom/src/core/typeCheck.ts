import { module } from "./module";
import { domain } from "./domain";
import { actions } from "./actions";

// =============================================================================
// Global Actions - Cross-cutting actions for entire app
// =============================================================================

/**
 * Global actions that can be dispatched to reset/clear app state.
 * Using actions() creates type-safe action creators with .match() for use with ctx.on()
 */
export const globalActions = actions("global", {
  /** Reset all app state */
  resetAll: true,
  /** User logged out - clear sensitive data */
  logout: true,
});

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
 *
 * Note: Domain dispatch accepts AnyAction - type safety comes from action creators.
 */
export const appDomain = domain("app");

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
 * Todo Model - state container with bound action and thunk methods.
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
 * Thunks handle async operations:
 * - fetchTodos(): Fetch todos from API
 * - addTodo(title): Create a todo via API
 */
export const todoModel = appDomain.model({
  name: "todos",
  initial: initialState,

  actions: (ctx) => {
    // ✅ Handle cross-cutting domain actions via ctx.on()
    ctx.on(globalActions.resetAll, () => initialState);
    ctx.on(globalActions.logout, () => initialState);

    // ✅ Handle multiple actions with a single handler
    // ctx.on([globalActions.resetAll, globalActions.logout], () => initialState);

    // Can also reuse action handlers via ctx.reducers
    // ctx.on(someAction, ctx.reducers.reset);

    return {
      setLoading: (state: TodoState): TodoState => ({
        ...state,
        loading: true,
        error: null,
      }),
      setItems: (state: TodoState, items: Todo[]): TodoState => ({
        ...state,
        loading: false,
        items,
      }),
      setError: (state: TodoState, error: string): TodoState => ({
        ...state,
        loading: false,
        error,
      }),
      add: (state: TodoState, title: string): TodoState => ({
        ...state,
        items: [
          {
            userId: 1,
            id: Date.now(),
            title,
            completed: false,
          },
          ...state.items,
        ],
      }),
      addItem: (state: TodoState, item: Todo): TodoState => ({
        ...state,
        loading: false,
        items: [item, ...state.items],
      }),
      toggle: (state: TodoState, id: number): TodoState => ({
        ...state,
        items: state.items.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t
        ),
      }),
      remove: (state: TodoState, id: number): TodoState => ({
        ...state,
        items: state.items.filter((t) => t.id !== id),
      }),
      reset: ctx.reducers.reset,
    };
  },

  effects: ({ task, domain, actions }) => ({
    // Using task() with lifecycle hooks
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

    // Using task() for another effect
    addTodo: task(
      async (title: string) => {
        const api = domain.get(TodoApiModule);
        const newTodo = await api.addTodo(title);
        return { ...newTodo, id: Date.now() };
      },
      {
        start: () => actions.setLoading(),
        done: (todo) => actions.addItem(todo),
        fail: (err) => actions.setError(String(err)),
      }
    ),
  }),
});

// =============================================================================
// Type Check: Domain Dispatch accepts AnyAction
// =============================================================================

/**
 * Domain dispatch accepts any action (AnyAction).
 * Type safety comes from action creators, not domain typing.
 *
 * This is similar to Redux - the store/domain just routes actions,
 * action creators provide type safety.
 */

// --- Domain dispatch accepts any action ---
const app = domain("app");

// ✅ Can dispatch any action with any properties
app.dispatch({ type: "ANYTHING" });
app.dispatch({ type: "WITH_PAYLOAD", payload: 123 });
app.dispatch({ type: "CUSTOM", value: "hello", extra: true, nested: { a: 1 } });

// ✅ Type safety comes from action creators (recommended)
// const todoActions = actions("todos", {
//   add: (title: string) => ({ title }),
//   remove: (id: number) => ({ id }),
// });
// app.dispatch(todoActions.add("Hello")); // Type-safe via action creator

// --- TDomainAction is for module/context typing, not dispatch restriction ---
// The type parameter is still useful for:
// - Module resolution typing
// - Context typing in thunks
// But dispatch always accepts AnyAction

// =============================================================================
// matches() Utility - Type-safe action matching in listeners
// =============================================================================

import { matches } from "../utils";
import { Action } from "../types";

// Define some local actions
const localTodoActions = actions("local-todos", {
  add: (title: string) => ({ title }),
  remove: (id: number) => id,
});

// ✅ Use matches() in dispatch listeners for type-safe action handling
appDomain.onAnyDispatch(({ action }) => {
  // Single action - type narrowing works!
  if (matches(action, localTodoActions.add)) {
    // action is narrowed to { type: "local-todos/add", payload: { title: string } }
    console.log("Added todo:", action.payload.title);
  }

  // Multiple actions
  if (matches(action, [localTodoActions.add, localTodoActions.remove])) {
    console.log("Local todo list changed");
  }

  // ✅ Use matches() with global actions too
  if (matches(action, globalActions.resetAll)) {
    console.log("App is resetting...");
  }

  // ✅ Match multiple global actions
  if (matches(action, [globalActions.resetAll, globalActions.logout])) {
    console.log("Clearing local cache...");
  }
});

// ✅ Type guard narrows broad Action type
export function handleAction(action: Action) {
  if (matches(action, localTodoActions.add)) {
    // action.payload.title is typed as string
    const title: string = action.payload.title;
    console.log(title);
  }
}
