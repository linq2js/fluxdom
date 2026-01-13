import { describe, it, expect } from "vitest";
import { actions } from "./actions";
import { domain } from "./domain";

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
      type DomainAction = { type: "RESET_ALL" };
      const app = domain<DomainAction>("app");

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
});
