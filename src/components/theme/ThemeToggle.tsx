"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const iconSizeMap = {
  sm: 16,
  md: 18,
  lg: 22,
};

export default function ThemeToggle({ className = "", size = "md" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={[
        "relative inline-flex items-center justify-center rounded-xl",
        "border border-border bg-bg-card text-text-secondary",
        "transition-all duration-300 ease-apple",
        "hover:text-accent-primary hover:border-accent-primary/30 hover:shadow-glow-soft",
        "active:scale-95 focus-ring",
        sizeMap[size],
        className,
      ].join(" ")}
    >
      <span
        className={[
          "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-apple",
          theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50",
        ].join(" ")}
      >
        <Moon size={iconSizeMap[size]} strokeWidth={2} />
      </span>
      <span
        className={[
          "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-apple",
          theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50",
        ].join(" ")}
      >
        <Sun size={iconSizeMap[size]} strokeWidth={2} />
      </span>
    </button>
  );
}
