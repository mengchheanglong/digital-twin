"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clamp } from "@/lib/math";
import {
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
  ScrollText,
  Sparkles,
  Swords,
  Timer,
} from "lucide-react";
import { getAvatarTier } from "@/lib/progression";
import { Tooltip, ProgressBar } from "@/components/ui";
import ThemeToggle from "@/components/theme/ThemeToggle";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavItemProps extends NavItem {
  active: boolean;
  isExpanded: boolean;
}

interface ProgressState {
  level: number;
  currentXP: number;
  requiredXP: number;
}

const DEFAULT_PROGRESS: ProgressState = { level: 1, currentXP: 0, requiredXP: 100 };

function SidebarNavItem({ href, label, icon, active, badge, isExpanded }: NavItemProps) {
  return (
    <Link
      href={href}
      className={[
        "group relative flex items-center rounded-xl py-2 px-3 mx-3 text-sm font-medium transition-all duration-500 ease-apple overflow-hidden active:scale-[0.97]",
        active
          ? "bg-accent-subtle text-text-primary shadow-inner-glow ring-1 ring-accent-primary/20"
          : "text-text-muted hover:text-text-primary hover:bg-bg-hover",
      ].join(" ")}
    >
      {active && (
        <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-accent-primary shadow-glow animate-fade-in" />
      )}

      <span
        className={[
          "shrink-0 flex justify-center items-center w-6 h-6 transition-all duration-500 ease-apple",
          active
            ? "text-accent-primary scale-110"
            : "text-text-muted group-hover:text-accent-primary group-hover:scale-110",
        ].join(" ")}
      >
        {icon}
      </span>

      <span
        className={`truncate transition-all duration-500 ease-apple ${
          isExpanded
            ? "ml-3 opacity-100 max-w-[200px] translate-x-0 group-hover:translate-x-0.5"
            : "ml-0 opacity-0 max-w-0 -translate-x-2"
        }`}
      >
        {label}
      </span>

      {badge && (
        <span
          className={`ml-auto shrink-0 rounded-full bg-accent-subtle text-[10px] font-bold text-accent-primary ring-1 ring-accent-primary/30 transition-all duration-500 ease-apple overflow-hidden whitespace-nowrap ${
            isExpanded
              ? "px-1.5 py-0.5 opacity-100 max-w-[50px] scale-100"
              : "p-0 opacity-0 max-w-0 scale-50"
          }`}
        >
          {badge}
        </span>
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

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressState>(DEFAULT_PROGRESS);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [mounted, setMounted] = useState(false);

  const isExpanded = !isCollapsed;

  const avatarTier = getAvatarTier(loadingProgress ? 1 : progress.level);
  const AvatarIcon = avatarTier.icon;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;
    const fetchProgress = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        if (active) setLoadingProgress(false);
        return;
      }
      try {
        const response = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) {
          if (active) setLoadingProgress(false);
          return;
        }
        const data = await response.json();
        const profile = data?.profile;
        if (!active || !profile) return;
        setProgress({
          level: Math.max(1, Math.floor(parseNumber(profile.level, DEFAULT_PROGRESS.level))),
          currentXP: Math.max(0, Math.floor(parseNumber(profile.currentXP, DEFAULT_PROGRESS.currentXP))),
          requiredXP: Math.max(100, Math.floor(parseNumber(profile.requiredXP, DEFAULT_PROGRESS.requiredXP))),
        });
      } catch {
        /* Keep current values */
      } finally {
        if (active) setLoadingProgress(false);
      }
    };
    setLoadingProgress(true);
    void fetchProgress();

    const handleProgressUpdate = () => {
      void fetchProgress();
    };
    window.addEventListener("user-progression-update", handleProgressUpdate);

    return () => {
      active = false;
      window.removeEventListener("user-progression-update", handleProgressUpdate);
    };
  }, []);

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
    <aside
      className={`fixed z-[1000] flex h-screen flex-col border-r border-border-subtle bg-bg-sidebar backdrop-blur-xl transition-[width] duration-500 ease-apple overflow-hidden ${
        isExpanded ? "w-[var(--sidebar-width)]" : "w-[var(--sidebar-width-collapsed)]"
      }`}
    >
      {/* Top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-32 w-full bg-gradient-to-b from-accent-primary/5 to-transparent pointer-events-none" />

      {/* Header / Logo */}
      <div className="group/header relative flex h-[72px] items-center border-b border-border-subtle px-[18px]">
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 h-24 w-32 bg-accent-primary/10 rounded-full blur-2xl pointer-events-none" />

        {/* Fixed Logo Spine */}
        <div className="relative shrink-0 flex h-9 w-9 items-center justify-center animate-float">
          <div
            className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-tr from-accent-primary to-accent-hover shadow-glow-soft ring-1 ring-border transition-all duration-300 ease-apple ${
              !isExpanded &&
              "group-hover/header:opacity-0 group-hover/header:rotate-[-10deg] group-hover/header:scale-75"
            }`}
          >
            <Brain className="h-5 w-5 text-text-inverse" />
          </div>

          {!isExpanded && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="absolute inset-0 m-auto z-50 flex h-9 w-9 items-center justify-center rounded-[10px] text-text-primary bg-bg-card/95 backdrop-blur-xl border border-border shadow-glow-soft opacity-0 scale-75 rotate-[10deg] pointer-events-none group-hover/header:opacity-100 group-hover/header:scale-100 group-hover/header:rotate-0 group-hover/header:pointer-events-auto transition-all duration-300 ease-apple hover:bg-bg-panel hover:text-accent-primary"
            >
              <ChevronRight className="h-4.5 w-4.5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Wordmark */}
        <div
          className={`relative z-10 flex flex-col leading-none transition-all duration-500 ease-apple overflow-hidden ${
            isExpanded
              ? "ml-3 opacity-100 max-w-[160px] translate-x-0"
              : "ml-0 opacity-0 max-w-0 -translate-x-4"
          }`}
        >
          <span className="text-[14px] font-bold tracking-tight text-text-primary drop-shadow-sm whitespace-nowrap">
            Digital Twin
          </span>
          <span className="text-[11px] text-text-muted mt-0.5 font-medium whitespace-nowrap">
            Personal Intelligence
          </span>
        </div>

        {/* Collapse Button (Only shown when expanded) pinned to far right */}
        {isExpanded && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title="Collapse Sidebar"
            className="absolute right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all duration-500 ease-apple opacity-100 scale-100 h-7 w-7 flex justify-center items-center shrink-0 focus-ring"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-1.5 scrollbar-hide">
        <div
          className={`transition-all duration-500 ease-apple overflow-hidden ${
            isExpanded ? "px-6 mb-2 opacity-100 max-w-[200px]" : "opacity-0 max-w-0 h-0 m-0"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted/60 whitespace-nowrap">
            Navigation
          </span>
        </div>
        {navItems.map((item, index) => {
          const link = (
            <SidebarNavItem
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isNavItemActive(item.href, pathname)}
              badge={item.badge}
              isExpanded={isExpanded}
            />
          );
          return (
            <div
              key={item.href}
              className="w-full animate-fade-in"
              style={{ opacity: 0, animationDelay: `${index * 35}ms` }}
            >
              {!isExpanded ? (
                <Tooltip content={item.label} position="right" delay={100}>
                  {link}
                </Tooltip>
              ) : (
                link
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-border-subtle space-y-2 p-3">
        {/* User Widget */}
        <Link
          href="/dashboard/profile"
          title={!isExpanded ? "Profile & Stats" : undefined}
          className="group w-full relative flex items-center rounded-xl px-[6px] py-2 transition-all duration-500 ease-apple hover:bg-bg-hover border border-transparent hover:border-border-subtle hover:shadow-card active:scale-[0.98] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/0 via-accent-primary/5 to-transparent opacity-0 transition-opacity duration-500 ease-apple group-hover:opacity-100" />

          <div className="relative shrink-0 z-10 w-9 h-9">
            <div
              className={`h-full w-full rounded-full bg-gradient-to-br ${avatarTier.colors} p-[2px] ${avatarTier.glow} transition-transform duration-500 ease-apple group-hover:scale-105 group-hover:rotate-3`}
            >
              <div
                className={`flex h-full w-full items-center justify-center rounded-full bg-bg-card backdrop-blur-md ${avatarTier.animation}`}
              >
                <AvatarIcon className={`h-4.5 w-4.5 ${avatarTier.text}`} strokeWidth={2} />
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-status-success border-2 border-bg-sidebar shadow-sm transition-transform duration-500 group-hover:scale-110" />
          </div>

          <div
            className={`flex-1 min-w-0 z-10 transition-all duration-500 ease-apple overflow-hidden ${
              isExpanded
                ? "ml-3 opacity-100 max-w-[200px] translate-x-0"
                : "ml-0 opacity-0 max-w-0 -translate-x-2"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5 w-full pr-1">
              <span className="text-[13px] font-semibold text-text-primary whitespace-nowrap group-hover:text-accent-primary transition-colors duration-500 ease-apple">
                Level {loadingProgress ? "–" : progress.level}
              </span>
              <span className="text-[11px] font-bold text-accent-primary shrink-0 ml-1 drop-shadow-sm">
                {loadingProgress ? "…" : `${progress.currentXP} XP`}
              </span>
            </div>
            <ProgressBar
              value={loadingProgress ? 0 : progress.currentXP}
              max={progress.requiredXP}
              size="sm"
              shimmer={true}
              className="mt-1"
            />
          </div>
        </Link>

        {/* Theme Toggle */}
        <div
          title={!isExpanded ? "Theme" : undefined}
          className="w-full flex items-center rounded-xl px-[6px] py-1.5 transition-all duration-500 ease-apple overflow-hidden"
        >
          <div className="shrink-0 flex h-8 w-8 items-center justify-center">
            {mounted ? (
              <ThemeToggle size="sm" className="shrink-0" />
            ) : (
              <div className="h-8 w-8 shrink-0 rounded-xl border border-border bg-bg-card" />
            )}
          </div>
          <span
            className={`transition-all duration-500 ease-apple overflow-hidden whitespace-nowrap text-sm font-medium text-text-secondary ${
              isExpanded
                ? "ml-3 opacity-100 max-w-[100px] translate-x-0"
                : "ml-0 opacity-0 max-w-0 -translate-x-2"
            }`}
          >
            Theme
          </span>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          type="button"
          title={!isExpanded ? "Sign Out" : undefined}
          className="group w-full flex items-center rounded-xl p-2.5 px-3 text-xs font-semibold text-text-muted hover:text-status-error hover:bg-status-error/10 border border-transparent hover:border-status-error/20 active:scale-[0.98] transition-all duration-500 ease-apple shadow-sm hover:shadow-card overflow-hidden"
        >
          <span className="shrink-0 flex justify-center items-center w-6 h-6 transition-transform duration-500 group-hover:-translate-x-0.5">
            <LogOut className="h-4.5 w-4.5" />
          </span>
          <span
            className={`transition-all duration-500 ease-apple overflow-hidden whitespace-nowrap ${
              isExpanded
                ? "ml-3 opacity-100 max-w-[100px] translate-x-0"
                : "ml-0 opacity-0 max-w-0 -translate-x-2"
            }`}
          >
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
}
