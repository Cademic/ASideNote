import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  FolderOpen,
  Calendar,
  PenTool,
  ArrowRight,
  ClipboardList,
  LayoutDashboard,
  Sparkles,
  CheckCircle2,
  StickyNote,
  Users,
  Pin,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";

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
    tilt: "-rotate-1",
  },
  {
    icon: PenTool,
    title: "Chalk Boards",
    description:
      "Sketch diagrams and brainstorm visually on an infinite canvas with a natural chalk-on-slate feel.",
    tapeColor: "bg-emerald-400/60 dark:bg-emerald-500/35",
    iconBg: "bg-emerald-100/80 dark:bg-emerald-900/25",
    accent: "text-emerald-600 dark:text-emerald-400",
    tilt: "rotate-1",
  },
  {
    icon: FolderOpen,
    title: "Projects",
    description:
      "Group related boards under projects to keep every deliverable and plan in one organized workspace.",
    tapeColor: "bg-violet-400/60 dark:bg-violet-500/35",
    iconBg: "bg-violet-100/80 dark:bg-violet-900/25",
    accent: "text-violet-600 dark:text-violet-400",
    tilt: "rotate-1",
  },
  {
    icon: Calendar,
    title: "Calendar",
    description:
      "See deadlines and milestones at a glance. Plan your week with a view that ties directly into your projects.",
    tapeColor: "bg-sky-400/60 dark:bg-sky-500/35",
    iconBg: "bg-sky-100/80 dark:bg-sky-900/25",
    accent: "text-sky-600 dark:text-sky-400",
    tilt: "-rotate-1",
  },
];

/* ─── How it works data ───────────────────────────────── */

const HOW_IT_WORKS = [
  {
    icon: LayoutDashboard,
    title: "Create a Project & Board",
    description: "Start a project, then add a note board or chalk board to it.",
    color: "yellow" as const,
    rotation: -2.5,
  },
  {
    icon: StickyNote,
    title: "Add & Organize",
    description:
      "Pin sticky notes, index cards, and sketches, then drag them into place.",
    color: "rose" as const,
    rotation: 1.5,
  },
  {
    icon: Users,
    title: "Collaborate with Friends",
    description:
      "Invite friends to your boards and projects and work together in real time.",
    color: "sky" as const,
    rotation: -1.5,
  },
];

const STICKY_BG: Record<string, string> = {
  yellow: "bg-amber-100 dark:bg-amber-950",
  rose: "bg-rose-100 dark:bg-rose-950",
  sky: "bg-sky-100 dark:bg-sky-950",
};

const STICKY_ACCENT: Record<string, string> = {
  yellow: "text-amber-700 dark:text-amber-300",
  rose: "text-rose-700 dark:text-rose-300",
  sky: "text-sky-700 dark:text-sky-300",
};

const DASHBOARD_VIDEO_SRC = {
  light: "/ASideNoteLight.mp4",
  dark: "/ASideNoteDark.mp4",
} as const;

