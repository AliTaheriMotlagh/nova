"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  Braces,
  Check,
  ChevronDown,
  Database,
  FileText,
  FolderOpen,
  Globe2,
  HardDrive,
  History,
  Keyboard,
  Moon,
  Plus,
  RotateCcw,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { Project, ProjectFile, Settings, SidebarView, Snapshot } from "@/lib/types";
import { RUNTIME_INFO, getLanguage, type TreeNode } from "@/lib/languages";
import { formatBytes, formatTime, timeAgo } from "@/lib/utils";
import { storageEstimate } from "@/lib/db";
import { useIDE } from "@/lib/store";
import { FileGlyph } from "./FileIcon";
import { FileTree } from "./FileTree";
import { SearchPanel } from "./SearchPanel";

export interface SidebarProps {
  view: SidebarView;
  project: Project;
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
  onSelectFile: (id: string) => void;
  onNewFile: (parent?: string) => void;
  onNewFolder: (parent?: string) => void;
  onRename: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  onDuplicate: (file: ProjectFile) => void;
  onSetEntry: (file: ProjectFile) => void;
  onOpenAt: (fileId: string, line: number, column: number) => void;
  searchFocusNonce: number;
  snapshots: Snapshot[];
  onCreateCheckpoint: () => void;
  onRestoreSnapshot: (snapshot: Snapshot) => void;
  onDeleteSnapshot: (snapshot: Snapshot) => void;
  onExport: () => void;
  onImport: () => void;
  onShowShortcuts: () => void;
  onClose: () => void;
}

const VIEW_META: Record<SidebarView, { title: string; icon: typeof FolderOpen }> = {
  explorer: { title: "Explorer", icon: FolderOpen },
  search: { title: "Search", icon: SlidersHorizontal },
  checkpoints: { title: "Checkpoints", icon: History },
  runtimes: { title: "Runtimes", icon: Boxes },
  settings: { title: "Settings", icon: SettingsIcon },
};

export function Sidebar(props: SidebarProps) {
  const { view, project, onClose } = props;
  const meta = VIEW_META[view];
  const Icon = meta.icon;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Icon size={13} />
          <span>{meta.title}</span>
        </div>
        <div className="sidebar-header-actions">
          {view === "explorer" && (
            <>
              <button className="icon-button" title="New file" onClick={() => props.onNewFile()}>
                <Plus size={14} />
              </button>
              <button
                className="icon-button"
                title="New folder"
                onClick={() => props.onNewFolder()}
              >
                <FolderOpen size={13} />
              </button>
            </>
          )}
          {view === "checkpoints" && (
            <button className="icon-button" title="Create checkpoint" onClick={props.onCreateCheckpoint}>
              <Plus size={14} />
            </button>
          )}
          <button className="icon-button" title="Close sidebar" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
      </div>

      {view === "explorer" && <Explorer {...props} />}
      {view === "search" && (
        <SearchPanel
          files={project.files}
          focusNonce={props.searchFocusNonce}
          onOpenAt={props.onOpenAt}
        />
      )}
      {view === "checkpoints" && <Checkpoints {...props} />}
      {view === "runtimes" && <Runtimes />}
      {view === "settings" && <SettingsPanel {...props} />}
    </aside>
  );
}

