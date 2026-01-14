# FluxDom API Reference

Complete API documentation for all FluxDom functions, types, and interfaces.

## Core Functions

### `domain(name)`

Create a root domain — your app's command center.

```ts
import { domain } from "fluxdom";

const app = domain("app");
```

**Parameters:**
- `name: string` - Identifier for the domain (used for debugging)

**Returns:** `Domain` - A new Domain instance

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

// Module with domain access
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
```

**Parameters:**
- `name: string` - Unique name for the module
- `create: (domain: Domain) => TModule` - Factory function to create the module instance

**Returns:** `ModuleDef<TModule>` - Module definition that can be resolved via `domain.get()`

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

**Parameters:**
- `definitions: ActionDefinitions` - Map of action names to definitions

**Returns:** `ActionCreators` - Object with action creator functions

---

### `batch(fn)`

Batch multiple dispatches into a single notification cycle.

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
```

**Parameters:**
- `fn: () => T` - Function to execute in batch

**Returns:** `T` - Return value of the function

---

### `derived(name, dependencies, selector, equals?)`

Create a computed store that auto-updates when dependencies change.

```ts
import { derived } from "fluxdom";

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
const totalStore = derived(
  "total",
  [priceStore, quantityStore],
  (price, quantity) => ({
    total: price * quantity,
    formatted: `$${(price * quantity).toFixed(2)}`,
  })
);

totalStore.getState(); // { total: 200, formatted: "$200.00" }
```

**Parameters:**
- `name: string` - Name for the derived store
- `dependencies: Store<any>[]` - Array of stores to depend on
- `selector: (...states) => TState` - Function to compute derived state
- `equals?: Equality<TState>` - Optional equality function for change detection

**Returns:** `DerivedStore<TState>` - Read-only computed store

---

### `emitter<T>()`

Create a typed event emitter.

```ts
import { emitter } from "fluxdom";

const clicks = emitter<{ x: number; y: number }>();

// Subscribe
const unsub = clicks.on((pos) => console.log(`Clicked at ${pos.x}, ${pos.y}`));

// Emit
clicks.emit({ x: 100, y: 200 });

// Done
unsub();

// Filter & transform on the fly
const events = emitter<{ type: string; data: any }>();

events.on(
  (e) => (e.type === "ERROR" ? { value: e.data } : undefined),
  (error) => console.error("💥", error)
);
```

**Returns:** `Emitter<T>` - Event emitter instance

---

## Domain Interface

### Properties

#### `domain.name`

The domain's identifier string.

```ts
const app = domain("app");
const auth = app.domain("auth");

console.log(app.name); // "app"
console.log(auth.name); // "app.auth"
```

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

#### `domain.meta`

Optional metadata for the domain.

```ts
const app = domain("app");
console.log(app.meta); // undefined (unless set during creation)
```

### Methods

#### `domain.store(config)`

Create a state store with a reducer function.

```ts
interface StoreConfig<TState, TAction> {
  name: string;
  initial: TState;
  reducer: (state: TState, action: TAction) => TState;
  equals?: Equality<TState>; // Optional equality for change detection
  meta?: StoreMeta; // Optional metadata
}

const counterStore = app.store({
  name: "counter",
  initial: 0,
  reducer: (state, action) => {
    switch (action.type) {
      case "INC": return state + 1;
      case "DEC": return state - 1;
      default: return state;
    }
  },
});
```

**Parameters:**
- `config: StoreConfig<TState, TAction>` - Store configuration

**Returns:** `MutableStore<TState, TAction>` - Mutable store instance

#### `domain.model(config)`

Create a model — a store with bound action and effect methods.

