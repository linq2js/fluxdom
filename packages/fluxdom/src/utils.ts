/**
 * Utility functions for FluxDom.
 * @module utils
 */

/**
 * Check if a value is a PromiseLike (has a .then method).
 * Works with native Promises, Bluebird, jQuery Deferreds, and any thenable.
 *
 * @example
 * ```ts
 * isPromiseLike(Promise.resolve(1)); // true
 * isPromiseLike({ then: () => {} }); // true
 * isPromiseLike(() => {}); // false
 * isPromiseLike(null); // false
 * ```
 */
export function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (
    value !== null &&
    typeof value === "object" &&
    "then" in value &&
    typeof (value as any).then === "function"
  );
}
