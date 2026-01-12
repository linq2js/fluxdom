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
export { domain } from "./core/domain";
export { derived } from "./core/derived";
export { module } from "./core/module";
export { batch } from "./core/batch";
export { actions } from "./core/actions";
export { createActionCreator, createReducerFromMap, createActionsFromMap, isReducerMap, } from "./core/actions";
export { emitter } from "./emitter";
export { withUse } from "./withUse";
export { strictEqual, shallowEqual, shallow2Equal, shallow3Equal, deepEqual, resolveEquality, equality, createStableFn, isStableFn, tryStabilize, type StableFn, } from "./equality";
export * from "./types";
//# sourceMappingURL=index.d.ts.map