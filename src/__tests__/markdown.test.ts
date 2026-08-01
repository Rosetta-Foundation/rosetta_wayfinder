/**
 * @jest-environment jsdom
 */
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { MarkdownContent, safeUrlTransform } from "../utils/markdown";

/**
 * Component tests for the markdown render helper (SPEC-PRD-0013-P1 T-01) —
 * the single choke point between raw model output and the DOM.
 */
describe("MarkdownContent", () => {
  it("renders heading, bold, inline code, and dash lists as h2/strong/code/ul-li", () => {
    render(
      createElement(MarkdownContent, {
        markdown: "## Heading\n\n**bold** and `code`\n\n- first\n- second",
      }),
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Heading" }).tagName,
    ).toBe("H2");
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("code").tagName).toBe("CODE");
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].tagName).toBe("LI");
    expect(items[0].closest("ul")).not.toBeNull();
    expect(items[0].textContent).toBe("first");
    expect(items[1].textContent).toBe("second");
  });

  it("renders links and blockquotes as a and blockquote elements", () => {
    render(
      createElement(MarkdownContent, {
        markdown: "See [docs](https://example.com/prd)\n\n> Quoted insight",
      }),
    );

    const link = screen.getByRole("link", { name: "docs" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("https://example.com/prd");

    const quote = screen.getByText("Quoted insight").closest("blockquote");
    expect(quote).not.toBeNull();
    expect(quote?.tagName).toBe("BLOCKQUOTE");
  });

  it("receives and preserves the raw markdown string unmodified", () => {
    const source =
      "## Heading with **bold** and [a link](https://example.com)";
    const element = createElement(MarkdownContent, { markdown: source });

    render(element);

    expect(element.props.markdown).toBe(source);
  });

  it("does not let javascript: or data: URLs reach href", () => {
    render(
      createElement(MarkdownContent, {
        markdown: "[xss](javascript:alert(1)) and [data](data:text/html,hi)",
      }),
    );

    const xssHref =
      screen.getByText("xss").closest("a")?.getAttribute("href") ?? "";
    const dataHref =
      screen.getByText("data").closest("a")?.getAttribute("href") ?? "";

    expect(xssHref).not.toMatch(/^javascript:/i);
    expect(dataHref).not.toMatch(/^data:/i);
    expect(xssHref).toBe("");
    expect(dataHref).toBe("");
  });

  it("safeUrlTransform strips javascript: and data: schemes", () => {
    expect(safeUrlTransform("javascript:alert(1)")).toBe("");
    expect(safeUrlTransform("data:text/html,hi")).toBe("");
    expect(safeUrlTransform("https://example.com/ok")).toBe(
      "https://example.com/ok",
    );
  });
});
