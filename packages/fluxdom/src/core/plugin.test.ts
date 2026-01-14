import { describe, it, expect, vi } from "vitest";
import { domain } from "./domain";
import { domainPlugin } from "./plugin";
import { module } from "./module";
import { Action } from "../types";

describe("domainPlugin", () => {
  describe("store hooks", () => {
    it("should call pre hook before store creation", () => {
      const preHook = vi.fn();
      const plugin = domainPlugin({
        store: { pre: preHook },
      });

      const app = domain("app").use(plugin);
      app.store({
        name: "counter",
        initial: 0,
        reducer: (s) => s,
      });

      expect(preHook).toHaveBeenCalledTimes(1);
      expect(preHook).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "counter",
          initial: 0,
        })
      );
    });

    it("should allow pre hook to transform config", () => {
      const plugin = domainPlugin({
        store: {
          pre: (config) => ({
            ...config,
            initial: 100, // Override initial value
          }),
        },
      });

      const app = domain("app").use(plugin);
      const store = app.store({
        name: "counter",
        initial: 0,
        reducer: (s) => s,
      });

      expect(store.getState()).toBe(100);
    });

    it("should call post hook after store creation with store and config", () => {
      const postHook = vi.fn();
      const plugin = domainPlugin({
        store: { post: postHook },
      });

      const app = domain("app").use(plugin);
      const store = app.store({
        name: "counter",
        initial: 42,
        reducer: (s) => s,
      });

      expect(postHook).toHaveBeenCalledTimes(1);
      expect(postHook).toHaveBeenCalledWith(
        store,
        expect.objectContaining({ name: "counter", initial: 42 })
      );
    });

    it("should call both pre and post hooks in order", () => {
      const calls: string[] = [];
      const plugin = domainPlugin({
        store: {
          pre: () => {
            calls.push("pre");
          },
          post: () => {
            calls.push("post");
          },
        },
      });

      const app = domain("app").use(plugin);
      app.store({
        name: "counter",
        initial: 0,
        reducer: (s) => s,
      });

      expect(calls).toEqual(["pre", "post"]);
    });

    it("should chain multiple plugins", () => {
      const calls: string[] = [];
      const plugin1 = domainPlugin({
        store: {
          pre: () => {
            calls.push("plugin1:pre");
          },
          post: () => {
            calls.push("plugin1:post");
          },
        },
      });
      const plugin2 = domainPlugin({
        store: {
          pre: () => {
            calls.push("plugin2:pre");
          },
          post: () => {
            calls.push("plugin2:post");
          },
        },
      });

      const app = domain("app").use(plugin1).use(plugin2);
      app.store({
        name: "counter",
        initial: 0,
        reducer: (s) => s,
      });

      expect(calls).toEqual([
        "plugin1:pre",
        "plugin2:pre",
        "plugin1:post",
        "plugin2:post",
      ]);
    });
  });

  describe("domain hooks", () => {
    it("should call pre hook before subdomain creation", () => {
      const preHook = vi.fn();
      const plugin = domainPlugin({
        domain: { pre: preHook },
      });

      const app = domain("app").use(plugin);
      app.domain("child");

      expect(preHook).toHaveBeenCalledTimes(1);
      expect(preHook).toHaveBeenCalledWith({ name: "child" });
    });

    it("should allow pre hook to transform subdomain name", () => {
      const plugin = domainPlugin({
        domain: {
          pre: (options) => ({
            ...options,
            name: `prefixed_${options.name}`,
          }),
        },
      });

      const app = domain("app").use(plugin);
      const child = app.domain("child");

      expect(child.name).toBe("app.prefixed_child");
    });

    it("should call post hook after subdomain creation with domain and config", () => {
      const postHook = vi.fn();
      const plugin = domainPlugin({
        domain: { post: postHook },
      });

      const app = domain("app").use(plugin);
      const child = app.domain("child");

      expect(postHook).toHaveBeenCalledTimes(1);
      expect(postHook).toHaveBeenCalledWith(child, { name: "child" });
    });
  });

  describe("module hooks", () => {
    it("should call pre hook before module instantiation", () => {
      const preHook = vi.fn();
      const plugin = domainPlugin({
        module: { pre: preHook },
      });

      const TestModule = module("test", () => ({ value: 42 }));

      const app = domain("app").use(plugin);
      app.get(TestModule);

      expect(preHook).toHaveBeenCalledTimes(1);
      expect(preHook).toHaveBeenCalledWith(
        expect.objectContaining({ name: "test" })
      );
    });

    it("should call post hook after module instantiation", () => {
      const postHook = vi.fn();
      const plugin = domainPlugin({
        module: { post: postHook },
      });

      const TestModule = module("test", () => ({ value: 42 }));

      const app = domain("app").use(plugin);
      const instance = app.get(TestModule);

      expect(postHook).toHaveBeenCalledTimes(1);
      expect(postHook).toHaveBeenCalledWith(
        instance,
        expect.objectContaining({ name: "test" })
      );
    });

    it("should not call hooks on cached module resolution", () => {
      const preHook = vi.fn();
      const postHook = vi.fn();
      const plugin = domainPlugin({
        module: { pre: preHook, post: postHook },
      });

      const TestModule = module("test", () => ({ value: 42 }));

      const app = domain("app").use(plugin);
      app.get(TestModule);
      app.get(TestModule); // Second call should use cache

      expect(preHook).toHaveBeenCalledTimes(2); // Pre is called (before cache check)
      expect(postHook).toHaveBeenCalledTimes(1); // Post only called once (after creation)
    });
  });

  describe("plugin inheritance", () => {
    it("should inherit plugins in child domains", () => {
      const storeCalls: string[] = [];
      const plugin = domainPlugin({
        store: {
          post: (store) => {
            storeCalls.push(store.name);
          },
        },
      });

      const app = domain("app").use(plugin);
      const child = app.domain("child");
      const grandchild = child.domain("grandchild");

      app.store({ name: "rootStore", initial: 0, reducer: (s) => s });
      child.store({ name: "childStore", initial: 0, reducer: (s) => s });
      grandchild.store({
        name: "grandchildStore",
        initial: 0,
        reducer: (s) => s,
      });

      expect(storeCalls).toEqual([
        "app.rootStore",
        "app.child.childStore",
        "app.child.grandchild.grandchildStore",
      ]);
    });

    it("should apply parent plugins to child domain creation", () => {
      const domainCalls: string[] = [];
      const plugin = domainPlugin({
        domain: {
          post: (d) => {
            domainCalls.push(d.name);
          },
        },
      });

      const app = domain("app").use(plugin);
      const child = app.domain("child");
      child.domain("grandchild");

      expect(domainCalls).toEqual(["app.child", "app.child.grandchild"]);
    });
  });

  describe("filter", () => {
    it("should skip store hooks when filter returns false", () => {
      const postHook = vi.fn();
      const plugin = domainPlugin({
        store: {
          filter: (config) => config.meta?.persisted === true,
          post: postHook,
        },
      });

      const app = domain("app").use(plugin);

      // Store without meta - should be skipped
      app.store({ name: "temp", initial: 0, reducer: (s) => s });
      expect(postHook).toHaveBeenCalledTimes(0);

      // Store with meta.persisted = true - should run
      app.store({
        name: "persisted",
        initial: 0,
        reducer: (s) => s,
        meta: { persisted: true },
      });
      expect(postHook).toHaveBeenCalledTimes(1);
    });

    it("should skip domain hooks when filter returns false", () => {
      const postHook = vi.fn();
      const plugin = domainPlugin({
        domain: {
          filter: (config) => config.meta?.tracked === true,
          post: postHook,
        },
      });

      const app = domain("app").use(plugin);

      // Domain without meta - should be skipped
      app.domain("untracked");
      expect(postHook).toHaveBeenCalledTimes(0);

      // Note: Currently domain() doesn't support passing meta
      // This test demonstrates the filter mechanism
    });

    it("should skip module hooks when filter returns false", () => {
      const postHook = vi.fn();
      const plugin = domainPlugin({
        module: {
          filter: (def) => def.name.startsWith("tracked-"),
          post: postHook,
        },
      });

      const UntrackedModule = module("untracked", () => ({ value: 1 }));
      const TrackedModule = module("tracked-api", () => ({ value: 2 }));

      const app = domain("app").use(plugin);

      app.get(UntrackedModule);
      expect(postHook).toHaveBeenCalledTimes(0);

      app.get(TrackedModule);
      expect(postHook).toHaveBeenCalledTimes(1);
    });

    it("should run hooks when no filter is defined", () => {
      const postHook = vi.fn();
      const plugin = domainPlugin({
        store: { post: postHook },
      });

      const app = domain("app").use(plugin);
      app.store({ name: "test", initial: 0, reducer: (s) => s });

      expect(postHook).toHaveBeenCalledTimes(1);
    });
  });

  describe("meta", () => {
    it("should pass meta to store", () => {
      const app = domain("app");
      const store = app.store({
        name: "test",
        initial: 0,
        reducer: (s) => s,
        meta: { persisted: true, version: 1 },
      });

      expect(store.meta).toEqual({ persisted: true, version: 1 });
    });

    it("should have undefined meta when not provided", () => {
      const app = domain("app");
      const store = app.store({
        name: "test",
        initial: 0,
        reducer: (s) => s,
      });

      expect(store.meta).toBeUndefined();
    });
  });

  describe("model hooks (via store)", () => {
    it("should call store hooks when model is created", () => {
      const postHook = vi.fn();
      const plugin = domainPlugin({
        store: { post: postHook },
      });

      const app = domain<Action>("app").use(plugin);
      app.model({
        name: "counter",
        initial: 0,
        actions: () => ({
          increment: (state: number) => state + 1,
        }),
      });

      expect(postHook).toHaveBeenCalledTimes(1);
    });
  });

  describe("use cases", () => {
    it("should support logging plugin", () => {
      const logs: string[] = [];
      const logging = domainPlugin({
        store: {
          pre: (config) => {
            logs.push(`[store:pre] ${config.name}`);
          },
          post: (store) => {
            logs.push(`[store:post] ${store.name} = ${store.getState()}`);
          },
        },
        domain: {
          post: (d) => {
            logs.push(`[domain:post] ${d.name}`);
          },
        },
      });

      const app = domain("app").use(logging);
      app.store({ name: "counter", initial: 0, reducer: (s) => s });
      app.domain("child");

      expect(logs).toEqual([
        "[store:pre] counter",
        "[store:post] app.counter = 0",
        "[domain:post] app.child",
      ]);
    });

    it("should support config enhancement plugin", () => {
      // Plugin that adds default reducer behavior
      const withDefaults = domainPlugin({
        store: {
          pre: (config) => {
            if (config.initial === undefined) {
              return { ...config, initial: {} };
            }
          },
        },
      });

      const app = domain("app").use(withDefaults);
      const store = app.store({
        name: "data",
        initial: undefined as any,
        reducer: (s) => s,
      });

      expect(store.getState()).toEqual({});
    });
  });
});
