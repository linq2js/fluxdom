# 🌊 FluxDom

**State management that scales with your ambition.**

Tired of wrestling with global state? FluxDom brings order to chaos with a hierarchical, domain-driven approach. Build features in isolation, compose them together, and watch your state flow like water.

```bash
npm install fluxdom
```

**No boilerplate. No providers. No nonsense.**

---

## ⚡ Quick Start

### Create a store in 30 seconds

```ts
import { domain } from "fluxdom";

// 1. Create a domain — your state's home
const app = domain("app");

// 2. Create a store — state can be anything (primitives, objects, arrays)
const counterStore = app.store({
  name: "counter",
  initial: 0,
  reducer: (state, action) => {
    switch (action.type) {
      case "INC":
        return state + 1;
      case "DEC":
        return state - 1;
      default:
        return state;
    }
  },
});

// 3. Dispatch — make things happen
counterStore.dispatch({ type: "INC" });
console.log(counterStore.getState()); // 1
```

### Works with Vanilla JS

FluxDom is framework-agnostic. Use it anywhere — Node.js, browser, or any JavaScript runtime.

```ts
import { domain } from "fluxdom";

const app = domain("app");
const counterStore = app.store({
  name: "counter",
  initial: 0,
  reducer: (state, action) => {
    switch (action.type) {
      case "INC":
        return state + 1;
      default:
        return state;
    }
  },
});

// Subscribe to changes
counterStore.onChange(() => {
  document.getElementById("count").textContent = String(
    counterStore.getState()
  );
});

// Wire up events
document.getElementById("btn").addEventListener("click", () => {
  counterStore.dispatch({ type: "INC" });
});
```

```html
<!-- Works in the browser too -->
<span id="count">0</span>
<button id="btn">+</button>
```

### Drop it into React

> 💡 **Tip:** When using React, import everything from `fluxdom/react` — it re-exports all core APIs (`domain`, `module`, `emitter`, etc.) plus the React hooks. No need to import from both packages!

```tsx
// ✅ Just import from fluxdom/react
import { domain, module, useSelector } from "fluxdom/react";

function Counter() {
  const count = useSelector(counterStore); // state is just a number!

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => counterStore.dispatch({ type: "INC" })}>+</button>
    </div>
  );
}
```

**That's it.** No `<Provider>` wrapping your app. No context drilling. Just import and use.

---

## 🏗️ Architecture

FluxDom organizes state into a **tree of domains**. Each domain is a self-contained universe that can hold stores, services, and child domains.

```
                    ┌─────────┐
                    │   app   │  ← Root Domain
                    └────┬────┘
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         ┌────────┐ ┌────────┐ ┌────────┐
         │  auth  │ │  user  │ │ todos  │  ← Feature Domains
         └───┬────┘ └───┬────┘ └───┬────┘
             │          │          │
             ▼          ▼          ▼
         [stores]   [stores]   [stores]    ← Your State Lives Here
```

**Why does this matter?**

| Concept       | What it does                   | Why you'll love it                     |
| ------------- | ------------------------------ | -------------------------------------- |
| **Domain**    | Groups related state & logic   | Features stay isolated & testable      |
| **Store**     | Holds state with a reducer     | Predictable updates, time-travel ready |
| **Actions ↓** | Flow from parent to children   | Broadcast events across features       |
| **Events ↑**  | Bubble from children to parent | Monitor everything from one place      |
| **Modules**   | Injectable services (DI)       | Swap implementations for testing       |

---

## 🧠 Core Concepts

### Domains — Organize Your Universe

Domains are boundaries. They keep features separate, yet connected.

```ts
import { domain } from "fluxdom";

// Your app's root
const app = domain("app");

// Feature domains — nest as deep as you need
const auth = app.domain("auth");
const todos = app.domain("todos");
const todos_filters = todos.domain("filters"); // app.todos.filters

// Always know where you came from
auth.root === app; // true
```

### Stores — Where State Lives

Every store has a name, initial state, and a reducer. You can use either `actions()` for type-safe action creators or the classic reducer function for more control.

#### Option 1: actions() (Recommended)

Use `actions()` to define action creators, then `actions.reducer()` to create a typed reducer:

```ts
import { domain, actions } from "fluxdom";

const app = domain("app");

// Define action creators with multiple formats
const counterActions = actions({
  increment: true, // no payload
  decrement: "COUNTER_DEC" as const, // custom type (use `as const`!)
  incrementBy: (n: number) => n, // with payload
  set: { type: "SET" as const, prepare: (v: number) => v }, // custom type + payload
});

// Action creators produce { type, payload } objects
counterActions.increment(); // { type: "increment", payload: undefined }
counterActions.decrement(); // { type: "COUNTER_DEC", payload: undefined }
counterActions.incrementBy(5); // { type: "incrementBy", payload: 5 }
counterActions.set(10); // { type: "SET", payload: 10 }

// Each action creator has a .type property
counterActions.increment.type; // "increment"
counterActions.set.type; // "SET"

// Create typed reducer with actions.reducer()
const counterReducer = actions.reducer(
  counterActions,
  (state: number, action) => {
    switch (action.type) {
      case "increment":
        return state + 1;
      case "COUNTER_DEC":
        return state - 1;
      case "incrementBy":
        return state + action.payload;
      case "SET":
        return action.payload;
      default:
        return state;
    }
  }
);

// Create store
const counterStore = app.store({
  name: "counter",
  initial: 0,
  reducer: counterReducer,
});

// Dispatch
counterStore.dispatch(counterActions.increment());
counterStore.dispatch(counterActions.incrementBy(5));
```

**Combine multiple action sources (store + domain actions):**

```ts
type AppAction = { type: "RESET_ALL" };
const app = domain<AppAction>("app");

const counterActions = actions({
  increment: true,
  set: (value: number) => value,
});

const domainActions = actions({
  resetAll: "RESET_ALL" as const,
});

// Combine any actions into one reducer!
const reducer = actions.reducer(
  [counterActions, domainActions], // array of action sources
  (state: number, action) => {
    switch (action.type) {
      case "increment":
        return state + 1;
      case "set":
        return action.payload;
      case "RESET_ALL":
        return 0;
      default:
        return state;
    }
  }
);

const store = app.store({ name: "counter", initial: 10, reducer });
store.dispatch(counterActions.increment()); // 11
app.dispatch({ type: "RESET_ALL" }); // 0
```

> 📝 **Note:** When using custom string types, add `as const` for proper type inference.
> Without it, the type is inferred as `string` instead of the literal type.

**Benefits of `actions()`:**

- 🎯 **Type-safe** — Action types and payloads fully inferred
- 📦 **Flexible definitions** — `true`, `"TYPE"`, `(args) => payload`, or `{ type, prepare }`
- 🔗 **Composable** — Combine store actions + domain actions
- 🔍 **Matchable** — Use `.type` and `.match()` for type narrowing
- ♻️ **Reusable** — Same actions work with multiple stores

#### Option 2: Classic Reducer Function

For more control, use the traditional Redux-style reducer:

