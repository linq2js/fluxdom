/**
 * FluxDom - A lightweight state management library.
 *
 * @module fluxdom
 *
 * @example
 * ```ts
 * import { domain, derived } from "fluxdom";
 *
 * const appDomain = domain<AppAction>("app");
 * const counterStore = appDomain.store("counter", 0, counterReducer);
 * ```
 */

// Core exports
export { domain } from "./core/domain";
export { derived } from "./core/derived";
export { module } from "./core/module";
export { batch } from "./core/batch";

// Reducer map utilities
export {
  createActionCreator,
  createReducerFromMap,
  createActionsFromMap,
  isReducerMap,
} from "./core/reducerMap";

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
