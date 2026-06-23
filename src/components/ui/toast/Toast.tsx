"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, AlertTriangle, Info, X, XCircle } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

const variantConfig: Record<ToastVariant, { icon: React.ReactNode; toneClass: string; iconBg: string }> = {
  success: {
    icon: <CheckCircle size={16} strokeWidth={2.5} />,
    toneClass: "border-status-success/30",
    iconBg: "bg-status-success/10 text-status-success",
  },
  error: {
    icon: <XCircle size={16} strokeWidth={2.5} />,
    toneClass: "border-status-error/30",
    iconBg: "bg-status-error/10 text-status-error",
  },
  warning: {
    icon: <AlertTriangle size={16} strokeWidth={2.5} />,
    toneClass: "border-status-warning/30",
    iconBg: "bg-status-warning/10 text-status-warning",
  },
  info: {
    icon: <Info size={16} strokeWidth={2.5} />,
    toneClass: "border-status-info/30",
    iconBg: "bg-status-info/10 text-status-info",
  },
};

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.duration ?? 4000;
  const config = variantConfig[toast.variant];

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        requestAnimationFrame(tick);
      }
    };
    const raf = requestAnimationFrame(tick);
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [duration, handleDismiss]);

  return (
    <div
      role="alert"
      className={[
        "relative flex w-full max-w-sm items-start gap-3 rounded-xl border bg-bg-card p-4 shadow-elevated",
        "transition-all duration-300 ease-apple",
        exiting ? "opacity-0 translate-y-2 scale-95" : "opacity-100 translate-y-0 scale-100",
        config.toneClass,
      ].join(" ")}
    >
      <div className={["mt-0.5 shrink-0 rounded-lg p-1", config.iconBg].join(" ")}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded-md p-1 text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={14} strokeWidth={2.5} />
      </button>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden">
        <div
          className="h-full bg-current opacity-30 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
