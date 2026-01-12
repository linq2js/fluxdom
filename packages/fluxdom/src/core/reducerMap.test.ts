import { describe, it, expect, vi } from "vitest";
import { domain } from "./domain";

describe("Reducer Map", () => {
  describe("basic usage", () => {
    it("should return tuple [store, actions] when given reducer map", () => {
      const app = domain("app");

      const result = app.store("counter", 0, {
        increment: (state) => state + 1,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);

      const [store, actions] = result;
      expect(store).toHaveProperty("getState");
      expect(store).toHaveProperty("dispatch");
      expect(actions).toHaveProperty("increment");
    });

    it("should create action creators with .type property", () => {
      const app = domain("app");

      const [_store, actions] = app.store("counter", 0, {
        increment: (state) => state + 1,
        decrement: (state) => state - 1,
      });

      // Type is just the handler key (no path prefix)
      expect(actions.increment.type).toBe("increment");
      expect(actions.decrement.type).toBe("decrement");
    });

    it("should create action objects with type and args", () => {
      const app = domain("app");

      const [_store, actions] = app.store("counter", 0, {
        increment: (state) => state + 1,
        add: (state, amount: number) => state + amount,
      });

      // Type is just the handler key
      expect(actions.increment()).toEqual({
        type: "increment",
        args: [],
      });

      expect(actions.add(5)).toEqual({
        type: "add",
        args: [5],
      });
    });
  });

  describe("dispatching actions", () => {
    it("should update state when dispatching actions", () => {
      const app = domain("app");

      const [store, actions] = app.store("counter", 0, {
        increment: (state) => state + 1,
        decrement: (state) => state - 1,
      });

      expect(store.getState()).toBe(0);

      store.dispatch(actions.increment());
      expect(store.getState()).toBe(1);

      store.dispatch(actions.increment());
      expect(store.getState()).toBe(2);

      store.dispatch(actions.decrement());
      expect(store.getState()).toBe(1);
    });

    it("should handle single argument actions", () => {
      const app = domain("app");

      const [store, actions] = app.store("counter", 0, {
        add: (state, amount: number) => state + amount,
        set: (_state, value: number) => value,
      });

      store.dispatch(actions.add(10));
      expect(store.getState()).toBe(10);

      store.dispatch(actions.add(5));
      expect(store.getState()).toBe(15);

      store.dispatch(actions.set(100));
      expect(store.getState()).toBe(100);
    });

    it("should handle multiple argument actions", () => {
      const app = domain("app");

      interface Position {
        x: number;
        y: number;
      }

      const [store, actions] = app.store<Position>("position", { x: 0, y: 0 }, {
        setPosition: (_state, x: number, y: number) => ({ x, y }),
        move: (state, dx: number, dy: number) => ({
          x: state.x + dx,
          y: state.y + dy,
        }),
      });

      store.dispatch(actions.setPosition(10, 20));
      expect(store.getState()).toEqual({ x: 10, y: 20 });

      store.dispatch(actions.move(5, -3));
      expect(store.getState()).toEqual({ x: 15, y: 17 });
    });
  });

  describe("nested domains", () => {
    it("should have action types as handler keys (source provides path)", () => {
      const app = domain("app");
      const auth = app.domain("auth");

      const [store, actions] = auth.store("user", null, {
        login: (_state, data: { id: number }) => data,
        logout: () => null,
      });

      // Type is just the handler key
      expect(actions.login.type).toBe("login");
      expect(actions.logout.type).toBe("logout");

      // Source provides the full path in listeners
      const listener = vi.fn();
      store.onDispatch(listener);
      store.dispatch(actions.login({ id: 1 }));

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

      const [store, actions] = settings.store("theme", "light", {
        setDark: () => "dark",
        setLight: () => "light",
        set: (_state, theme: string) => theme,
      });

      // Type is just the handler key
      expect(actions.setDark.type).toBe("setDark");

      store.dispatch(actions.setDark());
      expect(store.getState()).toBe("dark");

      store.dispatch(actions.set("system"));
      expect(store.getState()).toBe("system");
    });
  });

  describe("onChange notifications", () => {
    it("should notify listeners when state changes", () => {
      const app = domain("app");

      const [store, actions] = app.store("counter", 0, {
        increment: (state) => state + 1,
      });

      const listener = vi.fn();
      store.onChange(listener);

      store.dispatch(actions.increment());
      expect(listener).toHaveBeenCalledTimes(1);

      store.dispatch(actions.increment());
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("should not notify when state is unchanged", () => {
      const app = domain("app");

      const [store, actions] = app.store("counter", 5, {
        set: (_state, value: number) => value,
      });

      const listener = vi.fn();
      store.onChange(listener);

      store.dispatch(actions.set(5)); // Same value
      expect(listener).not.toHaveBeenCalled();

      store.dispatch(actions.set(10)); // Different value
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("onDispatch notifications", () => {
    it("should receive action with type and args, source has full path", () => {
      const app = domain("app");

      const [store, actions] = app.store("counter", 0, {
        add: (state, amount: number) => state + amount,
      });

      const listener = vi.fn();
      store.onDispatch(listener);

      store.dispatch(actions.add(42));

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

      const [store, actions] = app.store("counter", 0, {
        increment: (state) => state + 1,
        decrement: (state) => state - 1,
      });

      const incrementCount = { value: 0 };

      store.onDispatch(({ action }) => {
        if (action.type === actions.increment.type) {
          incrementCount.value++;
        }
      });

      store.dispatch(actions.increment());
      store.dispatch(actions.increment());
      store.dispatch(actions.decrement());

      expect(incrementCount.value).toBe(2);
    });
  });

  describe("backward compatibility", () => {
    it("should still work with traditional reducer function", () => {
      const app = domain("app");

      // Traditional usage - returns store directly (not tuple)
      const store = app.store("counter", 0, (state, action: { type: "INC" }) => {
        if (action.type === "INC") return state + 1;
        return state;
      });

      // Should NOT be an array
      expect(Array.isArray(store)).toBe(false);
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

      const [store, actions] = app.store("todos", initial, {
        add: (state, text: string) => ({
          ...state,
          nextId: state.nextId + 1,
          items: [...state.items, { id: state.nextId, text, done: false }],
        }),
        toggle: (state, id: number) => ({
          ...state,
          items: state.items.map((t) =>
            t.id === id ? { ...t, done: !t.done } : t
          ),
        }),
        setFilter: (state, filter: TodoState["filter"]) => ({
          ...state,
          filter,
        }),
        clear: (state) => ({
          ...state,
          items: state.items.filter((t) => !t.done),
        }),
      });

      store.dispatch(actions.add("Task 1"));
      store.dispatch(actions.add("Task 2"));

      expect(store.getState().items).toHaveLength(2);

      const id = store.getState().items[0]!.id;
      store.dispatch(actions.toggle(id));

      expect(store.getState().items[0]!.done).toBe(true);

      store.dispatch(actions.setFilter("active"));
      expect(store.getState().filter).toBe("active");

      store.dispatch(actions.clear());
      expect(store.getState().items).toHaveLength(1);
      expect(store.getState().items[0]!.text).toBe("Task 2");
    });
  });

  describe("with use() plugin", () => {
    it("should support use() plugin on store from tuple", () => {
      const app = domain("app");

      const [store, actions] = app.store("counter", 0, {
        increment: (state) => state + 1,
      });

      const enhanced = store.use((s) => ({
        ...s,
        doubleIncrement: () => {
          s.dispatch(actions.increment());
          s.dispatch(actions.increment());
        },
      }));

      enhanced.doubleIncrement();
      expect(enhanced.getState()).toBe(2);
    });
  });
});
