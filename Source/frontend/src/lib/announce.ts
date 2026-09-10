/**
 * Screen-reader announcements without a React provider. Lazily mounts two
 * visually-hidden ARIA live regions on `document.body` and routes messages to
 * the polite or assertive one. Use for state that has no visible text a screen
 * reader would otherwise catch: route changes, result counts, async save /
 * error outcomes, drag-and-drop moves performed via the keyboard.
 */

type Politeness = "polite" | "assertive";

const regions: Partial<Record<Politeness, HTMLElement>> = {};

function getRegion(politeness: Politeness): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const existing = regions[politeness];
  if (existing?.isConnected) return existing;

  const el = document.createElement("div");
  el.setAttribute("aria-live", politeness);
  el.setAttribute("aria-atomic", "true");
  el.setAttribute("role", politeness === "assertive" ? "alert" : "status");
  el.className = "sr-only";
  el.dataset.a11yLiveRegion = politeness;
  document.body.appendChild(el);
  regions[politeness] = el;
  return el;
}

export function announce(message: string, politeness: Politeness = "polite") {
  const region = getRegion(politeness);
  if (!region || !message) return;
  // Clearing first guarantees repeat messages (identical text) are re-announced.
  region.textContent = "";
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
}
