import { useMemo as j, useRef as g, useCallback as y, useSyncExternalStore as k } from "react";
import { derived as b, domain as v } from "./index.mjs";
function A(t, e) {
  return Object.is(t, e);
}
function c(t, e, s = Object.is) {
  if (Object.is(t, e)) return !0;
  if (typeof t != "object" || t === null || typeof e != "object" || e === null) return !1;
  const n = Object.keys(t), r = Object.keys(e);
  if (n.length !== r.length) return !1;
  for (const u of n)
    if (!Object.prototype.hasOwnProperty.call(e, u) || !s(t[u], e[u])) return !1;
  return !0;
}
function h(t, e) {
  return c(t, e, c);
}
function O(t, e) {
  return c(t, e, h);
}
function i(t, e) {
  if (Object.is(t, e)) return !0;
  if (typeof t != "object" || t === null || typeof e != "object" || e === null)
    return !1;
  if (Array.isArray(t)) {
    if (!Array.isArray(e) || t.length !== e.length) return !1;
    for (let r = 0; r < t.length; r++)
      if (!i(t[r], e[r])) return !1;
    return !0;
  }
  if (Array.isArray(e)) return !1;
  const s = Object.keys(t), n = Object.keys(e);
  if (s.length !== n.length) return !1;
  for (const r of s)
    if (!Object.prototype.hasOwnProperty.call(e, r) || !i(t[r], e[r]))
      return !1;
  return !0;
}
function w(t) {
  return !t || t === "strict" ? A : t === "shallow" ? c : t === "shallow2" ? h : t === "shallow3" ? O : t === "deep" ? i : t;
}
function d(t, e, s) {
  const n = Array.isArray(t) ? t : [t], r = j(() => w(s), [s]), u = g(void 0), a = y(() => {
    const f = n.map((l) => l.getState()), o = e ? e(...f) : f[0];
    return u.current !== void 0 && r(u.current, o) ? u.current : (u.current = o, o);
  }, [n.length, ...n, e, r]), p = y(
    (f) => {
      const o = n.map((l) => l.onChange(f));
      return () => o.forEach((l) => l());
    },
    [n.length, ...n]
  );
  return k(p, a, a);
}
export {
  b as derived,
  v as domain,
  d as useSelector
};
