"use client";

import React from "react";

export type StatColor = "amber" | "emerald" | "violet" | "cyan";

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

// Color mapping for different stat types
const colorMap: Record<StatColor, { iconBg: string; iconColor: string }> = {
  amber: {
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
  },
  emerald: {
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  violet: {
    iconBg: "bg-violet-500/20",
    iconColor: "text-violet-400",
  },
  cyan: {
    iconBg: "bg-cyan-500/20",
    iconColor: "text-cyan-400",
  },
};

/**
 * StatCard - Displays individual statistics with icon, value, and label
 * Used in a 2x2 grid layout for main stats

/**
 * StatCard - Displays individual statistics with icon, value, and label
 * Used in a 2x2 grid layout for main stats
 */
export function StatCard({ icon, value, label, color, trend }: StatCardProps) {
  const colors = colorMap[color];
  const compactValue = typeof value === "string" && value.length > 10;

  return (
    <div
      className={`
        group relative flex flex-col rounded-2xl p-5 
        bg-bg-card/80 border border-white/5 backdrop-blur-xl 
        hover:border-accent-primary/30 transition-all duration-500 ease-apple
        hover:-translate-y-1 hover:shadow-stripe-hover shadow-card overflow-hidden
      `}
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5 blur-[40px] opacity-0 transition-all duration-700 ease-apple group-hover:opacity-100 group-hover:bg-accent-primary/20" />
      {/* Icon Wrapper */}
      <div
        className={`
          flex h-11 w-11 items-center justify-center rounded-xl shadow-inner ring-1 ring-white/10
          transition-transform duration-500 ease-spring group-hover:scale-110 group-hover:rotate-3
          ${colors.iconBg}
        `}
      >
        <span className={colors.iconColor}>{icon}</span>
      </div>

      {/* Value */}
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`${compactValue ? "text-lg" : "text-2xl"} font-bold text-white`}>
          {value}
        </span>
        
        {/* Trend indicator */}
        {trend && (
          <span
            className={`
              text-sm font-medium
              ${trend.direction === "up" ? "text-emerald-400" : "text-red-400"}
            `}
          >
            {trend.direction === "up" ? "+" : "-"} {trend.value}%
          </span>
        )}
      </div>

      {/* Label */}
      <span className="mt-0.5 text-sm font-medium text-gray-400">{label}</span>

      {/* Subtle gradient overlay on hover */}
      <div
        className={`
          absolute inset-0 rounded-2xl bg-linear-to-br from-white/5 to-transparent
          opacity-0 group-hover:opacity-100 transition-opacity duration-300
          pointer-events-none
        `}
      />
    </div>
  );
}

export default StatCard;