```ts
interface ModelConfig<TState, TActionMap, TEffectsMap> {
  name: string;
  initial: TState;
  actions: (ctx: ModelActionContext<TState>) => TActionMap;
  effects?: (ctx: ModelEffectsContext<TState, TActionMap>) => TEffectsMap;
  equals?: Equality<TState>;
  meta?: StoreMeta;
}

const counter = app.model({
  name: "counter",
  initial: 0,
  actions: (ctx) => ({
    increment: (state) => state + 1,
    add: (state, amount: number) => state + amount,
    reset: ctx.reducers.reset,
    set: ctx.reducers.set,
  }),
  effects: ({ task, actions }) => ({
    incrementAsync: task(
      async () => {
        await delay(100);
        return 1;
      },
      { done: (n) => actions.add(n) }
    ),
  }),
});

// Bound methods
counter.increment();
counter.add(5);
await counter.incrementAsync();
```

**Parameters:**
- `config: ModelConfig<TState, TActionMap, TEffectsMap>` - Model configuration

**Returns:** `ModelWithMethods<TState, TActionMap, TEffectsMap>` - Model with bound methods

#### `domain.domain(name, meta?)`

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

**Parameters:**
- `name: string` - Name for the child domain
- `meta?: DomainMeta` - Optional metadata

**Returns:** `Domain` - Child domain instance

#### `domain.derived(name, deps, selector, equals?)`

Create a computed store that auto-updates when dependencies change.

```ts
const stats = todos.derived("stats", [todoStore], (todos) => ({
  total: todos.items.length,
  completed: todos.items.filter((t) => t.done).length,
}));

stats.getState(); // { total: 3, completed: 1 }
```

**Parameters:**
- `name: string` - Name for the derived store
- `deps: Store<any>[]` - Array of dependency stores
- `selector: (...states) => TState` - Selector function
- `equals?: Equality<TState>` - Optional equality function

**Returns:** `DerivedStore<TState>` - Read-only computed store

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

**Parameters:**
- `actionOrThunk: AnyAction | Thunk` - Action object or thunk function

**Returns:** `any` - Return value of thunk (if applicable)

#### `domain.get(moduleDef)`

Resolve a module by its definition. Lazy-loads on first access, then cached.

```ts
// Resolve (created on first call)
const logger = app.get(LoggerModule);
logger.info("App started");

// Same instance returned on subsequent calls
app.get(LoggerModule) === logger; // true

// Child domains inherit parent's instances
auth.get(LoggerModule) === logger; // true
```

**Parameters:**
- `moduleDef: ModuleDef<TModule>` - Module definition

**Returns:** `TModule` - Module instance

#### `domain.override(source, replacement)`

Override a module for testing or platform-specific implementations.

```ts
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

**Parameters:**
- `source: ModuleDef<TModule>` - Original module definition
- `replacement: ModuleDef<TModule>` - Replacement module definition

**Returns:** `() => void` - Function to restore the original

#### `domain.onDispatch(fn)`

Listen to actions dispatched directly to this domain.

```ts
const unsub = app.onDispatch(({ action, source, context }) => {
  console.log(`Action: ${action.type}`);
  console.log(`Source: ${source}`);
});

app.dispatch({ type: "TEST" });
// Logs: Action: TEST, Source: app

unsub(); // Stop listening
```

**Parameters:**
- `fn: (args: DispatchArgs) => void` - Listener function

**Returns:** `() => void` - Unsubscribe function

#### `domain.onAnyDispatch(fn)`

Listen to ALL actions — from this domain AND all descendants.

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

**Parameters:**
- `fn: (args: DispatchArgs) => void` - Listener function

**Returns:** `() => void` - Unsubscribe function

#### `domain.plugin(config)`

Register a plugin that hooks into store, domain, and module methods.

```ts
interface DomainPluginConfig {
  domain?: {
    filter?: (config: DomainConfig) => boolean;
    pre?: (config: DomainConfig) => DomainConfig | void;
    post?: (domain: Domain, config: DomainConfig) => void;
  };
  store?: {
    filter?: (config: StoreConfig<any, any>) => boolean;
    pre?: (config: StoreConfig<any, any>) => StoreConfig<any, any> | void;
    post?: (store: MutableStore<any, any>, config: StoreConfig<any, any>) => void;
  };
  module?: {
    filter?: (definition: ModuleDef<any>) => boolean;
    pre?: (definition: ModuleDef<any>) => ModuleDef<any> | void;
    post?: (instance: any, definition: ModuleDef<any>) => void;
  };
}

