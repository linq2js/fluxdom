import { useMemo as p, useRef as h, useCallback as i, useSyncExternalStore as d } from "react";
import { resolveEquality as b } from "./index.mjs";
import { actions as g, batch as F, createActionCreator as v, createActionsFromMap as w, createReducerFromMap as x, createStableFn as A, deepEqual as M, derived as C, domain as R, emitter as k, equality as z, isReducerMap as U, isStableFn as V, module as j, shallow2Equal as B, shallow3Equal as D, shallowEqual as G, strictEqual as H, tryStabilize as I, withUse as J } from "./index.mjs";
function q(o, s, u) {
  const e = Array.isArray(o) ? o : [o], c = p(() => b(u), [u]), a = h(void 0), l = i(() => {
    const n = e.map((r) => r.getState()), t = s ? s(...n) : n[0];
    return a.current !== void 0 && c(a.current, t) ? a.current : (a.current = t, t);
  }, [e.length, ...e, s, c]), m = i(
    (n) => {
      const t = e.map((r) => r.onChange(n));
      return () => t.forEach((r) => r());
    },
    [e.length, ...e]
  );
  return d(m, l, l);
}
export {
  g as actions,
  F as batch,
  v as createActionCreator,
  w as createActionsFromMap,
  x as createReducerFromMap,
  A as createStableFn,
  M as deepEqual,
  C as derived,
  R as domain,
  k as emitter,
  z as equality,
  U as isReducerMap,
  V as isStableFn,
  j as module,
  b as resolveEquality,
  B as shallow2Equal,
  D as shallow3Equal,
  G as shallowEqual,
  H as strictEqual,
  I as tryStabilize,
  q as useSelector,
  J as withUse
};
