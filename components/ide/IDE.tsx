"use client";

import "@/app/ide.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bug,
  ChevronRight,
  CircleDot,
  Code2,
  Download,
  FilePlus2,
  FolderPlus,
  Keyboard,
  LayoutPanelLeft,
  ListTree,
  Moon,
  PanelBottom,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Terminal,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import type { Project, ProjectFile, Snapshot, ViewportSize } from "@/lib/types";
import { useIDE, type Problem } from "@/lib/store";
import { getLanguage } from "@/lib/languages";
import { clamp, dirname, escapeHtml, slugify } from "@/lib/utils";
import { createSnapshot, deleteSnapshot, listSnapshots } from "@/lib/db";
import { buildWebProject, entryForProject } from "@/lib/web-build";
import { buildDebugDocument, instrumentForDebug } from "@/lib/debug";
import { runSql } from "@/lib/sql";
import type { SaveStatus } from "@/components/NovaApp";
import { ActivityBar } from "./ActivityBar";
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { EditorArea } from "./EditorArea";
import { PreviewPane } from "./PreviewPane";
import { BottomPanel } from "./BottomPanel";
import { StatusBar } from "./StatusBar";
import { CommandPalette, type PaletteCommand } from "./CommandPalette";
import type { EditorHandle } from "./CodeEditor";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface IDEProps {
  projects: Project[];
  saveStatus: SaveStatus;
  lastSavedAt: number;
  onExit: () => void;
  onOpenHome: () => void;
  onSwitchProject: (id: string) => Promise<void>;
  onSaveNow: () => Promise<void>;
  onCreateProject: (templateId: string, name: string) => Promise<void>;
  onExportProject: (project: Project) => Promise<void>;
  onImportProject: (file: File) => Promise<void>;
  onShowShortcuts: () => void;
}

interface PromptState {
  title: string;
  subtitle?: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  multiline?: boolean;
  inputMode?: "text" | "numeric";
  onSubmit: (value: string) => void;
}

