import React from "react";

export type CardVariant = "default" | "elevated" | "glass" | "interactive";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  glow?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: [
    "bg-bg-card border border-border",
    "shadow-card",
  ].join(" "),
  elevated: [
    "bg-bg-card border border-border",
    "shadow-elevated",
  ].join(" "),
  glass: [
    "glass",
  ].join(" "),
  interactive: [
    "bg-bg-card border border-border shadow-card",
    "transition-all duration-300 ease-apple",
    "hover:-translate-y-1 hover:shadow-elevated hover:border-border-hover",
    "active:scale-[0.99] cursor-pointer",
  ].join(" "),
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", glow = false, children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          "rounded-2xl overflow-hidden",
          variantStyles[variant],
          glow ? "ring-1 ring-accent-primary/20 shadow-glow-soft" : "",
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
