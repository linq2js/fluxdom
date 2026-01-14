import { describe, it, expect, vi } from "vitest";
import { domain } from "./domain";
// StoreContext not needed - effects use closure for context

describe("model()", () => {
  describe("basic usage", () => {
    it("should create a model with bound action methods", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          increment: (state) => state + 1,
          decrement: (state) => state - 1,
        }),
      });

      expect(counter.getState()).toBe(0);

      counter.increment();
      expect(counter.getState()).toBe(1);

      counter.increment();
      expect(counter.getState()).toBe(2);

      counter.decrement();
      expect(counter.getState()).toBe(1);
    });

    it("should support action methods with arguments", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          add: (state, n: number) => state + n,
          multiply: (state, n: number) => state * n,
        }),
      });

      counter.add(5);
      expect(counter.getState()).toBe(5);

      counter.multiply(3);
      expect(counter.getState()).toBe(15);

      counter.add(-10);
      expect(counter.getState()).toBe(5);
    });

    it("should support multiple arguments", () => {
      const app = domain("app");

      interface Point {
        x: number;
        y: number;
      }

      const point = app.model({
        name: "point",
        initial: { x: 0, y: 0 } as Point,
        actions: () => ({
          moveTo: (_state, x: number, y: number) => ({ x, y }),
          moveBy: (state, dx: number, dy: number) => ({
            x: state.x + dx,
            y: state.y + dy,
          }),
        }),
      });

      point.moveTo(10, 20);
      expect(point.getState()).toEqual({ x: 10, y: 20 });

      point.moveBy(5, -5);
      expect(point.getState()).toEqual({ x: 15, y: 15 });
    });
  });

  describe("context helpers", () => {
    it("should provide ctx.reducers.reset helper", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 100,
        actions: (ctx) => ({
          increment: (state) => state + 1,
          reset: ctx.reducers.reset,
        }),
      });

      counter.increment();
      counter.increment();
      expect(counter.getState()).toBe(102);

      counter.reset();
      expect(counter.getState()).toBe(100);
    });

    it("should provide ctx.reducers.set helper", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: (ctx) => ({
          increment: (state) => state + 1,
          set: ctx.reducers.set,
        }),
      });

      counter.increment();
      expect(counter.getState()).toBe(1);

      counter.set(999);
      expect(counter.getState()).toBe(999);
    });
  });

  describe("effects", () => {
    it("should support effect creators", async () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          add: (state, n: number) => state + n,
        }),
        effects: ({ dispatch }) => ({
          addAsync: async (n: number) => {
            await Promise.resolve();
            dispatch({ type: "add", args: [n] });
          },
        }),
      });

      expect(counter.getState()).toBe(0);

      await counter.addAsync(5);
      expect(counter.getState()).toBe(5);

      await counter.addAsync(10);
      expect(counter.getState()).toBe(15);
    });

    it("should provide ctx.actions for type-safe dispatch", async () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          increment: (state) => state + 1,
          add: (state, n: number) => state + n,
          set: (_state, value: number) => value,
        }),
        effects: ({ actions, dispatch, getState }) => ({
          // Use actions for type-safe dispatch
          incrementTwice: () => {
            dispatch(actions.increment());
            dispatch(actions.increment());
          },
          addAndDouble: (n: number) => {
            dispatch(actions.add(n));
            const current = getState();
            dispatch(actions.set(current * 2));
          },
        }),
      });

      expect(counter.getState()).toBe(0);

      counter.incrementTwice();
      expect(counter.getState()).toBe(2);

      counter.addAndDouble(5);
      // 2 + 5 = 7, then 7 * 2 = 14
      expect(counter.getState()).toBe(14);
    });

    it("should provide ctx.initial for reset effects", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 100,
        actions: () => ({
          increment: (state) => state + 1,
          set: (_state, value: number) => value,
        }),
        effects: ({ actions, dispatch, initial }) => ({
          reset: () => {
            dispatch(actions.set(initial));
          },
        }),
      });

      counter.increment();
      counter.increment();
      expect(counter.getState()).toBe(102);

      counter.reset();
      expect(counter.getState()).toBe(100); // Back to initial
    });

    it("should allow using ctx.actions in async effects", async () => {
      const app = domain("app");

      interface DataState {
        loading: boolean;
        data: number | null;
      }

      const dataModel = app.model({
        name: "data",
        initial: { loading: false, data: null } as DataState,
        actions: () => ({
          setLoading: (state, loading: boolean) => ({ ...state, loading }),
          setData: (state, data: number) => ({ ...state, data }),
        }),
        effects: ({ actions, dispatch }) => ({
          fetchData: async () => {
            dispatch(actions.setLoading(true));
            await Promise.resolve();
            dispatch(actions.setData(42));
            dispatch(actions.setLoading(false));
          },
        }),
      });

      expect(dataModel.getState()).toEqual({ loading: false, data: null });

      await dataModel.fetchData();
      expect(dataModel.getState()).toEqual({ loading: false, data: 42 });
    });

    it("should provide full store context to effects", async () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          set: (_state, n: number) => n,
        }),
        effects: ({ dispatch, getState }) => ({
          doubleIfLessThan: (max: number) => {
            const current = getState();
            if (current < max) {
              dispatch({ type: "set", args: [current * 2] });
              return true;
            }
            return false;
          },
        }),
      });

      counter.set(5);
      expect(counter.doubleIfLessThan(20)).toBe(true);
      expect(counter.getState()).toBe(10);

      expect(counter.doubleIfLessThan(20)).toBe(true);
      expect(counter.getState()).toBe(20);

      expect(counter.doubleIfLessThan(20)).toBe(false);
      expect(counter.getState()).toBe(20);
    });

    it("should allow effects to access domain context", async () => {
      type AppAction = { type: "GLOBAL_RESET" };
      const app = domain<AppAction>("app");

      const domainDispatchSpy = vi.fn();
      app.onDispatch(({ action }) => domainDispatchSpy(action));

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          increment: (state) => state + 1,
        }),
        effects: ({ domain }) => ({
          resetAll: () => {
            domain.dispatch({ type: "GLOBAL_RESET" });
          },
        }),
      });

      counter.increment();
      counter.resetAll();

      expect(domainDispatchSpy).toHaveBeenCalledWith({ type: "GLOBAL_RESET" });
    });
  });

  describe("task helper", () => {
    it("should dispatch start action before async operation", async () => {
      const app = domain("app");

      interface State {
        loading: boolean;
        data: number | null;
      }

      const model = app.model({
        name: "data",
        initial: { loading: false, data: null } as State,
        actions: () => ({
          setLoading: (state, loading: boolean) => ({ ...state, loading }),
          setData: (state, data: number) => ({ ...state, data, loading: false }),
        }),
        effects: ({ task, actions }) => ({
          fetchData: task(
            async () => {
              await Promise.resolve();
              return 42;
            },
            {
              start: () => actions.setLoading(true),
              done: (result) => actions.setData(result),
            }
          ),
        }),
      });

      expect(model.getState()).toEqual({ loading: false, data: null });

      const promise = model.fetchData();
      // Start should have been dispatched synchronously
      expect(model.getState().loading).toBe(true);

      await promise;
      expect(model.getState()).toEqual({ loading: false, data: 42 });
    });

    it("should dispatch fail action on error", async () => {
      const app = domain("app");

      interface State {
        loading: boolean;
        error: string | null;
      }

      const model = app.model({
        name: "data",
        initial: { loading: false, error: null } as State,
        actions: () => ({
          setLoading: (state, loading: boolean) => ({ ...state, loading }),
          setError: (state, error: string) => ({ ...state, error, loading: false }),
        }),
        effects: ({ task, actions }) => ({
          fetchData: task(
            async () => {
              throw new Error("Network error");
            },
            {
              start: () => actions.setLoading(true),
              fail: (err) => actions.setError(err.message),
            }
          ),
        }),
      });

      await expect(model.fetchData()).rejects.toThrow("Network error");
      expect(model.getState()).toEqual({ loading: false, error: "Network error" });
    });

    it("should dispatch end action after done or fail", async () => {
      const app = domain("app");

      interface State {
        loading: boolean;
        data: number | null;
      }

      const model = app.model({
        name: "data",
        initial: { loading: false, data: null } as State,
        actions: () => ({
          setLoading: (state, loading: boolean) => ({ ...state, loading }),
          setData: (state, data: number) => ({ ...state, data }),
        }),
        effects: ({ task, actions }) => ({
          fetchData: task(
            async () => {
              await Promise.resolve();
              return 42;
            },
            {
              start: () => actions.setLoading(true),
              done: (result) => actions.setData(result),
              end: () => actions.setLoading(false),
            }
          ),
        }),
      });

      await model.fetchData();
      expect(model.getState()).toEqual({ loading: false, data: 42 });
    });

    it("should pass error and result to end action", async () => {
      const app = domain("app");

      const endArgs: any[] = [];

      interface State {
        value: number;
      }

      const model = app.model({
        name: "data",
        initial: { value: 0 } as State,
        actions: () => ({
          setEnd: (state, err: Error | undefined, result: number | undefined) => ({
            ...state,
            value: err ? -1 : (result ?? 0),
          }),
        }),
        effects: ({ task, actions }) => ({
          fetchSuccess: task(
            async () => 42,
            {
              end: (err, result) => {
                endArgs.push({ err, result });
                return actions.setEnd(err, result);
              },
            }
          ),
        }),
      });

      await model.fetchSuccess();
      expect(endArgs[0]).toEqual({ err: undefined, result: 42 });
      expect(model.getState().value).toBe(42);
    });

    it("should work with promises directly", async () => {
      const app = domain("app");

      interface State {
        data: string | null;
      }

      const model = app.model({
        name: "data",
        initial: { data: null } as State,
        actions: () => ({
          setData: (state, data: string) => ({ ...state, data }),
        }),
        effects: ({ task, actions }) => ({
          fetchInline: async () => {
            // Use task with a promise directly
            const result = await task(Promise.resolve("hello"), {
              done: (r) => actions.setData(r),
            });
            return result;
          },
        }),
      });

      const result = await model.fetchInline();
      expect(result).toBe("hello");
      expect(model.getState().data).toBe("hello");
    });

    it("should preserve function signature when wrapping", async () => {
      const app = domain("app");

      interface State {
        items: string[];
      }

      const model = app.model({
        name: "data",
        initial: { items: [] } as State,
        actions: () => ({
          setItems: (state, items: string[]) => ({ ...state, items }),
        }),
        effects: ({ task, actions }) => ({
          // Function with multiple args
          fetchItems: task(
            async (prefix: string, count: number) => {
              return Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
            },
            {
              done: (items) => actions.setItems(items),
            }
          ),
        }),
      });

      const result = await model.fetchItems("item", 3);
      expect(result).toEqual(["item-0", "item-1", "item-2"]);
      expect(model.getState().items).toEqual(["item-0", "item-1", "item-2"]);
    });

    it("should support void return for listener-only callbacks", async () => {
      const app = domain("app");

      interface State {
        data: number | null;
      }

      const sideEffects: string[] = [];

      const model = app.model({
        name: "data",
        initial: { data: null } as State,
        actions: () => ({
          setData: (state, data: number) => ({ ...state, data }),
        }),
        effects: ({ task, actions }) => ({
          // Mix of action returns and void returns
          fetchData: task(
            async () => 42,
            {
              // Returns void - listener only, no dispatch
              start: () => {
                sideEffects.push("started");
              },
              // Returns action - auto-dispatched
              done: (result) => actions.setData(result),
              // Returns void - listener only
              end: (err, result) => {
                sideEffects.push(`ended: err=${err}, result=${result}`);
              },
            }
          ),
        }),
      });

      await model.fetchData();

      // Verify side effects ran
      expect(sideEffects).toEqual(["started", "ended: err=undefined, result=42"]);

      // Verify done action was dispatched
      expect(model.getState().data).toBe(42);
    });

    it("should not dispatch when callback returns void", async () => {
      const app = domain("app");

      interface State {
        count: number;
      }

      const model = app.model({
        name: "counter",
        initial: { count: 0 } as State,
        actions: () => ({
          increment: (state) => ({ ...state, count: state.count + 1 }),
        }),
        effects: ({ task }) => ({
          // All callbacks return void - nothing should be dispatched
          doNothing: task(
            async () => "result",
            {
              start: () => { /* void */ },
              done: () => { /* void */ },
              end: () => { /* void */ },
            }
          ),
        }),
      });

      const dispatchSpy = vi.fn();
      model.onDispatch(dispatchSpy);

      await model.doNothing();

      // No actions should have been dispatched
      expect(dispatchSpy).not.toHaveBeenCalled();
      expect(model.getState().count).toBe(0);
    });
  });

  describe("store interface", () => {
    it("should expose getState()", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 42,
        actions: () => ({
          increment: (state) => state + 1,
        }),
      });

      expect(counter.getState()).toBe(42);
    });

    it("should expose onChange()", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          increment: (state) => state + 1,
        }),
      });

      const listener = vi.fn();
      const unsub = counter.onChange(listener);

      counter.increment();
      expect(listener).toHaveBeenCalledTimes(1);

      counter.increment();
      expect(listener).toHaveBeenCalledTimes(2);

      unsub();
      counter.increment();
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("should expose onDispatch()", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          increment: (state) => state + 1,
          add: (state, n: number) => state + n,
        }),
      });

      const actions: any[] = [];
      counter.onDispatch(({ action }) => actions.push(action));

      counter.increment();
      counter.add(5);

      expect(actions).toEqual([
        { type: "increment", args: [] },
        { type: "add", args: [5] },
      ]);
    });

    it("should be a MutableStore (model IS the store)", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          increment: (state) => state + 1,
        }),
      });

      // Model has all store properties directly
      expect(counter.name).toBe("app.counter");
      expect(counter.getState()).toBe(0);
      expect(counter.dispatch).toBeDefined();
      expect(counter.onChange).toBeDefined();
      expect(counter.onDispatch).toBeDefined();
      expect(counter.use).toBeDefined();

      // Can dispatch directly (model IS a store)
      counter.dispatch({ type: "increment", args: [] });
      expect(counter.getState()).toBe(1);

      // Bound methods still work
      counter.increment();
      expect(counter.getState()).toBe(2);
    });

    it("should work with derived() since model is a store", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 5,
        actions: () => ({
          increment: (state) => state + 1,
        }),
      });

      // Model can be used as a dependency for derived stores
      const doubled = app.derived("doubled", [counter], (n) => n * 2);

      expect(doubled.getState()).toBe(10);

      counter.increment();
      expect(doubled.getState()).toBe(12);
    });
  });

  describe("domain integration", () => {
    it("should receive domain actions via top-level fallback", () => {
      type AppAction =
        | { type: "RESET_ALL" }
        | { type: "SET_VALUE"; value: number };
      const app = domain<AppAction>("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        // Fallback builder handles domain actions
        fallback: (ctx) => {
          ctx.on((state, action) => {
            if (action.type === "RESET_ALL") return 0;
            if (action.type === "SET_VALUE")
              return (action as { type: "SET_VALUE"; value: number }).value;
            return state;
          });
        },
        actions: () => ({
          increment: (state) => state + 1,
        }),
      });

      counter.increment();
      expect(counter.getState()).toBe(1);

      // Domain action handled by fallback
      app.dispatch({ type: "RESET_ALL" });
      expect(counter.getState()).toBe(0);

      counter.increment();
      counter.increment();
      expect(counter.getState()).toBe(2);

      // Another domain action
      app.dispatch({ type: "SET_VALUE", value: 100 });
      expect(counter.getState()).toBe(100);
    });

    it("should handle multiple action types in single fallback", () => {
      type AppAction = { type: "RESET_ALL" } | { type: "DOUBLE" };
      const app = domain<AppAction>("app");

      const counter = app.model({
        name: "counter",
        initial: 5,
        // Fallback builder handles multiple action types
        fallback: (ctx) => {
          ctx.on((state, action) => {
            switch (action.type) {
              case "RESET_ALL":
                return 0;
              case "DOUBLE":
                return state * 2;
              default:
                return state;
            }
          });
        },
        actions: () => ({
          increment: (state) => state + 1,
        }),
      });

      expect(counter.getState()).toBe(5);

      // Fallback handles RESET_ALL
      app.dispatch({ type: "RESET_ALL" });
      expect(counter.getState()).toBe(0);

      counter.increment();
      counter.increment();
      counter.increment();
      expect(counter.getState()).toBe(3);

      // Fallback handles DOUBLE
      app.dispatch({ type: "DOUBLE" });
      expect(counter.getState()).toBe(6);
    });

    it("should not call fallback for handled model actions", () => {
      const app = domain<{ type: "DOMAIN_ACTION" }>("app");

      const handlerSpy = vi.fn((state: number) => state);

      const counter = app.model({
        name: "counter",
        initial: 0,
        fallback: (ctx) => {
          ctx.on(handlerSpy);
        },
        actions: () => ({
          increment: (state) => state + 1,
        }),
      });

      // Model action - should NOT trigger fallback
      counter.increment();
      expect(handlerSpy).not.toHaveBeenCalled();

      // Domain action - should trigger fallback
      app.dispatch({ type: "DOMAIN_ACTION" });
      expect(handlerSpy).toHaveBeenCalledTimes(1);
    });

    it("should receive domain actions (without fallback - unchanged)", () => {
      type AppAction = { type: "RESET_ALL" };
      const app = domain<AppAction>("app");

      // Without fallback, domain actions are ignored
      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          increment: (state) => state + 1,
        }),
      });

      counter.increment();
      expect(counter.getState()).toBe(1);

      // Domain action dispatched but model doesn't handle it
      app.dispatch({ type: "RESET_ALL" });
      expect(counter.getState()).toBe(1); // unchanged
    });

    it("should run ALL matched handlers in sequence", () => {
      const app = domain("app");
      const handler1Spy = vi.fn((state: number) => state + 1);
      const handler2Spy = vi.fn((state: number) => state * 2);

      const counter = app.model({
        name: "counter",
        initial: 5,
        fallback: (ctx) => {
          // Both handlers should run for MY_ACTION
          ctx.on((state, action) => {
            if (action.type === "MY_ACTION") return handler1Spy(state);
            return state;
          });
          ctx.on((state, action) => {
            if (action.type === "MY_ACTION") return handler2Spy(state);
            return state;
          });
        },
        actions: () => ({
          set: (_state, n: number) => n,
        }),
      });

      // Initial state: 5
      expect(counter.getState()).toBe(5);

      // Dispatch MY_ACTION: both handlers run
      // Handler 1: 5 + 1 = 6
      // Handler 2: 6 * 2 = 12
      app.dispatch({ type: "MY_ACTION" });
      expect(handler1Spy).toHaveBeenCalledWith(5);
      expect(handler2Spy).toHaveBeenCalledWith(6);
      expect(counter.getState()).toBe(12);
    });

    it("should provide ctx.reducers with action handlers", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 10,
        fallback: (ctx) => {
          // Reuse the reset handler
          ctx.on((state, action) => {
            if (action.type === "RESET_VIA_FALLBACK") {
              return ctx.reducers.reset(state);
            }
            return state;
          });
        },
        actions: (actionsCtx) => ({
          increment: (state) => state + 1,
          reset: actionsCtx.reducers.reset,
        }),
      });

      counter.increment();
      counter.increment();
      expect(counter.getState()).toBe(12);

      // Use fallback to reset via reused handler
      app.dispatch({ type: "RESET_VIA_FALLBACK" });
      expect(counter.getState()).toBe(10); // back to initial
    });

    it("should bubble actions to parent domain", () => {
      const app = domain("app");

      const actions: any[] = [];
      app.onAnyDispatch(({ action, source }) => {
        actions.push({ type: action.type, source });
      });

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          increment: (state) => state + 1,
        }),
      });

      counter.increment();

      expect(actions).toEqual([
        { type: "increment", source: "app.counter" },
      ]);
    });
  });

  describe("complex state", () => {
    it("should work with object state", () => {
      const app = domain("app");

      interface TodoState {
        items: { id: number; text: string; done: boolean }[];
        filter: "all" | "active" | "done";
      }

      const todos = app.model({
        name: "todos",
        initial: { items: [], filter: "all" } as TodoState,
        actions: (ctx) => ({
          add: (state, text: string) => ({
            ...state,
            items: [...state.items, { id: Date.now(), text, done: false }],
          }),
          toggle: (state, id: number) => ({
            ...state,
            items: state.items.map((item) =>
              item.id === id ? { ...item, done: !item.done } : item
            ),
          }),
          setFilter: (state, filter: TodoState["filter"]) => ({
            ...state,
            filter,
          }),
          reset: ctx.reducers.reset,
        }),
      });

      todos.add("Task 1");
      expect(todos.getState().items).toHaveLength(1);
      expect(todos.getState().items[0].text).toBe("Task 1");

      const id = todos.getState().items[0].id;
      todos.toggle(id);
      expect(todos.getState().items[0].done).toBe(true);

      todos.setFilter("done");
      expect(todos.getState().filter).toBe("done");

      todos.reset();
      expect(todos.getState()).toEqual({ items: [], filter: "all" });
    });
  });

  describe("config options", () => {
    it("should accept equals option", () => {
      const app = domain("app");

      // This test just verifies the API accepts equals
      // Actual equality checking is not yet implemented in store
      const counter = app.model({
        name: "counter",
        initial: { count: 0 },
        actions: () => ({
          increment: (state) => ({ count: state.count + 1 }),
        }),
        equals: "shallow",
      });

      counter.increment();
      expect(counter.getState()).toEqual({ count: 1 });
    });

    it("should accept custom equality function", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: { count: 0, lastUpdated: Date.now() },
        actions: () => ({
          increment: (state) => ({
            count: state.count + 1,
            lastUpdated: Date.now(),
          }),
        }),
        equals: (a, b) => a.count === b.count, // ignore lastUpdated
      });

      counter.increment();
      expect(counter.getState().count).toBe(1);
    });
  });

  describe("type safety", () => {
    it("should infer state type from initial value", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          increment: (state) => state + 1, // state is inferred as number
        }),
      });

      // TypeScript should catch: counter.increment("string") - wrong arg type
      // TypeScript should catch: const x: string = counter.getState() - wrong return type

      expect(typeof counter.getState()).toBe("number");
    });

    it("should infer action argument types", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          add: (state, n: number) => state + n,
          addMany: (state, a: number, b: number, c: number) => state + a + b + c,
        }),
      });

      // TypeScript should catch: counter.add("5") - wrong arg type
      // TypeScript should catch: counter.addMany(1, 2) - missing args

      counter.add(5);
      counter.addMany(1, 2, 3);
      expect(counter.getState()).toBe(11);
    });
  });
});
