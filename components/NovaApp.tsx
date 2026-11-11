"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import type { Project, Settings } from "@/lib/types";
import {
  clearAllData,
  deleteProject,
  duplicateProject,
  getProject,
  getSettings,
  importProject,
  listProjects,
  putProject,
  saveSettings,
  seedFirstProject,
  storageEstimate,
} from "@/lib/db";
import { useIDE } from "@/lib/store";
import { createProjectFromTemplate } from "@/lib/templates";
import { readProjectFile, exportProjectZip } from "@/lib/io";
import { Home } from "@/components/Home";
import { NovaMark } from "@/components/Brand";
import { IDE } from "@/components/ide/IDE";
import { ShortcutsDialog } from "@/components/ui/ShortcutsDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toasts } from "@/components/ui/Toasts";

export type SaveStatus = "saved" | "saving" | "dirty" | "error";

export function NovaApp() {
  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [view, setView] = useState<"home" | "ide">("home");
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<number>(Date.now());
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const project = useIDE((state) => state.project);
  const settings = useIDE((state) => state.settings);
  const hydrate = useIDE((state) => state.hydrate);
  const setProject = useIDE((state) => state.setProject);
  const setSettings = useIDE((state) => state.setSettings);
  const updateSettings = useIDE((state) => state.updateSettings);
  const addToast = useIDE((state) => state.addToast);

  const projectRef = useRef<Project | null>(project);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootStarted = useRef(false);
  const lastSavedAtRef = useRef(lastSavedAt);
  lastSavedAtRef.current = lastSavedAt;

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const refreshStorage = useCallback(async () => {
    try {
      setStorage(await storageEstimate());
    } catch {
      // Storage estimates are best-effort.
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    const list = await listProjects();
    setProjects(list);
    return list;
  }, []);

  const openProject = useCallback(
    async (id: string, skipUrl = false) => {
      if (projectRef.current && projectRef.current.id !== id) {
        await putProject(projectRef.current);
      }
      const found = await getProject(id);
      if (!found) {
        addToast("That workspace could not be found.", "error");
        return;
      }
      setProject(found);
      setLastSavedAt(found.updatedAt);
      setSaveStatus("saved");
      setView("ide");
      if (!skipUrl) {
        window.history.replaceState({}, "", `?project=${encodeURIComponent(found.id)}`);
      }
      refreshStorage();
    },
    [addToast, refreshStorage, setProject],
  );

  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;
    (async () => {
      try {
        const loadedSettings = await getSettings();
        hydrate(null, loadedSettings);
        setSettings(loadedSettings);
        let list = await listProjects();
        let wasSeeded = false;
        try {
          wasSeeded = localStorage.getItem("nova-seeded") === "1";
        } catch {
          wasSeeded = false;
        }
        if (list.length === 0 && !wasSeeded) {
          const seeded = await seedFirstProject();
          list = [seeded];
          try {
            localStorage.setItem("nova-seeded", "1");
          } catch {
            // Seeding is best-effort when storage is restricted.
          }
        } else if (list.length > 0 && !wasSeeded) {
          try {
            localStorage.setItem("nova-seeded", "1");
          } catch {
            // Ignore restricted storage.
          }
        }
        setProjects(list);
        await refreshStorage();

        const params = new URLSearchParams(window.location.search);
        const requested = params.get("project");
        if (requested) {
          const found = list.find((item) => item.id === requested) ?? (await getProject(requested));
          if (found) {
            setProject(found);
            setLastSavedAt(found.updatedAt);
            setView("ide");
          }
        }
        setBooted(true);
      } catch (error) {
        setBootError(error instanceof Error ? error.message : "Could not open the local database.");
        setBooted(true);
      }
    })();
  }, [hydrate, refreshStorage, setProject, setSettings]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    try {
      localStorage.setItem("nova-theme", settings.theme);
    } catch {
      // Theme persistence is optional.
    }
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => {
      void saveSettings(settings);
    }, 250);
    return () => {
      if (settingsTimer.current) clearTimeout(settingsTimer.current);
    };
  }, [settings]);

  useEffect(() => {
    if (!booted || view !== "ide" || !project) return;
    if (!settings.autoSave) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (project.updatedAt > lastSavedAtRef.current + 250) setSaveStatus("dirty");
      else setSaveStatus("saved");
      return;
    }
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await putProject(project);
        setSaveStatus("saved");
        setLastSavedAt(Date.now());
        refreshStorage();
      } catch {
        setSaveStatus("error");
        addToast("Autosave failed. IndexedDB may be unavailable.", "error");
      }
    }, 450);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [project, booted, view, addToast, refreshStorage, settings.autoSave]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveStatus === "dirty" || saveStatus === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && projectRef.current) {
        void putProject(projectRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const saveNow = useCallback(async () => {
    const current = projectRef.current;
    if (!current) return;
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await putProject(current);
      setSaveStatus("saved");
      setLastSavedAt(Date.now());
      addToast("Workspace saved to this browser.", "success");
    } catch {
      setSaveStatus("error");
      addToast("Could not save to IndexedDB.", "error");
    }
  }, [addToast]);

  const handleCreateProject = useCallback(
    async (templateId: string, name: string) => {
      try {
        const created = createProjectFromTemplate(templateId, name);
        await putProject(created);
        await refreshProjects();
        setProject(created);
        setLastSavedAt(created.updatedAt);
        setSaveStatus("saved");
        setView("ide");
        window.history.replaceState({}, "", `?project=${encodeURIComponent(created.id)}`);
        addToast("Workspace created. Everything autosaves locally.", "success");
      } catch {
        addToast("Could not create the workspace.", "error");
      }
    },
    [addToast, refreshProjects, setProject],
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      const current = projects.find((item) => item.id === id);
      if (!current) return;
      try {
        await duplicateProject(current);
        await refreshProjects();
        addToast(`Duplicated “${current.name}”.`, "success");
      } catch {
        addToast("Could not duplicate the workspace.", "error");
      }
    },
    [addToast, projects, refreshProjects],
  );

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteProject(target.id);
      await refreshProjects();
      if (projectRef.current?.id === target.id) {
        setProject(null);
        setView("home");
        window.history.replaceState({}, "", window.location.pathname);
      }
      addToast(`Deleted “${target.name}”.`, "success");
      refreshStorage();
    } catch {
      addToast("Could not delete the workspace.", "error");
    }
  }, [addToast, pendingDelete, refreshProjects, refreshStorage, setProject]);

  const handleExport = useCallback(
    async (target: Project) => {
      try {
        await exportProjectZip(target);
        addToast("ZIP export started.", "success");
      } catch {
        addToast("Could not export this workspace.", "error");
      }
    },
    [addToast],
  );

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const raw = await readProjectFile(file);
        const imported = await importProject(raw);
        await refreshProjects();
        addToast(`Imported “${imported.name}”.`, "success");
        await openProject(imported.id);
      } catch (error) {
        addToast(error instanceof Error ? error.message : "Could not import that file.", "error");
      }
    },
    [addToast, openProject, refreshProjects],
  );

  const handleExit = useCallback(async () => {
    if (projectRef.current) await putProject(projectRef.current);
    await refreshProjects();
    setProject(null);
    setView("home");
    window.history.replaceState({}, "", window.location.pathname);
    refreshStorage();
  }, [refreshProjects, refreshStorage, setProject]);

  const handleOpenFromHome = useCallback(
    async (id: string) => {
      await openProject(id);
    },
    [openProject],
  );

  const handleReset = useCallback(async () => {
    setResetOpen(false);
    try {
      await clearAllData();
      setProject(null);
      setView("home");
      window.history.replaceState({}, "", window.location.pathname);
      setProjects([]);
      refreshStorage();
      addToast("All local Nova data has been cleared.", "success");
    } catch {
      addToast("Could not clear local data.", "error");
    }
  }, [addToast, refreshStorage, setProject]);

  if (!booted) {
    return (
      <div className="boot-screen">
        <div className="boot-inner">
          <NovaMark size={44} />
          <p>Opening your local workspace…</p>
        </div>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="boot-screen">
        <div className="boot-inner" style={{ animation: "none", maxWidth: 460, textAlign: "center" }}>
          <span style={{ color: "var(--danger)" }}>
            <AlertTriangle size={34} />
          </span>
          <h2 style={{ margin: 0, fontSize: 18, color: "var(--text)" }}>Local storage unavailable</h2>
          <p style={{ lineHeight: 1.7 }}>{bootError}</p>
          <p style={{ fontSize: 11 }}>
            Nova needs IndexedDB. Try a normal (non-private) browser window and allow storage for
            this site.
          </p>
          <button className="btn primary" onClick={() => window.location.reload()}>
            <RotateCcw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {view === "ide" ? (
        <IDE
          projects={projects}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          onExit={handleExit}
          onSwitchProject={openProject}
          onSaveNow={saveNow}
          onCreateProject={handleCreateProject}
          onExportProject={handleExport}
          onImportProject={handleImport}
          onShowShortcuts={() => setShortcutsOpen(true)}
          onOpenHome={handleExit}
        />
      ) : (
        <Home
          projects={projects}
          storage={storage}
          onOpenProject={handleOpenFromHome}
          onCreateProject={handleCreateProject}
          onDeleteProject={(id) => {
            const found = projects.find((item) => item.id === id) ?? null;
            setPendingDelete(found);
          }}
          onDuplicateProject={handleDuplicate}
          onExportProject={handleExport}
          onImportProject={handleImport}
          onShowShortcuts={() => setShortcutsOpen(true)}
          onResetData={() => setResetOpen(true)}
        />
      )}

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete workspace?"
        text={
          pendingDelete
            ? `“${pendingDelete.name}” and its checkpoints will be permanently removed from this browser. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete workspace"
        danger
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={resetOpen}
        title="Reset all local data?"
        text="This removes every workspace, checkpoint and preference stored by Nova in this browser. Make sure you have exported anything you want to keep."
        confirmLabel="Reset everything"
        danger
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
      />
      <Toasts />
    </>
  );
}