```ts
type TodoAction =
  | { type: "ADD"; text: string }
  | { type: "TOGGLE"; id: number };

interface TodoState {
  items: { id: number; text: string; done: boolean }[];
}

const todoStore = todos.store<TodoState, TodoAction>(
  "list",
  { items: [] },
  (state, action) => {
    switch (action.type) {
      case "ADD":
        return {
          items: [
            ...state.items,
            { id: Date.now(), text: action.text, done: false },
          ],
        };
      case "TOGGLE":
        return {
          items: state.items.map((t) =>
            t.id === action.id ? { ...t, done: !t.done } : t
          ),
        };
      default:
        return state;
    }
  }
);
```

### Derived Stores — Computed State, Zero Effort

Need to combine or transform data from multiple stores? Derived stores have your back. They're read-only, always fresh, and ridiculously efficient.

```ts
// Create derived store via domain method (recommended)
// Name becomes "todos.stats" — perfect for debugging
const stats = todos.derived("stats", todoStore, (todos) => ({
  total: todos.items.length,
  completed: todos.items.filter((t) => t.done).length,
}));

// Combine multiple stores from different domains
const dashboard = app.derived(
  "dashboard",
  [todoStore, userStore],
  (todos, user) => ({
    greeting: `Hey ${user.name}!`,
    pendingTasks: todos.items.filter((t) => !t.done).length,
  })
);

// Always up-to-date
stats.getState(); // { total: 3, completed: 1 }

// Subscribe to changes
stats.onChange(() => {
  console.log("Stats updated!", stats.getState());
});
```

### Thunks — Async Made Simple

Need to fetch data? Handle side effects? Just dispatch a function.

```ts
// Store-level thunk — has access to local state
const fetchTodos = async ({ dispatch, getState }) => {
  if (getState().loading) return; // Already loading? Bail.

  dispatch({ type: "FETCH_START" });

  const response = await fetch("/api/todos");
  const data = await response.json();

  dispatch({ type: "FETCH_SUCCESS", payload: data });
};

todoStore.dispatch(fetchTodos);
```

```ts
// Domain-level thunk — orchestrate across features
const initializeApp = async ({ dispatch, get }) => {
  const api = get(ApiModule);
  const [user, todos] = await Promise.all([api.fetchUser(), api.fetchTodos()]);

  dispatch({ type: "APP_READY", payload: { user, todos } });
};

app.dispatch(initializeApp);
```

### Modules — Dependency Injection That Doesn't Suck

Services, APIs, loggers — inject them once, use them everywhere. Child domains inherit from parents. The killer feature? **Swap implementations per platform or environment without changing your business logic.**

```ts
import { module } from "fluxdom";

// Define the module interface
interface Storage {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

// Define the base module (throws if not overridden)
const StorageModule = module<Storage>("storage", () => {
  throw new Error("StorageModule not configured. Call app.override() first.");
});

// Web implementation
const WebStorage = module<Storage>("storage", () => ({
  get: async (key) => localStorage.getItem(key),
  set: async (key, value) => localStorage.setItem(key, value),
  remove: async (key) => localStorage.removeItem(key),
}));

// React Native implementation
const RNStorage = module<Storage>("storage", () => ({
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value),
  remove: (key) => AsyncStorage.removeItem(key),
}));

// Node.js / SSR implementation
const NodeStorage = module<Storage>("storage", () => ({
  get: async (key) => memoryCache.get(key) ?? null,
  set: async (key, value) => memoryCache.set(key, value),
  remove: async (key) => memoryCache.delete(key),
}));
```

**Your business logic stays the same — everywhere:**

```ts
// This code works on Web, React Native, and Node.js!
const saveUserPrefs = async ({ get }) => {
  const storage = get(StorageModule);
  await storage.set("theme", "dark");
  await storage.set("language", "en");
};

// Just wire up the right implementation at app startup
// web/index.ts
app.override(StorageModule, WebStorage);

// mobile/index.ts
app.override(StorageModule, RNStorage);

// server/index.ts
app.override(StorageModule, NodeStorage);
```

**Environment-specific modules:**

```ts
import { module } from "fluxdom";

interface Analytics {
  track: (event: string, data?: Record<string, any>) => void;
  identify: (userId: string) => void;
}

// Base definition
const AnalyticsModule = module<Analytics>("analytics", () => {
  throw new Error("AnalyticsModule not configured");
});

// Production: Real analytics
const AnalyticsProd = module<Analytics>("analytics", () => ({
  track: (event, data) => mixpanel.track(event, data),
  identify: (userId) => mixpanel.identify(userId),
}));

// Development: Just log to console
const AnalyticsDev = module<Analytics>("analytics", () => ({
  track: (event, data) => console.log("📊", event, data),
  identify: (userId) => console.log("👤", userId),
}));

// Wire up based on environment
if (process.env.NODE_ENV === "production") {
  app.override(AnalyticsModule, AnalyticsProd);
} else {
  app.override(AnalyticsModule, AnalyticsDev);
}
```

**Testing? Mock anything:**

```ts
const MockStorage = module<Storage>("storage", () => ({
  get: vi.fn().mockResolvedValue("mocked-value"),
  set: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
}));

const restore = app.override(StorageModule, MockStorage);
// ... run your tests ...
restore(); // Back to normal
```

**Inheritance — child domains share parent's modules:**

```ts
const api = app.get(ApiModule);
const sameApi = auth.get(ApiModule); // Same instance!

api === sameApi; // true — singleton per hierarchy
```

---

## 🚀 Advanced Usage

### Multi-Store Selection

Why make two hooks when one will do?

```tsx
const { todos, userName } = useSelector(
  [todoStore, userStore],
  (todos, user) => ({
    todos: todos.items,
    userName: user.name,
  })
);
```

### Equality Strategies — Stop Unnecessary Renders

Objects and arrays creating render storms? Pick your weapon:

```tsx
// Built-in strategies
const profile = useSelector(userStore, (s) => s.profile, "shallow");
```

| Strategy     | Speed  | Use When                             |
| ------------ | ------ | ------------------------------------ |
| `"strict"`   | ⚡⚡⚡ | Primitives, immutable data (default) |
| `"shallow"`  | ⚡⚡   | Flat objects, arrays of primitives   |
| `"shallow2"` | ⚡     | Nested objects (1 level deep)        |
| `"shallow3"` | ⚡     | Nested objects (2 levels deep)       |
| `"deep"`     | 🐢     | Complex nested structures            |

```tsx
// Or bring your own logic
const user = useSelector(
  userStore,
  (s) => s.profile,
  (a, b) => a.id === b.id // Only re-render if ID changes
);
```

### Event Listeners — See Everything

Debug, log, analyze. Listen to actions flowing through your domains.

```ts
// Direct dispatches only
app.onDispatch(({ action, source }) => {
  console.log(`[${source}]`, action.type);
});

// EVERYTHING — including all children
app.onAnyDispatch(({ action, source }) => {
  analytics.track(action.type, { source });
});
```

Store-level too:

