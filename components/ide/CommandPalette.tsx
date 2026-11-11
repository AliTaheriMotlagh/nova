"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, CornerDownLeft, FileCode2, Search, TerminalSquare } from "lucide-react";
import type { ProjectFile } from "@/lib/types";
import { FileGlyph } from "./FileIcon";

export interface PaletteCommand {
  id: string;
  title: string;
  detail?: string;
  category: string;
  shortcut?: string[];
  icon?: ReactNode;
  run: () => void;
}

interface Item {
  id: string;
  title: string;
  detail?: string;
  category: string;
  shortcut?: string[];
  icon?: ReactNode;
  fileId?: string;
  command?: PaletteCommand;
}

function score(query: string, text: string): number {
  if (!query) return 1;
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  if (haystack.includes(needle)) {
    return 100 - haystack.indexOf(needle) + (haystack.startsWith(needle) ? 50 : 0);
  }
  let index = 0;
  let points = 0;
  for (const character of needle) {
    const found = haystack.indexOf(character, index);
    if (found === -1) return 0;
    points += found === index ? 3 : 1;
    index = found + 1;
  }
  return points;
}

export function CommandPalette({
  open,
  mode,
  commands,
  files,
  onClose,
  onFile,
}: {
  open: boolean;
  mode: "commands" | "files";
  commands: PaletteCommand[];
  files: ProjectFile[];
  onClose: () => void;
  onFile: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open, mode]);

  const items = useMemo<Item[]>(() => {
    if (mode === "files") {
      return files
        .filter((file) => file.kind === "file")
        .map((file) => ({
          id: file.id,
          title: file.path.split("/").pop() ?? file.path,
          detail: file.path,
          category: "Files",
          icon: <FileGlyph path={file.path} size={12} />,
          fileId: file.id,
        }));
    }
    return commands.map((command) => ({
      id: command.id,
      title: command.title,
      detail: command.detail,
      category: command.category,
      shortcut: command.shortcut,
      icon: command.icon,
      command,
    }));
  }, [mode, commands, files]);

  const filtered = useMemo(() => {
    const scored = items
      .map((item) => ({
        item,
        score: query
          ? Math.max(score(query, item.title), score(query, `${item.category} ${item.detail ?? ""}`) - 10)
          : 1,
      }))
      .filter((entry) => entry.score > 0);
    scored.sort((a, b) => {
      if (query) return b.score - a.score;
      return 0;
    });
    return scored.slice(0, 90).map((entry) => entry.item);
  }, [items, query]);

  useEffect(() => {
    setIndex(0);
  }, [query, mode]);

  useEffect(() => {
    if (!open) return;
    const element = listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    element?.scrollIntoView({ block: "nearest" });
  }, [index, open]);

  function select(item: Item | undefined) {
    if (!item) return;
    onClose();
    if (item.fileId) onFile(item.fileId);
    else item.command?.run();
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="palette-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="palette-input-row">
          {mode === "files" ? <Search size={16} /> : <TerminalSquare size={16} />}
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={mode === "files" ? "Search files by name…" : "Type a command…"}
            spellCheck={false}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onClose();
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setIndex((value) => Math.min(filtered.length - 1, value + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setIndex((value) => Math.max(0, value - 1));
              } else if (event.key === "Enter") {
                event.preventDefault();
                select(filtered[index]);
              }
            }}
          />
          <span className="palette-mode">{mode === "files" ? "Go to file" : "Commands"}</span>
        </div>

        <div className="palette-list" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="palette-empty">
              <FileCode2 size={20} style={{ opacity: 0.4, marginBottom: 8 }} />
              <div>No matches{query ? ` for “${query}”` : ""}.</div>
            </div>
          ) : (
            filtered.map((item, itemIndex) => {
              const showGroup =
                itemIndex === 0 || filtered[itemIndex - 1].category !== item.category;
              return (
                <div key={`${item.id}-${itemIndex}`}>
                  {showGroup && <div className="palette-group-label">{item.category}</div>}
                  <button
                    className={`palette-item ${itemIndex === index ? "selected" : ""}`}
                    data-index={itemIndex}
                    onMouseEnter={() => setIndex(itemIndex)}
                    onClick={() => select(item)}
                  >
                    <span className="palette-item-icon">{item.icon ?? <FileCode2 size={13} />}</span>
                    <span className="palette-item-main">
                      <span className="palette-item-title">{item.title}</span>
                      {item.detail && <span className="palette-item-sub">{item.detail}</span>}
                    </span>
                    {item.shortcut && (
                      <span style={{ display: "flex", gap: 3 }}>
                        {item.shortcut.map((key) => (
                          <kbd className="kbd" key={key}>
                            {key}
                          </kbd>
                        ))}
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="palette-footer">
          <span>
            <ArrowUp size={10} />
            <ArrowDown size={10} /> navigate
          </span>
          <span>
            <CornerDownLeft size={10} /> open
          </span>
          <span>esc close</span>
          <span style={{ marginLeft: "auto" }}>{filtered.length} results</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
