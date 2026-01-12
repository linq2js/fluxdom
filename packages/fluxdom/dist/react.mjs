import { useMemo as p, useRef as h, useCallback as i, useSyncExternalStore as d } from "react";
import { resolveEquality as b } from "./index.mjs";
import { batch as g, createStableFn as x, deepEqual as F, derived as v, domain as w, emitter as A, equality as M, isStableFn as C, module as R, shallow2Equal as k, shallow3Equal as z, shallowEqual as U, strictEqual as V, tryStabilize as j, withUse as B } from "./index.mjs";
import { a as G, c as H, d as I, b as J, i as K } from "./actions-BvsKXo5m.mjs";
function q(o, s, c) {
  const e = Array.isArray(o) ? o : [o], u = p(() => b(c), [c]), r = h(void 0), l = i(() => {
    const n = e.map((a) => a.getState()), t = s ? s(...n) : n[0];
    return r.current !== void 0 && u(r.current, t) ? r.current : (r.current = t, t);
  }, [e.length, ...e, s, u]), m = i(
    (n) => {
      const t = e.map((a) => a.onChange(n));
      return () => t.forEach((a) => a());
    },
    [e.length, ...e]
  );
  return d(m, l, l);
}
export {
  G as actions,
  g as batch,
  H as createActionCreator,
  I as createActionsFromMap,
  J as createReducerFromMap,
  x as createStableFn,
  F as deepEqual,
  v as derived,
  w as domain,
  A as emitter,
  M as equality,
  K as isReducerMap,
  C as isStableFn,
  R as module,
  b as resolveEquality,
  k as shallow2Equal,
  z as shallow3Equal,
  U as shallowEqual,
  V as strictEqual,
  j as tryStabilize,
  q as useSelector,
  B as withUse
};
