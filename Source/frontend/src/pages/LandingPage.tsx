import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  StickyNote,
  User,
  Users,
  Waves,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useThemeContext } from "../context/ThemeContext";
import { MarketingHeader } from "../components/layout/MarketingHeader";
import { Reveal } from "../components/ui/Reveal";
import { Highlighter } from "../components/ui/Highlighter";
import { StripedPattern } from "../components/ui/StripedPattern";
import { GridPattern } from "../components/ui/GridPattern";
import { AnimatedBeam } from "../components/ui/AnimatedBeam";
import { UseCaseTabs } from "../components/ui/UseCaseTabs";

/* ─── Component ───────────────────────────────────────── */

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { effectiveTheme } = useThemeContext();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const beamContainerRef = useRef<HTMLDivElement>(null);
  const beamUser1Ref = useRef<HTMLDivElement>(null);
  const beamUser2Ref = useRef<HTMLDivElement>(null);

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
    <div className="landing-editorial font-editorial flex min-h-screen flex-col">
      <Helmet>
        <title>ASideNote</title>
        <meta
          name="description"
          content="Pin sticky notes, index cards, and sketches to a freeform cork board. Group them into projects, then plan the week around them with real-time collaboration."
        />
        <link rel="canonical" href="https://asidenote.net/" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://asidenote.net/" />
        <meta property="og:title" content="ASideNote" />
        <meta
          property="og:description"
          content="Pin sticky notes, index cards, and sketches to a freeform cork board. Group them into projects, then plan the week around them with real-time collaboration."
        />
        <meta property="og:image" content="https://asidenote.net/asidenote-logo.webp" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ASideNote" />
        <meta
          name="twitter:description"
          content="Pin sticky notes, index cards, and sketches to a freeform cork board. Group them into projects, then plan the week around them with real-time collaboration."
        />
        <meta name="twitter:image" content="https://asidenote.net/asidenote-logo.webp" />
      </Helmet>
      <MarketingHeader />

      <main className="flex-1">
        {/* ── Hero — kept on a solid cream backdrop, no dots ─── */}
        <section className="relative overflow-hidden bg-white pt-10 dark:bg-[var(--land-cream)] sm:pt-16">
          <div className="relative mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Reveal delay={100} className="flex flex-col items-center">
                <h1 className="font-display text-[40px] font-medium leading-[1.06] tracking-tight text-[var(--land-ink)] sm:text-5xl lg:text-6xl">
                  Making Notes Fun & Functional.
                </h1>
              </Reveal>

              <Reveal delay={200} className="mt-5">
                <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[var(--land-ink-3)]">
                  Note boards &middot; Chalk boards &middot; Projects
                </p>
              </Reveal>

              <Reveal delay={300} className="mt-8">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
                  <Link
                    to={primaryHref}
                    className="group inline-flex w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--land-slate)] px-6 py-3 text-sm font-medium text-[var(--land-slate-fg)] transition-transform duration-200 ease-out-smooth hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:transform-none"
                  >
                    {isAuthenticated && <LayoutDashboard className="h-4 w-4" />}
                    {primaryLabel}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                  <Link
                    to="/faq"
                    className="inline-block text-sm font-medium text-[var(--land-ink-3)] underline decoration-[var(--land-rule)] underline-offset-4 transition-[color,transform] duration-200 ease-out-smooth hover:scale-110 hover:text-[var(--land-ink)] motion-reduce:transition-none motion-reduce:hover:scale-100"
                  >
                    <Highlighter action="highlight" color="rgba(59, 130, 246, 0.35)">
                      Questions?
                    </Highlighter>
                  </Link>
                </div>
                {!isAuthenticated && (
                  <p className="mt-4 text-sm text-[var(--land-ink-3)]">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="font-medium text-[var(--land-ink)] underline decoration-[var(--land-rule)] underline-offset-4 transition-colors hover:text-[var(--land-amber-deep)]"
                    >
                      Log in
                    </Link>
                  </p>
                )}
              </Reveal>

            </div>

            {/* Demo video — flush with the bottom edge of the hero section */}
            <Reveal delay={200} className="mt-12 sm:mt-16">
              <div className="mx-auto max-w-5xl overflow-hidden rounded-t-2xl bg-[var(--land-paper)]">
                <div className="flex items-center gap-1.5 border-b border-[var(--land-rule)] px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--land-coral)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--land-yellow)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--land-mint)]" />
                </div>
                <video
                  className="block w-full"
                  src={effectiveTheme === "dark" ? "/ASideNoteDark.mp4" : "/ASideNoteLight.mp4"}
                  poster={effectiveTheme === "dark" ? "/ASideNoteDark.png" : "/ASideNotelight.png"}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Features + Use cases — share one grid background ─ */}
        <section className="relative overflow-hidden border-t border-[var(--land-rule)] py-16 sm:py-20">
          <GridPattern
            width={32}
            height={32}
            strokeDasharray="4 2"
            className="stroke-[var(--land-ink)]/[0.08] dark:stroke-[var(--land-ink)]/[0.04] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black,transparent)]"
          />
          <div className="relative mx-auto max-w-6xl px-6">
            <Reveal className="mx-auto max-w-[34ch] text-center">
              <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[var(--land-ink-3)]">
                Features
              </p>
              <h2 className="font-display mt-3 text-3xl font-medium text-[var(--land-ink)] sm:text-4xl">
                Everything your ideas need
              </h2>
            </Reveal>

            <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
              {[
                {
                  icon: StickyNote,
                  iconBg: "var(--land-yellow)",
                  iconFg: "var(--land-amber-ink)",
                  barColor: "var(--land-yellow)",
                  title: "Note boards",
                  description:
                    "Pin sticky notes and index cards to a freeform cork board. Rearrange them as your thinking evolves.",
                },
                {
                  icon: Waves,
                  iconBg: "var(--land-slate)",
                  iconFg: "var(--land-slate-fg)",
                  barColor: "var(--land-slate)",
                  title: "Chalk boards",
                  description:
                    "Sketch diagrams and brainstorm on an infinite canvas with a natural chalk-on-slate feel.",
                },
                {
                  icon: CalendarDays,
                  iconBg: "var(--land-coral)",
                  iconFg: "#1b1a17",
                  barColor: "var(--land-coral)",
                  title: "Projects & calendar",
                  description:
                    "Group boards into projects, then see deadlines and milestones on a shared calendar.",
                },
              ].map((feature, index) => (
                <Reveal key={feature.title} delay={index * 100}>
                  <div className="relative h-full overflow-hidden rounded-2xl border border-[var(--land-rule)] bg-[var(--land-paper)] p-6 shadow-sm">
                    <div
                      className="absolute inset-x-0 top-0 h-1.5"
                      style={{ background: feature.barColor }}
                      aria-hidden="true"
                    />
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: feature.iconBg }}
                    >
                      <feature.icon className="h-5 w-5" style={{ color: feature.iconFg }} />
                    </div>
                    <h3 className="font-display mt-5 text-xl font-medium text-[var(--land-ink)]">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[var(--land-ink-2)]">
                      {feature.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* ── Use cases ────────────────────────────────────── */}
          <div className="relative mx-auto mt-16 max-w-6xl px-6 sm:mt-20">
            <Reveal className="mx-auto max-w-[34ch] text-center">
              <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[var(--land-ink-3)]">
                Who it's for
              </p>
              <h2 className="font-display mt-3 text-3xl font-medium text-[var(--land-ink)] sm:text-4xl">
                Built for however you plan
              </h2>
            </Reveal>

            <Reveal delay={100} className="mx-auto mt-10 max-w-3xl">
              <UseCaseTabs
                tabs={[
                  {
                    id: "students",
                    label: "Students",
                    icon: GraduationCap,
                    accentColor: "var(--land-yellow)",
                    pitch: "Keep every class organized, from lecture notes to exam day.",
                    bullets: [
                      "Calendar: never miss a due date or upcoming event",
                      "Projects: keep coursework organized and collaborate with classmates",
                      "Note boards: take notes and visualize your ideas",
                      "Chalk boards: grab a pen for fast notes or working out math problems",
                    ],
                  },
                  {
                    id: "teams",
                    label: "Teams",
                    icon: Users,
                    accentColor: "var(--land-coral)",
                    pitch: "Keep everyone aligned with a shared calendar inside every project.",
                    bullets: [
                      "See what's upcoming and due, right inside the project",
                      "Multiple people can view and edit the same board at once",
                      "Changes appear live for everyone, in real time",
                      "Add friends to a project for easier team management",
                    ],
                  },
                  {
                    id: "idea-building",
                    label: "Idea Building",
                    icon: Lightbulb,
                    accentColor: "var(--land-mint)",
                    pitch: "String your thoughts together and watch ideas take shape.",
                    bullets: [
                      "Note boards: link ideas together for that satisfying connected feel",
                      "Set your own due dates and timeline",
                      "Projects: keep it all organized in one place",
                    ],
                  },
                ]}
              />
            </Reveal>
          </div>
        </section>

        {/* ── Collaboration — dark band ──────────────────────── */}
        <section className="relative overflow-hidden bg-[var(--land-slate)] py-16 sm:py-20">
          <StripedPattern
            direction="left"
            width={14}
            height={14}
            className="text-[var(--land-slate-line)] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black,transparent)]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 lg:grid-cols-2 lg:gap-16">
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

              <div
                ref={beamContainerRef}
                className="relative mt-4 flex h-24 items-center justify-between px-8"
              >
                <div
                  ref={beamUser1Ref}
                  className="z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--land-amber)] bg-[#fffdf8] shadow-md"
                >
                  <User className="h-5 w-5 text-[var(--land-slate)]" />
                </div>
                <div
                  ref={beamUser2Ref}
                  className="z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--land-mint)] bg-[#fffdf8] shadow-md"
                >
                  <User className="h-5 w-5 text-[var(--land-slate)]" />
                </div>

                {!prefersReducedMotion && (
                  <>
                    <AnimatedBeam
                      containerRef={beamContainerRef}
                      fromRef={beamUser1Ref}
                      toRef={beamUser2Ref}
                      curvature={-30}
                      startYOffset={8}
                      endYOffset={8}
                      pathColor="var(--land-slate-line)"
                      gradientStartColor="var(--land-amber)"
                      gradientStopColor="var(--land-mint)"
                    />
                    <AnimatedBeam
                      containerRef={beamContainerRef}
                      fromRef={beamUser1Ref}
                      toRef={beamUser2Ref}
                      curvature={30}
                      startYOffset={-8}
                      endYOffset={-8}
                      reverse
                      pathColor="var(--land-slate-line)"
                      gradientStartColor="var(--land-mint)"
                      gradientStopColor="var(--land-amber)"
                    />
                  </>
                )}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Pricing + Final CTA — share one grid background ── */}
        <section id="pricing" className="relative overflow-hidden border-t border-[var(--land-rule)] py-16 sm:py-20">
          <GridPattern
            width={32}
            height={32}
            strokeDasharray="4 2"
            className="stroke-[var(--land-ink)]/[0.08] dark:stroke-[var(--land-ink)]/[0.04] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black,transparent)]"
          />
          <div className="relative mx-auto max-w-6xl px-6">
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
                    className="group mt-7 inline-flex w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--land-slate)] px-6 py-3 text-sm font-medium text-[var(--land-slate-fg)] transition-transform duration-200 ease-out-smooth hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:transform-none"
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

          {/* ── Final CTA — sticky note, reuses the app's real .stat-sticky ─ */}
          <div className="relative mx-auto mt-16 max-w-6xl px-6 text-center sm:mt-20">
            <Reveal>
              <div
                className="stat-sticky mx-auto max-w-2xl bg-[color-mix(in_srgb,var(--land-amber)_65%,white)] px-8 py-10 sm:px-12 sm:py-14"
                style={{ "--stat-rotate": "-1deg" } as CSSProperties}
              >
                <h2 className="font-display mx-auto max-w-[18ch] text-3xl font-medium text-[var(--land-amber-ink)] sm:text-4xl">
                  Making Notes Fun & Functional
                </h2>
                <p className="mx-auto mt-5 max-w-[46ch] text-[var(--land-amber-ink)] opacity-80">
                  Create a free account and start turning your ideas into action in minutes.
                </p>
                <Link
                  to={primaryHref}
                  className="group mt-8 inline-flex w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--land-slate)] px-7 py-3.5 text-sm font-medium text-[var(--land-slate-fg)] transition-transform duration-200 ease-out-smooth hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:transform-none"
                >
                  {isAuthenticated && <LayoutDashboard className="h-4 w-4" />}
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
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
              src="/asidenote-logo.webp"
              alt="ASideNote"
              width={410}
              height={168}
              loading="lazy"
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
