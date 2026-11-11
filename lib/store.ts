"use client";

import { create } from "zustand";
import type { SqlRunResult } from "./sql";
import type {
  BottomTab,
  DebugPause,
  LogLevel,
  LogLine,
  Project,
  ProjectFile,
  RuntimeState,
  Settings,
  SidebarView,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";
import {
  basename,
  dirname,
  ensureUniquePath,
  isDescendantPath,
  joinPath,
  makeId,
  normalizePath,
} from "./utils";

export interface Problem {
  fileId: string;
  path: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface Toast {
  id: string;
  message: string;
  tone: "default" | "success" | "error";
}

export type DebugStatus = "idle" | "starting" | "running" | "paused" | "stopped";

interface IDEStore {
  hydrated: boolean;
  project: Project | null;
  settings: Settings;
  sidebarView: SidebarView;
  sidebarOpen: boolean;
  bottomOpen: boolean;
  bottomTab: BottomTab;
  previewOpen: boolean;
  previewTab: "preview" | "console";
  logs: LogLine[];
  problems: Problem[];
  toasts: Toast[];
  pythonStatus: RuntimeState;
  buildStatus: RuntimeState;
  debugStatus: DebugStatus;
  debugFile: string | null;
  debugPaused: DebugPause | null;
  breakpoints: Record<string, number[]>;
  terminalSeed: string | null;
  sqlResult: SqlRunResult | null;

  hydrate: (project: Project | null, settings: Settings) => void;
  setProject: (project: Project | null) => void;
  setProjectName: (name: string) => void;
  setSettings: (settings: Settings) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setSidebarView: (view: SidebarView) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setBottomOpen: (open: boolean) => void;
  setBottomTab: (tab: BottomTab) => void;
  setPreviewOpen: (open: boolean) => void;
  setPreviewTab: (tab: "preview" | "console") => void;
  openFile: (id: string) => void;
  closeFile: (id: string) => void;
  closeAllFiles: () => void;
  setActiveFile: (id: string | null) => void;
  updateFile: (id: string, content: string) => void;
  createFile: (path: string, content?: string, open?: boolean) => ProjectFile | null;
  createFolder: (path: string) => void;
  renameNode: (id: string, newName: string) => void;
  deleteNode: (id: string) => void;
  renamePath: (path: string, newName: string) => void;
  deletePath: (path: string) => void;
  duplicateNode: (id: string) => void;
  replaceFiles: (files: ProjectFile[]) => void;
  setEntryPath: (path: string) => void;
  addLog: (level: LogLevel, text: string, source?: LogLine["source"]) => void;
  clearLogs: () => void;
  setProblems: (problems: Problem[]) => void;
  addToast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
  setPythonStatus: (status: RuntimeState) => void;
  setBuildStatus: (status: RuntimeState) => void;
  setDebugStatus: (status: DebugStatus) => void;
  setDebugFile: (path: string | null) => void;
  setDebugPaused: (pause: DebugPause | null) => void;
  toggleBreakpoint: (path: string, line: number) => void;
  clearBreakpoints: (path?: string) => void;
  setTerminalSeed: (command: string | null) => void;
  setSqlResult: (result: SqlRunResult | null) => void;
}

function touch(project: Project): Project {
  return { ...project, updatedAt: Date.now() };
}

function withOpen(project: Project, id: string): Project {
  const openFiles = project.openFiles.includes(id) ? project.openFiles : [...project.openFiles, id];
  return touch({ ...project, openFiles, activeFileId: id });
}

function sanitizeName(name: string): string {
  return name.replaceAll("/", "-").replaceAll("\\", "-").trim();
}

export const useIDE = create<IDEStore>((set, get) => ({
  hydrated: false,
  project: null,
  settings: DEFAULT_SETTINGS,
  sidebarView: "explorer",
  sidebarOpen: true,
  bottomOpen: false,
  bottomTab: "terminal",
  previewOpen: true,
  previewTab: "preview",
  logs: [],
  problems: [],
  toasts: [],
  pythonStatus: "idle",
  buildStatus: "idle",
  debugStatus: "idle",
  debugFile: null,
  debugPaused: null,
  breakpoints: {},
  terminalSeed: null,
  sqlResult: null,

  hydrate: (project, settings) => {
    set({
      project,
      settings,
      hydrated: true,
      sidebarView: "explorer",
      previewOpen: true,
      previewTab: "preview",
      logs: [],
      problems: [],
      debugStatus: "idle",
      debugPaused: null,
      debugFile: null,
      breakpoints: {},
      sqlResult: null,
    });
  },

  setProject: (project) => {
    if (project) {
      let next = project;
      if (next.files.length > 0) {
        const valid = next.openFiles.filter((id) =>
          next.files.some((file) => file.id === id && file.kind === "file"),
        );
        const active = next.files.find((file) => file.id === next.activeFileId);
        if (!active || active.kind !== "file") {
          const fallback =
            next.files.find((file) => file.path === "README.md" && file.kind === "file") ??
            next.files.find((file) => file.kind === "file");
          next = {
            ...next,
            openFiles: valid.length > 0 ? valid : fallback ? [fallback.id] : [],
            activeFileId: fallback?.id ?? null,
          };
        } else {
          next = { ...next, openFiles: valid };
        }
      }
      set({
        project: next,
        problems: [],
        debugStatus: "idle",
        debugPaused: null,
        debugFile: null,
        breakpoints: {},
      });
    } else {
      set({ project: null, problems: [] });
    }
  },

  setProjectName: (name) => {
    const project = get().project;
    if (!project) return;
    set({ project: touch({ ...project, name: name.trim().slice(0, 80) || project.name }) });
  },

  setSettings: (settings) => set({ settings }),
  updateSettings: (patch) =>
    set((state) => ({ settings: { ...state.settings, ...patch } })),

  setSidebarView: (view) => set({ sidebarView: view, sidebarOpen: true }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setBottomOpen: (open) => set({ bottomOpen: open }),
  setBottomTab: (tab) => set({ bottomTab: tab, bottomOpen: true }),
  setPreviewOpen: (open) => set({ previewOpen: open }),
  setPreviewTab: (tab) => set({ previewTab: tab, previewOpen: true }),

  openFile: (id) => {
    const project = get().project;
    if (!project) return;
    const file = project.files.find((item) => item.id === id);
    if (!file || file.kind !== "file") return;
    set({ project: withOpen(project, id) });
  },

  closeFile: (id) => {
    const project = get().project;
    if (!project) return;
    const index = project.openFiles.indexOf(id);
    const openFiles = project.openFiles.filter((fileId) => fileId !== id);
    let activeFileId = project.activeFileId;
    if (activeFileId === id) {
      activeFileId = openFiles[Math.max(0, index - 1)] ?? openFiles[0] ?? null;
    }
    set({ project: touch({ ...project, openFiles, activeFileId }) });
  },

  closeAllFiles: () => {
    const project = get().project;
    if (!project) return;
    set({ project: touch({ ...project, openFiles: [], activeFileId: null }) });
  },

  setActiveFile: (id) => {
    const project = get().project;
    if (!project) return;
    if (id === null) {
      set({ project: touch({ ...project, activeFileId: null }) });
      return;
    }
    const file = project.files.find((item) => item.id === id);
    if (!file || file.kind !== "file") return;
    set({ project: withOpen(project, id) });
  },

  updateFile: (id, content) => {
    const project = get().project;
    if (!project) return;
    const files = project.files.map((file) =>
      file.id === id && file.kind === "file" ? { ...file, content } : file,
    );
    set({ project: touch({ ...project, files }) });
  },

  createFile: (path, content = "", open = true) => {
    const project = get().project;
    if (!project) return null;
    const clean = ensureUniquePath(project.files, normalizePath(path), "file");
    if (!clean) return null;
    const file: ProjectFile = {
      id: makeId(),
      path: clean,
      kind: "file",
      content,
    };
    const files = [...project.files, file];
    let next: Project = touch({
      ...project,
      files,
      entryPath: project.entryPath ?? clean,
    });
    if (open) {
      next = withOpen(next, file.id);
    }
    set({ project: next });
    return file;
  },

  createFolder: (path) => {
    const project = get().project;
    if (!project) return;
    const clean = ensureUniquePath(project.files, normalizePath(path), "folder");
    if (!clean) return;
    const folder: ProjectFile = { id: makeId(), path: clean, kind: "folder" };
    set({
      project: touch({
        ...project,
        files: [...project.files, folder],
      }),
    });
  },

  renameNode: (id, newName) => {
    const project = get().project;
    if (!project) return;
    const node = project.files.find((file) => file.id === id);
    if (!node) return;
    const safe = sanitizeName(newName);
    if (!safe || safe === "." || safe === "..") return;
    const parent = dirname(node.path);
    const desired = joinPath(parent, safe);
    const taken = project.files.some(
      (file) => file.id !== id && file.path.toLowerCase() === desired.toLowerCase(),
    );
    if (taken) {
      get().addToast("A file or folder with that name already exists.", "error");
      return;
    }
    const oldPath = node.path;
    const files = project.files.map((file) => {
      if (file.id === id) return { ...file, path: desired };
      if (node.kind === "folder" && isDescendantPath(file.path, oldPath)) {
        return { ...file, path: joinPath(desired, file.path.slice(oldPath.length + 1)) };
      }
      return file;
    });
    const entryPath =
      project.entryPath && isDescendantPath(project.entryPath, oldPath)
        ? joinPath(desired, project.entryPath.slice(oldPath.length + 1))
        : project.entryPath;
    set({ project: touch({ ...project, files, entryPath }) });
  },

  deleteNode: (id) => {
    const project = get().project;
    if (!project) return;
    const node = project.files.find((file) => file.id === id);
    if (!node) return;
    const removedIds = new Set(
      project.files
        .filter((file) => file.id === id || (node.kind === "folder" && isDescendantPath(file.path, node.path)))
        .map((file) => file.id),
    );
    const files = project.files.filter((file) => !removedIds.has(file.id));
    const openFiles = project.openFiles.filter((fileId) => !removedIds.has(fileId));
    let activeFileId = project.activeFileId;
    if (activeFileId && removedIds.has(activeFileId)) {
      activeFileId = openFiles[0] ?? null;
    }
    set({
      project: touch({
        ...project,
        files,
        openFiles,
        activeFileId,
        entryPath: project.entryPath && isDescendantPath(project.entryPath, node.path) ? undefined : project.entryPath,
      }),
      problems: get().problems.filter((problem) => !removedIds.has(problem.fileId)),
    });
  },

  renamePath: (path, newName) => {
    const project = get().project;
    if (!project) return;
    const clean = normalizePath(path);
    const explicit = project.files.find((file) => file.path === clean);
    if (explicit) {
      get().renameNode(explicit.id, newName);
      return;
    }
    const safe = sanitizeName(newName);
    if (!safe || safe === "." || safe === "..") return;
    const parent = dirname(clean);
    const desired = joinPath(parent, safe);
    if (project.files.some((file) => file.path.toLowerCase() === desired.toLowerCase())) {
      get().addToast("A file or folder with that name already exists.", "error");
      return;
    }
    const files = project.files.map((file) =>
      isDescendantPath(file.path, clean)
        ? { ...file, path: joinPath(desired, file.path.slice(clean.length + 1)) }
        : file,
    );
    const entryPath =
      project.entryPath && isDescendantPath(project.entryPath, clean)
        ? joinPath(desired, project.entryPath.slice(clean.length + 1))
        : project.entryPath;
    set({ project: touch({ ...project, files, entryPath }) });
  },

  deletePath: (path) => {
    const project = get().project;
    if (!project) return;
    const clean = normalizePath(path);
    const explicit = project.files.find((file) => file.path === clean);
    if (explicit) {
      get().deleteNode(explicit.id);
      return;
    }
    const removed = project.files.filter((file) => isDescendantPath(file.path, clean));
    if (removed.length === 0) return;
    const removedIds = new Set(removed.map((file) => file.id));
    const files = project.files.filter((file) => !removedIds.has(file.id));
    const openFiles = project.openFiles.filter((id) => !removedIds.has(id));
    const activeFileId =
      project.activeFileId && removedIds.has(project.activeFileId)
        ? openFiles[0] ?? null
        : project.activeFileId;
    set({
      project: touch({
        ...project,
        files,
        openFiles,
        activeFileId,
        entryPath: project.entryPath && isDescendantPath(project.entryPath, clean) ? undefined : project.entryPath,
      }),
      problems: get().problems.filter((problem) => !removedIds.has(problem.fileId)),
    });
  },

  duplicateNode: (id) => {
    const project = get().project;
    if (!project) return;
    const node = project.files.find((file) => file.id === id);
    if (!node || node.kind !== "file") return;
    const ext = node.path.slice(node.path.lastIndexOf("."));
    const stem = ext ? node.path.slice(0, -ext.length) : node.path;
    const path = ensureUniquePath(project.files, `${stem}-copy${ext}`, "file");
    const file: ProjectFile = {
      id: makeId(),
      path,
      kind: "file",
      content: node.content ?? "",
    };
    set({
      project: withOpen(touch({ ...project, files: [...project.files, file] }), file.id),
    });
  },

  replaceFiles: (files) => {
    const project = get().project;
    if (!project) return;
    const valid = new Set(files.filter((file) => file.kind === "file").map((file) => file.id));
    const openFiles = project.openFiles.filter((id) => valid.has(id));
    const activeFileId =
      project.activeFileId && valid.has(project.activeFileId)
        ? project.activeFileId
        : openFiles[0] ?? null;
    set({
      project: touch({ ...project, files: structuredClone(files), openFiles, activeFileId }),
      problems: [],
    });
  },

  setEntryPath: (path) => {
    const project = get().project;
    if (!project) return;
    set({ project: touch({ ...project, entryPath: normalizePath(path) }) });
  },

  addLog: (level, text, source = "system") => {
    const line: LogLine = {
      id: makeId(),
      level,
      text,
      time: Date.now(),
      source,
    };
    set((state) => ({ logs: [...state.logs.slice(-499), line] }));
  },

  clearLogs: () => set({ logs: [] }),

  setProblems: (problems) => set({ problems }),

  addToast: (message, tone = "default") => {
    const id = makeId();
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, 3600);
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  setPythonStatus: (status) => set({ pythonStatus: status }),
  setBuildStatus: (status) => set({ buildStatus: status }),
  setDebugStatus: (status) => set({ debugStatus: status }),
  setDebugFile: (path) => set({ debugFile: path }),
  setDebugPaused: (pause) => set({ debugPaused: pause }),

  toggleBreakpoint: (path, line) => {
    set((state) => {
      const current = new Set(state.breakpoints[path] ?? []);
      if (current.has(line)) current.delete(line);
      else current.add(line);
      return {
        breakpoints: {
          ...state.breakpoints,
          [path]: [...current].sort((a, b) => a - b),
        },
      };
    });
  },

  clearBreakpoints: (path) => {
    if (!path) {
      set({ breakpoints: {} });
      return;
    }
    set((state) => ({ breakpoints: { ...state.breakpoints, [path]: [] } }));
  },

  setTerminalSeed: (command) => set({ terminalSeed: command }),
  setSqlResult: (result) => set({ sqlResult: result }),
}));

export function projectFileById(project: Project | null, id: string | null): ProjectFile | null {
  if (!project || !id) return null;
  return project.files.find((file) => file.id === id) ?? null;
}

export function activeFile(project: Project | null): ProjectFile | null {
  return projectFileById(project, project?.activeFileId ?? null);
}

export function pathForFile(project: Project | null, id: string): string {
  return project?.files.find((file) => file.id === id)?.path ?? basename(id);
}
