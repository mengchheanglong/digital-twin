"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import confetti from "canvas-confetti";
import { clamp } from "@/lib/math";
import { notifyUserProgressionUpdate } from "@/lib/progression-events";
import { useAuth } from "@/hooks/useAuth";
import {
  Button,
  Card,
  Input,
  FormField,
  Badge,
  Pill,
  Skeleton,
  Dialog,
  EmptyState,
  ProgressBar,
  Tooltip,
  useToast,
} from "@/components/ui";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Flame,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Sword,
  Target,
  Trash2,
  Trophy,
  Zap,
} from "lucide-react";
import { findNewlyCompletedQuest } from "./questState";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Quest {
  id: string;
  goal: string;
  duration: string;
  progress: number;
  completed: boolean;
  createdAt: string;
  completedDate?: string;
  recurrencesLeft?: number;
}

interface QuestLogEntry {
  id: string;
  questId: string;
  goal: string;
  duration: string;
  progress: number;
  completedDate: string;
  createdDate: string;
  deletedDate?: string;
  isDeleted: boolean;
}

interface ApiQuest {
  _id: string;
  goal: string;
  duration: string;
  progress?: number;
  completed?: boolean;
  date?: string;
  createdAt?: string;
  completedDate?: string;
  recurrencesLeft?: number;
}

/* ------------------------------------------------------------------ */
/*  Duration meta                                                      */
/* ------------------------------------------------------------------ */

type DurationTone = "accent" | "success" | "info" | "warning";

interface DurationMeta {
  label: string;
  reward: number;
  tone: DurationTone;
  icon: React.ReactNode;
}

const durationMeta: Record<string, DurationMeta> = {
  daily: {
    label: "Daily",
    reward: 20,
    tone: "accent",
    icon: <Zap className="h-3.5 w-3.5" />,
  },
  weekly: {
    label: "Weekly",
    reward: 50,
    tone: "success",
    icon: <Calendar className="h-3.5 w-3.5" />,
  },
  monthly: {
    label: "Monthly",
    reward: 150,
    tone: "info",
    icon: <Target className="h-3.5 w-3.5" />,
  },
  yearly: {
    label: "Yearly",
    reward: 500,
    tone: "warning",
    icon: <Trophy className="h-3.5 w-3.5" />,
  },
};

