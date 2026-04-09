import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--color-background) / <alpha-value>)",
        foreground: "hsl(var(--color-foreground) / <alpha-value>)",
        surface: "hsl(var(--color-surface) / <alpha-value>)",
        border: "hsl(var(--color-border) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--color-primary) / <alpha-value>)",
          foreground: "hsl(var(--color-primary-foreground) / <alpha-value>)",
        },
      },
      transitionTimingFunction: {
        spring:    "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-smooth": "cubic-bezier(0.2, 0, 0, 1)",
        "in-smooth":  "cubic-bezier(0.4, 0, 1, 1)",
      },
      keyframes: {
        "dialog-enter": {
          from: { opacity: "0", transform: "scale(0.96) translateY(6px)" },
          to:   { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "overlay-enter": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "page-enter": {
          from: { opacity: "0", transform: "translateY(5px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "ripple-out": {
          "0%":   { transform: "scale(1)",   opacity: "0.7" },
          "100%": { transform: "scale(2.8)", opacity: "0" },
        },
        "skel-shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "dialog-enter":  "dialog-enter 0.22s cubic-bezier(0.16, 1, 0.3, 1) both",
        "overlay-enter": "overlay-enter 0.18s ease-out both",
        "page-enter":    "page-enter 0.22s cubic-bezier(0.2, 0, 0, 1) both",
        "ripple-out":    "ripple-out 0.85s cubic-bezier(0.2, 0, 0, 1) infinite",
        "skel-shimmer":  "skel-shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
