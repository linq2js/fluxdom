# Getting Started with FluxDom

This guide will walk you through FluxDom's core concepts with practical examples. By the end, you'll understand domains, stores, models, and modules.

## Installation

```bash
npm install fluxdom

# For React projects
npm install fluxdom @fluxdom/react
```

## Your First Store

Let's build a simple counter to understand the basics:

```ts
import { domain } from "fluxdom";

// 1. Create a domain
const app = domain("app");

// 2. Create a store with a reducer
const counterStore = app.store({
  name: "counter",
  initial: 0,
  reducer: (state, action) => {
    switch (action.type) {
      case "increment":
        return state + 1;
      case "decrement":
        return state - 1;
      case "set":
        return action.payload;
      default:
        return state;
    }
  },
});

// 3. Use the store
counterStore.dispatch({ type: "increment" });
console.log(counterStore.getState()); // 1

counterStore.dispatch({ type: "set", payload: 10 });
console.log(counterStore.getState()); // 10
```

## Working with React

FluxDom works seamlessly with React — no providers needed!

```tsx
import { useSelector } from "fluxdom/react";

function Counter() {
  const count = useSelector(counterStore);

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => counterStore.dispatch({ type: "increment" })}>
        +
      </button>
      <button onClick={() => counterStore.dispatch({ type: "decrement" })}>
        -
      </button>
    </div>
  );
}

// That's it! No <Provider> wrapper needed
function App() {
  return <Counter />;
}
```

## Organizing with Domains

As your app grows, organize related state into domains:

```ts
// Root domain
const app = domain("app");

// Feature domains
const auth = app.domain("auth");
const todos = app.domain("todos");
const settings = app.domain("settings");

// Nested domains
const filters = todos.domain("filters");

console.log(filters.name); // "app.todos.filters"
console.log(filters.root === app); // true
```

Each domain can have its own stores:

```ts
// Auth store
const authStore = auth.store({
  name: "user",
  initial: { isLoggedIn: false, user: null },
  reducer: (state, action) => {
    switch (action.type) {
      case "login":
        return { isLoggedIn: true, user: action.payload };
      case "logout":
        return { isLoggedIn: false, user: null };
      default:
        return state;
    }
  },
});

// Todos store
const todosStore = todos.store({
  name: "list",
  initial: { items: [] },
  reducer: (state, action) => {
    switch (action.type) {
      case "add":
        return {
          items: [
            ...state.items,
            {
              id: Date.now(),
              text: action.payload,
              done: false,
            },
          ],
        };
      case "toggle":
        return {
          items: state.items.map((item) =>
            item.id === action.payload ? { ...item, done: !item.done } : item
          ),
        };
      default:
        return state;
    }
  },
});
```

## Models — Stores with Bound Methods

Models provide a cleaner API by binding actions directly to the store:

```ts
const counter = app.model({
  name: "counter",
  initial: 0,
  actions: (ctx) => ({
    increment: (state) => state + 1,
    decrement: (state) => state - 1,
    add: (state, amount: number) => state + amount,
    reset: ctx.reducers.reset, // Built-in helper
    set: ctx.reducers.set, // Built-in helper
  }),
});

// Call methods directly — no dispatch needed!
counter.increment();
counter.add(5);
counter.reset();

// Models ARE stores — use them anywhere
const count = useSelector(counter);
```

### Models with Async Effects

Handle async operations with the `task()` helper:

```ts
const todos = app.model({
  name: "todos",
  initial: { items: [], loading: false, error: null },
  actions: (ctx) => ({
    setLoading: (state, loading: boolean) => ({ ...state, loading }),
    setItems: (state, items) => ({ ...state, items, loading: false }),
    setError: (state, error) => ({ ...state, error, loading: false }),
    reset: ctx.reducers.reset,
  }),
  effects: ({ task, actions }) => ({
    fetchTodos: task(
      async () => {
        const response = await fetch("/api/todos");
        return response.json();
      },
      {
        start: () => actions.setLoading(true),
        done: (items) => actions.setItems(items),
        fail: (err) => actions.setError(err.message),
      }
    ),
  }),
});

// Use the effect
await todos.fetchTodos();
```

## Derived Stores — Computed State

Create computed values that automatically update:

```ts
const stats = todos.derived("stats", [todosStore], (todos) => ({
  total: todos.items.length,
  completed: todos.items.filter((t) => t.done).length,
  remaining: todos.items.filter((t) => !t.done).length,
}));

// Always up-to-date
console.log(stats.getState()); // { total: 3, completed: 1, remaining: 2 }

// Subscribe to changes
stats.onChange(() => {
  console.log("Stats updated:", stats.getState());
});
```

