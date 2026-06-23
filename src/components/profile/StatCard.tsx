"use client";

import React from "react";

export type StatColor = "warning" | "success" | "accent" | "info";

export interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: StatColor;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
}

const surfaceMap: Record<StatColor, string> = {
  warning: "surface-warning",
  success: "surface-success",
  accent: "surface-accent",
  info: "surface-info",
};

const trendColorMap = {
  up: "text-status-success",
  down: "text-status-error",
};

/**
 * StatCard - Displays individual statistics with icon, value, and label
 * Used in a 2x2 grid layout for main stats
 */
export function StatCard({ icon, value, label, color, trend }: StatCardProps) {
  const surfaceClass = surfaceMap[color];
  const compactValue = typeof value === "string" && value.length > 10;

  return (
    <div
      className={`
        group relative flex flex-col rounded-2xl p-5
        bg-bg-card/80 border border-border backdrop-blur-xl
        hover:border-accent-primary/30 transition-all duration-500 ease-apple
        hover:-translate-y-1 hover:shadow-elevated shadow-card overflow-hidden
      `}
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-accent-primary/10 blur-[40px] opacity-0 transition-all duration-700 ease-apple group-hover:opacity-100" />

      {/* Icon Wrapper */}
      <div
        className={`
          relative z-10 flex h-11 w-11 items-center justify-center rounded-xl shadow-inner ring-1 ring-border
          transition-transform duration-500 ease-spring group-hover:scale-110 group-hover:rotate-3
          ${surfaceClass}
        `}
      >
        {icon}
      </div>

      {/* Value */}
      <div className="relative z-10 mt-3 flex items-baseline gap-2">
        <span className={`${compactValue ? "text-lg" : "text-2xl"} font-bold text-text-primary`}>
          {value}
        </span>

        {/* Trend indicator */}
        {trend && (
          <span className={`text-sm font-medium ${trendColorMap[trend.direction]}`}>
            {trend.direction === "up" ? "+" : "-"} {trend.value}%
          </span>
        )}
      </div>

      {/* Label */}
      <span className="relative z-10 mt-0.5 text-sm font-medium text-text-secondary">
        {label}
      </span>

      {/* Subtle gradient overlay on hover */}
      <div
        className={`
          absolute inset-0 rounded-2xl bg-gradient-to-br from-bg-hover to-transparent
          opacity-0 group-hover:opacity-100 transition-opacity duration-300
          pointer-events-none
        `}
      />
    </div>
  );
}

export default StatCard;
