"use client";

import { AlertTriangle, Check, Info, X } from "lucide-react";
import { useIDE } from "@/lib/store";

export function Toasts() {
  const toasts = useIDE((state) => state.toasts);
  const dismiss = useIDE((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.tone}`}>
          {toast.tone === "success" ? (
            <Check size={14} />
          ) : toast.tone === "error" ? (
            <AlertTriangle size={14} />
          ) : (
            <Info size={14} />
          )}
          <span>{toast.message}</span>
          <button onClick={() => dismiss(toast.id)} aria-label="Dismiss">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
