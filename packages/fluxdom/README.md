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

### Drop it into React

> 💡 **Tip:** When using React, import everything from `fluxdom/react` — it re-exports all core APIs (`domain`, `module`, `emitter`, etc.) plus the React hooks. No need to import from both packages!

```tsx
// ✅ Just import from fluxdom/react
import { domain, useSelector } from "fluxdom/react";

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
const filters = todos.domain("filters"); // app.todos.filters

// Always know where you came from
auth.root === app; // true
```

### Stores — Where State Lives

Every store has a name, initial state, and a reducer.

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

### Models — Stores with Bound Methods

Models are a higher-level abstraction that combines stores with bound action methods.

```ts
const counter = app.model({
  name: "counter",
  initial: 0,
  actions: (ctx) => ({
    increment: (state) => state + 1,
    decrement: (state) => state - 1,
    add: (state, amount: number) => state + amount,
    reset: ctx.reducers.reset,
  }),
});

// Call methods directly — no dispatch needed!
counter.increment();
counter.add(5);
counter.reset();

// Model IS a store — use it anywhere
const count = useSelector(counter);
```

### Modules — Dependency Injection That Doesn't Suck

Services, APIs, loggers — inject them once, use them everywhere.

```ts
import { module } from "fluxdom";

// Define the module interface
interface Storage {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
}

// Web implementation
const WebStorage = module<Storage>("storage", () => ({
  get: async (key) => localStorage.getItem(key),
  set: async (key, value) => localStorage.setItem(key, value),
}));

// React Native implementation
const RNStorage = module<Storage>("storage", () => ({
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value),
}));

// Your business logic stays the same — everywhere!
const saveUserPrefs = async ({ get }) => {
  const storage = get(StorageModule);
  await storage.set("theme", "dark");
};

// Just wire up the right implementation at app startup
app.override(StorageModule, WebStorage); // or RNStorage
```

---

## 🚀 Why FluxDom?

| Problem                     | FluxDom Solution                                             |
| --------------------------- | ------------------------------------------------------------ |
| "My global state is a mess" | Hierarchical domains keep features isolated                  |
| "Testing is painful"        | Built-in DI with `.override()` for mocking                   |
| "Too many re-renders"       | Fine-grained subscriptions + equality strategies + `batch()` |
| "Providers everywhere"      | No providers needed — import and use                         |
| "Async logic is scattered"  | Effects with `task()` for lifecycle management               |
| "I can't debug anything"    | Event bubbling + `onAnyDispatch` sees all                    |
| "Too much boilerplate"      | `model()` = slice + thunks + bound methods in one            |

---

## 🔄 FluxDom vs Redux Toolkit

If you're coming from Redux/RTK, FluxDom will feel familiar — but with less ceremony.

| Feature                  | Redux Toolkit                 | FluxDom                                  |
| ------------------------ | ----------------------------- | ---------------------------------------- |
| **Slice/Model**          | `createSlice()`               | `domain.model()`                         |
| **Async Thunks**         | `createAsyncThunk()`          | `task()` in effects                      |
| **Store Setup**          | `configureStore()` + Provider | Just `domain()` — no providers           |
| **Store Structure**      | Single global store           | Multiple stores in hierarchical domains  |
| **State Shape**          | Always an object              | Any type (primitives, objects, arrays)   |
| **Computed State**       | `createSelector` (Reselect)   | Built-in `domain.derived()`              |
| **Dependency Injection** | Manual / thunkAPI.extra       | Built-in `module()` system               |
| **Testing**              | Mock entire store             | `domain.override()` for surgical mocking |
| **Bundle Size**          | ~12kb (RTK core)              | ~4kb                                     |

**Redux Toolkit:**

```ts
// Must wrap app in Provider + lots of setup
const store = configureStore({ reducer: { todos: todosSlice.reducer } });
store.dispatch(setLoading(true));
store.dispatch(fetchTodos());
```

**FluxDom:**

```ts
// No Provider needed + bound methods
const todosModel = app.model({ ... });
todosModel.setLoading(true);
await todosModel.fetchTodos();
```

---

## 📚 Documentation

- **[Getting Started](./docs/getting-started.md)** — Step-by-step tutorial with examples
- **[API Reference](./docs/api-reference.md)** — Complete API documentation
- **[Advanced Usage](./docs/advanced-usage.md)** — Complex patterns, plugins, and optimization

---

## 🔷 TypeScript

FluxDom is built with TypeScript. Every type is exported and fully inferred.

---

## License

MIT — Go build something amazing. 🚀
