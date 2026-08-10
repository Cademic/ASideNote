import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, LayoutDashboard, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { MarketingHeader } from "../components/layout/MarketingHeader";

/* ─── Feature data ────────────────────────────────────── */

const FEATURES = [
  {
    title: "Note boards",
    description:
      "Pin sticky notes and index cards to a freeform cork board. Rearrange them as your thinking evolves.",
    swatch: "var(--land-yellow)",
    tilt: "-rotate-1",
  },
  {
    title: "Chalk boards",
    description:
      "Sketch diagrams and brainstorm on an infinite canvas with a natural chalk-on-slate feel.",
    swatch: "#26332C",
    chalkIcon: true,
    tilt: "rotate-1",
  },
  {
    title: "Projects & calendar",
    description:
      "Group boards into projects, then see deadlines and milestones on a shared calendar.",
    swatch: "var(--land-coral)",
    tilt: "-rotate-1",
  },
];

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
  const { effectiveTheme } = useThemeContext();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const primaryHref = isAuthenticated ? "/dashboard" : "/register";
  const primaryLabel = isAuthenticated ? "Go to Dashboard" : "Create free account";

  return (
    <div className="landing-editorial bg-dots font-editorial min-h-screen">
      <MarketingHeader />

      {/* ── Hero — kept on a solid cream backdrop, no dots ─── */}
      <section className="bg-[var(--land-cream)] pb-12 pt-10 sm:pb-16 sm:pt-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Copy column */}
            <div>
              <Reveal className="text-center">
                <img
                  src={effectiveTheme === "dark" ? "/ASideNotTextDark.png" : "/ASideNoteText.png"}
                  alt="ASideNote"
                  className="mx-auto h-24 w-auto object-contain sm:h-32"
                />
              </Reveal>

              <Reveal delay={30} className="mt-4">
                <span className="inline-flex -rotate-2 items-center gap-1.5 rounded-full bg-[var(--land-yellow)] px-3 py-1 text-xs font-semibold text-[var(--land-amber-ink)] shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Fun &amp; functional notetaking
                </span>
              </Reveal>

              <Reveal delay={50} className="mt-4">
                <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[var(--land-ink-3)]">
                  Note boards &middot; Chalk boards &middot; Projects
                </p>
              </Reveal>

              <Reveal delay={100} className="mt-5">
                <h1 className="font-display text-[40px] font-medium leading-[1.06] tracking-tight text-[var(--land-ink)] sm:text-5xl lg:text-6xl">
                  Every scattered thought, finally{" "}
                  <em className="font-normal italic text-[var(--land-amber-deep)]">
                    in one place.
                  </em>
                </h1>
                <svg
                  className="mt-1 h-3 w-[min(260px,72%)] text-[var(--land-amber)]"
                  viewBox="0 0 260 12"
                  aria-hidden="true"
                >
                  <path
                    d="M4 8C70 2 150 2 256 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </Reveal>

              <Reveal delay={200} className="mt-6">
                <p className="max-w-[42ch] text-[17px] leading-relaxed text-[var(--land-ink-2)]">
                  Pin sticky notes, index cards, and sketches to a freeform cork board. Group them
                  into projects, then plan the week around them.
                </p>
              </Reveal>

              <Reveal delay={300} className="mt-8">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                  <Link
                    to={primaryHref}
                    className="group inline-flex items-center gap-2 rounded-full bg-[var(--land-slate)] px-6 py-3 text-sm font-medium text-[var(--land-slate-fg)] transition-[transform,box-shadow] duration-200 ease-out-smooth hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:transform-none"
                  >
                    {isAuthenticated && <LayoutDashboard className="h-4 w-4" />}
                    {primaryLabel}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                  <a
                    href="#demo"
                    className="border-b border-[var(--land-rule)] pb-0.5 text-[15px] text-[var(--land-ink)] transition-colors hover:border-[var(--land-amber)]"
                  >
                    See a board in action
                  </a>
                </div>
              </Reveal>

              <Reveal delay={400} className="mt-7">
                <p className="font-label text-xs tracking-wide text-[var(--land-ink-3)]">
                  Free to start &middot; Organize Projects &middot; Collaboration
                </p>
              </Reveal>
            </div>

            {/* Decorative cork board */}
            <Reveal delay={150}>
              <div className="corkboard-frame relative rotate-[-2.5deg] shadow-xl">
                <div
                  className="corkboard-surface landing-corkboard"
                  role="img"
                  aria-label="A cork board with sticky notes, an index card, and a chalk sketch pinned to it."
                >
                  <div className="landing-note landing-note--n1 landing-note--sticky">
                    <span className="landing-note-pin" aria-hidden="true" />
                    <span className="landing-note-line" style={{ width: "82%" }} />
                    <span className="landing-note-line" style={{ width: "64%" }} />
                    <span className="landing-note-line" style={{ width: "44%" }} />
                  </div>

                  <div className="landing-note landing-note--n2 landing-note--sticky">
                    <span className="landing-note-pin" aria-hidden="true" />
                    <span className="landing-note-line" style={{ width: "74%" }} />
                    <span className="landing-note-line" style={{ width: "56%" }} />
                    <span className="landing-note-line" style={{ width: "68%" }} />
                  </div>

                  <div className="landing-note landing-note--n3">
                    <div className="landing-note-card-top" />
                    <div className="landing-note-rules">
                      <span style={{ width: "88%" }} />
                      <span style={{ width: "70%" }} />
                      <span style={{ width: "52%" }} />
                    </div>
                  </div>

                  <div className="landing-note landing-note--n4">
                    <svg viewBox="0 0 60 40" className="w-3/4" aria-hidden="true">
                      <path
                        d="M6 32 Q17 6 28 24 T54 10"
                        fill="none"
                        stroke="#2F7A61"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  <div className="landing-note landing-note--n5">
                    <svg viewBox="0 0 80 40" className="w-3/4" aria-hidden="true">
                      <path
                        d="M6 32 Q20 4 34 22 T74 6"
                        fill="none"
                        stroke="#EDE7D8"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        opacity="0.9"
                      />
                      <circle cx="14" cy="12" r="5" fill="none" stroke="#EDE7D8" strokeWidth="1.6" opacity="0.7" />
                    </svg>
                  </div>

                  <div className="landing-note landing-note--n6">
                    <span style={{ width: "60%" }} />
                    <span style={{ width: "82%" }} />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Two kinds of board, one workspace ─────────────── */}
      <section id="features" className="border-t border-[var(--land-rule)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 100}>
                <div
                  className={`group relative h-full overflow-hidden rounded-2xl border border-[var(--land-rule)] bg-[var(--land-paper)] p-7 transition-transform duration-200 ease-out-smooth hover:-translate-y-1 hover:rotate-0 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:transform-none ${feature.tilt}`}
                >
                  <span
                    className="absolute inset-x-0 top-0 h-1.5 opacity-70"
                    style={{ background: feature.swatch }}
                    aria-hidden="true"
                  />
                  <div
                    className="mb-5 flex h-[34px] w-[34px] rotate-[-6deg] items-center justify-center rounded-md shadow-sm transition-transform duration-200 group-hover:rotate-0 group-hover:scale-110"
                    style={{ background: feature.swatch }}
                  >
                    {feature.chalkIcon && (
                      <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
                        <path
                          d="M3 11 Q7 2 11 8 T18 3"
                          fill="none"
                          stroke="#EDE7D8"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-medium text-[var(--land-ink)]">
                    {feature.title}
                  </h3>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--land-ink-2)]">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── See it in action — dashboard demo video ───────── */}
      <section id="demo" className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[3fr_2fr] lg:gap-12">
            <Reveal>
              <div className="relative mx-auto max-w-3xl lg:mx-0 lg:max-w-none">
                <div className="overflow-hidden rounded-2xl bg-[var(--land-paper)] shadow-[8px_8px_0_0_var(--land-ink)] aspect-video">
                  <video
                    key={effectiveTheme}
                    className="h-full w-full rounded-2xl object-cover"
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

            <Reveal delay={100}>
              <div className="rounded-2xl border border-[var(--land-rule)] bg-[var(--land-paper)] p-7 sm:p-8">
                <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[var(--land-ink-3)]">
                  See it in action
                </p>
                <h2 className="font-display mt-3 text-3xl font-medium text-[var(--land-ink)] sm:text-4xl">
                  Live Demo
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--land-ink-2)]">
                  Preview the dashboard and see how boards, projects, and the calendar work together to keep your ideas organized.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Collaboration — dark band ──────────────────────── */}
      <section className="bg-[var(--land-slate)] py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[#8FA79A]">
              Collaboration
            </p>
            <h2 className="font-display mt-3 text-3xl font-medium text-[var(--land-slate-fg)] sm:text-4xl">
              Live Editing{" "}
              <em className="font-normal italic text-[var(--land-amber)]">with Friends</em>
            </h2>
            <p className="mt-5 max-w-[38ch] text-[15px] leading-relaxed text-[var(--land-slate-text)]">
              Invite friends to your boards and projects and work together in real time.
            </p>
          </Reveal>

          <Reveal delay={150}>
            <div className="rounded-2xl border border-[var(--land-slate-line)] bg-[var(--land-slate-2)] p-6">
              <div className="grid grid-cols-3 gap-3.5">
                <div className="h-16 rotate-[-2deg] rounded-sm bg-[var(--land-yellow)]" />
                <div className="h-16 rotate-[2.5deg] rounded-sm bg-[var(--land-coral)]" />
                <div className="h-16 rotate-[-2deg] rounded-sm bg-[var(--land-mint)]" />
              </div>
              <div className="mt-3.5 h-11 rotate-[1deg] rounded-sm bg-[#EDE7D8]" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-[var(--land-rule)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="mx-auto max-w-[34ch] text-center">
            <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[var(--land-ink-3)]">
              Pricing
            </p>
            <h2 className="font-display mt-3 text-3xl font-medium text-[var(--land-ink)] sm:text-4xl">
              Start free. Pro is on the way.
            </h2>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
            {/* Basic — available now */}
            <Reveal>
              <div className="relative flex h-full -rotate-1 flex-col rounded-2xl border-2 border-[var(--land-amber)] bg-[var(--land-paper)] p-7 shadow-md">
                <span className="absolute -top-3 left-7 rounded-full bg-[var(--land-amber)] px-3 py-1 text-[11px] font-semibold text-[var(--land-amber-ink)] shadow-sm">
                  Available now
                </span>
                <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[var(--land-ink-3)]">
                  Basic
                </p>
                <p className="font-display mt-2 text-4xl font-medium text-[var(--land-ink)]">
                  Free
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--land-ink-2)]">
                  Everything you need to get organized, on us.
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-[var(--land-ink-2)]">
                  {[
                    "Note boards & chalk boards",
                    "Projects & calendar",
                    "Real-time collaboration",
                    "Unlimited boards",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-[var(--land-amber-deep)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to={primaryHref}
                  className="group mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--land-slate)] px-6 py-3 text-sm font-medium text-[var(--land-slate-fg)] transition-[transform,box-shadow] duration-200 ease-out-smooth hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:transform-none"
                >
                  {isAuthenticated && <LayoutDashboard className="h-4 w-4" />}
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
            </Reveal>

            {/* Pro — not yet available */}
            <Reveal delay={100}>
              <div className="relative flex h-full rotate-1 flex-col rounded-2xl border border-dashed border-[var(--land-rule)] bg-[var(--land-paper)] p-7 opacity-90">
                <span className="absolute -top-3 left-7 rounded-full bg-[var(--land-ink-3)] px-3 py-1 text-[11px] font-semibold text-[var(--land-paper)] shadow-sm">
                  Coming soon
                </span>
                <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[var(--land-ink-3)]">
                  Pro
                </p>
                <p className="font-display mt-2 text-4xl font-medium text-[var(--land-ink)]">
                  TBA
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--land-ink-2)]">
                  More power for teams and heavy note-takers. We're still building it.
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-[var(--land-ink-2)]">
                  {["Everything in Basic", "More to come", "Details announced soon"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-[var(--land-ink-3)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled
                  className="mt-7 inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full border border-[var(--land-rule)] px-6 py-3 text-sm font-medium text-[var(--land-ink-3)]"
                >
                  Coming soon
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Final CTA — sticky note, reuses the app's real .stat-sticky ─ */}
      <section className="border-t border-[var(--land-rule)] py-16 text-center sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div
              className="stat-sticky mx-auto max-w-2xl bg-[color-mix(in_srgb,var(--land-amber)_65%,white)] px-8 py-10 sm:px-12 sm:py-14"
              style={{ "--stat-rotate": "-1deg" } as CSSProperties}
            >
              <h2 className="font-display mx-auto max-w-[18ch] text-3xl font-medium text-[var(--land-amber-ink)] sm:text-4xl">
                Start your note-taking journey off right
              </h2>
              <p className="mx-auto mt-5 max-w-[46ch] text-[var(--land-amber-ink)] opacity-80">
                Create a free account and start turning your ideas into action in minutes.
              </p>
              <Link
                to={primaryHref}
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--land-slate)] px-7 py-3.5 text-sm font-medium text-[var(--land-slate-fg)] transition-[transform,box-shadow] duration-200 ease-out-smooth hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:transform-none"
              >
                {isAuthenticated && <LayoutDashboard className="h-4 w-4" />}
                {primaryLabel}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
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
