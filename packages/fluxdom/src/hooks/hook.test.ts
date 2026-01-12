import { describe, it, expect, vi } from "vitest";
import { hook, Hook, HookSetup } from "./hook";

describe("hook", () => {
  describe("createHook", () => {
    it("should create a hook with initial value", () => {
      const h = hook(42);
      expect(h.current).toBe(42);
    });

    it("should create a hook with undefined when no initial value", () => {
      const h = hook<string>();
      expect(h.current).toBeUndefined();
    });

    it("should create a hook with object initial value", () => {
      const obj = { name: "test" };
      const h = hook(obj);
      expect(h.current).toBe(obj);
    });

    it("should create a hook with function initial value", () => {
      const fn = () => 42;
      const h = hook(fn);
      expect(h.current).toBe(fn);
    });
  });

  describe("hook.override", () => {
    it("should override current value directly", () => {
      const h = hook(0);
      expect(h.current).toBe(0);

      h.override(100);
      expect(h.current).toBe(100);
    });

    it("should allow overriding to undefined", () => {
      const h = hook<number | undefined>(42);
      h.override(undefined);
      expect(h.current).toBeUndefined();
    });
  });

  describe("hook setup/release pattern", () => {
    it("should return a setup function when called with value", () => {
      const h = hook(0);
      const setup = h(5);
      expect(typeof setup).toBe("function");
    });

    it("should change value when setup is called", () => {
      const h = hook(0);
      const setup = h(5);

      expect(h.current).toBe(0);

      const release = setup();
      expect(h.current).toBe(5);

      release();
      expect(h.current).toBe(0);
    });

    it("should restore previous value on release", () => {
      const h = hook("initial");
      const setup = h("temporary");

      const release = setup();
      expect(h.current).toBe("temporary");

      release();
      expect(h.current).toBe("initial");
    });

    it("should handle nested setup/release correctly", () => {
      const h = hook(0);

      const release1 = h(1)();
      expect(h.current).toBe(1);

      const release2 = h(2)();
      expect(h.current).toBe(2);

      const release3 = h(3)();
      expect(h.current).toBe(3);

      // Release in reverse order
      release3();
      expect(h.current).toBe(2);

      release2();
      expect(h.current).toBe(1);

      release1();
      expect(h.current).toBe(0);
    });

    it("should handle out-of-order release (restore to value at setup time)", () => {
      const h = hook(0);

      const release1 = h(1)();
      const release2 = h(2)();

      expect(h.current).toBe(2);

      // Release first one (out of order)
      release1();
      expect(h.current).toBe(0); // Restores to what it was when setup1 was called

      release2();
      expect(h.current).toBe(1); // Restores to what it was when setup2 was called
    });
  });

  describe("hook.use", () => {
    it("should temporarily set hook value during function execution", () => {
      const h = hook(0);

      expect(h.current).toBe(0);

      hook.use([h(42)], () => {
        expect(h.current).toBe(42);
      });

      expect(h.current).toBe(0);
    });

    it("should return value from function", () => {
      const h = hook(0);

      const result = hook.use([h(10)], () => {
        return h.current * 2;
      });

      expect(result).toBe(20);
    });

    it("should handle multiple hooks", () => {
      const h1 = hook("a");
      const h2 = hook(1);
      const h3 = hook(true);

      hook.use([h1("b"), h2(2), h3(false)], () => {
        expect(h1.current).toBe("b");
        expect(h2.current).toBe(2);
        expect(h3.current).toBe(false);
      });

      expect(h1.current).toBe("a");
      expect(h2.current).toBe(1);
      expect(h3.current).toBe(true);
    });

    it("should handle nested hook.use calls", () => {
      const h = hook(0);

      hook.use([h(1)], () => {
        expect(h.current).toBe(1);

        hook.use([h(2)], () => {
          expect(h.current).toBe(2);

          hook.use([h(3)], () => {
            expect(h.current).toBe(3);
          });

          expect(h.current).toBe(2);
        });

        expect(h.current).toBe(1);
      });

      expect(h.current).toBe(0);
    });

    it("should restore hooks even if function throws", () => {
      const h = hook(0);

      expect(() => {
        hook.use([h(42)], () => {
          expect(h.current).toBe(42);
          throw new Error("test error");
        });
      }).toThrow("test error");

      expect(h.current).toBe(0);
    });

    it("should restore all hooks even if function throws", () => {
      const h1 = hook("a");
      const h2 = hook(1);

      expect(() => {
        hook.use([h1("b"), h2(2)], () => {
          throw new Error("test error");
        });
      }).toThrow();

      expect(h1.current).toBe("a");
      expect(h2.current).toBe(1);
    });

    it("should work with empty setups array", () => {
      const result = hook.use([], () => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it("should release hooks in reverse order", () => {
      const order: string[] = [];

      const h1 = hook(0);
      const h2 = hook(0);

      // Create custom setups that track release order
      const setup1: HookSetup = () => {
        order.push("setup1");
        return () => order.push("release1");
      };

      const setup2: HookSetup = () => {
        order.push("setup2");
        return () => order.push("release2");
      };

      hook.use([setup1, setup2], () => {
        order.push("fn");
      });

      expect(order).toEqual(["setup1", "setup2", "fn", "release2", "release1"]);
    });
  });

  describe("hook with function values", () => {
    it("should store and retrieve function values", () => {
      const defaultFn = () => "default";
      const h = hook(defaultFn);

      expect(h.current()).toBe("default");

      const newFn = () => "new";
      hook.use([h(newFn)], () => {
        expect(h.current()).toBe("new");
      });

      expect(h.current()).toBe("default");
    });

    it("should work as notification scheduler hook", () => {
      const notifications: string[] = [];

      type NotifyFn = (fn: () => void) => void;
      const scheduleHook = hook<NotifyFn>((fn) => fn()); // default: immediate

      // Default behavior: immediate
      scheduleHook.current(() => notifications.push("immediate"));
      expect(notifications).toEqual(["immediate"]);

      // Override to batch
      const batched: (() => void)[] = [];
      const batchNotify: NotifyFn = (fn) => batched.push(fn);

      hook.use([scheduleHook(batchNotify)], () => {
        scheduleHook.current(() => notifications.push("batched1"));
        scheduleHook.current(() => notifications.push("batched2"));

        // Not called yet
        expect(notifications).toEqual(["immediate"]);
      });

      // Flush batched
      batched.forEach((fn) => fn());
      expect(notifications).toEqual(["immediate", "batched1", "batched2"]);
    });
  });
});
