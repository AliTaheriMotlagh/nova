"use client";

import { FileText, Folder, FolderOpen } from "lucide-react";
import { getLanguage } from "@/lib/languages";

export function FileGlyph({ path, size = 14 }: { path: string; size?: number }) {
  const language = getLanguage(path);
  const label = language.short.length > 4 ? language.short.slice(0, 4) : language.short;
  if (language.id === "plaintext" && !/\./.test(path)) {
    return <FileText size={size} strokeWidth={1.6} style={{ color: language.color, flex: "none" }} />;
  }
  return (
    <span
      className="file-glyph"
      style={{
        color: language.color,
        background: `color-mix(in srgb, ${language.color} 12%, transparent)`,
        width: Math.max(17, label.length * 4.8 + 4),
        height: 14,
        fontSize: label.length > 3 ? 6 : 7,
      }}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}

export function FolderGlyph({ open, size = 14 }: { open: boolean; size?: number }) {
  const Icon = open ? FolderOpen : Folder;
  return <Icon size={size} strokeWidth={1.6} style={{ color: "#7f9cc9", flex: "none" }} />;
}
