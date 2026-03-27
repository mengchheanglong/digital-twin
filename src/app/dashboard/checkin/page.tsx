"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Frown, Meh, Smile, Zap, Flame, CheckCircle2, MessageSquare, ListChecks, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ResponseEntry {
  question: string;
  rating: number;
}

interface CheckInResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
}

interface MoodOption {
  value: number;
  icon: React.ElementType;
  label: string;
  sublabel: string;
  selectedBg: string;
  selectedBorder: string;
  selectedText: string;
  selectedGlow: string;
  iconColor: string;
}

const moodOptions: MoodOption[] = [
  {
    value: 1,
    icon: Frown,
    label: "Low",
    sublabel: "Struggling",
    selectedBg: "bg-red-500/10",
    selectedBorder: "border-red-500/60",
    selectedText: "text-red-400",
    selectedGlow: "shadow-[0_0_20px_rgba(239,68,68,0.2)]",
    iconColor: "text-red-400",
  },
  {
    value: 2,
    icon: Meh,
    label: "Neutral",
    sublabel: "So-so",
    selectedBg: "bg-amber-500/10",
    selectedBorder: "border-amber-500/60",
    selectedText: "text-amber-400",
    selectedGlow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    iconColor: "text-amber-400",
  },
  {
    value: 3,
    icon: Smile,
    label: "Good",
    sublabel: "Feeling fine",
    selectedBg: "bg-status-success/10",
    selectedBorder: "border-status-success/60",
    selectedText: "text-status-success",
    selectedGlow: "shadow-[0_0_20px_rgba(52,211,153,0.2)]",
    iconColor: "text-status-success",
  },
  {
    value: 4,
    icon: Flame,
    label: "Great",
    sublabel: "Energized",
    selectedBg: "bg-cyan-500/10",
    selectedBorder: "border-cyan-500/60",
    selectedText: "text-cyan-400",
    selectedGlow: "shadow-[0_0_20px_rgba(6,182,212,0.2)]",
    iconColor: "text-cyan-400",
  },
  {
    value: 5,
    icon: Zap,
    label: "Peak",
    sublabel: "On fire",
    selectedBg: "bg-accent-primary/10",
    selectedBorder: "border-accent-primary/60",
    selectedText: "text-accent-primary",
    selectedGlow: "shadow-[0_0_20px_rgba(139,92,246,0.25)]",
    iconColor: "text-accent-primary",
  },
];

const fallbackQuestions = [
  "How has your emotional energy been today?",
  "How focused did you feel on key priorities?",
  "How steady was your stress level today?",
  "How connected did you feel to people around you?",
  "How positive do you feel about tomorrow?",
];

const INSIGHT_PATH = "/dashboard/insight";

