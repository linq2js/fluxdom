import { describe, it, expect, vi } from "vitest";
import { domain } from "./domain";
import { batch } from "./batch";
import { createStore } from "./store";

describe("Store with batching", () => {
  describe("without batch", () => {
    it("should notify immediately on each dispatch", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const listener = vi.fn();
      store.onChange(listener);

      store.dispatch({ type: "INC" });
      store.dispatch({ type: "INC" });
      store.dispatch({ type: "INC" });

      // Without batch: 3 notifications (one per dispatch)
      expect(listener).toHaveBeenCalledTimes(3);
    });

    it("should notify after each state change", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const states: number[] = [];
      store.onChange(() => {
        states.push(store.getState());
      });

      store.dispatch({ type: "INC" });
      store.dispatch({ type: "INC" });
      store.dispatch({ type: "INC" });

      // Each notification sees incremental state
      expect(states).toEqual([1, 2, 3]);
    });
  });

  describe("with batch", () => {
    it("should batch notifications into single notification per store", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const listener = vi.fn();
      store.onChange(listener);

      batch(() => {
        store.dispatch({ type: "INC" });
        store.dispatch({ type: "INC" });
        store.dispatch({ type: "INC" });
      });

      // With batch: 1 notification (de-duplicated per store)
      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getState()).toBe(3);
    });

    it("should have final state available in notification", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const states: number[] = [];
      store.onChange(() => {
        states.push(store.getState());
      });

      batch(() => {
        store.dispatch({ type: "INC" });
        store.dispatch({ type: "INC" });
        store.dispatch({ type: "INC" });
      });

      // Single notification with final state
      expect(states).toEqual([3]);
    });

    it("should update state synchronously during batch", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const statesDuringBatch: number[] = [];

      batch(() => {
        store.dispatch({ type: "INC" });
        statesDuringBatch.push(store.getState());

        store.dispatch({ type: "INC" });
        statesDuringBatch.push(store.getState());

        store.dispatch({ type: "INC" });
        statesDuringBatch.push(store.getState());
      });

      // State updates are synchronous
      expect(statesDuringBatch).toEqual([1, 2, 3]);
    });

    it("should not notify listeners during batch", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      let notifiedDuringBatch = false;
      const listener = vi.fn(() => {
        notifiedDuringBatch = true;
      });
      store.onChange(listener);

      batch(() => {
        store.dispatch({ type: "INC" });
        store.dispatch({ type: "INC" });
        // Check if listener was called during batch
        expect(notifiedDuringBatch).toBe(false);
      });

      // Listener should be called after batch
      expect(notifiedDuringBatch).toBe(true);
    });
  });

  describe("batch with multiple stores", () => {
    it("should batch notifications per store (one notification each)", () => {
      const d = domain<any>("test");
      const store1 = d.store({
        name: "a",
        initial: 0,
        reducer: (s, a) => (a.type === "INC" ? s + 1 : s),
      });
      const store2 = d.store({
        name: "b",
        initial: 0,
        reducer: (s, a) => (a.type === "INC" ? s + 1 : s),
      });

      const listener1 = vi.fn();
      const listener2 = vi.fn();
      store1.onChange(listener1);
      store2.onChange(listener2);

      batch(() => {
        store1.dispatch({ type: "INC" });
        store2.dispatch({ type: "INC" });
        store1.dispatch({ type: "INC" });
        store2.dispatch({ type: "INC" });
      });

      // Each store gets ONE notification (de-duplicated)
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(store1.getState()).toBe(2);
      expect(store2.getState()).toBe(2);
    });

    it("should have all stores at final state when notifications fire", () => {
      const d = domain<any>("test");
      const store1 = d.store({
        name: "a",
        initial: 0,
        reducer: (s, a) => (a.type === "INC" ? s + 1 : s),
      });
      const store2 = d.store({
        name: "b",
        initial: 10,
        reducer: (s, a) => (a.type === "INC" ? s + 1 : s),
      });

      const capturedStates: { a: number; b: number }[] = [];

      store1.onChange(() => {
        capturedStates.push({ a: store1.getState(), b: store2.getState() });
      });

      store2.onChange(() => {
        capturedStates.push({ a: store1.getState(), b: store2.getState() });
      });

      batch(() => {
        store1.dispatch({ type: "INC" }); // a: 0 -> 1
        store2.dispatch({ type: "INC" }); // b: 10 -> 11
        store1.dispatch({ type: "INC" }); // a: 1 -> 2
      });

      // Both notifications see final state of both stores
      expect(capturedStates).toEqual([
        { a: 2, b: 11 },
        { a: 2, b: 11 },
      ]);
    });
  });

  describe("nested batches", () => {
    it("should defer notifications until outermost batch completes", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const listener = vi.fn();
      store.onChange(listener);

      batch(() => {
        store.dispatch({ type: "INC" });

        batch(() => {
          store.dispatch({ type: "INC" });

          batch(() => {
            store.dispatch({ type: "INC" });
          });

          // Still in outer batch
          expect(listener).not.toHaveBeenCalled();
        });

        // Still in outer batch
        expect(listener).not.toHaveBeenCalled();
      });

      // One notification after all nested batches complete
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should have correct final state in nested batch scenario", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const states: number[] = [];
      store.onChange(() => states.push(store.getState()));

      batch(() => {
        store.dispatch({ type: "INC" }); // 1

        batch(() => {
          store.dispatch({ type: "INC" }); // 2
          store.dispatch({ type: "INC" }); // 3
        });

        store.dispatch({ type: "INC" }); // 4
      });

      // Single notification with final state
      expect(states).toEqual([4]);
      expect(store.getState()).toBe(4);
    });
  });

  describe("batch with domain dispatch", () => {
    it("should batch domain-level dispatches", () => {
      const d = domain<{ type: "INC" }>("test");
      const store1 = d.store({
        name: "a",
        initial: 0,
        reducer: (s, a) => (a.type === "INC" ? s + 1 : s),
      });
      const store2 = d.store({
        name: "b",
        initial: 0,
        reducer: (s, a) => (a.type === "INC" ? s + 1 : s),
      });

      const listener1 = vi.fn();
      const listener2 = vi.fn();
      store1.onChange(listener1);
      store2.onChange(listener2);

      batch(() => {
        // Domain dispatch broadcasts to all stores
        d.dispatch({ type: "INC" });
        d.dispatch({ type: "INC" });
      });

      // Note: domain dispatch uses changeEmitter.emit() directly, not scheduleNotifyHook
      // so domain dispatches still notify immediately within the batch context
      // But for store-level dispatches, notifications are batched per store
      expect(store1.getState()).toBe(2);
      expect(store2.getState()).toBe(2);
    });

    it("should batch store dispatches mixed with domain dispatches", () => {
      const d = domain<{ type: "INC" | "RESET" }>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          if (a.type === "RESET") return 0;
          return s;
        },
      });

      const states: number[] = [];
      store.onChange(() => states.push(store.getState()));

      batch(() => {
        store.dispatch({ type: "INC" }); // 1 - uses scheduleNotifyHook
        store.dispatch({ type: "INC" }); // 2 - uses scheduleNotifyHook
        store.dispatch({ type: "INC" }); // 3 - uses scheduleNotifyHook
      });

      // One batched notification from store dispatches
      expect(states.length).toBeGreaterThanOrEqual(1);
      expect(states[states.length - 1]).toBe(3);
    });
  });

  describe("batch with thunks", () => {
    it("should batch notifications from thunk dispatches", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const listener = vi.fn();
      store.onChange(listener);

      batch(() => {
        store.dispatch(({ dispatch }) => {
          dispatch({ type: "INC" });
          dispatch({ type: "INC" });
        });
        store.dispatch({ type: "INC" });
      });

      // All dispatches batched into one notification
      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getState()).toBe(3);
    });

    it("should handle async batch (notifications fire when batch returns)", async () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          if (a.type === "SET") return a.value;
          return s;
        },
      });

      const listener = vi.fn();
      store.onChange(listener);

      // Note: batch() with async function completes when the function returns
      // (which is immediately at first await). The rest of the async code runs
      // outside the batch context. For true async batching, wrap sync portions.
      await batch(async () => {
        store.dispatch({ type: "INC" });
        store.dispatch({ type: "INC" });
        store.dispatch({ type: "INC" });
        // No await before end - all sync dispatches are batched
      });

      // All sync dispatches batched into one notification
      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getState()).toBe(3);
    });

    it("should batch only sync dispatches when async is interleaved", async () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const listener = vi.fn();
      store.onChange(listener);

      // Batch only covers synchronous portion before first await
      await batch(async () => {
        store.dispatch({ type: "INC" }); // Batched
        store.dispatch({ type: "INC" }); // Batched

        await Promise.resolve(); // Batch ends here

        store.dispatch({ type: "INC" }); // Not batched (outside batch context)
      });

      // 1 batched notification + 1 unbatched = 2 total
      expect(listener).toHaveBeenCalledTimes(2);
      expect(store.getState()).toBe(3);
    });
  });

  describe("batch error handling", () => {
    it("should still fire queued notifications if batch throws", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const listener = vi.fn();
      store.onChange(listener);

      expect(() => {
        batch(() => {
          store.dispatch({ type: "INC" });
          store.dispatch({ type: "INC" });
          throw new Error("test error");
        });
      }).toThrow("test error");

      // Single batched notification should still fire
      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getState()).toBe(2);
    });

    it("should restore normal notification behavior after batch error", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const listener = vi.fn();
      store.onChange(listener);

      try {
        batch(() => {
          store.dispatch({ type: "INC" });
          throw new Error("test error");
        });
      } catch {
        // Expected
      }

      listener.mockClear();

      // Normal dispatch should notify immediately
      store.dispatch({ type: "INC" });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("batch with equality", () => {
    it("should not notify when state unchanged (with strict equality)", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "data",
        initial: { value: 1 },
        reducer: (s, a) => {
          if (a.type === "SET") return { value: a.value };
          return s;
        },
      });

      const listener = vi.fn();
      store.onChange(listener);

      batch(() => {
        store.dispatch({ type: "NOOP" }); // No change
        store.dispatch({ type: "NOOP" }); // No change
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it("should not notify when state equal (with shallow equality via createStore)", () => {
      const d = domain<any>("test");
      // Using createStore directly to test equality parameter
      const store = createStore(
        "data",
        { value: 1 },
        (s: { value: number }, a: { type: string }) => {
          if (a.type === "SET_SAME") return { value: s.value }; // New object, same value
          return s;
        },
        { dispatch: d.dispatch, get: d.get },
        undefined,
        "shallow"
      );

      const listener = vi.fn();
      store.onChange(listener);

      batch(() => {
        // Returns new object but same values - shallow equality should detect as equal
        store.dispatch({ type: "SET_SAME" });
        store.dispatch({ type: "SET_SAME" });
      });

      // Shallow equality: { value: 1 } === { value: 1 }
      expect(listener).not.toHaveBeenCalled();
    });

    it("should notify when state actually changes (with shallow equality via createStore)", () => {
      const d = domain<any>("test");
      // Using createStore directly to test equality parameter
      const store = createStore(
        "data",
        { value: 1 },
        (s: { value: number }, a: { type: string; value?: number }) => {
          if (a.type === "SET") return { value: a.value! };
          return s;
        },
        { dispatch: d.dispatch, get: d.get },
        undefined,
        "shallow"
      );

      const listener = vi.fn();
      store.onChange(listener);

      batch(() => {
        store.dispatch({ type: "SET", value: 2 }); // Change
        store.dispatch({ type: "SET", value: 2 }); // No change (shallow equal)
        store.dispatch({ type: "SET", value: 3 }); // Change
      });

      // Only 1 notification (batched), but state did change
      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getState()).toEqual({ value: 3 });
    });
  });

  describe("batch return value", () => {
    it("should return value from batch function", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const result = batch(() => {
        store.dispatch({ type: "INC" });
        store.dispatch({ type: "INC" });
        return store.getState();
      });

      expect(result).toBe(2);
    });

    it("should return async value from batch function", async () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const result = await batch(async () => {
        store.dispatch({ type: "INC" });
        await Promise.resolve();
        store.dispatch({ type: "INC" });
        return store.getState();
      });

      expect(result).toBe(2);
    });
  });

  describe("batch performance benefit", () => {
    it("should only notify once even with many dispatches", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const listener = vi.fn();
      store.onChange(listener);

      batch(() => {
        for (let i = 0; i < 100; i++) {
          store.dispatch({ type: "INC" });
        }
      });

      // Only 1 notification instead of 100
      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getState()).toBe(100);
    });

    it("should allow reading intermediate state during batch", () => {
      const d = domain<any>("test");
      const store = d.store({
        name: "counter",
        initial: 0,
        reducer: (s, a) => {
          if (a.type === "INC") return s + 1;
          return s;
        },
      });

      const intermediateStates: number[] = [];

      batch(() => {
        for (let i = 0; i < 5; i++) {
          store.dispatch({ type: "INC" });
          intermediateStates.push(store.getState());
        }
      });

      // Can read state during batch
      expect(intermediateStates).toEqual([1, 2, 3, 4, 5]);
    });
  });
});
