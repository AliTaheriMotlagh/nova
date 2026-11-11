"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bug,
  Check,
  ChevronDown,
  CircleDot,
  Cloud,
  Command,
  Download,
  FolderOpen,
  Loader2,
  MoreHorizontal,
  PanelRight,
  Play,
  Plus,
  Save,
  Square,
  Upload,
  Zap,
} from "lucide-react";
import type { Project } from "@/lib/types";
import type { SaveStatus } from "@/components/NovaApp";
import { NovaMark } from "@/components/Brand";

export function TitleBar({
  project,
  projects,
  saveStatus,
  onCommand,
  onQuickOpen,
  onExit,
  onSwitchProject,
  onRun,
  onRunCurrent,
  onDebug,
  onStop,
  running,
  debugging,
  previewOpen,
  onTogglePreview,
  onSave,
  onExport,
  onImport,
  onShowShortcuts,
}: {
  project: Project;
  projects: Project[];
  saveStatus: SaveStatus;
  onCommand: () => void;
  onQuickOpen: () => void;
  onExit: () => void;
  onSwitchProject: (id: string) => void;
  onRun: () => void;
  onRunCurrent: () => void;
  onDebug: () => void;
  onStop: () => void;
  running: boolean;
  debugging: boolean;
  previewOpen: boolean;
  onTogglePreview: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  onShowShortcuts: () => void;
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [runMenuOpen, setRunMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setSwitcherOpen(false);
        setRunMenuOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="titlebar" ref={rootRef}>
      <div className="titlebar-left">
        <button className="titlebar-logo" onClick={onExit} title="Back to dashboard">
          <NovaMark size={25} />
        </button>
        <div className="project-switcher-wrap">
          <button
            className="project-switcher"
            onClick={() => {
              setSwitcherOpen((value) => !value);
              setRunMenuOpen(false);
              setMoreOpen(false);
            }}
          >
            <span className="project-switcher-name">{project.name}</span>
            <ChevronDown size={11} style={{ transform: switcherOpen ? "rotate(180deg)" : "none" }} />
          </button>
          {switcherOpen && (
            <div className="dropdown project-dropdown">
              <div className="dropdown-label">Workspaces</div>
              {projects.map((item) => (
                <button
                  key={item.id}
                  className={`dropdown-item ${item.id === project.id ? "selected" : ""}`}
                  onClick={() => {
                    setSwitcherOpen(false);
                    if (item.id !== project.id) onSwitchProject(item.id);
                  }}
                >
                  <FolderOpen size={13} />
                  <span>{item.name}</span>
                  {item.id === project.id && <Check size={12} style={{ marginLeft: "auto", color: "var(--accent)" }} />}
                </button>
              ))}
              <div className="dropdown-separator" />
              <button
                className="dropdown-item"
                onClick={() => {
                  setSwitcherOpen(false);
                  onExit();
                }}
              >
                <Plus size={13} />
                <span>New workspace / dashboard</span>
              </button>
            </div>
          )}
        </div>
        <div className={`save-indicator ${saveStatus}`}>
          {saveStatus === "saving" ? (
            <Loader2 size={11} className="spin" />
          ) : saveStatus === "error" ? (
            <Cloud size={11} />
          ) : saveStatus === "dirty" ? (
            <CircleDot size={11} />
          ) : (
            <Check size={11} />
          )}
          <span>
            {saveStatus === "saving"
              ? "Saving"
              : saveStatus === "error"
                ? "Save failed"
                : saveStatus === "dirty"
                  ? "Unsaved"
                  : "Saved"}
          </span>
        </div>
      </div>

      <button className="command-trigger" onClick={onCommand} onDoubleClick={onQuickOpen}>
        <Command size={12} />
        <span>Search files or run commands</span>
        <span className="command-trigger-keys">
          <kbd className="kbd">⌘</kbd>
          <kbd className="kbd">⇧P</kbd>
        </span>
      </button>

      <div className="titlebar-right">
        <div className="run-group">
          <button className={`run-button ${running ? "running" : ""}`} onClick={running ? onStop : onRun}>
            {running ? <Square size={10} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
            {running ? "Stop" : "Run"}
          </button>
          <button
            className="run-chevron"
            onClick={() => {
              setRunMenuOpen((value) => !value);
              setSwitcherOpen(false);
              setMoreOpen(false);
            }}
            aria-label="Run options"
          >
            <ChevronDown size={11} />
          </button>
          {runMenuOpen && (
            <div className="dropdown run-dropdown">
              <button
                className="dropdown-item"
                onClick={() => {
                  setRunMenuOpen(false);
                  onRun();
                }}
              >
                <Zap size={13} />
                <span>Run project</span>
                <kbd className="kbd">⌘↵</kbd>
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setRunMenuOpen(false);
                  onRunCurrent();
                }}
              >
                <Play size={13} />
                <span>Run current file</span>
                <kbd className="kbd">⇧⌘↵</kbd>
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setRunMenuOpen(false);
                  onDebug();
                }}
              >
                <Bug size={13} />
                <span>Debug current file</span>
                <kbd className="kbd">⇧⌘D</kbd>
              </button>
              {running && (
                <>
                  <div className="dropdown-separator" />
                  <button
                    className="dropdown-item danger"
                    onClick={() => {
                      setRunMenuOpen(false);
                      onStop();
                    }}
                  >
                    <Square size={12} />
                    <span>Stop execution</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <button
          className={`titlebar-icon ${debugging ? "active" : ""}`}
          title="Debug current file"
          onClick={onDebug}
        >
          <Bug size={15} />
        </button>
        <button
          className={`titlebar-icon ${previewOpen ? "active" : ""}`}
          title="Toggle preview"
          onClick={onTogglePreview}
        >
          <PanelRight size={15} />
        </button>
        <div className="more-wrap">
          <button
            className="titlebar-icon"
            title="More actions"
            onClick={() => {
              setMoreOpen((value) => !value);
              setSwitcherOpen(false);
              setRunMenuOpen(false);
            }}
          >
            <MoreHorizontal size={16} />
          </button>
          {moreOpen && (
            <div className="dropdown more-dropdown">
              <button
                className="dropdown-item"
                onClick={() => {
                  setMoreOpen(false);
                  onSave();
                }}
              >
                <Save size={13} />
                <span>Save workspace</span>
                <kbd className="kbd">⌘S</kbd>
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setMoreOpen(false);
                  onExport();
                }}
              >
                <Download size={13} />
                <span>Export ZIP</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setMoreOpen(false);
                  onImport();
                }}
              >
                <Upload size={13} />
                <span>Import workspace</span>
              </button>
              <div className="dropdown-separator" />
              <button
                className="dropdown-item"
                onClick={() => {
                  setMoreOpen(false);
                  onShowShortcuts();
                }}
              >
                <Command size={13} />
                <span>Keyboard shortcuts</span>
              </button>
            </div>
          )}
        </div>
        <button className="avatar" title="Local profile" onClick={onExit}>
          L
        </button>
      </div>
    </header>
  );
}
