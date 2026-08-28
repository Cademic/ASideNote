import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { verifyEmail, isAuthenticated } = useAuth();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token provided.");
      return;
    }

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err: unknown) => {
        setStatus("error");
        if (err && typeof err === "object" && "response" in err) {
          const axiosErr = err as { response?: { data?: { message?: string } } };
          setErrorMessage(axiosErr.response?.data?.message ?? "Verification failed.");
        } else {
          setErrorMessage("An unexpected error occurred.");
        }
      });
  }, [token, verifyEmail]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">ASideNote</h1>

        {status === "loading" && (
          <div className="mt-8 rounded-xl border border-border bg-surface p-8 shadow-sm">
            <p className="text-foreground/60">Verifying your email...</p>
          </div>
        )}

        {status === "success" && (
          <div className="mt-8 rounded-xl border border-border bg-surface p-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Email Verified</h2>
            <p className="mt-2 text-sm text-foreground/60">
              Your email has been verified successfully.
            </p>
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isAuthenticated ? "Go to Dashboard" : "Sign In"}
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="mt-8 rounded-xl border border-border bg-surface p-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Verification Failed</h2>
            <p className="mt-2 text-sm text-foreground/60">{errorMessage}</p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
