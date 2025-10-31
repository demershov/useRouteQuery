import type { GetQueryValue, SetQueryValue } from "../types/index";

export function areQueryValuesEqual(
  a: GetQueryValue | SetQueryValue,
  b: GetQueryValue | SetQueryValue
): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => val === b[idx]);
  }

  return a === b;
}
