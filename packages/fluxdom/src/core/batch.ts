import { hook } from "../hooks/hook";
import { scheduleNotifyHook } from "../hooks/scheduleNotifyHook";
import { emitter } from "../emitter";

let batchDepth = 0;
/**
 * Batch multiple state updates into a single render.
 * Useful for performance optimization when you want to avoid multiple re-renders.
 * @param fn - Function containing multiple state updates
 * @returns The return value of the function
 *
 * @example
 * batch(() => {
 *   storeA.dispatch({ type: "SET", value: 1 });
 *   storeB.dispatch({ type: "SET", value: 2 });
 *   storeC.dispatch({ type: "SET", value: 3 });
 * });
 */
export function batch<T>(fn: () => T, mode?: "sync" | "async"): T {
  batchDepth++;

  // First batch - set up the notification hook
  if (batchDepth === 1) {
    const onNotify = emitter();
    try {
      return hook.use([scheduleNotifyHook(onNotify.on)], fn);
    } finally {
      batchDepth--;
      // Keep hooks active while processing notifications
      // This ensures effect re-runs are also batched
      hook.use([scheduleNotifyHook(onNotify.on)], () => {
        const notifyAll = () => {
          while (onNotify.size() > 0) {
            onNotify.emitAndClear();
          }
        };
        if (mode === "async") {
          requestAnimationFrame(notifyAll);
        } else {
          // Process until no more notifications (handles cascading updates)
          notifyAll();
        }
      });
    }
  }

  // Nested batch - just run the function
  try {
    return fn();
  } finally {
    batchDepth--;
  }
}
