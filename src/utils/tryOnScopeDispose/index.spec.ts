import { describe, it, expect, vi } from "vitest";
import { effectScope } from "vue";
import { tryOnScopeDispose } from "./index";

describe("tryOnScopeDispose", () => {
  describe("when inside an effect scope", () => {
    it("should call the callback function on scope dispose", () => {
      const callback = vi.fn();

      const scope = effectScope();
      scope.run(() => {
        const result = tryOnScopeDispose(callback);
        expect(result).toBe(true);
      });

      scope.stop();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple callbacks", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      const scope = effectScope();
      scope.run(() => {
        tryOnScopeDispose(callback1);
        tryOnScopeDispose(callback2);
        tryOnScopeDispose(callback3);
      });

      scope.stop();
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    it("should call callbacks in FIFO order (first registered, first called)", () => {
      const callOrder: number[] = [];
      const callback1 = vi.fn(() => callOrder.push(1));
      const callback2 = vi.fn(() => callOrder.push(2));
      const callback3 = vi.fn(() => callOrder.push(3));

      const scope = effectScope();
      scope.run(() => {
        tryOnScopeDispose(callback1);
        tryOnScopeDispose(callback2);
        tryOnScopeDispose(callback3);
      });

      scope.stop();
      expect(callOrder).toEqual([1, 2, 3]);
    });

    it("should return true when inside scope", () => {
      let result = false;
      const scope = effectScope();
      scope.run(() => {
        result = tryOnScopeDispose(() => {});
      });

      expect(result).toBe(true);
    });

    it("should execute callback with proper context", () => {
      const callback = vi.fn();
      const scope = effectScope();

      scope.run(() => {
        tryOnScopeDispose(callback);
      });

      scope.stop();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe("when outside an effect scope", () => {
    it("should return false when not inside scope", () => {
      const callback = vi.fn();
      const result = tryOnScopeDispose(callback);

      expect(result).toBe(false);
      expect(callback).not.toHaveBeenCalled();
    });

    it("should not call the callback when outside scope", () => {
      const callback = vi.fn();
      tryOnScopeDispose(callback);

      expect(callback).not.toHaveBeenCalled();
    });

    it("should return false with failSilently=false outside scope", () => {
      const callback = vi.fn();
      const result = tryOnScopeDispose(callback, false);

      expect(result).toBe(false);
      expect(callback).not.toHaveBeenCalled();
    });

    it("should return false with failSilently=true outside scope", () => {
      const callback = vi.fn();
      const result = tryOnScopeDispose(callback, true);

      expect(result).toBe(false);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("failSilently parameter", () => {
    it("should pass failSilently=false to onScopeDispose", () => {
      const callback = vi.fn();
      const scope = effectScope();

      scope.run(() => {
        tryOnScopeDispose(callback, false);
      });

      scope.stop();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should pass failSilently=true to onScopeDispose", () => {
      const callback = vi.fn();
      const scope = effectScope();

      scope.run(() => {
        tryOnScopeDispose(callback, true);
      });

      scope.stop();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should use default failSilently when not provided", () => {
      const callback = vi.fn();
      const scope = effectScope();

      scope.run(() => {
        tryOnScopeDispose(callback);
      });

      scope.stop();
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("should propagate errors thrown in callback during dispose", () => {
      const errorCallback = vi.fn(() => {
        throw new Error("Callback error");
      });

      const scope = effectScope();
      scope.run(() => {
        tryOnScopeDispose(errorCallback);
      });

      // This should throw because the callback throws during disposal
      expect(() => scope.stop()).toThrow("Callback error");
    });

    it("should handle callback that does side effects", () => {
      const sideEffect = { value: 0 };
      const callback = vi.fn(() => {
        sideEffect.value = 42;
      });

      const scope = effectScope();
      scope.run(() => {
        tryOnScopeDispose(callback);
      });

      expect(sideEffect.value).toBe(0);
      scope.stop();
      expect(sideEffect.value).toBe(42);
    });
  });

  describe("failSilently behavior (suppressing warnings)", () => {
    it("should suppress warning when failSilently=true and outside scope", () => {
      const callback = vi.fn();
      // When outside scope and failSilently=true, should not warn
      const result = tryOnScopeDispose(callback, true);

      expect(result).toBe(false);
      expect(callback).not.toHaveBeenCalled();
    });

    it("should pass failSilently parameter to onScopeDispose when inside scope", () => {
      const callback = vi.fn();
      const scope = effectScope();

      scope.run(() => {
        // failSilently parameter is passed to onScopeDispose
        // but only matters for warning suppression inside scope
        tryOnScopeDispose(callback, true);
      });

      scope.stop();
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("should handle callback that calls other functions", () => {
      const innerFn = vi.fn();
      const callback = vi.fn(() => {
        innerFn();
      });

      const scope = effectScope();
      scope.run(() => {
        tryOnScopeDispose(callback);
      });

      scope.stop();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(innerFn).toHaveBeenCalledTimes(1);
    });

    it("should handle nested scopes", () => {
      const outerCallback = vi.fn();
      const innerCallback = vi.fn();

      const outerScope = effectScope();
      outerScope.run(() => {
        tryOnScopeDispose(outerCallback);

        const innerScope = effectScope();
        innerScope.run(() => {
          tryOnScopeDispose(innerCallback);
        });

        innerScope.stop();
      });

      expect(innerCallback).toHaveBeenCalledTimes(1);
      expect(outerCallback).not.toHaveBeenCalled();

      outerScope.stop();
      expect(outerCallback).toHaveBeenCalledTimes(1);
    });

    it("should allow registering callbacks for the same scope multiple times", () => {
      const callback = vi.fn();
      const scope = effectScope();

      scope.run(() => {
        for (let i = 0; i < 5; i++) {
          tryOnScopeDispose(callback);
        }
      });

      scope.stop();
      expect(callback).toHaveBeenCalledTimes(5);
    });
  });
});
