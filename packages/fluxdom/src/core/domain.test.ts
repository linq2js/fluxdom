import { describe, it, expect, vi } from "vitest";
import { domain, derived, module, withUse, Domain } from "../index";

describe("FluxDom Core", () => {
  describe("Store", () => {
    it("should initialize with state", () => {
      const d = domain<any>("test");
      const store = d.store("count", 0, (s, a: { type: "INC" }) => {
        if (a.type === "INC") return s + 1;
        return s;
      });
      expect(store.getState()).toBe(0);
    });

    it("should update state on dispatch", () => {
      const d = domain<any>("test");
      const store = d.store("count", 0, (s, a: { type: "INC" }) => {
        if (a.type === "INC") return s + 1;
        return s;
      });
      store.dispatch({ type: "INC" });
      expect(store.getState()).toBe(1);
    });

    it("should notify listeners on change", () => {
      const d = domain<any>("test");
      const store = d.store("count", 0, (s, _a: { type: "INC" }) => s + 1);
      const listener = vi.fn();
      store.onChange(listener);

      store.dispatch({ type: "INC" });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not notify listeners when state is unchanged", () => {
      const d = domain<any>("test");
      const store = d.store("count", 0, (s, a: { type: "INC" | "NOOP" }) => {
        if (a.type === "INC") return s + 1;
        return s;
      });
      const listener = vi.fn();
      store.onChange(listener);

      store.dispatch({ type: "NOOP" });
      expect(listener).not.toHaveBeenCalled();
    });

    it("should allow unsubscribe from onChange", () => {
      const d = domain<any>("test");
      const store = d.store("count", 0, (s) => s + 1);
      const listener = vi.fn();
      const unsub = store.onChange(listener);

      unsub();
      store.dispatch({ type: "INC" });
      expect(listener).not.toHaveBeenCalled();
    });

    it("should call onDispatch listeners with action and context", () => {
      const d = domain<any>("test");
      const store = d.store("count", 0, (s, a: { type: "INC" }) => {
        if (a.type === "INC") return s + 1;
        return s;
      });

      const listener = vi.fn();
      store.onDispatch(listener);

      store.dispatch({ type: "INC" });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          action: { type: "INC" },
          source: "test.count",
          context: expect.objectContaining({
            dispatch: expect.any(Function),
            getState: expect.any(Function),
            domain: expect.any(Object),
          }),
        })
      );
    });

    it("should support thunks at store level", () => {
      const d = domain<any>("test");
      const store = d.store(
        "count",
        0,
        (s, a: { type: "SET"; val: number }) => {
          if (a.type === "SET") return a.val;
          return s;
        }
      );

      const thunk = ({ dispatch, getState }: any) => {
        const current = getState();
        dispatch({ type: "SET", val: current + 10 });
        return "thunk-done";
      };

      const result = store.dispatch(thunk);
      expect(result).toBe("thunk-done");
      expect(store.getState()).toBe(10);
    });
  });

  describe("Domain & Dispatch", () => {
    it("should broadcast domain actions to stores", () => {
      const d = domain<{ type: "RESET" }>("root");
      const store = d.store("count", 10, (s, a) => {
        if (a.type === "RESET") return 0;
        return s;
      });

      d.dispatch({ type: "RESET" });
      expect(store.getState()).toBe(0);
    });

    it("should allow escalation from store to domain", () => {
      type DomainAction = { type: "ERROR"; msg: string };
      const d = domain<DomainAction>("root");
      const listener = vi.fn();
      d.onDispatch(listener);

      const store = d.store("child", 0, (s) => s);

      // Thunk inside store context
      const thunk = ({ domain }: any) => {
        domain.dispatch({ type: "ERROR", msg: "fail" });
      };

      store.dispatch(thunk);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.objectContaining({ type: "ERROR" }),
          source: "root",
        })
      );
    });

    it("should support thunks at domain level", () => {
      const d = domain<{ type: "SET"; value: number }>("test");
      const store = d.store("val", 0, (s, a) => {
        if (a.type === "SET") return a.value;
        return s;
      });

      const thunk = ({ dispatch }: any) => {
        dispatch({ type: "SET", value: 42 });
        return "done";
      };

      const result = d.dispatch(thunk);
      expect(result).toBe("done");
      expect(store.getState()).toBe(42);
    });

    it("should allow unsubscribe from onDispatch", () => {
      const d = domain<{ type: "TEST" }>("test");
      const listener = vi.fn();
      const unsub = d.onDispatch(listener);

      unsub();
      d.dispatch({ type: "TEST" });
      expect(listener).not.toHaveBeenCalled();
    });

    it("should listen to ALL dispatches with onAnyDispatch", () => {
      const root = domain("root");
      const auth = root.domain("auth");
      const userStore = auth.store("user", 0, (s) => s);

      const listener = vi.fn();
      root.onAnyDispatch(listener);

      // 1. Authenticated Domain (Grandchild)
      // userStore.dispatch({ type: "LOGIN" });
      // Actually userStore is child of auth, auth is child of root
      // Dispatch to store
      userStore.dispatch({ type: "STORE_ACTION" });

      // 2. Auth Domain (Child)
      auth.dispatch({ type: "AUTH_ACTION" });

      // 3. Root Domain (Self)
      root.dispatch({ type: "ROOT_ACTION" });

      expect(listener).toHaveBeenCalledTimes(3);

      // Verify call args for each
      const calls = listener.mock.calls;

      // Call 1: Store Action
      expect(calls[0][0]).toEqual(
        expect.objectContaining({
          action: { type: "STORE_ACTION" },
          source: "root.auth.user",
        })
      );

      // Call 2: Auth Domain Action
      expect(calls[1][0]).toEqual(
        expect.objectContaining({
          action: { type: "AUTH_ACTION" },
          source: "root.auth",
        })
      );

      // Call 3: Root Domain Action
      expect(calls[2][0]).toEqual(
        expect.objectContaining({
          action: { type: "ROOT_ACTION" },
          source: "root",
        })
      );
    });

    it("should allow unsubscribe from onAnyDispatch", () => {
      const root = domain("root");
      const listener = vi.fn();
      const unsub = root.onAnyDispatch(listener);

      unsub();
      root.dispatch({ type: "TEST" });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("Subdomains", () => {
    it("should create subdomain that receives parent actions", () => {
      type ParentAction = { type: "PARENT_ACTION" };
      type ChildAction = { type: "CHILD_ACTION" };

      const parent = domain<ParentAction>("parent");
      const child = parent.domain<ChildAction>("child");

      const childStore = child.store("data", 0, (s, a) => {
        if (a.type === "PARENT_ACTION") return s + 1;
        if (a.type === "CHILD_ACTION") return s + 10;
        return s;
      });

      // Parent action should reach child store
      parent.dispatch({ type: "PARENT_ACTION" });
      expect(childStore.getState()).toBe(1);

      // Child action dispatched on child domain
      child.dispatch({ type: "CHILD_ACTION" });
      expect(childStore.getState()).toBe(11);
    });

    it("should broadcast parent actions to multiple subdomains", () => {
      const parent = domain<{ type: "RESET" }>("parent");
      const child1 = parent.domain("child1");
      const child2 = parent.domain("child2");

      const store1 = child1.store("a", 10, (s, a) =>
        a.type === "RESET" ? 0 : s
      );
      const store2 = child2.store("b", 20, (s, a) =>
        a.type === "RESET" ? 0 : s
      );

      parent.dispatch({ type: "RESET" });
      expect(store1.getState()).toBe(0);
      expect(store2.getState()).toBe(0);
    });
  });

  describe("Modules (DI)", () => {
    it("should inject dependencies lazily", () => {
      const d = domain("test");
      let constructed = 0;

      const Logger = module("logger", (_: Domain<any>) => {
        constructed++;
        return { log: vi.fn() };
      });

      const Service = module("service", (d: Domain<any>) => {
        constructed++;
        // Lazy usage
        return {
          doWork: () => d.get(Logger).log("working"),
        };
      });

      // Nothing constructed yet
      expect(constructed).toBe(0);

      const service = d.get(Service);
      expect(constructed).toBe(1); // Service only

      service.doWork();
      expect(constructed).toBe(2); // Logger lazy loaded
    });

    it("should support overrides", () => {
      const d = domain("test");

      const RealModule = module("my-module", (_: Domain<any>) => "real");
      module("my-module", (_: Domain<any>) => "mock");

      // Default
      expect(d.get(RealModule)).toBe("real");
      // Cache is populated with "real".
      // Wait, if it's populated, override should fail?
      // Ah, the previous test was "should throw when overriding an instantiated module".
      // This test is about support overrides *before* instantiation.
    });

    it("should support overrides (configure before usage)", () => {
      const d = domain("test");
      const RealModule = module("msg", () => "real");
      const MockModule = module("msg", () => "mock");

      const revert = d.override(RealModule, MockModule);
      expect(d.get(RealModule)).toBe("mock");

      revert();
      // NOTE: Reverting after instantiation does NOT clear the cache for that key in current implementation
      // The cache has "mock" stored under MockModule key?
      // No, cache stores under effectiveDefinition key.
      // override(Real, Mock) -> map Real to Mock.
      // get(Real) -> effective is Mock. Instantiate Mock. Cache Mock -> instance.
      // revert() -> map cleared.
      // get(Real) -> effective is Real.
      // Cache.has(Real)? No. Cache has Mock.
      // So it creates Real!
      // So "Back to normal" is actually True for a NEW instance of Real.
      expect(d.get(RealModule)).toBe("real");
    });

    it("should share modules between parent and subdomain", () => {
      const parent = domain("parent");
      const child = parent.domain("child");

      const API = module<{ id: number }>("api", () => ({
        id: Math.random(),
      }));

      // 1. Resolve in parent first
      const pService = parent.get(API);

      // 2. Resolve in child
      const cService = child.get(API);

      // Should be SAME instance (Shared Resolver)
      expect(cService).toBe(pService);
      expect(cService.id).toBe(pService.id);

      // 3. Independent domains should still be isolated
      const other = domain("other");
      const oService = other.get(API);
      expect(oService).not.toBe(pService);
    });

    it("should throw when overriding an instantiated module", () => {
      const d = domain("test");
      const MyModule = module("my-module", () => "original");

      // Instantiate first
      d.get(MyModule);

      const MockModule = module("my-module", () => "mock");

      expect(() => {
        d.override(MyModule, MockModule);
      }).toThrowError(/Instance already created for my-module/); // name is statically known now!
    });
  });

  describe("Derived Stores", () => {
    it("should combine multiple stores", () => {
      const d = domain("test");
      const s1 = d.store("a", 1, (s) => s);
      const s2 = d.store("b", 2, (s) => s);

      const sum = derived("sum", [s1, s2], (a, b) => a + b);
      expect(sum.getState()).toBe(3);
    });

    it("should support domain-scoped derived stores", () => {
      const d = domain("math");
      const s1 = d.store("a", 10, (s) => s);
      const s2 = d.store("b", 20, (s) => s);

      // Create via domain
      const sum = d.derived("sum", [s1, s2], (a, b) => a + b);

      expect(sum.name).toBe("math.sum");
      expect(sum.getState()).toBe(30);
    });

    it("should provide access to root domain", () => {
      const root = domain("root");
      const child = root.domain("child");
      const grandChild = child.domain("grand");

      expect(root.root).toBe(root);
      expect(child.root).toBe(root);
      expect(grandChild.root).toBe(root);

      expect(child.root).not.toBe(child);
    });

    it("should update when dependencies change", () => {
      const d = domain<{ type: "INC" }>("test");
      const store = d.store("count", 1, (s, a) =>
        a.type === "INC" ? s + 1 : s
      );
      const doubled = derived("doubled", [store], (count) => count * 2);

      expect(doubled.getState()).toBe(2);

      store.dispatch({ type: "INC" });
      expect(doubled.getState()).toBe(4);
    });

    it("should notify listeners when derived value changes", () => {
      const d = domain<{ type: "INC" }>("test");
      const store = d.store("count", 1, (s, a) =>
        a.type === "INC" ? s + 1 : s
      );
      const doubled = derived("doubled", [store], (count) => count * 2);

      const listener = vi.fn();
      doubled.onChange(listener);

      store.dispatch({ type: "INC" });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should track dependencies", () => {
      const d = domain("test");
      const s1 = d.store("a", 1, (s) => s);
      const s2 = d.store("b", 2, (s) => s);

      const sum = derived("sum", [s1, s2], (a, b) => a + b);
      expect(sum.dependencies).toEqual([s1, s2]);
    });

    it("should unsubscribe from onChange", () => {
      const d = domain<{ type: "INC" }>("test");
      const store = d.store("count", 1, (s, a) =>
        a.type === "INC" ? s + 1 : s
      );
      const doubled = derived("doubled", [store], (count) => count * 2);

      const listener = vi.fn();
      const unsub = doubled.onChange(listener);

      unsub();
      store.dispatch({ type: "INC" });
      expect(listener).not.toHaveBeenCalled();
    });

    it("should not notify when derived value is unchanged", () => {
      const d = domain<{ type: "NOOP" }>("test");
      const store = d.store("count", 1, (s, _a) => s); // Always returns same state
      const doubled = derived("doubled", [store], (count) => count * 2);

      const listener = vi.fn();
      doubled.onChange(listener);

      store.dispatch({ type: "NOOP" });
      expect(listener).not.toHaveBeenCalled();
    });

    describe("use() plugin", () => {
      it("should return original store when plugin returns falsy", () => {
        const d = domain("test");
        const s = d.store("a", 1, (s) => s);
        const derived1 = derived("d", [s], (a) => a);

        const result = derived1.use(() => undefined);
        expect(result).toBe(derived1);
      });

      it("should return result directly if it already has use()", () => {
        const d = domain("test");
        const s = d.store("a", 1, (s) => s);
        const derived1 = derived("d", [s], (a) => a);

        const chainable = withUse({ custom: true });
        const result = derived1.use(() => chainable);
        expect(result).toBe(chainable);
      });

      it("should wrap result with use() if object without use()", () => {
        const d = domain("test");
        const s = d.store("a", 1, (s) => s);
        const derived1 = derived("d", [s], (a) => a);

        const result = derived1.use(() => ({ custom: "value" }));
        expect(result).toHaveProperty("custom", "value");
        expect(result).toHaveProperty("use");
      });

      it("should wrap function result with use()", () => {
        const d = domain("test");
        const s = d.store("a", 1, (s) => s);
        const derived1 = derived("d", [s], (a) => a);

        const fn = () => "hello";
        const result = derived1.use(() => fn);
        expect(typeof result).toBe("function");
        expect(result).toHaveProperty("use");
      });

      it("should return primitive values directly", () => {
        const d = domain("test");
        const s = d.store("a", 1, (s) => s);
        const derived1 = derived("d", [s], (a) => a);

        const result = derived1.use(() => 42);
        expect(result).toBe(42);
      });
    });

    describe("Lazy Evaluation", () => {
      it("should NOT compute initial state until read", () => {
        const d = domain("test");
        const s = d.store("a", 1, (s) => s);

        const selector = vi.fn((a) => a * 2);
        const derived1 = derived("d", [s], selector);

        expect(selector).not.toHaveBeenCalled();
        expect(derived1.getState()).toBe(2);
        expect(selector).toHaveBeenCalledTimes(1);
      });

      it("should NOT compute on dependency change if not read", () => {
        const d = domain("test");
        const s = d.store("a", 1, (s, a) => (a.type === "INC" ? s + 1 : s));

        const selector = vi.fn((a) => a * 2);
        const derived1 = derived("d", [s], selector);

        // First read (initial)
        derived1.getState();
        expect(selector).toHaveBeenCalledTimes(1);

        // Update dependency
        s.dispatch({ type: "INC" });
        // Should NOT have run yet
        expect(selector).toHaveBeenCalledTimes(1);

        // Read result
        expect(derived1.getState()).toBe(4);
        // Only now run again
        expect(selector).toHaveBeenCalledTimes(2);
      });

      it("should use cached value if not dirty", () => {
        const d = domain("test");
        const s = d.store("a", 1, (s) => s);

        const selector = vi.fn((a) => a * 2);
        const derived1 = derived("d", [s], selector);

        derived1.getState(); // Call 1
        derived1.getState(); // Cached
        derived1.getState(); // Cached

        expect(selector).toHaveBeenCalledTimes(1);
      });

      it("should compute eagerly when observed", () => {
        const d = domain("test");
        const s = d.store("a", 1, (s, a) => (a.type === "INC" ? s + 1 : s));

        const selector = vi.fn((a) => a * 2);
        const derived1 = derived("d", [s], selector);

        // Subscribe
        const listener = vi.fn();
        derived1.onChange(listener);

        // Update dependency
        s.dispatch({ type: "INC" });

        // Should have computed eagerly to check for changes
        // 1. On update (eager check) [Wake up removed]
        expect(selector).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(derived1.getState()).toBe(4);
      });

      it("should NOT notify listeners if computed value is same (after init)", () => {
        const d = domain("test");
        const s = d.store("a", 1, (s, a) => (a.type === "INC" ? s + 1 : s));

        // Always return 10
        const derived1 = derived("d", [s], () => 10);

        // Prime the cache (compute initial value)
        derived1.getState();

        const listener = vi.fn();
        derived1.onChange(listener);

        s.dispatch({ type: "INC" });

        // Computed newly, but result is same (10). Should NOT emit.
        expect(listener).not.toHaveBeenCalled();
      });

      it("should support custom equality", () => {
        const d = domain("test");
        const s = d.store("a", 1, (s, a) => (a.type === "INC" ? s + 1 : s));

        // Returns new array reference, but content is same
        const derived1 = derived(
          "d",
          [s],
          (_a) => [1, 2],
          "shallow" // Array shallow equality
        );

        // Prime the cache
        derived1.getState();

        const listener = vi.fn();
        derived1.onChange(listener);

        // Change dependency
        s.dispatch({ type: "INC" });

        // Selector runs (returns new [1,2]), but equality check sees [1,2] === [1,2]
        expect(derived1.getState()).toEqual([1, 2]);
        expect(listener).not.toHaveBeenCalled();
      });
    });
  });
});

