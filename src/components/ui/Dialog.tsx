"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export default function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement;
      // Focus the dialog content
      setTimeout(() => {
        contentRef.current?.focus();
      }, 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
      // Basic focus trap
      if (e.key === "Tab" && open && contentRef.current) {
        const focusable = contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          onClose();
        }
      }}
      role="presentation"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in" />

      {/* Dialog Card */}
      <div
        ref={contentRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "dialog-title" : undefined}
        className={[
          "relative z-10 w-full overflow-hidden",
          sizeMap[size],
          "rounded-2xl border border-border bg-bg-card shadow-2xl",
          "animate-scale-in",
          "outline-none",
        ].join(" ")}
      >
        {/* Subtle top gradient */}
        <div className="pointer-events-none absolute top-0 h-24 w-full bg-gradient-to-b from-accent-primary/8 to-transparent" />

        {title && (
          <div className="relative z-10 flex items-center justify-between border-b border-border-subtle px-6 pt-6 pb-4">
            <h2
              id="dialog-title"
              className="text-base font-bold text-text-primary tracking-tight"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all duration-150 focus-ring"
              aria-label="Close dialog"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}
        <div className="relative z-10 px-6 py-5">{children}</div>
        {footer && (
          <div className="relative z-10 flex items-center justify-end gap-3 border-t border-border-subtle px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
