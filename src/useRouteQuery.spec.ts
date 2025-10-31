import type { Ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import {
  computed,
  ref,
  effectScope,
  nextTick,
  reactive,
  toValue,
  watch,
} from "vue";
import { useRouteQuery } from "./useRouteQuery";

describe("useRouteQuery", () => {
  const getRoute = (query: Record<string, any> = {}) =>
    reactive({
      query,
      fullPath: "",
      hash: "",
      matched: [],
      meta: {},
      name: "",
      params: {},
      path: "",
      redirectedFrom: undefined,
    });

  it("should export", () => {
    expect(useRouteQuery).toBeDefined();
  });

  it("should return transformed value", () => {
    const router = {} as any;
    const route = getRoute({
      search: "vue3",
      page: "1",
    });

    const transform = {
      get: (v: any) => Number(v),
      set: (v: number) => String(v),
    };
    const toArray = {
      get: (param: any) => (Array.isArray(param) ? param : [param]),
      set: (v: any) => v,
    };

    const page = useRouteQuery<number>("page", 1, { transform, route, router });
    const perPage = useRouteQuery<number>("perPage", 15, {
      transform,
      route,
      router,
    });
    const tags = useRouteQuery("tags", [], {
      transform: toArray,
      route: getRoute({ tags: "vite" }),
      router,
    });

    expect(page.value).toBe(1);
    expect(perPage.value).toBe(15);
    expect(tags.value).toEqual(["vite"]);
  });

  it("should handle transform get/set", async () => {
    let route = getRoute({
      serialized: '{"foo":"bar"}',
    });
    const router = { push: (r: any) => (route = r), replace: vi.fn() } as any;
    const object = useRouteQuery("serialized", undefined, {
      transform: {
        get: (value: any) => JSON.parse(value),
        set: (value: any) => JSON.stringify(value),
      },
      router,
      route,
    });

    expect(object.value).toEqual({ foo: "bar" });
    object.value = { foo: "baz" };
    await nextTick();
    expect(route.query.serialized).toBe('{"foo":"baz"}');
    expect(object.value).toEqual({ foo: "baz" });
  });

  it("should handle dispose scope", async () => {
    let route = getRoute();
    const router = { push: (r: any) => (route = r), replace: vi.fn() } as any;
    const scopeA = effectScope();
    const scopeB = effectScope();

    route.query.page = 2;
    const defaultPage = 1;

    let page1: Ref<number> = ref(0);
    await scopeA.run(async () => {
      page1 = useRouteQuery("page", defaultPage, { route, router });
    });
    let page2: Ref<number> = ref(0);
    await scopeB.run(async () => {
      page2 = useRouteQuery("page", defaultPage, { route, router });
    });

    expect(page1.value).toBe(2);
    expect(page2.value).toBe(2);

    scopeA.stop();
    await nextTick();
    expect(page1.value).toBe(defaultPage);
    expect(page2.value).toBe(2);
  });

  it("should change the value when the route changes", () => {
    let route = getRoute();
    const router = {} as any;
    const search = useRouteQuery("search", "", { route, router });

    expect(search.value).toBe("");
    route.query.search = "vue3";
    expect(search.value).toBe("vue3");
  });

  it("should handle undefined query value from route changes", async () => {
    let route = getRoute({ search: "vue" });
    const routerPush = vi.fn((r: any) => Object.assign(route, r));
    const router = { push: routerPush, replace: vi.fn() } as any;

    const search = useRouteQuery("search", "default", { route, router });

    expect(search.value).toBe("vue");

    route.query.search = undefined;
    await nextTick();

    expect(search.value).toBe("default");
  });

  it("should support setting to undefined or null", async () => {
    let route = getRoute({
      search: "vue3",
    });
    const router = { push: (r: any) => (route = r), replace: vi.fn() } as any;
    const search: Ref<any> = useRouteQuery("search", "default", {
      route,
      router,
    });

    expect(search.value).toBe("vue3");
    expect(route.query.search).toBe("vue3");

    search.value = null;
    await nextTick();
    expect(route.query.search).toBeNull();

    search.value = undefined;
    await nextTick();
    expect(route.query.search).toBeUndefined();
  });

  it("should avoid trigger effects when the value doesn't change", async () => {
    let route = getRoute({ page: "1" });
    const router = { push: (r: any) => (route = r), replace: vi.fn() } as any;
    const onUpdate = vi.fn();
    const page = useRouteQuery("page", 1, {
      transform: {
        get: (v: any) => Number(v),
        set: (v: number) => String(v),
      },
      route,
      router,
    });
    watch(page, onUpdate);

    page.value = 1;
    await nextTick();
    expect(page.value).toBe(1);
    expect(route.query.page).toBe("1");
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("should trigger effects only once", async () => {
    const route = getRoute();
    const router = {
      push: (r: any) => Object.assign(route, r),
      replace: vi.fn(),
    } as any;
    const onUpdate = vi.fn();
    const page = useRouteQuery("page", 1, {
      transform: {
        get: (v: any) => Number(v),
        set: (v: number) => String(v),
      },
      route,
      router,
    });
    const pageObj = computed(() => ({
      page: page.value,
    }));
    watch(pageObj, onUpdate);

    page.value = 2;
    await nextTick();
    await nextTick();
    expect(page.value).toBe(2);
    expect(route.query.page).toBe("2");
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("should keep current query and hash", async () => {
    let route = getRoute();
    const router = { push: (r: any) => (route = r), replace: vi.fn() } as any;
    route.params = { foo: "bar" };
    route.hash = "#hash";

    const id: Ref<any> = useRouteQuery("id", null, { route, router });
    id.value = "2";
    await nextTick();

    expect(id.value).toBe("2");
    expect(route.hash).toBe("#hash");
    expect(route.params).toEqual({ foo: "bar" });
  });

  it("should reset value to undefined when set to undefined value", async () => {
    let route = getRoute({
      search: "vue3",
    });
    const router = { push: (r: any) => (route = r), replace: vi.fn() } as any;
    const search: Ref<any> = useRouteQuery("search", "default", {
      route,
      router,
    });

    expect(search.value).toBe("vue3");
    expect(route.query.search).toBe("vue3");

    search.value = toValue(undefined);
    await nextTick();
    expect(route.query.search).toBeUndefined();
  });

  it("should reset value to null when set to null value", async () => {
    let route = getRoute({
      search: "vue3",
    });
    const router = { push: (r: any) => (route = r), replace: vi.fn() } as any;
    const search: Ref<any> = useRouteQuery("search", "default", {
      route,
      router,
    });

    expect(search.value).toBe("vue3");
    expect(route.query.search).toBe("vue3");

    search.value = toValue(null);
    await nextTick();
    expect(route.query.search).toBeNull();
  });

  it("should allow setting value equal to default", async () => {
    let route = getRoute();
    const router = { push: (r: any) => (route = r), replace: vi.fn() } as any;
    const page: Ref<any> = useRouteQuery("page", 1, {
      transform: {
        get: (v: any) => Number(v),
        set: (v: number) => String(v),
      },
      route,
      router,
    });

    expect(page.value).toBe(1);
    expect(route.query.page).toBeUndefined();

    // Setting to default value should update the query
    page.value = 1;
    await nextTick();
    expect(page.value).toBe(1);
    expect(route.query.page).toBe("1");
  });

  it("should allow setting value equal to default with string", async () => {
    let route = getRoute();
    const router = { push: (r: any) => (route = r), replace: vi.fn() } as any;
    const search: Ref<any> = useRouteQuery("search", "default", {
      route,
      router,
    });

    expect(search.value).toBe("default");
    expect(route.query.search).toBeUndefined();

    // Setting to default value should update the query
    search.value = "default";
    await nextTick();
    expect(search.value).toBe("default");
    expect(route.query.search).toBe("default");
  });

  it("should allow setting value equal to default with array", async () => {
    let route = getRoute();
    const router = { push: (r: any) => (route = r), replace: vi.fn() } as any;
    const tags: Ref<string[]> = useRouteQuery("tags", ["vue"], {
      route,
      router,
    });

    expect(tags.value).toEqual(["vue"]);
    expect(route.query.tags).toBeUndefined();

    tags.value = ["vue"];
    await nextTick();
    expect(tags.value).toEqual(["vue"]);
    expect(route.query.tags).toEqual(["vue"]);
  });

  it("should handle changes from route query directly", async () => {
    const route = getRoute();
    const router = {
      push: (r: any) => Object.assign(route, r),
      replace: vi.fn(),
    } as any;
    const page = useRouteQuery("page", 1, {
      transform: {
        get: (v: any) => Number(v),
        set: (v: number) => String(v),
      },
      route,
      router,
    });

    expect(page.value).toBe(1);

    // Change from route
    route.query.page = "5";
    expect(page.value).toBe(5);

    // Change back to default
    route.query.page = "1";
    expect(page.value).toBe(1);
  });

  it("should use replace mode when specified", async () => {
    let route = getRoute();
    const replaceFn = vi.fn((r: any) => (route = r));
    const pushFn = vi.fn();
    const router = { replace: replaceFn, push: pushFn } as any;

    const page = useRouteQuery("page", 1, {
      transform: {
        get: (v: any) => Number(v),
        set: (v: number) => String(v),
      },
      mode: "replace",
      route,
      router,
    });

    page.value = 2;
    await nextTick();

    expect(replaceFn).toHaveBeenCalled();
    expect(pushFn).not.toHaveBeenCalled();
  });

  it("should use push mode by default when not specified", async () => {
    let route = getRoute();
    const replaceFn = vi.fn();
    const pushFn = vi.fn((r: any) => (route = r));
    const router = { replace: replaceFn, push: pushFn } as any;

    const page = useRouteQuery("page", 1, {
      transform: {
        get: (v: any) => Number(v),
        set: (v: number) => String(v),
      },
      route,
      router,
    });

    page.value = 2;
    await nextTick();

    expect(pushFn).toHaveBeenCalled();
    expect(replaceFn).not.toHaveBeenCalled();
  });

  it("should use push mode when specified", async () => {
    let route = getRoute();
    const replaceFn = vi.fn();
    const pushFn = vi.fn((r: any) => (route = r));
    const router = { replace: replaceFn, push: pushFn } as any;

    const page = useRouteQuery("page", 1, {
      transform: {
        get: (v: any) => Number(v),
        set: (v: number) => String(v),
      },
      mode: "push",
      route,
      router,
    });

    page.value = 2;
    await nextTick();

    expect(pushFn).toHaveBeenCalled();
    expect(replaceFn).not.toHaveBeenCalled();
  });

  it("should skip router update when queue is empty", async () => {
    let route = getRoute();
    const routerPush = vi.fn((r: any) => Object.assign(route, r));
    const router = { push: routerPush, replace: vi.fn() } as any;

    const a = useRouteQuery("a", "", { route, router });
    const b = useRouteQuery("b", "", { route, router });

    a.value = "1";
    b.value = "2";

    await nextTick();

    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(route.query.a).toBe("1");
    expect(route.query.b).toBe("2");
  });
});
