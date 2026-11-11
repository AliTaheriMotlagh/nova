"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Monitor,
  PanelRightClose,
  RefreshCw,
  Smartphone,
  Tablet,
  Terminal,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { LogLine, RuntimeState, ViewportSize } from "@/lib/types";
import { formatTime } from "@/lib/utils";

const VIEWPORTS: ViewportSize[] = [
  { name: "desktop", width: null, label: "Desktop" },
  { name: "tablet", width: 768, label: "Tablet · 768" },
  { name: "mobile", width: 390, label: "Mobile · 390" },
];

export function PreviewPane({
  html,
  status,
  error,
  kind,
  tab,
  logs,
  appUrl,
  warnings,
  onTab,
  onClose,
  onRefresh,
  onClearConsole,
}: {
  html: string;
  status: RuntimeState;
  error: string | null;
  kind: "web" | "markdown" | "json" | "none";
  tab: "preview" | "console";
  logs: LogLine[];
  appUrl: string;
  warnings: string[];
  onTab: (tab: "preview" | "console") => void;
  onClose: () => void;
  onRefresh: () => void;
  onClearConsole: () => void;
}) {
  const [viewport, setViewport] = useState<ViewportSize>(VIEWPORTS[0]);
  const [viewportOpen, setViewportOpen] = useState(false);
  const [nonce, setNonce] = useState(0);
  const consoleRef = useRef<HTMLDivElement>(null);

  const runtimeLogs = useMemo(
    () => logs.filter((log) => log.source !== "terminal").slice(-180),
    [logs],
  );

  useEffect(() => {
    consoleRef.current?.scrollTo({ top: consoleRef.current.scrollHeight });
  }, [runtimeLogs.length, tab]);

  function openExternal() {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  const width = viewport.width;

  return (
    <section className="preview-pane">
      <div className="preview-header">
        <div className="preview-tabs">
          <button className={tab === "preview" ? "active" : ""} onClick={() => onTab("preview")}>
            Preview
          </button>
          <button className={tab === "console" ? "active" : ""} onClick={() => onTab("console")}>
            Console
            {runtimeLogs.length > 0 && <span className="preview-count">{runtimeLogs.length}</span>}
          </button>
        </div>
        <div className="preview-actions">
          <div className="viewport-wrap">
            <button
              className="preview-icon"
              title="Preview size"
              onClick={() => setViewportOpen((value) => !value)}
            >
              {viewport.name === "mobile" ? <Smartphone size={13} /> : viewport.name === "tablet" ? <Tablet size={13} /> : <Monitor size={13} />}
              <ChevronDown size={9} />
            </button>
            {viewportOpen && (
              <div className="dropdown viewport-dropdown">
                {VIEWPORTS.map((option) => (
                  <button
                    key={option.name}
                    className={`dropdown-item ${option.name === viewport.name ? "selected" : ""}`}
                    onClick={() => {
                      setViewport(option);
                      setViewportOpen(false);
                    }}
                  >
                    {option.name === "mobile" ? <Smartphone size={12} /> : option.name === "tablet" ? <Tablet size={12} /> : <Monitor size={12} />}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="preview-icon" title="Refresh preview" onClick={() => { setNonce((value) => value + 1); onRefresh(); }}>
            <RefreshCw size={12} className={status === "building" ? "spin" : ""} />
          </button>
          <button className="preview-icon" title="Open in new tab" onClick={openExternal} disabled={!html}>
            <ExternalLink size={12} />
          </button>
          <button className="preview-icon" title="Close preview" onClick={onClose}>
            <PanelRightClose size={13} />
          </button>
        </div>
      </div>

      <div className="preview-urlbar">
        <span className="preview-tls" />
        <span className="preview-url">{appUrl}</span>
        <span className="preview-badge">sandboxed</span>
        {status === "building" && <span className="preview-building">building…</span>}
      </div>

      {tab === "preview" ? (
        <div className={`preview-stage ${width ? "constrained" : ""}`}>
          {error ? (
            <div className="preview-error">
              <span className="preview-error-icon">
                <TriangleAlert size={18} />
              </span>
              <h3>Build failed</h3>
              <p>The preview could not be generated. Fix the error and try again.</p>
              <pre>{error}</pre>
            </div>
          ) : html ? (
            <div className="preview-device" style={width ? { width } : undefined}>
              <iframe
                key={`${nonce}-${kind}`}
                title="Nova preview"
                srcDoc={html}
                sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
                className="preview-iframe"
              />
            </div>
          ) : (
            <div className="preview-empty">
              <div className="preview-empty-glow" />
              <Terminal size={24} />
              <h3>No preview yet</h3>
              <p>Press Run to build this workspace and see it here.</p>
              <button className="btn primary" onClick={onRefresh}>
                <RefreshCw size={13} /> Build & preview
              </button>
            </div>
          )}
          {warnings.length > 0 && !error && (
            <div className="preview-warning">
              {warnings.length} build warning{warnings.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
      ) : (
        <div className="preview-console" ref={consoleRef}>
          <div className="console-toolbar">
            <span>{runtimeLogs.length} messages</span>
            <button onClick={onClearConsole} title="Clear console">
              <Trash2 size={11} /> Clear
            </button>
          </div>
          {runtimeLogs.length === 0 ? (
            <div className="console-empty">Console output from your app will appear here.</div>
          ) : (
            runtimeLogs.map((log) => (
              <div className={`console-line ${log.level}`} key={log.id}>
                <span className="console-time">{formatTime(log.time)}</span>
                <span className="console-source">{log.source}</span>
                <span className="console-text">{log.text}</span>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
