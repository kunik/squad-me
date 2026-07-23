import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../locale";
import { PROFILE_PATH } from "../lib/profileMenu";
import { SidebarFooter } from "./SidebarFooter";

vi.mock("../hooks/useLogout", () => ({
  useLogout: () => ({ logout: () => undefined, busy: false, error: null }),
}));

function renderFooter() {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(
        LocaleProvider,
        null,
        createElement(SidebarFooter, {
          nickname: "Falcon",
          showNickname: true,
          phoneE164: "+380501112233",
        }),
      ),
    ),
  );
}

describe("SidebarFooter", () => {
  it("links the profile control to plain /profile without #my-profile", () => {
    const markup = renderFooter();

    expect(markup).toContain(`href="${PROFILE_PATH}"`);
    expect(markup).not.toContain("#my-profile");
  });

  it("puts logout in the same row as the profile link, without lang/theme", () => {
    const markup = renderFooter();

    expect(markup).toContain('class="sidebar-footer-row"');
    expect(markup).toContain('class="sidebar-user"');
    expect(markup).toContain('class="sidebar-logout-btn"');
    expect(markup).not.toContain("sidebar-footer-tools");
    expect(markup).not.toContain("lang-seg");
    expect(markup).not.toContain("theme-toggle");

    const rowStart = markup.indexOf('class="sidebar-footer-row"');
    const rowMarkup = markup.slice(rowStart);
    const profileIdx = rowMarkup.indexOf('class="sidebar-user"');
    const logoutIdx = rowMarkup.indexOf('class="sidebar-logout-btn"');
    expect(profileIdx).toBeGreaterThan(-1);
    expect(logoutIdx).toBeGreaterThan(profileIdx);
  });
});
