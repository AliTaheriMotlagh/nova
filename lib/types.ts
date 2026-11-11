export type FileKind = "file" | "folder";

export interface ProjectFile {
  id: string;
  path: string;
  kind: FileKind;
  content?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  template: string;
  files: ProjectFile[];
  entryPath?: string;
  openFiles: string[];
  activeFileId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Snapshot {
  id: string;
  projectId: string;
  message: string;
  files: ProjectFile[];
  createdAt: number;
}

export interface Settings {
  theme: "dark" | "light";
  fontSize: number;
  tabSize: number;
  wordWrap: "on" | "off";
  minimap: boolean;
  autoSave: boolean;
  livePreview: boolean;
  fontLigatures: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  fontSize: 13,
  tabSize: 2,
  wordWrap: "off",
  minimap: true,
  autoSave: true,
  livePreview: true,
  fontLigatures: true,
};

export type SidebarView =
  | "explorer"
  | "search"
  | "checkpoints"
  | "runtimes"
  | "settings";

export type BottomTab = "terminal" | "output" | "problems" | "debug";

export type LogLevel = "log" | "info" | "warn" | "error" | "system";

export interface LogLine {
  id: string;
  level: LogLevel;
  text: string;
  time: number;
  source?: "preview" | "python" | "javascript" | "terminal" | "sql" | "system";
}

export type RuntimeState = "idle" | "loading" | "building" | "running" | "ready" | "error";

export interface BuildResult {
  html: string;
  entry: string;
  css: string;
  js: string;
  warnings: string[];
  externalPackages: string[];
}

export interface DebugFrame {
  line: number;
  column?: number;
  fn?: string;
}

export interface DebugPause {
  line: number;
  reason: "breakpoint" | "step" | "entry" | "exception";
  frames: DebugFrame[];
}

export interface ViewportSize {
  name: "desktop" | "tablet" | "mobile";
  width: number | null;
  label: string;
}
