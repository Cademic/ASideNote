import type { ComponentType } from "react";
import type { NavigateFunction } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  FolderOpen,
  LayoutDashboard,
  Plus,
  Settings as SettingsIcon,
  StickyNote,
} from "lucide-react";

/**
 * Command-palette actions shown alongside search results. `keywords` widens what
 * the query has to match; `run` performs the action.
 *
 * The list pages have no "open create dialog" URL param, so the create actions
 * navigate to the relevant list page where the create button lives.
 */
export interface QuickAction {
  id: string;
  label: string;
  keywords: string;
  icon: ComponentType<{ className?: string }>;
  run: (navigate: NavigateFunction) => void;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "new-board",
    label: "Create board",
    keywords: "new board note cork add create",
    icon: Plus,
    run: (navigate) => navigate("/boards"),
  },
  {
    id: "new-chalkboard",
    label: "Create chalk board",
    keywords: "new chalkboard drawing canvas add create",
    icon: Plus,
    run: (navigate) => navigate("/chalkboards"),
  },
  {
    id: "new-notebook",
    label: "Create notebook",
    keywords: "new notebook document write add create",
    icon: Plus,
    run: (navigate) => navigate("/notebooks"),
  },
  {
    id: "new-project",
    label: "Create project",
    keywords: "new project workspace add create",
    icon: Plus,
    run: (navigate) => navigate("/projects"),
  },
  {
    id: "go-dashboard",
    label: "Go to Dashboard",
    keywords: "home overview dashboard",
    icon: LayoutDashboard,
    run: (navigate) => navigate("/dashboard"),
  },
  {
    id: "go-boards",
    label: "Go to Boards",
    keywords: "boards list",
    icon: StickyNote,
    run: (navigate) => navigate("/boards"),
  },
  {
    id: "go-notebooks",
    label: "Go to Notebooks",
    keywords: "notebooks list",
    icon: BookOpen,
    run: (navigate) => navigate("/notebooks"),
  },
  {
    id: "go-projects",
    label: "Go to Projects",
    keywords: "projects list",
    icon: FolderOpen,
    run: (navigate) => navigate("/projects"),
  },
  {
    id: "go-calendar",
    label: "Go to Calendar",
    keywords: "calendar events schedule",
    icon: Calendar,
    run: (navigate) => navigate("/calendar"),
  },
  {
    id: "go-settings",
    label: "Go to Settings",
    keywords: "settings preferences account",
    icon: SettingsIcon,
    run: (navigate) => navigate("/settings"),
  },
];
