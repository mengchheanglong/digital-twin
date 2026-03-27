"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import confetti from "canvas-confetti";
import { clamp } from "@/lib/math";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  GitBranch,
  Lightbulb,
  Loader2,
  Plus,
  Target,
  Trophy,
  Trash2,
  Zap,
} from "lucide-react";

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


interface QuestSuggestion {
  goal: string;
  duration: "daily" | "weekly" | "monthly";
  reason: string;
}

interface ToastMessage {
  id: number;
  title: string;
  message: string;
  tone: "success" | "error";
}

const durationMeta: Record<
  string,
  {
    label: string;
    reward: number;
    badgeClass: string;
    progressClass: string;
    icon: React.ReactNode;
  }
> = {
  daily: {
    label: "Daily",
    reward: 20,
    badgeClass: "border-accent-primary/30 bg-accent-primary/10 text-accent-hover",
    progressClass: "from-accent-primary to-accent-hover",
    icon: <Zap className="h-3.5 w-3.5" />,
  },
  weekly: {
    label: "Weekly",
    reward: 50,
    badgeClass: "border-status-success/30 bg-status-success/10 text-status-success",
    progressClass: "from-status-success to-[#6EE7B7]",
    icon: <Calendar className="h-3.5 w-3.5" />,
  },
  monthly: {
    label: "Monthly",
    reward: 150,
    badgeClass: "border-[#22D3EE]/30 bg-[#22D3EE]/10 text-[#22D3EE]",
    progressClass: "from-[#22D3EE] to-[#67E8F9]",
    icon: <Target className="h-3.5 w-3.5" />,
  },
  yearly: {
    label: "Yearly",
    reward: 500,
    badgeClass: "border-status-warning/30 bg-status-warning/10 text-status-warning",
    progressClass: "from-status-warning to-[#FCD34D]",
    icon: <Trophy className="h-3.5 w-3.5" />,
  },
};

const getDurationMeta = (durationKey: string) => {
  return durationMeta[durationKey.toLowerCase()] ?? durationMeta.daily;
};

