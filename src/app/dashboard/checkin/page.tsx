"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Frown, Meh, Smile, Zap, Flame } from "lucide-react";
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
  colorClass: string;
}

const moodOptions: MoodOption[] = [
  {
    value: 1,
    icon: Frown,
    label: "Low",
    colorClass: "text-status-error",
  },
  {
    value: 2,
    icon: Meh,
    label: "Neutral",
    colorClass: "text-text-muted",
  },
  {
    value: 3,
    icon: Smile,
    label: "Good",
    colorClass: "text-status-success",
  },
  {
    value: 4,
    icon: Flame,
    label: "Great",
    colorClass: "text-[#22D3EE]",
  },
  {
    value: 5,
    icon: Zap,
    label: "Excellent",
    colorClass: "text-accent-primary",
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

  const completionPercent = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round(((currentQuestionIndex + 1) / questions.length) * 100);
  }, [currentQuestionIndex, questions.length]);

  const fetchQuestions = useCallback(async () => {
    const headers = requireAuth();
    if (!headers) return;

    try {
      const response = await axios.get("/api/checkin/questions", { headers });
      const incomingQuestions = response.data?.questions;
      setQuestions(Array.isArray(incomingQuestions) && incomingQuestions.length ? incomingQuestions : fallbackQuestions);
      setError("");
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 400) {
        setRedirecting(true);
        router.replace(INSIGHT_PATH);
        return;
      } else {
        setQuestions(fallbackQuestions);
      }
    } finally {
      setLoading(false);
    }
  }, [requireAuth, router]);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  const submitCheckIn = async (entries: ResponseEntry[]) => {
    setSubmitting(true);
    setError("");

    const headers = getAuthHeaders();
    if (!headers) {
      router.push("/");
      setSubmitting(false);
      return;
    }

    try {
      const ratings = entries.map((entry) => entry.rating);
      const response = await axios.post(
        "/api/checkin/submit",
        { ratings },
        { headers },
      );

      const apiResult = response.data?.result as CheckInResult | undefined;
      const computedTotal = ratings.reduce((sum, value) => sum + value, 0);
      const computedMax = ratings.length * 5;
      const computedPercentage = Math.round((computedTotal / computedMax) * 100);

      const finalResult: CheckInResult =
        apiResult && Number.isFinite(apiResult.totalScore)
          ? apiResult
          : {
              totalScore: computedTotal,
              maxScore: computedMax,
              percentage: computedPercentage,
            };

      if (finalResult.percentage >= 80) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#8B5CF6", "#34D399", "#FCD34D"],
        });
      }

      setRedirecting(true);
      router.replace(INSIGHT_PATH);
      return;
    } catch {
      setError("Failed to submit daily pulse. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (!selectedRating) return;

    const nextResponses = [
      ...responses,
      {
        question: questions[currentQuestionIndex],
        rating: selectedRating,
      },
    ];
    setResponses(nextResponses);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((current) => current + 1);
      setSelectedRating(0);
      return;
    }

    await submitCheckIn(nextResponses);
  };

  if (loading || redirecting) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-text-secondary">
          <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
          <p className="text-sm font-medium">{redirecting ? "Redirecting to insight..." : "Loading system..."}</p>
        </div>
      </div>
    );
  }

  // Question Flow
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4 text-text-primary">
      <div className="mb-8 text-center animate-fade-in">
        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Daily Log</span>
        <h1 className="text-2xl font-bold mt-1">System Check</h1>
      </div>

      <div className="w-full max-w-2xl p-8 rounded-xl border border-border/40 bg-bg-panel/20 shadow-sm backdrop-blur-sm animate-fade-in">
        {error && (
            <div className="mb-6 rounded border border-status-error/20 bg-status-error/10 px-4 py-3 text-sm text-status-error">
                {error}
            </div>
        )}

        {/* Progress */}
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-text-muted">
            <span>Query {currentQuestionIndex + 1} / {questions.length}</span>
            <span>{completionPercent}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-bg-base/50">
            <div 
                className="h-full rounded-full bg-accent-primary transition-all duration-300 ease-out"
                style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="mb-10 text-center">
            <h2 className="text-xl font-medium leading-relaxed text-white">
                {questions[currentQuestionIndex]}
            </h2>
        </div>

        {/* Mood Selector */}
        <div className="mb-10 grid grid-cols-5 gap-3">
            {moodOptions.map((mood) => {
                const isSelected = selectedRating === mood.value;
                const Icon = mood.icon;
                return (
                    <button
                        key={mood.value}
                        type="button"
                        onClick={() => setSelectedRating(mood.value)}
                        className={`group relative flex flex-col items-center justify-center gap-2 rounded-lg p-4 transition-all duration-200 border ${
                            isSelected 
                                ? `bg-accent-primary/10 border-accent-primary shadow-[0_0_15px_rgba(139,92,246,0.15)]` 
                                : "bg-bg-panel/20 border-border/40 hover:bg-bg-panel/50 hover:border-text-secondary/50"
                        }`}
                    >
                        <span className={`transition-transform duration-200 group-hover:scale-110 ${isSelected ? mood.colorClass : "text-text-muted group-hover:text-text-secondary"}`}>
                            <Icon className="h-8 w-8" strokeWidth={1.5} />
                        </span>
                        {isSelected && (
                             <span className={`text-[10px] font-bold uppercase tracking-wide ${mood.colorClass}`}>
                                {mood.label}
                             </span>
                        )}
                    </button>
                );
            })}
        </div>

        {/* Action Button */}
        <button
            type="button"
            onClick={() => void handleNext()}
            disabled={!selectedRating || submitting}
            className="rounded-lg bg-accent-primary/10 px-4 py-3 w-full text-sm font-semibold text-accent-primary transition-all hover:bg-accent-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
            {submitting ? (
                <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                </div>
            ) : currentQuestionIndex < questions.length - 1 ? (
                <div className="flex items-center justify-center gap-2">
                    <span>Next Query</span>
                    <ArrowRight className="h-4 w-4" />
                </div>
            ) : (
                "Complete"
            )}
        </button>
      </div>
    </div>
  );
}