const getDurationMeta = (durationKey: string): DurationMeta => {
  return durationMeta[durationKey.toLowerCase()] ?? durationMeta.daily;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const getThemeColors = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }
  const style = getComputedStyle(document.documentElement);
  return [
    style.getPropertyValue("--color-accent-primary").trim(),
    style.getPropertyValue("--color-status-success").trim(),
    style.getPropertyValue("--color-status-warning").trim(),
  ].filter(Boolean);
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function QuestBoardPage() {
  const { getAuthHeaders } = useAuth();
  const { toast } = useToast();

  const [quests, setQuests] = useState<Quest[]>([]);
  const [questLogs, setQuestLogs] = useState<QuestLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState("daily");
  const [recurrences, setRecurrences] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLog, setShowLog] = useState(false);

  /* -------------------------- API --------------------------------- */

  const checkAndResetQuests = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      await axios.post("/api/quest/reset", {}, { headers });
    } catch (error) {
      console.error("Failed to check quest reset:", error);
    }
  }, [getAuthHeaders]);

  const fetchQuests = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      const response = await axios.get("/api/quest/all", { headers });
      const data: ApiQuest[] = response.data ?? [];

      const mapped: Quest[] = data.map((quest) => ({
        id: quest._id,
        goal: quest.goal,
        duration: quest.duration,
        progress: Number(quest.progress ?? 0),
        completed: Boolean(quest.completed),
        createdAt: quest.date ?? quest.createdAt ?? new Date().toISOString(),
        completedDate: quest.completedDate,
        recurrencesLeft: quest.recurrencesLeft,
      }));

      setQuests(mapped);
    } catch {
      toast({
        title: "Quest sync failed",
        description: "Unable to load your quests.",
        variant: "error",
      });
    }
  }, [getAuthHeaders, toast]);

  const fetchQuestLogs = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      const response = await axios.get("/api/quest/log", { headers });
      setQuestLogs(response.data?.questLogs ?? []);
    } catch {
      console.error("Failed to fetch quest logs");
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await checkAndResetQuests();
      await fetchQuests();
      await fetchQuestLogs();
      setLoading(false);
    };
    void init();
  }, [checkAndResetQuests, fetchQuests, fetchQuestLogs]);

  /* ------------------------ Create -------------------------------- */

  const handleCreateQuest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!goal.trim()) {
      toast({
        title: "Missing goal",
        description: "Enter a goal before creating a quest.",
        variant: "warning",
      });
      return;
    }

    setBusy(true);

    try {
      const headers = getAuthHeaders();
      if (!headers) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to create quests.",
          variant: "error",
        });
        return;
      }

      const payload = {
        goal: goal.trim(),
        duration,
        recurrences: recurrences ? parseInt(recurrences) : undefined,
      };

      const response = await axios.post("/api/quest/create", payload, {
        headers,
      });
      const quest = response.data?.quest;

      const createdQuest: Quest = {
        id: quest._id,
        goal: quest.goal,
        duration: quest.duration,
        progress: Number(quest.progress ?? 0),
        completed: Boolean(quest.completed),
        createdAt: quest.date ?? new Date().toISOString(),
        recurrencesLeft: quest.recurrencesLeft,
      };

      setQuests((current) => [createdQuest, ...current]);
      setGoal("");
      setDuration("daily");
      setRecurrences("");
      setShowCreateDialog(false);
      toast({
        title: "Quest created",
        description: "Your quest is now active.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Create failed",
        description: "Could not create quest.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------ Delete -------------------------------- */

  const executeDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);

    const previousQuests = [...quests];
    setQuests((current) => current.filter((q) => q.id !== id));

    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      await axios.delete(`/api/quest/delete/${id}`, { headers });
      toast({
        title: "Quest deleted",
        description: "The quest has been removed.",
        variant: "success",
      });
      void fetchQuestLogs();
    } catch {
      setQuests(previousQuests);
      toast({
        title: "Delete failed",
        description: "Could not delete quest.",
        variant: "error",
      });
    }
  };

  /* ------------------------ Progress ------------------------------ */

  const updateQuestState = (
    id: string,
    progress: number,
    completed: boolean,
  ) => {
    const newlyCompletedQuest = findNewlyCompletedQuest(quests, id, completed);

    setQuests((current) =>
      current.map((quest) =>
        quest.id === id
          ? {
              ...quest,
              progress,
              completed,
              completedDate: completed
                ? new Date().toISOString()
                : quest.completedDate,
            }
          : quest,
      ),
    );

    if (newlyCompletedQuest) {
      const reward = getDurationMeta(newlyCompletedQuest.duration).reward;
      toast({
        title: "Quest completed!",
        description: `Achievement unlocked. +${reward} XP.`,
        variant: "success",
      });
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: getThemeColors(),
      });
    }
  };

  const updateProgress = async (id: string, nextProgress: number) => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      const normalizedProgress = clamp(nextProgress, 0, 100);

      const response = await axios.put(
        `/api/quest/progress/${id}`,
        { progress: normalizedProgress },
        { headers },
      );

      const updatedQuest = response.data?.quest;
      updateQuestState(
        id,
        Number(updatedQuest?.progress ?? normalizedProgress),
        Boolean(updatedQuest?.completed),
      );
    } catch {
      toast({
        title: "Update failed",
        description: "Could not update quest progress.",
        variant: "error",
      });
    }
  };

  /* ------------------------ Complete ------------------------------ */

  const toggleCompletion = async (id: string) => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      const response = await axios.put(
        `/api/quest/complete/${id}`,
        {},
        { headers },
      );
      const responseData = response.data;
      if (responseData?.progression) notifyUserProgressionUpdate();

      if (responseData?.deleted) {
        setQuests((current) => current.filter((q) => q.id !== id));
        const reward = getDurationMeta(
          quests.find((q) => q.id === id)?.duration || "daily",
        ).reward;
        toast({
          title: "Quest completed!",
          description: `Achievement unlocked. +${reward} XP.`,
          variant: "success",
        });
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: getThemeColors(),
        });
        void fetchQuestLogs();
        return;
      }

      const updatedQuest = responseData?.quest;
      updateQuestState(
        id,
        Number(updatedQuest?.progress ?? 0),
        Boolean(updatedQuest?.completed),
      );
      void fetchQuestLogs();
    } catch {
      toast({
        title: "Completion failed",
        description: "Could not update quest completion.",
        variant: "error",
      });
    }
  };

  /* ------------------------ Derived ------------------------------- */

  const activeQuests = useMemo(
    () => quests.filter((q) => !q.completed),
    [quests],
  );

  const completedQuests = useMemo(
    () =>
      quests
        .filter((q) => q.completed)
        .sort(
          (a, b) =>
            new Date(b.completedDate || 0).getTime() -
            new Date(a.completedDate || 0).getTime(),
        ),
    [quests],
  );

  const completedQuestsStacked = useMemo(() => {
    const groups: Record<
      string,
      {
        goal: string;
        count: number;
        totalReward: number;
        duration: string;
      }
    > = {};

    for (const log of questLogs) {
      const normalizedGoal = log.goal.trim().toLowerCase();
      if (!groups[normalizedGoal]) {
        groups[normalizedGoal] = {
          goal: log.goal,
          count: 0,
          totalReward: 0,
          duration: log.duration,
        };
      }
      groups[normalizedGoal].count += 1;
      groups[normalizedGoal].totalReward += getDurationMeta(
        log.duration,
      ).reward;
    }

    return Object.values(groups).sort((a, b) => b.totalReward - a.totalReward);
  }, [questLogs]);

  const totalXPGained = useMemo(() => {
    return questLogs.reduce(
      (sum, log) => sum + getDurationMeta(log.duration).reward,
      0,
    );
  }, [questLogs]);

  const todaysCompletedCount = useMemo(() => {
    const today = new Date().toDateString();
    return quests.filter(
      (q) =>
        q.completed &&
        q.completedDate &&
        new Date(q.completedDate).toDateString() === today,
    ).length;
  }, [quests]);

  /* ------------------------ Render -------------------------------- */

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-10 sm:space-y-7">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-accent-primary/20 bg-accent-subtle text-accent-primary shadow-inner-glow">
            <Sword className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
              Momentum
            </p>
            <h1 className="truncate text-2xl font-black tracking-normal text-text-primary sm:text-3xl">
              Quest Board
            </h1>
            <p className="mt-0.5 hidden text-sm text-text-secondary sm:block">
              Turn intentions into visible progress.
            </p>
          </div>
        </div>
        {!showCreateDialog && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateDialog(true)}
            className="shrink-0 sm:h-10 sm:px-4"
          >
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">New Quest</span>
          </Button>
        )}
      </header>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card variant="default" className="relative overflow-hidden p-3 sm:p-4">
          <div className="relative z-10 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-subtle text-accent-primary ring-1 ring-accent-primary/20 sm:h-10 sm:w-10">
              <Flame className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono text-[9px] font-black uppercase tracking-[0.12em] text-text-muted sm:text-[10px]">
                Active
              </p>
              <p className="mt-0.5 text-xl font-black text-text-primary tabular-nums sm:text-2xl">
                {activeQuests.length}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="default" className="relative overflow-hidden p-3 sm:p-4">
          <div className="relative z-10 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-status-success/10 text-status-success ring-1 ring-status-success/20 sm:h-10 sm:w-10">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono text-[9px] font-black uppercase tracking-[0.12em] text-text-muted sm:text-[10px]">
                Done Today
              </p>
              <p className="mt-0.5 text-xl font-black text-text-primary tabular-nums sm:text-2xl">
                {todaysCompletedCount}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="default" className="relative overflow-hidden p-3 sm:p-4">
          <div className="relative z-10 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-status-warning/10 text-status-warning ring-1 ring-status-warning/20 sm:h-10 sm:w-10">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono text-[9px] font-black uppercase tracking-[0.12em] text-text-muted sm:text-[10px]">
                Total XP
              </p>
              <p className="mt-0.5 truncate text-xl font-black text-text-primary tabular-nums sm:text-2xl">
                {totalXPGained}
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Active Quests */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-text-primary">Active Quests</h2>
          {activeQuests.length > 0 && (
            <Pill tone="accent">{activeQuests.length} active</Pill>
          )}
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="space-y-4 p-6">
                <Skeleton height={20} width="40%" rounded="md" />
                <Skeleton height={16} width="70%" rounded="md" />
                <Skeleton height={8} width="100%" rounded="full" />
                <div className="flex gap-2 pt-2">
                  <Skeleton height={32} width={60} rounded="lg" />
                  <Skeleton height={32} width={60} rounded="lg" />
                  <Skeleton
                    height={32}
                    width={80}
                    rounded="lg"
                    className="ml-auto"
                  />
                </div>
              </Card>
            ))}
          </div>
        ) : activeQuests.length === 0 ? (
          <EmptyState
            icon={<Target className="h-8 w-8" />}
            title="No active quests"
            description="Choose one concrete outcome and make the next step visible."
            action={{
              label: "Create a quest",
              onClick: () => setShowCreateDialog(true),
            }}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {activeQuests.map((quest, index) => {
              const meta = getDurationMeta(quest.duration);
              const isReady = quest.progress >= 100;
              return (
                <Card
                  key={quest.id}
                  variant="elevated"
                  className={[
                    "group relative overflow-hidden p-0 transition-all duration-300 ease-apple animate-fade-in",
                    isReady
                      ? "border-status-success/50 shadow-[0_0_30px_rgba(52,211,153,0.15)] hover:shadow-[0_0_40px_rgba(52,211,153,0.25)] hover:-translate-y-1"
                      : "hover:-translate-y-1 hover:border-accent-primary/30 hover:shadow-stripe-hover hover:ring-1 hover:ring-accent-primary/20",
                  ].join(" ")}
                  style={{
                    animationDelay: `${index * 60}ms`,
                    animationFillMode: "both",
                  }}
                >
                  {/* Top accent bar */}
                  <div
                    className={[
                      "h-1 w-full",
                      isReady
                        ? "bg-gradient-to-r from-status-success via-accent-primary to-status-success bg-[length:200%_100%] animate-shimmer"
                        : "bg-gradient-to-r from-accent-primary to-accent-hover opacity-60",
                    ].join(" ")}
                  />

                  <div className="p-6">
                    {/* Delete button */}
                    <div className="absolute right-4 top-4 z-20 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
                      <Tooltip content="Delete quest">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Delete quest"
                          className="h-8 w-8 p-0"
                          onClick={() => setDeleteId(quest.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </Tooltip>
                    </div>

                    <div className="mb-4 space-y-2 pr-8">
                      {/* Status badges row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isReady && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-status-success/40 bg-status-success/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-status-success animate-scale-in">
                            <span className="h-1.5 w-1.5 rounded-full bg-status-success animate-pulse" />
                            Ready to Claim
                          </span>
                        )}
                        <Badge tone={meta.tone}>
                          {meta.icon}
                          {meta.label}
                        </Badge>
                        <Pill tone={meta.tone}>+{meta.reward} XP</Pill>
                        {typeof quest.recurrencesLeft === "number" &&
                          quest.recurrencesLeft > 0 && (
                            <Pill tone="default">
                              {quest.recurrencesLeft} left
                            </Pill>
                          )}
                      </div>

                      {/* Quest goal */}
                      <h3 className="break-words text-base font-bold leading-snug text-text-primary [overflow-wrap:anywhere]">
                        {quest.goal}
                      </h3>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-5">
                      <ProgressBar
                        value={quest.progress}
                        showPercentage
                        size="md"
                        shimmer={quest.progress > 0 && !isReady}
                      />
                    </div>

                    {/* Action row */}
                    <div className="flex flex-col gap-3 border-t border-border-subtle pt-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                      {/* Progress controls */}
                      <div className="grid w-full grid-cols-2 gap-1.5 min-[420px]:w-auto">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            updateProgress(quest.id, quest.progress + 10)
                          }
                          disabled={quest.progress >= 100}
                          className="text-xs font-bold"
                        >
                          +10%
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            updateProgress(quest.id, quest.progress + 25)
                          }
                          disabled={quest.progress >= 100}
                          className="text-xs font-bold"
                        >
                          +25%
                        </Button>
                      </div>

                      {/* Claim / Complete button */}
                      <Button
                        variant={isReady ? "success" : "primary"}
                        size="sm"
                        leftIcon={
                          <Check className="h-4 w-4" strokeWidth={2.5} />
                        }
                        onClick={() => toggleCompletion(quest.id)}
                        className={isReady ? "w-full btn-glow min-[420px]:w-auto" : "w-full min-[420px]:w-auto"}
                      >
                        {isReady ? "Claim Reward" : "Complete"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Completed Quests */}
      {completedQuests.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-text-primary">
              Completed Quests
            </h2>
            <Pill tone="success">{completedQuests.length} done</Pill>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {completedQuests.map((quest, index) => {
              const meta = getDurationMeta(quest.duration);
              return (
                <Card
                  key={quest.id}
                  variant="default"
                  className="flex animate-fade-in flex-col items-start gap-3 border-status-success/20 bg-status-success/5 p-4 opacity-80 transition-all duration-300 hover:opacity-100 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-4"
                  style={{
                    animationDelay: `${index * 40}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-status-success/10 text-status-success">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-text-primary line-through decoration-text-muted/50">
                      {quest.goal}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <span>•</span>
                      <span>
                        {new Date(quest.completedDate!).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="text-status-success">
                        +{meta.reward} XP
                      </span>
                      <span>•</span>
                      <span className="text-accent-primary">
                        {typeof quest.recurrencesLeft === "number"
                          ? quest.recurrencesLeft === 0
                            ? "Final Cycle"
                            : `${quest.recurrencesLeft} left`
                          : "Infinite Loop"}
                      </span>
                    </div>
                  </div>
                  <Tooltip content="Delete quest">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Delete quest"
                      className="h-8 w-8 shrink-0 p-0"
                      onClick={() => setDeleteId(quest.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Quest Log */}
      {completedQuestsStacked.length > 0 && (
        <section className="space-y-4">
          <button
            onClick={() => setShowLog((prev) => !prev)}
            className="group flex flex-wrap items-center gap-2 text-left text-lg font-bold text-text-primary transition-colors hover:text-accent-primary"
          >
            <Trophy className="h-5 w-5 text-status-warning transition-transform group-hover:scale-110" />
            Achievement Log
            <span className="ml-2 text-sm font-normal text-text-muted">
              {showLog ? "Hide" : "Show"} history
            </span>
          </button>

          {showLog && (
            <Card variant="default" className="p-6">
              <div className="space-y-3">
                {completedQuestsStacked.map((group, index) => {
                  const meta = getDurationMeta(group.duration);
                  return (
                    <div
                      key={index}
                      className="flex animate-fade-in items-center gap-4 rounded-xl border border-border-subtle bg-bg-panel/50 p-3.5 transition-all hover:border-status-success/30 hover:bg-bg-panel"
                      style={{
                        animationDelay: `${index * 40}ms`,
                        animationFillMode: "both",
                      }}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-status-success/10 text-status-success ring-1 ring-status-success/20">
                        <Check className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-text-primary">
                          <span className="capitalize">{group.goal}</span>
                          {group.count > 1 && (
                            <Badge tone="accent" className="ml-2">
                              x{group.count}
                            </Badge>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-black text-status-success">
                        +{group.totalReward}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </section>
      )}

      {/* Create Quest Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="New Quest"
        size="md"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setShowCreateDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={busy}
              leftIcon={<Plus className="h-4 w-4" />}
              type="submit"
              form="create-quest-form"
              className="w-full sm:w-auto"
            >
              Create Quest
            </Button>
          </div>
        }
      >
        <form
          id="create-quest-form"
          onSubmit={handleCreateQuest}
          className="space-y-5"
        >
          <FormField
            label="What is your goal?"
            htmlFor="goal"
            hint="Keep it specific and actionable."
          >
            <Input
              id="goal"
              type="text"
              value={goal}
              maxLength={60}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., Read 10 pages, Meditate for 5 min..."
              leftIcon={<Target className="h-4 w-4" />}
            />
          </FormField>

          <FormField label="Duration" htmlFor="duration">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(durationMeta).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDuration(key)}
                  className={[
                    "flex min-h-[108px] flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all duration-200 sm:p-4",
                    duration === key
                      ? "border-accent-primary bg-accent-subtle shadow-glow-soft ring-1 ring-accent-primary/30"
                      : "border-border bg-bg-panel hover:border-border-hover hover:bg-bg-hover",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      duration === key
                        ? "bg-accent-primary/20 text-accent-primary"
                        : "bg-bg-card text-text-muted",
                    ].join(" ")}
                  >
                    {meta.icon}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-text-primary">
                      {meta.label}
                    </p>
                    <Badge tone={meta.tone}>+{meta.reward} XP</Badge>
                  </div>
                </button>
              ))}
            </div>
          </FormField>

          <FormField
            label="Repeats (optional)"
            htmlFor="recurrences"
            hint="How many times should this quest repeat?"
          >
            <Input
              id="recurrences"
              type="number"
              min={1}
              value={recurrences}
              onChange={(e) => setRecurrences(e.target.value)}
              placeholder="1"
              leftIcon={<RotateCcw className="h-4 w-4" />}
            />
          </FormField>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Quest?"
        size="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" size="md" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={executeDelete}
            >
              Delete
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-error/10 text-status-error ring-1 ring-status-error/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete this quest? This action cannot be
            undone.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