```ts
todoStore.onDispatch(({ action }) => {
  if (action.type === "ADD") {
    analytics.track("todo_created");
  }
});
```

### Plugins — Extend Everything

The `.use()` method lets you enhance any store or domain.

```ts
// Add convenience methods
const todos = todoStore.use((store) => ({
  ...store,
  add: (text: string) => store.dispatch({ type: "ADD", text }),
  toggle: (id: number) => store.dispatch({ type: "TOGGLE", id }),
}));

// Now you can do this:
todos.add("Buy milk");
todos.toggle(123);
```

```ts
// Side-effect plugins (logging, persistence, etc.)
todoStore.use((store) => {
  store.onChange(() => {
    localStorage.setItem("todos", JSON.stringify(store.getState()));
  });
});
```

### Domain Plugins — Hook Into Creation

Use `domainPlugin()` to intercept domain, store, and module creation. Perfect for logging, DevTools integration, persistence, and more.

```ts
import { domain, domainPlugin } from "fluxdom";

// Create a logging plugin
const logging = domainPlugin({
  store: {
    pre: (config) => {
      console.log("[store:pre]", config.name);
      // Return new config to transform, or void to keep original
    },
    post: (store, config) => {
      console.log("[store:post]", store.name, config.initial);
      // Side effects only - must return void
    },
  },
  domain: {
    post: (d, config) => console.log("[domain:created]", d.name, config),
  },
  module: {
    post: (instance, def) => console.log("[module:created]", def.name),
  },
});

// Apply to domain - plugins are inherited by child domains
const app = domain("app").use(logging);
```

#### Plugin Hooks

| Hook | Signature | Purpose |
|------|-----------|---------|
| `filter` | `(config) => boolean` | Skip hooks if returns false |
| `pre` | `(config) => Config \| void` | Transform config before creation |
| `post` | `(instance, config) => void` | Side effects after creation (receives both instance and config) |

#### Hook Targets

- **`store`**: Called for `domain.store()` and `domain.model()`
- **`domain`**: Called for `domain.domain()` (subdomains)
- **`module`**: Called for `domain.get()` (module instantiation)

#### Example: DevTools Integration

```ts
const devTools = domainPlugin({
  store: {
    post: (store) => {
      // Connect each store to Redux DevTools
      const devToolsExtension = window.__REDUX_DEVTOOLS_EXTENSION__;
      if (devToolsExtension) {
        const devTools = devToolsExtension.connect({ name: store.name });
        devTools.init(store.getState());
        store.onChange(() => devTools.send({ type: "STATE_UPDATE" }, store.getState()));
      }
    },
  },
});
```

#### Example: Auto-Persistence with Meta Filter

Use the meta system to selectively apply plugins. First, augment the meta interface:

```ts
// In your app's types file
declare module "fluxdom" {
  interface StoreMeta {
    persisted?: boolean;
  }
}
```

Then create a persistence plugin that only applies to stores with `meta.persisted`:

```ts
const persistence = domainPlugin({
  store: {
    // Only apply to stores with meta.persisted = true
    filter: (config) => config.meta?.persisted === true,
    pre: (config) => {
      // Hydrate from localStorage if available
      const saved = localStorage.getItem(config.name);
      if (saved) {
        return { ...config, initial: JSON.parse(saved) };
      }
    },
    post: (store, config) => {
      // Persist on every change
      store.onChange(() => {
        localStorage.setItem(store.name, JSON.stringify(store.getState()));
      });
    },
  },
});

// Usage
const app = domain("app").use(persistence);

// This store will be persisted
const userStore = app.store({
  name: "user",
  initial: { name: "" },
  reducer: userReducer,
  meta: { persisted: true },
});

// This store will NOT be persisted (no meta.persisted)
const tempStore = app.store({
  name: "temp",
  initial: {},
  reducer: tempReducer,
});
```

#### Plugin Inheritance

Plugins are automatically inherited by child domains:

```ts
const app = domain("app").use(logging);
const feature = app.domain("feature"); // Inherits logging plugin
feature.store({ ... }); // logging hooks are called
```

### Batching — Optimize Multiple Updates

When dispatching many actions at once, use `batch()` to consolidate notifications. Instead of triggering listeners after each dispatch, notifications are deferred until the batch completes.

```ts
import { batch } from "fluxdom";

// Without batch: 3 notifications (one per dispatch)
counterStore.dispatch({ type: "INC" });
counterStore.dispatch({ type: "INC" });
counterStore.dispatch({ type: "INC" });

// With batch: 1 notification (after all dispatches)
batch(() => {
  counterStore.dispatch({ type: "INC" });
  counterStore.dispatch({ type: "INC" });
  counterStore.dispatch({ type: "INC" });
});
```

**Why batch?**

- **Performance**: Reduce re-renders in React apps
- **Consistency**: Listeners see final state, not intermediate states
- **Coordination**: Update multiple stores atomically

```ts
// Update multiple stores, one notification per store
batch(() => {
  userStore.dispatch({ type: "SET_NAME", name: "Alice" });
  settingsStore.dispatch({ type: "SET_THEME", theme: "dark" });
  counterStore.dispatch({ type: "SET", value: 100 });
});

// State is updated synchronously during batch
batch(() => {
  counterStore.dispatch({ type: "INC" });
  console.log(counterStore.getState()); // 1 (updated immediately)
  counterStore.dispatch({ type: "INC" });
  console.log(counterStore.getState()); // 2 (updated immediately)
  // But listeners fire AFTER this block completes
});
```

**Nested batches work correctly:**

```ts
batch(() => {
  store.dispatch({ type: "A" });

  batch(() => {
    store.dispatch({ type: "B" });
    store.dispatch({ type: "C" });
  });

  store.dispatch({ type: "D" });
  // No notifications yet — outer batch still active
});
// NOW all notifications fire
```

**Return values are passed through:**

```ts
const result = batch(() => {
  counterStore.dispatch({ type: "INC" });
  counterStore.dispatch({ type: "INC" });
  return counterStore.getState();
});

console.log(result); // 2
```

---

### Event Emitter — Roll Your Own Pub/Sub

A tiny, powerful emitter for custom event systems.

```ts
import { emitter } from "fluxdom";

const clicks = emitter<{ x: number; y: number }>();

// Subscribe
const unsub = clicks.on((pos) => console.log(`Clicked at ${pos.x}, ${pos.y}`));

// Emit
clicks.emit({ x: 100, y: 200 });

// Done
unsub();
```

**Filter & transform on the fly:**

```ts
const events = emitter<{ type: string; data: any }>();

// Only listen to errors
events.on(
  (e) => (e.type === "ERROR" ? { value: e.data } : undefined),
  (error) => console.error("💥", error)
);
```

---

### Models — Stores with Bound Methods

Models are a higher-level abstraction that combines stores with bound action and thunk methods. Instead of manually dispatching actions, you call methods directly on the model.

**The key insight: Models ARE stores.** They extend `MutableStore`, so they work everywhere stores work — `useSelector`, `derived()`, plugins, etc.

