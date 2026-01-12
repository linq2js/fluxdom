import { produce, Draft } from "immer";
import { ReducerMap, Handler } from "../types";

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
