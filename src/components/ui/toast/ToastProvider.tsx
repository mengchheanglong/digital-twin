"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Toast, { ToastItem, ToastVariant } from "./Toast";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export type ToastPosition = "top-right" | "bottom-right" | "bottom-center" | "top-center";

interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
}

const positionClasses: Record<ToastPosition, string> = {
  "top-right": "top-4 right-4 flex-col",
  "bottom-right": "bottom-4 right-4 flex-col",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 flex-col",
  "top-center": "top-4 left-1/2 -translate-x-1/2 flex-col",
};

export default function ToastProvider({ children, position = "bottom-right" }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newToast: ToastItem = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant ?? "info",
      duration: options.duration,
    };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {mounted &&
        createPortal(
          <div
            className={[
              "fixed z-[9999] flex gap-3 pointer-events-none",
              positionClasses[position],
            ].join(" ")}
            aria-live="polite"
            aria-atomic="true"
          >
            {toasts.map((t) => (
              <div key={t.id} className="pointer-events-auto">
                <Toast toast={t} onDismiss={dismiss} />
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
