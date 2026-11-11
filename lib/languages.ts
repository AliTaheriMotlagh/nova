import type { ProjectFile } from "./types";
import { basename, dirname, normalizePath } from "./utils";

export interface LanguageMeta {
  id: string;
  label: string;
  short: string;
  color: string;
  runtime: "esbuild" | "pyodide" | "browser" | "sqlite" | "markdown" | "none";
  canRun: boolean;
  canDebug: boolean;
}

const LANGUAGE_MAP: Record<string, LanguageMeta> = {
  ".js": { id: "javascript", label: "JavaScript", short: "JS", color: "#f7df1e", runtime: "esbuild", canRun: true, canDebug: true },
  ".mjs": { id: "javascript", label: "JavaScript", short: "JS", color: "#f7df1e", runtime: "esbuild", canRun: true, canDebug: true },
  ".cjs": { id: "javascript", label: "JavaScript", short: "JS", color: "#f7df1e", runtime: "esbuild", canRun: true, canDebug: true },
  ".jsx": { id: "javascript", label: "JavaScript React", short: "JSX", color: "#61dafb", runtime: "esbuild", canRun: true, canDebug: true },
  ".ts": { id: "typescript", label: "TypeScript", short: "TS", color: "#3178c6", runtime: "esbuild", canRun: true, canDebug: true },
  ".tsx": { id: "typescript", label: "TypeScript React", short: "TSX", color: "#3178c6", runtime: "esbuild", canRun: true, canDebug: true },
  ".py": { id: "python", label: "Python", short: "PY", color: "#ffd845", runtime: "pyodide", canRun: true, canDebug: false },
  ".html": { id: "html", label: "HTML", short: "HTML", color: "#e34f26", runtime: "browser", canRun: true, canDebug: false },
  ".htm": { id: "html", label: "HTML", short: "HTML", color: "#e34f26", runtime: "browser", canRun: true, canDebug: false },
  ".css": { id: "css", label: "CSS", short: "CSS", color: "#42a5f5", runtime: "browser", canRun: true, canDebug: false },
  ".scss": { id: "scss", label: "SCSS", short: "SCSS", color: "#f06292", runtime: "browser", canRun: false, canDebug: false },
  ".json": { id: "json", label: "JSON", short: "JSON", color: "#fbc02d", runtime: "browser", canRun: true, canDebug: false },
  ".md": { id: "markdown", label: "Markdown", short: "MD", color: "#7dd3fc", runtime: "markdown", canRun: true, canDebug: false },
  ".mdx": { id: "markdown", label: "MDX", short: "MDX", color: "#7dd3fc", runtime: "markdown", canRun: true, canDebug: false },
  ".sql": { id: "sql", label: "SQL", short: "SQL", color: "#f59e0b", runtime: "sqlite", canRun: true, canDebug: false },
  ".sh": { id: "shell", label: "Shell", short: "SH", color: "#a3e635", runtime: "none", canRun: false, canDebug: false },
  ".yml": { id: "yaml", label: "YAML", short: "YML", color: "#f472b6", runtime: "none", canRun: false, canDebug: false },
  ".yaml": { id: "yaml", label: "YAML", short: "YML", color: "#f472b6", runtime: "none", canRun: false, canDebug: false },
  ".xml": { id: "xml", label: "XML", short: "XML", color: "#fb923c", runtime: "none", canRun: false, canDebug: false },
  ".svg": { id: "xml", label: "SVG", short: "SVG", color: "#f472b6", runtime: "none", canRun: false, canDebug: false },
  ".txt": { id: "plaintext", label: "Plain Text", short: "TXT", color: "#94a3b8", runtime: "none", canRun: false, canDebug: false },
  ".env": { id: "ini", label: "Environment", short: "ENV", color: "#94a3b8", runtime: "none", canRun: false, canDebug: false },
};

const FALLBACK: LanguageMeta = {
  id: "plaintext",
  label: "Plain Text",
  short: "TXT",
  color: "#94a3b8",
  runtime: "none",
  canRun: false,
  canDebug: false,
};

