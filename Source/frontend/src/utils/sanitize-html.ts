import DOMPurify from "dompurify";

/**
 * Sanitizes TipTap-authored HTML before it is rendered via dangerouslySetInnerHTML.
 * Boards/notebooks are shared in real time, so note/card content saved by one user
 * (or synced from another client) must never be trusted as safe markup.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["u"],
    ADD_ATTR: ["target"],
  });
}
