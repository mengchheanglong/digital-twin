"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  ListChecks,
  Sparkles,
  Frown,
  Meh,
  Smile,
  Zap,
  Flame,
  Brain,
  RotateCcw,
  TrendingUp,
  Award,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Button,
  Card,
  Textarea,
  Badge,
  Pill,
  ProgressBar,
  Skeleton,
  useToast,
} from "@/components/ui";

/* ─── Types ─── */
interface ResponseEntry {
  question: string;
  rating: number;
}

interface CheckInResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
}

interface ProgressionResult {
  level: number;
  currentXP: number;
  requiredXP: number;
}

interface ParsedDimensions {
  energy: number;
  focus: number;
  stressControl: number;
  socialConnection: number;
  optimism: number;
}

type Mode = "guided" | "text";
type FlowState = "input" | "submitting" | "success";

/* ─── Constants ─── */
const DIMENSION_KEYS = [
  "energy",
  "focus",
  "stressControl",
  "socialConnection",
  "optimism",
] as const;
type DimensionKey = (typeof DIMENSION_KEYS)[number];

const DIMENSION_META: Record<
  DimensionKey,
  { label: string; icon: React.ElementType }
> = {
  energy: { label: "Energy", icon: Zap },
  focus: { label: "Focus", icon: Brain },
  stressControl: { label: "Stress Control", icon: Smile },
  socialConnection: { label: "Social Connection", icon: MessageSquare },
  optimism: { label: "Optimism", icon: TrendingUp },
};

const fallbackQuestions = [
  "How has your emotional energy been today?",
  "How focused did you feel on key priorities?",
  "How steady was your stress level today?",
  "How connected did you feel to people around you?",
  "How positive do you feel about tomorrow?",
];

const INSIGHT_PATH = "/dashboard/insight";

interface MoodOption {
  value: number;
  icon: React.ElementType;
  label: string;
  sublabel: string;
  textToken: string;
  bgClass: string;
  borderClass: string;
  glowVar: string;
}

const moodOptions: MoodOption[] = [
  {
    value: 1,
    icon: Frown,
    label: "Drained",
    sublabel: "Struggling today",
    textToken: "text-status-error",
    bgClass: "bg-status-error/10",
    borderClass: "border-status-error/60",
    glowVar: "--color-status-error",
  },
  {
    value: 2,
    icon: Meh,
    label: "Low",
    sublabel: "Not my best",
    textToken: "text-status-warning",
    bgClass: "bg-status-warning/10",
    borderClass: "border-status-warning/60",
    glowVar: "--color-status-warning",
  },
  {
    value: 3,
    icon: Smile,
    label: "Okay",
    sublabel: "Holding steady",
    textToken: "text-status-success",
    bgClass: "bg-status-success/10",
    borderClass: "border-status-success/60",
    glowVar: "--color-status-success",
  },
  {
    value: 4,
    icon: Flame,
    label: "Good",
    sublabel: "Feeling strong",
    textToken: "text-status-info",
    bgClass: "bg-status-info/10",
    borderClass: "border-status-info/60",
    glowVar: "--color-status-info",
  },
  {
    value: 5,
    icon: Zap,
    label: "Energized",
    sublabel: "On top of the world",
    textToken: "text-accent-primary",
    bgClass: "bg-accent-primary/10",
    borderClass: "border-accent-primary/60",
    glowVar: "--color-accent-primary",
  },
];

/* ─── Helpers ─── */
function getMoodOption(value: number): MoodOption | undefined {
  return moodOptions.find((m) => m.value === value);
}

function triggerConfetti() {
  const rootStyle = getComputedStyle(document.documentElement);
  const colors = [
    rootStyle.getPropertyValue("--color-accent-primary").trim(),
    rootStyle.getPropertyValue("--color-accent-glow").trim(),
    rootStyle.getPropertyValue("--color-status-success").trim(),
    rootStyle.getPropertyValue("--color-status-warning").trim(),
  ];
  confetti({
    particleCount: 140,
    spread: 80,
    origin: { y: 0.55 },
    colors,
    disableForReducedMotion: true,
  });
  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 },
      colors,
      disableForReducedMotion: true,
    });
  }, 200);
}