```ts
import { domain } from "fluxdom";

const app = domain("app");

// Create a model with bound methods
const counter = app.model({
  name: "counter",
  initial: 0,
  actions: (ctx) => ({
    increment: (state) => state + 1,
    decrement: (state) => state - 1,
    add: (state, amount: number) => state + amount,
    reset: ctx.reducers.reset, // Built-in reducer helper
    set: ctx.reducers.set, // Built-in reducer helper
  }),
});

// Call methods directly — no dispatch needed!
counter.increment();
counter.add(5);
counter.reset();

// Model IS a store — use it anywhere
counter.getState(); // 0
counter.onChange(() => {}); // Subscribe
counter.dispatch({ type: "increment", args: [] }); // Still works!

// Works with useSelector (because model IS a store)
const count = useSelector(counter);

// Works with derived()
const doubled = app.derived("doubled", [counter], (n) => n * 2);
```

**With async thunks:**

```ts
const todos = app.model({
  name: "todos",
  initial: { items: [], loading: false },
  actions: (ctx) => ({
    setLoading: (state, loading: boolean) => ({ ...state, loading }),
    setItems: (state, items: Todo[]) => ({ ...state, items, loading: false }),
    reset: ctx.reducers.reset,
  }),
  // Thunks receive full context in closure - just write regular functions!
  thunks: ({ actions, dispatch, getState, domain, initial }) => ({
    fetchTodos: async () => {
      dispatch(actions.setLoading(true));
      const api = domain.get(ApiModule);
      const items = await api.fetchTodos();
      dispatch(actions.setItems(items));
      return items;
    },
    resetToInitial: () => {
      dispatch(actions.reset());
    },
    addIfNotLoading: (item: Todo) => {
      // getState() always returns current state
      if (!getState().loading) {
        dispatch(actions.setItems([...getState().items, item]));
      }
    },
  }),
});

// Call thunks directly - they're just regular methods
await todos.fetchTodos();
todos.resetToInitial();
todos.addIfNotLoading({ id: 1, title: "New" });
```

**Handle domain actions with `ctx.fallback()`:**

```ts
type AppAction = { type: "RESET_ALL" } | { type: "SET_THEME"; theme: string };
const app = domain<AppAction>("app");

const counter = app.model({
  name: "counter",
  initial: 0,
  actions: (ctx) => {
    // Register fallback handlers for domain actions
    ctx.fallback((state, action) => {
      if (action.type === "RESET_ALL") return 0;
      return state;
    });

    // Can call fallback multiple times to chain handlers
    ctx.fallback((state, action) => {
      console.log("Received domain action:", action.type);
      return state;
    });

    return {
      increment: (state) => state + 1,
    };
  },
});

// Domain action resets the counter
app.dispatch({ type: "RESET_ALL" });
```

**With custom equality:**

```ts
const user = app.model({
  name: "user",
  initial: { id: 0, name: "", profile: { bio: "" } },
  actions: () => ({
    setName: (state, name: string) => ({ ...state, name }),
  }),
  equals: "shallow", // Only notify if top-level properties change
});
```

### Immer Integration — Mutable Syntax, Immutable Results

Tired of spread operators? Wrap your reducer with Immer's `produce`:

```ts
import { domain, actions } from "fluxdom";
import { produce } from "immer";

const app = domain("app");

const todoActions = actions({
  add: (text: string) => text,
  toggle: (id: number) => id,
  clear: true,
});

// Wrap reducer with produce - now you can mutate!
const reducer = actions.reducer(
  todoActions,
  produce((state: TodoState, action) => {
    switch (action.type) {
      case "add":
        state.items.push({ id: Date.now(), text: action.payload, done: false });
        break;
      case "toggle":
        const item = state.items.find((t) => t.id === action.payload);
        if (item) item.done = !item.done;
        break;
      case "clear":
        state.items = state.items.filter((t) => !t.done);
        break;
    }
  })
);

const store = app.store({ name: "todos", initial: { items: [] }, reducer });
store.dispatch(todoActions.add("Buy milk"));
```

> **Note:** Install Immer separately: `npm install immer`

---

## 📖 API Reference

### `domain(name)`

Create a root domain — your app's command center.

```ts
import { domain } from "fluxdom";

const app = domain<AppAction>("app");
```

---

### `module(name, create)`

Define a module with type inference. Modules are lazy-loaded singletons that can be overridden per platform or for testing.

```ts
import { module } from "fluxdom";

// Basic module
const LoggerModule = module("logger", () => ({
  info: (msg: string) => console.log("INFO:", msg),
  warn: (msg: string) => console.warn("WARN:", msg),
  error: (msg: string) => console.error("ERROR:", msg),
}));

// Typed module with interface
interface HttpClient {
  get: <T>(url: string) => Promise<T>;
  post: <T>(url: string, body: unknown) => Promise<T>;
}

const HttpModule = module<HttpClient>("http", () => ({
  get: (url) => fetch(url).then((r) => r.json()),
  post: (url, body) =>
    fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }).then((r) => r.json()),
}));

// Module with domain access (for logging, nested modules, etc.)
const ApiModule = module("api", (domain) => {
  const http = domain.get(HttpModule);
  const logger = domain.get(LoggerModule);

  return {
    fetchUsers: async () => {
      logger.info("Fetching users...");
      return http.get("/api/users");
    },
  };
});

// Abstract module (must be overridden)
const StorageModule = module<Storage>("storage", () => {
  throw new Error("StorageModule not configured");
});

// Usage
const logger = app.get(LoggerModule);
const api = app.get(ApiModule);
```

---

### `domainPlugin(config)`

Create a plugin that hooks into domain, store, and module creation.

```ts
import { domainPlugin } from "fluxdom";

interface DomainPluginConfig {
  domain?: {
    filter?: (config: DomainConfig) => boolean;
    pre?: (config: DomainConfig) => DomainConfig | void;
    post?: (domain: Domain<any>, config: DomainConfig) => void;
  };
  store?: {
    filter?: (config: StoreConfig<any, any>) => boolean;
    pre?: (config: StoreConfig<any, any>) => StoreConfig<any, any> | void;
    post?: (store: MutableStore<any, any, any>, config: StoreConfig<any, any>) => void;
  };
  module?: {
    filter?: (definition: ModuleDef<any, any>) => boolean;
    pre?: (definition: ModuleDef<any, any>) => ModuleDef<any, any> | void;
    post?: (instance: any, definition: ModuleDef<any, any>) => void;
  };
}

interface DomainConfig {
  name: string;
  meta?: DomainMeta;
}
```

**Key rules:**
- `filter` skips pre/post hooks if returns false (useful with meta system)
- `pre` hooks can return new config (transform) or void (keep original)
- `post` hooks receive both the instance and config; must return void (side effects only)
- All hooks are synchronous
- Plugins are inherited by child domains

```ts
const logging = domainPlugin({
  store: {
    pre: (config) => console.log("[store:pre]", config.name),
    post: (store, config) => console.log("[store:created]", store.name, config),
  },
});

const app = domain("app").use(logging);
```

