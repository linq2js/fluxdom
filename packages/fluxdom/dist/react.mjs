import { useMemo as m, useRef as p, useCallback as i, useSyncExternalStore as b } from "react";
import { resolveEquality as E } from "./index.mjs";
import { actions as g, batch as v, createStableFn as w, deepEqual as x, derived as F, domain as A, emitter as C, equality as k, isStableFn as z, module as M, shallow2Equal as R, shallow3Equal as U, shallowEqual as V, strictEqual as j, tryStabilize as B, withUse as D } from "./index.mjs";
function q(o, s, u) {
  const t = Array.isArray(o) ? o : [o], l = m(() => E(u), [u]), a = p(void 0), c = i(() => {
    const r = t.map((n) => n.getState()), e = s ? s(...r) : r[0];
    return a.current !== void 0 && l(a.current, e) ? a.current : (a.current = e, e);
  }, [t.length, ...t, s, l]), h = i(
    (r) => {
      const e = t.map((n) => n.onChange(r));
      return () => e.forEach((n) => n());
    },
    [t.length, ...t]
  );
  return b(h, c, c);
}
export {
  g as actions,
  v as batch,
  w as createStableFn,
  x as deepEqual,
  F as derived,
  A as domain,
  C as emitter,
  k as equality,
  z as isStableFn,
  M as module,
  E as resolveEquality,
  R as shallow2Equal,
  U as shallow3Equal,
  V as shallowEqual,
  j as strictEqual,
  B as tryStabilize,
  q as useSelector,
  D as withUse
};
