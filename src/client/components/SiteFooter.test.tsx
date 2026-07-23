import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../locale";
import { LOGO_FULL_MONO, SiteChrome, SiteFooter } from "./SiteFooter";

vi.mock("../auth", () => ({
  useAuth: () => ({ account: null, loading: false }),
}));

function renderGuestFooter() {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(LocaleProvider, null, createElement(SiteFooter)),
    ),
  );
}

describe("SiteFooter", () => {
  it("renders always-dark footer with mono logo and product/legal links for guests", () => {
    const markup = renderGuestFooter();

    expect(markup).toContain('class="site-footer"');
    expect(markup).toContain(`src="${LOGO_FULL_MONO}"`);
    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/register"');
    expect(markup).toContain('href="/privacy"');
    expect(markup).toContain('href="/terms"');
    expect(markup).toContain('href="/contact"');
    expect(markup).toContain("Політика конфіденційності");
    expect(markup).toContain("Умови використання");
    expect(markup).toContain("Зв’язатися з нами");
  });

  it("wraps page body so the footer sits after a full viewport", () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(
          LocaleProvider,
          null,
          createElement(SiteChrome, null, createElement("main", null, "content")),
        ),
      ),
    );

    expect(markup).toContain('class="site-chrome"');
    expect(markup).toContain('class="site-chrome__body"');
    expect(markup).toContain("content");
    expect(markup).toContain('class="site-footer"');
    expect(markup.indexOf("site-chrome__body")).toBeLessThan(markup.indexOf("site-footer"));
  });
});
