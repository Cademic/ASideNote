import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { MarketingHeader } from "../components/layout/MarketingHeader";
import { Reveal } from "../components/ui/Reveal";
import { HexagonPattern } from "../components/ui/HexagonPattern";
import { Particles } from "../components/ui/Particles";

const SECTIONS = [
  {
    title: "What is ASideNote?",
    body: "ASideNote is a visual cork-board notetaking app. Instead of burying ideas in nested folders, you pin sticky notes and index cards to a freeform board and arrange them however your thinking actually works. It brings note boards, chalk boards, projects, and a calendar into one place, so capturing a thought and turning it into a plan happens in the same app.",
    tilt: "-rotate-1",
  },
  {
    title: "Note boards and chalk boards",
    body: "Note boards give you a freeform cork board for sticky notes and index cards that you can drag, resize, and rearrange as your thinking evolves. Chalk boards give you an infinite canvas with a natural chalk-on-slate feel for sketching diagrams and brainstorming visually. Use whichever fits the moment — or both.",
    tilt: "rotate-1",
  },
  {
    title: "Projects and calendar",
    body: "Group related boards under a project to keep every deliverable and plan in one organized workspace, and see deadlines and milestones at a glance in a calendar view that ties directly back into your projects.",
    tilt: "-rotate-1",
  },
  {
    title: "Built for visual thinkers",
    body: "ASideNote is for students, creators, and anyone who thinks better with sticky notes and arrows than with folders and files — whether you're planning solo or inviting friends onto a board to work together in real time.",
    tilt: "rotate-1",
  },
];

export function AboutPage() {
  const { isAuthenticated } = useAuth();
  const { effectiveTheme } = useThemeContext();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const primaryHref = isAuthenticated ? "/dashboard" : "/register";
  const primaryLabel = isAuthenticated ? "Go to Dashboard" : "Create free account";
  const particleColor = effectiveTheme === "dark" ? "#f2f2f0" : "#1b1a17";

  return (
    <div className="landing-editorial bg-dots font-editorial flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* ── Page hero — solid cream backdrop, no dots ───────── */}
        <section className="relative overflow-hidden bg-[var(--land-cream)] px-6 py-14 sm:py-20">
          <div className="landing-hero-glass" aria-hidden="true">
            <div className="landing-hero-glass-gradient" />
          </div>
          <HexagonPattern
            radius={32}
            className="fill-[var(--land-ink)]/[0.035] stroke-[var(--land-ink)]/[0.06] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)]"
          />
          <Reveal className="relative mx-auto max-w-2xl text-center">
            <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[var(--land-ink-3)]">
              About
            </p>
            <h1 className="font-display mt-3 text-3xl font-medium text-[var(--land-ink)] sm:text-4xl">
              Your visual workspace for turning ideas into organized action
            </h1>
          </Reveal>
        </section>

        {/* ── Content cards ────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 py-14 sm:py-20">
          <Particles className="absolute inset-0" quantity={50} size={0.6} color={particleColor} />
          <div className="relative mx-auto max-w-4xl">
            <div className="grid gap-6 sm:grid-cols-2">
              {SECTIONS.map((section, i) => (
                <Reveal key={section.title} delay={i * 100}>
                  <div
                    className={`rounded-2xl border border-[var(--land-rule)] bg-[var(--land-paper)] p-7 transition-transform duration-200 ease-out-smooth hover:-translate-y-1 hover:rotate-0 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:transform-none ${section.tilt}`}
                  >
                    <h2 className="font-display text-xl font-medium text-[var(--land-ink)]">
                      {section.title}
                    </h2>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--land-ink-2)]">
                      {section.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={400} className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
              <Link
                to={primaryHref}
                className="group inline-flex items-center gap-2 rounded-full bg-[var(--land-slate)] px-6 py-3 text-sm font-medium text-[var(--land-slate-fg)] transition-[transform,box-shadow] duration-200 ease-out-smooth hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:transform-none"
              >
                {isAuthenticated && <LayoutDashboard className="h-4 w-4" />}
                {primaryLabel}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/"
                className="border-b border-[var(--land-rule)] pb-0.5 text-[15px] text-[var(--land-ink)] transition-colors hover:border-[var(--land-amber)]"
              >
                Back to home
              </Link>
            </Reveal>

            <Reveal delay={500}>
              <p className="mt-14 text-center text-sm text-[var(--land-ink-3)]">
                Built by{" "}
                <a
                  href="https://www.carterwright.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--land-ink)] underline decoration-[var(--land-rule)] underline-offset-4 transition-colors hover:text-[var(--land-amber-deep)] hover:decoration-[var(--land-amber)]"
                >
                  Carter Wright
                </a>
                , lead developer.
              </p>
            </Reveal>
          </div>
        </section>
      </main>

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