const app = domain("app").plugin({
  store: {
    pre: (config) => console.log("[store:pre]", config.name),
    post: (store, config) => console.log("[store:created]", store.name),
  },
});
```

**Parameters:**
- `config: DomainPluginConfig` - Plugin configuration

**Returns:** `this` - The domain instance for chaining

#### `domain.use(plugin)`

Extend the domain with a plugin function.

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

**Parameters:**
- `plugin: (domain: Domain) => any` - Plugin function

**Returns:** `any` - Enhanced domain or plugin's return value

---

## Store Interface

### Properties

#### `store.name`

The store's namespaced identifier.

```ts
const counterStore = app.store({ name: "counter", initial: 0, reducer });
console.log(counterStore.name); // "app.counter"
```

#### `store.meta`

Optional metadata for the store.

```ts
const store = app.store({
  name: "test",
  initial: 0,
  reducer: (s) => s,
  meta: { persisted: true, version: 1 },
});

console.log(store.meta); // { persisted: true, version: 1 }
```

### Methods

#### `store.getState()`

Get the current state snapshot.

```ts
console.log(counterStore.getState()); // 0

counterStore.dispatch({ type: "INC" });
console.log(counterStore.getState()); // 1
```

**Returns:** `TState` - Current state value

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

**Parameters:**
- `actionOrThunk: TAction | Thunk` - Action object or thunk function

**Returns:** `any` - Return value of thunk (if applicable)

#### `store.onChange(fn)`

Subscribe to state changes.

```ts
const unsub = counterStore.onChange(() => {
  console.log("New state:", counterStore.getState());
});

counterStore.dispatch({ type: "INC" }); // Logs: "New state: 1"

unsub(); // Stop listening
```

**Parameters:**
- `fn: () => void` - Change listener function

**Returns:** `() => void` - Unsubscribe function

#### `store.onDispatch(fn)`

Subscribe to all actions dispatched to this store.

```ts
const unsub = counterStore.onDispatch(({ action, source, context }) => {
  console.log(`[${source}] ${action.type}`);
  console.log("State:", context.getState());
});

counterStore.dispatch({ type: "INC" });
// Logs: "[app.counter] INC", "State: 1"

unsub();
```

**Parameters:**
- `fn: (args: DispatchArgs) => void` - Dispatch listener function

**Returns:** `() => void` - Unsubscribe function

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
console.log(counter.value); // 1
```

**Parameters:**
- `plugin: (store: Store) => any` - Plugin function

**Returns:** `any` - Enhanced store or plugin's return value

---

## DerivedStore Interface

### Properties

#### `derivedStore.name`

The derived store's namespaced identifier.

```ts
const stats = todos.derived("stats", [todoStore], selector);
console.log(stats.name); // "app.todos.stats"
```

#### `derivedStore.dependencies`

Array of source stores this derived store depends on.

```ts
const total = app.derived("total", [priceStore, quantityStore], selector);

console.log(total.dependencies); // [priceStore, quantityStore]
console.log(total.dependencies.length); // 2
```

### Methods

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

**Returns:** `TState` - Current computed value

#### `derivedStore.onChange(fn)`

Subscribe to changes in the computed value.

```ts
const unsub = stats.onChange(() => {
  console.log("Stats updated:", stats.getState());
});

todoStore.dispatch({ type: "ADD", text: "Task" });
// Logs: "Stats updated: { total: 1, done: 0 }"

unsub();
```

**Parameters:**
- `fn: () => void` - Change listener function

**Returns:** `() => void` - Unsubscribe function

---