---

#### `domain.name`

The domain's identifier string.

```ts
const app = domain("app");
const auth = app.domain("auth");

console.log(app.name); // "app"
console.log(auth.name); // "app.auth"
```

---

#### `domain.root`

Reference to the root domain of the hierarchy.

```ts
const app = domain("app");
const auth = app.domain("auth");
const login = auth.domain("login");

login.root === app; // true
auth.root === app; // true
app.root === app; // true (root references itself)
```

---

#### `domain.store(config)`

Create a state store with a reducer function. Returns a `MutableStore`.

```ts
interface StoreConfig<TState, TAction> {
  name: string;
  initial: TState;
  reducer: (state: TState, action: TAction) => TState;
  equals?: Equality<TState>; // Optional equality for change detection
}
```

```ts
const counterStore = app.store({
  name: "counter",
  initial: 0,
  reducer: (state, action) => {
    switch (action.type) {
      case "INC":
        return state + 1;
      case "DEC":
        return state - 1;
      default:
        return state;
    }
  },
});

counterStore.dispatch({ type: "INC" });
```

**With custom equality:**

```ts
const settingsStore = app.store({
  name: "settings",
  initial: { theme: "dark", fontSize: 14 },
  reducer: settingsReducer,
  equals: "shallow", // Only notify if properties change
});
```

---

### `actions(definitions)`

Create action creators from a definition map.

```ts
import { actions } from "fluxdom";

const counterActions = actions({
  // true = no payload, type = key name
  increment: true,

  // string = no payload, custom type (use `as const`!)
  decrement: "COUNTER_DEC" as const,

  // function = with payload (prepare function)
  incrementBy: (n: number) => n,
  addTodo: (text: string) => ({ id: Date.now(), text, done: false }),

  // object = custom type + prepare function
  set: { type: "SET" as const, prepare: (value: number) => value },
});

// Usage
counterActions.increment(); // { type: "increment", payload: undefined }
counterActions.decrement(); // { type: "COUNTER_DEC", payload: undefined }
counterActions.incrementBy(5); // { type: "incrementBy", payload: 5 }
counterActions.set(10); // { type: "SET", payload: 10 }

// Each has .type property
counterActions.increment.type; // "increment"
counterActions.set.type; // "SET"

// Each has .match() for type narrowing
if (counterActions.incrementBy.match(action)) {
  console.log(action.payload); // typed as number
}
```

> 📝 **Note:** When using custom string types, add `as const` for proper type inference:
>
> ```ts
> // ❌ Without `as const` - type is `string`
> const bad = actions({ reset: "RESET" });
>
> // ✅ With `as const` - type is `"RESET"`
> const good = actions({ reset: "RESET" as const });
> ```

---

### `actions.reducer(actionsInput, reducer)`

Create a typed reducer from action creators. The action type is automatically inferred.

```ts
import { actions } from "fluxdom";

const counterActions = actions({
  increment: true,
  incrementBy: (n: number) => n,
});

// Single action source
const reducer = actions.reducer(counterActions, (state: number, action) => {
  switch (action.type) {
    case "increment":
      return state + 1;
    case "incrementBy":
      return state + action.payload; // payload typed!
    default:
      return state;
  }
});

const store = app.store({ name: "counter", initial: 0, reducer });
```

**Combine multiple action sources:**

```ts
const counterActions = actions({
  increment: true,
  set: (value: number) => value,
});

const domainActions = actions({
  resetAll: "RESET_ALL" as const,
  logout: true,
});

// Array of action sources - all types inferred!
const reducer = actions.reducer(
  [counterActions, domainActions],
  (state: number, action) => {
    switch (action.type) {
      case "increment":
        return state + 1;
      case "set":
        return action.payload;
      case "RESET_ALL":
        return 0;
      case "logout":
        return 0;
      default:
        return state;
    }
  }
);
```

**Action type matching in listeners:**

````ts
counterStore.onDispatch(({ action, source }) => {
  if (counterActions.increment.match(action)) {
    console.log(`[${source}] Incremented!`);
  }
  if (counterActions.incrementBy.match(action)) {
    console.log(`[${source}] Added:`, action.payload);
  }
});

---

#### Store state types

State can be any type — primitives, objects, arrays.

```ts
// Primitive state (number, string, boolean, etc.)
const counterActions = actions({ inc: true });
const counterReducer = actions.reducer(counterActions, (s: number, a) =>
  a.type === "inc" ? s + 1 : s
);
const counterStore = app.store({ name: "counter", initial: 0, reducer: counterReducer });

// Object state
interface UserState {
  name: string;
  email: string;
  loggedIn: boolean;
}

const userActions = actions({
  login: (payload: { name: string; email: string }) => payload,
  logout: true,
});

const userReducer = actions.reducer(userActions, (state: UserState, action) => {
  switch (action.type) {
    case "login":
      return { ...action.payload, loggedIn: true };
    case "logout":
      return { name: "", email: "", loggedIn: false };
    default:
      return state;
  }
});

const userStore = app.store({
  name: "user",
  initial: { name: "", email: "", loggedIn: false },
  reducer: userReducer,
});

// Store name is namespaced
console.log(counterStore.name); // "app.counter"
````

**Custom equality for change detection:**

The optional `equals` parameter controls when `onChange` listeners are notified. By default, strict reference equality (`===`) is used. Use custom equality for objects that should be compared by value.

```ts
// With shallow equality — onChange only fires if object properties differ
const settingsStore = app.store(
  "settings",
  { theme: "dark", fontSize: 14 },
  settingsReducer,
  "shallow" // Uses shallowEqual
);

// With deep equality — for nested objects
const configStore = app.store(
  "config",
  { ui: { sidebar: true }, api: { timeout: 5000 } },
  configReducer,
  "deep" // Uses deepEqual
);

// With custom equality function
const userStore = app.store(
  "user",
  { id: 1, name: "John", lastSeen: new Date() },
  userReducer,
  (prev, next) => prev.id === next.id && prev.name === next.name // Ignore lastSeen changes
);
```

| Equality            | When to use                                         |
| ------------------- | --------------------------------------------------- |
| `"strict"`          | Primitives, immutable data (default)                |
| `"shallow"`         | Flat objects where you always return new references |
| `"deep"`            | Nested objects (slower, use sparingly)              |
| `(a, b) => boolean` | Custom logic (e.g., compare only specific fields)   |

---

#### `domain.model(config)`

Create a model — a store with bound action and thunk methods. Models ARE stores, so they work with `useSelector`, `derived()`, and any store-based API.

```ts
interface ModelConfig<TState, TActionMap, TThunkMap> {
  name: string;
  initial: TState;
  actions: (ctx: ModelActionContext<TState>) => TActionMap;
  thunks?: (ctx: ModelThunkContext<TState, TActionMap>) => TThunkMap;
  equals?: Equality<TState>;
}

interface ModelActionContext<TState> {
  reducers: {
    reset: (state: TState) => TState; // Returns initial state
    set: (state: TState, value: TState) => TState; // Returns the new value
  };
  fallback: (handler: (state: TState, action: DomainAction) => TState) => void;
}

