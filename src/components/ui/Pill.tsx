import React from "react";

export type PillTone = "default" | "success" | "warning" | "error" | "info" | "accent";

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
}

const toneStyles: Record<PillTone, string> = {
  default: "bg-surface-200 text-text-secondary",
  success: "bg-status-success/10 text-status-success",
  warning: "bg-status-warning/10 text-status-warning",
  error: "bg-status-error/10 text-status-error",
  info: "bg-status-info/10 text-status-info",
  accent: "bg-accent-subtle text-accent-primary",
};

const Pill = React.forwardRef<HTMLSpanElement, PillProps>(
  ({ tone = "default", children, className = "", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={[
          "inline-flex items-center rounded-full px-2.5 py-0.5",
          "text-xs font-semibold",
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

Pill.displayName = "Pill";

export default Pill;
