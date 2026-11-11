"use client";

import { useEffect, useRef } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  ChevronDown,
  ChevronUp,
  Info,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Square,
  SquareTerminal,
  StepForward,
  Trash2,
  X,
} from "lucide-react";
import type { BottomTab, DebugPause, LogLine } from "@/lib/types";
import type { Problem } from "@/lib/store";
import type { SqlRunResult } from "@/lib/sql";
import { formatTime } from "@/lib/utils";
import { TerminalView } from "./Terminal";

const TABS: Array<{ id: BottomTab; label: string; icon: typeof SquareTerminal }> = [
  { id: "terminal", label: "Terminal", icon: SquareTerminal },
  { id: "output", label: "Output", icon: Info },
  { id: "problems", label: "Problems", icon: AlertCircle },
  { id: "debug", label: "Debug Console", icon: Bug },
];

export function BottomPanel({
  tab,
  maximized,
  logs,
  problems,
  sqlResult,
  debugStatus,
  debugPause,
  debugFile,
  terminalProps,
  onTab,
  onClose,
  onToggleMaximize,
  onClearLogs,
  onOpenAt,
  onDebugContinue,
  onDebugStep,
  onDebugStop,
  onDebugRestart,
}: {
  tab: BottomTab;
  maximized: boolean;
  logs: LogLine[];
  problems: Problem[];
  sqlResult: SqlRunResult | null;
  debugStatus: "idle" | "starting" | "running" | "paused" | "stopped";
  debugPause: DebugPause | null;
  debugFile: string | null;
  terminalProps: React.ComponentProps<typeof TerminalView>;
  onTab: (tab: BottomTab) => void;
  onClose: () => void;
  onToggleMaximize: () => void;
  onClearLogs: () => void;
  onOpenAt: (fileId: string, line: number, column: number) => void;
  onDebugContinue: () => void;
  onDebugStep: () => void;
  onDebugStop: () => void;
  onDebugRestart: () => void;
}) {
  const outputRef = useRef<HTMLDivElement>(null);
  const errors = problems.filter((problem) => problem.severity === "error").length;
  const warnings = problems.filter((problem) => problem.severity === "warning").length;

  useEffect(() => {
    if (tab === "output") outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [logs.length, tab, sqlResult]);

  return (
    <section className={`bottom-panel ${maximized ? "maximized" : ""}`}>
      <div className="panel-header">
        <div className="panel-tabs">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`panel-tab ${tab === item.id ? "active" : ""}`}
                onClick={() => onTab(item.id)}
              >
                <Icon size={12} />
                {item.label}
                {item.id === "problems" && problems.length > 0 && (
                  <span className="panel-badge">{problems.length}</span>
                )}
                {item.id === "debug" && debugStatus === "paused" && <span className="panel-badge live" />}
              </button>
            );
          })}
        </div>
        <div className="panel-actions">
          {tab === "output" && (
            <button className="icon-button" title="Clear output" onClick={onClearLogs}>
              <Trash2 size={12} />
            </button>
          )}
          <button
            className="icon-button"
            title={maximized ? "Restore panel" : "Maximize panel"}
            onClick={onToggleMaximize}
          >
            {maximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button className="icon-button" title="Close panel" onClick={onClose}>
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="panel-body">
        <div className={`panel-view terminal-view ${tab === "terminal" ? "active" : ""}`}>
          <TerminalView {...terminalProps} />
        </div>

        <div className={`panel-view output-view ${tab === "output" ? "active" : ""}`}>
          <div className="output-scroll" ref={outputRef}>
            {sqlResult && (
              <div className="sql-results">
                <div className="sql-summary">
                  <span className="sql-badge">SQLite</span>
                  {sqlResult.results.reduce((total, result) => total + result.values.length, 0)} rows ·{" "}
                  {sqlResult.durationMs.toFixed(0)} ms · {sqlResult.rowsModified} modified
                </div>
                {sqlResult.results.length === 0 && (
                  <div className="output-line system">Statement executed. No rows returned.</div>
                )}
                {sqlResult.results.map((result, index) => (
                  <div className="sql-table-wrap" key={index}>
                    <table className="sql-table">
                      <thead>
                        <tr>
                          {result.columns.map((column) => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.values.slice(0, 100).map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex}>{cell === null ? "NULL" : String(cell)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
            {logs.length === 0 && !sqlResult ? (
              <div className="panel-empty">
                <Info size={20} />
                <p>Runtime output will appear here.</p>
                <small>Console logs from previews, Python, builds and SQL.</small>
              </div>
            ) : (
              logs.map((log) => (
                <div className={`output-line ${log.level}`} key={log.id}>
                  <span className="output-time">{formatTime(log.time)}</span>
                  <span className="output-source">{log.source}</span>
                  <span className="output-text">{log.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`panel-view problems-view ${tab === "problems" ? "active" : ""}`}>
          <div className="problems-summary">
            <span className="problem-count error">
              <AlertCircle size={12} /> {errors} errors
            </span>
            <span className="problem-count warning">
              <AlertTriangle size={12} /> {warnings} warnings
            </span>
            <span className="problem-count muted">
              <Info size={12} /> {problems.length - errors - warnings} info
            </span>
          </div>
          {problems.length === 0 ? (
            <div className="panel-empty">
              <AlertCircle size={20} />
              <p>No problems detected</p>
              <small>Syntax errors and warnings from the active editor appear here.</small>
            </div>
          ) : (
            <div className="problems-list">
              {problems.map((problem, index) => (
                <button
                  key={`${problem.fileId}-${problem.line}-${index}`}
                  className={`problem-row ${problem.severity}`}
                  onClick={() => onOpenAt(problem.fileId, problem.line, problem.column)}
                >
                  {problem.severity === "error" ? (
                    <AlertCircle size={12} />
                  ) : problem.severity === "warning" ? (
                    <AlertTriangle size={12} />
                  ) : (
                    <Info size={12} />
                  )}
                  <span className="problem-message">{problem.message}</span>
                  <span className="problem-location">
                    {problem.path}:{problem.line}:{problem.column}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`panel-view debug-view ${tab === "debug" ? "active" : ""}`}>
          <div className="debug-toolbar">
            <div className="debug-controls">
              <button title="Continue" onClick={onDebugContinue} disabled={debugStatus !== "paused"}>
                <Play size={12} />
              </button>
              <button title="Step over" onClick={onDebugStep} disabled={debugStatus !== "paused"}>
                <StepForward size={12} />
              </button>
              <button title="Restart" onClick={onDebugRestart}>
                <RotateCcw size={12} />
              </button>
              <button title="Stop" onClick={onDebugStop} disabled={debugStatus === "idle" || debugStatus === "stopped"}>
                <Square size={10} fill="currentColor" />
              </button>
            </div>
            <div className={`debug-state ${debugStatus}`}>
              {debugStatus === "paused" ? <Pause size={11} /> : <Bug size={11} />}
              {debugStatus === "idle"
                ? "Not debugging"
                : debugStatus === "starting"
                  ? "Starting…"
                  : debugStatus === "paused"
                    ? "Paused"
                    : debugStatus === "running"
                      ? "Running"
                      : "Stopped"}
            </div>
            {debugFile && <span className="debug-file">{debugFile}</span>}
          </div>
          <div className="debug-body">
            {debugPause ? (
              <div className="debug-pause-card">
                <div className="debug-pause-head">
                  <span className={`debug-reason ${debugPause.reason}`}>{debugPause.reason}</span>
                  <span>{debugFile} line {debugPause.line}</span>
                </div>
                <div className="debug-frames">
                  {debugPause.frames.map((frame, index) => (
                    <div className="debug-frame" key={index}>
                      <ChevronDown size={10} className={index === 0 ? "" : "muted"} />
                      <span>{frame.fn ?? "anonymous"}</span>
                      <span className="debug-frame-line">line {frame.line}</span>
                    </div>
                  ))}
                </div>
                <p className="debug-note">
                  JavaScript stepping uses source instrumentation. Breakpoints pause before a statement executes.
                </p>
              </div>
            ) : (
              <div className="debug-log">
                {logs.filter((log) => log.source !== "terminal").slice(-80).map((log) => (
                  <div className={`output-line ${log.level}`} key={log.id}>
                    <span className="output-time">{formatTime(log.time)}</span>
                    <span className="output-source">{log.source}</span>
                    <span className="output-text">{log.text}</span>
                  </div>
                ))}
                {debugStatus === "idle" && (
                  <div className="panel-empty">
                    <Bug size={20} />
                    <p>Start a debug session</p>
                    <small>
                      Open a JavaScript or TypeScript file and press the bug icon. Add breakpoints by clicking
                      the gutter.
                    </small>
                    <button className="btn primary" onClick={onDebugRestart}>
                      <Play size={12} /> Debug current file
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