function Explorer({ project, onSelectFile, onNewFile, onNewFolder, onRename, onDelete, onDuplicate, onSetEntry }: SidebarProps) {
  const entry = project.files.find((file) => file.path === project.entryPath);
  return (
    <div className="explorer-panel">
      <div className="project-strip">
        <div className="project-strip-name">{project.name}</div>
        <span className="project-strip-badge">local</span>
      </div>
      <FileTree
        files={project.files}
        activeFileId={project.activeFileId}
        onSelect={onSelectFile}
        onNewFile={(parent) => onNewFile(parent)}
        onNewFolder={(parent) => onNewFolder(parent)}
        onRename={onRename}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onSetEntry={onSetEntry}
      />
      <div className="explorer-footer">
        <div className="explorer-section-label">Entry point</div>
        {entry ? (
          <button className="entry-card" onClick={() => onSelectFile(entry.id)}>
            <FileGlyph path={entry.path} />
            <span>{entry.path}</span>
            <span className="entry-run">run</span>
          </button>
        ) : (
          <button className="entry-card empty" onClick={() => onNewFile()}>
            <Plus size={12} />
            <span>Choose an entry file</span>
          </button>
        )}
        <div className="explorer-section-label" style={{ marginTop: 14 }}>
          Workspace
        </div>
        <div className="workspace-stat">
          <span>Files</span>
          <b>{project.files.filter((file) => file.kind === "file").length}</b>
        </div>
        <div className="workspace-stat">
          <span>Storage</span>
          <b>IndexedDB</b>
        </div>
        <div className="workspace-stat">
          <span>Updated</span>
          <b>{timeAgo(project.updatedAt)}</b>
        </div>
      </div>
    </div>
  );
}

