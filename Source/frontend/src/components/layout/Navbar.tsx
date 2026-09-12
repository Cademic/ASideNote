import { useRef, useState, useEffect, useMemo } from "react";
import { useNudgeDropdownToViewport } from "../../lib/useDropdownViewport";
import { useRovingFocus } from "../../hooks/useRovingFocus";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  Compass,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTutorial } from "../../context/TutorialContext";
import { getAvatarUrl } from "../../constants/avatars";
import { getColorForUserId } from "../../lib/presenceColors";
import { GlobalSearch } from "./GlobalSearch";
import type { BoardPresenceUser } from "./AppLayout";

interface NavbarProps {
  /** Item name (notebook, board, project) when viewing a detail page */
  boardName?: string | null;
  /** Connected users on the current board (when on board route) */
  connectedUsers?: BoardPresenceUser[];
  /** Called when hamburger is clicked (mobile only) */
  onToggleSidebar?: () => void;
  /** Show hamburger menu button (true when viewport is below sidebar breakpoint) */
  showMenuButton?: boolean;
}

type BreadcrumbSegment = { label: string; path: string };

function getBreadcrumbs(
  pathname: string,
  itemName: string | null,
): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [
    { label: "Dashboard", path: "/dashboard" },
  ];

  if (pathname === "/dashboard") return segments;

  // Projects / boards / chalkboards / notebooks all live under the Gallery now.
  if (/^\/(notebooks|boards|projects|chalkboards)(\/|$)/.test(pathname)) {
    segments.push({ label: "Gallery", path: "/gallery" });
    if (
      /^\/(notebooks|boards|projects|chalkboards)\/[^/]+$/.test(pathname) &&
      itemName
    ) {
      segments.push({ label: itemName, path: pathname });
    }
    return segments;
  }

  const sectionLabels: Record<string, string> = {
    "/gallery": "Gallery",
    "/profile": "Profile",
    "/calendar": "Calendar",
    "/settings": "Settings",
  };
  for (const [path, label] of Object.entries(sectionLabels)) {
    if (pathname === path || pathname.startsWith(path + "/")) {
      segments.push({ label, path });
      if (path === "/profile" && pathname !== "/profile") {
        const username = pathname.split("/")[2];
        if (username && itemName)
          segments.push({ label: itemName, path: pathname });
      }
      return segments;
    }
  }

  return segments;
}

