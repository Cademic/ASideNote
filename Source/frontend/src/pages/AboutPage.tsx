import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { MarketingHeader } from "../components/layout/MarketingHeader";
import { Reveal } from "../components/ui/Reveal";
import { DottedMap } from "../components/ui/DottedMap";
import { GridPattern } from "../components/ui/GridPattern";
import { Highlighter } from "../components/ui/Highlighter";
import { WORLD_MAP_POINTS } from "../data/worldMapPoints";

const STORY = [
  "The usual note apps didn't ever seem like they worked for me, and, subsequently, a lot of other people I knew. They were all just… too neat. Sticky notes, index cards and arrows connecting each idea seemed like the way most of us actually study and work. Not to do lists, and perfect highlighter marks.",
  "I looked for something that worked like that, but nothing seemed to pop up. So I started ASideNote. It caters to users' creativity and allows them to express it anywhere on any device at any time. Somewhere along the lines it stopped being just a to-do list, and started being a place for creativity to happen while working.",
  "So many people have had sticky notes on their laptops, struggling to keep them organized. Which is why there's no templates, and no correct way to put your sticky notes and index cards, sketch on the chalkboard, or drag a card across the screen.",
  "ASideNote goes wherever you go, whether that be on your phone, or a desktop. Start a board on your laptop from class, or pull it up on your phone from a restaurant. Whatever feels best for you. Your ideas shouldn't be limited to one space just because that's what you happened to be on.",
];

export function AboutPage() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const primaryHref = isAuthenticated ? "/dashboard" : "/register";
  const primaryLabel = isAuthenticated ? "Go to Dashboard" : "Create free account";

  return (
    <div className="landing-editorial font-editorial flex min-h-screen flex-col">
      <Helmet>
        <title>About — ASideNote</title>
        <meta
          name="description"
          content="ASideNote is a cork board for your notes — sticky notes, index cards, and chalk sketches you can arrange your own way. Learn the story behind it."
        />
        <link rel="canonical" href="https://asidenote.net/about" />
      </Helmet>
      <MarketingHeader />

      <main className="flex-1">
        {/* ── Page hero — solid cream backdrop, no dots ───────── */}
        <section className="relative overflow-hidden bg-[var(--land-cream)] px-6 py-20 sm:py-28">
          <Reveal className="relative mx-auto max-w-3xl text-center">
            <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[var(--land-ink-3)]">
              About
            </p>
            <h1 className="font-display text-4xl font-medium text-[var(--land-ink)] sm:text-6xl">
              What is ASideNote?
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--land-ink-2)] sm:text-xl">
              Expressing creativity and ideas in a flexible way. Allowing users to create and organize their thoughts in a way that works best for them.
            </p>
          </Reveal>
        </section>

        {/* ── Narrative ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 py-20 sm:py-28">
          <GridPattern
            width={32}
            height={32}
            strokeDasharray="4 2"
            className="stroke-[var(--land-ink)]/[0.08] dark:stroke-[var(--land-ink)]/[0.04] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black,transparent)]"
          />
          <div className="relative mx-auto max-w-6xl">
            <h1 className="font-display mb-4 text-2xl font-medium text-[var(--land-ink)] sm:text-5xl">
              Our Goal
            </h1>
            <Reveal className="space-y-8">
              {STORY.map((paragraph) => (
                <p key={paragraph} className="text-lg leading-relaxed text-[var(--land-ink)] sm:text-xl">
                  {paragraph}
                </p>
              ))}
            </Reveal>
          </div>

          {/* Dotted world map — decorative, no markers. Kept inside this
              section so the grid background above spans behind it too,
              instead of cutting off at a section boundary. */}
          <Reveal className="relative mx-auto mt-20 max-w-7xl sm:mt-28">
            <DottedMap
              width={200}
              height={100}
              mapPoints={WORLD_MAP_POINTS}
              dotRadius={0.45}
              className="h-80 w-full text-[var(--land-ink-3)] sm:h-[28rem]"
            />
          </Reveal>
        </section>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pb-20 sm:pb-28">
          <div className="relative mx-auto max-w-2xl">
            <Reveal className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
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
                className="inline-block text-[15px] font-medium text-[var(--land-ink-2)] transition-[color,transform] duration-200 ease-out-smooth hover:scale-110 hover:text-[var(--land-ink)] motion-reduce:transition-none motion-reduce:hover:scale-100"
              >
                <Highlighter action="highlight" color="rgba(59, 130, 246, 0.35)">
                  Back to home
                </Highlighter>
              </Link>
            </Reveal>

            <Reveal delay={100}>
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
                {" "}lead developer.
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
