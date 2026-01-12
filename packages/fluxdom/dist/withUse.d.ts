import type { Pipeable } from "./types";
/**
 * Adds a chainable `.use()` method to any object, enabling plugin-based transformations.
 *
 * The `.use()` method accepts a plugin function that receives the source object
 * and can return a transformed version. Supports several return patterns:
 *
 * - **Void/falsy**: Returns the original source unchanged (side-effect only plugins)
 * - **Object/function with `.use`**: Returns as-is (already chainable)
 * - **Object/function without `.use`**: Wraps with `withUse()` for continued chaining
 * - **Primitive**: Returns the value directly
 *
 * @template TSource - The type of the source object being enhanced
 * @param source - The object to add `.use()` method to
 * @returns The source object with `.use()` method attached
 *
 * @example
 * // Basic usage with atom tuple
 * const mappable = withUse([signal, setter]);
 * const transformed = mappable.use(([sig, set]) => ({
 *   sig,
 *   set: (v: string) => set(Number(v))
 * }));
 *
 */
export declare function withUse<TSource extends object>(source: TSource): TSource & Pipeable;
//# sourceMappingURL=withUse.d.ts.map