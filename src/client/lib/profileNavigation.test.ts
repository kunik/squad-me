import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PROFILE_ANCHOR_COMFORT_PAD_PX,
  PROFILE_ANCHOR_SCROLL_MARGIN_PX,
  PROFILE_STEP_ADVANCE_MENU_ANCHOR,
  PROFILE_TO_DISCIPLINES_MENU_ANCHOR,
  PROFILE_TO_EMAIL_MENU_ANCHOR,
  ProfileContentSection,
  profileAnchorOffsetPx,
  profileReadingLinePx,
  resolveActiveProfileAnchor,
  stickyTopChromeBottomPx,
  windowScrollTopForAnchor,
} from "./profileNavigation";

const anchors = [
  { id: "my-profile", top: -186 },
  { id: "my-divisions", top: 455 },
  { id: "profile-actions", top: 781 },
] as const;

/** Representative section tops (viewport Y) at various scroll positions. */
const sectionTops = {
  profile: { id: "my-profile" as const, top: 0 },
  divisions: { id: "my-divisions" as const, top: 480 },
  notifications: { id: "my-notifications" as const, top: 780 },
  actions: { id: "profile-actions" as const, top: 1_100 },
};

describe("profile navigation", () => {
  it("PROFILE-001 keeps a clicked divisions target active at the document boundary", () => {
    expect(resolveActiveProfileAnchor(anchors, 540, false, true, "my-divisions")).toBe(
      "my-divisions",
    );
  });

  it("uses the final section for manual scrolling at the document boundary", () => {
    expect(resolveActiveProfileAnchor(anchors, 120, false, true, null)).toBe("profile-actions");
  });

  it("PROFILE-001 resets bottom to profile at scrollY zero, even when the page is also at end", () => {
    expect(resolveActiveProfileAnchor(anchors, 1_000, true, true, null)).toBe("my-profile");
  });

  it("preserves menu-click authority at the top boundary", () => {
    expect(resolveActiveProfileAnchor(anchors, 1_000, true, true, "my-divisions")).toBe(
      "my-divisions",
    );
  });

  it("PROFILE-001 activates divisions when its top crosses the viewport reading line", () => {
    expect(
      resolveActiveProfileAnchor(
        [
          { id: "my-profile", top: -220 },
          { id: "my-divisions", top: 20 },
          { id: "my-notifications", top: 420 },
          { id: "profile-actions", top: 700 },
        ],
        PROFILE_ANCHOR_COMFORT_PAD_PX,
        false,
        false,
        null,
      ),
    ).toBe("my-divisions");
  });

  it("PROFILE-001 renders unique profile anchors as direct sibling sections", () => {
    const ids = ["my-profile", "my-divisions", "my-notifications"] as const;
    const markup = renderToStaticMarkup(
      createElement(
        "div",
        { className: "page-wrapper" },
        ids.map((id) => createElement(ProfileContentSection, { id, key: id })),
      ),
    );
    const renderedIds = [...markup.matchAll(/<section id="([^"]+)"/g)].map((match) => match[1]);

    expect(renderedIds).toEqual(ids);
    expect(new Set(renderedIds).size).toBe(ids.length);
    expect(markup).toContain('</section><section id="my-divisions"');
    expect(markup).toContain('</section><section id="my-notifications"');
  });

  it("activates a section exactly when it crosses the reading line", () => {
    expect(
      resolveActiveProfileAnchor(
        [
          { id: "my-profile", top: -500 },
          { id: "my-divisions", top: 24 },
          { id: "profile-actions", top: 800 },
        ],
        24,
        false,
        false,
        null,
      ),
    ).toBe("my-divisions");
  });

  it("PROFILE-002 advances onboarding via the next-step menu anchors", () => {
    // Profile Skip/Save → «Дивізіони»; disciplines Skip/Save → «Сповіщення».
    // Both use windowScrollTopForAnchor — never Element.scrollIntoView inside
    // `.public-surface`. Profile→disciplines must open divisions edit mode
    // before scrolling so the taller layout can leave scrollY≈0 (otherwise
    // atDocumentStart snaps the menu back to «Особисті дані»).
    expect(PROFILE_TO_DISCIPLINES_MENU_ANCHOR).toBe("my-divisions");
    expect(PROFILE_TO_EMAIL_MENU_ANCHOR).toBe("my-notifications");
    expect(PROFILE_STEP_ADVANCE_MENU_ANCHOR).toBe("my-notifications");
  });

  it("PROFILE-002 clamps window scroll so scrollY zero remains reachable for the header", () => {
    // Target already inside the comfort band → stay at 0 (logo reachable).
    expect(windowScrollTopForAnchor(10, 0, PROFILE_ANCHOR_SCROLL_MARGIN_PX)).toBe(0);
    expect(windowScrollTopForAnchor(900, 120, PROFILE_ANCHOR_SCROLL_MARGIN_PX)).toBe(996);
    expect(windowScrollTopForAnchor(60, 10, 24)).toBe(46);
  });

  it("PROFILE-003 menu offset uses sticky chrome plus comfort pad, not in-flow header height", () => {
    expect(PROFILE_ANCHOR_COMFORT_PAD_PX).toBe(24);
    expect(profileAnchorOffsetPx(0)).toBe(24);
    expect(profileAnchorOffsetPx(72)).toBe(96);
    // In-flow (static/relative) header+banner must not inflate the offset —
    // after window scroll they leave the viewport.
    expect(
      stickyTopChromeBottomPx([
        { position: "relative", top: 0, bottom: 88 },
        { position: "static", top: 88, bottom: 140 },
      ]),
    ).toBe(0);
    expect(
      stickyTopChromeBottomPx([
        { position: "sticky", top: 0, bottom: 64 },
        { position: "sticky", top: 64, bottom: 120 },
      ]),
    ).toBe(120);
    expect(
      stickyTopChromeBottomPx([{ position: "fixed", top: 0, bottom: 56 }]),
    ).toBe(56);
    expect(
      stickyTopChromeBottomPx([{ position: "sticky", top: 200, bottom: 260 }]),
    ).toBe(0);
  });

  it("PROFILE-004 spy uses a single near-chrome reading line (same as click landing)", () => {
    expect(profileReadingLinePx(0)).toBe(PROFILE_ANCHOR_COMFORT_PAD_PX);
    expect(profileReadingLinePx(0)).toBe(profileAnchorOffsetPx(0));
    expect(profileReadingLinePx(72)).toBe(96);
    expect(profileReadingLinePx(72)).toBe(profileAnchorOffsetPx(72));
  });

  it("PROFILE-004 selects last section whose top crossed the reading line", () => {
    const readingLine = PROFILE_ANCHOR_COMFORT_PAD_PX;
    const layout = [
      { id: "my-profile", top: sectionTops.profile.top },
      { id: "my-divisions", top: sectionTops.divisions.top },
      { id: "my-notifications", top: sectionTops.notifications.top },
      { id: "profile-actions", top: sectionTops.actions.top },
    ] as const;

    // scrollY ≈ 0: profile top at/near viewport top → My Profile (also via
    // atDocumentStart, tested separately).
    expect(resolveActiveProfileAnchor(layout, readingLine, true, false, null)).toBe(
      "my-profile",
    );
    expect(
      resolveActiveProfileAnchor(
        [
          { id: "my-profile", top: 8 },
          { id: "my-divisions", top: 488 },
          { id: "my-notifications", top: 788 },
          { id: "profile-actions", top: 1_108 },
        ],
        readingLine,
        false,
        false,
        null,
      ),
    ).toBe("my-profile");

    // Reading line between divisions top and notifications top → Divisions.
    // Example: divisions.top = 10 (<= 24), notifications.top = 310 (> 24).
    expect(
      resolveActiveProfileAnchor(
        [
          { id: "my-profile", top: -470 },
          { id: "my-divisions", top: 10 },
          { id: "my-notifications", top: 310 },
          { id: "profile-actions", top: 630 },
        ],
        readingLine,
        false,
        false,
        null,
      ),
    ).toBe("my-divisions");

    // Just before notifications crosses the line — still Divisions.
    expect(
      resolveActiveProfileAnchor(
        [
          { id: "my-profile", top: -755 },
          { id: "my-divisions", top: -275 },
          { id: "my-notifications", top: 25 },
          { id: "profile-actions", top: 345 },
        ],
        readingLine,
        false,
        false,
        null,
      ),
    ).toBe("my-divisions");

    // Notifications top crosses reading line → Notifications.
    expect(
      resolveActiveProfileAnchor(
        [
          { id: "my-profile", top: -760 },
          { id: "my-divisions", top: -280 },
          { id: "my-notifications", top: 20 },
          { id: "profile-actions", top: 340 },
        ],
        readingLine,
        false,
        false,
        null,
      ),
    ).toBe("my-notifications");

    // Actions owns the line.
    expect(
      resolveActiveProfileAnchor(
        [
          { id: "my-profile", top: -1_080 },
          { id: "my-divisions", top: -600 },
          { id: "my-notifications", top: -300 },
          { id: "profile-actions", top: 20 },
        ],
        readingLine,
        false,
        false,
        null,
      ),
    ).toBe("profile-actions");
  });

  it("PROFILE-004 mid-viewport heading does not steal the previous section (up or down)", () => {
    // Divisions heading still mid-viewport (220px) while profile has passed —
    // with near-chrome line (24), profile remains active until divisions
    // reaches the line. Same rule both directions; no dual-line hysteresis.
    const midHeading = [
      { id: "my-profile", top: -400 },
      { id: "my-divisions", top: 220 },
      { id: "my-notifications", top: 520 },
      { id: "profile-actions", top: 800 },
    ] as const;
    const line = profileReadingLinePx(0);
    expect(line).toBe(24);
    expect(resolveActiveProfileAnchor(midHeading, line, false, false, null)).toBe("my-profile");
  });
});
