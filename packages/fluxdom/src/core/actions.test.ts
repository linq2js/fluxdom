import { describe, it, expect, vi } from "vitest";
import { domain } from "./domain";
import { actions } from "./actions";

describe("actions()", () => {
  describe("basic usage", () => {
    it("should create actions with .reducer property", () => {
      const counterActions = actions({
        increment: (state: number) => state + 1,
      });

      expect(counterActions).toHaveProperty("increment");
      expect(counterActions).toHaveProperty("reducer");
      expect(typeof counterActions.reducer).toBe("function");
    });

    it("should create action creators with .type property", () => {
      const counterActions = actions({
        increment: (state: number) => state + 1,
        decrement: (state: number) => state - 1,
      });

      expect(counterActions.increment.type).toBe("increment");
      expect(counterActions.decrement.type).toBe("decrement");
    });

    it("should create action objects with type and args", () => {
      const counterActions = actions({
        increment: (state: number) => state + 1,
        add: (state: number, amount: number) => state + amount,
      });

      expect(counterActions.increment()).toEqual({
        type: "increment",
        args: [],
      });

      expect(counterActions.add(5)).toEqual({
        type: "add",
        args: [5],
      });
    });
  });

  describe("with domain store", () => {
    it("should work with domain.store()", () => {
      const app = domain("app");

      const counterActions = actions({
        increment: (state: number) => state + 1,
        decrement: (state: number) => state - 1,
      });

      const store = app.store("counter", 0, counterActions.reducer);

      expect(store).toHaveProperty("getState");
      expect(store).toHaveProperty("dispatch");
      expect(store.getState()).toBe(0);
    });

    it("should update state when dispatching actions", () => {
      const app = domain("app");

      const counterActions = actions({
        increment: (state: number) => state + 1,
        decrement: (state: number) => state - 1,
      });

      const store = app.store("counter", 0, counterActions.reducer);

      expect(store.getState()).toBe(0);

      store.dispatch(counterActions.increment());
      expect(store.getState()).toBe(1);

      store.dispatch(counterActions.increment());
      expect(store.getState()).toBe(2);

      store.dispatch(counterActions.decrement());
      expect(store.getState()).toBe(1);
    });

    it("should handle single argument actions", () => {
      const app = domain("app");

      const counterActions = actions({
        add: (state: number, amount: number) => state + amount,
        set: (_state: number, value: number) => value,
      });

      const store = app.store("counter", 0, counterActions.reducer);

      store.dispatch(counterActions.add(10));
      expect(store.getState()).toBe(10);

      store.dispatch(counterActions.add(5));
      expect(store.getState()).toBe(15);

      store.dispatch(counterActions.set(100));
      expect(store.getState()).toBe(100);
    });

    it("should handle multiple argument actions", () => {
      const app = domain("app");

      interface Position {
        x: number;
        y: number;
      }

      const positionActions = actions({
        setPosition: (_state: Position, x: number, y: number) => ({ x, y }),
        move: (state: Position, dx: number, dy: number) => ({
          x: state.x + dx,
          y: state.y + dy,
        }),
      });

      const store = app.store(
        "position",
        { x: 0, y: 0 },
        positionActions.reducer
      );

      store.dispatch(positionActions.setPosition(10, 20));
      expect(store.getState()).toEqual({ x: 10, y: 20 });

      store.dispatch(positionActions.move(5, -3));
      expect(store.getState()).toEqual({ x: 15, y: 17 });
    });
  });

  describe("nested domains", () => {
    it("should work with nested domains", () => {
      const app = domain("app");
      const auth = app.domain("auth");

      const userActions = actions({
        login: (_state: { id: number } | null, data: { id: number }) => data,
        logout: () => null,
      });

      const store = auth.store(
        "user",
        null as { id: number } | null,
        userActions.reducer
      );

      expect(userActions.login.type).toBe("login");
      expect(userActions.logout.type).toBe("logout");

      // Source provides the full path in listeners
      const listener = vi.fn();
      store.onDispatch(listener);
      store.dispatch(userActions.login({ id: 1 }));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          action: { type: "login", args: [{ id: 1 }] },
          source: "app.auth.user", // Full path in source
        })
      );
    });

    it("should work with deeply nested domains", () => {
      const app = domain("app");
      const features = app.domain("features");
      const settings = features.domain("settings");

      const themeActions = actions({
        setDark: () => "dark" as const,
        setLight: () => "light" as const,
        set: (_state: string, theme: string) => theme,
      });

      const store = settings.store("theme", "light", themeActions.reducer);

      expect(themeActions.setDark.type).toBe("setDark");

      store.dispatch(themeActions.setDark());
      expect(store.getState()).toBe("dark");

      store.dispatch(themeActions.set("system"));
      expect(store.getState()).toBe("system");
    });
  });

  describe("onChange notifications", () => {
    it("should notify listeners when state changes", () => {
      const app = domain("app");

      const counterActions = actions({
        increment: (state: number) => state + 1,
      });

      const store = app.store("counter", 0, counterActions.reducer);

      const listener = vi.fn();
      store.onChange(listener);

      store.dispatch(counterActions.increment());
      expect(listener).toHaveBeenCalledTimes(1);

      store.dispatch(counterActions.increment());
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("should not notify when state is unchanged", () => {
      const app = domain("app");

      const counterActions = actions({
        set: (_state: number, value: number) => value,
      });

      const store = app.store("counter", 5, counterActions.reducer);

      const listener = vi.fn();
      store.onChange(listener);

      store.dispatch(counterActions.set(5)); // Same value
      expect(listener).not.toHaveBeenCalled();

      store.dispatch(counterActions.set(10)); // Different value
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("onDispatch notifications", () => {
    it("should receive action with type and args, source has full path", () => {
      const app = domain("app");

      const counterActions = actions({
        add: (state: number, amount: number) => state + amount,
      });

      const store = app.store("counter", 0, counterActions.reducer);

      const listener = vi.fn();
      store.onDispatch(listener);

      store.dispatch(counterActions.add(42));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          action: { type: "add", args: [42] }, // Type is just handler key
          source: "app.counter", // Source provides full path
        })
      );
    });
  });

  describe("action type matching", () => {
    it("should allow matching actions by .type property", () => {
      const app = domain("app");

      const counterActions = actions({
        increment: (state: number) => state + 1,
        decrement: (state: number) => state - 1,
      });

      const store = app.store("counter", 0, counterActions.reducer);

      const incrementCount = { value: 0 };

      store.onDispatch(({ action }) => {
        if (action.type === counterActions.increment.type) {
          incrementCount.value++;
        }
      });

      store.dispatch(counterActions.increment());
      store.dispatch(counterActions.increment());
      store.dispatch(counterActions.decrement());

      expect(incrementCount.value).toBe(2);
    });
  });

  describe("traditional reducer function", () => {
    it("should still work with traditional reducer function", () => {
      const app = domain("app");

      // Traditional usage - returns store directly
      const store = app.store(
        "counter",
        0,
        (state, action: { type: "INC" }) => {
          if (action.type === "INC") return state + 1;
          return state;
        }
      );

      expect(store).toHaveProperty("getState");
      expect(store).toHaveProperty("dispatch");

      store.dispatch({ type: "INC" });
      expect(store.getState()).toBe(1);
    });
  });

  describe("complex state", () => {
    it("should handle object state with multiple handlers", () => {
      const app = domain("app");

      interface TodoState {
        items: { id: number; text: string; done: boolean }[];
        filter: "all" | "active" | "done";
        nextId: number;
      }

      const initial: TodoState = { items: [], filter: "all", nextId: 1 };

      const todoActions = actions({
        add: (state: TodoState, text: string) => ({
          ...state,
          nextId: state.nextId + 1,
          items: [...state.items, { id: state.nextId, text, done: false }],
        }),
        toggle: (state: TodoState, id: number) => ({
          ...state,
          items: state.items.map((t) =>
            t.id === id ? { ...t, done: !t.done } : t
          ),
        }),
        setFilter: (state: TodoState, filter: TodoState["filter"]) => ({
          ...state,
          filter,
        }),
        clear: (state: TodoState) => ({
          ...state,
          items: state.items.filter((t) => !t.done),
        }),
      });

      const store = app.store("todos", initial, todoActions.reducer);

      store.dispatch(todoActions.add("Task 1"));
      store.dispatch(todoActions.add("Task 2"));

      expect(store.getState().items).toHaveLength(2);

      const id = store.getState().items[0]!.id;
      store.dispatch(todoActions.toggle(id));

      expect(store.getState().items[0]!.done).toBe(true);

      store.dispatch(todoActions.setFilter("active"));
      expect(store.getState().filter).toBe("active");

      store.dispatch(todoActions.clear());
      expect(store.getState().items).toHaveLength(1);
      expect(store.getState().items[0]!.text).toBe("Task 2");
    });
  });

  describe("with use() plugin", () => {
    it("should support use() plugin on store", () => {
      const app = domain("app");

      const counterActions = actions({
        increment: (state: number) => state + 1,
      });

      const store = app.store("counter", 0, counterActions.reducer);

      const enhanced = store.use((s) => ({
        ...s,
        doubleIncrement: () => {
          s.dispatch(counterActions.increment());
          s.dispatch(counterActions.increment());
        },
      }));

      enhanced.doubleIncrement();
      expect(enhanced.getState()).toBe(2);
    });
  });

  describe("with domain reducer (second param)", () => {
    it("should handle domain actions via second reducer param", () => {
      type AppAction =
        | { type: "RESET_ALL" }
        | { type: "SET_ALL"; value: number };
      const app = domain<AppAction>("app");

      const counterActions = actions(
        {
          increment: (state: number) => state + 1,
          decrement: (state: number) => state - 1,
        },
        // Domain reducer - handles domain-level actions
        (state, action: AppAction) => {
          switch (action.type) {
            case "RESET_ALL":
              return 0;
            case "SET_ALL":
              return action.value;
            default:
              return state;
          }
        }
      );

      const store = app.store("counter", 10, counterActions.reducer);

      // Store actions work
      store.dispatch(counterActions.increment());
      expect(store.getState()).toBe(11);

      // Domain actions work (via domain.dispatch -> store receives)
      app.dispatch({ type: "RESET_ALL" });
      expect(store.getState()).toBe(0);

      store.dispatch(counterActions.increment());
      expect(store.getState()).toBe(1);

      app.dispatch({ type: "SET_ALL", value: 100 });
      expect(store.getState()).toBe(100);
    });

    it("should work without domain reducer (optional)", () => {
      type AppAction = { type: "RESET_ALL" };
      const app = domain<AppAction>("app");

      // No second param - domain actions are ignored
      const counterActions = actions({
        increment: (state: number) => state + 1,
      });

      const store = app.store("counter", 5, counterActions.reducer);

      store.dispatch(counterActions.increment());
      expect(store.getState()).toBe(6);

      // Domain action does nothing (no handler)
      app.dispatch({ type: "RESET_ALL" });
      expect(store.getState()).toBe(6);
    });

    it("should prioritize map actions over domain actions", () => {
      type AppAction = { type: "increment" }; // Same type as map action
      const app = domain<AppAction>("app");

      const counterActions = actions(
        {
          increment: (state: number) => state + 10, // +10 from map
        },
        (state, action: AppAction) => {
          if (action.type === "increment") return state + 1; // +1 from domain
          return state;
        }
      );

      const store = app.store("counter", 0, counterActions.reducer);

      // Store action (has args) - uses map handler (+10)
      store.dispatch(counterActions.increment());
      expect(store.getState()).toBe(10);

      // Domain action (no args) - uses domain reducer (+1)
      app.dispatch({ type: "increment" });
      expect(store.getState()).toBe(11);
    });
  });

  describe("multiple stores with same domain", () => {
    it("should handle domain actions across multiple stores", () => {
      type AppAction = { type: "RESET_ALL" };
      const app = domain<AppAction>("app");

      const counter1Actions = actions(
        { inc: (state: number) => state + 1 },
        (state, action: AppAction) => (action.type === "RESET_ALL" ? 0 : state)
      );

      const counter2Actions = actions(
        { inc: (state: number) => state + 1 },
        (state, action: AppAction) => (action.type === "RESET_ALL" ? 0 : state)
      );

      const store1 = app.store("counter1", 5, counter1Actions.reducer);
      const store2 = app.store("counter2", 10, counter2Actions.reducer);

      store1.dispatch(counter1Actions.inc());
      store2.dispatch(counter2Actions.inc());

      expect(store1.getState()).toBe(6);
      expect(store2.getState()).toBe(11);

      // Reset all stores via domain action
      app.dispatch({ type: "RESET_ALL" });

      expect(store1.getState()).toBe(0);
      expect(store2.getState()).toBe(0);
    });
  });

  describe("reusable actions", () => {
    it("should allow reusing same actions with multiple stores", () => {
      const counterActions = actions({
        increment: (state: number) => state + 1,
        reset: () => 0,
      });

      const app1 = domain("app1");
      const app2 = domain("app2");

      const store1 = app1.store("counter", 0, counterActions.reducer);
      const store2 = app2.store("counter", 100, counterActions.reducer);

      store1.dispatch(counterActions.increment());
      store2.dispatch(counterActions.increment());

      expect(store1.getState()).toBe(1);
      expect(store2.getState()).toBe(101);

      store1.dispatch(counterActions.reset());
      store2.dispatch(counterActions.reset());

      expect(store1.getState()).toBe(0);
      expect(store2.getState()).toBe(0);
    });
  });
});