function Checkpoints({
  snapshots,
  onCreateCheckpoint,
  onRestoreSnapshot,
  onDeleteSnapshot,
}: SidebarProps) {
  return (
    <div className="checkpoints-panel">
      <div className="checkpoint-intro">
        <History size={14} />
        <p>Checkpoints are full local snapshots. Restore any point in time without a server.</p>
      </div>
      <button className="btn primary full" onClick={onCreateCheckpoint}>
        <Plus size={13} /> Create checkpoint
      </button>
      {snapshots.length === 0 ? (
        <div className="panel-empty">
          <History size={22} />
          <p>No checkpoints yet</p>
          <small>Create one before a big change.</small>
        </div>
      ) : (
        <div className="checkpoint-list">
          {snapshots.map((snapshot) => (
            <div className="checkpoint-item" key={snapshot.id}>
              <div className="checkpoint-marker" />
              <div className="checkpoint-main">
                <div className="checkpoint-message">{snapshot.message}</div>
                <div className="checkpoint-meta">
                  {timeAgo(snapshot.createdAt)} · {snapshot.files.filter((file) => file.kind === "file").length} files
                </div>
              </div>
              <div className="checkpoint-actions">
                <button
                  className="icon-button"
                  title={`Restore checkpoint from ${formatTime(snapshot.createdAt)}`}
                  onClick={() => onRestoreSnapshot(snapshot)}
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  className="icon-button"
                  title="Delete checkpoint"
                  onClick={() => onDeleteSnapshot(snapshot)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Runtimes() {
  const pythonStatus = useIDE((state) => state.pythonStatus);
  const buildStatus = useIDE((state) => state.buildStatus);

  const statusFor = (id: string) => {
    if (id === "python") return pythonStatus;
    if (id === "javascript" || id === "web") return buildStatus;
    return "idle";
  };

  const label = (status: string, onDemand: boolean) => {
    if (status === "loading") return { text: "Loading", tone: "loading" };
    if (status === "building") return { text: "Building", tone: "loading" };
    if (status === "running") return { text: "Running", tone: "loading" };
    if (status === "ready") return { text: "Ready", tone: "ready" };
    if (status === "error") return { text: "Error", tone: "error" };
    return onDemand ? { text: "On demand", tone: "idle" } : { text: "Ready", tone: "ready" };
  };

  return (
    <div className="runtimes-panel">
      <p className="runtimes-intro">
        Execution happens in this tab. No code is uploaded to a server.
      </p>
      {RUNTIME_INFO.map((runtime) => {
        const state = statusFor(runtime.id);
        const status = label(state, runtime.status === "on-demand");
        const Icon =
          runtime.id === "python"
            ? Braces
            : runtime.id === "web"
              ? Globe2
              : runtime.id === "sql"
                ? Database
                : runtime.id === "markdown"
                  ? FileText
                  : Braces;
        return (
          <div className="runtime-card" key={runtime.id}>
            <span className="runtime-icon" style={{ color: runtime.color }}>
              <Icon size={15} />
            </span>
            <div className="runtime-main">
              <div className="runtime-name">
                {runtime.name}
                <span className={`runtime-status ${status.tone}`}>
                  <span className="dot" />
                  {status.text}
                </span>
              </div>
              <div className="runtime-engine">{runtime.engine}</div>
              <p>{runtime.description}</p>
            </div>
          </div>
        );
      })}
      <div className="runtime-note">
        <HardDrive size={13} />
        <span>WASM binaries are cached by the browser after first load.</span>
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button className="toggle-row" onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span className="toggle-copy">
        <b>{label}</b>
        {description && <small>{description}</small>}
      </span>
      <span className={`toggle ${checked ? "on" : ""}`}>
        <span />
      </span>
    </button>
  );
}

function SettingsPanel({ settings, onSettings, onExport, onImport, onShowShortcuts }: SidebarProps) {
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });

  useEffect(() => {
    let active = true;
    storageEstimate()
      .then((value) => {
        if (active) setStorage(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const percent = storage.quota > 0 ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;

  return (
    <div className="settings-panel">
      <div className="settings-group">
        <div className="settings-label">Appearance</div>
        <div className="theme-switch">
          <button
            className={settings.theme === "dark" ? "active" : ""}
            onClick={() => onSettings({ theme: "dark" })}
          >
            <Moon size={12} /> Dark
          </button>
          <button
            className={settings.theme === "light" ? "active" : ""}
            onClick={() => onSettings({ theme: "light" })}
          >
            <Sun size={12} /> Light
          </button>
        </div>
        <div className="setting-field">
          <div className="setting-field-head">
            <span>Font size</span>
            <b>{settings.fontSize}px</b>
          </div>
          <input
            type="range"
            min={11}
            max={20}
            step={1}
            value={settings.fontSize}
            onChange={(event) => onSettings({ fontSize: Number(event.target.value) })}
          />
        </div>
        <div className="setting-field">
          <div className="setting-field-head">
            <span>Tab size</span>
            <select
              value={settings.tabSize}
              onChange={(event) => onSettings({ tabSize: Number(event.target.value) })}
            >
              {[2, 4, 8].map((value) => (
                <option value={value} key={value}>
                  {value} spaces
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-label">Editor</div>
        <Toggle
          label="Minimap"
          checked={settings.minimap}
          onChange={(value) => onSettings({ minimap: value })}
        />
        <Toggle
          label="Word wrap"
          checked={settings.wordWrap === "on"}
          onChange={(value) => onSettings({ wordWrap: value ? "on" : "off" })}
        />
        <Toggle
          label="Font ligatures"
          checked={settings.fontLigatures}
          onChange={(value) => onSettings({ fontLigatures: value })}
        />
      </div>

      <div className="settings-group">
        <div className="settings-label">Workspace</div>
        <Toggle
          label="Autosave"
          description="Persist every change to IndexedDB"
          checked={settings.autoSave}
          onChange={(value) => onSettings({ autoSave: value })}
        />
        <Toggle
          label="Live preview"
          description="Rebuild the preview after edits"
          checked={settings.livePreview}
          onChange={(value) => onSettings({ livePreview: value })}
        />
      </div>

      <div className="settings-group">
        <div className="settings-label">Local storage</div>
        <div className="storage-card">
          <div className="storage-head">
            <span>
              <HardDrive size={12} /> {formatBytes(storage.usage)} used
            </span>
            <span>{storage.quota ? formatBytes(storage.quota) : "unlimited"}</span>
          </div>
          <div className="storage-bar">
            <span style={{ width: `${Math.max(2, percent)}%` }} />
          </div>
          <small>Projects, settings and checkpoints live only in this browser.</small>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-label">Actions</div>
        <button className="settings-action" onClick={onExport}>
          <DownloadIcon /> Export workspace ZIP
        </button>
        <button className="settings-action" onClick={onImport}>
          <Upload size={13} /> Import a workspace
        </button>
        <button className="settings-action" onClick={onShowShortcuts}>
          <Keyboard size={13} /> Keyboard shortcuts
        </button>
      </div>

      <div className="settings-foot">
        <span className="pill">
          <Check size={9} /> Local-first
        </span>
        <span>Nova Studio 0.1</span>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}
