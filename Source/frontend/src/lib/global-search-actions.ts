import type { ComponentType } from "react";
import type { NavigateFunction } from "react-router-dom";
import {
  Calendar,
  LayoutDashboard,
  LayoutGrid,
  Plus,
  Settings as SettingsIcon,
} from "lucide-react";

/**
 * Command-palette actions shown alongside search results. `keywords` widens what
 * the query has to match; `run` performs the action.
 *
 * The Gallery has no "open create dialog" URL param, so the create actions
 * navigate to the Gallery where the create menu lives.
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
    keywords: "new board note cork add create gallery",
    icon: Plus,
    run: (navigate) => navigate("/gallery"),
  },
  {
    id: "new-chalkboard",
    label: "Create chalk board",
    keywords: "new chalkboard drawing canvas add create gallery",
    icon: Plus,
    run: (navigate) => navigate("/gallery"),
  },
  {
    id: "new-notebook",
    label: "Create notebook",
    keywords: "new notebook document write add create gallery",
    icon: Plus,
    run: (navigate) => navigate("/gallery"),
  },
  {
    id: "new-project",
    label: "Create project",
    keywords: "new project workspace add create gallery",
    icon: Plus,
    run: (navigate) => navigate("/gallery"),
  },
  {
    id: "go-dashboard",
    label: "Go to Dashboard",
    keywords: "home overview dashboard",
    icon: LayoutDashboard,
    run: (navigate) => navigate("/dashboard"),
  },
  {
    id: "go-gallery",
    label: "Go to Gallery",
    keywords: "gallery boards notebooks projects chalkboards list",
    icon: LayoutGrid,
    run: (navigate) => navigate("/gallery"),
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
