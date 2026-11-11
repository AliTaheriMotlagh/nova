"use client";

import { useRef, type RefObject } from "react";
import {
  ChevronRight,
  Code2,
  FilePlus2,
  FolderOpen,
  Pause,
  Play,
  RotateCcw,
  Search,
  Square,
  StepForward,
  Wand2,
  X,
} from "lucide-react";
import type { Project, Settings } from "@/lib/types";
import { getLanguage } from "@/lib/languages";
import { basename, dirname } from "@/lib/utils";
import type { Problem } from "@/lib/store";
import { CodeEditor, type EditorHandle } from "./CodeEditor";
import { FileGlyph } from "./FileIcon";

export function EditorArea({
  project,
  settings,
  editorRef,
  revealRequest,
  debugLine,
  debugActive,
  debugStatus,
  debugPausedLine,
  breakpoints,
  cursor,
  onCursor,
  onSelectFile,
  onCloseFile,
  onCloseAll,
  onChange,
  onToggleBreakpoint,
  onProblems,
  onNewFile,
  onQuickOpen,
  onFormat,
  onRun,
  onDebugContinue,
  onDebugStep,
  onDebugStop,
  onDebugRestart,
}: {
  project: Project;
  settings: Settings;
  editorRef: RefObject<EditorHandle | null>;
  revealRequest: { line: number; column?: number; nonce: number } | null;
  debugLine: number | null;
  debugActive: boolean;
  debugStatus: "idle" | "starting" | "running" | "paused" | "stopped";
  debugPausedLine: number | null;
  breakpoints: number[];
  cursor: { line: number; column: number; selected: number };
  onCursor: (position: { line: number; column: number; selected: number }) => void;
  onSelectFile: (id: string) => void;
  onCloseFile: (id: string) => void;
  onCloseAll: () => void;
  onChange: (id: string, value: string) => void;
  onToggleBreakpoint: (path: string, line: number) => void;
  onProblems: (problems: Problem[]) => void;
  onNewFile: () => void;
  onQuickOpen: () => void;
  onFormat: () => void;
  onRun: () => void;
  onDebugContinue: () => void;
  onDebugStep: () => void;
  onDebugStop: () => void;
  onDebugRestart: () => void;
}) {
  const active = project.files.find((file) => file.id === project.activeFileId) ?? null;
  const openFiles = project.openFiles
    .map((id) => project.files.find((file) => file.id === id))
    .filter((file): file is NonNullable<typeof file> => Boolean(file && file.kind === "file"));
  const tabStripRef = useRef<HTMLDivElement>(null);

  const breadcrumb = active ? active.path.split("/") : [];
  const language = active ? getLanguage(active.path) : null;

  return (
    <section className="editor-area">
      <div className="tabs-bar">
        <div className="tabs-scroll" ref={tabStripRef}>
          {openFiles.map((file) => {
            const isActive = file.id === project.activeFileId;
            const lang = getLanguage(file.path);
            return (
              <button
                key={file.id}
                className={`editor-tab ${isActive ? "active" : ""}`}
                onClick={() => onSelectFile(file.id)}
                onAuxClick={(event) => {
                  if (event.button === 1) onCloseFile(file.id);
                }}
                title={file.path}
              >
                <FileGlyph path={file.path} size={12} />
                <span className="tab-name">{basename(file.path)}</span>
                {lang.runtime === "esbuild" && <span className="tab-runtime-dot" title="WebAssembly runtime" />}
                <span
                  className="tab-close"
                  role="button"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCloseFile(file.id);
                  }}
                >
                  <X size={11} />
                </span>
              </button>
            );
          })}
        </div>
        <div className="tabs-actions">
          <button className="icon-button" title="New file" onClick={onNewFile}>
            <FilePlus2 size={13} />
          </button>
          <button className="icon-button" title="Quick open" onClick={onQuickOpen}>
            <Search size={13} />
          </button>
          <button className="icon-button" title="Close all tabs" onClick={onCloseAll}>
            <X size={13} />
          </button>
        </div>
      </div>

      {active ? (
        <>
          <div className="breadcrumbs">
            <span className="breadcrumb-icon">
              <FolderOpen size={11} />
            </span>
            {breadcrumb.map((part, index) => (
              <span className="breadcrumb-part" key={`${part}-${index}`}>
                {index > 0 && <ChevronRight size={10} className="breadcrumb-sep" />}
                <span
                  className={index === breadcrumb.length - 1 ? "breadcrumb-current" : ""}
                  onClick={() => {
                    if (index < breadcrumb.length - 1) {
                      const path = breadcrumb.slice(0, index + 1).join("/");
                      const folder = project.files.find((file) => file.path === path);
                      if (folder?.kind === "file") onSelectFile(folder.id);
                    }
                  }}
                >
                  {part}
                </span>
              </span>
            ))}
            <span className="breadcrumb-spacer" />
            <span className="breadcrumb-lang">{language?.label}</span>
            <button className="breadcrumb-action" title="Format document" onClick={onFormat}>
              <Wand2 size={11} />
            </button>
            <button className="breadcrumb-action" title="Run current file" onClick={onRun}>
              <Play size={11} />
            </button>
          </div>

          <div className="editor-canvas">
            <CodeEditor
              ref={editorRef}
              file={active}
              settings={settings}
              breakpoints={breakpoints}
              debugLine={debugLine}
              revealRequest={revealRequest}
              onChange={(value) => onChange(active.id, value)}
              onCursor={onCursor}
              onToggleBreakpoint={(line) => onToggleBreakpoint(active.path, line)}
              onProblems={onProblems}
            />
            {debugActive && (
              <div className={`debug-float ${debugStatus}`}>
                <span className="debug-float-status">
                  {debugStatus === "paused" ? <Pause size={11} /> : <Play size={11} />}
                  <span>
                    {debugStatus === "paused"
                      ? `Paused at line ${debugPausedLine ?? "?"}`
                      : debugStatus === "starting"
                        ? "Starting debugger…"
                        : debugStatus === "stopped"
                          ? "Debug session ended"
                          : "Debugging…"}
                  </span>
                </span>
                <span className="debug-float-actions">
                  <button title="Continue" onClick={onDebugContinue} disabled={debugStatus !== "paused"}>
                    <Play size={11} />
                  </button>
                  <button title="Step" onClick={onDebugStep} disabled={debugStatus !== "paused"}>
                    <StepForward size={11} />
                  </button>
                  <button title="Restart" onClick={onDebugRestart}>
                    <RotateCcw size={11} />
                  </button>
                  <button title="Stop" onClick={onDebugStop}>
                    <Square size={10} fill="currentColor" />
                  </button>
                </span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="editor-welcome">
          <div className="welcome-logo">
            <svg viewBox="0 0 32 32" width="34" height="34" fill="none">
              <path d="M8 23V9l16 14V9" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1>{project.name}</h1>
          <p>Open a file to start editing, or jump straight to a command.</p>
          <div className="welcome-actions">
            <button className="btn primary" onClick={onNewFile}>
              <FilePlus2 size={14} /> New file
            </button>
            <button className="btn" onClick={onQuickOpen}>
              <Search size={14} /> Quick open
              <kbd className="kbd">⌘P</kbd>
            </button>
          </div>
          <div className="welcome-recent">
            <div className="welcome-section-label">Files in this workspace</div>
            {project.files
              .filter((file) => file.kind === "file")
              .slice(0, 8)
              .map((file) => (
                <button key={file.id} className="welcome-file" onClick={() => onSelectFile(file.id)}>
                  <FileGlyph path={file.path} />
                  <span>{file.path}</span>
                  <ChevronRight size={11} />
                </button>
              ))}
          </div>
          <div className="welcome-hints">
            <span>
              <Code2 size={12} /> {openFiles.length} open tab{openFiles.length === 1 ? "" : "s"}
            </span>
            <span>
              <FolderOpen size={12} /> {project.files.filter((file) => file.kind === "file").length} files
            </span>
            <span>Last saved {new Date(project.updatedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </section>
  );
}
