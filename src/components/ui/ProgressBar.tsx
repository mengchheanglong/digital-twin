import React from "react";

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  shimmer?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ value, max = 100, label, showPercentage = false, size = "md", shimmer = false, className = "" }, ref) => {
    const clamped = Math.max(0, Math.min(100, (value / max) * 100));

    return (
      <div ref={ref} className={["w-full space-y-1.5", className].join(" ")}>
        {(label || showPercentage) && (
          <div className="flex items-center justify-between">
            {label && <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</span>}
            {showPercentage && (
              <span className="text-xs font-bold text-text-primary">{Math.round(clamped)}%</span>
            )}
          </div>
        )}
        <div className={["w-full overflow-hidden rounded-full bg-bg-input ring-1 ring-border/50", sizeMap[size]].join(" ")}>
          <div
            className={[
              "relative h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-hover transition-all duration-700 ease-spring",
              shimmer ? "progress-shimmer" : "",
            ].join(" ")}
            style={{ width: `${clamped}%` }}
          >
            {!shimmer && (
              <div className="absolute top-0 right-0 bottom-0 w-6 bg-gradient-to-l from-white/20 to-transparent rounded-full" />
            )}
          </div>
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";

export default ProgressBar;
