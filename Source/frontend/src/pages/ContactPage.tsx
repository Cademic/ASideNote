import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { MarketingHeader } from "../components/layout/MarketingHeader";
import { Reveal } from "../components/ui/Reveal";

const SUPPORT_EMAIL = "support@asidenote.net";

export function ContactPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="landing-editorial bg-dots font-editorial flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* ── Page hero — solid cream backdrop, no dots ───────── */}
        <section className="bg-[var(--land-cream)] px-6 py-14 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-label text-[11px] uppercase tracking-[0.16em] text-[var(--land-ink-3)]">
              Contact
            </p>
            <h1 className="font-display mt-3 text-3xl font-medium text-[var(--land-ink)] sm:text-4xl">
              Get in touch
            </h1>
            <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[var(--land-ink-2)]">
              Questions, feedback, or found a bug? We&apos;d like to hear about it.
            </p>
          </Reveal>
        </section>

        {/* ── Content card ─────────────────────────────────────── */}
        <section className="px-6 py-14 sm:py-20">
          <div className="mx-auto max-w-xl">
            <Reveal>
              <div className="rounded-2xl border border-[var(--land-rule)] bg-[var(--land-paper)] p-8 text-center">
                <p className="text-[15px] leading-relaxed text-[var(--land-ink-2)]">
                  The best way to reach us is by email. Whether you have a question about ASideNote,
                  feedback on a feature, or ran into a problem with your account, send us a message
                  and we&apos;ll get back to you.
                </p>

                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--land-slate)] px-6 py-3 text-sm font-medium text-[var(--land-slate-fg)] transition-[transform,box-shadow] duration-200 ease-out-smooth hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:transform-none"
                >
                  <Mail className="h-4 w-4" />
                  {SUPPORT_EMAIL}
                </a>

                <p className="mt-5 text-xs text-[var(--land-ink-3)]">
                  For account-specific requests, include the email address on your ASideNote account
                  so we can look you up faster.
                </p>
              </div>
            </Reveal>

            <Reveal delay={100} className="mt-8 text-center">
              <Link
                to="/"
                className="border-b border-[var(--land-rule)] pb-0.5 text-[15px] text-[var(--land-ink)] transition-colors hover:border-[var(--land-amber)]"
              >
                Back to home
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