interface ModelThunkContext<TState, TActionMap> {
  actions: ActionCreators<TActionMap>; // Type-safe action creators
  initial: TState; // The initial state value
  dispatch: Dispatch; // Dispatch actions to this model's store
  getState: () => TState; // Get current state (always fresh)
  domain: Domain; // Parent domain (for modules, other stores)
}
```

```ts
const counter = app.model({
  name: "counter",
  initial: 0,
  actions: (ctx) => ({
    increment: (state) => state + 1,
    add: (state, n: number) => state + n,
    reset: ctx.reducers.reset,
    set: ctx.reducers.set,
  }),
  // Thunks: context (actions, dispatch, getState, domain) captured in closure
  thunks: ({ actions, dispatch }) => ({
    incrementAsync: async () => {
      await delay(100);
      dispatch(actions.increment());
    },
  }),
  equals: "strict", // Optional equality strategy
});

// Bound action methods
counter.increment();
counter.add(5);
counter.reset();
counter.set(100);

// Bound thunk methods
await counter.incrementAsync();

// Store properties (model IS a store)
counter.name; // "app.counter"
counter.getState(); // number
counter.onChange(fn); // Subscribe
counter.onDispatch(fn); // Listen to actions
counter.dispatch(action); // Manual dispatch
counter.use(plugin); // Extend with plugin
```

**Using with React:**

```tsx
// Model works directly with useSelector
function Counter() {
  const count = useSelector(counter);
  return <button onClick={() => counter.increment()}>{count}</button>;
}
```

---

#### `domain.domain(name)`

Create a child domain that inherits modules from its parent.

```ts
const app = domain("app");

// Create feature domains
const auth = app.domain("auth");
const user = app.domain("user");
const settings = user.domain("settings"); // Nested: "app.user.settings"

// Child inherits parent's modules
const api = app.get(ApiModule);
const sameApi = auth.get(ApiModule);
api === sameApi; // true
```

---

#### `domain.derived(name, deps, selector, equals?)`

Create a computed store that auto-updates when dependencies change.

```ts
const priceStore = app.store({
  name: "price",
  initial: 100,
  reducer: priceReducer,
});
const quantityStore = app.store({
  name: "quantity",
  initial: 2,
  reducer: quantityReducer,
});

// Derived store computes from multiple stores
const totalStore = app.derived(
  "total",
  [priceStore, quantityStore],
  (price, quantity) => ({
    total: price * quantity,
    formatted: `$${(price * quantity).toFixed(2)}`,
  })
);

totalStore.getState(); // { total: 200, formatted: "$200.00" }

// Auto-updates when dependencies change
priceStore.dispatch({ type: "SET", value: 150 });
totalStore.getState(); // { total: 300, formatted: "$300.00" }
```

**With custom equality:**

```ts
// Only notify listeners when specific fields change
const userSummary = app.derived(
  "userSummary",
  [userStore],
  (user) => ({ name: user.name, role: user.role }),
  "shallow" // Prevent updates if name and role are the same
);

// Custom equality function
const expensiveComputation = app.derived(
  "computed",
  [dataStore],
  (data) => computeExpensiveValue(data),
  (prev, next) => prev.id === next.id // Only recompute if ID changes
);
```

---

#### `domain.dispatch(action | thunk)`

Dispatch an action to all stores in this domain, or execute a thunk.

```ts
// Dispatch action — broadcasts to all stores in domain
app.dispatch({ type: "RESET" });

// Dispatch thunk — for async operations
app.dispatch(async ({ dispatch, get }) => {
  const api = get(ApiModule);
  const data = await api.fetchConfig();
  dispatch({ type: "CONFIG_LOADED", payload: data });
});

// Thunks can return values
const result = app.dispatch(({ get }) => {
  const api = get(ApiModule);
  return api.getVersion();
});
```

---

#### `domain.get(moduleDef)`

Resolve a module by its definition. Lazy-loads on first access, then cached.

```ts
import { module } from "fluxdom";

// Define module with the helper
const LoggerModule = module("logger", (domain) => ({
  info: (msg: string) => console.log(`[${domain.name}] INFO:`, msg),
  error: (msg: string) => console.error(`[${domain.name}] ERROR:`, msg),
}));

// Resolve (created on first call)
const logger = app.get(LoggerModule);
logger.info("App started"); // "[app] INFO: App started"

// Same instance returned on subsequent calls
app.get(LoggerModule) === logger; // true

// Child domains inherit parent's instances
auth.get(LoggerModule) === logger; // true
```

---

#### `domain.override(source, replacement)`

Override a module for testing or platform-specific implementations. Returns a function to restore the original.

```ts
import { module } from "fluxdom";

interface Api {
  fetchUser: () => Promise<{ id: number; name: string }>;
}

// Base module definition
const ApiModule = module<Api>("api", () => {
  throw new Error("ApiModule not configured");
});

// Production implementation
const ApiProd = module<Api>("api", () => ({
  fetchUser: () => fetch("/api/user").then((r) => r.json()),
}));

// Mock for testing
const ApiMock = module<Api>("api", () => ({
  fetchUser: () => Promise.resolve({ id: 1, name: "Test User" }),
}));

// Override before tests
const restore = app.override(ApiModule, ApiMock);

// Now app.get(ApiModule) returns the mock
const api = app.get(ApiModule);
await api.fetchUser(); // { id: 1, name: "Test User" }

// Restore after tests
restore();
```

---

#### `domain.onDispatch(fn)`

Listen to actions dispatched directly to this domain.

```ts
const unsub = app.onDispatch(({ action, source, context }) => {
  console.log(`Action: ${action.type}`);
  console.log(`Source: ${source}`);
  console.log(`Can dispatch more:`, typeof context.dispatch === "function");
});

app.dispatch({ type: "TEST" });
// Logs: Action: TEST, Source: app

unsub(); // Stop listening
```

---

#### `domain.onAnyDispatch(fn)`

Listen to ALL actions — from this domain AND all descendants (stores, sub-domains).

```ts
// Perfect for logging, analytics, debugging
const unsub = app.onAnyDispatch(({ action, source }) => {
  analytics.track("action", {
    type: action.type,
    source: source,
    timestamp: Date.now(),
  });
});

// Catches everything
app.dispatch({ type: "APP_ACTION" }); // source: "app"
counterStore.dispatch({ type: "INC" }); // source: "app.counter"
auth.dispatch({ type: "LOGIN" }); // source: "app.auth"

unsub();
```

---

#### `domain.use(plugin)`

Extend the domain with a plugin. Returns the enhanced domain or the plugin's return value.

```ts
// Add helper methods
const enhancedApp = app.use((domain) => ({
  ...domain,
  reset: () => domain.dispatch({ type: "RESET" }),
  log: (msg: string) => console.log(`[${domain.name}]`, msg),
}));

