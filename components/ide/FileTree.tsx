"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  Copy,
  CornerDownRight,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { ProjectFile } from "@/lib/types";
import { buildFileTree, type TreeNode } from "@/lib/languages";
import { dirname } from "@/lib/utils";
import { FileGlyph, FolderGlyph } from "./FileIcon";

interface ContextState {
  x: number;
  y: number;
  node: TreeNode;
}

export function FileTree({
  files,
  activeFileId,
  onSelect,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onDuplicate,
  onSetEntry,
}: {
  files: ProjectFile[];
  activeFileId: string | null;
  onSelect: (fileId: string) => void;
  onNewFile: (parentPath: string) => void;
  onNewFolder: (parentPath: string) => void;
  onRename: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
  onDuplicate: (file: ProjectFile) => void;
  onSetEntry: (file: ProjectFile) => void;
}) {
  const tree = useMemo(() => buildFileTree(files), [files]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [context, setContext] = useState<ContextState | null>(null);
  const initialised = useRef(false);
  const activePath = files.find((file) => file.id === activeFileId)?.path;

  useEffect(() => {
    if (!initialised.current && tree.length > 0) {
      const roots = tree.filter((node) => node.kind === "folder").map((node) => node.path);
      setExpanded(new Set([...roots, "src", "public"]));
      initialised.current = true;
    }
  }, [tree]);

  useEffect(() => {
    if (!activePath) return;
    const parts = activePath.split("/");
    parts.pop();
    if (parts.length === 0) return;
    setExpanded((current) => {
      const next = new Set(current);
      let path = "";
      for (const part of parts) {
        path = path ? `${path}/${part}` : part;
        next.add(path);
      }
      return next;
    });
  }, [activePath]);

  useEffect(() => {
    if (!context) return;
    const close = () => setContext(null);
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
    };
  }, [context]);

  function toggle(path: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function openContext(event: React.MouseEvent, node: TreeNode) {
    event.preventDefault();
    event.stopPropagation();
    const width = 196;
    const height = node.kind === "folder" ? 230 : 250;
    setContext({
      x: Math.min(event.clientX, window.innerWidth - width - 8),
      y: Math.min(event.clientY, window.innerHeight - height - 8),
      node,
    });
  }

  function renderNode(node: TreeNode, depth: number) {
    const isFolder = node.kind === "folder";
    const isOpen = expanded.has(node.path);
    const active = node.file?.id === activeFileId;
    return (
      <div key={node.path}>
        <button
          className={`tree-row ${active ? "active" : ""}`}
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => {
            if (isFolder) toggle(node.path);
            else if (node.file) onSelect(node.file.id);
          }}
          onContextMenu={(event) => openContext(event, node)}
          title={node.path}
        >
          <span className={`tree-chevron ${isFolder ? "" : "hidden"}`}>
            <ChevronRight
              size={12}
              style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .12s ease" }}
            />
          </span>
          {isFolder ? <FolderGlyph open={isOpen} /> : <FileGlyph path={node.path} />}
          <span className="tree-name">{node.name}</span>
          {node.file && files.find((file) => file.id === node.file?.id)?.path === activePath && (
            <span className="tree-active-dot" />
          )}
        </button>
        {isFolder && isOpen && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="tree-empty">
        <p>No files yet.</p>
        <button className="btn sm" onClick={() => onNewFile("")}>
          <Plus size={12} /> New file
        </button>
      </div>
    );
  }

  return (
    <div className="file-tree" onClick={() => context && setContext(null)}>
      {tree.map((node) => renderNode(node, 0))}
      {context &&
        createPortal(
          <div
            className="context-menu"
            style={{ left: context.x, top: context.y }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="menu-label">{context.node.name}</div>
            {context.node.kind === "folder" ? (
              <>
                <button
                  onClick={() => {
                    onNewFile(context.node.path);
                    setContext(null);
                  }}
                >
                  <Plus size={13} /> New file
                </button>
                <button
                  onClick={() => {
                    onNewFolder(context.node.path);
                    setContext(null);
                  }}
                >
                  <FolderPlus size={13} /> New folder
                </button>
                <div className="separator" />
                <button
                  onClick={() => {
                    onRename(context.node);
                    setContext(null);
                  }}
                >
                  <Pencil size={13} /> Rename
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    onDelete(context.node);
                    setContext(null);
                  }}
                >
                  <Trash2 size={13} /> Delete folder
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    onNewFile(dirname(context.node.path));
                    setContext(null);
                  }}
                >
                  <Plus size={13} /> New file here
                </button>
                <div className="separator" />
                <button
                  onClick={() => {
                    onRename(context.node);
                    setContext(null);
                  }}
                >
                  <Pencil size={13} /> Rename
                  <span className="shortcut">F2</span>
                </button>
                {context.node.file && (
                  <button
                    onClick={() => {
                      onDuplicate(context.node.file!);
                      setContext(null);
                    }}
                  >
                    <Copy size={13} /> Duplicate
                  </button>
                )}
                <button
                  onClick={() => {
                    onNewFolder(dirname(context.node.path));
                    setContext(null);
                  }}
                >
                  <FolderPlus size={13} /> New folder
                </button>
                <div className="separator" />
                {context.node.file && (
                  <button
                    onClick={() => {
                      onSetEntry(context.node.file!);
                      setContext(null);
                    }}
                  >
                    <CornerDownRight size={13} /> Set as entry
                  </button>
                )}
                <button
                  className="danger"
                  onClick={() => {
                    onDelete(context.node);
                    setContext(null);
                  }}
                >
                  <Trash2 size={13} /> Delete
                  <span className="shortcut">⌥⌫</span>
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
