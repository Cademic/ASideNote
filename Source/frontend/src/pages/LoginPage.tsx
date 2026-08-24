import { useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AuthPageShell } from "../components/auth/AuthPageShell";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";

const inputClassName =
  "w-full rounded-lg border border-[var(--land-rule)] bg-[var(--land-white)] px-3 py-2 text-sm text-[var(--land-ink)] placeholder:text-[var(--land-ink-3)] focus:border-[var(--land-amber)] focus:outline-none focus:ring-2 focus:ring-[var(--land-amber)]/20";

const primaryButtonClassName =
  "group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--land-slate)] px-4 py-2.5 text-sm font-medium text-[var(--land-slate-fg)] transition-transform duration-200 ease-out-smooth hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transition-none motion-reduce:hover:transform-none";

const linkAccentClassName =
  "font-medium text-[var(--land-ink)] underline decoration-[var(--land-rule)] underline-offset-4 transition-colors hover:text-[var(--land-amber-deep)]";

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { message?: string }; status?: number } };
        if (axiosErr.response?.status === 401) {
          setError("Invalid email or password.");
        } else {
          setError(axiosErr.response?.data?.message ?? "Login failed. Please try again.");
        }
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Sign In — ASideNote</title>
        <meta name="description" content="Sign in to your ASideNote account." />
        <link rel="canonical" href="https://asidenote.net/login" />
      </Helmet>
      <AuthPageShell subtitle="Sign in to your account">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      <GoogleSignInButton onError={setError} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--land-rule)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide">
          <span className="bg-[var(--land-white)] px-2 text-[var(--land-ink-3)]">
            or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-[var(--land-ink)]">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-[var(--land-ink)]">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
            placeholder="Enter your password"
          />
        </div>

        <button type="submit" disabled={isSubmitting} className={primaryButtonClassName}>
          {isSubmitting ? "Signing in..." : "Sign In"}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </form>

      <p className="text-center text-sm text-[var(--land-ink-2)]">
        Don&apos;t have an account?{" "}
        <Link to="/register" className={linkAccentClassName}>
          Create one
        </Link>
      </p>
      </AuthPageShell>
    </>
  );
}
