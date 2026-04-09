import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  StickyNote,
  FolderOpen,
  Calendar,
  PenTool,
  ArrowRight,
  ClipboardList,
  LayoutDashboard,
  CreditCard,
  Sparkles,
  CheckCircle2,
  Pin,
  CalendarDays,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";

/* ─── Feature data ────────────────────────────────────── */

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Note Boards",
    description:
      "Pin sticky notes and index cards to a freeform cork board. Rearrange them as your thinking evolves.",
    tapeColor: "bg-amber-400/60 dark:bg-amber-500/35",
    iconBg: "bg-amber-100/80 dark:bg-amber-900/25",
    accent: "text-amber-600 dark:text-amber-400",
  },
  {
    icon: PenTool,
    title: "Chalk Boards",
    description:
      "Sketch diagrams and brainstorm visually on an infinite canvas with a natural chalk-on-slate feel.",
    tapeColor: "bg-emerald-400/60 dark:bg-emerald-500/35",
    iconBg: "bg-emerald-100/80 dark:bg-emerald-900/25",
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: FolderOpen,
    title: "Projects",
    description:
      "Group related boards under projects to keep every deliverable and plan in one organized workspace.",
    tapeColor: "bg-violet-400/60 dark:bg-violet-500/35",
    iconBg: "bg-violet-100/80 dark:bg-violet-900/25",
    accent: "text-violet-600 dark:text-violet-400",
  },
  {
    icon: Calendar,
    title: "Calendar",
    description:
      "See deadlines and milestones at a glance. Plan your week with a view that ties directly into your projects.",
    tapeColor: "bg-sky-400/60 dark:bg-sky-500/35",
    iconBg: "bg-sky-100/80 dark:bg-sky-900/25",
    accent: "text-sky-600 dark:text-sky-400",
  },
];

/* ─── Highlight sticky data ───────────────────────────── */

const HIGHLIGHTS = [
  {
    icon: StickyNote,
    label: "Sticky Notes",
    value: "Capture fast",
    color: "yellow" as const,
    rotation: -2.5,
  },
  {
    icon: CreditCard,
    label: "Index Cards",
    value: "Rich editing",
    color: "sky" as const,
    rotation: 1.5,
  },
  {
    icon: PenTool,
    label: "Chalk Canvas",
    value: "Draw freely",
    color: "green" as const,
    rotation: -1,
  },
  {
    icon: FolderOpen,
    label: "Projects",
    value: "Stay organized",
    color: "rose" as const,
    rotation: 2,
  },
];

const STICKY_BG: Record<string, string> = {
  yellow: "bg-amber-100 dark:bg-amber-900/35",
  rose: "bg-rose-100 dark:bg-rose-900/35",
  sky: "bg-sky-100 dark:bg-sky-900/35",
  green: "bg-emerald-100 dark:bg-emerald-900/35",
};

const STICKY_ACCENT: Record<string, string> = {
  yellow: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
  sky: "text-sky-600 dark:text-sky-400",
  green: "text-emerald-600 dark:text-emerald-400",
};

const DASHBOARD_VIDEO_SRC = {
  light: "/ASideNoteLight.mp4",
  dark: "/ASideNoteDark.mp4",
} as const;

