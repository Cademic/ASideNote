/**
 * Reduces HTML-ish strings to plain text for empty-content checks (e.g. delete flows).
 * Removes balanced tags repeatedly, then strips any incomplete opening tag so substrings
 * like `&lt;script` cannot remain after partial tag removal.
 */
export function stripHtmlForPlainText(html: string): string {
  let result = html;
  let previous = "";
  while (result !== previous) {
    previous = result;
    result = result.replace(/<[^>]*>/g, "");
  }
  result = result.replace(/<[^>]*/g, "");
  return result.trim();
}
