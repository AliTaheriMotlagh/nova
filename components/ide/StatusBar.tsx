"use client";

import { AlertTriangle, Bell, Braces, Check, Cloud, GitBranch, Radio, WifiOff } from "lucide-react";
import type { Project, Settings } from "@/lib/types";
import { getLanguage } from "@/lib/languages";
import type { SaveStatus } from "@/components/NovaApp";

export function StatusBar({
  project,
  settings,
  cursor,
  problems,
  saveStatus,
  pythonStatus,
  buildStatus,
  onProblems,
  onGoToLine,
  onToggleTheme,
}: {
  project: Project;
  settings: Settings;
  cursor: { line: number; column: number; selected: number };
  problems: { errors: number; warnings: number };
  saveStatus: SaveStatus;
  pythonStatus: string;
  buildStatus: string;
  onProblems: () => void;
  onGoToLine: () => void;
  onToggleTheme: () => void;
}) {
  const active = project.files.find((file) => file.id === project.activeFileId);
  const language = active ? getLanguage(active.path) : null;

  return (
    <footer className="statusbar">
      <div className="statusbar-left">
        <span className="status-item accent" title="Local workspace">
          <Radio size={10} />
          local
        </span>
        <span className="status-item" title="No remote configured">
          <GitBranch size={10} />
          main
        </span>
        <button className="status-item" onClick={onProblems} title="Show problems">
          <AlertTriangle size={10} />
          {problems.errors} <span className="status-muted">errors</span>
          <span style={{ marginLeft: 4 }}>{problems.warnings} warnings</span>
        </button>
        <span className="status-item status-idb" title="Persisted in IndexedDB">
          {saveStatus === "saving" ? <Cloud size={10} /> : saveStatus === "error" ? <WifiOff size={10} /> : saveStatus === "dirty" ? <Cloud size={10} /> : <Check size={10} />}
          {saveStatus === "saving" ? "syncing" : saveStatus === "error" ? "offline" : saveStatus === "dirty" ? "unsaved" : "IndexedDB"}
        </span>
      </div>
      <div className="statusbar-right">
        <button className="status-item" onClick={onGoToLine} title="Go to line">
          Ln {cursor.line}, Col {cursor.column}
          {cursor.selected > 0 ? ` (${cursor.selected} selected)` : ""}
        </button>
        <span className="status-item">{settings.tabSize} spaces</span>
        <span className="status-item">UTF-8</span>
        <span className="status-item">{language?.label ?? "Plain Text"}</span>
        <span className="status-item runtime-status-item">
          <Braces size={10} />
          {pythonStatus === "running"
            ? "Python running"
            : buildStatus === "building"
              ? "Building"
              : "WASM ready"}
        </span>
        <button className="status-item" onClick={onToggleTheme} title="Toggle color theme">
          {settings.theme === "dark" ? "dark" : "light"}
        </button>
        <span className="status-item">
          <Bell size={10} />
        </span>
      </div>
    </footer>
  );
}
