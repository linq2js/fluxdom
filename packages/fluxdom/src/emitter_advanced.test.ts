import { describe, it, expect, vi } from "vitest";
import { emitter } from "./emitter";
import { Emitter } from "./types";

describe("Emitter Advanced Features", () => {
  it("should support mapping transformation", () => {
    const e = emitter<number>();
    const listener = vi.fn();

    // Map: multiply by 2
    e.on((n) => ({ value: n * 2 }), listener);

    e.emit(10);
    expect(listener).toHaveBeenCalledWith(20);
  });

  it("should support filtering via map returning undefined", () => {
    const e = emitter<number>();
    const listener = vi.fn();

    // Filter: only even numbers
    e.on((n) => (n % 2 === 0 ? { value: n } : undefined), listener);

    e.emit(1);
    e.emit(2);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2);
  });

  it("should support mapping with array of listeners", () => {
    const e = emitter<string>();
    const l1 = vi.fn();
    const l2 = vi.fn();

    e.on((s) => ({ value: s.toUpperCase() }), [l1, l2]);

    e.emit("hello");
    expect(l1).toHaveBeenCalledWith("HELLO");
    expect(l2).toHaveBeenCalledWith("HELLO");
  });

  it("should emitLIFO in reverse order", () => {
    const e = emitter<void>();
    const sequence: number[] = [];

    e.on(() => sequence.push(1));
    e.on(() => sequence.push(2));
    e.on(() => sequence.push(3));

    e.emitLifo();
    expect(sequence).toEqual([3, 2, 1]);
  });

  it("should clear all listeners", () => {
    const e = emitter<void>();
    const listener = vi.fn();
    e.on(listener);

    e.clear();
    e.emit();
    expect(listener).not.toHaveBeenCalled();
    expect(e.size()).toBe(0);
  });

  it("should emitAndClear", () => {
    const e = emitter<string>();
    const listener = vi.fn();
    e.on(listener);

    e.emitAndClear("last call");
    expect(listener).toHaveBeenCalledWith("last call");
    expect(e.size()).toBe(0);

    e.emit("ignored");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should emitAndClearLifo", () => {
    const e = emitter<void>();
    const sequence: number[] = [];
    e.on(() => sequence.push(1));
    e.on(() => sequence.push(2));

    e.emitAndClearLifo();
    expect(sequence).toEqual([2, 1]);
    expect(e.size()).toBe(0);
  });

  it("should settle and replay to new subscribers", () => {
    const e = emitter<string>();
    const l1 = vi.fn();
    e.on(l1);

    e.settle("final");
    expect(l1).toHaveBeenCalledWith("final");
    expect(e.settled()).toBe(true);

    // New subscriber gets settled value immediately
    const l2 = vi.fn();
    const unsub = e.on(l2);
    expect(l2).toHaveBeenCalledWith("final");

    // Unsubscribe should range no-op
    unsub();

    // Map subscriber also gets it
    const l3 = vi.fn();
    e.on((s) => ({ value: s + "!" }), l3);
    expect(l3).toHaveBeenCalledWith("final!");

    // Emit should be ignored
    e.emit("ignored");
    expect(l1).toHaveBeenCalledTimes(1);
  });

  it("should ignore operations when settled", () => {
    const e = emitter<void>();
    e.settle();

    const listener = vi.fn();
    // emit/clear ops on settled emitter
    e.emit();
    e.emitLifo();
    e.emitAndClear();
    e.emitAndClearLifo();
    e.clear(); // Should happen, but effectively harmless if settled
    e.settle(); // Should ignore 2nd settle

    expect(e.settled()).toBe(true);
  });

  it("should handle empty emit (optimization path)", () => {
    const e = emitter<void>();
    // Call emit with no listeners to hit optimization path
    e.emit();
    expect(true).toBe(true); // Should not throw
  });
});
