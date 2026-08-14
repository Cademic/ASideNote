import { Link } from "react-router-dom";
import { LayoutDashboard, Sun, Moon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useThemeContext } from "../../context/ThemeContext";
import { useAnimatedThemeTransition } from "../../hooks/useAnimatedThemeTransition";
import { Highlighter } from "../ui/Highlighter";

const NAV_LINK_CLASS =
  "inline-block text-sm font-medium text-foreground/60 transition-[color,transform] duration-200 ease-out-smooth hover:scale-110 hover:text-foreground motion-reduce:transition-none motion-reduce:hover:scale-100";

/** Shared public-site header — used on the landing page and every marketing/legal page so they feel like one site. */
export function MarketingHeader() {
  const { isAuthenticated } = useAuth();
  const { setThemeMode, effectiveTheme } = useThemeContext();
  const { originRef: themeButtonRef, runTransition } = useAnimatedThemeTransition<HTMLButtonElement>();

  function toggleTheme() {
    const nextIsDark = effectiveTheme !== "dark";
    runTransition(() => {
      document.documentElement.classList.toggle("dark", nextIsDark);
      setThemeMode(nextIsDark ? "dark" : "light");
    });
  }

  return (
    <header className="navbar-surface navbar-surface--glossy sticky top-0 z-30 border-b border-border/50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2" title="ASideNote">
          <img
            src="/asidenote-logo-square.png"
            alt=""
            className="h-8 w-8 object-contain"
          />
          <span className="text-sm font-bold tracking-tight text-foreground">
            ASideNote
          </span>
        </Link>

        <div className="hidden items-center gap-6 sm:flex">
          <Link to="/about" className={NAV_LINK_CLASS}>
            <Highlighter action="highlight" color="rgba(59, 130, 246, 0.35)">
              About
            </Highlighter>
          </Link>
          <Link to="/contact" className={NAV_LINK_CLASS}>
            <Highlighter action="highlight" color="rgba(59, 130, 246, 0.35)">
              Contact
            </Highlighter>
          </Link>
          <Link to="/faq" className={NAV_LINK_CLASS}>
            <Highlighter action="highlight" color="rgba(59, 130, 246, 0.35)">
              FAQ
            </Highlighter>
          </Link>
        </div>

        <nav className="flex items-center gap-2 sm:gap-3">
          <button
            ref={themeButtonRef}
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background"
            aria-label={effectiveTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {effectiveTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:bg-amber-600 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:bg-amber-600 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
