"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "relative overflow-hidden",
    "bg-gradient-to-r from-accent-primary to-accent-hover",
    "text-white font-semibold",
    "shadow-glow-soft hover:shadow-glow",
    "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]",
    "before:absolute before:inset-0 before:bg-white/0 before:hover:bg-white/10 before:transition-colors before:duration-200",
  ].join(" "),
  secondary: [
    "bg-bg-card border border-border text-text-primary font-medium",
    "hover:border-border-hover hover:bg-bg-hover",
    "active:scale-[0.97]",
  ].join(" "),
  ghost: [
    "bg-transparent text-text-secondary font-medium",
    "hover:bg-bg-hover hover:text-text-primary",
    "active:scale-[0.97]",
  ].join(" "),
  danger: [
    "bg-status-error/10 border border-status-error/30 text-status-error font-semibold",
    "hover:bg-status-error hover:text-white hover:shadow-glow-soft",
    "active:scale-[0.97]",
  ].join(" "),
  success: [
    "bg-status-success/10 border border-status-success/30 text-status-success font-semibold",
    "hover:bg-status-success hover:text-white hover:shadow-glow-soft",
    "active:scale-[0.97]",
  ].join(" "),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-base rounded-xl gap-2.5",
};

const iconSizeMap: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          "inline-flex items-center justify-center",
          "transition-all duration-200 ease-apple",
          "focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth ? "w-full" : "",
          className,
        ].join(" ")}
        {...props}
      >
        {loading ? (
          <Loader2 size={iconSizeMap[size]} className="animate-spin" />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span className="relative z-10">{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
