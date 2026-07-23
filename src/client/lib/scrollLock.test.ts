import { describe, expect, it } from "vitest";
import { scrollbarLockGap } from "./scrollLock";

describe("scrollbarLockGap", () => {
  it("returns the clientWidth growth after overflow lock", () => {
    expect(scrollbarLockGap(375, 390)).toBe(15);
  });

  it("returns 0 when gutter already reserved (no layout change)", () => {
    expect(scrollbarLockGap(390, 390)).toBe(0);
  });

  it("never returns a negative gap", () => {
    expect(scrollbarLockGap(400, 390)).toBe(0);
  });
});
