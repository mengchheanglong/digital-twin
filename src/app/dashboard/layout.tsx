"use client";

import Sidebar from "../../components/Sidebar";
import ErrorBoundary from "../../components/ErrorBoundary";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="min-h-screen ml-[var(--sidebar-width)] w-[calc(100%-var(--sidebar-width))] relative overflow-x-hidden bg-bg-base">
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
