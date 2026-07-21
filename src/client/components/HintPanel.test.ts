import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HintPanel } from "./HintPanel";

describe("HintPanel", () => {
  it("renders the shared onboarding hint and optional Skip action", () => {
    const markup = renderToStaticMarkup(
      createElement(
        HintPanel,
        {
          actionLabel: "Пропустити",
          onAction: () => undefined,
          children: "Підказка",
        },
      ),
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Підказка");
    expect(markup).toContain(
      '<button type="button" class="btn btn--ghost hint-panel__action">Пропустити</button>',
    );
  });

  it("keeps ordinary flow hints action-free when no action is provided", () => {
    const markup = renderToStaticMarkup(createElement(HintPanel, { children: "Крок 1" }));

    expect(markup).not.toContain("<button");
  });
});
