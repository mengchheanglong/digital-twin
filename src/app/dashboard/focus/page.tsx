"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  Pause,
  Play,
  Plus,
  StopCircle,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Button,
  Card,
  Badge,
  Input,
  Textarea,
  EmptyState,
  Skeleton,
  useToast,
} from "@/components/ui";

interface FocusSession {
  _id: string;
  label: string;
  durationMinutes: number;
  elapsedMinutes?: number;
  startedAt: string;
  endedAt?: string;
  completed: boolean;
  notes?: string;
}

const PRESET_DURATIONS = [15, 25, 30, 45, 60, 90];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Active Timer ─────────────────────────────────────────────────────────────

function ActiveTimer({
  session,
  onComplete,
  onAbandon,
}: {
  session: FocusSession;
  onComplete: (s: FocusSession) => void;
  onAbandon: () => void;
}) {
  const totalSeconds = session.durationMinutes * 60;
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { getAuthHeaders } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e >= totalSeconds) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return totalSeconds;
        }
        return e + 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, totalSeconds]);

  const progress = Math.min(100, (elapsed / totalSeconds) * 100);
  const isFinished = elapsed >= totalSeconds;
  const circumference = 2 * Math.PI * 54; // r=54
  const strokeDashoffset = circumference - (circumference * progress) / 100;

  const handleComplete = async (completed: boolean) => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/focus/${session._id}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          completed,
          elapsedMinutes: Math.round(elapsed / 60),
          notes: notes.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { session: FocusSession };
        onComplete(data.session);
        if (completed) {
          toast({
            variant: "success",
            title: "Session complete",
            description: `Great work! You focused for ${formatDuration(
              Math.round(elapsed / 60)
            )}.`,
          });
        }
      } else {
        const err = (await res.json()) as { msg?: string };
        toast({
          variant: "error",
          title: "Failed to save session",
          description: err.msg ?? "Something went wrong.",
        });
      }
    } catch {
      toast({
        variant: "error",
        title: "Failed to save session",
        description: "Network error. Please try again.",
      });
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Card
      variant="elevated"
      glow
      className="relative overflow-visible animate-fade-in"
    >
      <style>{`
        @keyframes breathe-ring {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 6px var(--color-accent-primary)); }
          50% { opacity: 0.75; filter: drop-shadow(0 0 14px var(--color-accent-primary)); }
        }
        .breathe-active {
          animation: breathe-ring 3s ease-in-out infinite;
        }
      `}</style>
      <div className="p-6 md:p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-5">
          {session.label}
        </p>

        {/* Circular progress */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <svg
            className="h-48 w-48 md:h-56 md:w-56 -rotate-90"
            viewBox="0 0 120 120"
          >
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--color-accent-primary)" />
                <stop offset="100%" stopColor="var(--color-accent-glow)" />
              </linearGradient>
              <linearGradient id="ringSuccess" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--color-status-success)" />
                <stop offset="100%" stopColor="var(--color-accent-glow)" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-bg-base"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={isFinished ? "url(#ringSuccess)" : "url(#ringGradient)"}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-700 ease-apple ${
                !paused && !isFinished ? "breathe-active" : ""
              }`}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-mono font-bold text-text-primary tracking-tight">
              {formatTimer(elapsed)}
            </span>
            <span className="text-xs text-text-muted mt-1 font-medium">
              {isFinished
                ? "Goal reached!"
                : `${formatDuration(session.durationMinutes)} goal`}
            </span>
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-6">
          {formatTimer(Math.max(0, totalSeconds - elapsed))} remaining
        </p>

        {showNotes ? (
          <div className="mb-5 max-w-sm mx-auto">
            <Textarea
              rows={3}
              placeholder="Session notes (optional)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              resize="none"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            className="mb-5 text-xs text-text-muted hover:text-text-primary transition-colors duration-200"
          >
            + Add session notes
          </button>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="md"
            leftIcon={paused ? <Play size={16} /> : <Pause size={16} />}
            onClick={() => setPaused((v) => !v)}
          >
            {paused ? "Resume" : "Pause"}
          </Button>

          <Button
            variant="success"
            size="md"
            loading={completing}
            leftIcon={<CheckCircle2 size={16} />}
            onClick={() => void handleComplete(true)}
          >
            Complete
          </Button>

          <Button
            variant="danger"
            size="md"
            loading={completing}
            leftIcon={<StopCircle size={16} />}
            onClick={() => void handleComplete(false)}
            title="Abandon session"
          >
            Abandon
          </Button>
        </div>

        <button
          type="button"
          onClick={onAbandon}
          className="mt-4 text-xs text-text-muted hover:text-status-error transition-colors duration-200"
        >
          Discard without saving
        </button>
      </div>
    </Card>
  );
}

// ─── Start Form ───────────────────────────────────────────────────────────────

function StartSessionForm({
  onStart,
  onCancel,
}: {
  onStart: (session: FocusSession) => void;
  onCancel: () => void;
}) {
  const { getAuthHeaders } = useAuth();
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [duration, setDuration] = useState(25);
  const [customDuration, setCustomDuration] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const effectiveDuration = useCustom
    ? Math.min(480, Math.max(1, Number(customDuration) || 25))
    : duration;

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = getAuthHeaders();
    if (!headers) return;

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError("Session label is required.");
      return;
    }

    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/focus", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          label: trimmedLabel,
          durationMinutes: effectiveDuration,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { msg?: string };
        setError(data.msg ?? "Failed to start session.");
        toast({
          variant: "error",
          title: "Failed to start session",
          description: data.msg ?? "Something went wrong.",
        });
        return;
      }

      const data = (await res.json()) as { session: FocusSession };
      onStart(data.session);
    } catch {
      setError("Network error. Please try again.");
      toast({
        variant: "error",
        title: "Failed to start session",
        description: "Network error. Please try again.",
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card variant="elevated" glow className="animate-fade-in">
      <form onSubmit={handleStart} className="p-6 md:p-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-5">
          Start Focus Session
        </h2>

        {error && (
          <div className="mb-4 rounded-xl border border-status-error/20 bg-status-error/10 px-3 py-2.5 text-sm text-status-error">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <Input
            autoFocus
            type="text"
            maxLength={200}
            placeholder="What are you focusing on?"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />

          <div>
            <p className="text-xs font-medium text-text-secondary mb-2.5">
              Duration (minutes)
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDuration(d);
                    setUseCustom(false);
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-sm font-medium border transition-all duration-200 ease-apple ${
                    !useCustom && duration === d
                      ? "border-accent-primary bg-accent-subtle text-text-primary shadow-glow-soft"
                      : "border-border bg-bg-panel text-text-secondary hover:border-accent-primary/50 hover:text-text-primary"
                  }`}
                >
                  {d}m
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={`rounded-xl px-3.5 py-1.5 text-sm font-medium border transition-all duration-200 ease-apple ${
                  useCustom
                    ? "border-accent-primary bg-accent-subtle text-text-primary shadow-glow-soft"
                    : "border-border bg-bg-panel text-text-secondary hover:border-accent-primary/50 hover:text-text-primary"
                }`}
              >
                Custom
              </button>
            </div>

            {useCustom && (
              <div className="mt-3">
                <Input
                  type="number"
                  min={1}
                  max={480}
                  placeholder="Minutes (1–480)"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  className="w-40"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={starting}
            leftIcon={<Play size={16} />}
          >
            {starting
              ? "Starting…"
              : `Start ${effectiveDuration}m Session`}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ─── History Item ─────────────────────────────────────────────────────────────

function SessionItem({
  session,
  onDelete,
}: {
  session: FocusSession;
  onDelete: (id: string) => void;
}) {
  const { getAuthHeaders } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleDelete = async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setDeleting(true);
    try {
      await fetch(`/api/focus/${session._id}`, {
        method: "DELETE",
        headers,
      });
      onDelete(session._id);
    } finally {
      setDeleting(false);
    }
  };

  const elapsed = session.elapsedMinutes ?? session.durationMinutes;

  return (
    <Card
      variant="default"
      className="animate-slide-left transition-all duration-200 ease-apple"
    >
      <div className="px-4 py-3.5 flex items-center gap-4">
        <div
          className={`h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center border ${
            session.completed
              ? "bg-status-success/10 text-status-success border-status-success/25"
              : "bg-status-warning/10 text-status-warning border-status-warning/25"
          }`}
        >
          {session.completed ? (
            <CheckCircle2 size={16} />
          ) : (
            <StopCircle size={16} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {session.label}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {formatDate(session.startedAt)} · {formatDuration(elapsed)} focused
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge tone={session.completed ? "success" : "default"}>
            {session.completed ? "Completed" : "Abandoned"}
          </Badge>

          {session.notes && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-text-muted hover:text-text-primary transition-colors duration-200"
              title={expanded ? "Collapse notes" : "Expand notes"}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}

          {confirming ? (
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                loading={deleting}
                onClick={handleDelete}
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}
                leftIcon={<X size={14} />}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-text-muted hover:text-status-error transition-colors duration-200 p-1.5 rounded-lg hover:bg-status-error/10"
              title="Delete session"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {expanded && session.notes && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-12 border-l-2 border-border pl-4">
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {session.notes}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FocusPage() {
  const { getAuthHeaders } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchSessions = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setLoading(true);
    try {
      const res = await fetch("/api/focus?limit=20", {
        headers,
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          sessions: FocusSession[];
          total: number;
        };
        setSessions(data.sessions);
        setTotal(data.total);
      } else {
        toast({
          variant: "error",
          title: "Failed to load sessions",
          description: "Could not fetch your focus history.",
        });
      }
    } catch {
      toast({
        variant: "error",
        title: "Failed to load sessions",
        description: "Network error. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, toast]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  const totalMinutes = sessions
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + (s.elapsedMinutes ?? s.durationMinutes), 0);

  const completedCount = sessions.filter((s) => s.completed).length;

  const handleStart = (session: FocusSession) => {
    setActiveSession(session);
    setShowForm(false);
  };

  const handleComplete = (updated: FocusSession) => {
    setActiveSession(null);
    setSessions((prev) => [updated, ...prev]);
    setTotal((t) => t + 1);
  };

  const handleAbandon = () => {
    setActiveSession(null);
  };

  const handleDelete = (id: string) => {
    setSessions((prev) => prev.filter((s) => s._id !== id));
    setTotal((t) => Math.max(0, t - 1));
  };

  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-in space-y-6 pb-10 text-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-subtle text-accent-primary border border-accent-primary/20 shadow-glow-soft">
            <Timer size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Focus
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {total} sessions · {totalMinutes} minutes total
            </p>
          </div>
        </div>

        {!activeSession && !showForm && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={() => setShowForm(true)}
          >
            Start Session
          </Button>
        )}
      </div>

      {/* Active timer */}
      {activeSession && (
        <ActiveTimer
          session={activeSession}
          onComplete={handleComplete}
          onAbandon={handleAbandon}
        />
      )}

      {/* Start form */}
      {showForm && !activeSession && (
        <StartSessionForm
          onStart={handleStart}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Stats bar */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card variant="default" className="px-4 py-4 text-center">
            <div className="flex justify-center text-text-muted mb-2">
              <Timer size={18} />
            </div>
            <p className="text-xl font-bold text-text-primary">{total}</p>
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mt-0.5">
              Total Sessions
            </p>
          </Card>
          <Card variant="default" className="px-4 py-4 text-center">
            <div className="flex justify-center text-status-success mb-2">
              <CheckCircle2 size={18} />
            </div>
            <p className="text-xl font-bold text-text-primary">
              {completedCount}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mt-0.5">
              Completed
            </p>
          </Card>
          <Card variant="default" className="px-4 py-4 text-center">
            <div className="flex justify-center text-accent-primary mb-2">
              <Flame size={18} />
            </div>
            <p className="text-xl font-bold text-text-primary">
              {formatDuration(totalMinutes)}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mt-0.5">
              Total Focus
            </p>
          </Card>
        </div>
      )}

      {/* History */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton height={72} rounded="xl" />
          <Skeleton height={72} rounded="xl" />
          <Skeleton height={72} rounded="xl" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<Timer size={28} />}
          title="Ready to focus?"
          description="Start your first session to begin building focus habits."
          action={
            !showForm && !activeSession
              ? {
                  label: "Start Session",
                  onClick: () => setShowForm(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted px-1">
            Session History
          </h2>
          {sessions.map((session) => (
            <SessionItem
              key={session._id}
              session={session}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
