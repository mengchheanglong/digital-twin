"use client";

import React from "react";

export interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: "accent" | "success" | "warning" | "error" | "info";
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
        "group relative flex items-center gap-4 overflow-hidden rounded-xl border border-border-subtle bg-bg-panel/60 p-4",
        "transition-all duration-300 ease-apple hover:-translate-y-0.5 hover:shadow-elevated",
        styles.bg,
      ].join(" ")}
    >
      {/* Glow orb */}
      <div
        className={[
          "pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full blur-2xl transition-opacity duration-500 opacity-0 group-hover:opacity-100",
          styles.glow,
        ].join(" ")}
      />

      {/* Icon */}
      <div
        className={[
          "relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-110",
          styles.icon,
        ].join(" ")}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="relative z-10 min-w-0">
        <p className="truncate text-lg font-black leading-tight text-text-primary">
          {value}
        </p>
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}

export default StatCard;
