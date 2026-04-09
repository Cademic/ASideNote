import { useRef, useState, useEffect, useMemo } from "react";
import { User, Settings, LogOut, ChevronDown, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getAvatarUrl } from "../../constants/avatars";
import { getColorForUserId } from "../../lib/presenceColors";
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

function getBreadcrumbs(pathname: string, itemName: string | null): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [{ label: "Dashboard", path: "/dashboard" }];

  if (pathname === "/dashboard") return segments;

  if (pathname.startsWith("/notebooks")) {
    segments.push({ label: "Notebooks", path: "/notebooks" });
    if (/^\/notebooks\/[^/]+$/.test(pathname) && itemName) {
      segments.push({ label: itemName, path: pathname });
    }
    return segments;
  }

  if (pathname.startsWith("/boards")) {
    segments.push({ label: "Boards", path: "/boards" });
    if (/^\/boards\/[^/]+$/.test(pathname) && itemName) {
      segments.push({ label: itemName, path: pathname });
    }
    return segments;
  }

  if (pathname.startsWith("/projects")) {
    segments.push({ label: "Projects", path: "/projects" });
    if (/^\/projects\/[^/]+$/.test(pathname) && itemName) {
      segments.push({ label: itemName, path: pathname });
    }
    return segments;
  }

  if (pathname.startsWith("/chalkboards")) {
    segments.push({ label: "Chalk Boards", path: "/chalkboards" });
    if (/^\/chalkboards\/[^/]+$/.test(pathname) && itemName) {
      segments.push({ label: itemName, path: pathname });
    }
    return segments;
  }

  const sectionLabels: Record<string, string> = {
    "/profile": "Profile",
    "/calendar": "Calendar",
    "/settings": "Settings",
  };
  for (const [path, label] of Object.entries(sectionLabels)) {
    if (pathname === path || pathname.startsWith(path + "/")) {
      segments.push({ label, path });
      if (path === "/profile" && pathname !== "/profile") {
        const username = pathname.split("/")[2];
        if (username && itemName) segments.push({ label: itemName, path: pathname });
      }
      return segments;
    }
  }

  return segments;
}

export function Navbar({ boardName, connectedUsers = [], onToggleSidebar, showMenuButton }: NavbarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isNotebookEditorRoute = /^\/notebooks\/[^/]+$/.test(location.pathname);
  const showConnectedUsers = isNotebookEditorRoute && connectedUsers.length > 0;

  const breadcrumbs = useMemo(
    () => getBreadcrumbs(location.pathname, boardName ?? null),
    [location.pathname, boardName],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  const userInitial = user?.username?.charAt(0).toUpperCase() ?? "?";
  const avatarUrl = user?.profilePictureKey ? getAvatarUrl(user.profilePictureKey) : null;

  return (
    <header className="navbar-surface flex h-14 items-center justify-between px-4 sm:px-6">
      {/* Left: Hamburger (mobile) + Page context / breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {showMenuButton && onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex shrink-0 items-center justify-center rounded-lg p-2 text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <nav className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden" aria-label="Breadcrumb">
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
                  <span className="text-sm text-foreground/20 select-none shrink-0">/</span>
                )}
                <button
                  type="button"
                  onClick={() => navigate(seg.path)}
                  className={`rounded-lg px-2 py-1 text-sm transition-all truncate text-left ${
                    isLast
                      ? "min-w-0 flex-1 font-semibold text-foreground hover:bg-foreground/5"
                      : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground max-w-[100px] sm:max-w-none"
                  }`}
                  aria-current={isLast ? "page" : undefined}
                  title={seg.label}
                >
                  {showShortFirst ? (
                    <>
                      <span className="inline max-[420px]:hidden">{seg.label}</span>
                      <span className="hidden max-[420px]:inline">Dash...</span>
                    </>
                  ) : (
                    seg.label
                  )}
                </button>
              </span>
            );
          })}
        </nav>
      </div>

      {/* Center/Right: Connected users (on board) then User menu */}
      {showConnectedUsers && (
        <div
          className="flex items-center gap-2 overflow-hidden rounded-lg border border-border/50 bg-background/80 px-2 py-1.5"
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
              <span className="truncate text-xs text-foreground/80">{u.displayName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Right: User menu dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((open) => !open)}
          className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-foreground/5"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          aria-label="User menu"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover ring-1 ring-border/50"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              {userInitial}
            </div>
          )}
          {user && (
            <span className="hidden text-xs font-medium text-foreground/50 sm:block">
              {user.username}
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-foreground/40 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-background py-1 shadow-lg"
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setDropdownOpen(false);
                navigate(user?.username ? `/profile/${encodeURIComponent(user.username)}` : "/profile");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-foreground/5"
            >
              <User className="h-4 w-4 text-foreground/60" />
              Profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setDropdownOpen(false);
                navigate("/settings");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-foreground/5"
            >
              <Settings className="h-4 w-4 text-foreground/60" />
              Settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setDropdownOpen(false);
                logout();
                navigate("/", { replace: true });
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-500/10 dark:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