enhancedApp.reset();
enhancedApp.log("Hello!"); // "[app] Hello!"
```

---

### `Store`

A mutable store created via `domain.store()`.

---

#### `store.name`

The store's namespaced identifier.

```ts
const counterStore = app.store({ name: "counter", initial: 0, reducer });
console.log(counterStore.name); // "app.counter"
```

---

#### `store.getState()`

Get the current state snapshot.

```ts
const counterStore = app.store({ name: "counter", initial: 0, reducer });

console.log(counterStore.getState()); // 0

counterStore.dispatch({ type: "INC" });
console.log(counterStore.getState()); // 1
```

---

#### `store.dispatch(action | thunk)`

Dispatch an action or execute a thunk with store context.

```ts
// Dispatch action
counterStore.dispatch({ type: "INC" });

// Dispatch thunk with state access
counterStore.dispatch(({ dispatch, getState }) => {
  if (getState() < 10) {
    dispatch({ type: "INC" });
  }
});

// Async thunk
counterStore.dispatch(async ({ dispatch, domain }) => {
  const api = domain.get(ApiModule);
  const value = await api.fetchCount();
  dispatch({ type: "SET", value });
});
```

---

#### `store.onChange(fn)`

Subscribe to state changes. Called after every state update.

```ts
const unsub = counterStore.onChange(() => {
  console.log("New state:", counterStore.getState());
});

counterStore.dispatch({ type: "INC" }); // Logs: "New state: 1"
counterStore.dispatch({ type: "INC" }); // Logs: "New state: 2"

unsub(); // Stop listening
```

---

#### `store.onDispatch(fn)`

Subscribe to all actions dispatched to this store (including domain-level actions).

```ts
const unsub = counterStore.onDispatch(({ action, source, context }) => {
  console.log(`[${source}] ${action.type}`);

  // Access current state
  console.log("State:", context.getState());

  // Can dispatch more actions (be careful of loops!)
  if (action.type === "INC" && context.getState() > 100) {
    context.dispatch({ type: "SET", value: 0 });
  }
});

counterStore.dispatch({ type: "INC" });
// Logs: "[app.counter] INC", "State: 1"

unsub();
```

---

#### `store.use(plugin)`

Extend the store with a plugin.

```ts
// Create a typed API around the store
const counter = counterStore.use((store) => ({
  get value() {
    return store.getState();
  },
  inc: () => store.dispatch({ type: "INC" }),
  dec: () => store.dispatch({ type: "DEC" }),
  set: (n: number) => store.dispatch({ type: "SET", value: n }),
}));

counter.inc();
counter.inc();
console.log(counter.value); // 2
counter.set(0);
console.log(counter.value); // 0
```

---

### `DerivedStore`

A read-only computed store created via `domain.derived()`.

---

#### `derivedStore.name`

The derived store's namespaced identifier.

```ts
const stats = todos.derived("stats", [todoStore], selector);
console.log(stats.name); // "app.todos.stats"
```

---

#### `derivedStore.dependencies`

Array of source stores this derived store depends on.

```ts
const total = app.derived("total", [priceStore, quantityStore], selector);

console.log(total.dependencies); // [priceStore, quantityStore]
console.log(total.dependencies.length); // 2
```

---

#### `derivedStore.getState()`

Get the current computed value.

```ts
const stats = todos.derived("stats", [todoStore], (todos) => ({
  total: todos.items.length,
  done: todos.items.filter((t) => t.done).length,
}));

console.log(stats.getState()); // { total: 5, done: 2 }

// Automatically recomputes when todoStore changes
todoStore.dispatch({ type: "ADD", text: "New task" });
console.log(stats.getState()); // { total: 6, done: 2 }
```

---

#### `derivedStore.onChange(fn)`

Subscribe to changes in the computed value.

```ts
const stats = todos.derived("stats", [todoStore], selector);

const unsub = stats.onChange(() => {
  console.log("Stats updated:", stats.getState());
});

todoStore.dispatch({ type: "ADD", text: "Task" });
// Logs: "Stats updated: { total: 1, done: 0 }"

unsub();
```

---

### `useSelector(store, selector?, equality?)`

React hook — subscribe to store state with surgical precision.

```tsx
import { useSelector } from "fluxdom/react";

// Full state (no selector) — works great with primitive state
function Counter() {
  const count = useSelector(counterStore);
  return <span>{count}</span>;
}

// With selector — extract specific data from object state
function UserName() {
  const name = useSelector(userStore, (s) => s.name);
  return <span>{name}</span>;
}

// With equality check — prevent re-renders for equivalent objects
function UserProfile() {
  const profile = useSelector(userStore, (s) => s.profile, "shallow");
  return <div>{profile.name}</div>;
}

// Custom equality function
function UserAvatar() {
  const user = useSelector(
    userStore,
    (s) => ({ id: s.id, avatar: s.avatar }),
    (a, b) => a.id === b.id && a.avatar === b.avatar
  );
  return <img src={user.avatar} />;
}

// Multiple stores
function Dashboard() {
  const data = useSelector(
    [todoStore, userStore],
    (todos, user) => ({
      userName: user.name,
      taskCount: todos.items.length,
    }),
    "shallow"
  );

  return (
    <div>
      Welcome {data.userName}! You have {data.taskCount} tasks.
    </div>
  );
}
```

---

### `batch(fn)`

Batch multiple dispatches into a single notification cycle. Notifications are deferred until the batch completes, then fire once per store.

```ts
import { batch } from "fluxdom";

// Batch multiple updates
batch(() => {
  storeA.dispatch({ type: "UPDATE_A" });
  storeB.dispatch({ type: "UPDATE_B" });
  storeC.dispatch({ type: "UPDATE_C" });
});
// All onChange listeners fire AFTER this point

// Get return value from batch
const finalState = batch(() => {
  store.dispatch({ type: "INC" });
  store.dispatch({ type: "INC" });
  return store.getState();
});

// Nested batches — notifications wait for outermost batch
batch(() => {
  store.dispatch({ type: "A" });
  batch(() => {
    store.dispatch({ type: "B" });
  }); // inner batch completes, but still in outer batch
  store.dispatch({ type: "C" });
}); // NOW notifications fire

// Works with async (but only batches sync portion)
await batch(async () => {
  store.dispatch({ type: "SYNC_1" }); // batched
  store.dispatch({ type: "SYNC_2" }); // batched

  await someAsyncOperation(); // batch ends here

  store.dispatch({ type: "AFTER_AWAIT" }); // NOT batched
});
```

**Key behaviors:**

- State updates synchronously during batch (getState() always returns latest)
- Notifications deferred until batch completes
- Same callback function de-duplicated (each store notifies once, not once per dispatch)
- Nested batches defer to outermost batch
- Errors don't prevent queued notifications from firing
- Return values pass through

---

### Equality Utilities

Functions for comparing values. Used internally by `useSelector`.

```ts
import {
  strictEqual,
  shallowEqual,
  shallow2Equal,
  shallow3Equal,
  deepEqual,
  resolveEquality,
} from "fluxdom";

// strictEqual — Object.is comparison
strictEqual(1, 1); // true
strictEqual({}, {}); // false (different references)

