"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clamp } from "@/lib/math";
import { BarChart3, BookOpen, Brain, CalendarDays, Clock, LogOut, ScrollText, Sparkles, Swords, Timer, User } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavItemProps extends NavItem {
  active: boolean;
}

interface ProgressState {
  level: number;
  currentXP: number;
  requiredXP: number;
}

const DEFAULT_PROGRESS: ProgressState = { level: 1, currentXP: 0, requiredXP: 100 };

function SidebarNavItem({ href, label, icon, active, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      className={[
        "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 overflow-hidden",
        active
          ? "bg-accent-primary/12 text-white"
          : "text-text-muted hover:bg-bg-panel hover:text-text-secondary",
      ].join(" ")}
    >
      {/* Left accent bar for active */}
      {active && (
        <div className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-accent-primary shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
      )}

      <span
        className={[
          "shrink-0 transition-colors duration-200",
          active ? "text-accent-primary" : "text-text-muted group-hover:text-text-secondary",
        ].join(" ")}
      >
        {icon}
      </span>

      <span className="truncate">{label}</span>

      {badge && (
        <span className="ml-auto shrink-0 rounded-full bg-accent-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-primary">
          {badge}
        </span>
      )}

      {/* Hover shimmer effect */}
      {!active && (
        <div className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent transition-transform duration-500 group-hover:translate-x-[100%]" />
      )}
    </Link>
  );
}

function parseNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isNavItemActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/dashboard/insight") {
    return pathname === "/dashboard/insight" || pathname === "/dashboard/checkin";
  }
  return pathname.startsWith(itemHref);
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressState>(DEFAULT_PROGRESS);
  const [loadingProgress, setLoadingProgress] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchProgress = async () => {
      const token = localStorage.getItem("token");
      if (!token) { if (active) setLoadingProgress(false); return; }
      try {
        const response = await fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!response.ok) { if (active) setLoadingProgress(false); return; }
        const data = await response.json();
        const profile = data?.profile;
        if (!active || !profile) return;
        setProgress({
          level: Math.max(1, Math.floor(parseNumber(profile.level, DEFAULT_PROGRESS.level))),
          currentXP: Math.max(0, Math.floor(parseNumber(profile.currentXP, DEFAULT_PROGRESS.currentXP))),
          requiredXP: Math.max(100, Math.floor(parseNumber(profile.requiredXP, DEFAULT_PROGRESS.requiredXP))),
        });
      } catch { /* Keep current values */ } finally {
        if (active) setLoadingProgress(false);
      }
    };
    setLoadingProgress(true);
    void fetchProgress();
    return () => { active = false; };
  }, [pathname]);

  const progressPercent = useMemo(() => {
    if (!progress.requiredXP) return 0;
    return clamp(Math.round((progress.currentXP / progress.requiredXP) * 100), 0, 100);
  }, [progress.currentXP, progress.requiredXP]);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userProfile");
    router.replace("/?mode=signin");
  };

  const navItems: NavItem[] = [
    { href: "/dashboard/insight", label: "Daily Log", icon: <ScrollText className="h-4.5 w-4.5" /> },
    { href: "/dashboard/quest", label: "Quest Board", icon: <Swords className="h-4.5 w-4.5" /> },
    { href: "/dashboard/chat", label: "Companion", icon: <Sparkles className="h-4.5 w-4.5" /> },
    { href: "/dashboard/journal", label: "Journal", icon: <BookOpen className="h-4.5 w-4.5" /> },
    { href: "/dashboard/focus", label: "Focus", icon: <Timer className="h-4.5 w-4.5" /> },
    { href: "/dashboard/analytics", label: "Analytics", icon: <BarChart3 className="h-4.5 w-4.5" /> },
    { href: "/dashboard/timeline", label: "Timeline", icon: <CalendarDays className="h-4.5 w-4.5" /> },
    { href: "/dashboard/history", label: "History", icon: <Clock className="h-4.5 w-4.5" /> },
  ];

  return (
    <aside className="fixed z-[1000] flex h-screen flex-col border-r border-border bg-bg-sidebar w-[var(--sidebar-width)]">
      {/* Header / Logo */}
      <div className="flex h-[60px] items-center gap-2.5 px-5 border-b border-border/40">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-primary shadow-[0_0_14px_rgba(139,92,246,0.45)]">
          <Brain className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[13px] font-bold tracking-tight text-white">Digital Twin</span>
          <span className="text-[10px] text-text-muted mt-0.5 font-medium">Personal Intelligence</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <div className="mb-3 px-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted/60">Navigation</span>
        </div>
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isNavItemActive(item.href, pathname)}
            badge={item.badge}
          />
        ))}
      </nav>

      {/* User Widget */}
      <div className="border-t border-border/40 p-3 space-y-2">
        <Link
          href="/dashboard/profile"
          className="group flex items-center gap-3 rounded-xl p-2.5 transition-all duration-200 hover:bg-bg-panel border border-transparent hover:border-border/60"
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-accent-primary to-fuchsia-500 p-[2px] shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-transform duration-200 group-hover:scale-105">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-card">
                <User className="h-4 w-4 text-white" strokeWidth={2} />
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-status-success border-2 border-bg-sidebar" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-semibold text-white truncate group-hover:text-accent-primary transition-colors">
                Level {loadingProgress ? "–" : progress.level}
              </span>
              <span className="text-[11px] font-bold text-accent-primary shrink-0 ml-1">
                {loadingProgress ? "…" : `${progress.currentXP} XP`}
              </span>
            </div>
            {/* XP Bar */}
            <div className="h-1.5 w-full rounded-full bg-bg-base/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-primary shadow-[0_0_6px_rgba(139,92,246,0.6)] transition-all duration-700 ease-out"
                style={{ width: loadingProgress ? "0%" : `${progressPercent}%` }}
              />
            </div>
          </div>
        </Link>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-text-muted hover:text-status-error hover:bg-status-error/8 border border-transparent hover:border-status-error/20 transition-all duration-200"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
