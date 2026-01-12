/**
 * FluxDom Immer integration.
 *
 * Provides utilities for using Immer with FluxDom reducers.
 *
 * @module fluxdom/immer
 *
 * @example
 * ```ts
 * import { withImmer } from "fluxdom/immer";
 *
 * const todoActions = app.actions(
 *   withImmer({
 *     add: (state, text: string) => {
 *       state.items.push({ id: Date.now(), text, done: false });
 *     },
 *   })
 * );
 * ```
 */
export { withImmer } from "./withImmer";
