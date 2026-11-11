"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Modal } from "./Modal";

export function PromptDialog({
  open,
  title,
  subtitle,
  label,
  placeholder,
  initialValue = "",
  confirmLabel = "Create",
  multiline = false,
  inputMode,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  multiline?: boolean;
  inputMode?: "text" | "numeric";
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      if (inputRef.current instanceof HTMLInputElement) inputRef.current.select();
    }, 30);
    return () => window.clearTimeout(timer);
  }, [open, initialValue]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
  }

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} width={460}>
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-field">
            <label htmlFor="prompt-input">{label}</label>
            {multiline ? (
              <textarea
                id="prompt-input"
                ref={(element) => {
                  inputRef.current = element;
                }}
                className="text-input prompt-textarea"
                value={value}
                placeholder={placeholder}
                onChange={(event) => setValue(event.target.value)}
                rows={4}
              />
            ) : (
              <input
                id="prompt-input"
                ref={(element) => {
                  inputRef.current = element;
                }}
                className="text-input"
                value={value}
                placeholder={placeholder}
                inputMode={inputMode}
                onChange={(event) => setValue(event.target.value)}
                spellCheck={false}
                autoComplete="off"
              />
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={!value.trim()}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
