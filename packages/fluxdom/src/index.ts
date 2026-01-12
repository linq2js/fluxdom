/**
 * FluxDom - A lightweight state management library.
 *
 * @module fluxdom
 *
 * @example
 * ```ts
 * import { domain, actions } from "fluxdom";
 *
 * const app = domain("app");
 * const counterActions = actions({
 *   increment: (state: number) => state + 1,
 * });
 * const counterStore = app.store("counter", 0, counterActions.reducer);
 * ```
 */

// Core exports
export { domain } from "./core/domain";
export { derived } from "./core/derived";
export { module } from "./core/module";
export { batch } from "./core/batch";

// Actions helper — creates action creators + reducer
export { actions } from "./core/actions";

// Low-level action utilities
export {
  createActionCreator,
  createReducerFromMap,
  createActionsFromMap,
  isReducerMap,
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
