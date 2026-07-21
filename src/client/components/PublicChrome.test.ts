import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../auth";
import { LocaleProvider } from "../locale";
import { HintPanel } from "./HintPanel";
import { PublicChrome } from "./PublicChrome";

function renderChrome(hint?: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(
        LocaleProvider,
        null,
        createElement(AuthProvider, null, createElement(PublicChrome, { hint })),
      ),
    ),
  );
}

describe("PublicChrome", () => {
  it("always renders the fixed top chrome shell with the public header", () => {
    const markup = renderChrome();
    expect(markup).toContain('class="app-top-chrome"');
    expect(markup).toContain('class="app-top-chrome__spacer"');
    expect(markup).toContain('class="public-header"');
    expect(markup).not.toContain("app-top-chrome__hint");
  });

  it("hosts HintPanel in the shared fixed hint slot", () => {
    const markup = renderChrome(
      createElement(HintPanel, { progress: "Крок 3 із 3", children: "Підказка" }),
    );
    expect(markup).toContain('class="app-top-chrome__hint"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Крок 3 із 3");
    expect(markup).toContain("Підказка");
    // Narrow top-attached tab is CSS-only; DOM still nests hint beside header.
    // PROFILE-007: empty chrome hit-through is CSS (`pointer-events` on
    // `.app-top-chrome` / brand / user-menu / `.hint-panel`) — not asserted here.
    expect(markup).toMatch(/app-top-chrome[\s\S]*public-header[\s\S]*app-top-chrome__hint/);
  });
});
