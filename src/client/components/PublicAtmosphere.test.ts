import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicAtmosphere } from "./PublicAtmosphere";

describe("PublicAtmosphere", () => {
  it("PROFILE-005 keeps wash/hex as siblings outside the overflowing content shell", () => {
    const markup = renderToStaticMarkup(
      createElement(PublicAtmosphere, null, createElement("main", null, "content")),
    );

    // Decorative layers must not nest under .public-surface (overflow:hidden /
    // growing min-height would reflow absolute atmosphere).
    expect(markup).toContain('class="public-surface__wash"');
    expect(markup).toContain('class="public-surface__grid"');
    expect(markup).toContain('class="public-surface"');
    expect(markup).toMatch(
      /public-surface__wash[\s\S]*public-surface__grid[\s\S]*public-surface/,
    );
    expect(markup).not.toMatch(/public-surface"[^>]*>[\s\S]*public-surface__grid/);
    expect(markup).not.toMatch(/public-surface"[^>]*>[\s\S]*public-surface__wash/);
    expect(markup).toContain("content");
  });
});
