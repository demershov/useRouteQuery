import {
  customRef,
  nextTick,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { tryOnScopeDispose } from "@/utils/tryOnScopeDispose";
import { areQueryValuesEqual } from "@/utils/areQueryValuesEqual";

import type {
  GetQueryValue,
  Queue,
  RouteQueryOptions,
  SetQueryValue,
} from "@/types";

const _queue: Queue = new WeakMap();

// export function useRouteQuery(
//   name: string,
//   defaultValue?: MaybeRefOrGetter<string | null>,
//   options?: RouteQueryOptions<string | null>
// ): Ref<string | null>;

export function useRouteQuery<T>(
  name: string,
  defaultValue?: MaybeRefOrGetter<T>,
  options?: RouteQueryOptions<T>
): Ref<T>;

export function useRouteQuery<T extends unknown>(
  name: string,
  defaultValue: MaybeRefOrGetter<T>,
  options: RouteQueryOptions<T> = {}
): Ref<T> {
  const { mode = "push", route = useRoute(), router = useRouter() } = options;

  const transformFromQuery =
    options.transform?.get ?? ((v: GetQueryValue) => v as T);
  const transformToQuery =
    options.transform?.set ?? ((v: T) => v as SetQueryValue);

  if (!_queue.has(router)) {
    _queue.set(router, new Map());
  }

  const queriesQueue = _queue.get(router)!;

  let cachedValue: T | undefined;
  let cachedRawValue: SetQueryValue;

  if (name in route.query) {
    const initialQueryValue = route.query[name]!;
    cachedRawValue = initialQueryValue;
    cachedValue = transformFromQuery(initialQueryValue);
  }

  tryOnScopeDispose(() => {
    cachedValue = undefined;
    cachedRawValue = undefined;
  });

  let _trigger = () => {};

  const proxy = customRef<T>((track, trigger) => {
    _trigger = trigger;

    return {
      get() {
        track();
        return cachedValue !== undefined ? cachedValue : toValue(defaultValue);
      },

      set(newValue: T) {
        const newQueryRawValue = transformToQuery(newValue);

        if (areQueryValuesEqual(newQueryRawValue, cachedRawValue)) {
          return;
        }

        cachedValue = newValue;
        cachedRawValue = newQueryRawValue;

        queriesQueue.set(name, newQueryRawValue);

        trigger();

        nextTick(() => {
          if (queriesQueue.size === 0) return;

          const { params, query, hash } = route;
          const newQueries: Record<string, SetQueryValue> = { ...query };

          for (const [key, value] of queriesQueue.entries()) {
            newQueries[key] = value;
          }

          queriesQueue.clear();

          router[mode]({
            params,
            query: newQueries,
            hash,
          });
        });
      },
    };
  });

  watch(
    () => route.query[name],
    (newQueryString: GetQueryValue | undefined) => {
      if (areQueryValuesEqual(newQueryString, cachedRawValue)) {
        return;
      }

      cachedRawValue = newQueryString;

      if (newQueryString !== undefined) {
        cachedValue = transformFromQuery(newQueryString);
      } else {
        cachedValue = undefined;
      }

      _trigger();
    },
    { flush: "sync" }
  );

  return proxy;
}