/* ─── Component ───────────────────────────────────────── */

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { setThemeMode, effectiveTheme } = useThemeContext();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  function handleThemeToggle() {
    setThemeMode(effectiveTheme === "dark" ? "light" : "dark");
  }

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar — matches app Navbar styling ───────────── */}
      <header className="navbar-surface sticky top-0 z-30 border-b border-border/50">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-end px-4 sm:px-6">
          <nav className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleThemeToggle}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background"
              aria-label={effectiveTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {effectiveTheme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-amber-600 dark:hover:bg-amber-500"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero — notepad card ───────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pt-10 sm:pt-16">
        <div className="notepad-card">
          <div className="notepad-spiral-strip" />
          <div className="notepad-body relative px-8 py-12 sm:px-16 sm:py-16">
            <div className="mx-auto max-w-3xl text-center">
              <img
                src={
                  effectiveTheme === "dark"
                    ? "/ASideNotTextDark.png"
                    : "/ASideNoteText.png"
                }
                alt="Your visual workspace for ideas"
                className="mx-auto mb-6 h-32 w-auto object-contain sm:h-[10rem]"
              />

              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Turn ideas into{" "}
                <span className="text-amber-600 dark:text-amber-400">
                  organized action
                </span>
              </h1>

              <p className="notepad-ruled-line mx-auto mt-6 max-w-2xl pb-2 text-lg leading-relaxed text-foreground/55">
              ASideNote brings note boards, chalk boards, projects, and a calendar into one place so you can capture thoughts when they strike and turn them into plans that get done.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-amber-600 dark:hover:bg-amber-500"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-amber-600 dark:hover:bg-amber-500"
                    >
                      Create Free Account
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition-all hover:border-border/80 hover:bg-surface/80"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Highlight Sticky Notes ────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {HIGHLIGHTS.map((h) => (
            <div
              key={h.label}
              className={`stat-sticky flex flex-col items-center justify-center px-4 py-6 ${STICKY_BG[h.color]}`}
              style={{ transform: `rotate(${h.rotation}deg)` }}
            >
              <h.icon className={`mb-2 h-5 w-5 ${STICKY_ACCENT[h.color]}`} />
              <span
                className={`text-base font-bold leading-none sm:text-lg ${STICKY_ACCENT[h.color]}`}
              >
                {h.value}
              </span>
              <span className="mt-1.5 text-[11px] font-medium text-foreground/45">
                {h.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features — notebook section + paper cards ─────── */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        {/* Section header — notebook style */}
        <div className="mb-6 flex items-center gap-2.5 border-l-[3px] border-l-amber-400 pl-3 dark:border-l-amber-500">
          <Sparkles className="h-5 w-5 text-foreground/50" />
          <h2 className="text-base font-semibold text-foreground">
            What you can do
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="paper-card group relative flex flex-col rounded-lg p-5 pt-7 transition-all duration-200 hover:-translate-y-1"
            >
              {/* Colored tape strip */}
              <div
                className={`absolute inset-x-0 top-0 h-1.5 rounded-t-lg ${feature.tapeColor}`}
              />

              {/* Icon */}
              <div
                className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${feature.iconBg}`}
              >
                <feature.icon className={`h-5 w-5 ${feature.accent}`} />
              </div>

              <h3 className="mb-1.5 text-sm font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-xs leading-relaxed text-foreground/50">
                {feature.description}
              </p>

              {/* Ruled-line footer */}
              <div className="mt-auto flex items-center border-t border-blue-200/25 pt-3 text-xs text-foreground/35 dark:border-blue-300/10">
                <CheckCircle2 className="mr-1.5 h-3 w-3" />
                Included free
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── See it in action — dashboard demo video ───────── */}
      <section className="mx-auto max-w-6xl px-6 pb-16" aria-labelledby="demo-heading">
        <div className="mb-6 flex items-center gap-2.5 border-l-[3px] border-l-sky-400 pl-3 dark:border-l-sky-500">
          <LayoutDashboard className="h-5 w-5 text-foreground/50" />
          <h2 id="demo-heading" className="text-base font-semibold text-foreground">
            See it in action
          </h2>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          {/* Video — theme-aware; remount on theme change. Aspect-ratio reserves space on mobile so the video area doesn't collapse; preload="auto" helps mobile load the first frame. */}
          <div className="flex-1 overflow-hidden rounded-xl border border-border/60 bg-surface/50 shadow-sm aspect-video min-h-[200px]">
            <video
              key={effectiveTheme}
              className="h-full w-full object-cover"
              src={DASHBOARD_VIDEO_SRC[effectiveTheme]}
              muted
              loop
              playsInline
              preload="auto"
              autoPlay={!prefersReducedMotion}
              aria-label="Dashboard walkthrough showing boards, projects, and calendar"
            />
          </div>

          {/* Copy + bullets + CTA */}
          <div className="notepad-card flex-1 min-w-0">
            <div className="notepad-spiral-strip" />
            <div className="notepad-body relative px-8 py-6 sm:px-12">
              <h3 className="text-xl font-bold text-foreground">
                Your boards, projects, and calendar in one place
              </h3>
              <p className="notepad-ruled-line mt-3 max-w-md pb-1.5 text-sm text-foreground/50">
                The dashboard brings everything together so you always know what
                needs attention next. No more jumping between apps.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-foreground/70" aria-label="Highlights">
                <li className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  Create note and chalk boards
                </li>
                <li className="flex items-center gap-2">
                  <Pin className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  Pin favorites to your dashboard
                </li>
                <li className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  See upcoming events at a glance
                </li>
              </ul>
              <Link
                to={isAuthenticated ? "/dashboard" : "/register"}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-600 transition-colors hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              >
                {isAuthenticated ? "Go to Dashboard" : "Start for free"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA — sticky note style ──────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div
          className="stat-sticky mx-auto max-w-2xl bg-amber-100 px-8 py-10 text-center dark:bg-amber-950/40 sm:px-12 sm:py-14"
          style={{ transform: "rotate(-0.5deg)" }}
        >
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ready to get organized?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-foreground/55">
            Create a free account and start turning your ideas into action in
            minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                <LayoutDashboard className="h-4 w-4" />
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-amber-600 dark:hover:bg-amber-500"
                >
                  Get Started &mdash; It&apos;s Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50/60 px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="flex flex-1 basis-0 justify-start gap-4">
            <Link
              to="/privacy"
              className="text-xs text-foreground/40 transition-colors hover:text-foreground/60"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-xs text-foreground/40 transition-colors hover:text-foreground/60"
            >
              Terms and Conditions
            </Link>
          </div>
          <Link to="/" className="flex shrink-0 items-center text-foreground/40 transition-colors hover:text-foreground/60">
            <img
              src="/asidenote-logo.png"
              alt="ASideNote"
              className="h-14 w-auto object-contain opacity-70"
            />
          </Link>
          <div className="flex flex-1 basis-0 justify-end">
            <p className="text-xs text-foreground/30">
              &copy; {new Date().getFullYear()} ASideNote. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
