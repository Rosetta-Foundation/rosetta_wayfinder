import { createElement } from "react";
import type { ReactElement } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Display-time markdown → React for assistant answer/reply strings
 * (SPEC-PRD-0013-P1 T-01).
 *
 * Single choke point between raw model output and the DOM: Chat.tsx never
 * parses markdown itself and never uses dangerouslySetInnerHTML. Stored
 * strings remain raw markdown (no data-contract change). T-02 layers
 * sanitization here without touching call sites.
 *
 * Uses react-markdown + remark-gfm (maintained unified pipeline). Raw HTML
 * in the source is not rendered as DOM (no rehype-raw). Link/image URLs are
 * scheme-restricted so javascript: and data: never reach href/src.
 */

/** Schemes allowed after defaultUrlTransform (relative URLs have no scheme). */
const ALLOWED_SCHEMES = new Set(["http", "https", "mailto"]);

/**
 * Restrict URL schemes at render time. Builds on react-markdown's
 * defaultUrlTransform, then allowlists http/https/mailto and relative URLs.
 * Disallowed schemes (javascript:, data:, …) become an empty string so they
 * never appear as an href/src value.
 */
export const safeUrlTransform = (url: string): string => {
  const transformed = defaultUrlTransform(url);
  if (transformed === "") {
    return "";
  }

  const colon = transformed.indexOf(":");
  if (colon === -1) {
    return transformed;
  }

  const scheme = transformed.slice(0, colon).toLowerCase();
  if (ALLOWED_SCHEMES.has(scheme)) {
    return transformed;
  }

  return "";
};

export interface MarkdownContentProps {
  /** Raw markdown source. Parsing is display-time only; callers keep the string. */
  markdown: string;
}

/**
 * The sole entry point Chat uses for assistant markdown. Keep this the only
 * place that constructs ReactMarkdown so T-02 has one sanitization boundary.
 */
export const MarkdownContent = ({
  markdown,
}: MarkdownContentProps): ReactElement =>
  createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm],
    urlTransform: safeUrlTransform,
    children: markdown,
  });
