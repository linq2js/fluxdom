var H = Object.defineProperty;
var I = (t, e, r) => e in t ? H(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r;
var d = (t, e, r) => I(t, typeof e != "symbol" ? e + "" : e, r);
function O(t) {
  return Object.assign(t, {
    use(e) {
      const r = e(t);
      return r ? typeof r == "object" || typeof r == "function" ? "use" in r ? r : O(r) : r : t;
    }
  });
}
const M = () => {
};
class U {
  constructor(e) {
    /** Set of registered listeners */
    d(this, "_listeners");
    /** Settled payload (if settled) */
    d(this, "_settledPayload");
    /** Whether the emitter has been settled */
    d(this, "_isSettled", !1);
    d(this, "size", () => this._listeners.size);
    d(this, "settled", () => this._isSettled);
    d(this, "on", (e, r) => {
      let n;
      if (r === void 0)
        n = Array.isArray(e) ? e : [e];
      else {
        const s = e, i = Array.isArray(r) ? r : [r];
        n = [
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
        for (let i = 0; i < n.length; i++)
          n[i](s);
        return M;
      }
      const o = this._listeners;
      for (let s = 0; s < n.length; s++)
        o.add(n[s]);
      return () => {
        for (let s = 0; s < n.length; s++)
          o.delete(n[s]);
      };
    });
    d(this, "emit", (e) => {
      this._isSettled || this._doEmit(e, !1, !1);
    });
    d(this, "emitLifo", (e) => {
      this._isSettled || this._doEmit(e, !1, !0);
    });
    d(this, "clear", () => {
      this._listeners.clear();
    });
    d(this, "emitAndClear", (e) => {
      this._isSettled || this._doEmit(e, !0, !1);
    });
    d(this, "emitAndClearLifo", (e) => {
      this._isSettled || this._doEmit(e, !0, !0);
    });
    d(this, "settle", (e) => {
      this._isSettled || (this._settledPayload = e, this._isSettled = !0, this._doEmit(e, !0, !1));
    });
    /**
     * Internal emit implementation.
     * Creates snapshot to handle modifications during iteration.
     */
    d(this, "_doEmit", (e, r, n) => {
      const o = this._listeners, s = o.size;
      if (s === 0) return;
      const i = Array.from(o);
      if (r && o.clear(), n)
        for (let u = s - 1; u >= 0; u--)
          i[u](e);
      else
        for (let u = 0; u < s; u++)
          i[u](e);
    });
    this._listeners = new Set(e);
  }
}
function v(t) {
  return new U(t);
}
function L(t, e) {
  return Object.is(t, e);
}
function w(t, e, r = Object.is) {
  if (Object.is(t, e)) return !0;
  if (typeof t != "object" || t === null || typeof e != "object" || e === null) return !1;
  const n = Object.keys(t), o = Object.keys(e);
  if (n.length !== o.length) return !1;
  for (const s of n)
    if (!Object.prototype.hasOwnProperty.call(e, s) || !r(t[s], e[s])) return !1;
  return !0;
}
function R(t, e) {
  return w(t, e, w);
}
function V(t, e) {
  return w(t, e, R);
}
function C(t, e) {
  if (Object.is(t, e)) return !0;
  if (typeof t != "object" || t === null || typeof e != "object" || e === null)
    return !1;
  if (Array.isArray(t)) {
    if (!Array.isArray(e) || t.length !== e.length) return !1;
    for (let o = 0; o < t.length; o++)
      if (!C(t[o], e[o])) return !1;
    return !0;
  }
  if (Array.isArray(e)) return !1;
  const r = Object.keys(t), n = Object.keys(e);
  if (r.length !== n.length) return !1;
  for (const o of r)
    if (!Object.prototype.hasOwnProperty.call(e, o) || !C(t[o], e[o]))
      return !1;
  return !0;
}
function $(t) {
  return !t || t === "strict" ? L : t === "shallow" ? w : t === "shallow2" ? R : t === "shallow3" ? V : t === "deep" ? C : t;
}
function P(t) {
  return $(t);
}
function F(t) {
  const e = t;
  let r = t;
  return Object.assign(
    (...n) => r(...n),
    {
      getOriginal: () => e,
      getCurrent: () => r,
      setCurrent(n) {
        r = n;
      }
    }
  );
}
function G(t) {
  return typeof t == "function" && "getOriginal" in t && "getCurrent" in t && "setCurrent" in t;
}
function tt(t, e, r) {
  return t ? typeof e == "function" ? G(t.value) ? (t.value.setCurrent(e), [t.value, !0]) : [F(e), !1] : e && e instanceof Date ? t.value && t.value instanceof Date && e.getTime() === t.value.getTime() ? [t.value, !0] : [e, !1] : r(t.value, e) ? [t.value, !0] : [e, !1] : typeof e == "function" ? [F(e), !1] : [e, !1];
}
function J(t, e, r, n) {
  let o;
  const s = v(), i = $(n || "strict"), u = () => r(...e.map((f) => f.getState())), h = () => {
    if (s.size() > 0) {
      const f = u();
      (!o || !i(o.value, f)) && (o = { value: f }, s.emit());
    } else
      o = void 0;
  };
  return e.forEach((f) => f.onChange(h)), O({
    name: t,
    dependencies: e,
    getState: () => (o || (o = { value: u() }), o.value),
    onChange: (f) => s.on(f)
  });
}
function K(t) {
  const e = Object.assign(
    (r) => () => {
      const n = e.current;
      return e.current = r, () => {
        e.current = n;
      };
    },
    {
      current: t,
      // Override method for direct mutation
      override: (r) => {
        e.current = r;
      }
    }
  );
  return e;
}
function Q(t, e) {
  const r = [];
  for (const n of t)
    r.push(n());
  try {
    return e();
  } finally {
    for (const n of r.reverse())
      n();
  }
}
const k = Object.assign(K, { use: Q }), q = k((t) => t());
function W(t, e, r, n, o, s = "strict") {
  let i = e;
  const u = v(), h = $(s), m = v(), g = () => i, f = (y) => {
    if (typeof y == "function")
      return y({
        dispatch: f,
        domain: n,
        getState: g
      });
    const S = y, _ = {
      dispatch: f,
      domain: n,
      getState: g
    };
    m.emit({ action: S, source: t, context: _ });
    const D = i;
    i = r(i, S), h(i, D) || q.current(u.emit), o == null || o({ action: S, source: t, context: _ });
  }, b = (y) => {
    const S = {
      dispatch: f,
      domain: n,
      getState: g
    };
    m.emit({ action: y, source: t, context: S });
    const _ = i;
    i = r(i, y), i !== _ && u.emit();
  };
  return O({
    /** Store identifier (includes domain path, e.g., "app.auth.user") */
    name: t,
    /** Get current state */
    getState: g,
    /** Dispatch action or thunk */
    dispatch: f,
    /** Subscribe to state changes (only fires when state actually changes) */
    onChange: u.on,
    /** Subscribe to all dispatches (fires on every dispatch, even if no change) */
    onDispatch: m.on,
    /** @internal - Receives broadcasts from parent domain */
    _receiveDomainAction: b
  });
}
function X() {
  const t = /* @__PURE__ */ new Map(), e = /* @__PURE__ */ new Map();
  return { get: (o, s) => {
    const i = e.get(o) || o;
    if (t.has(i))
      return t.get(i);
    const u = i.create(s);
    return t.set(i, u), u;
  }, override: (o, s) => {
    if (t.has(o))
      throw new Error(
        `Cannot override module: Instance already created for ${o.name}`
      );
    return e.set(o, s), () => {
      e.delete(o);
    };
  } };
}
function N(t, e, r = X(), n) {
  const o = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set(), i = v(), u = v(), h = () => ({
    dispatch: b,
    get: y
  }), m = (c) => {
    u.emit(c), e == null || e(c);
  }, g = (c) => i.on(c), f = (c) => {
    const l = i.on(c), a = u.on(c);
    return () => {
      l(), a();
    };
  }, b = (c) => {
    if (typeof c == "function")
      return c(h());
    const l = c, a = h();
    i.emit({ action: l, source: t, context: a }), o.forEach((p) => p._receiveDomainAction(l)), s.forEach((p) => p._receiveDomainAction(l)), e == null || e({ action: l, source: t, context: a });
  }, z = (c) => {
    const l = h();
    i.emit({ action: c, source: t, context: l }), o.forEach((a) => a._receiveDomainAction(c)), s.forEach((a) => a._receiveDomainAction(c));
  }, y = (c) => r.get(c, A), S = (c, l) => r.override(c, l), _ = (c, l, a, p) => {
    const j = `${t}.${c}`;
    return J(j, l, a, p);
  };
  function D(c, l, a) {
    const p = `${t}.${c}`, j = W(
      p,
      l,
      a,
      h(),
      m
    );
    return o.add(j), j;
  }
  const A = O({
    name: t,
    root: null,
    // Placeholder, set below
    dispatch: b,
    get: y,
    override: S,
    onDispatch: g,
    onAnyDispatch: f,
    store: D,
    derived: _,
    domain: (c) => {
      const l = `${t}.${c}`, a = N(
        l,
        m,
        r,
        A.root
      );
      return s.add(a), a;
    },
    _receiveDomainAction: z
  });
  return A.root = n ?? A, A;
}
function et(t) {
  return N(t);
}
const rt = (t, e) => ({ name: t, create: e });
let E = 0;
function nt(t, e) {
  if (E++, E === 1) {
    const r = v();
    try {
      return k.use([q(r.on)], t);
    } finally {
      E--, k.use([q(r.on)], () => {
        const n = () => {
          for (; r.size() > 0; )
            r.emitAndClear();
        };
        e === "async" ? requestAnimationFrame(n) : n();
      });
    }
  }
  try {
    return t();
  } finally {
    E--;
  }
}
function Y(t) {
  const e = (...r) => ({ type: t, args: r });
  return Object.defineProperty(e, "type", { value: t, writable: !1 }), e;
}
function Z(t) {
  return (e, r) => {
    const n = t[r.type];
    return n ? n(e, ...r.args || []) : e;
  };
}
function T(t) {
  const e = {};
  for (const r in t)
    Object.prototype.hasOwnProperty.call(t, r) && (e[r] = Y(r));
  return e;
}
function ot(t) {
  return typeof t == "object" && t !== null;
}
function st(t, e) {
  const r = T(t), n = Z(t);
  return Object.assign(r, {
    reducer: (s, i) => "args" in i ? n(s, i) : e ? e(s, i) : s
  });
}
export {
  st as actions,
  nt as batch,
  Y as createActionCreator,
  T as createActionsFromMap,
  Z as createReducerFromMap,
  F as createStableFn,
  C as deepEqual,
  J as derived,
  et as domain,
  v as emitter,
  P as equality,
  ot as isReducerMap,
  G as isStableFn,
  rt as module,
  $ as resolveEquality,
  R as shallow2Equal,
  V as shallow3Equal,
  w as shallowEqual,
  L as strictEqual,
  tt as tryStabilize,
  O as withUse
};
