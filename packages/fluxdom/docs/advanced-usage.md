# Advanced FluxDom Usage

This guide covers advanced patterns, performance optimization, complex state management, and plugin development.

## Table of Contents

- [Advanced State Patterns](#advanced-state-patterns)
- [Performance Optimization](#performance-optimization)
- [Plugin Development](#plugin-development)
- [Complex Async Patterns](#complex-async-patterns)
- [Testing Strategies](#testing-strategies)
- [Architecture Patterns](#architecture-patterns)
- [Integration Patterns](#integration-patterns)

---

## Advanced State Patterns

### Normalized State with Derived Stores

Manage relational data efficiently:

```ts
// Normalized stores
const users = app.model({
  name: "users",
  initial: { byId: {}, allIds: [] },
  actions: (ctx) => ({
    addUser: (state, user) => ({
      byId: { ...state.byId, [user.id]: user },
      allIds: state.allIds.includes(user.id) 
        ? state.allIds 
        : [...state.allIds, user.id]
    }),
    updateUser: (state, { id, changes }) => ({
      ...state,
      byId: { ...state.byId, [id]: { ...state.byId[id], ...changes } }
    }),
    removeUser: (state, id) => ({
      byId: Object.fromEntries(
        Object.entries(state.byId).filter(([key]) => key !== id)
      ),
      allIds: state.allIds.filter(uid => uid !== id)
    }),
  }),
});

const posts = app.model({
  name: "posts",
  initial: { byId: {}, allIds: [] },
  actions: (ctx) => ({
    addPost: (state, post) => ({
      byId: { ...state.byId, [post.id]: post },
      allIds: [...state.allIds, post.id]
    }),
    // ... other actions
  }),
});

// Derived selectors
const allUsers = app.derived("allUsers", [users], (users) =>
  users.allIds.map(id => users.byId[id])
);

const postsByUser = app.derived(
  "postsByUser", 
  [posts, users], 
  (posts, users) => {
    const result = {};
    users.allIds.forEach(userId => {
      result[userId] = posts.allIds
        .map(postId => posts.byId[postId])
        .filter(post => post.authorId === userId);
    });
    return result;
  }
);

// Usage
const userPosts = useSelector(postsByUser, (byUser) => byUser[currentUserId]);
```

### State Machines with Models

Implement finite state machines:

```ts
type LoadingState = 
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: any }
  | { status: "error"; error: string };

const dataLoader = app.model({
  name: "dataLoader",
  initial: { status: "idle" } as LoadingState,
  actions: (ctx) => ({
    startLoading: (state): LoadingState => 
      state.status === "idle" ? { status: "loading" } : state,
    
    loadSuccess: (state, data): LoadingState =>
      state.status === "loading" ? { status: "success", data } : state,
    
    loadError: (state, error: string): LoadingState =>
      state.status === "loading" ? { status: "error", error } : state,
    
    reset: (): LoadingState => ({ status: "idle" }),
  }),
  effects: ({ task, actions }) => ({
    loadData: task(
      async (url: string) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      },
      {
        start: () => actions.startLoading(),
        done: (data) => actions.loadSuccess(data),
        fail: (err) => actions.loadError(err.message),
      }
    ),
  }),
});

// Type-safe usage
function DataComponent() {
  const state = useSelector(dataLoader);
  
  switch (state.status) {
    case "idle":
      return <button onClick={() => dataLoader.loadData("/api/data")}>Load</button>;
    case "loading":
      return <div>Loading...</div>;
    case "success":
      return <div>Data: {JSON.stringify(state.data)}</div>;
    case "error":
      return <div>Error: {state.error}</div>;
  }
}
```

### Cross-Domain Communication

Handle actions across domain boundaries:

```ts
const app = domain("app");
const auth = app.domain("auth");
const todos = app.domain("todos");

// Auth model
const authModel = auth.model({
  name: "user",
  initial: { user: null, isLoggedIn: false },
  actions: (ctx) => ({
    login: (state, user) => ({ user, isLoggedIn: true }),
    logout: ctx.reducers.reset,
    
    // Handle domain-wide actions
    ...ctx.on((state, action) => {
      if (action.type === "RESET_ALL") return ctx.reducers.reset(state);
      return state;
    }),
  }),
});

// Todos model that reacts to auth changes
const todosModel = todos.model({
  name: "list",
  initial: { items: [], filter: "all" },
  actions: (ctx) => ({
    addTodo: (state, text) => ({
      ...state,
      items: [...state.items, { id: Date.now(), text, done: false }]
    }),
    
    // Handle cross-domain actions
    ...ctx.on((state, action) => {
      if (action.type === "LOGOUT" || action.type === "RESET_ALL") {
        return ctx.reducers.reset(state);
      }
      return state;
    }),
  }),
});

// Global actions
const globalActions = {
  logout: () => app.dispatch({ type: "LOGOUT" }),
  resetAll: () => app.dispatch({ type: "RESET_ALL" }),
};
```

---

## Performance Optimization

### Equality Strategies

Choose the right equality strategy for your data:

```ts
// Primitive state - use default (strict)
const counter = app.model({
  name: "counter",
  initial: 0,
  // equals: "strict" (default)
});

// Flat objects - use shallow
const settings = app.model({
  name: "settings",
  initial: { theme: "dark", fontSize: 14, sidebar: true },
  equals: "shallow",
});

// Nested objects - use shallow2/shallow3 or custom
const user = app.model({
  name: "user",
  initial: { 
    profile: { name: "", avatar: "" },
    preferences: { notifications: true }
  },
  equals: "shallow2", // 2 levels deep
});

// Custom equality for specific fields
const expensiveData = app.model({
  name: "data",
  initial: { id: 0, data: [], lastUpdated: Date.now() },
  equals: (prev, next) => prev.id === next.id, // Only care about ID changes
});
```

### Selective Subscriptions

Use selectors to minimize re-renders:

```tsx
// ❌ Bad - subscribes to entire state
function TodoList() {
  const state = useSelector(todosModel);
  return state.items.map(todo => <TodoItem key={todo.id} todo={todo} />);
}

// ✅ Good - subscribes only to items array
function TodoList() {
  const items = useSelector(todosModel, state => state.items);
  return items.map(todo => <TodoItem key={todo.id} todo={todo} />);
}

// ✅ Even better - memoize the selector
const selectTodoItems = (state) => state.items;

function TodoList() {
  const items = useSelector(todosModel, selectTodoItems);
  return items.map(todo => <TodoItem key={todo.id} todo={todo} />);
}

// ✅ Best - use derived store for complex selections
const visibleTodos = app.derived(
  "visibleTodos",
  [todosModel],
  (todos) => {
    switch (todos.filter) {
      case "active": return todos.items.filter(t => !t.done);
      case "completed": return todos.items.filter(t => t.done);
      default: return todos.items;
    }
  }
);

function TodoList() {
  const items = useSelector(visibleTodos);
  return items.map(todo => <TodoItem key={todo.id} todo={todo} />);
}
```

### Batching Updates

Use `batch()` for multiple related updates:

```ts
import { batch } from "fluxdom";

// ❌ Bad - 3 separate notifications
function updateUserProfile(changes) {
  user.setName(changes.name);
  user.setEmail(changes.email);
  user.setAvatar(changes.avatar);
}

// ✅ Good - 1 notification
function updateUserProfile(changes) {
  batch(() => {
    user.setName(changes.name);
    user.setEmail(changes.email);
    user.setAvatar(changes.avatar);
  });
}

// ✅ Even better - single action
const user = app.model({
  name: "user",
  initial: { name: "", email: "", avatar: "" },
  actions: (ctx) => ({
    updateProfile: (state, changes) => ({ ...state, ...changes }),
  }),
});

function updateUserProfile(changes) {
  user.updateProfile(changes);
}
```

### Memory Management

Prevent memory leaks with proper cleanup:

```tsx
function Component() {
  useEffect(() => {
    // ✅ Store unsubscribe functions
    const unsubscribes = [
      store.onChange(() => console.log("changed")),
      app.onAnyDispatch(({ action }) => console.log(action.type)),
    ];
    
    // ✅ Cleanup on unmount
    return () => unsubscribes.forEach(unsub => unsub());
  }, []);
  
  // Component JSX...
}

// ✅ Or use custom hook
function useStoreLogger(store) {
  useEffect(() => {
    return store.onChange(() => console.log("Store changed:", store.name));
  }, [store]);
}
```

---

## Plugin Development

### Creating Domain Plugins

Build reusable plugins for common functionality:

```ts
// Logging plugin
export function createLoggingPlugin(options: { 
  prefix?: string;
  logLevel?: "info" | "debug" | "warn";
}) {
  const { prefix = "FluxDom", logLevel = "info" } = options;
  
  return {
    store: {
      pre: (config) => {
        console.log(`${prefix}[store:pre]`, config.name);
      },
      post: (store, config) => {
        console.log(`${prefix}[store:created]`, store.name, config.initial);
      },
    },
    domain: {
      post: (domain, config) => {
        console.log(`${prefix}[domain:created]`, domain.name);
      },
    },
  };
}

// Persistence plugin
export function createPersistencePlugin(storage: Storage) {
  return {
    store: {
      filter: (config) => config.meta?.persisted === true,
      pre: (config) => {
        try {
          const saved = storage.getItem(config.name);
          if (saved) {
            return { ...config, initial: JSON.parse(saved) };
          }
        } catch (error) {
          console.warn("Failed to load persisted state:", error);
        }
        return config;
      },
      post: (store, config) => {
        store.onChange(() => {
          try {
            storage.setItem(store.name, JSON.stringify(store.getState()));
          } catch (error) {
            console.warn("Failed to persist state:", error);
          }
        });
      },
    },
  };
}

// DevTools plugin
export function createDevToolsPlugin() {
  return {
    store: {
      post: (store) => {
        if (typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION__) {
          const devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
            name: store.name,
          });
          
          devTools.init(store.getState());
          
          store.onDispatch(({ action }) => {
            devTools.send(action, store.getState());
          });
        }
      },
    },
  };
}

// Usage
const app = domain("app")
  .plugin(createLoggingPlugin({ prefix: "MyApp" }))
  .plugin(createPersistencePlugin(localStorage))
  .plugin(createDevToolsPlugin());
```

### Performance Monitoring Plugin

Track store performance:

```ts
export function createPerformancePlugin() {
  const metrics = new Map();
  
  return {
    store: {
      post: (store) => {
        const storeName = store.name;
        metrics.set(storeName, {
          dispatchCount: 0,
          totalTime: 0,
          avgTime: 0,
        });
        
        store.onDispatch(({ action }) => {
          const start = performance.now();
          
          // Use setTimeout to measure after state update
          setTimeout(() => {
            const end = performance.now();
            const duration = end - start;
            
            const current = metrics.get(storeName);
            const newCount = current.dispatchCount + 1;
            const newTotal = current.totalTime + duration;
            
            metrics.set(storeName, {
              dispatchCount: newCount,
              totalTime: newTotal,
              avgTime: newTotal / newCount,
            });
            
            if (duration > 16) { // Warn if > 1 frame
              console.warn(
                `Slow dispatch in ${storeName}: ${action.type} took ${duration.toFixed(2)}ms`
              );
            }
          }, 0);
        });
      },
    },
    
    // Add method to get metrics
    getMetrics: () => Object.fromEntries(metrics),
  };
}

// Usage
const perfPlugin = createPerformancePlugin();
const app = domain("app").plugin(perfPlugin);

// Later, check performance
console.log(perfPlugin.getMetrics());
```

---

## Complex Async Patterns

### Cancellable Operations

Handle operation cancellation:

```ts
const dataFetcher = app.model({
  name: "dataFetcher",
  initial: { 
    data: null, 
    loading: false, 
    error: null,
    currentRequest: null as AbortController | null
  },
  actions: (ctx) => ({
    setLoading: (state, loading) => ({ ...state, loading }),
    setData: (state, data) => ({ ...state, data, loading: false }),
    setError: (state, error) => ({ ...state, error, loading: false }),
    setRequest: (state, controller) => ({ ...state, currentRequest: controller }),
    clearRequest: (state) => ({ ...state, currentRequest: null }),
  }),
  effects: ({ actions, getState }) => ({
    fetchData: async (url: string) => {
      // Cancel previous request
      const current = getState().currentRequest;
      if (current) {
        current.abort();
      }
      
      const controller = new AbortController();
      actions.setRequest(controller);
      actions.setLoading(true);
      
      try {
        const response = await fetch(url, { signal: controller.signal });
        const data = await response.json();
        actions.setData(data);
      } catch (error) {
        if (error.name !== "AbortError") {
          actions.setError(error.message);
        }
      } finally {
        actions.clearRequest();
      }
    },
    
    cancel: () => {
      const current = getState().currentRequest;
      if (current) {
        current.abort();
        actions.clearRequest();
        actions.setLoading(false);
      }
    },
  }),
});
```

### Retry Logic with Exponential Backoff

Implement robust retry mechanisms:

```ts
function createRetryTask<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = options;
  
  return async function retryableOperation(): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt),
          maxDelay
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  };
}

const apiClient = app.model({
  name: "apiClient",
  initial: { data: null, loading: false, error: null },
  actions: (ctx) => ({
    setLoading: (state, loading) => ({ ...state, loading }),
    setData: (state, data) => ({ ...state, data, loading: false }),
    setError: (state, error) => ({ ...state, error, loading: false }),
  }),
  effects: ({ task, actions }) => ({
    fetchWithRetry: task(
      createRetryTask(
        () => fetch("/api/data").then(r => r.json()),
        { maxRetries: 3, baseDelay: 1000 }
      ),
      {
        start: () => actions.setLoading(true),
        done: (data) => actions.setData(data),
        fail: (error) => actions.setError(error.message),
      }
    ),
  }),
});
```

### Optimistic Updates

Implement optimistic UI patterns:

```ts
const todos = app.model({
  name: "todos",
  initial: { items: [], optimisticItems: [] },
  actions: (ctx) => ({
    setItems: (state, items) => ({ ...state, items }),
    addOptimistic: (state, todo) => ({
      ...state,
      optimisticItems: [...state.optimisticItems, { ...todo, optimistic: true }]
    }),
    removeOptimistic: (state, tempId) => ({
      ...state,
      optimisticItems: state.optimisticItems.filter(t => t.tempId !== tempId)
    }),
    confirmOptimistic: (state, { tempId, realTodo }) => ({
      ...state,
      items: [...state.items, realTodo],
      optimisticItems: state.optimisticItems.filter(t => t.tempId !== tempId)
    }),
  }),
  effects: ({ actions, getState }) => ({
    addTodo: async (text: string) => {
      const tempId = `temp_${Date.now()}`;
      const optimisticTodo = { tempId, text, done: false };
      
      // Optimistic update
      actions.addOptimistic(optimisticTodo);
      
      try {
        const response = await fetch("/api/todos", {
          method: "POST",
          body: JSON.stringify({ text }),
          headers: { "Content-Type": "application/json" },
        });
        
        const realTodo = await response.json();
        actions.confirmOptimistic({ tempId, realTodo });
      } catch (error) {
        // Rollback optimistic update
        actions.removeOptimistic(tempId);
        throw error;
      }
    },
  }),
});

// Derived store combining real and optimistic items
const allTodos = app.derived("allTodos", [todos], (todos) => [
  ...todos.items,
  ...todos.optimisticItems,
]);
```

---

## Testing Strategies

### Unit Testing Models

Test models in isolation:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { domain } from "fluxdom";

describe("Counter Model", () => {
  let app;
  let counter;
  
  beforeEach(() => {
    app = domain("test");
    counter = app.model({
      name: "counter",
      initial: 0,
      actions: (ctx) => ({
        increment: (state) => state + 1,
        add: (state, amount) => state + amount,
        reset: ctx.reducers.reset,
      }),
    });
  });
  
  it("should increment", () => {
    counter.increment();
    expect(counter.getState()).toBe(1);
  });
  
  it("should add amount", () => {
    counter.add(5);
    expect(counter.getState()).toBe(5);
  });
  
  it("should reset", () => {
    counter.add(10);
    counter.reset();
    expect(counter.getState()).toBe(0);
  });
});
```

### Integration Testing with Modules

Test with mocked dependencies:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { domain, module } from "fluxdom";

// Mock API module
const MockApiModule = module("api", () => ({
  fetchTodos: vi.fn().mockResolvedValue([
    { id: 1, text: "Test todo", done: false }
  ]),
  saveTodo: vi.fn().mockResolvedValue({ id: 2, text: "New todo", done: false }),
}));

describe("Todos Integration", () => {
  let app;
  let todos;
  let mockApi;
  
  beforeEach(() => {
    app = domain("test");
    
    // Override with mock
    app.override(ApiModule, MockApiModule);
    mockApi = app.get(MockApiModule);
    
    todos = app.model({
      name: "todos",
      initial: { items: [], loading: false },
      actions: (ctx) => ({
        setItems: (state, items) => ({ ...state, items }),
        setLoading: (state, loading) => ({ ...state, loading }),
      }),
      effects: ({ actions, domain }) => ({
        loadTodos: async () => {
          actions.setLoading(true);
          const api = domain.get(ApiModule);
          const items = await api.fetchTodos();
          actions.setItems(items);
          actions.setLoading(false);
        },
      }),
    });
  });
  
  it("should load todos", async () => {
    await todos.loadTodos();
    
    expect(mockApi.fetchTodos).toHaveBeenCalled();
    expect(todos.getState().items).toHaveLength(1);
    expect(todos.getState().loading).toBe(false);
  });
});
```

### React Component Testing

Test components with FluxDom stores:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { domain } from "fluxdom";
import { useSelector } from "fluxdom/react";

function Counter() {
  const count = useSelector(counter);
  
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={() => counter.increment()}>+</button>
    </div>
  );
}

describe("Counter Component", () => {
  let app;
  let counter;
  
  beforeEach(() => {
    app = domain("test");
    counter = app.model({
      name: "counter",
      initial: 0,
      actions: (ctx) => ({
        increment: (state) => state + 1,
      }),
    });
  });
  
  it("should display count and increment", () => {
    render(<Counter />);
    
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    
    fireEvent.click(screen.getByText("+"));
    
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });
});
```

---

## Architecture Patterns

### Feature-Based Organization

Structure large applications by features:

```
src/
├── domains/
│   ├── auth/
│   │   ├── models/
│   │   │   ├── user.ts
│   │   │   └── session.ts
│   │   ├── modules/
│   │   │   └── authApi.ts
│   │   └── index.ts
│   ├── todos/
│   │   ├── models/
│   │   │   ├── todoList.ts
│   │   │   └── filters.ts
│   │   ├── modules/
│   │   │   └── todosApi.ts
│   │   └── index.ts
│   └── shared/
│       ├── modules/
│       │   ├── httpClient.ts
│       │   └── storage.ts
│       └── plugins/
│           ├── logging.ts
│           └── persistence.ts
└── app.ts
```

```ts
// domains/auth/index.ts
export { userModel } from "./models/user";
export { sessionModel } from "./models/session";
export { AuthApiModule } from "./modules/authApi";

// domains/todos/index.ts
export { todoListModel } from "./models/todoList";
export { filtersModel } from "./models/filters";
export { TodosApiModule } from "./modules/todosApi";

// app.ts
import { domain } from "fluxdom";
import { createLoggingPlugin, createPersistencePlugin } from "./domains/shared/plugins";
import { HttpClientModule, StorageModule } from "./domains/shared/modules";

export const app = domain("app")
  .plugin(createLoggingPlugin())
  .plugin(createPersistencePlugin());

// Configure shared modules
app.override(StorageModule, WebStorageModule);
app.override(HttpClientModule, FetchHttpClientModule);
```

### Micro-Frontend Architecture

Use domains for micro-frontend boundaries:

```ts
// Shell application
const shell = domain("shell");

// Micro-frontend domains
const authMF = shell.domain("auth");
const todosMF = shell.domain("todos");
const dashboardMF = shell.domain("dashboard");

// Each micro-frontend manages its own state
const authModule = authMF.model({
  name: "auth",
  initial: { user: null, isLoggedIn: false },
  // ... auth logic
});

const todosModule = todosMF.model({
  name: "todos",
  initial: { items: [] },
  // ... todos logic
});

// Cross-micro-frontend communication via shell
shell.onAnyDispatch(({ action, source }) => {
  // Route events between micro-frontends
  if (action.type === "USER_LOGGED_OUT") {
    todosMF.dispatch({ type: "CLEAR_USER_DATA" });
    dashboardMF.dispatch({ type: "CLEAR_USER_DATA" });
  }
});
```

### Event Sourcing Pattern

Implement event sourcing with FluxDom:

```ts
const eventStore = app.model({
  name: "events",
  initial: { events: [], version: 0 },
  actions: (ctx) => ({
    appendEvent: (state, event) => ({
      events: [...state.events, { ...event, version: state.version + 1 }],
      version: state.version + 1,
    }),
    replayTo: (state, targetVersion) => {
      // Replay events up to target version
      const events = state.events.slice(0, targetVersion);
      return { events, version: targetVersion };
    },
  }),
});

// Aggregate that rebuilds from events
const userAggregate = app.derived(
  "userAggregate",
  [eventStore],
  (eventStore) => {
    return eventStore.events.reduce((user, event) => {
      switch (event.type) {
        case "USER_CREATED":
          return { id: event.userId, name: event.name, email: event.email };
        case "USER_NAME_CHANGED":
          return { ...user, name: event.name };
        case "USER_EMAIL_CHANGED":
          return { ...user, email: event.email };
        default:
          return user;
      }
    }, null);
  }
);

// Commands that generate events
const userCommands = {
  createUser: (userId, name, email) => {
    eventStore.appendEvent({
      type: "USER_CREATED",
      userId,
      name,
      email,
      timestamp: Date.now(),
    });
  },
  
  changeName: (userId, name) => {
    eventStore.appendEvent({
      type: "USER_NAME_CHANGED",
      userId,
      name,
      timestamp: Date.now(),
    });
  },
};
```

---

## Integration Patterns

### Next.js Integration

Integrate with Next.js for SSR:

```ts
// lib/store.ts
import { domain } from "fluxdom";
import { createPersistencePlugin } from "./plugins";

export const app = domain("app");

// Only add persistence on client
if (typeof window !== "undefined") {
  app.plugin(createPersistencePlugin(localStorage));
}

export const userModel = app.model({
  name: "user",
  initial: { name: "", email: "" },
  actions: (ctx) => ({
    setUser: (state, user) => ({ ...state, ...user }),
    reset: ctx.reducers.reset,
  }),
});

// pages/_app.tsx
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { userModel } from "../lib/store";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Hydrate from server props if available
    if (pageProps.initialUser) {
      userModel.setUser(pageProps.initialUser);
    }
  }, [pageProps.initialUser]);

  return <Component {...pageProps} />;
}

// pages/api/user.ts
export default function handler(req, res) {
  // Server-side user data
  res.json({ name: "John Doe", email: "john@example.com" });
}

// pages/profile.tsx
import { GetServerSideProps } from "next";
import { useSelector } from "fluxdom/react";
import { userModel } from "../lib/store";

export default function Profile({ initialUser }) {
  const user = useSelector(userModel);
  
  return (
    <div>
      <h1>Profile</h1>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  // Fetch user data on server
  const res = await fetch("http://localhost:3000/api/user");
  const initialUser = await res.json();
  
  return {
    props: { initialUser },
  };
};
```

### React Native Integration

Platform-specific modules for React Native:

```ts
// modules/storage.ts
import { module } from "fluxdom";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Storage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// React Native implementation
export const RNStorageModule = module<Storage>("storage", () => ({
  getItem: AsyncStorage.getItem,
  setItem: AsyncStorage.setItem,
  removeItem: AsyncStorage.removeItem,
}));

// Web implementation
export const WebStorageModule = module<Storage>("storage", () => ({
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => localStorage.setItem(key, value),
  removeItem: async (key) => localStorage.removeItem(key),
}));

// App.tsx
import { app } from "./store";
import { RNStorageModule } from "./modules/storage";

// Configure platform-specific modules
app.override(StorageModule, RNStorageModule);

export default function App() {
  return (
    // Your app components
  );
}
```

### Electron Integration

Handle main/renderer process communication:

```ts
// main.ts (Electron main process)
import { app, BrowserWindow, ipcMain } from "electron";
import { domain } from "fluxdom";

const mainDomain = domain("main");

const appState = mainDomain.model({
  name: "app",
  initial: { windows: [], settings: {} },
  actions: (ctx) => ({
    addWindow: (state, window) => ({
      ...state,
      windows: [...state.windows, window],
    }),
    updateSettings: (state, settings) => ({
      ...state,
      settings: { ...state.settings, ...settings },
    }),
  }),
});

// IPC handlers
ipcMain.handle("get-app-state", () => appState.getState());
ipcMain.handle("update-settings", (_, settings) => {
  appState.updateSettings(settings);
});

// renderer.ts (Electron renderer process)
import { domain } from "fluxdom";
import { ipcRenderer } from "electron";

const rendererDomain = domain("renderer");

const settingsModel = rendererDomain.model({
  name: "settings",
  initial: { theme: "light", language: "en" },
  actions: (ctx) => ({
    updateSettings: (state, settings) => ({ ...state, ...settings }),
  }),
  effects: ({ actions }) => ({
    syncWithMain: async (settings) => {
      await ipcRenderer.invoke("update-settings", settings);
      actions.updateSettings(settings);
    },
  }),
});
```

This completes the advanced usage guide, covering complex patterns, performance optimization, plugin development, and integration strategies for FluxDom.