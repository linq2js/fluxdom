import { describe, it, expect } from "vitest";
import { domain } from "../core/domain";
import { actions } from "../core/actions";
import { withImmer } from "./withImmer";

describe("withImmer", () => {
  describe("basic mutations", () => {
    it("should allow direct state mutations", () => {
      const app = domain("app");

      const counterActions = actions(
        withImmer({
          increment: (state: { count: number }) => {
            state.count += 1;
          },
          decrement: (state: { count: number }) => {
            state.count -= 1;
          },
        })
      );

      const store = app.store("counter", { count: 0 }, counterActions.reducer);

      store.dispatch(counterActions.increment());
      expect(store.getState().count).toBe(1);

      store.dispatch(counterActions.increment());
      expect(store.getState().count).toBe(2);

      store.dispatch(counterActions.decrement());
      expect(store.getState().count).toBe(1);
    });

    it("should allow mutations with arguments", () => {
      const app = domain("app");

      const counterActions = actions(
        withImmer({
          add: (state: { count: number }, amount: number) => {
            state.count += amount;
          },
          set: (state: { count: number }, value: number) => {
            state.count = value;
          },
        })
      );

      const store = app.store("counter", { count: 0 }, counterActions.reducer);

      store.dispatch(counterActions.add(10));
      expect(store.getState().count).toBe(10);

      store.dispatch(counterActions.add(5));
      expect(store.getState().count).toBe(15);

      store.dispatch(counterActions.set(100));
      expect(store.getState().count).toBe(100);
    });
  });

  describe("array mutations", () => {
    it("should allow push/splice on arrays", () => {
      const app = domain("app");

      interface TodoState {
        items: { id: number; text: string; done: boolean }[];
      }

      const todoActions = actions(
        withImmer({
          add: (state: TodoState, text: string) => {
            state.items.push({ id: Date.now(), text, done: false });
          },
          remove: (state: TodoState, id: number) => {
            const index = state.items.findIndex((t) => t.id === id);
            if (index !== -1) state.items.splice(index, 1);
          },
          toggle: (state: TodoState, id: number) => {
            const item = state.items.find((t) => t.id === id);
            if (item) item.done = !item.done;
          },
        })
      );

      const store = app.store<TodoState>(
        "todos",
        { items: [] },
        todoActions.reducer
      );

      store.dispatch(todoActions.add("Task 1"));
      store.dispatch(todoActions.add("Task 2"));

      expect(store.getState().items).toHaveLength(2);
      expect(store.getState().items[0]!.text).toBe("Task 1");

      const id = store.getState().items[0]!.id;
      store.dispatch(todoActions.toggle(id));
      expect(store.getState().items[0]!.done).toBe(true);

      store.dispatch(todoActions.remove(id));
      expect(store.getState().items).toHaveLength(1);
      expect(store.getState().items[0]!.text).toBe("Task 2");
    });
  });

  describe("nested object mutations", () => {
    it("should allow deep mutations", () => {
      const app = domain("app");

      interface State {
        user: {
          profile: {
            name: string;
            settings: {
              theme: string;
              notifications: boolean;
            };
          };
        };
      }

      const userActions = actions(
        withImmer({
          setName: (state: State, name: string) => {
            state.user.profile.name = name;
          },
          setTheme: (state: State, theme: string) => {
            state.user.profile.settings.theme = theme;
          },
          toggleNotifications: (state: State) => {
            state.user.profile.settings.notifications =
              !state.user.profile.settings.notifications;
          },
        })
      );

      const initial: State = {
        user: {
          profile: {
            name: "John",
            settings: {
              theme: "light",
              notifications: true,
            },
          },
        },
      };

      const store = app.store("user", initial, userActions.reducer);

      store.dispatch(userActions.setName("Jane"));
      expect(store.getState().user.profile.name).toBe("Jane");

      store.dispatch(userActions.setTheme("dark"));
      expect(store.getState().user.profile.settings.theme).toBe("dark");

      store.dispatch(userActions.toggleNotifications());
      expect(store.getState().user.profile.settings.notifications).toBe(false);
    });
  });

  describe("return value support", () => {
    it("should support returning a new state (replace)", () => {
      const app = domain("app");

      const counterActions = actions(
        withImmer({
          reset: () => ({ count: 0 }),
          double: (state: { count: number }) => ({ count: state.count * 2 }),
        })
      );

      const store = app.store("counter", { count: 5 }, counterActions.reducer);

      store.dispatch(counterActions.double());
      expect(store.getState().count).toBe(10);

      store.dispatch(counterActions.reset());
      expect(store.getState().count).toBe(0);
    });

    it("should allow mixing mutations and returns", () => {
      const app = domain("app");

      interface State {
        items: number[];
        total: number;
      }

      const stateActions = actions(
        withImmer({
          // Mutation style
          addItem: (state: State, item: number) => {
            state.items.push(item);
            state.total += item;
          },
          // Return style
          clear: () => ({ items: [], total: 0 }),
        })
      );

      const store = app.store<State>(
        "data",
        { items: [], total: 0 },
        stateActions.reducer
      );

      store.dispatch(stateActions.addItem(10));
      store.dispatch(stateActions.addItem(20));
      expect(store.getState()).toEqual({ items: [10, 20], total: 30 });

      store.dispatch(stateActions.clear());
      expect(store.getState()).toEqual({ items: [], total: 0 });
    });
  });

  describe("immutability", () => {
    it("should produce new references on mutation", () => {
      const app = domain("app");

      const counterActions = actions(
        withImmer({
          increment: (state: { count: number }) => {
            state.count += 1;
          },
        })
      );

      const store = app.store("counter", { count: 0 }, counterActions.reducer);

      const state1 = store.getState();
      store.dispatch(counterActions.increment());
      const state2 = store.getState();

      expect(state1).not.toBe(state2);
      expect(state1.count).toBe(0);
      expect(state2.count).toBe(1);
    });

    it("should not produce new references when no mutation", () => {
      const app = domain("app");

      const counterActions = actions(
        withImmer({
          noop: (state: { count: number }) => {
            // No mutation
            void state;
          },
        })
      );

      const store = app.store("counter", { count: 0 }, counterActions.reducer);

      const state1 = store.getState();
      store.dispatch(counterActions.noop());
      const state2 = store.getState();

      // Immer returns same reference if nothing changed
      expect(state1).toBe(state2);
    });
  });

  describe("with domain reducer", () => {
    it("should work with domain actions", () => {
      type AppAction = { type: "RESET_ALL" };
      const app = domain<AppAction>("app");

      const counterActions = actions(
        withImmer({
          increment: (state: { count: number }) => {
            state.count += 1;
          },
        }),
        (state, action: AppAction) => {
          if (action.type === "RESET_ALL") return { count: 0 };
          return state;
        }
      );

      const store = app.store("counter", { count: 10 }, counterActions.reducer);

      store.dispatch(counterActions.increment());
      expect(store.getState().count).toBe(11);

      app.dispatch({ type: "RESET_ALL" });
      expect(store.getState().count).toBe(0);
    });
  });
});
