import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryCarouselRowProps {
  children: ReactNode;
}

/**
 * Horizontally-scrolling, bounded (non-infinite) row of fixed-size cards.
 * Finger and trackpad swipes pan it natively (plain `overflow-x-auto`, no
 * wheel interception) — a horizontal swipe scrolls the row, a vertical one
 * falls through to scroll the page, since the row itself has no vertical
 * overflow to consume it. The arrow buttons are a desktop convenience and
 * hide themselves once there's nothing left in that direction — there is no
 * wraparound.
 */
export function GalleryCarouselRow({ children }: GalleryCarouselRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 4);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      resizeObserver.disconnect();
      el.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState, children]);

  function scrollByPage(direction: 1 | -1) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  }

  return (
    <div className="group/carousel relative -mx-10 lg:mx-0">
      <div
        ref={scrollRef}
        className="flex snap-x snap-proximity gap-3 overflow-x-auto scroll-smooth scrollbar-hide pb-1"
      >
        {children}
      </div>

      {canScrollPrev && (
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          aria-label="Scroll left"
          className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background p-1.5 text-foreground/60 opacity-0 shadow-md transition-opacity hover:text-foreground group-hover/carousel:opacity-100 lg:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {canScrollNext && (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label="Scroll right"
          className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background p-1.5 text-foreground/60 opacity-0 shadow-md transition-opacity hover:text-foreground group-hover/carousel:opacity-100 lg:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
