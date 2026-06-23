import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, error, className = "", ...props }, ref) => {
    return (
      <div className="relative w-full">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          className={[
            "w-full bg-bg-input border text-text-primary placeholder:text-text-muted",
            "rounded-xl px-4 py-2.5 text-sm",
            "transition-all duration-200 ease-apple",
            "focus:outline-none focus:ring-2",
            leftIcon ? "pl-10" : "",
            error
              ? "border-status-error focus:border-status-error focus:ring-status-error/20"
              : "border-border focus:border-accent-primary focus:ring-accent-subtle",
            className,
          ].join(" ")}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
