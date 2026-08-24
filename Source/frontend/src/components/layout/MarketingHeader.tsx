import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutDashboard, Menu, Sun, Moon, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useThemeContext } from "../../context/ThemeContext";
import { useAnimatedThemeTransition } from "../../hooks/useAnimatedThemeTransition";
import { Highlighter } from "../ui/Highlighter";

const NAV_LINK_CLASS =
  "inline-block text-base font-medium text-foreground/60 transition-[color,transform] duration-200 ease-out-smooth hover:scale-110 hover:text-foreground motion-reduce:transition-none motion-reduce:hover:scale-100";

const MOBILE_NAV_LINKS = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/faq", label: "FAQ" },
];

// Must match the "menu-drop-out" animation duration in tailwind.config.ts.
const MENU_CLOSE_ANIMATION_MS = 180;

/** Shared public-site header — used on the landing page and every marketing/legal page so they feel like one site. */
export function MarketingHeader() {
  const { isAuthenticated } = useAuth();
  const { setThemeMode, effectiveTheme } = useThemeContext();
  const { originRef: themeButtonRef, runTransition } = useAnimatedThemeTransition<HTMLButtonElement>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuRendered, setIsMenuRendered] = useState(false);

  function toggleTheme() {
    const nextIsDark = effectiveTheme !== "dark";
    runTransition(() => {
      document.documentElement.classList.toggle("dark", nextIsDark);
      setThemeMode(nextIsDark ? "dark" : "light");
    });
  }

  function closeMenu() {
    setIsMenuOpen(false);
  }

  const mobileLinks = isAuthenticated
    ? MOBILE_NAV_LINKS
    : [...MOBILE_NAV_LINKS, { to: "/login", label: "Sign In" }];

  // Keep the menu mounted for the closing animation, then unmount it once "menu-drop-out" finishes.
  useEffect(() => {
    if (isMenuOpen) {
      setIsMenuRendered(true);
      return;
    }
    const timeout = setTimeout(() => setIsMenuRendered(false), MENU_CLOSE_ANIMATION_MS);
    return () => clearTimeout(timeout);
  }, [isMenuOpen]);

  // Lock background scroll and allow Escape to close for as long as the menu is visible (open or closing).
  useEffect(() => {
    if (!isMenuRendered) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [isMenuRendered]);

  return (
    <header className="navbar-surface navbar-surface--glossy sticky top-0 z-30 border-b border-border/50">
      <div className="relative mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center" title="ASideNote">
          <img
            src={effectiveTheme === "dark" ? "/ASideNotTextDark.webp" : "/ASideNoteText.webp"}
            alt="ASideNote"
            width={1351}
            height={468}
            className="h-8 w-auto object-contain sm:h-11"
          />
        </Link>

        {/* Absolutely centered on the header itself — a plain flex `justify-between`
            item only balances the gaps either side of it, so it drifts off-center
            whenever the logo and the right-hand button group differ in width. */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex">
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

        <nav className="flex items-center gap-1.5 sm:gap-4">
          <button
            ref={themeButtonRef}
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background sm:h-11 sm:w-11"
            aria-label={effectiveTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {effectiveTheme === "dark" ? (
              <Sun className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Moon className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </button>

          {/* Desktop-only auth actions — collapsed into the hamburger menu below lg */}
          <div className="hidden items-center gap-4 lg:flex">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-amber-500 px-5 py-2.5 text-base font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:bg-amber-600 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="whitespace-nowrap rounded-lg px-4 py-2.5 text-base font-medium text-foreground/60 transition-colors hover:text-foreground"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-amber-500 px-5 py-2.5 text-base font-semibold text-white shadow-sm transition-[transform,colors,box-shadow] duration-150 ease-out-smooth hover:bg-amber-600 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background dark:bg-amber-600 dark:hover:bg-amber-500 motion-reduce:transition-none motion-reduce:hover:transform-none"
                >
                  Start Free
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle — replaces the auth actions below lg */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-background sm:h-11 sm:w-11 lg:hidden"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="marketing-mobile-menu"
          >
            <Menu
              className={`absolute h-5 w-5 transition-[transform,opacity] duration-200 ease-out-smooth sm:h-6 sm:w-6 motion-reduce:transition-none ${
                isMenuOpen ? "rotate-45 opacity-0" : "rotate-0 opacity-100"
              }`}
            />
            <X
              className={`absolute h-5 w-5 transition-[transform,opacity] duration-200 ease-out-smooth sm:h-6 sm:w-6 motion-reduce:transition-none ${
                isMenuOpen ? "rotate-0 opacity-100" : "-rotate-45 opacity-0"
              }`}
            />
          </button>
        </nav>
      </div>

      {isMenuRendered &&
        createPortal(
          <div
            id="marketing-mobile-menu"
            className={`navbar-surface navbar-surface--glossy fixed inset-x-0 top-20 bottom-0 z-40 overflow-y-auto motion-reduce:animate-none lg:hidden ${
              isMenuOpen ? "animate-menu-drop" : "animate-menu-drop-out"
            }`}
          >
            <nav aria-label="Mobile" className="flex flex-col px-6 py-4">
              {mobileLinks.map((item, index) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={closeMenu}
                  className="animate-menu-drop border-b border-border/40 py-4 text-lg font-medium text-foreground/80 transition-colors last:border-b-0 hover:text-foreground motion-reduce:animate-none"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  {item.label}
                </Link>
              ))}

              <div
                className="mt-6 flex flex-col gap-3 animate-menu-drop motion-reduce:animate-none"
                style={{ animationDelay: `${mobileLinks.length * 40}ms` }}
              >
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    onClick={closeMenu}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className="group inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
                  >
                    Start Free
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                )}
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </header>
  );
}
