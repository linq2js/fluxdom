var L = Object.defineProperty;
var R = (e, t, r) => t in e ? L(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var h = (e, t, r) => R(e, typeof t != "symbol" ? t + "" : t, r);
function E(e) {
  return Object.assign(e, {
    use(t) {
      const r = t(e);
      return r ? typeof r == "object" || typeof r == "function" ? "use" in r ? r : E(r) : r : e;
    }
  });
}
function V(e, t) {
  const r = {};
  for (const o of Object.keys(e))
    r[o] = (...s) => ({
      type: o,
      args: s
    });
  return { actionCreators: r, reducer: (o, s) => {
    const c = e[s.type];
    if (c)
      return c(o, ...s.args);
    let i = o;
    for (const l of t)
      i = l(i, s);
    return i;
  } };
}
function x(e, t, r = {}) {
  const n = {};
  for (const [c, i] of Object.entries(t))
    n[c] = (...l) => {
      e.dispatch(i(...l));
    };
  const o = {};
  for (const [c, i] of Object.entries(r))
    o[c] = (...l) => e.dispatch(i(...l));
  return E({
    ...e,
    ...n,
    ...o
  });
}
function G(e) {
  const t = [];
  return { ctx: {
    reset: () => e,
    set: (n, o) => o,
    fallback: (n) => {
      t.push(n);
    }
  }, fallbackHandlers: t };
}
function J(e, t) {
  const {
    name: r,
    initial: n,
    actions: o,
    thunks: s,
    equals: c
  } = t, { ctx: i, fallbackHandlers: l } = G(
    n
  ), m = o(i), { actionCreators: g, reducer: a } = V(m, l), _ = e(r, n, a, c), k = {
    actions: g,
    initial: n
  }, y = (s == null ? void 0 : s(k)) ?? {};
  return x(
    _,
    g,
    y
  );
}
const K = () => {
};
class Q {
  constructor(t) {
    /** Set of registered listeners */
    h(this, "_listeners");
    /** Settled payload (if settled) */
    h(this, "_settledPayload");
    /** Whether the emitter has been settled */
    h(this, "_isSettled", !1);
    h(this, "size", () => this._listeners.size);
    h(this, "settled", () => this._isSettled);
    h(this, "on", (t, r) => {
      let n;
      if (r === void 0)
        n = Array.isArray(t) ? t : [t];
      else {
        const s = t, c = Array.isArray(r) ? r : [r];
        n = [
          (i) => {
            const l = s(i);
            if (l)
              for (let m = 0; m < c.length; m++)
                c[m](l.value);
          }
        ];
      }
      if (this._isSettled) {
        const s = this._settledPayload;
        for (let c = 0; c < n.length; c++)
          n[c](s);
        return K;
      }
      const o = this._listeners;
      for (let s = 0; s < n.length; s++)
        o.add(n[s]);
      return () => {
        for (let s = 0; s < n.length; s++)
          o.delete(n[s]);
      };
    });
    h(this, "emit", (t) => {
      this._isSettled || this._doEmit(t, !1, !1);
    });
    h(this, "emitLifo", (t) => {
      this._isSettled || this._doEmit(t, !1, !0);
    });
    h(this, "clear", () => {
      this._listeners.clear();
    });
    h(this, "emitAndClear", (t) => {
      this._isSettled || this._doEmit(t, !0, !1);
    });
    h(this, "emitAndClearLifo", (t) => {
      this._isSettled || this._doEmit(t, !0, !0);
    });
    h(this, "settle", (t) => {
      this._isSettled || (this._settledPayload = t, this._isSettled = !0, this._doEmit(t, !0, !1));
    });
    /**
     * Internal emit implementation.
     * Creates snapshot to handle modifications during iteration.
     */
    h(this, "_doEmit", (t, r, n) => {
      const o = this._listeners, s = o.size;
      if (s === 0) return;
      const c = Array.from(o);
      if (r && o.clear(), n)
        for (let i = s - 1; i >= 0; i--)
          c[i](t);
      else
        for (let i = 0; i < s; i++)
          c[i](t);
    });
    this._listeners = new Set(t);
  }
}
function A(e) {
  return new Q(e);
}
function W(e, t) {
  return Object.is(e, t);
}
function D(e, t, r = Object.is) {
  if (Object.is(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
  const n = Object.keys(e), o = Object.keys(t);
  if (n.length !== o.length) return !1;
  for (const s of n)
    if (!Object.prototype.hasOwnProperty.call(t, s) || !r(e[s], t[s])) return !1;
  return !0;
}
function I(e, t) {
  return D(e, t, D);
}
function X(e, t) {
  return D(e, t, I);
}
function $(e, t) {
  if (Object.is(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null)
    return !1;
  if (Array.isArray(e)) {
    if (!Array.isArray(t) || e.length !== t.length) return !1;
    for (let o = 0; o < e.length; o++)
      if (!$(e[o], t[o])) return !1;
    return !0;
  }
  if (Array.isArray(t)) return !1;
  const r = Object.keys(e), n = Object.keys(t);
  if (r.length !== n.length) return !1;
  for (const o of r)
    if (!Object.prototype.hasOwnProperty.call(t, o) || !$(e[o], t[o]))
      return !1;
  return !0;
}
function N(e) {
  return !e || e === "strict" ? W : e === "shallow" ? D : e === "shallow2" ? I : e === "shallow3" ? X : e === "deep" ? $ : e;
}
function st(e) {
  return N(e);
}
function H(e) {
  const t = e;
  let r = e;
  return Object.assign(
    (...n) => r(...n),
    {
      getOriginal: () => t,
      getCurrent: () => r,
      setCurrent(n) {
        r = n;
      }
    }
  );
}
function Y(e) {
  return typeof e == "function" && "getOriginal" in e && "getCurrent" in e && "setCurrent" in e;
}
function ct(e, t, r) {
  return e ? typeof t == "function" ? Y(e.value) ? (e.value.setCurrent(t), [e.value, !0]) : [H(t), !1] : t && t instanceof Date ? e.value && e.value instanceof Date && t.getTime() === e.value.getTime() ? [e.value, !0] : [t, !1] : r(e.value, t) ? [e.value, !0] : [t, !1] : typeof t == "function" ? [H(t), !1] : [t, !1];
}
function Z(e, t, r, n) {
  let o;
  const s = A(), c = N(n || "strict"), i = () => r(...t.map((a) => a.getState())), l = () => {
    if (s.size() > 0) {
      const a = i();
      (!o || !c(o.value, a)) && (o = { value: a }, s.emit());
    } else
      o = void 0;
  };
  return t.forEach((a) => a.onChange(l)), E({
    name: e,
    dependencies: t,
    getState: () => (o || (o = { value: i() }), o.value),
    onChange: (a) => s.on(a)
  });
}
function T(e) {
  const t = Object.assign(
    (r) => () => {
      const n = t.current;
      return t.current = r, () => {
        t.current = n;
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
function P(e, t) {
  const r = [];
  for (const n of e)
    r.push(n());
  try {
    return t();
  } finally {
    for (const n of r.reverse())
      n();
  }
}
const z = Object.assign(T, { use: P }), F = z((e) => e());
function tt(e, t, r, n, o, s = "strict") {
  let c = t;
  const i = A(), l = N(s), m = A(), g = () => c, a = (y) => {
    if (typeof y == "function")
      return y({
        dispatch: a,
        domain: n,
        getState: g
      });
    const S = y, b = {
      dispatch: a,
      domain: n,
      getState: g
    };
    m.emit({ action: S, source: e, context: b });
    const w = c;
    c = r(c, S), l(c, w) || F.current(i.emit), o == null || o({ action: S, source: e, context: b });
  }, _ = (y) => {
    const S = {
      dispatch: a,
      domain: n,
      getState: g
    };
    m.emit({ action: y, source: e, context: S });
    const b = c;
    c = r(c, y), c !== b && i.emit();
  };
  return E({
    /** Store identifier (includes domain path, e.g., "app.auth.user") */
    name: e,
    /** Get current state */
    getState: g,
    /** Dispatch action or thunk */
    dispatch: a,
    /** Subscribe to state changes (only fires when state actually changes) */
    onChange: i.on,
    /** Subscribe to all dispatches (fires on every dispatch, even if no change) */
    onDispatch: m.on,
    /** @internal - Receives broadcasts from parent domain */
    _receiveDomainAction: _
  });
}
function et() {
  const e = /* @__PURE__ */ new Map(), t = /* @__PURE__ */ new Map();
  return { get: (o, s) => {
    const c = t.get(o) || o;
    if (e.has(c))
      return e.get(c);
    const i = c.create(s);
    return e.set(c, i), i;
  }, override: (o, s) => {
    if (e.has(o))
      throw new Error(
        `Cannot override module: Instance already created for ${o.name}`
      );
    return t.set(o, s), () => {
      t.delete(o);
    };
  } };
}
function B(e, t, r = et(), n) {
  const o = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set(), c = A(), i = A(), l = () => ({
    dispatch: _,
    get: y
  }), m = (u) => {
    i.emit(u), t == null || t(u);
  }, g = (u) => c.on(u), a = (u) => {
    const f = c.on(u), d = i.on(u);
    return () => {
      f(), d();
    };
  }, _ = (u) => {
    if (typeof u == "function")
      return u(l());
    const f = u, d = l();
    c.emit({ action: f, source: e, context: d }), o.forEach((p) => p._receiveDomainAction(f)), s.forEach((p) => p._receiveDomainAction(f)), t == null || t({ action: f, source: e, context: d });
  }, k = (u) => {
    const f = l();
    c.emit({ action: u, source: e, context: f }), o.forEach((d) => d._receiveDomainAction(u)), s.forEach((d) => d._receiveDomainAction(u));
  }, y = (u) => r.get(u, v), S = (u, f) => r.override(u, f), b = (u, f, d, p) => {
    const j = `${e}.${u}`;
    return Z(j, f, d, p);
  };
  function w(u) {
    const { name: f, initial: d, reducer: p, equals: j } = u, q = `${e}.${f}`, M = tt(
      q,
      d,
      p,
      l(),
      m,
      j
    );
    return o.add(M), M;
  }
  const v = E({
    name: e,
    root: null,
    // Placeholder, set below
    dispatch: _,
    get: y,
    override: S,
    onDispatch: g,
    onAnyDispatch: a,
    store: w,
    derived: b,
    domain: (u) => {
      const f = `${e}.${u}`, d = B(
        f,
        m,
        r,
        v.root
      );
      return s.add(d), d;
    },
    model: (u) => J(
      (d, p, j, q) => w({ name: d, initial: p, reducer: j, equals: q }),
      u
    ),
    _receiveDomainAction: k
  });
  return v.root = n ?? v, v;
}
function it(e) {
  return B(e);
}
const ut = (e, t) => ({ name: e, create: t });
let C = 0;
function lt(e, t) {
  if (C++, C === 1) {
    const r = A();
    try {
      return z.use([F(r.on)], e);
    } finally {
      C--, z.use([F(r.on)], () => {
        const n = () => {
          for (; r.size() > 0; )
            r.emitAndClear();
        };
        t === "async" ? requestAnimationFrame(n) : n();
      });
    }
  }
  try {
    return e();
  } finally {
    C--;
  }
}
function O(e, t) {
  const r = (...n) => ({
    type: e,
    payload: t ? t(...n) : void 0
  });
  return r.type = e, r.match = (n) => n.type === e, r;
}
function rt(e) {
  const t = {};
  for (const r in e)
    if (Object.prototype.hasOwnProperty.call(e, r)) {
      const n = e[r];
      n === !0 ? t[r] = O(r) : typeof n == "string" ? t[r] = O(n) : typeof n == "function" ? t[r] = O(r, n) : typeof n == "object" && n !== null && (t[r] = O(n.type, n.prepare));
    }
  return t;
}
rt.reducer = function(t, r) {
  return r;
};
export {
  rt as actions,
  lt as batch,
  H as createStableFn,
  $ as deepEqual,
  Z as derived,
  it as domain,
  A as emitter,
  st as equality,
  Y as isStableFn,
  ut as module,
  N as resolveEquality,
  I as shallow2Equal,
  X as shallow3Equal,
  D as shallowEqual,
  W as strictEqual,
  ct as tryStabilize,
  E as withUse
};
