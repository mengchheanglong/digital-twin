"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Pause,
  Play,
  Plus,
  StopCircle,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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

  const remaining = Math.max(0, totalSeconds - elapsed);
  const progress = Math.min(100, (elapsed / totalSeconds) * 100);
  const isFinished = elapsed >= totalSeconds;

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
      }
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-accent-primary/40 bg-bg-card p-6 animate-fade-in">
      <div className="text-center mb-6">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
          {session.label}
        </p>

        {/* Circular progress */}
        <div className="relative inline-flex items-center justify-center mb-4">
          <svg
            className="h-36 w-36 -rotate-90"
            viewBox="0 0 120 120"
          >
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
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={`${(339.3 * progress) / 100} 339.3`}
              strokeLinecap="round"
              className={
                isFinished ? "text-green-400" : "text-accent-primary"
              }
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-mono font-bold text-white">
              {formatTimer(remaining)}
            </span>
            <span className="text-xs text-text-muted mt-0.5">
              {isFinished ? "Complete!" : "remaining"}
            </span>
          </div>
        </div>

        <p className="text-sm text-text-secondary">
          {formatTimer(elapsed)} elapsed of{" "}
          {formatDuration(session.durationMinutes)}
        </p>
      </div>

      {showNotes ? (
        <div className="mb-4">
          <textarea
            rows={3}
            placeholder="Session notes (optional)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg-panel px-3 py-2 text-sm text-white placeholder-text-muted focus:border-accent-primary focus:outline-none transition-all resize-none"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNotes(true)}
          className="mb-4 text-xs text-text-muted hover:text-white transition-colors"
        >
          + Add session notes
        </button>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-panel py-2.5 text-sm font-semibold text-text-secondary hover:text-white transition-all"
        >
          {paused ? (
            <>
              <Play className="h-4 w-4" /> Resume
            </>
          ) : (
            <>
              <Pause className="h-4 w-4" /> Pause
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => void handleComplete(true)}
          disabled={completing}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-400 disabled:opacity-50 transition-all"
        >
          {completing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Complete
        </button>

        <button
          type="button"
          onClick={() => void handleComplete(false)}
          disabled={completing}
          className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all"
          title="Abandon session"
        >
          <StopCircle className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onAbandon}
        className="mt-3 w-full text-xs text-text-muted hover:text-red-400 transition-colors"
      >
        Discard without saving
      </button>
    </div>
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
        return;
      }

      const data = (await res.json()) as { session: FocusSession };
      onStart(data.session);
    } finally {
      setStarting(false);
    }
  };

  return (
    <form
      onSubmit={handleStart}
      className="rounded-2xl border border-accent-primary/30 bg-bg-card p-6 animate-fade-in"
    >
      <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4">
        Start Focus Session
      </h2>

      {error && (
        <div className="mb-3 rounded-xl border border-status-error/20 bg-status-error/10 px-3 py-2 text-sm text-status-error">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <input
          autoFocus
          type="text"
          maxLength={200}
          placeholder="What are you focusing on?"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded-xl border border-border bg-bg-panel px-4 py-2.5 text-sm text-white placeholder-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all"
        />

        <div>
          <p className="text-xs text-text-muted mb-2">
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
                className={`rounded-xl px-3 py-1.5 text-sm font-medium border transition-all ${
                  !useCustom && duration === d
                    ? "border-accent-primary bg-accent-primary/10 text-white"
                    : "border-border bg-bg-panel text-text-secondary hover:border-accent-primary/50"
                }`}
              >
                {d}m
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUseCustom(true)}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium border transition-all ${
                useCustom
                  ? "border-accent-primary bg-accent-primary/10 text-white"
                  : "border-border bg-bg-panel text-text-secondary hover:border-accent-primary/50"
              }`}
            >
              Custom
            </button>
          </div>

          {useCustom && (
            <input
              type="number"
              min={1}
              max={480}
              placeholder="Minutes (1–480)"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              className="mt-2 w-32 rounded-xl border border-border bg-bg-panel px-3 py-2 text-sm text-white focus:border-accent-primary focus:outline-none transition-all"
            />
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-border bg-bg-panel px-4 py-2 text-sm font-semibold text-text-secondary hover:text-white transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={starting}
          className="flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 transition-all"
        >
          {starting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {starting ? "Starting…" : `Start ${effectiveDuration}m Session`}
        </button>
      </div>
    </form>
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
    <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-panel px-4 py-3 hover:border-accent-primary/30 transition-all">
      <div
        className={`h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center ${
          session.completed
            ? "bg-green-500/10 text-green-400"
            : "bg-orange-500/10 text-orange-400"
        }`}
      >
        {session.completed ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <StopCircle className="h-4 w-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {session.label}
        </p>
        <p className="text-xs text-text-muted">
          {formatDate(session.startedAt)} ·{" "}
          {formatDuration(elapsed)} focused
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-text-muted">
          {formatDuration(session.durationMinutes)} goal
        </span>

        {confirming ? (
          <>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-400 hover:text-red-300 font-semibold"
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Delete"
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-text-muted hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-text-muted hover:text-red-400 transition-colors p-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FocusPage() {
  const { getAuthHeaders } = useAuth();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] =
    useState<FocusSession | null>(null);
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
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  const totalMinutes = sessions
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + (s.elapsedMinutes ?? s.durationMinutes), 0);

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
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            <Timer className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Focus
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {total} sessions · {totalMinutes} minutes total
            </p>
          </div>
        </div>

        {!activeSession && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)]"
          >
            <Plus className="h-4 w-4" />
            Start Session
          </button>
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
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Total Sessions",
              value: String(total),
              icon: <Timer className="h-4 w-4" />,
            },
            {
              label: "Completed",
              value: String(sessions.filter((s) => s.completed).length),
              icon: (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ),
            },
            {
              label: "Total Focus",
              value: formatDuration(totalMinutes),
              icon: <Clock className="h-4 w-4 text-accent-primary" />,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-bg-card px-4 py-3 text-center"
            >
              <div className="flex justify-center text-text-muted mb-1">
                {stat.icon}
              </div>
              <p className="text-lg font-bold text-white">
                {stat.value}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-border bg-bg-card">
          <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-10 text-center">
          <Timer className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">
            No focus sessions yet
          </p>
          <p className="text-xs text-text-muted mt-1">
            Start your first session to begin building focus habits.
          </p>
          {!showForm && !activeSession && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-4 rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-all"
            >
              Start Session
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
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
