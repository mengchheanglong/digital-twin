import React from "react";

export type PillTone =
  | "default"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "muted";

export interface PillProps {
  tone?: PillTone;
  children: React.ReactNode;
  className?: string;
}

const toneMap: Record<PillTone, string> = {
  default: "bg-bg-panel border-border text-text-secondary",
  accent: "bg-accent-subtle border-accent-primary/25 text-accent-primary",
  success: "bg-status-success/10 border-status-success/25 text-status-success",
  warning: "bg-status-warning/10 border-status-warning/25 text-status-warning",
  error: "bg-status-error/10 border-status-error/25 text-status-error",
  info: "bg-status-info/10 border-status-info/25 text-status-info",
  muted: "bg-bg-input border-border text-text-muted",
};

export default function Pill({
  tone = "default",
  children,
  className = "",
}: PillProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5",
        "text-[11px] font-semibold leading-none whitespace-nowrap",
        toneMap[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