/* ─── Sub-components ─── */
function RatingButton({
  option,
  selected,
  onClick,
  size = "lg",
}: {
  option: MoodOption;
  selected: boolean;
  onClick: () => void;
  size?: "sm" | "lg";
}) {
  const Icon = option.icon;
  const glowColor = `color-mix(in srgb, var(${option.glowVar}) 22%, transparent)`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all ease-spring focus-ring",
        size === "lg" ? "py-5 px-3" : "py-2.5 px-2",
        selected
          ? `${option.bgClass} ${option.borderClass} scale-[1.03]`
          : "bg-bg-panel/60 border-border hover:bg-bg-panel hover:border-border-hover hover:scale-[1.02]",
      ].join(" ")}
      style={
        selected
          ? { boxShadow: `0 0 24px ${glowColor}` }
          : undefined
      }
    >
      <Icon
        className={[
          "transition-transform duration-200 ease-spring",
          size === "lg" ? "h-8 w-8" : "h-5 w-5",
          selected ? option.textToken : "text-text-muted group-hover:text-text-secondary",
          selected ? "" : "group-hover:scale-110",
        ].join(" ")}
        strokeWidth={selected ? 2.25 : 1.5}
      />
      <span
        className={[
          "font-bold leading-none",
          size === "lg" ? "text-[11px]" : "text-[10px]",
          selected ? option.textToken : "text-text-muted",
        ].join(" ")}
      >
        {option.label}
      </span>
      {selected && (
        <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-accent-primary flex items-center justify-center shadow-glow-soft animate-scale-in">
          <CheckCircle2
            className="h-3 w-3 text-text-inverse"
            strokeWidth={3}
          />
        </div>
      )}
    </button>
  );
}