export function getLanguage(path: string): LanguageMeta {
  const lower = path.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const ext = dot === -1 ? "" : lower.slice(dot);
  if (basename(lower) === "dockerfile") {
    return { ...FALLBACK, id: "dockerfile", label: "Dockerfile", short: "DOCKER" };
  }
  return LANGUAGE_MAP[ext] ?? FALLBACK;
}

export function isCodeFile(path: string): boolean {
  const language = getLanguage(path);
  return ["javascript", "typescript", "python", "html", "css", "json", "markdown", "sql"].includes(language.id);
}

export function isTextFile(path: string): boolean {
  const meta = getLanguage(path);
  return meta.id !== "plaintext" || /\.(txt|log|csv|env|gitignore)$/i.test(path);
}

export function detectEntry(files: ProjectFile[]): string | null {
  const paths = files.filter((file) => file.kind === "file").map((file) => file.path);
  const candidates = [
    "src/main.tsx",
    "src/main.jsx",
    "src/main.ts",
    "src/main.js",
    "src/index.tsx",
    "src/index.jsx",
    "src/index.ts",
    "src/index.js",
    "main.tsx",
    "main.jsx",
    "main.ts",
    "main.js",
    "index.tsx",
    "index.jsx",
    "index.ts",
    "index.js",
    "app.js",
    "app.ts",
    "main.py",
    "main.sql",
    "README.md",
  ];
  for (const candidate of candidates) {
    if (paths.includes(candidate)) return candidate;
  }
  const code = paths.find((path) => getLanguage(path).canRun);
  return code ?? paths[0] ?? null;
}

export interface TreeNode {
  name: string;
  path: string;
  kind: "file" | "folder";
  file?: ProjectFile;
  children: TreeNode[];
}

export function buildFileTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", kind: "folder", children: [] };
  const folders = new Map<string, TreeNode>([["", root]]);

  const ensureFolder = (path: string): TreeNode => {
    const clean = normalizePath(path);
    if (!clean) return root;
    const existing = folders.get(clean);
    if (existing) return existing;
    const parent = ensureFolder(dirname(clean));
    const node: TreeNode = {
      name: basename(clean),
      path: clean,
      kind: "folder",
      children: [],
    };
    parent.children.push(node);
    folders.set(clean, node);
    return node;
  };

  for (const file of files) {
    const clean = normalizePath(file.path);
    if (!clean) continue;
    if (file.kind === "folder") {
      ensureFolder(clean);
      continue;
    }
    const parent = ensureFolder(dirname(clean));
    if (parent.children.some((child) => child.path === clean && child.kind === "file")) {
      continue;
    }
    parent.children.push({
      name: basename(clean),
      path: clean,
      kind: "file",
      file,
      children: [],
    });
  }

  const sortNodes = (nodes: TreeNode[]): void => {
    nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    });
    for (const node of nodes) sortNodes(node.children);
  };
  sortNodes(root.children);
  return root.children;
}

export const RUNTIME_INFO = [
  {
    id: "javascript",
    name: "JavaScript + TypeScript",
    engine: "esbuild · WebAssembly",
    description: "Bundles JS, TS, JSX and TSX in-browser with npm packages resolved through ESM.",
    icon: "braces",
    color: "#f7df1e",
    status: "ready" as const,
  },
  {
    id: "python",
    name: "Python 3",
    engine: "Pyodide · WebAssembly",
    description: "Full CPython runtime with the scientific stack, micropip and persistent sessions.",
    icon: "python",
    color: "#4b8bbe",
    status: "on-demand" as const,
  },
  {
    id: "web",
    name: "HTML + CSS",
    engine: "Browser · Native",
    description: "Live, sandboxed previews with console bridging and instant reload.",
    icon: "globe",
    color: "#e34f26",
    status: "ready" as const,
  },
  {
    id: "sql",
    name: "SQLite",
    engine: "sql.js · WebAssembly",
    description: "Run SQL against a local in-memory SQLite database and inspect results.",
    icon: "database",
    color: "#38bdf8",
    status: "on-demand" as const,
  },
  {
    id: "markdown",
    name: "Markdown",
    engine: "marked · Native",
    description: "Preview README and notes files with GitHub-flavored markdown.",
    icon: "file-text",
    color: "#7dd3fc",
    status: "ready" as const,
  },
] as const;
