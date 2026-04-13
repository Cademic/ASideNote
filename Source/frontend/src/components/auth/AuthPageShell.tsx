import type { ReactNode } from "react";

const LOGO_SRC = "/asidenote-logo.png";

interface AuthPageShellProps {
  children: ReactNode;
  /** Shown under the logo (e.g. “Sign in to your account”) */
  subtitle: string;
}

export function AuthPageShell({ children, subtitle }: AuthPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex justify-center sm:mb-8">
            <img
              src={LOGO_SRC}
              alt="ASideNote"
              className="h-28 w-auto max-w-full object-contain sm:h-32"
            />
          </div>
          <div className="space-y-6 rounded-xl border border-border bg-surface p-8 shadow-sm sm:space-y-8 sm:p-10">
            <p className="text-center text-sm text-foreground/60">{subtitle}</p>
            <div className="space-y-5">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
