export const ROTATION_PRESETS = [-10, -5, -3, 0, 3, 5, 10];

export { FONT_FAMILIES } from "../../lib/fontFamilies";

export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 48;

export function parseFontSizeAttr(raw: string | undefined | null, fallback: number): number {
  if (!raw) return fallback;
  const n = parseInt(String(raw).replace(/px$/i, "").trim(), 10);
  return Number.isNaN(n) ? fallback : n;
}
export const FONT_SIZE_PRESETS = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

export const TEXT_COLORS = [
  { label: "Black", value: "#1f2937" },
  { label: "Red", value: "#dc2626" },
  { label: "Blue", value: "#2563eb" },
  { label: "Green", value: "#16a34a" },
  { label: "Orange", value: "#ea580c" },
  { label: "Purple", value: "#9333ea" },
];

/** Normalize to #rrggbb for `<input type="color">` (falls back if parsing fails). */
export function hexForColorInput(color: string): string {
  const t = color?.trim() ?? "";
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
  if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#1f2937";
}

/** Preset highlight background colors (TipTap multicolor highlight) */
export const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#86efac" },
  { label: "Blue", value: "#93c5fd" },
  { label: "Pink", value: "#f9a8d4" },
  { label: "Orange", value: "#fdba74" },
  { label: "Purple", value: "#c4b5fd" },
];
