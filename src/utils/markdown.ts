import { createElement, Fragment } from "react";
import type { ReactElement, ReactNode } from "react";

/**
 * Markdown → React renderer for assistant responses (SPEC-PRD-0013-P1 T-01).
 *
 * This module is the single choke point between raw model output and the DOM:
 * Chat.tsx never parses markdown itself and never uses dangerouslySetInnerHTML.
 * Output is built exclusively from React elements, so raw HTML embedded in the
 * source string renders as inert literal text. T-02 layers its sanitization
 * guarantees here without touching any call sites.
 *
 * Implemented dependency-free (no react-markdown/marked) so the sandboxed
 * build stays reproducible; the public surface (renderMarkdown /
 * MarkdownContent) is parser-agnostic, so swapping in a library later is a
 * one-file change.
 *
 * Supported subset (what Claude replies actually use): ATX headings,
 * paragraphs, unordered/ordered lists, blockquotes, fenced code blocks,
 * inline code, bold, italics, and links.
 */

/** Matches the earliest inline token: `code`, **bold**, *em*, or [text](url). */
const INLINE_TOKEN =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)\s]+\))/;

const LINK_TOKEN = /^\[([^\]]+)\]\(([^)\s]+)\)$/;

const UNORDERED_ITEM = /^\s*[-*]\s+/;
const ORDERED_ITEM = /^\s*\d+[.)]\s+/;
const BLOCKQUOTE_LINE = /^>\s?/;
const HEADING_LINE = /^(#{1,6})\s+(.*)$/;
const FENCE_LINE = /^```/;
const BLANK_LINE = /^\s*$/;

/** Parses inline markdown within a single line into text + element nodes. */
const parseInline = (text: string, keyBase: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let rest = text;
  let index = 0;

  while (rest.length > 0) {
    const match = INLINE_TOKEN.exec(rest);
    if (match === null) {
      nodes.push(rest);
      break;
    }
    if (match.index > 0) {
      nodes.push(rest.slice(0, match.index));
    }

    const token = match[0];
    const key = `${keyBase}.${index}`;
    index += 1;

    if (token.startsWith("`")) {
      nodes.push(createElement("code", { key }, token.slice(1, -1)));
    } else if (token.startsWith("**")) {
      nodes.push(
        createElement("strong", { key }, parseInline(token.slice(2, -2), key)),
      );
    } else if (token.startsWith("*")) {
      nodes.push(
        createElement("em", { key }, parseInline(token.slice(1, -1), key)),
      );
    } else {
      const link = LINK_TOKEN.exec(token);
      if (link !== null) {
        nodes.push(
          createElement(
            "a",
            { key, href: link[2], target: "_blank", rel: "noreferrer" },
            parseInline(link[1], key),
          ),
        );
      }
    }

    rest = rest.slice(match.index + token.length);
  }

  return nodes;
};

/**
 * Renders a raw markdown string as a tree of React elements.
 *
 * Purely presentational: the input string is never mutated or re-stored —
 * callers keep raw markdown as their data (no data-contract change).
 */
export const renderMarkdown = (markdown: string): ReactElement => {
  const lines = markdown.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let keyCounter = 0;

  const nextKey = (): string => {
    keyCounter += 1;
    return `md-${keyCounter}`;
  };

  const flushParagraph = (): void => {
    if (paragraph.length === 0) {
      return;
    }
    const key = nextKey();
    const children: ReactNode[] = [];
    paragraph.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        children.push(createElement("br", { key: `${key}-br-${lineIndex}` }));
      }
      children.push(...parseInline(line, `${key}.${lineIndex}`));
    });
    blocks.push(createElement("p", { key }, children));
    paragraph = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (BLANK_LINE.test(line)) {
      flushParagraph();
      i += 1;
      continue;
    }

    if (FENCE_LINE.test(line)) {
      flushParagraph();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE_LINE.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip the closing fence (or run off the end)
      blocks.push(
        createElement(
          "pre",
          { key: nextKey() },
          createElement("code", null, codeLines.join("\n")),
        ),
      );
      continue;
    }

    const heading = HEADING_LINE.exec(line);
    if (heading !== null) {
      flushParagraph();
      const key = nextKey();
      blocks.push(
        createElement(
          `h${heading[1].length}`,
          { key },
          parseInline(heading[2], key),
        ),
      );
      i += 1;
      continue;
    }

    if (BLOCKQUOTE_LINE.test(line)) {
      flushParagraph();
      const quoted: string[] = [];
      while (i < lines.length && BLOCKQUOTE_LINE.test(lines[i])) {
        quoted.push(lines[i].replace(BLOCKQUOTE_LINE, ""));
        i += 1;
      }
      blocks.push(
        createElement(
          "blockquote",
          { key: nextKey() },
          renderMarkdown(quoted.join("\n")),
        ),
      );
      continue;
    }

    if (UNORDERED_ITEM.test(line)) {
      flushParagraph();
      const items: ReactNode[] = [];
      while (i < lines.length && UNORDERED_ITEM.test(lines[i])) {
        const key = nextKey();
        items.push(
          createElement(
            "li",
            { key },
            parseInline(lines[i].replace(UNORDERED_ITEM, ""), key),
          ),
        );
        i += 1;
      }
      blocks.push(createElement("ul", { key: nextKey() }, items));
      continue;
    }

    if (ORDERED_ITEM.test(line)) {
      flushParagraph();
      const items: ReactNode[] = [];
      while (i < lines.length && ORDERED_ITEM.test(lines[i])) {
        const key = nextKey();
        items.push(
          createElement(
            "li",
            { key },
            parseInline(lines[i].replace(ORDERED_ITEM, ""), key),
          ),
        );
        i += 1;
      }
      blocks.push(createElement("ol", { key: nextKey() }, items));
      continue;
    }

    paragraph.push(line);
    i += 1;
  }
  flushParagraph();

  return createElement(Fragment, null, blocks);
};

export interface MarkdownContentProps {
  /** Raw markdown source. Stored strings stay untouched; parsing is display-time only. */
  markdown: string;
}

/**
 * Display-time markdown renderer for assistant answer/reply strings.
 * The sole entry point Chat.tsx uses — the T-02 sanitization boundary.
 */
export const MarkdownContent = ({
  markdown,
}: MarkdownContentProps): ReactElement => renderMarkdown(markdown);
