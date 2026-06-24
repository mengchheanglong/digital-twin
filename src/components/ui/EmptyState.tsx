import React from "react";
import Button from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "relative flex flex-col items-center justify-center text-center overflow-hidden",
        "rounded-2xl border border-dashed border-border bg-bg-panel/40",
        "px-8 py-14 animate-fade-in",
        className,
      ].join(" ")}
    >
      {/* Background ambient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent-primary/3 to-transparent" />

      {icon && (
        <div className="relative z-10 mb-5">
          <div className="absolute inset-0 rounded-full bg-accent-primary/10 blur-2xl scale-150" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-card text-text-muted shadow-card ring-1 ring-border transition-all duration-300 hover:text-accent-primary hover:ring-accent-primary/30">
            {icon}
          </div>
        </div>
      )}

      <h3 className="relative z-10 text-base font-bold text-text-primary">
        {title}
      </h3>

      {description && (
        <p className="relative z-10 mt-2 max-w-xs text-sm leading-relaxed text-text-secondary">
          {description}
        </p>
      )}

      {action && (
        <div className="relative z-10 mt-6">
          <Button variant="primary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
