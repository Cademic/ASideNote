import type { CSSProperties, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

/**
 * Adapted from https://magicui.design/docs/components/shimmer-button
 * (no shadcn/`cn` dependency in this repo; wraps react-router's `Link` instead of a `<button>`).
 */
interface ShimmerButtonProps extends Omit<LinkProps, "children"> {
  children: ReactNode;
  shimmerColor?: string;
  /** Angular width of the bright streak in the conic-gradient spark — larger reads as "thicker". @default "180deg" */
  spread?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  /** @default "md" */
  size?: "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<"md" | "lg", string> = {
  md: "px-6 py-3 text-sm",
  lg: "px-7 py-3.5 text-sm",
};

export function ShimmerButton({
  children,
  shimmerColor = "#e5e7eb",
  spread = "180deg",
  shimmerSize = "0.1em",
  shimmerDuration = "3s",
  borderRadius = "9999px",
  background = "var(--land-slate)",
  size = "md",
  className = "",
  ...props
}: ShimmerButtonProps) {
  return (
    <Link
      style={
        {
          "--spread": spread,
          "--shimmer-color": shimmerColor,
          "--radius": borderRadius,
          "--speed": shimmerDuration,
          "--cut": shimmerSize,
          "--bg": background,
        } as CSSProperties
      }
      className={`group relative z-0 inline-flex w-fit shrink-0 cursor-pointer items-center justify-center gap-2 self-center overflow-hidden whitespace-nowrap font-medium text-[var(--land-slate-fg)] [border-radius:var(--radius)] [background:var(--bg)] transform-gpu transition-transform duration-200 ease-out-smooth hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:transform-none ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {/* spark container */}
      <div className="shimmer-btn-spark-container absolute inset-0 -z-30 overflow-visible blur-[2px]">
        {/* spark */}
        <div className="animate-shimmer-slide absolute inset-0 aspect-square h-[100cqh] rounded-none [mask:none]">
          {/* spark before */}
          <div className="animate-spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]" />
        </div>
      </div>

      {children}

      {/* highlight */}
      <div className="pointer-events-none absolute inset-0 size-full [border-radius:var(--radius)] shadow-[inset_0_-8px_10px_#ffffff1f] transform-gpu transition-all duration-300 ease-in-out group-hover:shadow-[inset_0_-6px_10px_#ffffff3f] group-active:shadow-[inset_0_-10px_10px_#ffffff3f]" />

      {/* backdrop */}
      <div className="absolute inset-[var(--cut)] -z-20 [border-radius:var(--radius)] [background:var(--bg)]" />
    </Link>
  );
}
