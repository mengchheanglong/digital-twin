import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  resize?: "none" | "vertical" | "horizontal" | "both";
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, resize = "vertical", className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={[
          "w-full bg-bg-input border text-text-primary placeholder:text-text-muted",
          "rounded-xl px-4 py-2.5 text-sm",
          "transition-all duration-200 ease-apple",
          "focus:outline-none focus:ring-2",
          error
            ? "border-status-error focus:border-status-error focus:ring-status-error/20"
            : "border-border focus:border-accent-primary focus:ring-accent-subtle",
          className,
        ].join(" ")}
        style={{ resize }}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
