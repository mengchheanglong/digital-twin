import React from "react";

export type BadgeTone =
  | "default"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "muted";

export interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

const toneMap: Record<BadgeTone, string> = {
  default: "bg-bg-panel border-border text-text-secondary",
  accent: "bg-accent-subtle border-accent-primary/25 text-accent-primary",
  success: "bg-status-success/10 border-status-success/25 text-status-success",
  warning: "bg-status-warning/10 border-status-warning/25 text-status-warning",
  error: "bg-status-error/10 border-status-error/25 text-status-error",
  info: "bg-status-info/10 border-status-info/25 text-status-info",
  muted: "bg-bg-input border-border text-text-muted",
};

export default function Badge({
  tone = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5",
        "text-[10px] font-bold uppercase tracking-wider leading-none",
        "whitespace-nowrap",
        toneMap[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
