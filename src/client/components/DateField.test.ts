import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "../locale";
import { DateField } from "./DateField";

function withLocale(child: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(createElement(LocaleProvider, null, child));
}

describe("DateField", () => {
  it("renders a text input with panel chrome and calendar button", () => {
    const markup = withLocale(
      createElement(DateField, {
        id: "birth",
        label: "Дата народження",
        value: "1990-05-15",
        onChange: () => undefined,
        max: "2026-07-21",
      }),
    );

    expect(markup).toContain("form-control");
    expect(markup).toContain("input-affix");
    expect(markup).toContain('type="text"');
    expect(markup).toContain('value="15.05.1990"');
    expect(markup).toContain("cal-btn");
    expect(markup).toContain("<svg");
    expect(markup).not.toContain("/icon-calendar.png");
    expect(markup).not.toContain('type="date"');
  });

  it("shows a muted placeholder when empty", () => {
    const markup = withLocale(
      createElement(DateField, {
        label: "Дата народження",
        value: "",
        onChange: () => undefined,
      }),
    );

    expect(markup).toContain('placeholder="ДД.ММ.РРРР"');
    expect(markup).toContain('value=""');
  });
});
