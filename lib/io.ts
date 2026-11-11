import JSZip from "jszip";
import type { Project } from "./types";
import { downloadBlob } from "./utils";

export async function exportProjectZip(project: Project): Promise<void> {
  const zip = new JSZip();
  for (const file of project.files) {
    if (file.kind === "folder") {
      zip.folder(file.path);
      continue;
    }
    zip.file(file.path, file.content ?? "");
  }
  zip.file(
    ".nova/project.json",
    JSON.stringify(
      {
        name: project.name,
        description: project.description,
        template: project.template,
        entryPath: project.entryPath,
        exportedAt: new Date().toISOString(),
        schema: 1,
      },
      null,
      2,
    ),
  );
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  const safeName = project.name.replace(/[^a-z0-9-_ ]/gi, "").trim() || "nova-project";
  downloadBlob(blob, `${safeName}.zip`);
}

export async function exportProjectJson(project: Project): Promise<void> {
  const payload = JSON.stringify(
    {
      ...project,
      exportedAt: new Date().toISOString(),
      schema: 1,
    },
    null,
    2,
  );
  const safeName = project.name.replace(/[^a-z0-9-_ ]/gi, "").trim() || "nova-project";
  downloadBlob(new Blob([payload], { type: "application/json" }), `${safeName}.nova.json`);
}

export async function readProjectFile(file: File): Promise<unknown> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".zip")) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const metaFile = zip.file(".nova/project.json");
    let meta: Record<string, unknown> = {};
    if (metaFile) {
      try {
        meta = JSON.parse(await metaFile.async("text")) as Record<string, unknown>;
      } catch {
        meta = {};
      }
    }
    const files: Array<{ path: string; kind: "file"; content: string }> = [];
    const entries = Object.values(zip.files);
    for (const entry of entries) {
      if (entry.dir || entry.name.startsWith("__MACOSX") || entry.name === ".nova/project.json") {
        continue;
      }
      if (entry.name.endsWith(".DS_Store")) continue;
      files.push({
        path: entry.name,
        kind: "file",
        content: await entry.async("text"),
      });
    }
    if (files.length === 0) throw new Error("This ZIP does not contain any project files.");
    return {
      name: typeof meta.name === "string" ? meta.name : file.name.replace(/\.zip$/i, ""),
      description: typeof meta.description === "string" ? meta.description : "Imported from ZIP",
      template: typeof meta.template === "string" ? meta.template : "imported",
      entryPath: typeof meta.entryPath === "string" ? meta.entryPath : undefined,
      files,
    };
  }

  if (name.endsWith(".json")) {
    const text = await file.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("That file is not valid JSON.");
    }
  }

  throw new Error("Use a .json or .zip Nova export.");
}
