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
        "flex flex-col items-center justify-center text-center",
        "rounded-2xl border border-dashed border-border bg-bg-panel/30",
        "px-6 py-12",
        className,
      ].join(" ")}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bg-card text-text-muted shadow-inner ring-1 ring-border">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-text-secondary leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
