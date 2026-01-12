import { hook } from "./hook";

/** Function type for scheduling notifications */
export type NotifyFn = (fn: () => void) => void;

export const scheduleNotifyHook = hook<NotifyFn>((fn) => fn());
