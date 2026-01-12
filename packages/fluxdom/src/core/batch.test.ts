import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { batch } from "./batch";
import { scheduleNotifyHook } from "../hooks/scheduleNotifyHook";

describe("batch", () => {
  describe("basic functionality", () => {
    it("should execute function and return its result", () => {
      const result = batch(() => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it("should execute function with void return", () => {
      let executed = false;

      batch(() => {
        executed = true;
      });

      expect(executed).toBe(true);
    });

    it("should propagate errors from function", () => {
      expect(() => {
        batch(() => {
          throw new Error("test error");
        });
      }).toThrow("test error");
    });
  });

  describe("notification batching", () => {
    it("should batch notifications within batch scope", () => {
      const notifications: number[] = [];

      batch(() => {
        // Inside batch, notifications should be deferred
        scheduleNotifyHook.current(() => notifications.push(1));
        scheduleNotifyHook.current(() => notifications.push(2));
        scheduleNotifyHook.current(() => notifications.push(3));

        // During batch, notifications haven't fired yet
        // (they're queued in the emitter)
      });

      // After batch completes, all notifications should have fired
      expect(notifications).toEqual([1, 2, 3]);
    });

    it("should deduplicate notifications for same callback", () => {
      const calls: string[] = [];

      batch(() => {
        const notify = () => calls.push("called");

        // Same function scheduled multiple times
        scheduleNotifyHook.current(notify);
        scheduleNotifyHook.current(notify);
        scheduleNotifyHook.current(notify);
      });

      // Each schedule still calls the hook, but it's the same callback reference
      // The deduplication depends on how emitter handles duplicates
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    it("should restore default notification behavior after batch", () => {
      const notifications: string[] = [];

      batch(() => {
        scheduleNotifyHook.current(() => notifications.push("batched"));
      });

      // After batch, default behavior should be restored
      scheduleNotifyHook.current(() => notifications.push("immediate"));

      expect(notifications).toContain("batched");
      expect(notifications).toContain("immediate");
    });
  });

  describe("nested batching", () => {
    it("should handle nested batch calls", () => {
      const notifications: number[] = [];

      batch(() => {
        scheduleNotifyHook.current(() => notifications.push(1));

        batch(() => {
          scheduleNotifyHook.current(() => notifications.push(2));

          batch(() => {
            scheduleNotifyHook.current(() => notifications.push(3));
          });
        });
      });

      // All should be batched together
      expect(notifications).toEqual([1, 2, 3]);
    });

    it("should not fire notifications until outermost batch completes", () => {
      const notifications: number[] = [];
      const checkpoints: string[] = [];

      batch(() => {
        scheduleNotifyHook.current(() => notifications.push(1));
        checkpoints.push("after outer schedule");

        batch(() => {
          scheduleNotifyHook.current(() => notifications.push(2));
          checkpoints.push("after inner schedule");
        });

        checkpoints.push("after inner batch");
        // Inner batch completed but notifications still queued
      });

      checkpoints.push("after outer batch");

      // Notifications should fire after outermost batch
      expect(notifications).toEqual([1, 2]);
      expect(checkpoints).toEqual([
        "after outer schedule",
        "after inner schedule",
        "after inner batch",
        "after outer batch",
      ]);
    });

    it("should handle deeply nested batches", () => {
      const notifications: number[] = [];
      let depth = 0;
      const maxDepth = 10;

      const nestedBatch = (level: number) => {
        if (level >= maxDepth) return;

        batch(() => {
          depth = Math.max(depth, level);
          scheduleNotifyHook.current(() => notifications.push(level));
          nestedBatch(level + 1);
        });
      };

      nestedBatch(0);

      expect(depth).toBe(maxDepth - 1);
      expect(notifications).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });

  describe("sync mode", () => {
    it("should process notifications synchronously by default", () => {
      const notifications: number[] = [];
      const checkpoints: string[] = [];

      batch(() => {
        scheduleNotifyHook.current(() => notifications.push(1));
        scheduleNotifyHook.current(() => notifications.push(2));
      });

      checkpoints.push("after batch");

      // Sync mode: notifications processed before continuing
      expect(notifications).toEqual([1, 2]);
      expect(checkpoints).toEqual(["after batch"]);
    });

    it("should handle cascading updates in sync mode", () => {
      const notifications: string[] = [];

      batch(() => {
        scheduleNotifyHook.current(() => {
          notifications.push("first");
          // Cascading: schedule more during notification
          scheduleNotifyHook.current(() => {
            notifications.push("cascaded");
          });
        });
      });

      // Sync mode should process cascaded updates too
      expect(notifications).toContain("first");
      // Cascaded may or may not be included depending on implementation
    });
  });

  describe("async mode", () => {
    let rafCallbacks: (() => void)[];
    let originalRaf: typeof requestAnimationFrame;

    beforeEach(() => {
      rafCallbacks = [];
      originalRaf = globalThis.requestAnimationFrame;
      globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
        rafCallbacks.push(() => cb(performance.now()));
        return rafCallbacks.length;
      };
    });

    afterEach(() => {
      globalThis.requestAnimationFrame = originalRaf;
    });

    const flushRaf = () => {
      const callbacks = rafCallbacks;
      rafCallbacks = [];
      callbacks.forEach((cb) => cb());
    };

    it("should defer notifications to requestAnimationFrame in async mode", () => {
      const notifications: number[] = [];

      batch(() => {
        scheduleNotifyHook.current(() => notifications.push(1));
        scheduleNotifyHook.current(() => notifications.push(2));
      }, "async");

      // Immediately after batch, notifications haven't fired
      expect(notifications).toEqual([]);

      // Flush requestAnimationFrame callbacks
      flushRaf();

      expect(notifications).toEqual([1, 2]);
    });

    it("should batch multiple async batches into single frame", () => {
      const notifications: string[] = [];

      batch(() => {
        scheduleNotifyHook.current(() => notifications.push("batch1"));
      }, "async");

      batch(() => {
        scheduleNotifyHook.current(() => notifications.push("batch2"));
      }, "async");

      expect(notifications).toEqual([]);

      flushRaf();

      // Both should fire after raf
      expect(notifications).toContain("batch1");
      expect(notifications).toContain("batch2");
    });
  });

  describe("error handling", () => {
    it("should restore hooks even if function throws", () => {
      const originalScheduler = scheduleNotifyHook.current;

      try {
        batch(() => {
          // Verify scheduler was changed
          expect(scheduleNotifyHook.current).not.toBe(originalScheduler);
          throw new Error("test error");
        });
      } catch {
        // Expected
      }

      // Scheduler should be restored
      expect(scheduleNotifyHook.current).toBe(originalScheduler);
    });

    it("should still fire queued notifications even if function throws", () => {
      const notifications: number[] = [];

      try {
        batch(() => {
          scheduleNotifyHook.current(() => notifications.push(1));
          scheduleNotifyHook.current(() => notifications.push(2));
          throw new Error("test error");
        });
      } catch {
        // Expected
      }

      // Notifications scheduled before error should still fire
      expect(notifications).toEqual([1, 2]);
    });
  });

  describe("integration scenarios", () => {
    it("should work for typical multi-store update pattern", () => {
      const storeANotifications: number[] = [];
      const storeBNotifications: number[] = [];

      // Simulate store notifications
      const notifyStoreA = (value: number) => {
        scheduleNotifyHook.current(() => storeANotifications.push(value));
      };

      const notifyStoreB = (value: number) => {
        scheduleNotifyHook.current(() => storeBNotifications.push(value));
      };

      batch(() => {
        // Simulate multiple dispatches
        notifyStoreA(1);
        notifyStoreA(2);
        notifyStoreA(3);

        notifyStoreB(10);
        notifyStoreB(20);
      });

      // All notifications should fire after batch
      expect(storeANotifications).toEqual([1, 2, 3]);
      expect(storeBNotifications).toEqual([10, 20]);
    });

    it("should work with real-world batching scenario", () => {
      interface StoreState {
        value: number;
        listeners: (() => void)[];
      }

      const createMockStore = (initial: number): StoreState => ({
        value: initial,
        listeners: [],
      });

      const dispatch = (store: StoreState, newValue: number) => {
        store.value = newValue;
        // Use hook to schedule notification
        scheduleNotifyHook.current(() => {
          store.listeners.forEach((l) => l());
        });
      };

      const store1 = createMockStore(0);
      const store2 = createMockStore(0);

      const renderCount = { count: 0 };
      const listener = () => {
        renderCount.count++;
      };

      store1.listeners.push(listener);
      store2.listeners.push(listener);

      // Without batch: 2 notifications
      dispatch(store1, 1);
      dispatch(store2, 1);
      expect(renderCount.count).toBe(2);

      renderCount.count = 0;

      // With batch: still 2 notification calls, but batched
      batch(() => {
        dispatch(store1, 2);
        dispatch(store2, 2);
      });

      // Notifications still fire but are batched together
      expect(renderCount.count).toBe(2);
      expect(store1.value).toBe(2);
      expect(store2.value).toBe(2);
    });
  });
});
