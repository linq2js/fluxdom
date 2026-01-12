var p = Object.defineProperty;
var m = (r, t, e) => t in r ? p(r, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : r[t] = e;
var s = (r, t, e) => m(r, typeof t != "symbol" ? t + "" : t, e);
function c(r) {
  return Object.assign(r, {
    use(t) {
      const e = t(r);
      return e ? typeof e == "object" || typeof e == "function" ? "use" in e ? e : c(e) : e : r;
    }
  });
}
class g {
  constructor(t, e, n, i) {
    s(this, "name");
    s(this, "state");
    s(this, "reducer");
    s(this, "listeners", /* @__PURE__ */ new Set());
    s(this, "dispatchListeners", /* @__PURE__ */ new Set());
    s(this, "domainContext");
    s(this, "use");
    // Handled by createPipeable
    s(this, "getState", () => this.state);
    s(this, "onChange", (t) => (this.listeners.add(t), () => this.listeners.delete(t)));
    s(this, "onDispatch", (t) => (this.dispatchListeners.add(t), () => this.dispatchListeners.delete(t)));
    s(this, "dispatch", (t) => {
      if (typeof t == "function") {
        const a = {
          dispatch: this.dispatch,
          domain: this.domainContext,
          getState: this.getState
        };
        return t(a);
      }
      const e = t, n = {
        dispatch: this.dispatch,
        domain: this.domainContext,
        getState: this.getState
      };
      this.dispatchListeners.forEach((a) => a(e, n));
      const i = this.state;
      this.state = this.reducer(this.state, e), this.state !== i && this.listeners.forEach((a) => a());
    });
    this.name = t, this.state = e, this.reducer = n, this.domainContext = i, c(this);
  }
  // Internal: Called by Domain to inject global actions
  _receiveDomainAction(t) {
    const e = {
      dispatch: this.dispatch,
      domain: this.domainContext,
      getState: this.getState
    };
    this.dispatchListeners.forEach((i) => i(t, e));
    const n = this.state;
    this.state = this.reducer(this.state, t), this.state !== n && this.listeners.forEach((i) => i());
  }
}
class u {
  constructor(t) {
    s(this, "name");
    s(this, "stores", /* @__PURE__ */ new Set());
    s(this, "subdomains", /* @__PURE__ */ new Set());
    s(this, "dispatchListeners", /* @__PURE__ */ new Set());
    // Module System
    s(this, "moduleCache", /* @__PURE__ */ new Map());
    s(this, "moduleOverrides", /* @__PURE__ */ new Map());
    s(this, "use");
    // --- Dispatch System ---
    s(this, "onDispatch", (t) => (this.dispatchListeners.add(t), () => this.dispatchListeners.delete(t)));
    s(this, "dispatch", (t) => {
      if (typeof t == "function")
        return t(this.getContext());
      const e = t, n = this.getContext();
      this.dispatchListeners.forEach((i) => i(e, n)), this.stores.forEach((i) => i._receiveDomainAction(e)), this.subdomains.forEach((i) => i.dispatch(e));
    });
    // --- Module System ---
    s(this, "get", (t) => {
      const e = this.moduleOverrides.get(t) || t;
      if (this.moduleCache.has(e))
        return this.moduleCache.get(e);
      const n = e(this);
      return this.moduleCache.set(e, n.service), n.service;
    });
    this.name = t, c(this);
  }
  // --- Context ---
  getContext() {
    return {
      dispatch: this.dispatch,
      get: this.get
    };
  }
  override(t, e) {
    return this.moduleOverrides.set(t, e), () => {
      this.moduleOverrides.delete(t);
    };
  }
  // --- Factory Methods ---
  store(t, e, n) {
    const i = new g(
      t,
      e,
      n,
      this.getContext()
    );
    return this.stores.add(i), i;
  }
  domain(t) {
    const e = new u(t);
    return this.subdomains.add(e), e;
  }
}
function S(r) {
  return new u(r);
}
function C(r, t, e) {
  const n = () => e(...t.map((o) => o.getState()));
  let i = n();
  const a = /* @__PURE__ */ new Set(), f = () => {
    const o = n();
    o !== i && (i = o, a.forEach((h) => h()));
  };
  t.forEach((o) => o.onChange(f));
  const d = {
    name: r,
    dependencies: t,
    getState: () => i,
    onChange: (o) => (a.add(o), () => a.delete(o)),
    use(o) {
      const h = o(d);
      return h ? typeof h == "object" || typeof h == "function" ? "use" in h ? h : c(h) : h : d;
    }
  };
  return d;
}
export {
  C as derived,
  S as domain
};
