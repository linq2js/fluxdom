import { produce, Draft } from "immer";
import {
  Action,
  ActionsWithReducer,
  Handler,
  InferState,
  Reducer,
  ReducerMap,
} from "../types";
import { actions } from "../core/actions";

/**
 * Wrap a reducer map with Immer's produce for immutable updates.
 *
 * Each handler receives a draft state that can be mutated directly.
 * Immer will produce an immutable result automatically.
 *
 * @param map - Object mapping handler names to handler functions
 * @returns A new reducer map where each handler is wrapped with produce()
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
 *     toggle: (state, id: number) => {
 *       const item = state.items.find((t) => t.id === id);
 *       if (item) item.done = !item.done;
 *     },
 *     clear: (state) => {
 *       state.items = state.items.filter((t) => !t.done);
 *     },
 *   })
 * );
 * ```
 */
export function withImmer<TState, TMap extends ReducerMap<TState>>(
  map: TMap
): ReducerMap<TState> {
  const wrapped: ReducerMap<TState> = {};

  for (const key in map) {
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      const handler = map[key] as Handler<TState, any[]>;

      wrapped[key] = (state: TState, ...args: any[]) =>
        produce(state, (draft: Draft<TState>) => {
          // Call the original handler with draft state
          // Handler can either mutate draft or return a new state
          const result = handler(draft as TState, ...args);

          // If handler returns a value (not undefined), use it as new state
          if (result !== undefined) {
            return result as Draft<TState>;
          }
          // Otherwise, Immer uses the mutated draft
        });
    }
  }

  return wrapped;
}

/**
 * Create action creators with Immer-powered reducers.
 * Combines `actions()` and `withImmer()` for convenience.
 *
 * Each handler receives a draft state that can be mutated directly.
 * Immer will produce an immutable result automatically.
 *
 * @param map - Object mapping handler names to handler functions (can mutate state)
 * @param onDomainAction - Optional reducer to handle domain-level actions
 * @returns Action creators object with `.reducer` property
 *
 * @example
 * ```ts
 * import { immerActions } from "fluxdom/immer";
 *
 * const todoActions = immerActions({
 *   add: (state, text: string) => {
 *     state.items.push({ id: Date.now(), text, done: false });
 *   },
 *   toggle: (state, id: number) => {
 *     const item = state.items.find((t) => t.id === id);
 *     if (item) item.done = !item.done;
 *   },
 * });
 *
 * const store = app.store("todos", { items: [] }, todoActions.reducer);
 * store.dispatch(todoActions.add("Buy milk"));
 * ```
 *
 * @example
 * ```ts
 * // With domain action handler
 * type AppAction = { type: "RESET_ALL" };
 *
 * const counterActions = immerActions(
 *   {
 *     increment: (state) => { state.count += 1; },
 *   },
 *   (state, action: AppAction) => {
 *     if (action.type === "RESET_ALL") return { count: 0 };
 *     return state;
 *   }
 * );
 * ```
 */
export function immerActions<
  TMap extends ReducerMap<any>,
  TDomainAction extends Action = Action
>(
  map: TMap,
  onDomainAction?: Reducer<InferState<TMap>, TDomainAction>
): ActionsWithReducer<InferState<TMap>, TMap, TDomainAction> {
  return actions(withImmer(map) as TMap, onDomainAction);
}
