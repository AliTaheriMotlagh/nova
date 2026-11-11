"use client";

import { Keyboard } from "lucide-react";
import { Modal } from "./Modal";

const GROUPS: Array<{ title: string; items: Array<[string, string[]]> }> = [
  {
    title: "Navigation",
    items: [
      ["Quick open file", ["Ctrl", "P"]],
      ["Command palette", ["Ctrl", "Shift", "P"]],
      ["Go to line", ["Ctrl", "G"]],
      ["Toggle explorer", ["Ctrl", "B"]],
      ["Toggle terminal", ["Ctrl", "J"]],
      ["Toggle terminal (alt)", ["Ctrl", "`"]],
      ["Focus search", ["Ctrl", "Shift", "F"]],
    ],
  },
  {
    title: "Editing",
    items: [
      ["Save", ["Ctrl", "S"]],
      ["Format document", ["Shift", "Alt", "F"]],
      ["Toggle comment", ["Ctrl", "/"]],
      ["Multi-cursor", ["Alt", "Click"]],
      ["Close tab", ["Alt", "W"]],
      ["Rename symbol", ["F2"]],
    ],
  },
  {
    title: "Run",
    items: [
      ["Run project", ["Ctrl", "Enter"]],
      ["Run current file", ["Ctrl", "Shift", "Enter"]],
      ["Debug current file", ["F5"]],
      ["Toggle preview", ["Ctrl", "Shift", "V"]],
      ["Refresh preview", ["Ctrl", "Shift", "R"]],
    ],
  },
  {
    title: "Project",
    items: [
      ["New file", ["Ctrl", "N"]],
      ["New folder", ["Ctrl", "Shift", "N"]],
      ["Search files", ["Ctrl", "Shift", "F"]],
      ["Export ZIP", ["Ctrl", "Shift", "E"]],
      ["Create checkpoint", ["Ctrl", "Alt", "S"]],
      ["Keyboard shortcuts", ["Ctrl", "K"]],
    ],
  },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={660}
      title="Keyboard shortcuts"
      subtitle="Nova is designed to be driven from the keyboard."
      headerAction={
        <span className="pill" style={{ marginRight: 4 }}>
          <Keyboard size={10} />
          ⌘ / Ctrl
        </span>
      }
    >
      <div className="modal-body">
        <div className="shortcut-grid">
          {GROUPS.map((group) => (
            <div className="shortcut-group" key={group.title}>
              <h3>{group.title}</h3>
              {group.items.map(([label, keys]) => (
                <div className="shortcut-row" key={label}>
                  <span>{label}</span>
                  <span className="shortcut-keys">
                    {keys.map((key) => (
                      <kbd className="kbd" key={key}>
                        {key}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="modal-footer">
        <span className="left" style={{ color: "var(--faint)", fontSize: 10.5 }}>
          On macOS, use ⌘ in place of Ctrl.
        </span>
        <button className="btn" onClick={onClose}>
          Got it
        </button>
      </div>
    </Modal>
  );
}
