"use client";

import React from "react";

export type StatColor = "accent" | "success" | "warning" | "error" | "info";

export interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: StatColor;
}

const colorMap: Record<
  NonNullable<StatCardProps["color"]>,
  { icon: string; glow: string; bg: string }
> = {
  accent: {
    icon: "bg-accent-subtle text-accent-primary ring-accent-primary/20",
    glow: "bg-accent-primary/5",
    bg: "hover:border-accent-primary/30",
  },
  success: {
    icon: "bg-status-success/10 text-status-success ring-status-success/20",
    glow: "bg-status-success/5",
    bg: "hover:border-status-success/30",
  },
  warning: {
    icon: "bg-status-warning/10 text-status-warning ring-status-warning/20",
    glow: "bg-status-warning/5",
    bg: "hover:border-status-warning/30",
  },
  error: {
    icon: "bg-status-error/10 text-status-error ring-status-error/20",
    glow: "bg-status-error/5",
    bg: "hover:border-status-error/30",
  },
  info: {
    icon: "bg-status-info/10 text-status-info ring-status-info/20",
    glow: "bg-status-info/5",
    bg: "hover:border-status-info/30",
  },
};

/**
 * StatCard - Displays individual statistics with icon, value, and label.
 * Row layout optimised for sidebar/panel grids.
 */
export function StatCard({
  icon,
  value,
  label,
  color = "accent",
}: StatCardProps) {
  const styles = colorMap[color];

  return (
    <div
      className={[
        "group relative flex min-h-[5.75rem] items-center gap-3 overflow-hidden rounded-xl border border-border-subtle bg-bg-panel/60 p-3",
        "transition-all duration-300 ease-apple hover:-translate-y-0.5 hover:border-border-hover hover:shadow-elevated",
        styles.bg,
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full blur-2xl transition-opacity duration-500 opacity-0 group-hover:opacity-100",
          styles.glow,
        ].join(" ")}
      />

      <div
        className={[
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105",
          styles.icon,
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="relative z-10 min-w-0">
        <p className="truncate text-xl font-black leading-tight text-text-primary tabular-nums">
          {value}
        </p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
          {label}
        </p>
      </div>
    </div>
  );
}

export default StatCard;
