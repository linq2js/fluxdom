/**
 * FluxDom Immer integration.
 *
 * Provides utilities for using Immer with FluxDom reducers.
 *
 * @module fluxdom/immer
 *
 * @example
 * ```ts
 * import { immerActions } from "fluxdom/immer";
 *
 * const todoActions = immerActions({
 *   add: (state, text: string) => {
 *     state.items.push({ id: Date.now(), text, done: false });
 *   },
 * });
 *
 * const store = app.store("todos", { items: [] }, todoActions.reducer);
 * ```
 */
export { withImmer, immerActions } from "./withImmer";
