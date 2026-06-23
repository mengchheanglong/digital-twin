import React from "react";

export type BadgeTone = "default" | "success" | "warning" | "error" | "info" | "accent";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneStyles: Record<BadgeTone, string> = {
  default: "bg-surface-300 text-text-secondary border-surface-400",
  success: "bg-status-success/10 text-status-success border-status-success/25",
  warning: "bg-status-warning/10 text-status-warning border-status-warning/25",
  error: "bg-status-error/10 text-status-error border-status-error/25",
  info: "bg-status-info/10 text-status-info border-status-info/25",
  accent: "bg-accent-subtle text-accent-primary border-accent-primary/25",
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ tone = "default", children, className = "", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={[
          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5",
          "text-[10px] font-bold uppercase tracking-wide",
          toneStyles[tone],
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export default Badge;
