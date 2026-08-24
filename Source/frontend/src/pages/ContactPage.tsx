import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { MarketingHeader } from "../components/layout/MarketingHeader";
import { Reveal } from "../components/ui/Reveal";
import { GridPattern } from "../components/ui/GridPattern";
import { Highlighter } from "../components/ui/Highlighter";

const SUPPORT_EMAIL = "support@asidenote.net";

export function ContactPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="landing-editorial font-editorial flex min-h-screen flex-col">
      <Helmet>
        <title>Contact — ASideNote</title>
        <meta
          name="description"
          content="Questions, feedback, or a bug you found? Get in touch with the ASideNote team."
        />
        <link rel="canonical" href="https://asidenote.net/contact" />
      </Helmet>
      <MarketingHeader />

      <main className="flex-1">
        {/* ── Page hero — solid cream backdrop, no dots ───────── */}
        <section className="relative overflow-hidden bg-[var(--land-cream)] px-6 py-20 sm:py-28">
          <div className="landing-hero-glass" aria-hidden="true">
            <div className="landing-hero-glass-gradient" />
          </div>
          <Reveal className="relative mx-auto max-w-3xl text-center">
            
            <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[var(--land-ink-3)]">
              Contact
            </p>
            <h1 className="mt-4 font-display text-4xl font-medium text-[var(--land-ink)] sm:text-6xl">
              Get In Touch
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--land-ink-2)] sm:text-xl">
              Questions, feedback, or a bug you found? We&apos;d love to hear from you.
            </p>
          </Reveal>
        </section>

        {/* ── Content card ─────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 py-20 sm:py-28">
          <GridPattern
            width={32}
            height={32}
            strokeDasharray="4 2"
            className="stroke-[var(--land-ink)]/[0.08] dark:stroke-[var(--land-ink)]/[0.04] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black,transparent)]"
          />
          <div className="relative mx-auto max-w-xl">
            <Reveal>
              <div className="rounded-2xl border border-[var(--land-rule)] bg-[var(--land-paper)] p-8 text-center">
                <p className="text-lg leading-relaxed text-[var(--land-ink-2)] sm:text-xl">
                  Email is the best way to reach us. Got a question about ASideNote, some feedback,
                  or ran into a bug? Send us a message and we&apos;ll get back to you.
                </p>

                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--land-slate)] px-6 py-3 text-sm font-medium text-[var(--land-slate-fg)] transition-[transform,box-shadow] duration-200 ease-out-smooth hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:transform-none"
                >
                  <Mail className="h-4 w-4" />
                  {SUPPORT_EMAIL}
                </a>

                <p className="mt-5 text-xs text-[var(--land-ink-3)]">
                  If it&apos;s about your account, include the email you signed up with. It helps us
                  find you faster.
                </p>
              </div>
            </Reveal>

            <Reveal delay={100} className="mt-8 text-center">
              <Link
                to="/"
                className="inline-block text-[15px] font-medium text-[var(--land-ink-2)] transition-[color,transform] duration-200 ease-out-smooth hover:scale-110 hover:text-[var(--land-ink)] motion-reduce:transition-none motion-reduce:hover:scale-100"
              >
                <Highlighter action="highlight" color="rgba(59, 130, 246, 0.35)">
                  Back to home
                </Highlighter>
              </Link>
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
