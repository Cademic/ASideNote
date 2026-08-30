import { CalendarDays, FolderOpen } from "lucide-react";

/** Indentation classes for the fake projects-tree rows, so the placeholder reads as a tree. */
const TREE_ROW_INSETS = ["w-[70%]", "ml-4 w-[55%]", "ml-4 w-[60%]", "w-[65%]", "ml-4 w-[50%]", "ml-8 w-[45%]"];

/** Hours drawn in the fake day-schedule timeline. */
const TIMELINE_HOURS = ["8", "9", "10", "11", "12", "13", "14", "15"];

/**
 * Loading placeholder for {@link DashboardLayout}. Matches its two-panel structure —
 * the 460/560px "Projects + day schedule" column against the Active Canvas — so the
 * page doesn't jump when real data arrives. Uses the shared `.skeleton` shimmer class.
 */
export function DashboardSkeleton() {
  return (
    <div
      className="flex w-full min-w-0 flex-col lg:h-full lg:min-h-0 lg:flex-row lg:overflow-hidden"
      aria-busy="true"
      aria-label="Loading your workspace"
    >
      {/* Left column — greeting, projects tree, day schedule */}
      <div className="border-[var(--land-rule)] lg:h-full lg:min-h-0 lg:w-[460px] lg:flex-none lg:overflow-hidden lg:border-r xl:w-[560px]">
        <div className="flex w-full flex-col bg-[var(--land-paper)] lg:h-full lg:min-h-0">
          {/* Greeting */}
          <div className="shrink-0 border-b border-[var(--land-rule)] px-5 pt-6 pb-5">
            <div className="skeleton h-6 w-52" />
          </div>

          {/* Projects */}
          <div className="flex flex-col border-t border-[var(--land-rule)] bg-[var(--land-butter)] lg:shrink-0 lg:border-t-0">
            <div className="flex items-center gap-2 px-5 pt-5 pb-3">
              <FolderOpen className="h-4 w-4 shrink-0 text-[var(--land-ink-3)]" aria-hidden />
              <div className="skeleton h-4 w-20" />
            </div>
            <div className="space-y-2 px-4 pb-4">
              {TREE_ROW_INSETS.map((inset, i) => (
                <div key={i} className={`skeleton h-8 ${inset}`} />
              ))}
            </div>
          </div>

          {/* Day schedule */}
          <div className="flex flex-col border-t border-[var(--land-rule)] lg:min-h-0 lg:flex-1">
            <div className="flex items-center gap-1.5 px-5 pt-5 pb-3">
              <CalendarDays className="h-4 w-4 shrink-0 text-[var(--land-ink-3)]" aria-hidden />
              <div className="skeleton h-4 w-40" />
            </div>
            <div className="space-y-3 px-5 pb-5">
              {TIMELINE_HOURS.map((hour) => (
                <div key={hour} className="flex items-start gap-3">
                  <div className="skeleton mt-0.5 h-3 w-8 shrink-0" />
                  <div className="skeleton h-9 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active Canvas — desktop only, matching the layout's lg breakpoint */}
      <div className="relative hidden min-h-0 min-w-0 flex-1 overflow-hidden bg-[var(--land-paper)] lg:block">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="skeleton h-4 w-40 flex-1" />
          <div className="skeleton h-7 w-28 shrink-0" />
        </div>
      </div>
    </div>
  );
}
