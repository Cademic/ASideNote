import { motion, useReducedMotion } from "framer-motion";

interface AnimatedCheckboxProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-describedby"?: string;
  className?: string;
}

/** Checkbox with a drawn-checkmark animation, adapted from https://animate-ui.com/docs/components/headless/checkbox for this app's editorial palette. */
export function AnimatedCheckbox({
  id,
  checked,
  onCheckedChange,
  className = "",
  ...props
}: AnimatedCheckboxProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--land-amber)]/40 focus-visible:ring-offset-1 ${
        checked
          ? "border-[var(--land-amber)] bg-[var(--land-amber)]"
          : "border-[var(--land-rule)] bg-[var(--land-white)]"
      } ${className}`}
      {...props}
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="3.5"
        stroke="var(--land-amber-ink)"
        className="h-3.5 w-3.5"
        initial="unchecked"
        animate={checked ? "checked" : "unchecked"}
      >
        <motion.path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 12.75l6 6 9-13.5"
          variants={{
            checked: {
              pathLength: 1,
              opacity: 1,
              transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.2, delay: 0.2 },
            },
            unchecked: {
              pathLength: 0,
              opacity: 0,
              transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.2 },
            },
          }}
        />
      </motion.svg>
    </motion.button>
  );
}
