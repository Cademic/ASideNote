import { useRef, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export interface UseCaseTab {
  id: string;
  label: string;
  icon: LucideIcon;
  accentColor: string;
  pitch: string;
  bullets?: string[];
}

interface UseCaseTabsProps {
  tabs: UseCaseTab[];
  className?: string;
}

/** Fixed dark ink for text/icons on solid accent backgrounds — accent colors don't change with theme, so this shouldn't either (unlike `--land-ink`, which flips to near-white in dark mode). */
const ON_ACCENT_INK = "#1b1a17";

/** Accessible tablist with a sliding highlight pill and animated panel content. Keyboard nav follows the WAI-ARIA APG automatic-activation tabs pattern. */
export function UseCaseTabs({ tabs, className = "" }: UseCaseTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const prefersReducedMotion = useReducedMotion();

  const activate = (index: number) => {
    setActiveIndex(index);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        activate((activeIndex + 1) % tabs.length);
        break;
      case "ArrowLeft":
        event.preventDefault();
        activate((activeIndex - 1 + tabs.length) % tabs.length);
        break;
      case "Home":
        event.preventDefault();
        activate(0);
        break;
      case "End":
        event.preventDefault();
        activate(tabs.length - 1);
        break;
    }
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Who ASideNote is for"
        onKeyDown={handleKeyDown}
        className="grid grid-cols-3 gap-1.5 rounded-2xl border border-[var(--land-rule)] bg-[var(--land-paper)] p-1.5 shadow-sm"
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              className="relative flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium"
              style={{ color: isActive ? ON_ACCENT_INK : "var(--land-ink-3)" }}
            >
              {isActive && (
                <motion.div
                  layoutId="use-case-tab-highlight"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: tab.accentColor }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 300, damping: 30 }
                  }
                />
              )}
              <tab.icon className="relative z-10 h-4 w-4" aria-hidden="true" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="relative mt-5 grid overflow-hidden rounded-2xl border border-[var(--land-rule)] bg-[var(--land-paper)] shadow-sm">
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <motion.div
              key={tab.id}
              role="tabpanel"
              id={`panel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              aria-hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
              animate={{ opacity: isActive ? 1 : 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
              className={`col-start-1 row-start-1 p-6 ${isActive ? "" : "pointer-events-none select-none"}`}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: tab.accentColor }}
              >
                <tab.icon className="h-5 w-5" style={{ color: ON_ACCENT_INK }} aria-hidden="true" />
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--land-ink)]">{tab.pitch}</p>
              {tab.bullets && (
                <ul className="mt-3 space-y-1.5 text-sm text-[var(--land-ink-2)]">
                  {tab.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--land-ink-3)]" aria-hidden="true" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
