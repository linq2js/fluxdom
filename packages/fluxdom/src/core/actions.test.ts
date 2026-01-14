import { describe, it, expect } from "vitest";
import { actions } from "./actions";
import { domain } from "./domain";
import { matches } from "../utils";
import { Action } from "../types";

describe("actions", () => {
  describe("action creators", () => {
    it("should create no-payload action with type = key", () => {
      const counterActions = actions({
        increment: true,
        decrement: true,
      });

      expect(counterActions.increment()).toEqual({
        type: "increment",
        payload: undefined,
      });
      expect(counterActions.decrement()).toEqual({
        type: "decrement",
        payload: undefined,
      });
      expect(counterActions.increment.type).toBe("increment");
      expect(counterActions.decrement.type).toBe("decrement");
    });

    it("should create no-payload action with custom type", () => {
      const counterActions = actions({
        increment: "COUNTER_INCREMENT",
        decrement: "COUNTER_DECREMENT",
      });

      expect(counterActions.increment()).toEqual({
        type: "COUNTER_INCREMENT",
        payload: undefined,
      });
      expect(counterActions.decrement()).toEqual({
        type: "COUNTER_DECREMENT",
        payload: undefined,
      });
      expect(counterActions.increment.type).toBe("COUNTER_INCREMENT");
      expect(counterActions.decrement.type).toBe("COUNTER_DECREMENT");
    });

    it("should create action with prepare function", () => {
      const counterActions = actions({
        incrementBy: (n: number) => n,
        addTodo: (text: string) => ({ id: 1, text, done: false }),
      });

      expect(counterActions.incrementBy(5)).toEqual({
        type: "incrementBy",
        payload: 5,
      });
      expect(counterActions.addTodo("Buy milk")).toEqual({
        type: "addTodo",
        payload: { id: 1, text: "Buy milk", done: false },
      });
      expect(counterActions.incrementBy.type).toBe("incrementBy");
      expect(counterActions.addTodo.type).toBe("addTodo");
    });

    it("should create action with full config (type + prepare)", () => {
      const counterActions = actions({
        set: { type: "COUNTER_SET", prepare: (value: number) => ({ value }) },
      });

      expect(counterActions.set(10)).toEqual({
        type: "COUNTER_SET",
        payload: { value: 10 },
      });
      expect(counterActions.set.type).toBe("COUNTER_SET");
    });

    it("should support mixed definitions", () => {
      const counterActions = actions({
        increment: true,
        decrement: "DEC",
        incrementBy: (n: number) => n,
        set: { type: "SET", prepare: (v: number) => v },
      });

      expect(counterActions.increment()).toEqual({
        type: "increment",
        payload: undefined,
      });
      expect(counterActions.decrement()).toEqual({
        type: "DEC",
        payload: undefined,
      });
      expect(counterActions.incrementBy(5)).toEqual({
        type: "incrementBy",
        payload: 5,
      });
      expect(counterActions.set(10)).toEqual({ type: "SET", payload: 10 });
    });

    it("should have match function for type narrowing", () => {
      const counterActions = actions({
        increment: true,
        incrementBy: (n: number) => n,
      });

      const action1 = counterActions.increment();
      const action2 = counterActions.incrementBy(5);
      const action3 = { type: "other" };

      expect(counterActions.increment.match(action1)).toBe(true);
      expect(counterActions.increment.match(action2)).toBe(false);
      expect(counterActions.increment.match(action3)).toBe(false);

      expect(counterActions.incrementBy.match(action1)).toBe(false);
      expect(counterActions.incrementBy.match(action2)).toBe(true);
      expect(counterActions.incrementBy.match(action3)).toBe(false);
    });
  });

  describe("actions.reducer", () => {
    it("should create reducer from single action map", () => {
      const counterActions = actions({
        increment: true,
        decrement: true,
        incrementBy: (n: number) => n,
      });

      const reducer = actions.reducer(
        counterActions,
        (state: number, action) => {
          switch (action.type) {
            case "increment":
              return state + 1;
            case "decrement":
              return state - 1;
            case "incrementBy":
              return state + action.payload;
            default:
              return state;
          }
        }
      );

      expect(reducer(0, counterActions.increment())).toBe(1);
      expect(reducer(5, counterActions.decrement())).toBe(4);
      expect(reducer(0, counterActions.incrementBy(10))).toBe(10);
    });

    it("should create reducer from multiple action maps", () => {
      const counterActions = actions({
        increment: true,
        incrementBy: (n: number) => n,
      });

      const appActions = actions({
        resetAll: "RESET_ALL" as const,
      });

      const reducer = actions.reducer(
        [counterActions, appActions],
        (state: number, action) => {
          switch (action.type) {
            case "increment":
              return state + 1;
            case "incrementBy":
              return state + action.payload;
            case "RESET_ALL":
              return 0;
            default:
              return state;
          }
        }
      );

      expect(reducer(0, counterActions.increment())).toBe(1);
      expect(reducer(5, counterActions.incrementBy(10))).toBe(15);
      expect(reducer(100, appActions.resetAll())).toBe(0);
    });

    it("should work with domain.store", () => {
      const app = domain("app");

      const counterActions = actions({
        increment: true,
        set: (value: number) => value,
      });

      const reducer = actions.reducer(
        counterActions,
        (state: number, action) => {
          switch (action.type) {
            case "increment":
              return state + 1;
            case "set":
              return action.payload;
            default:
              return state;
          }
        }
      );

      const store = app.store({ name: "counter", initial: 0, reducer });

      store.dispatch(counterActions.increment());
      expect(store.getState()).toBe(1);

      store.dispatch(counterActions.set(100));
      expect(store.getState()).toBe(100);
    });

    it("should handle domain actions combined with store actions", () => {
      const app = domain("app");

      const counterActions = actions({
        increment: true,
        set: (value: number) => value,
      });

      const domainActions = actions({
        resetAll: "RESET_ALL" as const,
      });

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
            default:
              return state;
          }
        }
      );

      const store = app.store({ name: "counter", initial: 0, reducer });

      store.dispatch(counterActions.increment());
      expect(store.getState()).toBe(1);

      store.dispatch(counterActions.increment());
      expect(store.getState()).toBe(2);

      // Domain action
      app.dispatch({ type: "RESET_ALL" });
      expect(store.getState()).toBe(0);
    });
  });

  describe("type safety", () => {
    it("should infer payload types correctly", () => {
      const todoActions = actions({
        add: (text: string) => ({ id: Date.now(), text, done: false }),
        toggle: (id: number) => id,
        remove: (id: number) => id,
      });

      // These should compile without errors
      const addAction = todoActions.add("Buy milk");
      const toggleAction = todoActions.toggle(123);
      const removeAction = todoActions.remove(456);

      expect(addAction.payload.text).toBe("Buy milk");
      expect(toggleAction.payload).toBe(123);
      expect(removeAction.payload).toBe(456);
    });

    it("should infer action union in reducer", () => {
      const counterActions = actions({
        increment: true,
        set: (value: number) => value,
      });

      // In the reducer, action should be typed as the union
      const reducer = actions.reducer(
        counterActions,
        (state: number, action) => {
          // TypeScript should narrow the type based on action.type
          if (action.type === "increment") {
            return state + 1;
          }
          if (action.type === "set") {
            // action.payload should be number here
            return action.payload;
          }
          return state;
        }
      );

      expect(reducer(0, counterActions.increment())).toBe(1);
      expect(reducer(0, counterActions.set(50))).toBe(50);
    });
  });

  describe("ActionOf helper type", () => {
    it("should extract action type from action creator map", () => {
      const counterActions = actions({
        increment: true,
        add: (n: number) => n,
      });

      // Type test: ActionOf extracts union of all actions
      type CounterAction = import("../types").ActionOf<typeof counterActions>;

      // Runtime test: verify action shapes match
      const incAction = counterActions.increment();
      const addAction = counterActions.add(5);

      // These should satisfy CounterAction type
      const actions_: CounterAction[] = [incAction, addAction];
      expect(actions_).toHaveLength(2);
      expect(actions_[0]).toEqual({ type: "increment", payload: undefined });
      expect(actions_[1]).toEqual({ type: "add", payload: 5 });
    });

    it("should extract action type from single action creator", () => {
      const counterActions = actions({
        increment: true,
        add: (n: number) => n,
      });

      // Type test: ActionOf extracts single action type
      type IncAction = import("../types").ActionOf<
        typeof counterActions.increment
      >;

      // Runtime test
      const action: IncAction = counterActions.increment();
      expect(action).toEqual({ type: "increment", payload: undefined });
    });
  });

  describe("prefix option", () => {
    it("should prefix action types with namespace", () => {
      const todoActions = actions("todos", {
        add: (title: string) => ({ title }),
        remove: (id: number) => ({ id }),
        toggle: (id: number) => id,
      });

      expect(todoActions.add("Buy milk")).toEqual({
        type: "todos/add",
        payload: { title: "Buy milk" },
      });
      expect(todoActions.remove(1)).toEqual({
        type: "todos/remove",
        payload: { id: 1 },
      });
      expect(todoActions.toggle(123)).toEqual({
        type: "todos/toggle",
        payload: 123,
      });

      // Type property should also be prefixed
      expect(todoActions.add.type).toBe("todos/add");
      expect(todoActions.remove.type).toBe("todos/remove");
      expect(todoActions.toggle.type).toBe("todos/toggle");
    });

    it("should prefix no-payload actions", () => {
      const counterActions = actions("counter", {
        increment: true,
        decrement: true,
      });

      expect(counterActions.increment()).toEqual({
        type: "counter/increment",
        payload: undefined,
      });
      expect(counterActions.decrement()).toEqual({
        type: "counter/decrement",
        payload: undefined,
      });
      expect(counterActions.increment.type).toBe("counter/increment");
    });

    it("should NOT prefix custom string types (used as-is)", () => {
      const appActions = actions("app", {
        localAction: true, // Will be prefixed: "app/localAction"
        globalReset: "GLOBAL_RESET", // Custom type, NOT prefixed
      });

      expect(appActions.localAction()).toEqual({
        type: "app/localAction",
        payload: undefined,
      });
      expect(appActions.globalReset()).toEqual({
        type: "GLOBAL_RESET", // Not "app/GLOBAL_RESET"
        payload: undefined,
      });
      expect(appActions.localAction.type).toBe("app/localAction");
      expect(appActions.globalReset.type).toBe("GLOBAL_RESET");
    });

    it("should NOT prefix explicit type in full config", () => {
      const counterActions = actions("counter", {
        increment: true, // Will be prefixed
        set: { type: "COUNTER_SET", prepare: (v: number) => ({ value: v }) },
      });

      expect(counterActions.increment()).toEqual({
        type: "counter/increment",
        payload: undefined,
      });
      expect(counterActions.set(10)).toEqual({
        type: "COUNTER_SET", // Not "counter/COUNTER_SET"
        payload: { value: 10 },
      });
    });

    it("should work with actions.reducer", () => {
      const todoActions = actions("todos", {
        add: (title: string) => ({ title }),
        toggle: (id: number) => id,
      });

      interface Todo {
        id: number;
        title: string;
        done: boolean;
      }

      const reducer = actions.reducer(todoActions, (state: Todo[], action) => {
        switch (action.type) {
          case "todos/add":
            return [
              ...state,
              { id: Date.now(), title: action.payload.title, done: false },
            ];
          case "todos/toggle":
            return state.map((t) =>
              t.id === action.payload ? { ...t, done: !t.done } : t
            );
          default:
            return state;
        }
      });

      const state1 = reducer([], todoActions.add("Buy milk"));
      expect(state1).toHaveLength(1);
      expect(state1[0].title).toBe("Buy milk");
    });

    it("should have correct match function with prefixed types", () => {
      const todoActions = actions("todos", {
        add: (title: string) => ({ title }),
        remove: (id: number) => ({ id }),
      });

      const addAction = todoActions.add("Test");
      const removeAction = todoActions.remove(1);
      const unknownAction = { type: "add" }; // Without prefix

      expect(todoActions.add.match(addAction)).toBe(true);
      expect(todoActions.add.match(removeAction)).toBe(false);
      expect(todoActions.add.match(unknownAction)).toBe(false); // "add" !== "todos/add"

      expect(todoActions.remove.match(removeAction)).toBe(true);
    });

    it("should infer prefixed types correctly (type safety)", () => {
      const todoActions = actions("todos", {
        add: (title: string) => ({ title }),
        remove: (id: number) => ({ id }),
      });

      // Type test: action.type should be the prefixed literal type
      const addAction = todoActions.add("Test");

      // This should be "todos/add", not "add"
      // TypeScript should error if we compare to wrong type
      const typeCheck: "todos/add" = addAction.type;
      expect(typeCheck).toBe("todos/add");

      // Payload should be correctly typed
      const titleCheck: { title: string } = addAction.payload;
      expect(titleCheck.title).toBe("Test");
    });
  });
});