## Modules — Dependency Injection

Modules let you inject services and swap implementations:

```ts
import { module } from "fluxdom";

// Define an API service
interface ApiService {
  fetchTodos: () => Promise<Todo[]>;
  saveTodo: (todo: Todo) => Promise<void>;
}

const ApiModule = module<ApiService>("api", () => ({
  fetchTodos: async () => {
    const response = await fetch("/api/todos");
    return response.json();
  },
  saveTodo: async (todo) => {
    await fetch("/api/todos", {
      method: "POST",
      body: JSON.stringify(todo),
      headers: { "Content-Type": "application/json" },
    });
  },
}));

// Use in effects
const todos = app.model({
  name: "todos",
  initial: { items: [] },
  actions: (ctx) => ({
    setItems: (state, items) => ({ ...state, items }),
  }),
  effects: ({ actions, domain }) => ({
    loadTodos: async () => {
      const api = domain.get(ApiModule);
      const items = await api.fetchTodos();
      actions.setItems(items);
    },
  }),
});
```

### Testing with Mocks

Override modules for testing:

```ts
// Mock API for tests
const MockApi = module<ApiService>("api", () => ({
  fetchTodos: async () => [{ id: 1, text: "Test todo", done: false }],
  saveTodo: async () => {},
}));

// Override in tests
const restore = app.override(ApiModule, MockApi);

// Run tests...
await todos.loadTodos();
console.log(todos.getState().items); // Mock data

// Restore after tests
restore();
```

## Event Listeners

Listen to actions flowing through your app:

```ts
// Listen to specific store
todosStore.onDispatch(({ action, source }) => {
  console.log(`[${source}] ${action.type}`);
});

// Listen to everything in a domain
app.onAnyDispatch(({ action, source }) => {
  // Perfect for analytics, logging, debugging
  analytics.track("action", { type: action.type, source });
});
```

## Batching Updates

Batch multiple updates for better performance:

```ts
import { batch } from "fluxdom";

// Without batch: 3 notifications
counter.increment();
counter.increment();
counter.increment();

// With batch: 1 notification
batch(() => {
  counter.increment();
  counter.increment();
  counter.increment();
});
```

## Next Steps

You now understand FluxDom's core concepts! Here's what to explore next:

- **[API Reference](./api-reference.md)** — Complete API documentation
- **[Advanced Usage](./advanced-usage.md)** — Complex patterns, plugins, and optimization

## Common Patterns

### Todo App Structure

```ts
const app = domain("app");

// Models for different features
const auth = app.model({
  name: "auth",
  initial: { user: null, isLoggedIn: false },
  actions: (ctx) => ({
    login: (state, user) => ({ ...state, user, isLoggedIn: true }),
    logout: ctx.reducers.reset,
  }),
});

const todos = app.model({
  name: "todos",
  initial: { items: [], filter: "all" },
  actions: (ctx) => ({
    add: (state, text) => ({
      ...state,
      items: [...state.items, { id: Date.now(), text, done: false }],
    }),
    toggle: (state, id) => ({
      ...state,
      items: state.items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      ),
    }),
    setFilter: (state, filter) => ({ ...state, filter }),
  }),
});

// Derived state
const visibleTodos = app.derived("visibleTodos", [todos], (todos) => {
  switch (todos.filter) {
    case "active":
      return todos.items.filter((t) => !t.done);
    case "completed":
      return todos.items.filter((t) => t.done);
    default:
      return todos.items;
  }
});
```

### React Components

```tsx
function TodoApp() {
  const { isLoggedIn } = useSelector(auth);

  if (!isLoggedIn) {
    return <LoginForm />;
  }

  return (
    <div>
      <TodoInput />
      <TodoList />
      <TodoFilters />
    </div>
  );
}

function TodoInput() {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      todos.add(text.trim());
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs to be done?"
      />
    </form>
  );
}

function TodoList() {
  const items = useSelector(visibleTodos);

  return (
    <ul>
      {items.map((todo) => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.done}
            onChange={() => todos.toggle(todo.id)}
          />
          <span style={{ textDecoration: todo.done ? "line-through" : "none" }}>
            {todo.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TodoFilters() {
  const { filter } = useSelector(todos);

  return (
    <div>
      {["all", "active", "completed"].map((f) => (
        <button
          key={f}
          onClick={() => todos.setFilter(f)}
          style={{ fontWeight: filter === f ? "bold" : "normal" }}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
```

This covers the essential patterns you'll use in most FluxDom applications. The key is to start simple and add complexity as needed!
