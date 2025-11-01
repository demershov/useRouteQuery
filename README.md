# useRouteQuery
![npm version](https://img.shields.io/npm/v/@demershov/use-route-query.svg)

A small Vue 3 composable for syncing a reactive value with the route query while avoiding unnecessary object churn from transformer functions.

This library was inspired by `@vueuse/router`'s `useRouteQuery`. The motivating issue is that when a transformer (the `transform` option) returns a non-primitive (an object or array), it may produce a new object instance even if its contents haven't changed. Since Vue compares refs by identity, returning a new object causes downstream components that receive the reactive value as a prop to re-render even when the logical value is unchanged. 

The author found this behavior undesirable and implemented this library to avoid always returning a new object when a transformer produces an object that is semantically equal to the previous one.

Additional motivation and typing differences:

- In `@vueuse/router` the default value is often treated as a primitive. In contrast, this implementation types `defaultValue` as `T` (matching the value returned by `transform.get`). That allows passing typed defaults (objects or primitives) so the returned `Ref` has a clear `T` type.
- In this implementation the URL may contain the default value if the user explicitly sets it. That means default values are not implicitly hidden from the URL — if your app writes the default into the query, it will appear in the route.

For more details and discussion about the underlying problem see:

- https://github.com/vuejs/docs/issues/2884
- https://github.com/vueuse/vueuse/issues/3992

## Key idea

- Provide a composable `useRouteQuery(name, defaultValue?, options?)` that returns a `Ref<T>`.
- If you supply `options.transform.get` / `options.transform.set`, the library uses them but keeps an internal cache of the raw query and compares raw values to avoid exposing a new object when the logical value hasn't changed.

## API

```ts
function useRouteQuery<T>(
  name: string,
  defaultValue?: MaybeRefOrGetter<T>,
  options?: RouteQueryOptions<T>
): Ref<T>
```

- `name` — query parameter name
- `defaultValue` — default value when the query param is absent
- `options` — optional settings:
  - `mode` — `'push' | 'replace'` (defaults to `'push'`)
  - `route` — custom route (defaults to `useRoute()`)
  - `router` — custom router (defaults to `useRouter()`)
  - `transform` — `{ get?: (v: string | string[] | undefined) => T, set?: (v: T) => string | string[] | undefined }`

## Examples

Basic usage (string query):

```ts
import { useRouteQuery } from "useRouteQuery";

const q = useRouteQuery("q", "");
// q is a Ref<string>

// read
console.log(q.value);

// write
q.value = "search term";
```

Using a transformer for a primitive:

```ts
import { useRouteQuery } from "useRouteQuery";

const page = useRouteQuery<number>("page", 1, {
  transform: {
    get: (v) => (v === undefined ? 1 : Number(v)),
    set: (n) => (n === undefined ? undefined : String(n)),
  },
});

// page.value is a number
```

Using a transformer that returns an object (safe from unnecessary rerenders):

```ts
import { useRouteQuery } from "useRouteQuery";

const filter = useRouteQuery("filter", { text: "" }, {
  transform: {
    get: (v) => {
      // parse query string into an object
      if (!v) return { text: "" };
      try {
        return JSON.parse(Array.isArray(v) ? v[0] : v);
      } catch {
        return { text: String(v) };
      }
    },
    set: (obj) => {
      try {
        return JSON.stringify(obj);
      } catch {
        return undefined;
      }
    },
  },
});

// Because this library caches the raw query and checks equality,
// components won't re-render unnecessarily when the transformer returns
// a new but equivalent object instance.
```

### Typed-default examples

```ts
// typed default object — returned ref has type { text: string }
const filter = useRouteQuery("filter", { text: "" }, {
  transform: {
    get: (v) => {
      if (!v) return { text: "" } as const;
      try {
        return JSON.parse(Array.isArray(v) ? v[0] : v);
      } catch {
        return { text: String(v) };
      }
    },
    set: (obj) => JSON.stringify(obj),
  },
});

// primitive default example — returned ref has type number
const page = useRouteQuery<number>("page", 1, {
  transform: {
    get: (v) => (v === undefined ? 1 : Number(v)),
    set: (n) => (n === undefined ? undefined : String(n)),
  },
});
```

### Default-in-URL behavior (short demo)

```ts
import { useRouteQuery } from "useRouteQuery";

// Suppose we use a JSON transformer as above
const filter = useRouteQuery("filter", { text: "" }, {
  transform: {
    get: (v) => (v ? JSON.parse(Array.isArray(v) ? v[0] : v) : { text: "" }),
    set: (obj) => JSON.stringify(obj),
  },
});

// If the user writes the default value explicitly, this implementation
// will write it into the URL (e.g. ?filter=%7B%22text%22%3A%22%22%7D).
filter.value = { text: "" };

// By contrast, vueuse's `useRouteQuery` will convert a value equal to
// the default into `undefined` before writing, causing the query param
// to be omitted from the URL.
```

## Notes

- This composable intentionally avoids exposing low-level internals. It returns a `Ref<T>` that you can read/write as usual.
- The library compares raw query values (after `transform.set`) with a cached raw value to avoid enqueuing router updates or triggering ref updates when the effective value is unchanged.

## License

MIT
