import { describe, it, expect, vi } from "vitest";
import { domain } from "./domain";
import type { StoreContext, Action } from "../types";

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
    it("should provide ctx.reset helper", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 100,
        actions: (ctx) => ({
          increment: (state) => state + 1,
          reset: ctx.reset,
        }),
      });

      counter.increment();
      counter.increment();
      expect(counter.getState()).toBe(102);

      counter.reset();
      expect(counter.getState()).toBe(100);
    });

    it("should provide ctx.set helper", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: (ctx) => ({
          increment: (state) => state + 1,
          set: ctx.set,
        }),
      });

      counter.increment();
      expect(counter.getState()).toBe(1);

      counter.set(999);
      expect(counter.getState()).toBe(999);
    });
  });

  describe("thunks", () => {
    it("should support thunk creators", async () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          add: (state, n: number) => state + n,
        }),
        thunks: () => ({
          addAsync: (n: number) => async ({ dispatch }: StoreContext<number>) => {
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
        thunks: (ctx) => ({
          // Use ctx.actions for type-safe dispatch
          incrementTwice: () => ({ dispatch }) => {
            dispatch(ctx.actions.increment());
            dispatch(ctx.actions.increment());
          },
          addAndDouble: (n: number) => ({ dispatch, getState }) => {
            dispatch(ctx.actions.add(n));
            const current = getState();
            dispatch(ctx.actions.set(current * 2));
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

    it("should provide ctx.initial for reset thunks", () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 100,
        actions: () => ({
          increment: (state) => state + 1,
          set: (_state, value: number) => value,
        }),
        thunks: (ctx) => ({
          reset: () => ({ dispatch }) => {
            dispatch(ctx.actions.set(ctx.initial));
          },
        }),
      });

      counter.increment();
      counter.increment();
      expect(counter.getState()).toBe(102);

      counter.reset();
      expect(counter.getState()).toBe(100); // Back to initial
    });

    it("should allow using ctx.actions in async thunks", async () => {
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
        thunks: (ctx) => ({
          fetchData: () => async ({ dispatch }) => {
            dispatch(ctx.actions.setLoading(true));
            await Promise.resolve();
            dispatch(ctx.actions.setData(42));
            dispatch(ctx.actions.setLoading(false));
          },
        }),
      });

      expect(dataModel.getState()).toEqual({ loading: false, data: null });

      await dataModel.fetchData();
      expect(dataModel.getState()).toEqual({ loading: false, data: 42 });
    });

    it("should provide full store context to thunks", async () => {
      const app = domain("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          set: (_state, n: number) => n,
        }),
        thunks: () => ({
          doubleIfLessThan: (max: number) => ({ dispatch, getState }: StoreContext<number>) => {
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

    it("should allow thunks to access domain context", async () => {
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
        thunks: () => ({
          resetAll: () => ({ domain }: StoreContext<number, any, AppAction>) => {
            domain.dispatch({ type: "GLOBAL_RESET" });
          },
        }),
      });

      counter.increment();
      counter.resetAll();

      expect(domainDispatchSpy).toHaveBeenCalledWith({ type: "GLOBAL_RESET" });
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
    it("should receive domain actions via ctx.fallback", () => {
      type AppAction = { type: "RESET_ALL" } | { type: "SET_VALUE"; value: number };
      const app = domain<AppAction>("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: (ctx) => {
          // Register fallback handler for domain actions
          ctx.fallback((state, action) => {
            if (action.type === "RESET_ALL") return 0;
            if (action.type === "SET_VALUE") return action.value;
            return state;
          });

          return {
            increment: (state) => state + 1,
          };
        },
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

    it("should support multiple fallback handlers", () => {
      type AppAction = { type: "RESET_ALL" } | { type: "DOUBLE" };
      const app = domain<AppAction>("app");

      const counter = app.model({
        name: "counter",
        initial: 5,
        actions: (ctx) => {
          // First fallback: handle RESET_ALL
          ctx.fallback((state, action) => {
            if (action.type === "RESET_ALL") return 0;
            return state;
          });

          // Second fallback: handle DOUBLE
          ctx.fallback((state, action) => {
            if (action.type === "DOUBLE") return state * 2;
            return state;
          });

          return {
            increment: (state) => state + 1,
          };
        },
      });

      expect(counter.getState()).toBe(5);

      // First fallback handles RESET_ALL
      app.dispatch({ type: "RESET_ALL" });
      expect(counter.getState()).toBe(0);

      counter.increment();
      counter.increment();
      counter.increment();
      expect(counter.getState()).toBe(3);

      // Second fallback handles DOUBLE
      app.dispatch({ type: "DOUBLE" });
      expect(counter.getState()).toBe(6);
    });

    it("should chain fallback handlers in order", () => {
      type AppAction = { type: "CHAIN_TEST" };
      const app = domain<AppAction>("app");

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: (ctx) => {
          // First: add 1
          ctx.fallback((state, action) => {
            if (action.type === "CHAIN_TEST") return state + 1;
            return state;
          });

          // Second: multiply by 2
          ctx.fallback((state, action) => {
            if (action.type === "CHAIN_TEST") return state * 2;
            return state;
          });

          // Third: add 10
          ctx.fallback((state, action) => {
            if (action.type === "CHAIN_TEST") return state + 10;
            return state;
          });

          return {
            set: (_state, n: number) => n,
          };
        },
      });

      counter.set(0);
      expect(counter.getState()).toBe(0);

      // Chain: 0 + 1 = 1, 1 * 2 = 2, 2 + 10 = 12
      app.dispatch({ type: "CHAIN_TEST" });
      expect(counter.getState()).toBe(12);
    });

    it("should not call fallback for handled model actions", () => {
      const app = domain<{ type: "DOMAIN_ACTION" }>("app");

      const fallbackSpy = vi.fn((state: number) => state);

      const counter = app.model({
        name: "counter",
        initial: 0,
        actions: (ctx) => {
          ctx.fallback(fallbackSpy);

          return {
            increment: (state) => state + 1,
          };
        },
      });

      // Model action - should NOT trigger fallback
      counter.increment();
      expect(fallbackSpy).not.toHaveBeenCalled();

      // Domain action - should trigger fallback
      app.dispatch({ type: "DOMAIN_ACTION" });
      expect(fallbackSpy).toHaveBeenCalledTimes(1);
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
          reset: ctx.reset,
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
