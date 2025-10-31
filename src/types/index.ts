import {
  type Router,
  type RouteLocationNormalizedLoadedGeneric,
  type LocationQueryValue,
  type LocationQueryValueRaw,
} from "vue-router";

export type GetQueryValue = LocationQueryValue | LocationQueryValue[];
export type SetQueryValue =
  | Exclude<LocationQueryValueRaw, number>
  | Exclude<LocationQueryValueRaw, number>[];

export interface RouteQueryTransform<T> {
  get: (value: GetQueryValue) => T;
  set: (value: T) => SetQueryValue;
}

export interface RouteQueryOptions<T = unknown> {
  /**
   * @default "push"
   */
  mode?: "push" | "replace";
  /**
   * @default useRoute()
   */
  route?: RouteLocationNormalizedLoadedGeneric;

  /**
   * @default useRouter()
   */
  router?: Router;

  /**
   *
   */
  transform?: RouteQueryTransform<T>;
}

export type Queue = WeakMap<Router, Map<string, SetQueryValue>>;
