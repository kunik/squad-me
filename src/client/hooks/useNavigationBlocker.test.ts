import { describe, expect, it, vi } from "vitest";
import { patchNavigatorForBlocker } from "./useNavigationBlocker";

function mockNavigator() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    createHref: vi.fn(),
  };
}

describe("patchNavigatorForBlocker", () => {
  it("defers push while blocking and allows a single proceed retry", () => {
    const push = vi.fn();
    const navigator = { ...mockNavigator(), push };
    let blocked = false;
    let retry: (() => void) | undefined;

    patchNavigatorForBlocker(
      navigator,
      () => blocked,
      (nextRetry) => {
        retry = nextRetry;
      },
    );

    blocked = true;
    navigator.push("/profile", { replace: true });
    expect(push).not.toHaveBeenCalled();
    expect(retry).toBeTypeOf("function");

    retry?.();
    expect(push).toHaveBeenCalledWith("/profile", { replace: true });
  });

  it("defers back/forward via go while blocking", () => {
    const go = vi.fn();
    const navigator = { ...mockNavigator(), go };
    let blocked = true;
    let retry: (() => void) | undefined;

    patchNavigatorForBlocker(
      navigator,
      () => blocked,
      (nextRetry) => {
        retry = nextRetry;
      },
    );

    navigator.go(-1);
    expect(go).not.toHaveBeenCalled();
    retry?.();
    expect(go).toHaveBeenCalledWith(-1);
  });

  it("passes navigation through when not blocking", () => {
    const replace = vi.fn();
    const navigator = { ...mockNavigator(), replace };
    patchNavigatorForBlocker(
      navigator,
      () => false,
      () => {
        throw new Error("should not block");
      },
    );

    navigator.replace("/linked-shooters");
    expect(replace).toHaveBeenCalledWith("/linked-shooters");
  });
});
