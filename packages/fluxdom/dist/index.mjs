var U = Object.defineProperty;
var L = (e, t, r) => t in e ? U(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var d = (e, t, r) => L(e, typeof t != "symbol" ? t + "" : t, r);
function O(e) {
  return Object.assign(e, {
    use(t) {
      const r = t(e);
      return r ? typeof r == "object" || typeof r == "function" ? "use" in r ? r : O(r) : r : e;
    }
  });
}
const R = () => {
};
class V {
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
      let n;
      if (r === void 0)
        n = Array.isArray(t) ? t : [t];
      else {
        const s = t, i = Array.isArray(r) ? r : [r];
        n = [
          (u) => {
            const h = s(u);
            if (h)
              for (let y = 0; y < i.length; y++)
                i[y](h.value);
          }
        ];
      }
      if (this._isSettled) {
        const s = this._settledPayload;
        for (let i = 0; i < n.length; i++)
          n[i](s);
        return R;
      }
      const o = this._listeners;
      for (let s = 0; s < n.length; s++)
        o.add(n[s]);
      return () => {
        for (let s = 0; s < n.length; s++)
          o.delete(n[s]);
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
    d(this, "_doEmit", (t, r, n) => {
      const o = this._listeners, s = o.size;
      if (s === 0) return;
      const i = Array.from(o);
      if (r && o.clear(), n)
        for (let u = s - 1; u >= 0; u--)
          i[u](t);
      else
        for (let u = 0; u < s; u++)
          i[u](t);
    });
    this._listeners = new Set(t);
  }
}
function v(e) {
  return new V(e);
}
function G(e, t) {
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
function J(e, t) {
  return D(e, t, I);
}
function k(e, t) {
  if (Object.is(e, t)) return !0;
  if (typeof e != "object" || e === null || typeof t != "object" || t === null)
    return !1;
  if (Array.isArray(e)) {
    if (!Array.isArray(t) || e.length !== t.length) return !1;
    for (let o = 0; o < e.length; o++)
      if (!k(e[o], t[o])) return !1;
    return !0;
  }
  if (Array.isArray(t)) return !1;
  const r = Object.keys(e), n = Object.keys(t);
  if (r.length !== n.length) return !1;
  for (const o of r)
    if (!Object.prototype.hasOwnProperty.call(t, o) || !k(e[o], t[o]))
      return !1;
  return !0;
}
function z(e) {
  return !e || e === "strict" ? G : e === "shallow" ? D : e === "shallow2" ? I : e === "shallow3" ? J : e === "deep" ? k : e;
}
function x(e) {
  return z(e);
}
function N(e) {
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
function K(e) {
  return typeof e == "function" && "getOriginal" in e && "getCurrent" in e && "setCurrent" in e;
}
function P(e, t, r) {
  return e ? typeof t == "function" ? K(e.value) ? (e.value.setCurrent(t), [e.value, !0]) : [N(t), !1] : t && t instanceof Date ? e.value && e.value instanceof Date && t.getTime() === e.value.getTime() ? [e.value, !0] : [t, !1] : r(e.value, t) ? [e.value, !0] : [t, !1] : typeof t == "function" ? [N(t), !1] : [t, !1];
}
function Q(e, t, r, n) {
  let o;
  const s = v(), i = z(n || "strict"), u = () => r(...t.map((f) => f.getState())), h = () => {
    if (s.size() > 0) {
      const f = u();
      (!o || !i(o.value, f)) && (o = { value: f }, s.emit());
    } else
      o = void 0;
  };
  return t.forEach((f) => f.onChange(h)), O({
    name: e,
    dependencies: t,
    getState: () => (o || (o = { value: u() }), o.value),
    onChange: (f) => s.on(f)
  });
}
function W(e) {
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
function X(e, t) {
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
const q = Object.assign(W, { use: X }), $ = q((e) => e());
function Y(e, t, r, n, o, s = "strict") {
  let i = t;
  const u = v(), h = z(s), y = v(), g = () => i, f = (m) => {
    if (typeof m == "function")
      return m({
        dispatch: f,
        domain: n,
        getState: g
      });
    const p = m, _ = {
      dispatch: f,
      domain: n,
      getState: g
    };
    y.emit({ action: p, source: e, context: _ });
    const C = i;
    i = r(i, p), h(i, C) || $.current(u.emit), o == null || o({ action: p, source: e, context: _ });
  }, E = (m) => {
    const p = {
      dispatch: f,
      domain: n,
      getState: g
    };
    y.emit({ action: m, source: e, context: p });
    const _ = i;
    i = r(i, m), i !== _ && u.emit();
  };
  return O({
    /** Store identifier (includes domain path, e.g., "app.auth.user") */
    name: e,
    /** Get current state */
    getState: g,
    /** Dispatch action or thunk */
    dispatch: f,
    /** Subscribe to state changes (only fires when state actually changes) */
    onChange: u.on,
    /** Subscribe to all dispatches (fires on every dispatch, even if no change) */
    onDispatch: y.on,
    /** @internal - Receives broadcasts from parent domain */
    _receiveDomainAction: E
  });
}
function Z() {
  const e = /* @__PURE__ */ new Map(), t = /* @__PURE__ */ new Map();
  return { get: (o, s) => {
    const i = t.get(o) || o;
    if (e.has(i))
      return e.get(i);
    const u = i.create(s);
    return e.set(i, u), u;
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
function B(e, t, r = Z(), n) {
  const o = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set(), i = v(), u = v(), h = () => ({
    dispatch: E,
    get: m
  }), y = (c) => {
    u.emit(c), t == null || t(c);
  }, g = (c) => i.on(c), f = (c) => {
    const l = i.on(c), a = u.on(c);
    return () => {
      l(), a();
    };
  }, E = (c) => {
    if (typeof c == "function")
      return c(h());
    const l = c, a = h();
    i.emit({ action: l, source: e, context: a }), o.forEach((S) => S._receiveDomainAction(l)), s.forEach((S) => S._receiveDomainAction(l)), t == null || t({ action: l, source: e, context: a });
  }, F = (c) => {
    const l = h();
    i.emit({ action: c, source: e, context: l }), o.forEach((a) => a._receiveDomainAction(c)), s.forEach((a) => a._receiveDomainAction(c));
  }, m = (c) => r.get(c, A), p = (c, l) => r.override(c, l), _ = (c, l, a, S) => {
    const j = `${e}.${c}`;
    return Q(j, l, a, S);
  };
  function C(c, l, a) {
    const S = `${e}.${c}`, j = Y(
      S,
      l,
      a,
      h(),
      y
    );
    return o.add(j), j;
  }
  const A = O({
    name: e,
    root: null,
    // Placeholder, set below
    dispatch: E,
    get: m,
    override: p,
    onDispatch: g,
    onAnyDispatch: f,
    store: C,
    derived: _,
    domain: (c) => {
      const l = `${e}.${c}`, a = B(
        l,
        y,
        r,
        A.root
      );
      return s.add(a), a;
    },
    _receiveDomainAction: F
  });
  return A.root = n ?? A, A;
}
function tt(e) {
  return B(e);
}
const et = (e, t) => ({ name: e, create: t });
let w = 0;
function rt(e, t) {
  if (w++, w === 1) {
    const r = v();
    try {
      return q.use([$(r.on)], e);
    } finally {
      w--, q.use([$(r.on)], () => {
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
    w--;
  }
}
function b(e, t) {
  const r = (...n) => ({
    type: e,
    payload: t ? t(...n) : void 0
  });
  return r.type = e, r.match = (n) => n.type === e, r;
}
function M(e) {
  const t = {};
  for (const r in e)
    if (Object.prototype.hasOwnProperty.call(e, r)) {
      const n = e[r];
      n === !0 ? t[r] = b(r) : typeof n == "string" ? t[r] = b(n) : typeof n == "function" ? t[r] = b(r, n) : typeof n == "object" && n !== null && (t[r] = b(n.type, n.prepare));
    }
  return t;
}
M.reducer = function(t, r) {
  return r;
};
export {
  M as actions,
  rt as batch,
  N as createStableFn,
  k as deepEqual,
  Q as derived,
  tt as domain,
  v as emitter,
  x as equality,
  K as isStableFn,
  et as module,
  z as resolveEquality,
  I as shallow2Equal,
  J as shallow3Equal,
  D as shallowEqual,
  G as strictEqual,
  P as tryStabilize,
  O as withUse
};
