import { describe, it, expect, vi } from "vitest";
import { act } from "@testing-library/react";
import { domain } from "../index";
import { useSelector } from "./useSelector";
import { wrappers } from "../strictModeTest";

describe.each(wrappers)("useSelector", ({ renderHook }) => {
  it("should return selected state", () => {
    const d = domain("test");
    const store = d.store({
      name: "count",
      initial: { value: 0 },
      reducer: (state, action) => {
        if (action.type === "INC") return { value: state.value + 1 };
        return state;
      },
    });

    const { result } = renderHook(() => useSelector(store, (s) => s.value));

    expect(result.current).toBe(0);

    act(() => {
      store.dispatch({ type: "INC" });
    });

    expect(result.current).toBe(1);
  });

  it("should return full state when no selector is provided", () => {
    const d = domain("test");
    const store = d.store({
      name: "count",
      initial: { value: 0 },
      reducer: (state, action) => {
        if (action.type === "INC") return { value: state.value + 1 };
        return state;
      },
    });

    const { result } = renderHook(() => useSelector(store));
    expect(result.current).toEqual({ value: 0 });

    act(() => {
      store.dispatch({ type: "INC" });
    });
    expect(result.current).toEqual({ value: 1 });
  });

  it("should support custom equality to prevent updates", () => {
    const d = domain("test");
    const store = d.store({
      name: "data",
      initial: { items: [1, 2] },
      reducer: (state, action) => {
        if (action.type === "UPDATE") return { ...state };
        return state;
      },
    });

    const selectorSpy = vi.fn((state: { items: number[] }) => ({
      count: state.items.length,
    }));

    const { result } = renderHook(() =>
      useSelector(store, selectorSpy, "deep")
    );

    expect(result.current).toEqual({ count: 2 });
    const firstResult = result.current;

    act(() => {
      store.dispatch({ type: "UPDATE" });
    });

    expect(result.current).toBe(firstResult);
  });

  it("should update when equality check fails", () => {
    const d = domain("test");
    const store = d.store({
      name: "data",
      initial: { count: 0 },
      reducer: (state, action) => {
        if (action.type === "INC") return { count: state.count + 1 };
        return state;
      },
    });

    const { result } = renderHook(() =>
      useSelector(store, (s) => ({ nested: { val: s.count } }), "deep")
    );

    const firstResult = result.current;
    expect(firstResult).toEqual({ nested: { val: 0 } });

    act(() => {
      store.dispatch({ type: "INC" });
    });

    const secondResult = result.current;
    expect(secondResult).toEqual({ nested: { val: 1 } });
    expect(secondResult).not.toBe(firstResult);
  });

  it("should support multiple stores", () => {
    const d = domain("test");
    const store1 = d.store({
      name: "s1",
      initial: { val: 1 },
      reducer: (s, a) => (a.type === "INC1" ? { val: s.val + 1 } : s),
    });
    const store2 = d.store({
      name: "s2",
      initial: { val: 10 },
      reducer: (s, a) => (a.type === "INC2" ? { val: s.val + 1 } : s),
    });

    const { result } = renderHook(() =>
      useSelector([store1, store2], (s1, s2) => s1.val + s2.val)
    );

    expect(result.current).toBe(11);

    act(() => store1.dispatch({ type: "INC1" }));
    expect(result.current).toBe(12);

    act(() => store2.dispatch({ type: "INC2" }));
    expect(result.current).toBe(13);
  });

  it("should support shallow equality", () => {
    const d = domain("test");
    const store = d.store({
      name: "user",
      initial: { name: "Alice", age: 30 },
      reducer: (state, action) => {
        if (action.type === "BIRTHDAY") return { ...state, age: state.age + 1 };
        if (action.type === "NOOP") return { ...state }; // New ref, same content
        return state;
      },
    });

    const { result, rerender } = renderHook(() =>
      useSelector(store, (s) => ({ name: s.name }), "shallow")
    );

    const firstResult = result.current;
    expect(firstResult).toEqual({ name: "Alice" });

    // NOOP creates new state ref but name is same
    act(() => store.dispatch({ type: "NOOP" }));
    rerender();

    // Should be same reference due to shallow equality
    expect(result.current).toBe(firstResult);
  });

  it("should clean up subscriptions on unmount", () => {
    const d = domain("test");
    const store = d.store({
      name: "count",
      initial: 0,
      reducer: (s, a) => (a.type === "INC" ? s + 1 : s),
    });

    const { unmount } = renderHook(() => useSelector(store, (s) => s));

    // Dispatch should work before unmount
    act(() => store.dispatch({ type: "INC" }));
    expect(store.getState()).toBe(1);

    unmount();

    // Should not throw after unmount
    act(() => store.dispatch({ type: "INC" }));
    expect(store.getState()).toBe(2);
  });

  it("should handle selector that returns primitive", () => {
    const d = domain("test");
    const store = d.store({
      name: "data",
      initial: { a: 1, b: 2 },
      reducer: (s) => s,
    });

    const { result } = renderHook(() => useSelector(store, (s) => s.a + s.b));

    expect(result.current).toBe(3);
  });
});