/* ─── Scroll-reveal wrapper ───────────────────────────── */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, isVisible } = useRevealOnScroll<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`landing-reveal ${isVisible ? "is-visible" : ""} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

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
    <div className="min-h-screen bg-background bg-dots">
      {/* ── Navbar — matches app Navbar styling ───────────── */}
      <header className="navbar-surface sticky top-0 z-30 border-b border-border/50">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2" title="ASideNote">
            <img
              src="/asidenote-logo-square.png"
              alt=""
              className="h-8 w-8 object-contain"
            />
            <span className="text-sm font-bold tracking-tight text-foreground">
              ASideNote
            </span>
          </Link>

          <div className="hidden items-center gap-6 sm:flex">
            <a
              href="#features"
              className="relative text-sm font-medium text-foreground/60 transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-amber-500 after:transition-all after:duration-200 hover:text-foreground hover:after:w-full"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="relative text-sm font-medium text-foreground/60 transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-amber-500 after:transition-all after:duration-200 hover:text-foreground hover:after:w-full"
            >
              How It Works
            </a>
          </div>

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
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:bg-amber-600 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
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
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:bg-amber-600 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero — two-column: copy + live app preview ────── */}
      <section className="mx-auto max-w-6xl px-6 pt-10 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Copy column */}
          <div>
            <Reveal>
              <span className="-rotate-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm dark:bg-amber-900/40 dark:text-amber-300">
                <Sparkles className="h-3.5 w-3.5" />
                Fun &amp; functional notetaking
              </span>
            </Reveal>

            <Reveal delay={100} className="mt-4">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Turn ideas into{" "}
                <span className="text-amber-600 dark:text-amber-400">
                  organized action
                </span>
              </h1>
            </Reveal>

            <Reveal delay={200} className="mt-6">
              <p className="notepad-ruled-line max-w-xl pb-2 text-lg leading-relaxed text-foreground/55">
                ASideNote brings note boards, chalk boards, projects, and a calendar into one place so you can capture thoughts when they strike and turn them into plans that get done.
              </p>
            </Reveal>

            <Reveal delay={300} className="mt-6">
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/60">
                <li className="group flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-600 transition-transform duration-150 group-hover:scale-125 dark:text-amber-400" />
                  Free to start
                </li>
                <li className="group flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 transition-transform duration-150 group-hover:scale-125 dark:text-emerald-400" />
                  No clunky folders
                </li>
                <li className="group flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600 transition-transform duration-150 group-hover:scale-125 dark:text-sky-400" />
                  Organize visually
                </li>
              </ul>
            </Reveal>

            <Reveal delay={400} className="mt-8">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    className="group inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:bg-amber-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="group inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:bg-amber-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
                    >
                      Create Free Account
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition-colors duration-150 hover:border-border/80 hover:bg-surface/80 motion-reduce:transition-none"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </Reveal>
          </div>

          {/* Live app preview — theme-aware demo video, pinned to the board */}
          <Reveal delay={200}>
            <div className="relative rotate-1">
              <Pin
                className="landing-pin absolute -top-3 left-1/2 z-10 h-7 w-7 text-amber-500 drop-shadow dark:text-amber-400"
                fill="currentColor"
              />
              <div className="overflow-hidden rounded-xl border border-border/60 bg-surface/50 shadow-md transition-shadow duration-300 hover:shadow-lg aspect-video min-h-[200px]">
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
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Features — notebook section + paper cards ─────── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        {/* Section header — notebook style */}
        <Reveal>
          <div className="mb-6 flex items-center gap-2.5 border-l-[3px] border-l-amber-400 pl-3 dark:border-l-amber-500">
            <Sparkles className="h-5 w-5 text-foreground/50" />
            <h2 className="text-base font-semibold text-foreground">
              What you can do
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 80}>
              <div
                className={`paper-card group relative flex flex-col rounded-lg p-5 pt-7 transition-[transform,box-shadow] duration-200 ease-out-smooth hover:-translate-y-1.5 hover:rotate-0 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:transform-none ${feature.tilt}`}
              >
                {/* Colored tape strip */}
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 rounded-t-lg ${feature.tapeColor}`}
                />

                {/* Icon */}
                <div
                  className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110 ${feature.iconBg}`}
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
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How It Works — 3-step flow ────────────────────── */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 pb-16" aria-labelledby="how-it-works-heading">
        <Reveal>
          <div className="mb-6 flex items-center gap-2.5 border-l-[3px] border-l-sky-400 pl-3 dark:border-l-sky-500">
            <LayoutDashboard className="h-5 w-5 text-foreground/50" />
            <h2 id="how-it-works-heading" className="text-base font-semibold text-foreground">
              How ASideNote Works
            </h2>
          </div>
        </Reveal>

        <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-center sm:gap-4">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} className="flex flex-1 items-center gap-4 sm:contents">
              <Reveal delay={i * 120} className="flex-1">
                <div
                  className={`stat-sticky flex flex-col items-center px-5 py-6 text-center ${STICKY_BG[step.color]}`}
                  style={{ "--stat-rotate": `${step.rotation}deg` } as CSSProperties}
                >
                  <step.icon className={`mb-2 h-6 w-6 ${STICKY_ACCENT[step.color]}`} />
                  <span className={`text-sm font-bold leading-snug sm:text-base ${STICKY_ACCENT[step.color]}`}>
                    {step.title}
                  </span>
                  <span className="mt-1.5 text-xs leading-relaxed text-foreground/60 dark:text-foreground/75">
                    {step.description}
                  </span>
                </div>
              </Reveal>

              {i < HOW_IT_WORKS.length - 1 && (
                <ArrowRight className="hidden h-5 w-5 shrink-0 text-foreground/25 sm:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA — sticky note style ──────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <Reveal>
          <div
            className="stat-sticky mx-auto max-w-2xl bg-purple-100 px-8 py-10 text-center dark:bg-purple-950 sm:px-12 sm:py-14"
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
                  className="group inline-flex items-center gap-2 rounded-lg bg-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:bg-purple-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-purple-600 dark:hover:bg-purple-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="group inline-flex items-center gap-2 rounded-lg bg-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:bg-purple-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-purple-600 dark:hover:bg-purple-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
                  >
                    Create Free Account
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 rounded-lg border border-purple-300/60 bg-purple-50/60 px-6 py-3 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-purple-50 dark:border-purple-800/40 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 motion-reduce:transition-none"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="navbar-surface border-t border-border/40">
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
