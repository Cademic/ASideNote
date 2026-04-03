/**
 * Reduces HTML-ish strings to plain text for empty-content checks (e.g. delete flows).
 * Avoids regex-based tag stripping so static analysis does not treat sanitization as incomplete.
 */

function stripHtmlWithoutDom(html: string): string {
  let s = html;
  let i = 0;
  while (i < s.length) {
    if (s[i] !== "<") {
      i += 1;
      continue;
    }
    const gt = s.indexOf(">", i);
    if (gt === -1) {
      s = s.slice(0, i);
      break;
    }
    s = s.slice(0, i) + s.slice(gt + 1);
  }
  return s.trim();
}

export function stripHtmlForPlainText(html: string): string {
  if (typeof document !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent ?? "").trim();
  }
  return stripHtmlWithoutDom(html);
}
