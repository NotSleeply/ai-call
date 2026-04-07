import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function renderMarkdown(content: string): string {
  const parsed = marked.parse(content);
  const html = typeof parsed === "string" ? parsed : "";
  return DOMPurify.sanitize(html);
}
