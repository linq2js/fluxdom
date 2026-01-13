/**
 * FluxDom - A lightweight state management library.
 *
 * @module fluxdom
 *
 * @example
 * ```ts
 * import { domain } from "fluxdom";
 *
 * const app = domain("app");
 * const store = app.store("counter", 0, (state, action) => {
 *   switch (action.type) {
 *     case "increment": return state + 1;
 *     default: return state;
 *   }
 * });
 * store.dispatch({ type: "increment" });
 * ```
 */

// Core exports
export { domain } from "./core/domain";
export { derived } from "./core/derived";
export { module } from "./core/module";
export { batch } from "./core/batch";
export { actions } from "./core/actions";

// Action types
export type {
  ActionCreator,
  AnyActionCreator,
  InferActionCreators,
  InferAction,
  InferActionsFromMap,
} from "./core/actions";

// Utilities
export { emitter } from "./emitter";
export { withUse } from "./withUse";

// Equality utilities
export {
  strictEqual,
  shallowEqual,
  shallow2Equal,
  shallow3Equal,
  deepEqual,
  resolveEquality,
  equality,
  createStableFn,
  isStableFn,
  tryStabilize,
  type StableFn,
} from "./equality";

// Types
export * from "./types";
