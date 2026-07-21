import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppDialog } from "./AppDialog";

describe("AppDialog", () => {
  it("renders an accessible modal shell with title, body, and actions", () => {
    const markup = renderToStaticMarkup(
      createElement(AppDialog, {
        open: true,
        title: "Незбережені зміни",
        description: "Введені зміни не збережено.",
        onClose: () => undefined,
        actions: createElement(
          "button",
          { type: "button", className: "btn btn--ghost" },
          "Залишитись",
        ),
      }),
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("Незбережені зміни");
    expect(markup).toContain("Введені зміни не збережено.");
    expect(markup).toContain("Залишитись");
    expect(markup).toContain("app-dialog");
  });

  it("renders nothing when closed", () => {
    const markup = renderToStaticMarkup(
      createElement(AppDialog, {
        open: false,
        title: "Hidden",
        onClose: () => undefined,
        actions: null,
      }),
    );

    expect(markup).toBe("");
  });

  it("applies the danger tone for destructive confirms", () => {
    const markup = renderToStaticMarkup(
      createElement(AppDialog, {
        open: true,
        title: "Delete?",
        tone: "danger",
        onClose: () => undefined,
        actions: createElement("button", { type: "button" }, "Delete"),
      }),
    );

    expect(markup).toContain("app-dialog--danger");
  });
});
