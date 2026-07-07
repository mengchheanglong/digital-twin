"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import ErrorBoundary from "../../components/ErrorBoundary";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const isChatPage = pathname === "/dashboard/chat";

  return (
    <div className="min-h-screen">
      <Sidebar isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} />
      <main
        className={`relative min-h-screen w-full overflow-x-hidden bg-bg-base transition-all duration-500 ease-apple safe-bottom-padding ${
          isCollapsed
            ? "md:ml-[var(--sidebar-width-collapsed)] md:w-[calc(100%-var(--sidebar-width-collapsed))]"
            : "md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))]"
        }`}
      >
        {/* Ambient background glow */}
        <div className="absolute left-1/2 top-0 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-accent-primary/5 blur-[100px] pointer-events-none sm:left-1/4 sm:h-[800px] sm:w-[800px] sm:translate-x-0 sm:blur-[150px]" />

        {/* Subtle dot pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle, color-mix(in srgb, var(--color-border) 25%, transparent) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div
          className={[
            "relative z-10 w-full",
            isChatPage
              ? "h-screen overflow-hidden"
              : "mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-8",
          ].join(" ")}
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