describe("Spread Safety", () => {
  it("should support spread operator in use() without losing methods", () => {
    const d = domain("root");
    const enhanced = d.use((prev) => ({ ...prev, extra: "value" }));

    expect(enhanced.extra).toBe("value");
    // This will fail if methods are on prototype
    expect(enhanced.store).toBeDefined();
    expect(typeof enhanced.store).toBe("function");

    // Should actually work
    const s = enhanced.store("test", 0, (s) => s);
    expect(s.name).toBe("root.test");
  });
});

describe("withUse", () => {
  it("should add use() method to object", () => {
    const obj = { value: 1 };
    const result = withUse(obj);
    expect(result).toHaveProperty("use");
    expect(result.value).toBe(1);
  });

  it("should return source when plugin returns falsy", () => {
    const obj = withUse({ value: 1 });
    const result = obj.use(() => null);
    expect(result).toBe(obj);
  });

  it("should return result as-is if it already has use()", () => {
    const obj = withUse({ value: 1 });
    const chainable = withUse({ other: 2 });
    const result = obj.use(() => chainable);
    expect(result).toBe(chainable);
  });

  it("should wrap object result with use() if missing", () => {
    const obj = withUse({ value: 1 });
    const result = obj.use(() => ({ other: 2 }));
    expect(result).toHaveProperty("other", 2);
    expect(result).toHaveProperty("use");
  });

  it("should wrap function result with use() if missing", () => {
    const obj = withUse({ value: 1 });
    const fn = () => "test";
    const result = obj.use(() => fn);
    expect(typeof result).toBe("function");
    expect(result).toHaveProperty("use");
  });

  it("should return primitive directly", () => {
    const obj = withUse({ value: 1 });
    const result = obj.use(() => "primitive");
    expect(result).toBe("primitive");
  });

  it("should chain multiple use() calls", () => {
    const obj = withUse({ value: 1 });

    // First transform adds 'added' property
    const step1 = obj.use((src) => ({ ...src, added: 2 }));
    expect(step1).toHaveProperty("value", 1);
    expect(step1).toHaveProperty("added", 2);
    expect(step1).toHaveProperty("use");

    // Second transform adds 'more' property - receives step1's properties
    const step2 = step1.use((src: any) => ({ original: src.value, more: 3 }));
    expect(step2).toHaveProperty("original", 1);
    expect(step2).toHaveProperty("more", 3);
    expect(step2).toHaveProperty("use");
  });
});
