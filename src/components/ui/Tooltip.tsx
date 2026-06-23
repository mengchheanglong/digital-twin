"use client";

import React, { useState } from "react";

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

const positionClasses: Record<string, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export default function Tooltip({ content, children, position = "top", delay = 200 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    const t = setTimeout(() => setVisible(true), delay);
    setTimer(t);
  };

  const hide = () => {
    if (timer) clearTimeout(timer);
    setVisible(false);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          className={[
            "absolute z-50 whitespace-nowrap",
            "rounded-lg bg-bg-card border border-border px-2.5 py-1",
            "text-xs font-medium text-text-primary shadow-elevated",
            "animate-scale-in pointer-events-none",
            positionClasses[position],
          ].join(" ")}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
