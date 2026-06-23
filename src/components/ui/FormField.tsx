import React from "react";

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export default function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={["space-y-1.5", className].join(" ")}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-semibold text-text-primary"
        >
          {label}
        </label>
      )}
      <div>{children}</div>
      {error ? (
        <p className="text-xs font-medium text-status-error animate-fade-in">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
