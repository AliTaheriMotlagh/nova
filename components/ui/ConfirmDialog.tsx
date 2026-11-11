"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={430}>
      <div className="modal-body">
        {danger && (
          <span className="confirm-icon">
            <AlertTriangle size={19} />
          </span>
        )}
        <p className="confirm-text">{text}</p>
      </div>
      <div className="modal-footer">
        <button className="btn ghost" onClick={onClose}>
          {cancelLabel}
        </button>
        <button className={`btn ${danger ? "danger" : "primary"}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