describe("matches()", () => {
  it("should match a single action creator", () => {
    const todoActions = actions({
      add: (title: string) => ({ title }),
      remove: (id: number) => id,
    });

    const addAction = todoActions.add("Test");
    const removeAction = todoActions.remove(1);

    expect(matches(addAction, todoActions.add)).toBe(true);
    expect(matches(addAction, todoActions.remove)).toBe(false);
    expect(matches(removeAction, todoActions.remove)).toBe(true);
    expect(matches(removeAction, todoActions.add)).toBe(false);
  });

  it("should match multiple action creators", () => {
    const todoActions = actions({
      add: (title: string) => ({ title }),
      remove: (id: number) => id,
      toggle: (id: number) => id,
    });

    const addAction = todoActions.add("Test");
    const removeAction = todoActions.remove(1);
    const toggleAction = todoActions.toggle(2);

    // Match any of the provided actions
    expect(matches(addAction, [todoActions.add, todoActions.remove])).toBe(
      true
    );
    expect(matches(removeAction, [todoActions.add, todoActions.remove])).toBe(
      true
    );
    expect(matches(toggleAction, [todoActions.add, todoActions.remove])).toBe(
      false
    );
  });

  it("should narrow type after matching", () => {
    const todoActions = actions({
      add: (title: string) => ({ title }),
      remove: (id: number) => id,
    });

    const action = todoActions.add("Test") as ReturnType<
      typeof todoActions.add | typeof todoActions.remove
    >;

    if (matches(action, todoActions.add)) {
      // Type should be narrowed to add action
      const title: { title: string } = action.payload;
      expect(title.title).toBe("Test");
    }
  });

  it("should work with prefixed actions", () => {
    const todoActions = actions("todos", {
      add: (title: string) => ({ title }),
      remove: (id: number) => id,
    });

    const addAction = todoActions.add("Test");

    expect(matches(addAction, todoActions.add)).toBe(true);
    expect(addAction.type).toBe("todos/add");
  });

  it("should not match unknown actions", () => {
    const todoActions = actions({
      add: (title: string) => ({ title }),
    });

    // Type as Action to demonstrate proper type narrowing
    const unknownAction: Action = { type: "UNKNOWN" };

    expect(matches(unknownAction, todoActions.add)).toBe(false);
    expect(matches(unknownAction, [todoActions.add])).toBe(false);

    // When action is typed broadly, narrowing works correctly
    if (matches(unknownAction, todoActions.add)) {
      // Type is narrowed to the add action type
      const _title: { title: string } = unknownAction.payload;
      expect(_title).toBeDefined(); // Won't run - action doesn't match
    }
  });
});
