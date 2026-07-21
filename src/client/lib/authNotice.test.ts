import { describe, expect, it } from "vitest";
import {
  AUTH_LOGIN_NOTICE_PARAM,
  buildRequireAuthLoginRedirect,
  consumeSignOutLoginRedirect,
  loginPathWithNotice,
  parseAuthLoginNotice,
  prepareSignOutLoginRedirect,
} from "./authNotice";

describe("authNotice", () => {
  it("builds login paths with a notice query param", () => {
    expect(loginPathWithNotice("phone_changed")).toBe(
      `/login?${AUTH_LOGIN_NOTICE_PARAM}=phone_changed`,
    );
    expect(loginPathWithNotice("password_changed")).toBe(
      `/login?${AUTH_LOGIN_NOTICE_PARAM}=password_changed`,
    );
  });

  it("parses known notice values and rejects unknown ones", () => {
    expect(parseAuthLoginNotice("phone_changed")).toBe("phone_changed");
    expect(parseAuthLoginNotice("password_changed")).toBe("password_changed");
    expect(parseAuthLoginNotice("")).toBeNull();
    expect(parseAuthLoginNotice(null)).toBeNull();
    expect(parseAuthLoginNotice("registered")).toBeNull();
  });

  it("RequireAuth sign-out redirect prefers notice over next= on the same path", () => {
    prepareSignOutLoginRedirect("phone_changed", "/change-phone");
    expect(buildRequireAuthLoginRedirect("/change-phone", "")).toBe(
      `/login?${AUTH_LOGIN_NOTICE_PARAM}=phone_changed`,
    );
    expect(buildRequireAuthLoginRedirect("/change-phone", "")).toBe("/login?next=%2Fchange-phone");
  });

  it("RequireAuth sign-out redirect only applies to the prepared path", () => {
    prepareSignOutLoginRedirect("password_changed", "/change-phone");
    expect(buildRequireAuthLoginRedirect("/profile", "")).toBe("/login?next=%2Fprofile");
    expect(buildRequireAuthLoginRedirect("/change-phone", "")).toBe(
      `/login?${AUTH_LOGIN_NOTICE_PARAM}=password_changed`,
    );
  });

  it("consumeSignOutLoginRedirect clears the pending redirect once", () => {
    prepareSignOutLoginRedirect("phone_changed", "/change-phone");
    expect(consumeSignOutLoginRedirect("/change-phone")).toBe(
      `/login?${AUTH_LOGIN_NOTICE_PARAM}=phone_changed`,
    );
    expect(consumeSignOutLoginRedirect("/change-phone")).toBeNull();
  });
});