export default function DailyPulsePage() {
  const router = useRouter();
  const { requireAuth, getAuthHeaders } = useAuth();
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [responses, setResponses] = useState<ResponseEntry[]>([]);
  const [redirecting, setRedirecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [animating, setAnimating] = useState(false);
  // Natural language mode
  const [mode, setMode] = useState<"guided" | "text">("guided");
  const [nlText, setNlText] = useState("");
  const [nlParsing, setNlParsing] = useState(false);
  const [nlParsed, setNlParsed] = useState<Record<string, number> | null>(null);
  const [nlError, setNlError] = useState("");

  const completionPercent = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round((currentQuestionIndex / questions.length) * 100);
  }, [currentQuestionIndex, questions.length]);

  const fetchQuestions = useCallback(async () => {
    const headers = requireAuth();
    if (!headers) return;
    try {
      const response = await axios.get("/api/checkin/questions", { headers });
      const incoming = response.data?.questions;
      setQuestions(Array.isArray(incoming) && incoming.length ? incoming : fallbackQuestions);
      setError("");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setRedirecting(true);
        router.replace(INSIGHT_PATH);
        return;
      }
      setQuestions(fallbackQuestions);
    } finally {
      setLoading(false);
    }
  }, [requireAuth, router]);

  useEffect(() => { void fetchQuestions(); }, [fetchQuestions]);

  const parseNLText = async () => {
    if (!nlText.trim()) return;
    const headers = getAuthHeaders();
    if (!headers) return;
    setNlParsing(true);
    setNlError("");
    setNlParsed(null);
    try {
      const res = await axios.post("/api/checkin/parse", { text: nlText }, { headers });
      if (res.data?.success) {
        setNlParsed(res.data.dimensions as Record<string, number>);
      }
    } catch {
      setNlError("AI parsing failed. Please try again or use guided mode.");
    } finally {
      setNlParsing(false);
    }
  };

  const submitNLCheckIn = async () => {
    if (!nlParsed) return;
    const orderedKeys = ["energy", "focus", "stressControl", "socialConnection", "optimism"];
    const ratings = orderedKeys.map((k) => nlParsed[k] ?? 3);
    const entries: ResponseEntry[] = questions.length
      ? questions.map((q, i) => ({ question: q, rating: ratings[i] ?? 3 }))
      : orderedKeys.map((k, i) => ({ question: k, rating: ratings[i] ?? 3 }));
    await submitCheckIn(entries);
  };

  const submitCheckIn = async (entries: ResponseEntry[]) => {
    setSubmitting(true);
    setError("");
    const headers = getAuthHeaders();
    if (!headers) { router.push("/"); setSubmitting(false); return; }
    try {
      const ratings = entries.map((e) => e.rating);
      const response = await axios.post("/api/checkin/submit", { ratings }, { headers });
      const apiResult = response.data?.result as CheckInResult | undefined;
      const computedTotal = ratings.reduce((s, v) => s + v, 0);
      const computedMax = ratings.length * 5;
      const computedPct = Math.round((computedTotal / computedMax) * 100);
      const finalResult: CheckInResult = apiResult && Number.isFinite(apiResult.totalScore)
        ? apiResult
        : { totalScore: computedTotal, maxScore: computedMax, percentage: computedPct };

      if (finalResult.percentage >= 80) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#8B5CF6", "#34D399", "#FCD34D"] });
      }
      setRedirecting(true);
      router.replace(INSIGHT_PATH);
    } catch {
      setError("Failed to submit check-in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (!selectedRating || animating) return;
    setAnimating(true);
    const nextResponses = [...responses, { question: questions[currentQuestionIndex], rating: selectedRating }];
    setResponses(nextResponses);

    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex((i) => i + 1);
        setSelectedRating(0);
        setAnimating(false);
      }, 180);
      return;
    }
    setAnimating(false);
    await submitCheckIn(nextResponses);
  };

  if (loading || redirecting) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-accent-primary/30 border-t-accent-primary animate-spin" />
          <p className="text-sm font-medium text-text-secondary">
            {redirecting ? "Redirecting…" : "Loading check-in…"}
          </p>
        </div>
      </div>
    );
  }

  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center px-4 py-10 text-text-primary">
      {/* Header */}
      <div className="mb-8 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent-primary/25 bg-accent-primary/8 px-4 py-1.5 text-xs font-semibold text-accent-glow mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-primary animate-pulse" />
          Daily Check-In
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">How are you today?</h1>
        <p className="mt-2 text-sm text-text-secondary">A quick pulse to understand your current state.</p>
      </div>

      {/* Mode Toggle */}
      <div className="mb-6 flex rounded-xl border border-white/5 bg-bg-panel p-1 gap-1 animate-fade-in">
        <button
          onClick={() => setMode("guided")}
          className={[
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
            mode === "guided" ? "bg-accent-primary text-white" : "text-text-muted hover:text-white",
          ].join(" ")}
        >
          <ListChecks className="h-3.5 w-3.5" /> Guided
        </button>
        <button
          onClick={() => setMode("text")}
          className={[
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
            mode === "text" ? "bg-accent-primary text-white" : "text-text-muted hover:text-white",
          ].join(" ")}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Natural Language
        </button>
      </div>

      {/* Natural Language Mode */}
      {mode === "text" && (
        <div className="w-full max-w-lg animate-fade-in space-y-4">
          <div className="rounded-2xl border border-white/5 bg-bg-card p-6 shadow-2xl space-y-4">
            <p className="text-sm text-text-secondary">
              Just describe how you&apos;re feeling in your own words. Your twin will extract your wellness scores automatically.
            </p>
            <textarea
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              placeholder="e.g. I'm feeling pretty drained today and my focus is low, but I'm weirdly optimistic about the week ahead..."
              className="w-full resize-none rounded-xl border border-border bg-bg-panel px-4 py-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 transition-colors"
              rows={4}
              maxLength={1000}
            />
            {nlError && <p className="text-xs text-status-error">{nlError}</p>}

            {/* Parsed preview */}
            {nlParsed && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2 animate-fade-in">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
                  <Sparkles className="h-3.5 w-3.5" /> AI extracted these scores — adjust if needed
                </div>
                {[
                  { key: "energy", label: "Energy", emoji: "⚡" },
                  { key: "focus", label: "Focus", emoji: "🎯" },
                  { key: "stressControl", label: "Stress Control", emoji: "🧘" },
                  { key: "socialConnection", label: "Social Connection", emoji: "🤝" },
                  { key: "optimism", label: "Optimism", emoji: "🌟" },
                ].map(({ key, label, emoji }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm w-32 text-text-secondary">{emoji} {label}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          onClick={() => setNlParsed((prev) => prev ? { ...prev, [key]: v } : prev)}
                          className={[
                            "h-7 w-7 rounded-lg text-xs font-bold border transition-all",
                            nlParsed[key] === v
                              ? "bg-accent-primary border-accent-primary text-white"
                              : "bg-white/5 border-white/10 text-text-muted hover:bg-white/10",
                          ].join(" ")}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => void parseNLText()}
                disabled={nlParsing || !nlText.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold bg-white/5 border border-white/10 text-text-secondary hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all"
              >
                {nlParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {nlParsing ? "Parsing…" : "Parse with AI"}
              </button>
              {nlParsed && (
                <button
                  onClick={() => void submitNLCheckIn()}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-50 transition-all"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submitting ? "Submitting…" : "Submit Check-In"}
                </button>
              )}
            </div>
          </div>
          <p className="text-center text-xs text-text-muted/60">
            Your twin learns from your words — be as honest as you like.
          </p>
        </div>
      )}

      {/* Guided Mode */}
      {mode === "guided" && (
      <div className="w-full max-w-lg animate-fade-in">
        {/* Progress Steps */}
        <div className="mb-6 flex items-center gap-1.5">
          {questions.map((_, i) => (
            <div
              key={i}
              className={[
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                i < currentQuestionIndex
                  ? "bg-accent-primary"
                  : i === currentQuestionIndex
                  ? "bg-accent-primary/60"
                  : "bg-border",
              ].join(" ")}
            />
          ))}
        </div>

        {/* Question Label */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-[11px] font-bold text-accent-primary">{completionPercent}% done</span>
        </div>

        {/* Card */}
        <div
          key={currentQuestionIndex}
          className="rounded-2xl border border-border bg-bg-card p-7 shadow-2xl animate-scale-in"
        >
          {error && (
            <div className="mb-5 rounded-xl border border-status-error/20 bg-status-error/10 px-4 py-3 text-sm text-status-error flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-status-error" />
              {error}
            </div>
          )}

          {/* Question Text */}
          <h2 className="text-lg font-semibold leading-relaxed text-white text-center mb-8">
            {questions[currentQuestionIndex]}
          </h2>

          {/* Mood Selector */}
          <div className="grid grid-cols-5 gap-2 mb-8">
            {moodOptions.map((mood) => {
              const isSelected = selectedRating === mood.value;
              const Icon = mood.icon;
              return (
                <button
                  key={mood.value}
                  type="button"
                  onClick={() => setSelectedRating(mood.value)}
                  className={[
                    "group relative flex flex-col items-center justify-center gap-2 rounded-xl py-4 px-2 border transition-all duration-200 focus-ring",
                    isSelected
                      ? `${mood.selectedBg} ${mood.selectedBorder} ${mood.selectedGlow} scale-[1.04]`
                      : "bg-bg-panel/60 border-border hover:bg-bg-panel hover:border-text-muted/40 hover:scale-[1.02]",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "h-7 w-7 transition-transform duration-200",
                      isSelected ? mood.iconColor : "text-text-muted group-hover:text-text-secondary",
                      isSelected ? "" : "group-hover:scale-110",
                    ].join(" ")}
                    strokeWidth={isSelected ? 2 : 1.5}
                  />
                  <span className={[
                    "text-[10px] font-bold leading-none",
                    isSelected ? mood.selectedText : "text-text-muted",
                  ].join(" ")}>
                    {mood.label}
                  </span>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent-primary flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected mood sublabel */}
          <div className="mb-6 h-5 text-center">
            {selectedRating > 0 && (
              <p className="text-sm font-medium text-text-secondary animate-fade-in">
                {moodOptions.find((m) => m.value === selectedRating)?.sublabel}
              </p>
            )}
          </div>

          {/* Next / Complete Button */}
          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={!selectedRating || submitting || animating}
            className={[
              "relative w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 overflow-hidden",
              selectedRating && !submitting
                ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/25 hover:bg-accent-hover"
                : "bg-bg-panel text-text-muted border border-border cursor-not-allowed",
            ].join(" ")}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Submitting…</span>
              </>
            ) : isLastQuestion ? (
              <>
                <span>Complete Check-In</span>
                <CheckCircle2 className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Next</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>

        {/* Skip hint */}
        <p className="mt-4 text-center text-xs text-text-muted/60">
          Take a moment to reflect honestly — your twin learns from every answer.
        </p>
      </div>
      )} {/* end guided mode */}
    </div>
  );
}
