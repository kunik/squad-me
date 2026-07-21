import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FieldHint, FieldLabel } from "./FieldHint";

describe("FieldHint structured content", () => {
  it("renders description then italic validation rules", () => {
    const markup = renderToStaticMarkup(
      createElement(FieldHint, {
        text: {
          description: "For unofficial competitions.",
          validation: "Required. Letters, digits, spaces, or hyphens.",
        },
      }),
    );

    expect(markup).toContain('class="field-hint__description"');
    expect(markup).toContain("For unofficial competitions.");
    expect(markup).toContain('class="field-hint__rules"');
    expect(markup).toContain("Required. Letters, digits, spaces, or hyphens.");
    expect(markup).toContain(
      'aria-label="For unofficial competitions. Required. Letters, digits, spaces, or hyphens."',
    );
  });

  it("renders plain string hints without a rules line", () => {
    const markup = renderToStaticMarkup(
      createElement(FieldLabel, { hint: "For determining category." }, "Gender"),
    );

    expect(markup).toContain("For determining category.");
    expect(markup).not.toContain("field-hint__rules");
  });
});
