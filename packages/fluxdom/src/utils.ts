/**
 * Utility functions for FluxDom.
 * @module utils
 */

import { Action, ActionMatcher } from "./types";

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

/**
 * Check if an action matches one or more action creators.
 * Useful for filtering in onDispatch/onAnyDispatch listeners.
 *
 * @param action - The action to check
 * @param actionOrActions - Single action creator or array of action creators
 * @returns True if action matches any of the provided action creators
 *
 * @example
 * ```ts
 * const todoActions = actions({
 *   add: (title: string) => ({ title }),
 *   remove: (id: number) => id,
 * });
 *
 * app.onAnyDispatch(({ action }) => {
 *   // Single action — type narrowing works!
 *   if (matches(action, todoActions.add)) {
 *     console.log("Added:", action.payload.title);
 *   }
 *
 *   // Multiple actions
 *   if (matches(action, [todoActions.add, todoActions.remove])) {
 *     console.log("Todo changed");
 *   }
 * });
 * ```
 */
export function matches<TAction extends Action>(
  action: Action,
  matcher: ActionMatcher<TAction>
): action is TAction;
export function matches<TMatchers extends readonly ActionMatcher<any>[]>(
  action: Action,
  matchers: TMatchers
): action is TMatchers[number] extends ActionMatcher<infer A> ? A : never;
export function matches(
  action: Action,
  actionOrActions: ActionMatcher<any> | readonly ActionMatcher<any>[]
): boolean {
  const matchers = Array.isArray(actionOrActions)
    ? actionOrActions
    : [actionOrActions];
  return matchers.some((m) => m.match(action));
}
