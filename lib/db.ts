import Dexie, { type EntityTable } from "dexie";
import type { Project, Settings, Snapshot } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { createProjectFromTemplate } from "./templates";

interface SettingRow {
  key: string;
  value: unknown;
}

class NovaDatabase extends Dexie {
  projects!: EntityTable<Project, "id">;
  snapshots!: EntityTable<Snapshot, "id">;
  settings!: EntityTable<SettingRow, "key">;

  constructor() {
    super("nova-studio");
    this.version(1).stores({
      projects: "id, updatedAt, name",
      snapshots: "id, projectId, createdAt",
      settings: "key",
    });
  }
}

let database: NovaDatabase | null = null;

function getDatabase(): NovaDatabase {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!database) database = new NovaDatabase();
  return database;
}

export async function listProjects(): Promise<Project[]> {
  const db = getDatabase();
  const projects = await db.projects.toArray();
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<Project | undefined> {
  return getDatabase().projects.get(id);
}

export async function putProject(project: Project): Promise<void> {
  await getDatabase().projects.put({ ...project, updatedAt: project.updatedAt });
}

export async function deleteProject(id: string): Promise<void> {
  const db = getDatabase();
  await db.transaction("rw", db.projects, db.snapshots, async () => {
    await db.projects.delete(id);
    await db.snapshots.where("projectId").equals(id).delete();
  });
}

export async function duplicateProject(project: Project): Promise<Project> {
  const now = Date.now();
  const id = crypto.randomUUID();
  const copy: Project = {
    ...structuredClone(project),
    id,
    name: `${project.name} copy`,
    createdAt: now,
    updatedAt: now,
  };
  await putProject(copy);
  return copy;
}

export async function getSettings(): Promise<Settings> {
  const row = await getDatabase().settings.get("settings");
  if (!row || typeof row.value !== "object" || !row.value) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(row.value as Partial<Settings>) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await getDatabase().settings.put({ key: "settings", value: settings });
}

export async function createSnapshot(project: Project, message: string): Promise<Snapshot> {
  const snapshot: Snapshot = {
    id: crypto.randomUUID(),
    projectId: project.id,
    message: message.trim() || "Manual checkpoint",
    files: structuredClone(project.files),
    createdAt: Date.now(),
  };
  const db = getDatabase();
  await db.snapshots.put(snapshot);
  const existing = await db.snapshots.where("projectId").equals(project.id).sortBy("createdAt");
  if (existing.length > 25) {
    const remove = existing.slice(0, existing.length - 25).map((item) => item.id);
    await db.snapshots.bulkDelete(remove);
  }
  return snapshot;
}

export async function listSnapshots(projectId: string): Promise<Snapshot[]> {
  const snaps = await getDatabase()
    .snapshots.where("projectId")
    .equals(projectId)
    .toArray();
  return snaps.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSnapshot(id: string): Promise<void> {
  await getDatabase().snapshots.delete(id);
}

export async function seedFirstProject(): Promise<Project> {
  const db = getDatabase();
  const count = await db.projects.count();
  if (count > 0) {
    const projects = await listProjects();
    return projects[0];
  }
  const project = createProjectFromTemplate("starter-web", "Orbital Starter");
  project.description = "A polished landing page, ready to explore.";
  await db.projects.put(project);
  return project;
}

export async function storageEstimate(): Promise<{ usage: number; quota: number }> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0 };
  }
  const estimate = await navigator.storage.estimate();
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
}

export async function clearAllData(): Promise<void> {
  const db = getDatabase();
  await db.transaction("rw", db.projects, db.snapshots, db.settings, async () => {
    await db.projects.clear();
    await db.snapshots.clear();
    await db.settings.clear();
  });
}

export async function importProject(raw: unknown): Promise<Project> {
  if (!raw || typeof raw !== "object") throw new Error("Invalid project file");
  const record = raw as Partial<Project>;
  if (!record.name || !Array.isArray(record.files)) {
    throw new Error("This file is not a Nova project export.");
  }
  const now = Date.now();
  const project: Project = {
    id: crypto.randomUUID(),
    name: String(record.name).slice(0, 80),
    description: String(record.description ?? "Imported project"),
    template: String(record.template ?? "imported"),
    files: record.files
      .filter((file) => file && typeof file.path === "string")
      .map((file) => ({
        id: crypto.randomUUID(),
        path: String(file.path),
        kind: file.kind === "folder" ? "folder" : "file",
        content: file.kind === "folder" ? undefined : String(file.content ?? ""),
      })),
    entryPath: record.entryPath,
    openFiles: [],
    activeFileId: null,
    createdAt: now,
    updatedAt: now,
  };
  const entry =
    project.files.find((file) => file.path === project.entryPath && file.kind === "file") ??
    project.files.find((file) => file.kind === "file");
  if (entry) {
    project.openFiles = [entry.id];
    project.activeFileId = entry.id;
  }
  await putProject(project);
  return project;
}