interface ConfirmState {
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function IDE(props: IDEProps) {
  const project = useIDE((state) => state.project);
  if (!project) return null;
  return <IDEView {...props} project={project} />;
}

function IDEView({ project, projects, saveStatus, onExit, onOpenHome, onSwitchProject, onSaveNow, onExportProject, onImportProject, onShowShortcuts }: IDEProps & { project: Project }) {
  const settings = useIDE((state) => state.settings);
  const updateSettings = useIDE((state) => state.updateSettings);
  const setSidebarView = useIDE((state) => state.setSidebarView);
  const sidebarView = useIDE((state) => state.sidebarView);
  const sidebarOpen = useIDE((state) => state.sidebarOpen);
  const setSidebarOpen = useIDE((state) => state.setSidebarOpen);
  const toggleSidebar = useIDE((state) => state.toggleSidebar);
  const bottomOpen = useIDE((state) => state.bottomOpen);
  const setBottomOpen = useIDE((state) => state.setBottomOpen);
  const bottomTab = useIDE((state) => state.bottomTab);
  const setBottomTab = useIDE((state) => state.setBottomTab);
  const previewOpen = useIDE((state) => state.previewOpen);
  const setPreviewOpen = useIDE((state) => state.setPreviewOpen);
  const previewTab = useIDE((state) => state.previewTab);
  const setPreviewTab = useIDE((state) => state.setPreviewTab);
  const logs = useIDE((state) => state.logs);
  const problems = useIDE((state) => state.problems);
  const debugStatus = useIDE((state) => state.debugStatus);
  const debugPaused = useIDE((state) => state.debugPaused);
  const debugFile = useIDE((state) => state.debugFile);
  const breakpointsMap = useIDE((state) => state.breakpoints);
  const pythonStatus = useIDE((state) => state.pythonStatus);
  const buildStatus = useIDE((state) => state.buildStatus);
  const sqlResult = useIDE((state) => state.sqlResult);

  const openFileStore = useIDE((state) => state.openFile);
  const closeFile = useIDE((state) => state.closeFile);
  const closeAllFiles = useIDE((state) => state.closeAllFiles);
  const updateFile = useIDE((state) => state.updateFile);
  const createFile = useIDE((state) => state.createFile);
  const createFolder = useIDE((state) => state.createFolder);
  const renamePath = useIDE((state) => state.renamePath);
  const deletePath = useIDE((state) => state.deletePath);
  const duplicateNode = useIDE((state) => state.duplicateNode);
  const replaceFiles = useIDE((state) => state.replaceFiles);
  const setEntryPath = useIDE((state) => state.setEntryPath);
  const setProjectName = useIDE((state) => state.setProjectName);
  const addLog = useIDE((state) => state.addLog);
  const clearLogs = useIDE((state) => state.clearLogs);
  const setProblems = useIDE((state) => state.setProblems);
  const addToast = useIDE((state) => state.addToast);
  const setPythonStatus = useIDE((state) => state.setPythonStatus);
  const setBuildStatus = useIDE((state) => state.setBuildStatus);
  const setDebugStatus = useIDE((state) => state.setDebugStatus);
  const setDebugFile = useIDE((state) => state.setDebugFile);
  const setDebugPaused = useIDE((state) => state.setDebugPaused);
  const toggleBreakpoint = useIDE((state) => state.toggleBreakpoint);
  const setSqlResult = useIDE((state) => state.setSqlResult);

  const active = project.files.find((file) => file.id === project.activeFileId) ?? null;
  const activeLanguage = active ? getLanguage(active.path) : null;
  const breakpoints = active ? breakpointsMap[active.path] ?? [] : [];

  const editorRef = useRef<EditorHandle | null>(null);
  const pyWorkerRef = useRef<Worker | null>(null);
  const debugFrameRef = useRef<HTMLIFrameElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const editorRowRef = useRef<HTMLDivElement | null>(null);
  const buildSequence = useRef(0);
  const lastBuildRef = useRef<{ entry?: string; htmlPath?: string } | null>(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<"commands" | "files">("commands");
  const [promptState, setPromptState] = useState<PromptState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotRevision, setSnapshotRevision] = useState(0);
  const [searchNonce, setSearchNonce] = useState(0);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [previewKind, setPreviewKind] = useState<"web" | "markdown" | "json" | "none">("none");
  const [revealRequest, setRevealRequest] = useState<{ line: number; column?: number; nonce: number } | null>(null);
  const [cursor, setCursor] = useState({ line: 1, column: 1, selected: 0 });
  const [debugDoc, setDebugDoc] = useState("");
  const [debugNonce, setDebugNonce] = useState(0);
  const [bottomHeight, setBottomHeight] = useState(235);
  const [bottomMaximized, setBottomMaximized] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(42);

  const appUrl = `localhost:5173/${slugify(project.name) || "preview"}`;
  const running =
    pythonStatus === "running" ||
    pythonStatus === "loading" ||
    debugStatus === "running" ||
    debugStatus === "paused" ||
    debugStatus === "starting";
  const debugging = debugStatus === "running" || debugStatus === "paused" || debugStatus === "starting";
  const debugLine =
    debugStatus === "paused" && debugPaused && active?.path === debugFile ? debugPaused.line : null;
  const problemTotals = useMemo(
    () => ({
      errors: problems.filter((problem) => problem.severity === "error").length,
      warnings: problems.filter((problem) => problem.severity === "warning").length,
    }),
    [problems],
  );

  useEffect(() => {
    if (window.matchMedia("(max-width: 780px)").matches) setSidebarOpen(false);
  }, [setSidebarOpen]);

  useEffect(() => {
    setPreviewHtml("");
    setPreviewError(null);
    setPreviewWarnings([]);
    setPreviewKind("none");
    setDebugDoc("");
    setDebugStatus("idle");
    setDebugPaused(null);
    setDebugFile(null);
    setCursor({ line: 1, column: 1, selected: 0 });
    setBottomMaximized(false);
    clearLogs();
    setSqlResult(null);
    lastBuildRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  useEffect(() => {
    let cancelled = false;
    listSnapshots(project.id)
      .then((items) => {
        if (!cancelled) setSnapshots(items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [project.id, snapshotRevision]);

  useEffect(() => {
    return () => {
      pyWorkerRef.current?.terminate();
      pyWorkerRef.current = null;
    };
  }, []);

  const openAt = useCallback(
    (fileId: string, line: number, column: number) => {
      openFileStore(fileId);
      window.setTimeout(() => {
        setRevealRequest({ line, column, nonce: Date.now() });
      }, 70);
    },
    [openFileStore],
  );

  const openFile = useCallback(
    (id: string) => {
      openFileStore(id);
      setCursor({ line: 1, column: 1, selected: 0 });
    },
    [openFileStore],
  );

  const showCommandPalette = useCallback(() => {
    setPaletteMode("commands");
    setPaletteOpen(true);
  }, []);

  const showQuickOpen = useCallback(() => {
    setPaletteMode("files");
    setPaletteOpen(true);
  }, []);

  const promptNewFile = useCallback(
    (parent?: string) => {
      const base = parent ?? (active ? dirname(active.path) : "");
      setPromptState({
        title: "New file",
        subtitle: "Create a file in this workspace.",
        label: "File path",
        placeholder: "src/component.tsx",
        initialValue: base ? `${base}/` : "",
        confirmLabel: "Create file",
        onSubmit: (value) => {
          const created = createFile(value, "");
          if (created) {
            addToast(`Created ${created.path}`, "success");
            window.setTimeout(() => editorRef.current?.focus(), 80);
          } else {
            addToast("Could not create that file.", "error");
          }
        },
      });
    },
    [active, addToast, createFile],
  );

  const promptNewFolder = useCallback(
    (parent?: string) => {
      const base = parent ?? (active ? dirname(active.path) : "");
      setPromptState({
        title: "New folder",
        subtitle: "Folders group files in the explorer.",
        label: "Folder path",
        placeholder: "src/components",
        initialValue: base ? `${base}/` : "",
        confirmLabel: "Create folder",
        onSubmit: (value) => {
          createFolder(value);
          addToast(`Created folder ${value}`, "success");
        },
      });
    },
    [active, addToast, createFolder],
  );

  const promptRename = useCallback(
    (node: { path: string }) => {
      setPromptState({
        title: "Rename",
        subtitle: "Rename this file or folder. Open tabs stay in place.",
        label: "New name",
        initialValue: node.path.split("/").pop() ?? node.path,
        confirmLabel: "Rename",
        onSubmit: (value) => {
          renamePath(node.path, value);
          addToast("Renamed.", "success");
        },
      });
    },
    [addToast, renamePath],
  );

  const promptDelete = useCallback(
    (node: { path: string; kind: "file" | "folder" }) => {
      setConfirmState({
        title: `Delete ${node.kind}?`,
        text: `“${node.path}”${node.kind === "folder" ? " and everything inside" : ""} will be removed from this workspace. This cannot be undone, but you can restore an older checkpoint.`,
        confirmLabel: `Delete ${node.kind}`,
        danger: true,
        onConfirm: () => {
          deletePath(node.path);
          addToast(`Deleted ${node.path}.`, "success");
        },
      });
    },
    [addToast, deletePath],
  );

  const promptDuplicate = useCallback(
    (file: ProjectFile) => {
      duplicateNode(file.id);
      addToast("File duplicated.", "success");
    },
    [addToast, duplicateNode],
  );

  const promptRenameWorkspace = useCallback(() => {
    setPromptState({
      title: "Rename workspace",
      subtitle: "This only changes the display name, not the files.",
      label: "Workspace name",
      initialValue: project.name,
      confirmLabel: "Rename workspace",
      onSubmit: (value) => {
        setProjectName(value);
        addToast("Workspace renamed.", "success");
      },
    });
  }, [addToast, project.name, setProjectName]);

  const promptCheckpoint = useCallback(() => {
    setPromptState({
      title: "Create checkpoint",
      subtitle: "Snapshot every file. Restore it later from the Checkpoints view.",
      label: "Checkpoint message",
      placeholder: "Before refactoring the landing page",
      initialValue: `Checkpoint · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      confirmLabel: "Create checkpoint",
      onSubmit: (value) => {
        void createSnapshot(project, value).then(() => {
          setSnapshotRevision((revision) => revision + 1);
          addToast("Checkpoint created.", "success");
        });
      },
    });
  }, [addToast, project]);

  const restoreSnapshot = useCallback(
    (snapshot: Snapshot) => {
      setConfirmState({
        title: "Restore this checkpoint?",
        text: `All files will be replaced with the snapshot from ${new Date(snapshot.createdAt).toLocaleString()}. Nova creates a safety checkpoint first.`,
        confirmLabel: "Restore checkpoint",
        onConfirm: () => {
          void (async () => {
            await createSnapshot(project, "Auto · before restore");
            replaceFiles(snapshot.files);
            setSnapshotRevision((revision) => revision + 1);
            addToast("Checkpoint restored.", "success");
          })();
        },
      });
    },
    [addToast, project, replaceFiles],
  );

  const removeSnapshot = useCallback(
    (snapshot: Snapshot) => {
      setConfirmState({
        title: "Delete checkpoint?",
        text: `“${snapshot.message}” will be permanently removed. Your current files are not affected.`,
        confirmLabel: "Delete checkpoint",
        danger: true,
        onConfirm: () => {
          void deleteSnapshot(snapshot.id).then(() => {
            setSnapshotRevision((revision) => revision + 1);
            addToast("Checkpoint deleted.", "success");
          });
        },
      });
    },
    [addToast],
  );

  const buildPreview = useCallback(
    async (options: { entry?: string; htmlPath?: string }, silent = false) => {
      const sequence = ++buildSequence.current;
      setBuildStatus("building");
      if (!silent) {
        setPreviewError(null);
        setPreviewOpen(true);
        setPreviewTab("preview");
      }
      try {
        const result = await buildWebProject(project.files, options);
        if (sequence !== buildSequence.current) return;
        setPreviewHtml(result.html);
        setPreviewError(null);
        setPreviewWarnings(result.warnings);
        setPreviewKind("web");
        setBuildStatus("ready");
        setPreviewOpen(true);
        setPreviewTab("preview");
        lastBuildRef.current = options;
        if (!silent) {
          const bundleSize = (result.js.length + result.css.length) / 1024;
          addLog(
            "system",
            `▲ esbuild ${result.entry || "preview"} · ${bundleSize.toFixed(1)} KB${result.externalPackages.length ? ` · ${result.externalPackages.length} ESM import${result.externalPackages.length === 1 ? "" : "s"}` : ""}`,
            "javascript",
          );
          for (const warning of result.warnings) addLog("warn", warning, "javascript");
        }
      } catch (error) {
        if (sequence !== buildSequence.current) return;
        const message = error instanceof Error ? error.message : String(error);
        setPreviewError(message);
        setPreviewKind("web");
        setPreviewWarnings([]);
        setBuildStatus("error");
        setPreviewOpen(true);
        setPreviewTab("preview");
        addLog("error", message, "javascript");
        if (!silent) addToast("Build failed. See the preview for details.", "error");
      }
    },
    [addLog, addToast, project.files, setBuildStatus, setPreviewOpen, setPreviewTab],
  );

  const ensurePythonWorker = useCallback((): Worker => {
    if (pyWorkerRef.current) return pyWorkerRef.current;
    const worker = new Worker("/runtimes/python-worker.js");
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        status?: string;
        message?: string;
        text?: string;
        level?: string;
        packageName?: string;
      };
      if (!data?.type) return;
      if (data.type === "status" && data.status) {
        const status = data.status as "idle" | "loading" | "ready" | "running" | "error";
        setPythonStatus(status);
        if (data.status === "loading" && data.message) addLog("system", data.message, "python");
        if (data.status === "ready" && data.message) addLog("system", data.message, "python");
        return;
      }
      if (data.type === "stdout") {
        addLog("log", data.text ?? "", "python");
        return;
      }
      if (data.type === "stderr") {
        addLog("warn", data.text ?? "", "python");
        return;
      }
      if (data.type === "error") {
        addLog("error", data.message ?? "Python error", "python");
        setPythonStatus("error");
        return;
      }
      if (data.type === "installed") {
        addLog("system", `Installed ${data.packageName}`, "python");
        addToast(`Installed ${data.packageName} with micropip.`, "success");
        return;
      }
      if (data.type === "done") {
        setPythonStatus("ready");
      }
    };
    worker.onerror = (event) => {
      addLog("error", event.message || "Python runtime crashed.", "python");
      setPythonStatus("error");
    };
    pyWorkerRef.current = worker;
    return worker;
  }, [addLog, addToast, setPythonStatus]);

  const runPython = useCallback(
    (path?: string) => {
      const target = path
        ? project.files.find((file) => file.path === path && file.kind === "file")
        : activeLanguage?.id === "python"
          ? active
          : project.files.find((file) => file.path.endsWith(".py") && file.kind === "file");
      if (!target) {
        addToast("Open a Python file first.", "error");
        return;
      }
      if (path && target.id !== project.activeFileId) openFile(target.id);
      setBottomOpen(true);
      setBottomTab("output");
      setPreviewOpen(false);
      addLog("system", `$ python ${target.path}`, "python");
      const currentStatus = useIDE.getState().pythonStatus;
      setPythonStatus(currentStatus === "ready" ? "running" : "loading");
      const worker = ensurePythonWorker();
      worker.postMessage({ type: "run", code: target.content ?? "" });
    },
    [active, activeLanguage, addLog, addToast, ensurePythonWorker, openFile, project.activeFileId, project.files, setBottomOpen, setBottomTab, setPreviewOpen, setPythonStatus],
  );

  const installPython = useCallback(
    (packageName: string) => {
      setBottomOpen(true);
      setBottomTab("output");
      const worker = ensurePythonWorker();
      worker.postMessage({ type: "install", packageName });
    },
    [ensurePythonWorker, setBottomOpen, setBottomTab],
  );

  const stopPython = useCallback(() => {
    if (pyWorkerRef.current) {
      pyWorkerRef.current.terminate();
      pyWorkerRef.current = null;
      addLog("system", "Python runtime stopped.", "python");
    }
    setPythonStatus("idle");
  }, [addLog, setPythonStatus]);

  const runSqlFile = useCallback(
    async (path?: string) => {
      const target = path
        ? project.files.find((file) => file.path === path && file.kind === "file")
        : activeLanguage?.id === "sql"
          ? active
          : project.files.find((file) => file.path.endsWith(".sql") && file.kind === "file");
      if (!target) {
        addToast("Open a .sql file first.", "error");
        return;
      }
      if (path && target.id !== project.activeFileId) openFile(target.id);
      setBottomOpen(true);
      setBottomTab("output");
      setPreviewOpen(false);
      setSqlResult(null);
      addLog("system", `$ sqlite ${target.path}`, "sql");
      try {
        const result = await runSql(target.content ?? "");
        setSqlResult(result);
        const rows = result.results.reduce((total, item) => total + item.values.length, 0);
        addLog("system", `SQLite · ${rows} row${rows === 1 ? "" : "s"} · ${result.durationMs.toFixed(0)} ms`, "sql");
      } catch (error) {
        addLog("error", error instanceof Error ? error.message : String(error), "sql");
        addToast("SQL execution failed.", "error");
      }
    },
    [active, activeLanguage, addLog, addToast, openFile, project.activeFileId, project.files, setBottomOpen, setBottomTab, setPreviewOpen, setSqlResult],
  );

  const runMarkdown = useCallback(
    async (file: ProjectFile) => {
      setBuildStatus("building");
      setPreviewOpen(true);
      setPreviewTab("preview");
      try {
        const { marked } = await import("marked");
        const body = await marked.parse(file.content ?? "");
        const dark = settings.theme === "dark";
        const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  :root { color-scheme: ${dark ? "dark" : "light"}; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 42px clamp(20px, 6vw, 64px) 80px; font-family: "Inter", ui-sans-serif, system-ui, sans-serif; background: ${dark ? "#0a0e16" : "#ffffff"}; color: ${dark ? "#d7e0ed" : "#283449"}; line-height: 1.7; }
  article { max-width: 760px; margin: 0 auto; }
  h1,h2,h3,h4 { color: ${dark ? "#f2f6fb" : "#131823"}; line-height: 1.25; letter-spacing: -0.025em; margin-top: 1.8em; }
  h1 { font-size: 2.1em; margin-top: 0; border-bottom: 1px solid ${dark ? "#ffffff14" : "#e7ebf1"}; padding-bottom: .35em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid ${dark ? "#ffffff0d" : "#eef1f5"}; padding-bottom: .25em; }
  a { color: ${dark ? "#7cf6c8" : "#078a66"}; text-decoration: none; }
  a:hover { text-decoration: underline; }
  code { font-family: "JetBrains Mono", monospace; font-size: .85em; background: ${dark ? "#ffffff0d" : "#f3f5f8"}; border: 1px solid ${dark ? "#ffffff12" : "#e6eaf0"}; border-radius: 5px; padding: .15em .35em; color: ${dark ? "#a5e8b8" : "#0b7d52"}; }
  pre { background: ${dark ? "#101623" : "#f7f9fb"}; border: 1px solid ${dark ? "#ffffff12" : "#e6eaf0"}; border-radius: 10px; padding: 16px; overflow: auto; }
  pre code { background: none; border: 0; padding: 0; color: inherit; }
  blockquote { margin: 1.2em 0; padding: .2em 1em; border-left: 3px solid ${dark ? "#7cf6c855" : "#0c9d7755"}; color: ${dark ? "#9aa7bb" : "#667085"}; background: ${dark ? "#ffffff05" : "#f8fafc"}; border-radius: 0 8px 8px 0; }
  table { width: 100%; border-collapse: collapse; margin: 1.4em 0; font-size: .9em; }
  th,td { border: 1px solid ${dark ? "#ffffff14" : "#e4e9f0"}; padding: 8px 11px; text-align: left; }
  th { background: ${dark ? "#ffffff07" : "#f6f8fb"}; }
  img { max-width: 100%; border-radius: 8px; }
  hr { border: 0; border-top: 1px solid ${dark ? "#ffffff14" : "#e7ebf1"}; margin: 2em 0; }
  ul,ol { padding-left: 1.5em; }
  li { margin: .35em 0; }
</style></head><body><article>${body}</article></body></html>`;
        setPreviewHtml(html);
        setPreviewKind("markdown");
        setPreviewError(null);
        setPreviewWarnings([]);
        setBuildStatus("ready");
        lastBuildRef.current = null;
        addLog("system", `◇ rendered ${file.path}`, "javascript");
      } catch (error) {
        setBuildStatus("error");
        setPreviewError(error instanceof Error ? error.message : String(error));
        setPreviewKind("markdown");
      }
    },
    [addLog, setBuildStatus, setPreviewOpen, setPreviewTab, settings.theme],
  );

  const runJson = useCallback(
    (file: ProjectFile) => {
      setPreviewOpen(true);
      setPreviewTab("preview");
      try {
        const parsed = JSON.parse(file.content ?? "");
        const pretty = JSON.stringify(parsed, null, 2);
        const dark = settings.theme === "dark";
        setPreviewHtml(`<!doctype html><html><head><meta charset="utf-8"><style>
          body{margin:0;background:${dark ? "#0a0e16" : "#fff"};color:${dark ? "#c9d4e6" : "#283449"};font-family:"JetBrains Mono",monospace;font-size:13px;line-height:1.65;padding:28px;}
          pre{margin:0;white-space:pre-wrap;word-break:break-word;}
          .key{color:${dark ? "#7aa2ff" : "#245fcf"}} .string{color:${dark ? "#a5e8b8" : "#0b7d52"}} .number{color:${dark ? "#ffcb8b" : "#b25e09"}} .bool{color:${dark ? "#c792ea" : "#8b3ecf"}}
        </style></head><body><pre>${escapeHtml(pretty)}</pre></body></html>`);
        setPreviewKind("json");
        setPreviewError(null);
        setPreviewWarnings([]);
        setBuildStatus("ready");
        lastBuildRef.current = null;
        addLog("system", `◇ validated ${file.path}`, "javascript");
      } catch (error) {
        setPreviewError(error instanceof Error ? error.message : String(error));
        setPreviewKind("json");
        setBuildStatus("error");
        setPreviewOpen(true);
        addToast("Invalid JSON.", "error");
      }
    },
    [addLog, addToast, setBuildStatus, setPreviewOpen, setPreviewTab, settings.theme],
  );

  const runProject = useCallback(() => {
    if (activeLanguage?.id === "python") {
      runPython();
      return;
    }
    if (activeLanguage?.id === "sql") {
      void runSqlFile();
      return;
    }
    if (activeLanguage?.id === "markdown" && active) {
      void runMarkdown(active);
      return;
    }
    if (activeLanguage?.id === "json" && active) {
      runJson(active);
      return;
    }
    const entry =
      project.entryPath && getLanguage(project.entryPath).runtime === "esbuild"
        ? project.entryPath
        : undefined;
    void buildPreview({ entry });
  }, [active, activeLanguage, buildPreview, project.entryPath, runJson, runMarkdown, runPython, runSqlFile]);

  const runCurrentFile = useCallback(() => {
    if (!active) {
      addToast("Open a file to run it.", "error");
      return;
    }
    if (activeLanguage?.runtime === "pyodide") {
      runPython(active.path);
      return;
    }
    if (activeLanguage?.runtime === "sqlite") {
      void runSqlFile(active.path);
      return;
    }
    if (activeLanguage?.runtime === "markdown") {
      void runMarkdown(active);
      return;
    }
    if (activeLanguage?.id === "json") {
      runJson(active);
      return;
    }
    if (activeLanguage?.id === "html") {
      void buildPreview({ htmlPath: active.path });
      return;
    }
    if (activeLanguage?.runtime === "esbuild") {
      void buildPreview({ entry: active.path });
      return;
    }
    if (activeLanguage?.id === "css") {
      void buildPreview({});
      return;
    }
    addToast("This file type cannot be executed directly. Try HTML, JS, TS, Python, SQL or Markdown.", "error");
  }, [active, activeLanguage, addToast, buildPreview, runJson, runMarkdown, runPython, runSqlFile]);

  const refreshPreview = useCallback(() => {
    if (lastBuildRef.current) {
      void buildPreview(lastBuildRef.current);
      return;
    }
    if (previewKind === "markdown" && active) {
      void runMarkdown(active);
      return;
    }
    runProject();
  }, [active, buildPreview, previewKind, runMarkdown, runProject]);

  useEffect(() => {
    if (!settings.livePreview || !previewOpen || previewKind !== "web" || !lastBuildRef.current) return;
    const timer = window.setTimeout(() => {
      void buildPreview(lastBuildRef.current!, true);
    }, 950);
    return () => window.clearTimeout(timer);
  }, [project.files, project.entryPath, settings.livePreview, previewOpen, previewKind, buildPreview]);

  const startDebug = useCallback(async () => {
    if (!active) {
      addToast("Open a JavaScript or TypeScript file to debug.", "error");
      return;
    }
    if (activeLanguage?.runtime !== "esbuild") {
      addToast("Stepping debug is available for JS and TS. Python streams output in the Output panel.", "error");
      return;
    }
    if (/^\s*(import|export)\s/m.test(active.content ?? "") || /\brequire\s*\(/.test(active.content ?? "")) {
      addToast("Debug runs the active file standalone. Move imports aside or use a standalone script.", "error");
      return;
    }
    setBottomOpen(true);
    setBottomTab("debug");
    setDebugStatus("starting");
    setDebugPaused(null);
    setDebugFile(active.path);
    addLog("system", `$ debug ${active.path}`, "javascript");
    try {
      const instrumented = await instrumentForDebug(active, breakpoints);
      const document = buildDebugDocument(instrumented.code, breakpoints, active.path);
      setDebugDoc(document);
      setDebugNonce((value) => value + 1);
      addLog("system", "Debugger attached. Paused at entry.", "javascript");
    } catch (error) {
      setDebugStatus("stopped");
      addToast(error instanceof Error ? error.message : "Could not start the debugger.", "error");
      addLog("error", error instanceof Error ? error.message : String(error), "javascript");
    }
  }, [active, activeLanguage, addLog, addToast, breakpoints, setBottomOpen, setBottomTab, setDebugFile, setDebugPaused, setDebugStatus]);

  const debugControl = useCallback(
    (action: "resume" | "step" | "stop" | "restart") => {
      if (action === "restart") {
        void startDebug();
        return;
      }
      if (action === "stop") {
        debugFrameRef.current?.contentWindow?.postMessage(
          { source: "nova-debug-control", action: "stop" },
          "*",
        );
        setDebugStatus("stopped");
        setDebugPaused(null);
        setDebugDoc("");
        addLog("system", "Debug session stopped.", "javascript");
        return;
      }
      debugFrameRef.current?.contentWindow?.postMessage(
        { source: "nova-debug-control", action },
        "*",
      );
      setDebugStatus("running");
      setDebugPaused(null);
    },
    [addLog, setDebugPaused, setDebugStatus, startDebug],
  );

  const stopAll = useCallback(() => {
    if (pythonStatus !== "idle") stopPython();
    if (debugStatus !== "idle") debugControl("stop");
    buildSequence.current += 1;
    setBuildStatus("idle");
    addLog("system", "Execution stopped.", "system");
  }, [addLog, debugControl, debugStatus, pythonStatus, setBuildStatus, stopPython]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as
        | { source?: string; type?: string; level?: string; text?: string; line?: number; reason?: string; frames?: Array<{ line: number; fn?: string }> }
        | undefined;
      if (!data?.source) return;
      if (data.source === "nova-preview") {
        if (data.type === "console" && data.text) {
          const level = data.level === "error" ? "error" : data.level === "warn" ? "warn" : data.level === "info" ? "info" : "log";
          addLog(level, data.text, "preview");
        }
        return;
      }
      if (data.source === "nova-debug") {
        if (data.type === "paused" && data.line) {
          setDebugStatus("paused");
          setDebugPaused({
            line: data.line,
            reason: (data.reason as "breakpoint" | "step" | "entry" | "exception") ?? "breakpoint",
            frames: (data.frames ?? [{ line: data.line }]).map((frame) => ({
              line: frame.line,
              fn: frame.fn,
            })),
          });
          setBottomOpen(true);
          setBottomTab("debug");
          addLog("system", `Paused at line ${data.line} (${data.reason ?? "breakpoint"})`, "javascript");
        } else if (data.type === "console" && data.text) {
          const level = data.level === "error" ? "error" : data.level === "warn" ? "warn" : data.level === "info" ? "info" : "log";
          addLog(level, data.text, "javascript");
        } else if (data.type === "runtime-error" && data.text) {
          addLog("error", data.text, "javascript");
          setDebugStatus("stopped");
          setDebugPaused(null);
        } else if (data.type === "stopped" || data.type === "exited") {
          setDebugStatus("stopped");
          setDebugPaused(null);
          addLog("system", data.type === "exited" ? "Debug program finished." : "Debug session stopped.", "javascript");
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [addLog, setBottomOpen, setBottomTab, setDebugPaused, setDebugStatus]);

  const toggleTheme = useCallback(() => {
    updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" });
  }, [settings.theme, updateSettings]);

  const openSidebarView = useCallback(
    (view: typeof sidebarView) => {
      if (sidebarOpen && sidebarView === view) setSidebarOpen(false);
      else setSidebarView(view);
    },
    [setSidebarOpen, setSidebarView, sidebarOpen, sidebarView],
  );

  const promptGoToLine = useCallback(() => {
    setPromptState({
      title: "Go to line",
      subtitle: "Jump to a line in the active editor.",
      label: "Line number",
      placeholder: "1",
      inputMode: "numeric",
      confirmLabel: "Go",
      onSubmit: (value) => {
        const line = Number.parseInt(value, 10);
        if (Number.isFinite(line) && line > 0) editorRef.current?.reveal(line);
      },
    });
  }, []);

  const exportProject = useCallback(() => {
    void onExportProject(project);
  }, [onExportProject, project]);

  const triggerImport = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const commands = useMemo<PaletteCommand[]>(() => {
    return [
      { id: "file.new", title: "New file", detail: "Create a file in the workspace", category: "File", shortcut: ["⌘", "N"], icon: <FilePlus2 size={13} />, run: () => promptNewFile() },
      { id: "file.folder", title: "New folder", category: "File", shortcut: ["⇧", "⌘", "N"], icon: <FolderPlus size={13} />, run: () => promptNewFolder() },
      { id: "file.save", title: "Save workspace", category: "File", shortcut: ["⌘", "S"], icon: <Download size={13} />, run: () => void onSaveNow() },
      { id: "file.closeAll", title: "Close all tabs", category: "File", icon: <X size={13} />, run: closeAllFiles },
      { id: "file.export", title: "Export workspace ZIP", category: "File", shortcut: ["⇧", "⌘", "E"], icon: <Download size={13} />, run: exportProject },
      { id: "file.import", title: "Import workspace", category: "File", icon: <Upload size={13} />, run: triggerImport },
      { id: "file.checkpoint", title: "Create checkpoint", category: "File", shortcut: ["⌥", "⌘", "S"], icon: <CircleDot size={13} />, run: promptCheckpoint },
      { id: "file.renameWorkspace", title: "Rename workspace", category: "File", icon: <FilePlus2 size={13} />, run: promptRenameWorkspace },
      { id: "run.project", title: "Run project", detail: active?.path ? `Entry: ${project.entryPath ?? entryForProject(project.files) ?? "auto"}` : undefined, category: "Run", shortcut: ["⌘", "↵"], icon: <Play size={13} />, run: runProject },
      { id: "run.current", title: "Run current file", detail: active?.path, category: "Run", shortcut: ["⇧", "⌘", "↵"], icon: <Zap size={13} />, run: runCurrentFile },
      { id: "run.debug", title: "Debug current file", detail: active?.path, category: "Run", shortcut: ["⇧", "⌘", "D"], icon: <Bug size={13} />, run: () => void startDebug() },
      { id: "run.refresh", title: "Refresh preview", category: "Run", shortcut: ["⇧", "⌘", "R"], icon: <RefreshCw size={13} />, run: refreshPreview },
      { id: "view.explorer", title: "Show explorer", category: "View", icon: <ListTree size={13} />, run: () => setSidebarView("explorer") },
      { id: "view.search", title: "Search in files", category: "View", shortcut: ["⇧", "⌘", "F"], icon: <Search size={13} />, run: () => { setSidebarView("search"); setSearchNonce((value) => value + 1); } },
      { id: "view.checkpoints", title: "Show checkpoints", category: "View", icon: <CircleDot size={13} />, run: () => setSidebarView("checkpoints") },
      { id: "view.runtimes", title: "Show runtimes", category: "View", icon: <Sparkles size={13} />, run: () => setSidebarView("runtimes") },
      { id: "view.settings", title: "Open settings", category: "View", shortcut: ["⌘", ","], icon: <Settings size={13} />, run: () => setSidebarView("settings") },
      { id: "view.terminal", title: "Toggle terminal", category: "View", shortcut: ["⌘", "J"], icon: <Terminal size={13} />, run: () => { setBottomOpen(!bottomOpen); setBottomTab("terminal"); } },
      { id: "view.preview", title: "Toggle preview", category: "View", shortcut: ["⇧", "⌘", "V"], icon: <LayoutPanelLeft size={13} />, run: () => setPreviewOpen(!previewOpen) },
      { id: "view.sidebar", title: "Toggle sidebar", category: "View", shortcut: ["⌘", "B"], icon: <PanelBottom size={13} />, run: toggleSidebar },
      { id: "view.theme", title: settings.theme === "dark" ? "Switch to light theme" : "Switch to dark theme", category: "View", icon: settings.theme === "dark" ? <Sun size={13} /> : <Moon size={13} />, run: toggleTheme },
      { id: "view.problems", title: "Focus problems", category: "View", icon: <Bug size={13} />, run: () => { setBottomOpen(true); setBottomTab("problems"); } },
      { id: "nav.line", title: "Go to line…", category: "Navigation", shortcut: ["⌘", "G"], icon: <ArrowRight size={13} />, run: promptGoToLine },
      { id: "nav.quick", title: "Quick open file…", category: "Navigation", shortcut: ["⌘", "P"], icon: <FilePlus2 size={13} />, run: showQuickOpen },
      { id: "help.shortcuts", title: "Keyboard shortcuts", category: "Help", shortcut: ["⌘", "K"], icon: <Keyboard size={13} />, run: onShowShortcuts },
      { id: "help.home", title: "Back to dashboard", category: "Help", icon: <ChevronRight size={13} />, run: onOpenHome },
    ];
  }, [
    active,
    bottomOpen,
    closeAllFiles,
    exportProject,
    onOpenHome,
    onSaveNow,
    onShowShortcuts,
    previewOpen,
    project.entryPath,
    project.files,
    promptCheckpoint,
    promptGoToLine,
    promptNewFile,
    promptNewFolder,
    promptRenameWorkspace,
    refreshPreview,
    runCurrentFile,
    runProject,
    setBottomOpen,
    setBottomTab,
    setPreviewOpen,
    setSidebarView,
    settings.theme,
    showQuickOpen,
    startDebug,
    toggleSidebar,
    toggleTheme,
    triggerImport,
  ]);

  const keyboardRef = useRef<(event: KeyboardEvent) => void>(() => undefined);
  keyboardRef.current = (event: KeyboardEvent) => {
    const meta = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    if (meta && event.shiftKey && key === "p") {
      event.preventDefault();
      showCommandPalette();
      return;
    }
    if (meta && !event.shiftKey && key === "p") {
      event.preventDefault();
      showQuickOpen();
      return;
    }
    if (meta && key === "s") {
      event.preventDefault();
      if (event.altKey) promptCheckpoint();
      else void onSaveNow();
      return;
    }
    if (meta && key === "b") {
      event.preventDefault();
      toggleSidebar();
      return;
    }
    if (meta && (key === "j" || event.code === "Backquote")) {
      event.preventDefault();
      setBottomOpen(!bottomOpen);
      setBottomTab("terminal");
      return;
    }
    if (meta && event.shiftKey && key === "f") {
      event.preventDefault();
      setSidebarView("search");
      setSearchNonce((value) => value + 1);
      return;
    }
    if (meta && event.shiftKey && key === "e") {
      event.preventDefault();
      exportProject();
      return;
    }
    if (meta && key === "enter") {
      event.preventDefault();
      if (event.shiftKey) runCurrentFile();
      else runProject();
      return;
    }
    if (meta && event.shiftKey && key === "d") {
      event.preventDefault();
      void startDebug();
      return;
    }
    if (meta && event.shiftKey && key === "v") {
      event.preventDefault();
      setPreviewOpen(!previewOpen);
      return;
    }
    if (meta && event.shiftKey && key === "r") {
      event.preventDefault();
      refreshPreview();
      return;
    }
    if (meta && !event.shiftKey && key === "k") {
      event.preventDefault();
      onShowShortcuts();
      return;
    }
    if (meta && !event.shiftKey && key === "n") {
      event.preventDefault();
      promptNewFile();
      return;
    }
    if (meta && event.shiftKey && key === "n") {
      event.preventDefault();
      promptNewFolder();
      return;
    }
    if (meta && !event.shiftKey && key === "g") {
      event.preventDefault();
      promptGoToLine();
      return;
    }
    if (event.altKey && key === "w") {
      event.preventDefault();
      if (active) closeFile(active.id);
      return;
    }
    if (!meta && !event.altKey && key === "f5") {
      event.preventDefault();
      void startDebug();
    }
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => keyboardRef.current(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function onPanelResizeStart(event: React.MouseEvent) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = bottomHeight;
    const onMove = (moveEvent: MouseEvent) => {
      const next = startHeight + (startY - moveEvent.clientY);
      setBottomHeight(clamp(next, 130, window.innerHeight * 0.72));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = "row-resize";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onPreviewResizeStart(event: React.MouseEvent) {
    event.preventDefault();
    const row = editorRowRef.current;
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const onMove = (moveEvent: MouseEvent) => {
      const next = ((rect.right - moveEvent.clientX) / rect.width) * 100;
      setPreviewWidth(clamp(next, 26, 68));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const previewProps = {
    html: previewHtml,
    status: buildStatus,
    error: previewError,
    kind: previewKind,
    tab: previewTab,
    logs,
    appUrl,
    warnings: previewWarnings,
    onTab: setPreviewTab,
    onClose: () => setPreviewOpen(false),
    onRefresh: refreshPreview,
    onClearConsole: clearLogs,
  };

  return (
    <div className="ide">
      <TitleBar
        project={project}
        projects={projects}
        saveStatus={saveStatus}
        onCommand={showCommandPalette}
        onQuickOpen={showQuickOpen}
        onExit={onExit}
        onSwitchProject={(id) => void onSwitchProject(id)}
        onRun={runProject}
        onRunCurrent={runCurrentFile}
        onDebug={() => void startDebug()}
        onStop={stopAll}
        running={running}
        debugging={debugging}
        previewOpen={previewOpen}
        onTogglePreview={() => {
          const next = !previewOpen;
          setPreviewOpen(next);
          if (next && !previewHtml) runProject();
        }}
        onSave={() => void onSaveNow()}
        onExport={exportProject}
        onImport={triggerImport}
        onShowShortcuts={onShowShortcuts}
      />

      <div className={`workbench ${bottomMaximized ? "panel-maximized" : ""}`}>
        <div className="workbench-main">
          <ActivityBar
            view={sidebarView}
            open={sidebarOpen}
            problems={problems.length}
            theme={settings.theme}
            onView={openSidebarView}
            onHome={onExit}
            onShowShortcuts={onShowShortcuts}
            onToggleTheme={toggleTheme}
          />
          {sidebarOpen && (
            <>
              <Sidebar
                view={sidebarView}
                project={project}
                settings={settings}
                onSettings={updateSettings}
                onSelectFile={openFile}
                onNewFile={promptNewFile}
                onNewFolder={promptNewFolder}
                onRename={promptRename}
                onDelete={promptDelete}
                onDuplicate={promptDuplicate}
                onSetEntry={(file) => {
                  setEntryPath(file.path);
                  addToast(`${file.path} is now the entry point.`, "success");
                }}
                onOpenAt={openAt}
                searchFocusNonce={searchNonce}
                snapshots={snapshots}
                onCreateCheckpoint={promptCheckpoint}
                onRestoreSnapshot={restoreSnapshot}
                onDeleteSnapshot={removeSnapshot}
                onExport={exportProject}
                onImport={triggerImport}
                onShowShortcuts={onShowShortcuts}
                onClose={() => setSidebarOpen(false)}
              />
              <div className="sidebar-resizer" />
            </>
          )}

          <div className="content-column">
            <div className={`editor-row ${previewOpen ? "with-preview" : ""}`} ref={editorRowRef}>
              <EditorArea
                project={project}
                settings={settings}
                editorRef={editorRef}
                revealRequest={revealRequest}
                debugLine={debugLine}
                debugActive={debugging || debugStatus === "stopped"}
                debugStatus={debugStatus}
                debugPausedLine={debugPaused?.line ?? null}
                breakpoints={breakpoints}
                cursor={cursor}
                onCursor={setCursor}
                onSelectFile={openFile}
                onCloseFile={closeFile}
                onCloseAll={closeAllFiles}
                onChange={updateFile}
                onToggleBreakpoint={toggleBreakpoint}
                onProblems={(items) => setProblems(items)}
                onNewFile={() => promptNewFile()}
                onQuickOpen={showQuickOpen}
                onFormat={() => editorRef.current?.format()}
                onRun={runCurrentFile}
                onDebugContinue={() => debugControl("resume")}
                onDebugStep={() => debugControl("step")}
                onDebugStop={() => debugControl("stop")}
                onDebugRestart={() => void startDebug()}
              />
              {previewOpen && (
                <>
                  <div className="preview-resizer" onMouseDown={onPreviewResizeStart} />
                  <div className="preview-wrap" style={{ width: `${previewWidth}%` }}>
                    <PreviewPane {...previewProps} />
                  </div>
                </>
              )}
            </div>

            {bottomOpen && (
              <div
                className="bottom-wrap"
                style={bottomMaximized ? { flex: 1 } : { height: bottomHeight }}
              >
                <button className="panel-resizer" onMouseDown={onPanelResizeStart} aria-label="Resize panel" />
                <BottomPanel
                  tab={bottomTab}
                  maximized={bottomMaximized}
                  logs={logs}
                  problems={problems}
                  sqlResult={sqlResult}
                  debugStatus={debugStatus}
                  debugPause={debugPaused}
                  debugFile={debugFile}
                  terminalProps={{
                    onRunProject: runProject,
                    onRunFile: (path) => {
                      if (path) {
                        const file = project.files.find((item) => item.path === path);
                        if (file) {
                          openAt(file.id, 1, 1);
                          if (getLanguage(file.path).runtime === "pyodide") runPython(file.path);
                          else if (getLanguage(file.path).runtime === "sqlite") void runSqlFile(file.path);
                          else if (getLanguage(file.path).id === "markdown") void runMarkdown(file);
                          else if (getLanguage(file.path).id === "html") void buildPreview({ htmlPath: file.path });
                          else void buildPreview({ entry: file.path });
                        } else {
                          addToast(`No such file: ${path}`, "error");
                        }
                      } else {
                        runProject();
                      }
                    },
                    onRunPython: runPython,
                    onRunSql: (path) => void runSqlFile(path),
                    onInstallPython: installPython,
                    onExport: exportProject,
                    onShowShortcuts: onShowShortcuts,
                    onOpenHome: onOpenHome,
                  }}
                  onTab={(tab) => {
                    setBottomOpen(true);
                    setBottomTab(tab);
                  }}
                  onClose={() => setBottomOpen(false)}
                  onToggleMaximize={() => setBottomMaximized((value) => !value)}
                  onClearLogs={clearLogs}
                  onOpenAt={openAt}
                  onDebugContinue={() => debugControl("resume")}
                  onDebugStep={() => debugControl("step")}
                  onDebugStop={() => debugControl("stop")}
                  onDebugRestart={() => void startDebug()}
                />
              </div>
            )}
          </div>
        </div>

        <StatusBar
          project={project}
          settings={settings}
          cursor={cursor}
          problems={problemTotals}
          saveStatus={saveStatus}
          pythonStatus={pythonStatus}
          buildStatus={buildStatus}
          onProblems={() => {
            setBottomOpen(true);
            setBottomTab("problems");
          }}
          onGoToLine={promptGoToLine}
          onToggleTheme={toggleTheme}
        />
      </div>

      <CommandPalette
        open={paletteOpen}
        mode={paletteMode}
        commands={commands}
        files={project.files}
        onClose={() => setPaletteOpen(false)}
        onFile={openFile}
      />

      <PromptDialog
        open={Boolean(promptState)}
        title={promptState?.title ?? ""}
        subtitle={promptState?.subtitle}
        label={promptState?.label ?? ""}
        placeholder={promptState?.placeholder}
        initialValue={promptState?.initialValue}
        confirmLabel={promptState?.confirmLabel}
        multiline={promptState?.multiline}
        inputMode={promptState?.inputMode}
        onClose={() => setPromptState(null)}
        onSubmit={(value) => {
          const handler = promptState?.onSubmit;
          setPromptState(null);
          handler?.(value);
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ""}
        text={confirmState?.text ?? ""}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
          const handler = confirmState?.onConfirm;
          setConfirmState(null);
          handler?.();
        }}
      />

      <input
        ref={importInputRef}
        type="file"
        accept=".json,.zip,application/json,application/zip"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onImportProject(file);
          event.target.value = "";
        }}
      />

      {debugDoc && (
        <iframe
          key={debugNonce}
          ref={debugFrameRef}
          title="Nova debug runtime"
          srcDoc={debugDoc}
          sandbox="allow-scripts"
          className="debug-runtime-frame"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
    </div>
  );
}