// shallowEqual — compare object keys with Object.is
shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 }); // true
shallowEqual({ a: { x: 1 } }, { a: { x: 1 } }); // false (nested objects)

// shallow2Equal — 2 levels deep
shallow2Equal({ a: { x: 1 } }, { a: { x: 1 } }); // true
shallow2Equal({ a: { b: { x: 1 } } }, { a: { b: { x: 1 } } }); // false

// shallow3Equal — 3 levels deep
shallow3Equal({ a: { b: { x: 1 } } }, { a: { b: { x: 1 } } }); // true

// deepEqual — full recursive comparison
deepEqual({ a: { b: { c: { d: 1 } } } }, { a: { b: { c: { d: 1 } } } }); // true

// resolveEquality — convert shorthand to function
const eq = resolveEquality("shallow");
eq({ a: 1 }, { a: 1 }); // true
```

---

### `withUse(object)`

Add chainable `.use()` method to any object.

```ts
import { withUse } from "fluxdom";

// Make any object chainable
const api = withUse({
  baseUrl: "https://api.example.com",
  fetch: (path: string) => fetch(`https://api.example.com${path}`),
});

// Extend with plugins
const enhancedApi = api
  .use((api) => ({
    ...api,
    getUsers: () => api.fetch("/users").then((r) => r.json()),
  }))
  .use((api) => ({
    ...api,
    getTodos: () => api.fetch("/todos").then((r) => r.json()),
  }));

await enhancedApi.getUsers();
await enhancedApi.getTodos();
```

---

## 🔷 TypeScript

FluxDom is built with TypeScript. Every type is exported:

```ts
import type {
  // Core types
  Action,
  Domain,
  Store,
  MutableStore,
  DerivedStore,
  Reducer,
  Thunk,
  DomainContext,
  StoreContext,
  ModuleDef,
  Equality,
  Emitter,

  // Action creator types
  ActionCreator,

  // Model types
  Model,
  ModelWithMethods,
  ModelConfig,
  ModelActionContext,
  ModelThunkContext,

  // Store config
  StoreConfig,

  // Plugin types
  DomainPlugin,
  DomainPluginConfig,
  DomainConfig,

  // Meta types (augmentable interfaces)
  DomainMeta,
  StoreMeta,
  ModuleMeta,
} from "fluxdom";

// Functions
import {
  domain,
  actions, // Create action creators + actions.reducer()
  module,
  derived,
  emitter,
  batch,
  withUse,
  domainPlugin, // Create domain plugins
  strictEqual,
  shallowEqual,
  deepEqual,
  resolveEquality,
} from "fluxdom";
```

---

## 🔄 FluxDom vs Redux

If you're coming from Redux, FluxDom will feel familiar — but with less ceremony.

### What's Similar

| Concept          | Redux                         | FluxDom                                       |
| ---------------- | ----------------------------- | --------------------------------------------- |
| **Actions**      | `{ type: "INC" }`             | `{ type: "INC" }` ✅ Same                     |
| **Reducers**     | `(state, action) => newState` | `(state, action) => newState` ✅ Same         |
| **Dispatch**     | `store.dispatch(action)`      | `store.dispatch(action)` ✅ Same              |
| **Selectors**    | `useSelector(state => ...)`   | `useSelector(store, state => ...)` ✅ Similar |
| **Async Logic**  | Redux Thunk middleware        | Built-in thunks ✅ Similar                    |
| **Immutability** | Required                      | Required ✅ Same                              |

**Your Redux knowledge transfers directly.** Actions, reducers, dispatch — it all works the same way.

### What's Different

| Feature                  | Redux                                    | FluxDom                                       |
| ------------------------ | ---------------------------------------- | --------------------------------------------- |
| **Setup**                | Provider + createStore + combineReducers | Just `domain()` — no providers                |
| **Store Structure**      | Single global store                      | Multiple stores in hierarchical domains       |
| **State Shape**          | Always an object                         | Any type (primitives, objects, arrays)        |
| **Computed State**       | Reselect / RTK createSelector            | Built-in `domain.derived()`                   |
| **Code Splitting**       | Complex with replaceReducer              | Natural with domain hierarchy                 |
| **Dependency Injection** | Manual / external library                | Built-in module system                        |
| **Testing**              | Mock entire store                        | `domain.override()` for surgical mocking      |
| **DevTools**             | Redux DevTools (required)                | `onAnyDispatch()` + natural console debugging |
| **Subscribe**            | Called on every dispatch                 | `onChange` only when state changes            |

> 📝 **Note on Subscribe Behavior:**
>
> - Redux `store.subscribe()` fires on **every dispatch**, even if state didn't change
> - FluxDom `store.onChange()` fires **only when state actually changes** (more efficient!)
> - FluxDom `store.onDispatch()` is the equivalent to Redux subscribe — fires on every action

### Side-by-Side Example

**Redux:**

```tsx
// store.ts
import { configureStore, createSlice } from "@reduxjs/toolkit";

const counterSlice = createSlice({
  name: "counter",
  initialState: 0,
  reducers: {
    increment: (state) => state + 1,
    decrement: (state) => state - 1,
  },
});

export const store = configureStore({
  reducer: { counter: counterSlice.reducer },
});
export const { increment, decrement } = counterSlice.actions;

// App.tsx
import { Provider, useSelector, useDispatch } from "react-redux";
import { store, increment } from "./store";

function Counter() {
  const count = useSelector((state) => state.counter);
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(increment())}>{count}</button>;
}

function App() {
  return (
    <Provider store={store}>
      <Counter />
    </Provider>
  );
}
```

**FluxDom:**

```tsx
// store.ts
import { domain, actions } from "fluxdom";

const app = domain("app");

export const counterActions = actions({
  increment: true,
  decrement: true,
});

const reducer = actions.reducer(counterActions, (state: number, action) => {
  switch (action.type) {
    case "increment":
      return state + 1;
    case "decrement":
      return state - 1;
    default:
      return state;
  }
});

export const counterStore = app.store({ name: "counter", initial: 0, reducer });

// App.tsx
import { useSelector } from "fluxdom/react";
import { counterStore, counterActions } from "./store";

function Counter() {
  const count = useSelector(counterStore);
  return (
    <button onClick={() => counterStore.dispatch(counterActions.increment())}>
      {count}
    </button>
  );
}

function App() {
  return <Counter />; // No Provider needed!
}
```

---

## 💡 Why FluxDom?

| Problem                     | FluxDom Solution                                             |
| --------------------------- | ------------------------------------------------------------ |
| "My global state is a mess" | Hierarchical domains keep features isolated                  |
| "Testing is painful"        | Built-in DI with `.override()` for mocking                   |
| "Too many re-renders"       | Fine-grained subscriptions + equality strategies + `batch()` |
| "Providers everywhere"      | No providers needed — import and use                         |
| "Async logic is scattered"  | Thunks with full context at store & domain level             |
| "I can't debug anything"    | Event bubbling + `onAnyDispatch` sees all                    |

---

## License

MIT — Go build something amazing. 🚀
