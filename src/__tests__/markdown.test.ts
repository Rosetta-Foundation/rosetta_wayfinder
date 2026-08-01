import { createElement, isValidElement } from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownContent, renderMarkdown } from "../utils/markdown";

/**
 * Component tests for the markdown render helper (SPEC-PRD-0013-P1 T-01) —
 * the single choke point between raw model output and the DOM. Assertions run
 * against server-rendered DOM markup of the real component.
 */
describe("MarkdownContent", () => {
  const render = (markdown: string): string =>
    renderToStaticMarkup(createElement(MarkdownContent, { markdown }));

  it("renders heading, bold, inline code, and dash lists as h2/strong/code/ul-li", () => {
    const html = render(
      "## Heading\n\n**bold** and `code`\n\n- first\n- second",
    );

    expect(html).toContain("<h2>Heading</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<ul><li>first</li><li>second</li></ul>");
  });

  it("renders links as anchor elements", () => {
    const html = render("See [docs](https://example.com/prd) here");

    expect(html).toContain(
      '<a href="https://example.com/prd" target="_blank" rel="noreferrer">docs</a>',
    );
  });

  it("renders blockquotes as blockquote elements", () => {
    const html = render("> Quoted insight");

    expect(html).toContain("<blockquote><p>Quoted insight</p></blockquote>");
  });

  it("renders fenced code blocks as pre > code", () => {
    const html = render("```\nconst x = 1;\n```");

    expect(html).toContain("<pre><code>const x = 1;</code></pre>");
  });

  it("renders ordered lists and italics", () => {
    const html = render("1. one\n2. *two*");

    expect(html).toContain("<ol><li>one</li><li><em>two</em></li></ol>");
  });

  it("receives and preserves the raw markdown string unmodified", () => {
    const source = "## Heading with **bold** and [a link](https://example.com)";
    const element = createElement(MarkdownContent, { markdown: source });

    renderToStaticMarkup(element);

    // The component's data contract is the raw string itself — rendering is
    // display-time only and never rewrites what callers store.
    expect(element.props.markdown).toBe(source);
  });

  it("never uses dangerouslySetInnerHTML anywhere in the element tree", () => {
    const assertNoInnerHtml = (node: ReactNode): void => {
      if (Array.isArray(node)) {
        node.forEach(assertNoInnerHtml);
        return;
      }
      if (!isValidElement(node)) {
        return;
      }
      const props = node.props as Record<string, unknown>;
      expect(props.dangerouslySetInnerHTML).toBeUndefined();
      assertNoInnerHtml(props.children as ReactNode);
    };

    assertNoInnerHtml(
      renderMarkdown(
        "# H\n\n**b** and `c` — [l](https://example.com)\n\n> q\n\n- item",
      ),
    );
  });

  it("renders embedded raw HTML as inert literal text", () => {
    const html = render("<script>alert('x')</script>");

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
