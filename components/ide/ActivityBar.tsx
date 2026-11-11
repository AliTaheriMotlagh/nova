"use client";

import {
  Boxes,
  Files,
  History,
  Home,
  Keyboard,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import type { SidebarView } from "@/lib/types";

const ITEMS: Array<{ id: SidebarView; icon: typeof Files; label: string }> = [
  { id: "explorer", icon: Files, label: "Explorer" },
  { id: "search", icon: Search, label: "Search" },
  { id: "checkpoints", icon: History, label: "Checkpoints" },
  { id: "runtimes", icon: Boxes, label: "Runtimes" },
];

export function ActivityBar({
  view,
  open,
  problems,
  theme,
  onView,
  onHome,
  onShowShortcuts,
  onToggleTheme,
}: {
  view: SidebarView;
  open: boolean;
  problems: number;
  theme: "dark" | "light";
  onView: (view: SidebarView) => void;
  onHome: () => void;
  onShowShortcuts: () => void;
  onToggleTheme: () => void;
}) {
  return (
    <nav className="activitybar" aria-label="Primary">
      <div className="activity-top">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = open && view === item.id;
          return (
            <button
              key={item.id}
              className={`activity-button ${active ? "active" : ""}`}
              title={item.label}
              aria-label={item.label}
              onClick={() => onView(item.id)}
            >
              <Icon size={19} strokeWidth={1.55} />
              {item.id === "explorer" && problems > 0 && (
                <span className="activity-badge">{problems > 9 ? "9+" : problems}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="activity-bottom">
        <button className="activity-button" title="Dashboard" aria-label="Dashboard" onClick={onHome}>
          <Home size={18} strokeWidth={1.55} />
        </button>
        <button className="activity-button" title="Keyboard shortcuts" aria-label="Keyboard shortcuts" onClick={onShowShortcuts}>
          <Keyboard size={18} strokeWidth={1.55} />
        </button>
        <button
          className="activity-button"
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          aria-label="Toggle theme"
          onClick={onToggleTheme}
        >
          {theme === "dark" ? <Sun size={18} strokeWidth={1.55} /> : <Moon size={18} strokeWidth={1.55} />}
        </button>
        <button
          className={`activity-button ${open && view === "settings" ? "active" : ""}`}
          title="Settings"
          aria-label="Settings"
          onClick={() => onView("settings")}
        >
          <Settings size={18} strokeWidth={1.55} />
        </button>
      </div>
    </nav>
  );
}
