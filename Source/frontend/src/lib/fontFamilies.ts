/**
 * Font stacks for TipTap `fontFamily` (stored as inline style). Labels are user-facing;
 * values use common system / web-safe fallbacks so text renders on Windows, macOS, and Linux.
 */
export const FONT_FAMILIES: { label: string; value: string }[] = [
  // App / theme defaults
  { label: "Sans (default)", value: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { label: "Serif (default)", value: "Georgia, Cambria, 'Times New Roman', serif" },
  { label: "Monospace", value: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  { label: "Cursive", value: "'Segoe Script', 'Comic Sans MS', cursive" },

  // Sans-serif — common document / UI fonts
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Arial Black", value: "'Arial Black', 'Helvetica Neue', sans-serif" },
  { label: "Calibri", value: "Calibri, 'Segoe UI', sans-serif" },
  { label: "Candara", value: "Candara, Verdana, sans-serif" },
  { label: "Century Gothic", value: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif" },
  { label: "Corbel", value: "Corbel, 'Segoe UI', sans-serif" },
  { label: "Franklin Gothic", value: "'Franklin Gothic Medium', 'Arial Narrow', sans-serif" },
  { label: "Geneva", value: "Geneva, Verdana, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Helvetica Neue", value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: "Impact", value: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" },
  { label: "Lucida Grande", value: "'Lucida Grande', 'Lucida Sans Unicode', sans-serif" },
  { label: "Lucida Sans Unicode", value: "'Lucida Sans Unicode', 'Lucida Grande', sans-serif" },
  { label: "Segoe UI", value: "'Segoe UI', SegoeUI, system-ui, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, Verdana, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },

  // Serif — body & headings
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Times", value: "Times, 'Times New Roman', serif" },
  { label: "Baskerville", value: "Baskerville, 'Times New Roman', serif" },
  { label: "Book Antiqua", value: "'Book Antiqua', Palatino, serif" },
  { label: "Bookman Old Style", value: "'Bookman Old Style', Georgia, serif" },
  { label: "Cambria", value: "Cambria, Georgia, serif" },
  { label: "Constantia", value: "Constantia, Cambria, Georgia, serif" },
  { label: "Garamond", value: "Garamond, 'Palatino Linotype', serif" },
  { label: "Georgia", value: "Georgia, Cambria, serif" },
  { label: "Palatino Linotype", value: "'Palatino Linotype', Palatino, serif" },
  { label: "Palatino", value: "Palatino, 'Palatino Linotype', serif" },

  // Monospace — code & typewriter
  { label: "Consolas", value: "Consolas, 'Courier New', monospace" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
  { label: "Courier", value: "Courier, 'Courier New', monospace" },
  { label: "Lucida Console", value: "'Lucida Console', Monaco, monospace" },

  // Casual / display
  { label: "Comic Sans MS", value: "'Comic Sans MS', 'Comic Sans', cursive" },
  { label: "Brush Script MT", value: "'Brush Script MT', 'Segoe Script', cursive" },
];
