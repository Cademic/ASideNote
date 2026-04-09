/**
 * Central animation constants — durations (ms) and easing functions.
 * Use these for inline style / JS-driven animations (RAF loops, style.transition).
 * For Tailwind class-based animations, use the extended theme tokens.
 */

export const duration = {
  fast:   150,
  base:   200,
  medium: 250,
  slow:   350,
} as const;

export const easing = {
  out:    "cubic-bezier(0.2, 0, 0, 1)",
  in:     "cubic-bezier(0.4, 0, 1, 1)",
  spring: "cubic-bezier(0.16, 1, 0.3, 1)",
  linear: "linear",
} as const;

/** Inline transition shorthand builders */
export const transition = {
  transform: (ms = duration.base) => `transform ${ms}ms ${easing.out}`,
  colors:    (ms = duration.fast)  => `color ${ms}ms ${easing.out}, background-color ${ms}ms ${easing.out}`,
  shadow:    (ms = duration.base)  => `box-shadow ${ms}ms ${easing.out}`,
  all:       (ms = duration.base)  => `transform ${ms}ms ${easing.out}, box-shadow ${ms}ms ${easing.out}`,
} as const;
