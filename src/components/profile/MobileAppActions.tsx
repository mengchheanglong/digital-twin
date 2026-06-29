"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  LogOut,
  Timer,
} from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { Card } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";

const shortcuts = [
  {
    href: "/dashboard/focus",
    label: "Focus",
    icon: <Timer className="h-4.5 w-4.5" />,
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: <BarChart3 className="h-4.5 w-4.5" />,
  },
  {
    href: "/dashboard/timeline",
    label: "Timeline",
    icon: <CalendarDays className="h-4.5 w-4.5" />,
  },
  {
    href: "/dashboard/history",
    label: "History",
    icon: <Clock className="h-4.5 w-4.5" />,
  },
  {
    href: "/dashboard/checkin",
    label: "Check-in",
    icon: <CheckCircle2 className="h-4.5 w-4.5" />,
  },
];

export function MobileAppActions() {
  const { signOut } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-4 md:hidden">
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-text-muted">
          More from Digital Twin
        </h2>
        <div className="grid gap-2">
          {shortcuts.map((shortcut) => (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className="flex min-h-[44px] items-center gap-3 rounded-xl border border-border bg-bg-panel px-3 py-2.5 text-sm font-semibold text-text-primary transition-all duration-300 ease-apple hover:border-border-hover hover:bg-bg-hover active:scale-[0.98] focus-ring"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-subtle text-accent-primary">
                {shortcut.icon}
              </span>
              <span>{shortcut.label}</span>
            </Link>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-text-muted">
          App settings
        </h2>
        <div className="space-y-2">
          <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-border bg-bg-panel px-3 py-2.5">
            <span className="text-sm font-semibold text-text-primary">Theme</span>
            {mounted ? (
              <ThemeToggle size="md" />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-xl border border-border bg-bg-card" />
            )}
          </div>

          <button
            type="button"
            onClick={signOut}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-status-error/30 bg-status-error/10 px-3 py-2.5 text-sm font-semibold text-status-error transition-all duration-300 ease-apple hover:bg-status-error hover:text-white active:scale-[0.98] focus-ring"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Sign out</span>
          </button>
        </div>
      </Card>
    </div>
  );
}

export default MobileAppActions;
