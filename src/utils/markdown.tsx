/**
 * JSX entry for the markdown choke point. Implementation lives in markdown.ts
 * (createElement) so Jest's TypeScript transform can load it without a separate
 * .tsx parser when only .ts is configured. Prefer `import … from "../utils/markdown"`.
 */
export {
  MarkdownContent,
  safeUrlTransform,
} from "./markdown";
export type { MarkdownContentProps } from "./markdown";
