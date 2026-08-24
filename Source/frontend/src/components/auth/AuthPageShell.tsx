import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { MarketingHeader } from "../layout/MarketingHeader";
import { Reveal } from "../ui/Reveal";

interface AuthPageShellProps {
  children: ReactNode;
  /** Shown above the form (e.g. “Sign in to your account”) */
  subtitle: string;
}

export function AuthPageShell({ children, subtitle }: AuthPageShellProps) {
  return (
    <div className="landing-editorial font-editorial flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="flex flex-1 items-center bg-[var(--land-white)] px-4 py-14 sm:px-6">
        <Reveal className="mx-auto w-full max-w-md">
          <h1 className="font-display mb-6 text-center text-2xl font-medium text-[var(--land-ink)] sm:mb-8 sm:text-3xl">
            {subtitle}
          </h1>
          <div className="space-y-5">{children}</div>
        </Reveal>
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
