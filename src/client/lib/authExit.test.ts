import { describe, expect, it } from "vitest";
import { authExitTarget } from "./authExit";
import { PROFILE_PATH } from "./profileMenu";

describe("authExitTarget", () => {
  // AUTH-006: signed-in auth forms exit to profile; guests exit home.
  it("sends signed-in users to profile", () => {
    expect(authExitTarget(true)).toEqual({
      to: PROFILE_PATH,
      labelKey: "backToProfile",
    });
  });

  it("sends guests to home", () => {
    expect(authExitTarget(false)).toEqual({
      to: "/",
      labelKey: "backHome",
    });
  });
});
