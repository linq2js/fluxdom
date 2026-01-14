import {
  Action,
  AnyAction,
  DispatchArgs,
  DomainContext,
  Equality,
  MutableStore,
  OnDispatch,
  Reducer,
  StoreContext,
  StoreMeta,
  Thunk,
} from "../types";

import { withUse } from "../withUse";
import { emitter } from "../emitter";
import { resolveEquality } from "../equality";
import { scheduleNotifyHook } from "../hooks/scheduleNotifyHook";

/**
 * Creates a mutable store - the fundamental state container in FluxDom.
 *
 * A store encapsulates:
 * - State: The current value, updated via reducer
 * - Reducer: Pure function that computes new state from (state, action)
 * - Dispatch: Method to send actions (or thunks) to the store
 * - Subscriptions: onChange (state changes) and onDispatch (all actions)
 *
 * Key behaviors:
 * - State updates are synchronous and immediate
 * - Notifications can be batched via `batch()` for performance
 * - Equality checking prevents unnecessary notifications
 * - Domain actions are received and processed like store actions
 *
 * @template TState - Type of the store's state
 * @template TAction - Type of actions the store accepts directly
 *
 * @param name - Unique identifier for the store (used for debugging)
 * @param initial - Initial state value
 * @param reducer - Pure function: (state, action) => newState
 * @param domainContext - Context providing access to parent domain's dispatch/get
 * @param notifyParent - Callback to bubble dispatch events to parent domain
 * @param equals - Equality strategy for detecting state changes (default: "strict")
 *
 * @returns A MutableStore instance with dispatch, getState, onChange, etc.
 *
 * @example
 * ```ts
 * const counterStore = createStore(
 *   "counter",
 *   0,
 *   (state, action) => {
 *     switch (action.type) {
 *       case "INCREMENT": return state + 1;
 *       case "DECREMENT": return state - 1;
 *       default: return state;
 *     }
 *   },
 *   domainContext
 * );
 * ```
 *
 * @internal - Use `domain.store()` instead for public API
 */
export function createStore<TState, TAction extends Action>(
  name: string,
  initial: TState,
  reducer: Reducer<TState, TAction>,
  domainContext: DomainContext,
  notifyParent?: OnDispatch,
  equals: Equality<TState> = "strict",
  meta?: StoreMeta
): MutableStore<TState, TAction> {
  // ==========================================================================
  // Closure State
  // ==========================================================================

  /** Current state value - mutated on each dispatch */
  let currentState = initial;

  /** Emitter for state change notifications (onChange subscribers) */
  const changeEmitter = emitter<void>();

  /** Resolved equality function for comparing old vs new state */
  const eq = resolveEquality(equals);

  /** Emitter for dispatch notifications (onDispatch subscribers) */
  const dispatchEmitter =
    emitter<DispatchArgs<TAction | AnyAction, StoreContext<TState, TAction>>>();

  // ==========================================================================
  // Public API
  // ==========================================================================

  /** Returns current state (synchronous, always up-to-date) */
  const getState = () => currentState;

  /**
   * Dispatches an action or thunk to the store.
   *
   * Flow for actions:
   * 1. Notify onDispatch listeners (before reduce)
   * 2. Run reducer to compute new state
   * 3. If state changed (per equality check), schedule onChange notification
   * 4. Bubble dispatch event to parent domain
   *
   * Flow for thunks:
   * - Execute thunk with store context (dispatch, getState, domain)
   * - Return thunk's return value
   *
   * @param actionOrThunk - Plain action object or thunk function
   * @returns For thunks: the thunk's return value. For actions: void
   */
  const dispatch = (actionOrThunk: TAction | Thunk<any>) => {
    // -------------------------------------------------------------------------
    // Thunk Handling
    // -------------------------------------------------------------------------
    // Thunks are functions that receive context and can dispatch multiple
    // actions, perform async operations, or access current state.
    if (typeof actionOrThunk === "function") {
      const context: StoreContext<TState, TAction> = {
        dispatch: dispatch as any,
        domain: domainContext,
        getState,
      };
      return actionOrThunk(context);
    }

    const action = actionOrThunk as TAction;

    // -------------------------------------------------------------------------
    // 1. Notify onDispatch Listeners (Before Reduce)
    // -------------------------------------------------------------------------
    // Allows middleware-like behavior: logging, analytics, side effects
    // that need to see every action regardless of state change.
    const context: StoreContext<TState, TAction> = {
      dispatch: dispatch as any,
      domain: domainContext,
      getState,
    };
    dispatchEmitter.emit({ action, source: name, context });

    // -------------------------------------------------------------------------
    // 2. Reduce: Compute New State
    // -------------------------------------------------------------------------
    const oldState = currentState;
    currentState = reducer(currentState, action);

    // -------------------------------------------------------------------------
    // 3. Notify onChange Listeners (If State Changed)
    // -------------------------------------------------------------------------
    // Uses scheduleNotifyHook for batching support:
    // - Default: immediate notification (scheduleNotify = fn => fn())
    // - In batch(): notifications are deferred and de-duplicated
    if (!eq(currentState, oldState)) {
      scheduleNotifyHook.current(changeEmitter.emit);
    }

    // -------------------------------------------------------------------------
    // 4. Bubble to Parent Domain
    // -------------------------------------------------------------------------
    // Enables onAnyDispatch at domain level to see all store dispatches
    notifyParent?.({ action, source: name, context });
  };

  /**
   * Receives and processes domain-level actions.
   *
   * Called by parent domain when it dispatches an action that should
   * broadcast to all child stores. Handles the action like a local dispatch
   * but does NOT bubble back up (prevents infinite loops).
   *
   * Note: Uses direct emit() instead of scheduleNotifyHook because domain
   * broadcasts are typically already part of a larger operation.
   *
   * @internal - Called by domain, not for public use
   */
  const _receiveDomainAction = (action: AnyAction) => {
    // 1. Notify onDispatch listeners (same as regular dispatch)
    const context: StoreContext<TState, TAction> = {
      dispatch: dispatch as any,
      domain: domainContext,
      getState,
    };
    dispatchEmitter.emit({ action, source: name, context });

    // 2. Reduce: Apply domain action to state
    const oldState = currentState;
    // @ts-ignore - Reducer may or may not handle domain actions
    currentState = reducer(currentState, action as any);

    // 3. Notify onChange if state changed (direct emit, no batching)
    if (currentState !== oldState) {
      changeEmitter.emit();
    }

    // Note: Do NOT call notifyParent - prevents bubbling loops
  };

  // ==========================================================================
  // Build Store Object
  // ==========================================================================

  // withUse() adds the chainable .use() plugin method
  const store = withUse({
    /** Store identifier (includes domain path, e.g., "app.auth.user") */
    name,

    /** Optional metadata for the store */
    meta,

    /** Get current state */
    getState,

    /** Dispatch action or thunk */
    dispatch,

    /** Subscribe to state changes (only fires when state actually changes) */
    onChange: changeEmitter.on,

    /** Subscribe to all dispatches (fires on every dispatch, even if no change) */
    onDispatch: dispatchEmitter.on,

    /** @internal - Receives broadcasts from parent domain */
    _receiveDomainAction,
  });

  return store;
}
