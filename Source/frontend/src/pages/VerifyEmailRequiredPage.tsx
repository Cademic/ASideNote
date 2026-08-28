import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export function VerifyEmailRequiredPage() {
  const { user, resendVerification, logout } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleResend() {
    setIsSending(true);
    setMessage(null);

    try {
      await resendVerification();
      setMessage("Verification email sent! Check your inbox.");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setMessage(axiosErr.response?.data?.message ?? "Failed to resend. Please try again later.");
      } else {
        setMessage("An unexpected error occurred.");
      }
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">ASideNote</h1>

        <div className="mt-8 rounded-xl border border-border bg-surface p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-foreground">Verify Your Email</h2>
          <p className="mt-2 text-sm text-foreground/60">
            We sent a verification link to <strong className="text-foreground">{user?.email}</strong>.
            Please check your inbox and click the link to activate your account.
          </p>

          {message && (
            <div className="mt-4 rounded-lg border border-border bg-background p-3 text-sm text-foreground/70">
              {message}
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={isSending}
            className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? "Sending..." : "Resend Verification Email"}
          </button>

          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-background/50"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
