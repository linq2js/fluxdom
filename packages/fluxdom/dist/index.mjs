var H = Object.defineProperty;
var I = (e, t, r) => t in e ? H(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var d = (e, t, r) => I(e, typeof t != "symbol" ? t + "" : t, r);
import { a as nt, c as ot, d as st, b as it, i as ct } from "./actions-BvsKXo5m.mjs";
function D(e) {
  return Object.assign(e, {
    use(t) {
      const r = t(e);
      return r ? typeof r == "object" || typeof r == "function" ? "use" in r ? r : D(r) : r : e;
    }
  });
}
const M = () => {
};
class U {
  constructor(t) {
    /** Set of registered listeners */
    d(this, "_listeners");
    /** Settled payload (if settled) */
    d(this, "_settledPayload");
    /** Whether the emitter has been settled */
    d(this, "_isSettled", !1);
    d(this, "size", () => this._listeners.size);
    d(this, "settled", () => this._isSettled);
    d(this, "on", (t, r) => {
      let o;
      if (r === void 0)
        o = Array.isArray(t) ? t : [t];
      else {
        const s = t, i = Array.isArray(r) ? r : [r];
        o = [
          (u) => {
            const h = s(u);
            if (h)
              for (let m = 0; m < i.length; m++)
                i[m](h.value);
          }
        ];
      }
      if (this._isSettled) {
        const s = this._settledPayload;
        for (let i = 0; i < o.length; i++)
          o[i](s);
        return M;
      }
      const n = this._listeners;
      for (let s = 0; s < o.length; s++)
        n.add(o[s]);
      return () => {
        for (let s = 0; s < o.length; s++)
          n.delete(o[s]);
      };
    });
    d(this, "emit", (t) => {
      this._isSettled || this._doEmit(t, !1, !1);
    });
    d(this, "emitLifo", (t) => {
      this._isSettled || this._doEmit(t, !1, !0);
    });
    d(this, "clear", () => {
      this._listeners.clear();
    });
    d(this, "emitAndClear", (t) => {
      this._isSettled || this._doEmit(t, !0, !1);
    });
    d(this, "emitAndClearLifo", (t) => {
      this._isSettled || this._doEmit(t, !0, !0);
    });
    d(this, "settle", (t) => {
      this._isSettled || (this._settledPayload = t, this._isSettled = !0, this._doEmit(t, !0, !1));
    });
    /**
     * Internal emit implementation.
     * Creates snapshot to handle modifications during iteration.
     */
    d(this, "_doEmit", (t, r, o) => {
      const n = this._listeners, s = n.size;
      if (s === 0) return;
      const i = Array.from(n);
      if (r && n.clear(), o)
        for (let u = s - 1; u >= 0; u--)
          i[u](t);
      else
        for (let u = 0; u < s; u++)
          i[u](t);
    });
    this._listeners = new Set(t);
  }
}
function p(e) {
  return new U(e);
}
function L(e, t) {
  return Object.is(e, t);
}
function b(e, t, r = Object.is) {
  if (Object.is(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
  const o = Object.keys(e), n = Object.keys(t);
  if (o.length !== n.length) return !1;
  for (const s of o)
    if (!Object.prototype.hasOwnProperty.call(t, s) || !r(e[s], t[s])) return !1;
  return !0;
}
function N(e, t) {
  return b(e, t, b);
}
function V(e, t) {
  return b(e, t, N);
}
function O(e, t) {
  if (Object.is(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null)
    return !1;
  if (Array.isArray(e)) {
    if (!Array.isArray(t) || e.length !== t.length) return !1;
    for (let n = 0; n < e.length; n++)
      if (!O(e[n], t[n])) return !1;
    return !0;
  }
  if (Array.isArray(t)) return !1;
  const r = Object.keys(e), o = Object.keys(t);
  if (r.length !== o.length) return !1;
  for (const n of r)
    if (!Object.prototype.hasOwnProperty.call(t, n) || !O(e[n], t[n]))
      return !1;
  return !0;
}
function $(e) {
  return !e || e === "strict" ? L : e === "shallow" ? b : e === "shallow2" ? N : e === "shallow3" ? V : e === "deep" ? O : e;
}
function Z(e) {
  return $(e);
}
function F(e) {
  const t = e;
  let r = e;
  return Object.assign(
    (...o) => r(...o),
    {
      getOriginal: () => t,
      getCurrent: () => r,
      setCurrent(o) {
        r = o;
      }
    }
  );
}
function G(e) {
  return typeof e == "function" && "getOriginal" in e && "getCurrent" in e && "setCurrent" in e;
}
function T(e, t, r) {
  return e ? typeof t == "function" ? G(e.value) ? (e.value.setCurrent(t), [e.value, !0]) : [F(t), !1] : t && t instanceof Date ? e.value && e.value instanceof Date && t.getTime() === e.value.getTime() ? [e.value, !0] : [t, !1] : r(e.value, t) ? [e.value, !0] : [t, !1] : typeof t == "function" ? [F(t), !1] : [t, !1];
}
function J(e, t, r, o) {
  let n;
  const s = p(), i = $(o || "strict"), u = () => r(...t.map((a) => a.getState())), h = () => {
    if (s.size() > 0) {
      const a = u();
      (!n || !i(n.value, a)) && (n = { value: a }, s.emit());
    } else
      n = void 0;
  };
  return t.forEach((a) => a.onChange(h)), D({
    name: e,
    dependencies: t,
    getState: () => (n || (n = { value: u() }), n.value),
    onChange: (a) => s.on(a)
  });
}
function K(e) {
  const t = Object.assign(
    (r) => () => {
      const o = t.current;
      return t.current = r, () => {
        t.current = o;
      };
    },
    {
      current: e,
      // Override method for direct mutation
      override: (r) => {
        t.current = r;
      }
    }
  );
  return t;
}
function Q(e, t) {
  const r = [];
  for (const o of e)
    r.push(o());
  try {
    return t();
  } finally {
    for (const o of r.reverse())
      o();
  }
}
const k = Object.assign(K, { use: Q }), q = k((e) => e());
function W(e, t, r, o, n, s = "strict") {
  let i = t;
  const u = p(), h = $(s), m = p(), g = () => i, a = (y) => {
    if (typeof y == "function")
      return y({
        dispatch: a,
        domain: o,
        getState: g
      });
    const S = y, A = {
      dispatch: a,
      domain: o,
      getState: g
    };
    m.emit({ action: S, source: e, context: A });
    const C = i;
    i = r(i, S), h(i, C) || q.current(u.emit), n == null || n({ action: S, source: e, context: A });
  }, E = (y) => {
    const S = {
      dispatch: a,
      domain: o,
      getState: g
    };
    m.emit({ action: y, source: e, context: S });
    const A = i;
    i = r(i, y), i !== A && u.emit();
  };
  return D({
    /** Store identifier (includes domain path, e.g., "app.auth.user") */
    name: e,
    /** Get current state */
    getState: g,
    /** Dispatch action or thunk */
    dispatch: a,
    /** Subscribe to state changes (only fires when state actually changes) */
    onChange: u.on,
    /** Subscribe to all dispatches (fires on every dispatch, even if no change) */
    onDispatch: m.on,
    /** @internal - Receives broadcasts from parent domain */
    _receiveDomainAction: E
  });
}
function X() {
  const e = /* @__PURE__ */ new Map(), t = /* @__PURE__ */ new Map();
  return { get: (n, s) => {
    const i = t.get(n) || n;
    if (e.has(i))
      return e.get(i);
    const u = i.create(s);
    return e.set(i, u), u;
  }, override: (n, s) => {
    if (e.has(n))
      throw new Error(
        `Cannot override module: Instance already created for ${n.name}`
      );
    return t.set(n, s), () => {
      t.delete(n);
    };
  } };
}
function R(e, t, r = X(), o) {
  const n = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set(), i = p(), u = p(), h = () => ({
    dispatch: E,
    get: y
  }), m = (c) => {
    u.emit(c), t == null || t(c);
  }, g = (c) => i.on(c), a = (c) => {
    const l = i.on(c), f = u.on(c);
    return () => {
      l(), f();
    };
  }, E = (c) => {
    if (typeof c == "function")
      return c(h());
    const l = c, f = h();
    i.emit({ action: l, source: e, context: f }), n.forEach((_) => _._receiveDomainAction(l)), s.forEach((_) => _._receiveDomainAction(l)), t == null || t({ action: l, source: e, context: f });
  }, z = (c) => {
    const l = h();
    i.emit({ action: c, source: e, context: l }), n.forEach((f) => f._receiveDomainAction(c)), s.forEach((f) => f._receiveDomainAction(c));
  }, y = (c) => r.get(c, v), S = (c, l) => r.override(c, l), A = (c, l, f, _) => {
    const w = `${e}.${c}`;
    return J(w, l, f, _);
  };
  function C(c, l, f) {
    const _ = `${e}.${c}`, w = W(
      _,
      l,
      f,
      h(),
      m
    );
    return n.add(w), w;
  }
  const v = D({
    name: e,
    root: null,
    // Placeholder, set below
    dispatch: E,
    get: y,
    override: S,
    onDispatch: g,
    onAnyDispatch: a,
    store: C,
    derived: A,
    domain: (c) => {
      const l = `${e}.${c}`, f = R(
        l,
        m,
        r,
        v.root
      );
      return s.add(f), f;
    },
    _receiveDomainAction: z
  });
  return v.root = o ?? v, v;
}
function x(e) {
  return R(e);
}
const P = (e, t) => ({ name: e, create: t });
let j = 0;
function tt(e, t) {
  if (j++, j === 1) {
    const r = p();
    try {
      return k.use([q(r.on)], e);
    } finally {
      j--, k.use([q(r.on)], () => {
        const o = () => {
          for (; r.size() > 0; )
            r.emitAndClear();
        };
        t === "async" ? requestAnimationFrame(o) : o();
      });
    }
  }
  try {
    return e();
  } finally {
    j--;
  }
}
export {
  nt as actions,
  tt as batch,
  ot as createActionCreator,
  st as createActionsFromMap,
  it as createReducerFromMap,
  F as createStableFn,
  O as deepEqual,
  J as derived,
  x as domain,
  p as emitter,
  Z as equality,
  ct as isReducerMap,
  G as isStableFn,
  P as module,
  $ as resolveEquality,
  N as shallow2Equal,
  V as shallow3Equal,
  b as shallowEqual,
  L as strictEqual,
  T as tryStabilize,
  D as withUse
};
