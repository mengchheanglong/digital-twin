"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clamp } from "@/lib/math";
import { BarChart3, BookOpen, CalendarDays, Clock, LogOut, ScrollText, Sparkles, Swords, Timer, User } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavItemProps extends NavItem {
  active: boolean;
}

interface ProgressState {
  level: number;
  currentXP: number;
  requiredXP: number;
}

const DEFAULT_PROGRESS: ProgressState = {
  level: 1,
  currentXP: 0,
  requiredXP: 100,
};

function SidebarNavItem({ href, label, icon, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={[
        "group flex items-center gap-3 rounded-xl px-4 py-3 text-[0.95rem] font-medium transition-all duration-300 relative",
        active
          ? "bg-accent-primary/10 text-white shadow-sm ring-1 ring-accent-primary/20"
          : "text-text-secondary hover:bg-bg-panel hover:text-white",
      ].join(" ")}
    >
      <span
        className={
          active
            ? "text-accent-primary"
            : "text-text-muted group-hover:text-text-secondary transition-colors"
        }
      >
        {icon}
      </span>
      <span>{label}</span>
      {active && (
        <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-accent-primary shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
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
    return (
      pathname === "/dashboard/insight" || pathname === "/dashboard/checkin"
    );
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

        if (!active || !profile) {
          return;
        }

        const nextProgress: ProgressState = {
          level: Math.max(
            1,
            Math.floor(parseNumber(profile.level, DEFAULT_PROGRESS.level)),
          ),
          currentXP: Math.max(
            0,
            Math.floor(
              parseNumber(profile.currentXP, DEFAULT_PROGRESS.currentXP),
            ),
          ),
          requiredXP: Math.max(
            100,
            Math.floor(
              parseNumber(profile.requiredXP, DEFAULT_PROGRESS.requiredXP),
            ),
          ),
        };

        setProgress(nextProgress);
      } catch {
        // Keep current values on fetch failure.
      } finally {
        if (active) {
          setLoadingProgress(false);
        }
      }
    };

    setLoadingProgress(true);
    void fetchProgress();

    return () => {
      active = false;
    };
  }, [pathname]);

  const progressPercent = useMemo(() => {
    if (!progress.requiredXP) return 0;
    return clamp(
      Math.round((progress.currentXP / progress.requiredXP) * 100),
      0,
      100,
    );
  }, [progress.currentXP, progress.requiredXP]);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userProfile");
    router.replace("/?mode=signin");
  };

  const navItems: NavItem[] = [
    {
      href: "/dashboard/insight",
      label: "Log",
      icon: <ScrollText className="h-5 w-5" />,
    },
    {
      href: "/dashboard/quest",
      label: "Quest",
      icon: <Swords className="h-5 w-5" />,
    },
    {
      href: "/dashboard/chat",
      label: "Companion",
      icon: <Sparkles className="h-5 w-5" />,
    },
    {
      href: "/dashboard/journal",
      label: "Journal",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      href: "/dashboard/focus",
      label: "Focus",
      icon: <Timer className="h-5 w-5" />,
    },
    {
      href: "/dashboard/analytics",
      label: "Analytics",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      href: "/dashboard/timeline",
      label: "Timeline",
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      href: "/dashboard/history",
      label: "History",
      icon: <Clock className="h-5 w-5" />,
    },
  ];

  return (
    <aside
      className={[
        "fixed z-[1000] flex h-screen flex-col border-r border-border",
        "bg-bg-sidebar",
        "w-[var(--sidebar-width)]",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex h-20 items-center justify-center px-6 border-b border-border/50">
        <div className="flex items-center justify-center">
          <span className="text-base font-bold text-white tracking-wide">
            Digital Twin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isNavItemActive(item.href, pathname)}
          />
        ))}
      </nav>

      {/* User Widget */}
      <div className="p-4 border-t border-border/50 bg-bg-sidebar/80 backdrop-blur-md">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 w-full group transition-all duration-300 hover:bg-bg-panel rounded-xl p-3 border border-transparent hover:border-border"
        >
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-linear-to-br from-accent-primary to-fuchsia-500 p-[2px] shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-transform duration-300 group-hover:scale-105">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-card">
                <User className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-status-success rounded-full border-[2.5px] border-bg-sidebar" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-white truncate group-hover:text-accent-primary transition-colors">
                Unit Lvl {progress.level}
              </p>
              <span className="text-xs text-accent-primary font-bold">
                {progress.currentXP} XP
              </span>
            </div>
            <div className="h-1.5 w-full bg-bg-base/50 rounded-full overflow-hidden border border-border/30">
              <div
                className="h-full bg-accent-primary rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </Link>

        <button
          onClick={handleSignOut}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-bg-panel/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-muted hover:bg-bg-panel hover:text-white border border-transparent hover:border-border transition-all duration-300"
          type="button"
        >
          <LogOut className="h-4 w-4" />
          <span>Disconnect</span>
        </button>
      </div>
    </aside>
  );
}
