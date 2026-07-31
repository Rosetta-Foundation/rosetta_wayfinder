import type { QueueItem, QueueSection, QueueState } from "../types";

const QUEUE_TEMPLATE = `# Work Queue

_Your personal "what's next?" list. Edit freely — tags make items machine-readable._
_Tags: \`[jira:KEY]\` \`[prd:NNNN/N]\` \`[due:YYYY-MM-DD]\` \`[blocked:reason]\` \`[follow-up]\` \`[idea]\`_

## Active
<!-- empty -->

## Next Up
<!-- empty -->

## Inbox
<!-- empty -->
`;

const TAG_RE = /\[([^\]]+)\]/g;

const parseTags = (line: string): string[] => {
  // Strip the leading checkbox marker before scanning for tags so `[ ]` is not captured.
  const body = line.replace(/^- \[[ x]\] /i, "");
  const tags: string[] = [];
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(body)) !== null) {
    tags.push(m[1]);
  }
  return tags;
};

const itemText = (line: string): string =>
  line
    .replace(/^- \[[ x]\] /, "")
    .replace(TAG_RE, "")
    .trim();

const parseItem = (line: string): QueueItem | null => {
  const checked = /^- \[x\] /i.test(line);
  const isItem = /^- \[[ x]\] /i.test(line);
  if (!isItem) return null;
  return { text: itemText(line), checked, tags: parseTags(line) };
};

/** Parse queue.md content into structured sections. */
export const parseQueue = (raw: string): QueueState => {
  const lines = raw.split("\n");
  const sections: QueueSection[] = [];
  let current: QueueSection | null = null;

  for (const line of lines) {
    if (/^## /.test(line)) {
      if (current) sections.push(current);
      current = { title: line.replace(/^## /, "").trim(), items: [] };
    } else if (current) {
      const item = parseItem(line);
      if (item) current.items.push(item);
    }
  }
  if (current) sections.push(current);

  return { sections, raw };
};

/** Toggle a checkbox in the raw queue content and return the updated string. */
export const toggleItemInRaw = (
  raw: string,
  sectionTitle: string,
  itemText: string,
): string => {
  const lines = raw.split("\n");
  let inSection = false;

  return lines
    .map((line) => {
      if (/^## /.test(line)) {
        inSection = line.replace(/^## /, "").trim() === sectionTitle;
        return line;
      }
      if (!inSection) return line;

      const item = parseItem(line);
      if (!item) return line;
      if (item.text !== itemText) return line;

      // Flip the checkbox.
      return item.checked
        ? line.replace(/^(- \[)x(\])/, "$1 $2")
        : line.replace(/^(- \[) (\])/, "$1x$2");
    })
    .join("\n");
};

/** The default queue.md content for a new workspace. */
export const defaultQueueContent = (): string => QUEUE_TEMPLATE;
