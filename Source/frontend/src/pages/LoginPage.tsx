import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthPageShell } from "../components/auth/AuthPageShell";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

const primaryButtonClassName =
  "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

const linkAccentClassName = "font-medium text-primary hover:underline";

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
    <AuthPageShell subtitle="Sign in to your account">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      <GoogleSignInButton onError={setError} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/80" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide">
          <span className="bg-surface px-2 text-foreground/40">
            or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
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
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
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
        </button>
      </form>

      <p className="text-center text-sm text-foreground/60">
        Don&apos;t have an account?{" "}
        <Link to="/register" className={linkAccentClassName}>
          Create one
        </Link>
      </p>
    </AuthPageShell>
  );
}