function SmallRatingRow({
  label,
  value,
  onChange,
  Icon,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  Icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-36 shrink-0">
        <Icon className="h-4 w-4 text-text-muted" />
        <span className="text-sm font-medium text-text-secondary">{label}</span>
      </div>
      <div className="flex gap-1.5 flex-1">
        {moodOptions.map((opt) => {
          const isSelected = value === opt.value;
          const glowColor = `color-mix(in srgb, var(${opt.glowVar}) 22%, transparent)`;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={[
                "flex-1 h-9 rounded-xl border text-xs font-bold transition-all ease-spring focus-ring flex items-center justify-center",
                isSelected
                  ? `${opt.bgClass} ${opt.borderClass} scale-105`
                  : "bg-bg-panel border-border text-text-muted hover:bg-bg-hover hover:border-border-hover hover:text-text-secondary",
              ].join(" ")}
              style={isSelected ? { boxShadow: `0 0 12px ${glowColor}` } : undefined}
            >
              {opt.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function DailyCheckInPage() {
  const router = useRouter();
  const { requireAuth, getAuthHeaders } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("guided");
  const [flowState, setFlowState] = useState<FlowState>("input");
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<number[]>([]);
  const [selectedRating, setSelectedRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [nlText, setNlText] = useState("");
  const [nlParsing, setNlParsing] = useState(false);
  const [nlParsed, setNlParsed] = useState<ParsedDimensions | null>(null);
  const [nlFallback, setNlFallback] = useState(false);

  const [result, setResult] = useState<CheckInResult | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);

  const autoAdvanceRef = useRef<number | null>(null);
  const redirectRef = useRef<number | null>(null);

  const completionPercent = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round((currentIndex / questions.length) * 100);
  }, [currentIndex, questions.length]);

  /* ── Fetch questions ── */
  const fetchQuestions = useCallback(async () => {
    const headers = requireAuth();
    if (!headers) return;
    try {
      const response = await axios.get("/api/checkin/questions", { headers });
      const incoming = response.data?.questions;
      setQuestions(
        Array.isArray(incoming) && incoming.length ? incoming : fallbackQuestions
      );
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        toast({
          title: "Already checked in",
          description: "You've already completed your check-in today.",
          variant: "info",
        });
        router.replace(INSIGHT_PATH);
        return;
      }
      setQuestions(fallbackQuestions);
    } finally {
      setLoading(false);
    }
  }, [requireAuth, router, toast]);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  /* ── Cleanup timers ── */
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) window.clearTimeout(autoAdvanceRef.current);
      if (redirectRef.current) window.clearTimeout(redirectRef.current);
    };
  }, []);

  /* ── Submit ── */
  const submitCheckIn = useCallback(
    async (entries: ResponseEntry[]) => {
      setFlowState("submitting");
      const headers = getAuthHeaders();
      if (!headers) {
        router.push("/");
        return;
      }
      try {
        const ratingsArr = entries.map((e) => e.rating);
        const response = await axios.post(
          "/api/checkin/submit",
          { ratings: ratingsArr },
          { headers }
        );
        const apiResult = response.data?.result as CheckInResult | undefined;
        const apiProgression = response.data?.progression as
          | ProgressionResult
          | undefined;
        const computedTotal = ratingsArr.reduce((s, v) => s + v, 0);
        const computedMax = ratingsArr.length * 5;
        const computedPct = Math.round((computedTotal / computedMax) * 100);
        const finalResult: CheckInResult =
          apiResult && Number.isFinite(apiResult.totalScore)
            ? apiResult
            : {
                totalScore: computedTotal,
                maxScore: computedMax,
                percentage: computedPct,
              };

        setResult(finalResult);
        setProgression(apiProgression ?? null);
        setFlowState("success");

        if (finalResult.percentage >= 80) {
          triggerConfetti();
        }

        redirectRef.current = window.setTimeout(() => {
          router.replace(INSIGHT_PATH);
        }, 1800);
      } catch {
        toast({
          title: "Submission failed",
          description: "Failed to submit check-in. Please try again.",
          variant: "error",
        });
        setFlowState("input");
      }
    },
    [getAuthHeaders, router, toast]
  );

  /* ── Auto-advance logic ── */
  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceRef.current) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  }, []);

  const scheduleAutoAdvance = useCallback(() => {
    clearAutoAdvance();
    autoAdvanceRef.current = window.setTimeout(() => {
      handleAdvance(1);
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearAutoAdvance, currentIndex, ratings, questions]);

  /* ── Navigation ── */
  const handleAdvance = useCallback(
    (dir: 1 | -1) => {
      if (isTransitioning) return;
      clearAutoAdvance();

      if (dir === -1 && currentIndex > 0) {
        setIsTransitioning(true);
        window.setTimeout(() => {
          setCurrentIndex((i) => i - 1);
          setSelectedRating(ratings[currentIndex - 1] ?? 0);
          setIsTransitioning(false);
        }, 180);
        return;
      }

      if (dir === 1 && selectedRating === 0) return;

      if (dir === 1 && currentIndex < questions.length - 1) {
        setIsTransitioning(true);
        const nextRatings = [...ratings];
        nextRatings[currentIndex] = selectedRating;
        setRatings(nextRatings);
        window.setTimeout(() => {
          setCurrentIndex((i) => i + 1);
          setSelectedRating(ratings[currentIndex + 1] ?? 0);
          setIsTransitioning(false);
        }, 180);
        return;
      }

      if (dir === 1 && currentIndex === questions.length - 1) {
        const nextRatings = [...ratings];
        nextRatings[currentIndex] = selectedRating;
        const entries: ResponseEntry[] = questions.map((q, i) => ({
          question: q,
          rating: nextRatings[i] ?? 3,
        }));
        void submitCheckIn(entries);
      }
    },
    [clearAutoAdvance, currentIndex, isTransitioning, questions, ratings, selectedRating, submitCheckIn]
  );

  const onSelectRating = useCallback(
    (value: number) => {
      setSelectedRating(value);
      scheduleAutoAdvance();
    },
    [scheduleAutoAdvance]
  );

  /* ── NL Parse ── */
  const parseNLText = useCallback(async () => {
    if (!nlText.trim()) return;
    const headers = getAuthHeaders();
    if (!headers) return;
    setNlParsing(true);
    setNlParsed(null);
    setNlFallback(false);
    try {
      const res = await axios.post(
        "/api/checkin/parse",
        { text: nlText },
        { headers }
      );
      if (res.data?.success) {
        setNlParsed(res.data.dimensions as ParsedDimensions);
        setNlFallback(!!res.data.fallback);
      }
    } catch {
      toast({
        title: "AI parsing failed",
        description: "Please try again or use guided mode.",
        variant: "error",
      });
    } finally {
      setNlParsing(false);
    }
  }, [getAuthHeaders, nlText, toast]);

  const submitNLCheckIn = useCallback(async () => {
    if (!nlParsed) return;
    const ratingsArr = DIMENSION_KEYS.map((k) => nlParsed[k] ?? 3);
    const entries: ResponseEntry[] = questions.length
      ? questions.map((q, i) => ({ question: q, rating: ratingsArr[i] ?? 3 }))
      : DIMENSION_KEYS.map((k, i) => ({
          question: DIMENSION_META[k].label,
          rating: ratingsArr[i] ?? 3,
        }));
    await submitCheckIn(entries);
  }, [nlParsed, questions, submitCheckIn]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-6 animate-fade-in">
          <div className="flex flex-col items-center gap-3 mb-8">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-9 w-64 rounded-lg" />
            <Skeleton className="h-4 w-48 rounded-md" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Success State ── */
  if (flowState === "success" && result) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-10 animate-fade-in">
        <Card variant="elevated" className="w-full max-w-lg p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent-subtle ring-1 ring-accent-primary/20 animate-scale-in">
            <Award className="h-8 w-8 text-accent-primary" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            Nice work!
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            You completed your daily check-in. Here is how you scored today.
          </p>

          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-gradient">
                {result.totalScore}
              </span>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide mt-1">
                Total Score
              </span>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold text-gradient-warm">
                {result.percentage}%
              </span>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide mt-1">
                Wellness
              </span>
            </div>
          </div>

          {progression && (
            <div className="rounded-xl bg-bg-panel border border-border p-4 mb-6 animate-slide-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                  Level {progression.level}
                </span>
                <Pill tone="accent">
                  <Sparkles className="h-3 w-3 mr-1" />
                  +{result.totalScore} XP
                </Pill>
              </div>
              <ProgressBar
                value={progression.currentXP}
                max={progression.requiredXP}
                showPercentage={false}
                size="sm"
                shimmer
              />
              <p className="text-xs text-text-muted mt-1.5">
                {progression.currentXP} / {progression.requiredXP} XP to next
                level
              </p>
            </div>
          )}

          <p className="text-xs text-text-muted">
            Redirecting to your insights…
          </p>
        </Card>
      </div>
    );
  }

  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center animate-fade-in">
        <Badge tone="accent" className="mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-primary animate-pulse" />
          Daily Check-In
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          How are you today?
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          A quick pulse to understand your current state.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="mb-8 animate-fade-in">
        <div className="relative flex rounded-xl border border-border bg-bg-panel p-1 gap-1">
          <div
            className="absolute top-1 bottom-1 rounded-lg bg-accent-primary transition-all duration-300 ease-spring"
            style={{
              width: mode === "guided" ? "calc(50% - 4px)" : "calc(50% - 4px)",
              left: mode === "guided" ? "4px" : "calc(50%)",
            }}
          />
          <button
            type="button"
            onClick={() => {
              setMode("guided");
              clearAutoAdvance();
            }}
            className={[
              "relative z-10 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
              mode === "guided"
                ? "text-text-inverse"
                : "text-text-muted hover:text-text-secondary",
            ].join(" ")}
          >
            <ListChecks className="h-3.5 w-3.5" /> Guided
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("text");
              clearAutoAdvance();
            }}
            className={[
              "relative z-10 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
              mode === "text"
                ? "text-text-inverse"
                : "text-text-muted hover:text-text-secondary",
            ].join(" ")}
          >
            <MessageSquare className="h-3.5 w-3.5" /> Natural Language
          </button>
        </div>
      </div>

      {/* ── Natural Language Mode ── */}
      {mode === "text" && (
        <div className="w-full max-w-xl animate-fade-in space-y-5">
          <Card variant="elevated" className="p-6 space-y-5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">
                Talk to your twin
              </p>
              <p className="text-xs text-text-secondary">
                Describe how you are feeling in your own words. Your twin will
                extract your wellness scores automatically.
              </p>
            </div>

            <div className="relative">
              <Textarea
                value={nlText}
                onChange={(e) => setNlText(e.target.value)}
                placeholder="How are you feeling today? Let it out..."
                rows={5}
                maxLength={1000}
                resize="none"
                className="min-h-[120px]"
              />
              <div className="absolute bottom-2.5 right-3 text-[10px] font-semibold text-text-muted tabular-nums">
                {nlText.length}/1000
              </div>
            </div>

            {/* Parsed preview */}
            {nlParsed && (
              <div className="rounded-xl border border-border bg-bg-panel p-5 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent-primary" />
                    <span className="text-sm font-semibold text-text-primary">
                      AI-Parsed Scores
                    </span>
                  </div>
                  {nlFallback ? (
                    <Pill tone="warning">Fallback used</Pill>
                  ) : (
                    <Pill tone="accent">AI-parsed</Pill>
                  )}
                </div>

                {nlFallback && (
                  <p className="text-xs text-status-warning bg-status-warning/10 border border-status-warning/20 rounded-lg px-3 py-2">
                    AI was unavailable, so neutral scores were used. Feel free
                    to adjust them below.
                  </p>
                )}

                <div className="space-y-3">
                  {DIMENSION_KEYS.map((key) => {
                    const meta = DIMENSION_META[key];
                    return (
                      <SmallRatingRow
                        key={key}
                        label={meta.label}
                        Icon={meta.icon}
                        value={nlParsed[key] ?? 3}
                        onChange={(v) =>
                          setNlParsed((prev) =>
                            prev ? { ...prev, [key]: v } : prev
                          )
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                loading={nlParsing}
                leftIcon={<Sparkles className="h-4 w-4" />}
                onClick={() => void parseNLText()}
                disabled={!nlText.trim() || nlParsing}
              >
                {nlParsing ? "Parsing…" : "Parse with AI"}
              </Button>
              {nlParsed && (
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={flowState === "submitting"}
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => void submitNLCheckIn()}
                  disabled={flowState === "submitting"}
                >
                  {flowState === "submitting" ? "Submitting…" : "Submit"}
                </Button>
              )}
            </div>
          </Card>

          <p className="text-center text-xs text-text-muted">
            Your twin learns from your words — be as honest as you like.
          </p>
        </div>
      )}

      {/* ── Guided Mode ── */}
      {mode === "guided" && (
        <div className="w-full max-w-xl animate-fade-in space-y-6">
          {/* Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-[11px] font-bold text-accent-primary">
                {completionPercent}% done
              </span>
            </div>
            <ProgressBar
              value={currentIndex}
              max={questions.length}
              size="sm"
              shimmer
            />
            <div className="flex items-center gap-2">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={[
                    "h-2 flex-1 rounded-full transition-all duration-500 ease-spring",
                    i < currentIndex
                      ? "bg-accent-primary"
                      : i === currentIndex
                      ? "bg-accent-primary/50"
                      : "bg-bg-input",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>

          {/* Question Card */}
          <div
            className={[
              "transition-all duration-200 ease-spring",
              isTransitioning
                ? "opacity-0 scale-[0.97] translate-x-[-12px]"
                : "opacity-100 scale-100 translate-x-0",
            ].join(" ")}
          >
            <Card variant="elevated" className="p-7 sm:p-8">
              {/* Dimension badge */}
              <div className="flex items-center justify-center mb-5">
                <Badge tone="default">
                  {DIMENSION_META[DIMENSION_KEYS[currentIndex]]?.label ??
                    `Dimension ${currentIndex + 1}`}
                </Badge>
              </div>

              {/* Question text */}
              <h2 className="text-lg sm:text-xl font-semibold leading-relaxed text-text-primary text-center mb-8">
                {questions[currentIndex]}
              </h2>

              {/* Rating buttons */}
              <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-6">
                {moodOptions.map((opt) => (
                  <RatingButton
                    key={opt.value}
                    option={opt}
                    selected={selectedRating === opt.value}
                    onClick={() => onSelectRating(opt.value)}
                  />
                ))}
              </div>

              {/* Sublabel */}
              <div className="mb-8 h-6 flex items-center justify-center">
                {selectedRating > 0 && (
                  <p className="text-sm font-medium text-text-secondary animate-fade-in">
                    {getMoodOption(selectedRating)?.sublabel}
                  </p>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-3">
                {currentIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="md"
                    leftIcon={<ArrowLeft className="h-4 w-4" />}
                    onClick={() => handleAdvance(-1)}
                    disabled={isTransitioning || flowState === "submitting"}
                  >
                    Back
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={flowState === "submitting"}
                  rightIcon={
                    flowState === "submitting" ? undefined : isLastQuestion ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )
                  }
                  onClick={() => handleAdvance(1)}
                  disabled={
                    !selectedRating || isTransitioning || flowState === "submitting"
                  }
                  className={!selectedRating ? "opacity-60" : ""}
                >
                  {flowState === "submitting"
                    ? "Submitting…"
                    : isLastQuestion
                    ? "Complete Check-In"
                    : "Next"}
                </Button>
              </div>
            </Card>
          </div>

          {/* Footer hint */}
          <p className="text-center text-xs text-text-muted">
            Take a moment to reflect honestly — your twin learns from every
            answer.
          </p>
        </div>
      )}
    </div>
  );
}
