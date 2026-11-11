import type { ProjectFile } from "./types";

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizePath(input: string): string {
  const parts = input.replaceAll("\\", "/").split("/");
  const output: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      output.pop();
      continue;
    }
    output.push(part);
  }
  return output.join("/");
}

export function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join("/"));
}

export function dirname(path: string): string {
  const clean = normalizePath(path);
  const index = clean.lastIndexOf("/");
  return index === -1 ? "" : clean.slice(0, index);
}

export function basename(path: string): string {
  const clean = normalizePath(path);
  return clean.slice(clean.lastIndexOf("/") + 1);
}

export function extname(path: string): string {
  const name = basename(path);
  const index = name.lastIndexOf(".");
  return index <= 0 ? "" : name.slice(index).toLowerCase();
}

export function stripExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index <= 0 ? name : name.slice(0, index);
}

export function isDescendantPath(path: string, parent: string): boolean {
  return path === parent || path.startsWith(`${parent}/`);
}

export function ensureUniquePath(
  files: ProjectFile[],
  desiredPath: string,
  kind: "file" | "folder",
): string {
  const clean = normalizePath(desiredPath);
  const taken = new Set(files.map((file) => file.path.toLowerCase()));
  if (!taken.has(clean.toLowerCase())) return clean;

  const dir = dirname(clean);
  const name = basename(clean);
  const ext = kind === "file" ? extname(name) : "";
  const stem = ext ? name.slice(0, -ext.length) : name;
  let index = 2;
  while (index < 1000) {
    const candidateName = `${stem}-${index}${ext}`;
    const candidate = dir ? `${dir}/${candidateName}` : candidateName;
    if (!taken.has(candidate.toLowerCase())) return candidate;
    index += 1;
  }
  return `${clean}-${Date.now()}`;
}

export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** exponent;
  return `${size.toFixed(size >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function lineCount(content: string): number {
  return content.length === 0 ? 1 : content.split("\n").length;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
