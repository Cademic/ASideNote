import { useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AuthPageShell } from "../components/auth/AuthPageShell";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import { AnimatedCheckbox } from "../components/ui/AnimatedCheckbox";

const inputClassName =
  "w-full rounded-lg border border-[var(--land-rule)] bg-[var(--land-white)] px-3 py-2 text-sm text-[var(--land-ink)] placeholder:text-[var(--land-ink-3)] focus:border-[var(--land-amber)] focus:outline-none focus:ring-2 focus:ring-[var(--land-amber)]/20";

const primaryButtonClassName =
  "group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--land-slate)] px-4 py-2.5 text-sm font-medium text-[var(--land-slate-fg)] transition-transform duration-200 ease-out-smooth hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transition-none motion-reduce:hover:transform-none";

const linkAccentClassName =
  "font-medium text-[var(--land-ink)] underline decoration-[var(--land-rule)] underline-offset-4 transition-colors hover:text-[var(--land-amber-deep)]";

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      setError("You must accept the Terms and Conditions to create an account.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register(username, email, password);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message ?? "Registration failed. Please try again.");
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
        <title>Create Account — ASideNote</title>
        <meta name="description" content="Create a free ASideNote account and start organizing your ideas." />
        <link rel="canonical" href="https://asidenote.net/register" />
      </Helmet>
      <AuthPageShell subtitle="Create your account">
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
            or register with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="username" className="block text-sm font-medium text-[var(--land-ink)]">
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClassName}
            placeholder="Your username"
          />
        </div>

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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
            placeholder="At least 6 characters"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--land-ink)]">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClassName}
            placeholder="Repeat your password"
          />
        </div>

        <div className="flex items-start gap-3">
          <AnimatedCheckbox
            id="acceptTerms"
            checked={acceptedTerms}
            onCheckedChange={setAcceptedTerms}
            aria-describedby="acceptTerms-desc"
            className="mt-0.5"
          />
          <label id="acceptTerms-desc" htmlFor="acceptTerms" className="text-sm text-[var(--land-ink-2)]">
            I accept the{" "}
            <Link to="/terms" target="_blank" rel="noopener noreferrer" className={linkAccentClassName}>
              Terms and Conditions
            </Link>
          </label>
        </div>

        <button type="submit" disabled={isSubmitting} className={primaryButtonClassName}>
          {isSubmitting ? "Creating account..." : "Create Account"}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </form>

      <p className="text-center text-sm text-[var(--land-ink-2)]">
        Already have an account?{" "}
        <Link to="/login" className={linkAccentClassName}>
          Sign in
        </Link>
      </p>
      </AuthPageShell>
    </>
  );
}
