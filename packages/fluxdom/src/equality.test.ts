/**
 * Tests for equality utilities.
 */
import { describe, it, expect } from "vitest";
import {
  strictEqual,
  shallowEqual,
  shallow2Equal,
  shallow3Equal,
  deepEqual,
  resolveEquality,
} from "./equality";

describe("Equality Utilities", () => {
  describe("strictEqual", () => {
    it("should return true for identical primitives", () => {
      expect(strictEqual(1, 1)).toBe(true);
      expect(strictEqual("a", "a")).toBe(true);
      expect(strictEqual(true, true)).toBe(true);
    });

    it("should return false for different primitives", () => {
      expect(strictEqual(1, 2)).toBe(false);
      expect(strictEqual("a", "b")).toBe(false);
    });

    it("should return true for same object reference", () => {
      const obj = { a: 1 };
      expect(strictEqual(obj, obj)).toBe(true);
    });

    it("should return false for different object references", () => {
      expect(strictEqual({ a: 1 }, { a: 1 })).toBe(false);
    });

    it("should handle NaN correctly", () => {
      expect(strictEqual(NaN, NaN)).toBe(true);
    });

    it("should distinguish +0 and -0", () => {
      expect(strictEqual(0, -0)).toBe(false);
    });
  });

  describe("shallowEqual", () => {
    it("should return true for identical objects", () => {
      const obj = { a: 1 };
      expect(shallowEqual(obj, obj)).toBe(true);
    });

    it("should return true for objects with same keys and values", () => {
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    });

    it("should return false for objects with different keys", () => {
      expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
    });

    it("should return false for objects with different values", () => {
      expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it("should return false for nested object differences", () => {
      expect(shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(false);
    });

    it("should return true for arrays with same elements", () => {
      expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    it("should return false for arrays with different elements", () => {
      expect(shallowEqual([1, 2], [1, 3])).toBe(false);
    });

    it("should return false for arrays of different lengths", () => {
      expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
    });
  });

  describe("shallow2Equal", () => {
    it("should compare 2 levels deep", () => {
      const inner = { x: 1 };
      expect(shallow2Equal({ a: inner }, { a: inner })).toBe(true);
      expect(shallow2Equal({ a: { x: 1 } }, { a: { x: 1 } })).toBe(true);
    });

    it("should return false for 3-level differences", () => {
      expect(
        shallow2Equal({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })
      ).toBe(false);
    });
  });

  describe("shallow3Equal", () => {
    it("should compare 3 levels deep", () => {
      expect(
        shallow3Equal({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })
      ).toBe(true);
    });

    it("should return false for 4-level differences", () => {
      expect(
        shallow3Equal(
          { a: { b: { c: { d: 1 } } } },
          { a: { b: { c: { d: 1 } } } }
        )
      ).toBe(false);
    });
  });

  describe("deepEqual", () => {
    it("should compare deeply nested objects", () => {
      expect(
        deepEqual({ a: { b: { c: { d: 1 } } } }, { a: { b: { c: { d: 1 } } } })
      ).toBe(true);
    });

    it("should return false for deep differences", () => {
      expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(
        false
      );
    });

    it("should compare arrays deeply", () => {
      expect(deepEqual([1, [2, [3]]], [1, [2, [3]]])).toBe(true);
      expect(deepEqual([1, [2, [3]]], [1, [2, [4]]])).toBe(false);
    });

    it("should handle mixed arrays and objects", () => {
      expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    });
  });

  describe("resolveEquality", () => {
    it("should return strictEqual for undefined or 'strict'", () => {
      expect(resolveEquality(undefined)(1, 1)).toBe(true);
      expect(resolveEquality("strict")(1, 1)).toBe(true);
    });

    it("should return shallowEqual for 'shallow'", () => {
      const fn = resolveEquality("shallow");
      expect(fn({ a: 1 }, { a: 1 })).toBe(true);
    });

    it("should return custom function as-is", () => {
      const custom = (a: number, b: number) => a === b;
      expect(resolveEquality(custom)).toBe(custom);
    });
  });
});