export function Navbar({
  boardName,
  connectedUsers = [],
  onToggleSidebar,
  showMenuButton,
}: NavbarProps) {
  const { user, logout } = useAuth();
  const tutorial = useTutorial();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuPanelRef = useRef<HTMLDivElement>(null);

  useNudgeDropdownToViewport(dropdownOpen, userMenuPanelRef);

  // Arrow-key roving focus within the user menu; Tab / Escape close it and
  // return focus to the trigger.
  useRovingFocus(userMenuPanelRef, {
    active: dropdownOpen,
    onTabOut: () => setDropdownOpen(false),
  });

  const isNotebookEditorRoute = /^\/notebooks\/[^/]+$/.test(location.pathname);
  const showConnectedUsers = isNotebookEditorRoute && connectedUsers.length > 0;

  const breadcrumbs = useMemo(
    () => getBreadcrumbs(location.pathname, boardName ?? null),
    [location.pathname, boardName],
  );

  // On the dashboard at mobile widths the breadcrumb is just "Dashboard" (redundant with the
  // page's own welcome heading), so we drop it and let the workspace search take its place.
  const isMobileDashboard =
    Boolean(showMenuButton) && location.pathname === "/dashboard";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setDropdownOpen(false);
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [dropdownOpen]);

  const userInitial = user?.username?.charAt(0).toUpperCase() ?? "?";
  const avatarUrl = user?.profilePictureKey
    ? getAvatarUrl(user.profilePictureKey)
    : null;

  return (
    <header className="navbar-surface flex h-14 items-center justify-between px-4 sm:px-6">
      {/* Left: Hamburger (mobile) + Page context / breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {showMenuButton && onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex shrink-0 items-center justify-center rounded-lg p-2 text-[var(--land-ink-2)] transition-colors hover:bg-[var(--land-cream)] hover:text-[var(--land-ink)]"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <nav
          className={`${isMobileDashboard ? "hidden" : "flex"} items-center gap-1.5 min-w-0 flex-1 overflow-hidden`}
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((seg, i) => {
            const isLast = i === breadcrumbs.length - 1;
            const isFirst = i === 0;
            const showShortFirst = isFirst && seg.label === "Dashboard";
            return (
              <span
                key={seg.path + i}
                className={`flex items-center gap-1.5 min-w-0 ${isLast ? "flex-1 overflow-hidden" : "shrink-0"}`}
              >
                {i > 0 && (
                  <span className="text-sm text-[var(--land-ink-3)] select-none shrink-0">
                    /
                  </span>
                )}
                <Link
                  to={seg.path}
                  className={`rounded-lg px-2 py-1 text-sm transition-colors duration-150 truncate text-left motion-reduce:transition-none ${
                    isLast
                      ? "min-w-0 flex-1 font-semibold text-[var(--land-ink)] hover:bg-[var(--land-cream)]"
                      : "text-[var(--land-ink-2)] hover:bg-[var(--land-cream)] hover:text-[var(--land-ink)] max-w-[100px] sm:max-w-none"
                  }`}
                  aria-current={isLast ? "page" : undefined}
                  title={seg.label}
                >
                  {showShortFirst ? (
                    <>
                      <span className="inline max-[420px]:hidden">
                        {seg.label}
                      </span>
                      <span className="hidden max-[420px]:inline">Dash...</span>
                    </>
                  ) : (
                    seg.label
                  )}
                </Link>
              </span>
            );
          })}
        </nav>
      </div>

      {/* Center: global workspace search — always shown on the mobile dashboard, where it
          replaces the breadcrumb; elsewhere it stays a tablet-and-up affordance. Its
          `max-w-md` box sits between two equal `flex-1` groups, so it stays centered
          in the navbar regardless of how wide the breadcrumb or user menu get. */}
      <div
        className={`mx-2 flex-1 min-w-0 max-w-md justify-center md:mx-6 ${
          isMobileDashboard ? "flex" : "hidden sm:flex"
        }`}
      >
        <GlobalSearch />
      </div>

      {/* Right: connected users (on board) + user menu — `flex-1` to balance the
          left breadcrumb group so the search stays centered. */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {showConnectedUsers && (
          <div
            className="flex items-center gap-2 overflow-hidden rounded-lg border border-[var(--land-rule)] bg-[var(--land-paper)] px-2 py-1.5"
            aria-label="Connected users on this board"
          >
            {connectedUsers.map((u) => (
              <div
                key={u.userId}
                className="flex items-center gap-1.5 min-w-0 max-w-[120px] sm:max-w-[140px]"
                title={u.displayName}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: getColorForUserId(u.userId) }}
                  aria-hidden
                />
                <span className="truncate text-xs text-[var(--land-ink-2)]">
                  {u.displayName}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((open) => !open)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && !dropdownOpen) {
                e.preventDefault();
                setDropdownOpen(true);
              }
            }}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-[var(--land-cream)]"
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
            aria-label="User menu"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-8 w-8 rounded-full object-cover ring-1 ring-[var(--land-rule)]"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--land-yellow)] text-xs font-bold text-[var(--land-ink)]">
                {userInitial}
              </div>
            )}
            {user && (
              <span className="hidden text-xs font-medium text-[var(--land-ink-2)] sm:block">
                {user.username}
              </span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 text-[var(--land-ink-3)] transition-transform duration-150 ease-out-smooth motion-reduce:transition-none ${dropdownOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>

          {dropdownOpen && (
            <div
              ref={userMenuPanelRef}
              className="absolute right-0 top-full z-50 mt-1 max-h-[min(70vh,calc(100vh-2rem))] min-w-[160px] max-w-[min(16rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border border-[var(--land-rule)] bg-[var(--land-paper)] py-1"
              role="menu"
              aria-label="User menu"
              tabIndex={-1}
            >
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  setDropdownOpen(false);
                  navigate(
                    user?.username
                      ? `/profile/${encodeURIComponent(user.username)}`
                      : "/profile",
                  );
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--land-ink)] hover:bg-[var(--land-cream)]"
              >
                <User className="h-4 w-4 text-[var(--land-ink-3)]" />
                Profile
              </button>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  setDropdownOpen(false);
                  navigate("/settings");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--land-ink)] hover:bg-[var(--land-cream)]"
              >
                <Settings className="h-4 w-4 text-[var(--land-ink-3)]" />
                Settings
              </button>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  setDropdownOpen(false);
                  if (location.pathname !== "/gallery") navigate("/gallery");
                  tutorial.start();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--land-ink)] hover:bg-[var(--land-cream)]"
              >
                <Compass className="h-4 w-4 text-[var(--land-ink-3)]" />
                Take a tour
              </button>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                  navigate("/", { replace: true });
                }}
                className="editorial-danger-hover flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 dark:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