## React Hooks

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

**Parameters:**
- `store: Store<TState> | Store<any>[]` - Store or array of stores
- `selector?: (state) => TSelected` - Optional selector function
- `equality?: Equality<TSelected>` - Optional equality function

**Returns:** `TSelected` - Selected state value

---

## Utility Functions

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

### `isPromiseLike(value)`

Check if a value is a PromiseLike (has a `.then` method).

```ts
import { isPromiseLike } from "fluxdom";

isPromiseLike(Promise.resolve(1)); // true
isPromiseLike(fetch("/api")); // true
isPromiseLike({ then: (fn) => fn(42) }); // true (custom thenable)
isPromiseLike(() => {}); // false
isPromiseLike(null); // false
isPromiseLike(42); // false
```

### `matches(action, actionOrActions)`

Check if an action matches one or more action creators.

```ts
import { actions, matches } from "fluxdom";

const todoActions = actions({
  add: (title: string) => ({ title }),
  remove: (id: number) => id,
  toggle: (id: number) => id,
});

// In dispatch listeners
app.onAnyDispatch(({ action }) => {
  // Single action — type narrowing works!
  if (matches(action, todoActions.add)) {
    console.log("Added:", action.payload.title); // ✅ typed as { title: string }
  }

  // Multiple actions
  if (matches(action, [todoActions.add, todoActions.remove])) {
    console.log("Todo list changed");
  }
});
```

---

## Equality Functions

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

// shallow3Equal — 3 levels deep
shallow3Equal({ a: { b: { x: 1 } } }, { a: { b: { x: 1 } } }); // true

// deepEqual — full recursive comparison
deepEqual({ a: { b: { c: { d: 1 } } } }, { a: { b: { c: { d: 1 } } } }); // true

// resolveEquality — convert shorthand to function
const eq = resolveEquality("shallow");
eq({ a: 1 }, { a: 1 }); // true
```

---

## Type Definitions

### Core Types

```ts
// Basic action interface
interface Action {
  type: string;
}

// Action with any additional properties
type AnyAction = Action & { [key: string]: unknown };

// Reducer function
type Reducer<TState, TAction extends Action = Action> = (
  state: TState,
  action: TAction
) => TState;

// Thunk function
type Thunk<TContext = any, TReturn = any> = (
  context: TContext
) => TReturn;

// Equality function
type Equality<T> = (a: T, b: T) => boolean;
```

### Domain Types

```ts
interface Domain extends Pipeable {
  readonly name: string;
  readonly meta?: DomainMeta;
  readonly root: Domain;
  
  dispatch: Dispatch<DomainContext, AnyAction>;
  onDispatch(listener: OnDispatch<AnyAction, DomainContext>): () => void;
  onAnyDispatch(listener: OnDispatch): () => void;
  
  get: ResolveModule;
  override<TModule>(source: ModuleDef<TModule>, override: ModuleDef<TModule>): VoidFunction;
  
  store<TState, TAction extends Action>(config: StoreConfig<TState, TAction>): MutableStore<TState, TAction>;
  model<TState, TActionMap, TEffectsMap>(config: ModelConfig<TState, TActionMap, TEffectsMap>): ModelWithMethods<TState, TActionMap, TEffectsMap>;
  domain(name: string, meta?: DomainMeta): Domain;
  derived<TState>(name: string, deps: Store<any>[], selector: (...states: any[]) => TState, equals?: Equality<TState>): DerivedStore<TState>;
  
  plugin(config: DomainPluginConfig): this;
}

interface DomainContext {
  dispatch: Dispatch<this, AnyAction>;
  get: ResolveModule;
}
```

### Store Types

```ts
interface Store<TState> extends Pipeable {
  name: string;
  meta?: StoreMeta;
  getState(): TState;
  onChange(listener: () => void): () => void;
}

