"use client";

import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import ErrorBoundary from "../../components/ErrorBoundary";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} />
      <main 
        className={`min-h-screen transition-all duration-300 ease-apple relative overflow-x-hidden bg-bg-base ${
          isCollapsed 
            ? "ml-[var(--sidebar-width-collapsed)] w-[calc(100%-var(--sidebar-width-collapsed))]" 
            : "ml-[var(--sidebar-width)] w-[calc(100%-var(--sidebar-width))]"
        }`}
      >
        {/* Subtle Ambient Background Glow for Dashboard */}
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-accent-primary/5 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 relative z-10">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
