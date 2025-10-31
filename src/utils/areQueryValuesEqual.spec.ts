import { describe, it, expect } from "vitest";
import { areQueryValuesEqual } from "./areQueryValuesEqual";

describe("areQueryValuesEqual", () => {
  describe("string values", () => {
    it("should return true for identical strings", () => {
      expect(areQueryValuesEqual("hello", "hello")).toBe(true);
    });

    it("should return false for different strings", () => {
      expect(areQueryValuesEqual("hello", "world")).toBe(false);
    });

    it("should return true for empty strings", () => {
      expect(areQueryValuesEqual("", "")).toBe(true);
    });

    it("should be case-sensitive", () => {
      expect(areQueryValuesEqual("Hello", "hello")).toBe(false);
    });
  });

  describe("undefined values", () => {
    it("should return true for both undefined", () => {
      expect(areQueryValuesEqual(undefined, undefined)).toBe(true);
    });

    it("should return false when one is undefined", () => {
      expect(areQueryValuesEqual("hello", undefined)).toBe(false);
      expect(areQueryValuesEqual(undefined, "hello")).toBe(false);
    });
  });

  describe("null values", () => {
    it("should return true for both null", () => {
      expect(areQueryValuesEqual(null, null)).toBe(true);
    });

    it("should return false when one is null", () => {
      expect(areQueryValuesEqual("hello", null)).toBe(false);
      expect(areQueryValuesEqual(null, "hello")).toBe(false);
    });

    it("should differentiate between null and undefined", () => {
      expect(areQueryValuesEqual(null, undefined)).toBe(false);
    });
  });

  describe("array values", () => {
    it("should return true for identical string arrays", () => {
      expect(areQueryValuesEqual(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
    });

    it("should return false for arrays with different length", () => {
      expect(areQueryValuesEqual(["a", "b"], ["a", "b", "c"])).toBe(false);
      expect(areQueryValuesEqual(["a", "b", "c"], ["a", "b"])).toBe(false);
    });

    it("should return false for arrays with different elements", () => {
      expect(areQueryValuesEqual(["a", "b", "c"], ["a", "x", "c"])).toBe(false);
    });

    it("should return false for arrays in different order", () => {
      expect(areQueryValuesEqual(["a", "b", "c"], ["c", "b", "a"])).toBe(false);
    });

    it("should handle arrays with undefined values", () => {
      expect(areQueryValuesEqual([undefined, "b"], [undefined, "b"])).toBe(
        true
      );
      expect(areQueryValuesEqual([undefined, "b"], ["a", "b"])).toBe(false);
    });

    it("should handle empty arrays", () => {
      expect(areQueryValuesEqual([], [])).toBe(true);
    });

    it("should return false for empty and non-empty arrays", () => {
      expect(areQueryValuesEqual([], ["a"])).toBe(false);
      expect(areQueryValuesEqual(["a"], [])).toBe(false);
    });

    it("should be case-sensitive in array elements", () => {
      expect(areQueryValuesEqual(["hello", "world"], ["Hello", "world"])).toBe(
        false
      );
    });
  });

  describe("mixed types", () => {
    it("should return false when comparing string and array", () => {
      expect(areQueryValuesEqual("hello", ["hello"])).toBe(false);
    });

    it("should return false when comparing string and null", () => {
      expect(areQueryValuesEqual("hello", null)).toBe(false);
    });

    it("should return false when comparing array and null", () => {
      expect(areQueryValuesEqual(["a"], null)).toBe(false);
    });

    it("should return false when comparing array and undefined", () => {
      expect(areQueryValuesEqual(["a"], undefined)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle arrays with null values", () => {
      expect(areQueryValuesEqual([null, "b"], [null, "b"])).toBe(true);
      expect(areQueryValuesEqual([null, "b"], ["a", "b"])).toBe(false);
    });

    it("should handle whitespace in strings", () => {
      expect(areQueryValuesEqual("hello world", "hello world")).toBe(true);
      expect(areQueryValuesEqual("hello world", "hello  world")).toBe(false);
    });

    it("should handle numeric-like strings", () => {
      expect(areQueryValuesEqual("123", "123")).toBe(true);
      expect(areQueryValuesEqual("123", "124")).toBe(false);
    });

    it("should handle array with single element", () => {
      expect(areQueryValuesEqual(["a"], ["a"])).toBe(true);
      expect(areQueryValuesEqual(["a"], ["b"])).toBe(false);
    });
  });
});