interface MutableStore<TState, TAction extends Action> extends Store<TState> {
  dispatch: Dispatch<StoreContext<TState, TAction>, TAction>;
  onDispatch(listener: (args: DispatchArgs<TAction, StoreContext<TState, TAction>>) => void): () => void;
}

interface DerivedStore<TState> extends Store<TState> {
  readonly dependencies: readonly Store<any>[];
}

interface StoreContext<TState, TAction extends Action = Action> {
  dispatch: Dispatch<this, TAction>;
  domain: DomainContext;
  getState: () => TState;
}
```

### Model Types

```ts
interface ModelConfig<TState, TActionMap, TEffectsMap> {
  name: string;
  initial: TState;
  actions: (ctx: ModelActionContext<TState>) => TActionMap;
  effects?: (ctx: ModelEffectsContext<TState, TActionMap>) => TEffectsMap;
  equals?: Equality<TState>;
  meta?: StoreMeta;
}

interface ModelActionContext<TState> {
  reducers: {
    reset: (state: TState) => TState;
    set: (state: TState, value: TState) => TState;
  };
  
  // Catch-all handler
  on(handler: (state: TState, action: AnyAction) => TState): void;
  
  // Single action matcher
  on<TAction extends Action>(
    action: ActionMatcher<TAction>,
    handler: (state: TState, action: TAction) => TState
  ): void;
  
  // Multiple action matchers
  on<TAction extends Action>(
    actions: ActionMatcher<TAction>[],
    handler: (state: TState, action: TAction) => TState
  ): void;
}

interface ModelEffectsContext<TState, TActionMap> {
  task: TaskHelper;
  actions: ActionCreators<TActionMap>;
  initial: TState;
  dispatch: Dispatch;
  getState: () => TState;
  domain: Domain;
}

interface TaskHelper {
  <TResult>(
    promise: PromiseLike<TResult>,
    options: TaskOptions<TResult>
  ): Promise<TResult>;
  
  <TArgs extends any[], TResult>(
    fn: (...args: TArgs) => PromiseLike<TResult>,
    options: TaskOptions<TResult>
  ): (...args: TArgs) => Promise<TResult>;
}

interface TaskOptions<TResult, TError = Error> {
  start?: () => Action | void;
  done?: (result: TResult) => Action | void;
  fail?: (error: TError) => Action | void;
  end?: (error: TError | undefined, result: TResult | undefined) => Action | void;
}
```

### Module Types

```ts
interface ModuleDef<TModule> {
  readonly name: string;
  readonly meta?: ModuleMeta;
  readonly create: (domain: Domain) => TModule;
}

type ResolveModule = <TModule>(definition: ModuleDef<TModule>) => TModule;
```

### Plugin Types

```ts
interface DomainPluginConfig {
  domain?: {
    filter?: (config: DomainConfig) => boolean;
    pre?: (config: DomainConfig) => DomainConfig | void;
    post?: (domain: Domain, config: DomainConfig) => void;
  };
  store?: {
    filter?: (config: StoreConfig<any, any>) => boolean;
    pre?: (config: StoreConfig<any, any>) => StoreConfig<any, any> | void;
    post?: (store: MutableStore<any, any>, config: StoreConfig<any, any>) => void;
  };
  module?: {
    filter?: (definition: ModuleDef<any>) => boolean;
    pre?: (definition: ModuleDef<any>) => ModuleDef<any> | void;
    post?: (instance: any, definition: ModuleDef<any>) => void;
  };
}

interface DomainConfig {
  name: string;
  meta?: DomainMeta;
}
```

### Meta Interfaces (Augmentable)

```ts
// These can be augmented via module declaration
interface DomainMeta {}
interface StoreMeta {}
interface ModuleMeta {}
```

**Example augmentation:**

```ts
declare module "fluxdom" {
  interface StoreMeta {
    persisted?: boolean;
    version?: number;
  }
}
```

---

This completes the comprehensive API reference for FluxDom. All functions, interfaces, and types are documented with examples and usage patterns.