export default function QuestLogPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [questLogs, setQuestLogs] = useState<QuestLogEntry[]>([]);
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState("daily");
  const [recurrences, setRecurrences] = useState("");
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<QuestSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [decomposedSteps, setDecomposedSteps] = useState<Record<string, string[]>>({});
  const [decomposingId, setDecomposingId] = useState<string | null>(null);

  const checkAndResetQuests = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await axios.post("/api/quest/reset", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Failed to check quest reset:", error);
    }
  }, []);

  const activeQuests = useMemo(() => quests.filter((quest) => !quest.completed), [quests]);
  
  const completedQuestsStacked = useMemo(() => {
    const groups: Record<string, { goal: string; count: number; totalReward: number; duration: string }> = {};

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
      groups[normalizedGoal].totalReward += getDurationMeta(log.duration).reward;
    }

    return Object.values(groups).sort((a, b) => b.totalReward - a.totalReward);
  }, [questLogs]);

  const totalXPGained = useMemo(() => {
    return questLogs.reduce((sum, log) => sum + getDurationMeta(log.duration).reward, 0);
  }, [questLogs]);


  const addToast = useCallback((title: string, message: string, tone: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((current) => [...current, { id, title, message, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
  }, []);

  const fetchQuests = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get("/api/quest/all", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const mapped = (response.data ?? []).map(
        (quest: {
          _id: string;
          goal: string;
          duration: string;
          progress?: number;
          completed?: boolean;
          date?: string;
          createdAt?: string;
          completedDate?: string;
        }) => ({
          id: quest._id,
          goal: quest.goal,
          duration: quest.duration,
          progress: Number(quest.progress ?? 0),
          completed: Boolean(quest.completed),
          createdAt: quest.date ?? quest.createdAt ?? new Date().toISOString(),
          completedDate: quest.completedDate,
          recurrencesLeft: (quest as any).recurrencesLeft,
        }),
      );

      setQuests(mapped);
    } catch {
      addToast("Quest sync failed", "Unable to load quest log.", "error");
    }
  }, [addToast]);

  const fetchQuestLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get("/api/quest/log", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setQuestLogs(response.data?.questLogs ?? []);
    } catch {
      console.error("Failed to fetch quest logs");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await checkAndResetQuests();
      void fetchQuests();
      void fetchQuestLogs();
    };
    void init();
  }, [checkAndResetQuests, fetchQuests, fetchQuestLogs]);

  const handleCreateQuest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!goal.trim()) {
      addToast("Missing goal", "Enter a goal before creating a quest.", "error");
      return;
    }

    setBusy(true);

    try {
      const token = localStorage.getItem("token");
      const payload = { 
            goal: goal.trim(), 
            duration,
            recurrences: recurrences ? parseInt(recurrences) : undefined
      };

      const response = await axios.post(
        "/api/quest/create",
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

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
      addToast("Quest created", "Your quest is now active.");
    } catch {
      addToast("Create failed", "Could not create quest.", "error");
    } finally {
      setBusy(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);

    // Optimistic update
    const previousQuests = [...quests];
    setQuests((current) => current.filter((q) => q.id !== id));

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/quest/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      addToast("Quest deleted", "The quest has been removed.");
      // Refresh quest logs to show the deleted quest
      void fetchQuestLogs();
    } catch {
      // Revert on failure
      setQuests(previousQuests);
      addToast("Delete failed", "Could not delete quest.", "error");
    }
  };

  const updateQuestState = (id: string, progress: number, completed: boolean) => {
    setQuests((current) =>
      current.map((quest) => {
        if (quest.id !== id) return quest;

        if (completed && !quest.completed) {
          const reward = getDurationMeta(quest.duration).reward;
          addToast("Quest completed", `Achievement unlocked. +${reward} XP.`);
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#8B5CF6", "#34D399", "#FBBF24"],
          });
        }

        return {
          ...quest,
          progress,
          completed,
          completedDate: completed ? new Date().toISOString() : quest.completedDate,
        };
      }),
    );
  };

  const updateProgress = async (id: string, nextProgress: number) => {
    try {
      const token = localStorage.getItem("token");
      const normalizedProgress = clamp(nextProgress, 0, 100);

      const response = await axios.put(
        `/api/quest/progress/${id}`,
        { progress: normalizedProgress },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const updatedQuest = response.data?.quest;
      updateQuestState(id, Number(updatedQuest?.progress ?? normalizedProgress), Boolean(updatedQuest?.completed));
    } catch {
      addToast("Update failed", "Could not update quest progress.", "error");
    }
  };

  const toggleCompletion = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `/api/quest/complete/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const responseData = response.data;
      
      // Handle case where quest was deleted (e.g., one-time quest with recurrencesLeft=1)
      if (responseData?.deleted) {
        // Quest was completed and deleted - remove it from the list
        setQuests((current) => current.filter((q) => q.id !== id));
        const reward = getDurationMeta(quests.find(q => q.id === id)?.duration || 'daily').reward;
        addToast("Quest completed", `Achievement unlocked. +${reward} XP.`);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#8B5CF6", "#34D399", "#FBBF24"],
        });
        void fetchQuestLogs();
        return;
      }

      const updatedQuest = responseData?.quest;
      updateQuestState(id, Number(updatedQuest?.progress ?? 0), Boolean(updatedQuest?.completed));
      // Refresh quest logs to show the newly completed quest
      void fetchQuestLogs();
    } catch {
      addToast("Completion failed", "Could not update quest completion.", "error");
    }
  };

  const fetchSuggestions = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoadingSuggestions(true);
    try {
      const res = await axios.get("/api/quest/suggest", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuggestions((res.data?.suggestions as QuestSuggestion[]) ?? []);
    } catch {
      addToast("Suggestions failed", "Could not load quest suggestions.", "error");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleToggleSuggestions = () => {
    if (!showSuggestions && suggestions.length === 0) {
      void fetchSuggestions();
    }
    setShowSuggestions((v) => !v);
  };

  const handleAddSuggestion = (s: QuestSuggestion) => {
    setGoal(s.goal);
    setDuration(s.duration);
    setShowSuggestions(false);
  };

  const handleDecompose = async (questId: string) => {
    if (decomposedSteps[questId]) {
      setDecomposedSteps((prev) => {
        const next = { ...prev };
        delete next[questId];
        return next;
      });
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;
    setDecomposingId(questId);
    try {
      const res = await axios.post(
        "/api/quest/decompose",
        { questId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const steps = res.data?.steps as string[] | undefined;
      if (steps && steps.length > 0) {
        setDecomposedSteps((prev) => ({ ...prev, [questId]: steps }));
      }
    } catch {
      addToast("Decompose failed", "Could not generate sub-steps.", "error");
    } finally {
      setDecomposingId(null);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex items-center gap-4">
          <div className="p-2 rounded bg-accent-primary/10 text-accent-primary">
             <Target className="h-6 w-6" />
          </div>
          <div>
             <h1 className="text-2xl font-bold tracking-tight text-white">Quest Log</h1>
             <p className="text-sm text-text-secondary">Track your active missions and achievements.</p>
          </div>
      </header>

      {/* Top Stats Section */}
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="group overflow-hidden rounded-2xl border border-white/5 bg-bg-card/80 backdrop-blur-xl p-5 shadow-card transition-all duration-500 ease-apple hover:-translate-y-1 hover:border-accent-primary/30 hover:shadow-stripe-hover relative">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-accent-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-accent-primary/10 transition-colors" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary shadow-inner">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Active</p>
              <p className="text-2xl font-bold text-white">{activeQuests.length}</p>
            </div>
          </div>
        </article>

        <article className="group overflow-hidden rounded-2xl border border-white/5 bg-bg-card/80 backdrop-blur-xl p-5 shadow-card transition-all duration-500 ease-apple hover:-translate-y-1 hover:border-status-success/30 hover:shadow-stripe-hover relative">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-status-success/5 rounded-full blur-2xl pointer-events-none group-hover:bg-status-success/10 transition-colors" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-status-success/10 text-status-success shadow-inner">
              <Check className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Completed</p>
              <p className="text-2xl font-bold text-white">{quests.filter(q => q.completed).length}</p>
            </div>
          </div>
        </article>

        <article className="group overflow-hidden rounded-2xl border border-white/5 bg-bg-card/80 backdrop-blur-xl p-5 shadow-card transition-all duration-500 ease-apple hover:-translate-y-1 hover:border-status-warning/30 hover:shadow-stripe-hover relative">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-status-warning/5 rounded-full blur-2xl pointer-events-none group-hover:bg-status-warning/10 transition-colors" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-status-warning/10 text-status-warning shadow-inner">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">XP Gained</p>
              <p className="text-2xl font-bold text-white max-w-[120px] truncate">
                {totalXPGained}
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* Horizontal Command Bar for Creating Quests */}
      <section className="rounded-2xl border border-white/5 bg-bg-card/80 backdrop-blur-xl p-5 shadow-card relative overflow-hidden transition-all duration-500 ease-apple hover:shadow-stripe-hover mb-8">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-2 mb-4 relative z-10">
          <Plus className="h-4 w-4 text-accent-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">
            New Directive
          </h2>
        </div>

        <form onSubmit={handleCreateQuest} className="flex flex-col md:flex-row gap-4 relative z-10 items-end">
          <div className="w-full md:w-1/4">
            <label htmlFor="duration" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Type
            </label>
            <div className="relative">
              <select
                id="duration"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                className="input-discord appearance-none bg-bg-base/50 focus:bg-bg-base transition-colors w-full"
              >
                {Object.entries(durationMeta).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label} (+{meta.reward} XP)
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                <Clock className="h-4 w-4" />
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-1/4">
            <label htmlFor="recurrences" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Repeats
            </label>
            <input
              id="recurrences"
              type="number"
              min="1"
              value={recurrences}
              onChange={(e) => setRecurrences(e.target.value)}
              placeholder="1"
              className="input-discord bg-bg-base/50 focus:bg-bg-base transition-colors placeholder:text-text-muted w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="w-full md:flex-1">
            <label htmlFor="goal" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Objective
            </label>
            <input
              id="goal"
              type="text"
              value={goal}
              maxLength={60}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="Define your goal..."
              className="input-discord bg-bg-base/50 focus:bg-bg-base transition-colors placeholder:text-text-muted w-full"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="rounded-xl border border-accent-primary/50 bg-accent-primary/20 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-primary hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] flex justify-center items-center backdrop-blur-sm h-[42px] shrink-0"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Initialize"}
          </button>
        </form>
      </section>

      <section className="space-y-6">
        <div className="space-y-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            Active Quests
          </h2>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {activeQuests.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-bg-panel/10 py-12 text-center backdrop-blur-sm">
                <div className="mb-4 rounded-full bg-bg-base/50 p-4 text-text-muted shadow-inner">
                  <Target className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">No active quests</h3>
                <p className="mt-1 max-w-sm text-sm text-text-secondary">
                  Initialize a new directive to begin your journey.
                </p>
              </div>
            ) : (
              activeQuests.map((quest) => {
                const meta = getDurationMeta(quest.duration);
                return (
                  <article
                    key={quest.id}
                    className="group relative overflow-hidden rounded-2xl border border-white/5 bg-bg-panel/80 backdrop-blur-xl p-6 shadow-card transition-all duration-500 ease-apple hover:-translate-y-1 hover:border-accent-primary/30 hover:shadow-stripe-hover"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.badgeClass}`}>
                            {meta.icon}
                            {meta.label}
                          </span>
                          <span className="text-xs font-bold text-text-muted">+{meta.reward} XP</span>
                          {quest.recurrencesLeft !== undefined && quest.recurrencesLeft !== null && (
                             <span className="ml-2 text-[10px] font-bold text-accent-primary">
                               {quest.recurrencesLeft} Left
                             </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-text-primary group-hover:text-white transition-colors">{quest.goal}</h3>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(quest.id);
                        }}
                        className="rounded-lg p-1.5 text-text-muted transition-all hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100"
                        title="Delete Quest"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mb-6 space-y-2 relative z-10">
                      <div className="flex justify-between text-xs font-bold text-text-secondary">
                        <span className="uppercase tracking-wider">Progress</span>
                        <span className="text-white">{quest.progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-base border border-border/50">
                        <div
                          className={`h-full rounded-full bg-linear-to-r ${meta.progressClass} transition-all duration-500 shadow-inner`}
                          style={{ width: `${quest.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/50 relative z-10">
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => updateProgress(quest.id, quest.progress + 10)}
                          className="rounded-lg bg-border px-3.5 py-2 text-xs font-bold text-text-secondary transition-all hover:bg-accent-primary/20 hover:text-accent-primary shadow-sm"
                        >
                          +10%
                        </button>
                        <button
                          type="button"
                          onClick={() => updateProgress(quest.id, quest.progress + 25)}
                          className="rounded-lg bg-border px-3.5 py-2 text-xs font-bold text-text-secondary transition-all hover:bg-accent-primary/20 hover:text-accent-primary shadow-sm"
                        >
                          +25%
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleCompletion(quest.id)}
                        className="rounded-lg border border-accent-primary/30 bg-accent-primary/10 px-5 py-2 text-sm font-bold text-accent-primary transition-all hover:bg-accent-primary hover:text-white shadow-sm flex items-center shadow-[0_0_15px_rgba(139,92,246,0.15)] hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                      >
                        <Check className="h-4 w-4 mr-1.5" strokeWidth={2.5} />
                        Complete
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

        </div>

        {/* Historical Sections: Completed Quests vs Completed Logs */}
        <section className="grid gap-6 lg:grid-cols-2 pt-6 border-t border-border/50">
          {/* Completed Quests List */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
              Completed Quests
            </h2>
            <div className="space-y-3">
             {quests.filter(q => q.completed).length === 0 ? (
                <p className="text-sm text-text-muted">No quests completed yet.</p>
             ) : (
                quests.filter(q => q.completed).sort((a, b) => new Date(b.completedDate || 0).getTime() - new Date(a.completedDate || 0).getTime()).map(quest => {
                   const meta = getDurationMeta(quest.duration);
                   return (
                    <article key={quest.id} className="group relative overflow-hidden rounded-xl border border-white/5 bg-bg-card/40 backdrop-blur-md p-4 opacity-75 grayscale-[0.3] hover:grayscale-0 hover:opacity-100 transition-all duration-500 ease-apple hover:shadow-sm hover:-translate-y-0.5">
                       <button
                          onClick={(e) => {
                             e.stopPropagation();
                             setDeleteId(quest.id);
                          }}
                          className="absolute top-2 right-2 z-20 rounded-lg p-1.5 text-text-muted opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                          title="Delete Quest"
                       >
                          <Trash2 className="h-3.5 w-3.5" />
                       </button>
                       <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                             <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-success/10 text-status-success">
                                <Check className="h-4 w-4" />
                             </div>
                             <div>
                                <h3 className="font-bold text-text-primary line-through decoration-text-muted/50">{quest.goal}</h3>
                                <div className="flex items-center gap-2 text-xs text-text-secondary">
                                   <span>{meta.label}</span>
                                   <span>•</span>
                                   <span>Completed {new Date(quest.completedDate!).toLocaleDateString()}</span>
                                   <span>•</span>
                                   <span className="text-accent-primary">
                                      {quest.recurrencesLeft === undefined || quest.recurrencesLeft === null
                                        ? "Infinite Loop" 
                                        : quest.recurrencesLeft === 0 
                                            ? "Final Cycle" 
                                            : `${quest.recurrencesLeft} Repeats Left`}
                                   </span>
                                </div>
                             </div>
                          </div>
                      </div>
                    </article>
                   );
                })
             )}
            </div>
          </div>
        {/* Completed Logs Aggregation */}
        <section className="rounded-2xl border border-white/5 bg-bg-card/80 backdrop-blur-xl p-6 shadow-card relative overflow-hidden transition-all duration-500 ease-apple hover:shadow-stripe-hover hover:-translate-y-1 h-fit">
          <h2 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted relative z-10">
            <Trophy className="h-4 w-4 text-status-warning" />
            Completed Logs
          </h2>

            {completedQuestsStacked.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/50 bg-bg-panel/30 p-8 text-center relative z-10">
                <p className="text-sm text-text-muted">No completed quests logged yet.</p>
              </div>
            ) : (
              <div className="space-y-3 relative z-10">
                {completedQuestsStacked.slice(0, 5).map((group, index) => {
                  const meta = getDurationMeta(group.duration);
                  return (
                    <div
                      key={index}
                      className="group flex items-center gap-4 rounded-xl bg-bg-panel/50 p-3.5 border border-border/50 transition-all hover:border-status-success/30 hover:bg-bg-panel"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-status-success/10 text-status-success shadow-inner">
                        <Check className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-text-primary group-hover:text-white transition-colors">
                          <span className="capitalize">{group.goal}</span>
                          {group.count > 1 && <span className="ml-2 text-xs font-semibold text-accent-primary">(x{group.count})</span>}
                        </p>
                      </div>
                      <span className="text-sm font-black text-status-success">+{group.totalReward}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </section>
      </section>
    </div>

      {/* Modern Toasts */}
      <div className="fixed bottom-6 right-6 z-2200 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "animate-fade-in flex min-w-75 items-start gap-3 rounded-lg border bg-bg-card p-4 shadow-lg",
              toast.tone === "success" ? "border-status-success/30" : "border-status-error/30",
            ].join(" ")}
          >
            <div
              className={`mt-0.5 rounded p-0.5 ${
                toast.tone === "success" ? "bg-status-success/10 text-status-success" : "bg-status-error/10 text-status-error"
              }`}
            >
              {toast.tone === "success" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">{toast.title}</p>
              <p className="text-xs font-medium text-text-secondary">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-2500 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-border bg-bg-panel p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            
            <h3 className="mb-2 text-center text-lg font-bold text-white">Delete Quest?</h3>
            <p className="mb-6 text-center text-sm text-text-secondary">
              Are you sure you want to delete this quest? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-lg bg-border px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#374151]"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
