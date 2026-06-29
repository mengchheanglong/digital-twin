"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ElementType,
} from "react";
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
  TrendingUp,
  Award,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
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
function isAlreadyCompletedCheckInError(error: unknown) {
  if (!axios.isAxiosError(error) || error.response?.status !== 400) {
    return false;
  }

  const message = error.response.data?.msg ?? error.response.data?.message;
  return (
    typeof message === "string" &&
    message.toLowerCase().includes("already completed")
  );
}

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
        size === "lg" ? "min-h-[72px] px-1 py-3 min-[380px]:px-2 min-[380px]:py-4 sm:px-3 sm:py-5" : "py-2.5 px-2",
        selected
          ? `${option.bgClass} ${option.borderClass} scale-[1.03]`
          : "bg-bg-panel/60 border-border hover:bg-bg-panel hover:border-border-hover hover:scale-[1.02]",
      ].join(" ")}
      style={selected ? { boxShadow: `0 0 24px ${glowColor}` } : undefined}
    >
      <Icon
        className={[
          "transition-transform duration-200 ease-spring",
          size === "lg" ? "h-6 w-6 min-[380px]:h-7 min-[380px]:w-7 sm:h-8 sm:w-8" : "h-5 w-5",
          selected
            ? option.textToken
            : "text-text-muted group-hover:text-text-secondary",
          selected ? "" : "group-hover:scale-110",
        ].join(" ")}
        strokeWidth={selected ? 2.25 : 1.5}
      />
      <span
        className={[
          "font-bold leading-none",
          size === "lg" ? "max-w-full break-words text-center text-[9px] leading-tight min-[380px]:text-[10px] sm:text-[11px]" : "text-[10px]",
          selected ? option.textToken : "text-text-muted",
        ].join(" ")}
      >
        {option.label}
      </span>
      {selected && (
        <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-accent-primary flex items-center justify-center shadow-glow-soft animate-scale-in">
          <CheckCircle2 className="h-3 w-3 text-text-inverse" strokeWidth={3} />
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
    <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-3">
      <div className="flex min-w-0 items-center gap-2 min-[420px]:w-36 min-[420px]:shrink-0">
        <Icon className="h-4 w-4 text-text-muted" />
        <span className="break-words text-sm font-medium text-text-secondary">{label}</span>
      </div>
      <div className="grid flex-1 grid-cols-5 gap-1.5">
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
              style={
                isSelected ? { boxShadow: `0 0 12px ${glowColor}` } : undefined
              }
            >
              {opt.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Success Sub-component ─── */
interface DimBreakdown {
  key: string;
  meta: { label: string; icon: ElementType };
  rating: number;
}

function CheckInSuccessScreen({
  result,
  progression,
  dimensionBreakdown,
  hasDimensionData,
  scoreColor,
  headline,
  circumference,
}: {
  result: CheckInResult;
  progression: ProgressionResult | null;
  dimensionBreakdown: DimBreakdown[];
  hasDimensionData: boolean;
  scoreColor: string;
  headline: string;
  circumference: number;
}) {
  const [ringFilled, setRingFilled] = useState(false);
  const animatedPct = useAnimatedCounter(ringFilled ? result.percentage : 0, {
    duration: 1200,
    easing: "easeOutCubic",
  });

  useEffect(() => {
    const t = setTimeout(() => setRingFilled(true), 120);
    return () => clearTimeout(t);
  }, []);

  const targetOffset = circumference * (1 - result.percentage / 100);
  const strokeDashoffset = ringFilled ? targetOffset : circumference;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-10 animate-fade-in">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[32rem] w-[32rem] rounded-full blur-[150px] opacity-20 transition-all duration-1000"
          style={{ background: scoreColor }}
        />
      </div>

      <Card
        variant="elevated"
        glow
        className="relative z-10 w-full max-w-md overflow-hidden"
      >
        {/* Top gradient overlay */}
        <div className="absolute top-0 h-44 w-full bg-gradient-to-b from-accent-primary/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center p-8 text-center">
          {/* Completion badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-status-success/30 bg-status-success/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-status-success animate-scale-in">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Daily Check-In Complete
          </div>

          {/* Animated SVG wellness ring */}
          <div className="relative mb-6 inline-flex items-center justify-center">
            <div
              className="absolute h-40 w-40 rounded-full blur-3xl opacity-25 transition-opacity duration-1000"
              style={{ background: scoreColor }}
            />
            <svg className="h-40 w-40 -rotate-90" viewBox="0 0 120 120">
              <defs>
                <linearGradient
                  id="successRingGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={scoreColor} />
                  <stop offset="100%" stopColor="var(--color-accent-glow)" />
                </linearGradient>
              </defs>
              {/* Track */}
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="var(--color-bg-input)"
                strokeWidth="7"
              />
              {/* Animated fill */}
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="url(#successRingGrad)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition:
                    "stroke-dashoffset 1.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  filter: `drop-shadow(0 0 8px ${scoreColor})`,
                }}
              />
            </svg>
            {/* Center text */}
            <div className="absolute flex flex-col items-center">
              <span
                className="text-4xl font-black leading-none tabular-nums"
                style={{
                  background: `linear-gradient(135deg, ${scoreColor}, var(--color-accent-glow))`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {animatedPct}%
              </span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Wellness
              </span>
            </div>
          </div>

          {/* Headline */}
          <h2 className="mb-1 text-2xl font-extrabold tracking-tight text-text-primary">
            {headline}
          </h2>
          <p className="mb-6 text-sm text-text-secondary">
            Score:{" "}
            <span className="font-bold text-text-primary">
              {result.totalScore}
            </span>
            <span className="text-text-muted"> / {result.maxScore}</span>
          </p>

          {/* Dimension breakdown pills */}
          {hasDimensionData && (
            <div className="mb-6 flex flex-wrap justify-center gap-1.5">
              {dimensionBreakdown.map(({ key, meta, rating }, i) => {
                const mood = moodOptions.find((m) => m.value === rating);
                const DimIcon = meta.icon;
                return (
                  <div
                    key={key}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold animate-fade-in",
                      mood
                        ? `${mood.bgClass} ${mood.borderClass} ${mood.textToken}`
                        : "border-border bg-bg-panel text-text-muted",
                    ].join(" ")}
                    style={{
                      animationDelay: `${i * 70}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    <DimIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{meta.label}</span>
                    <span className="opacity-70">·</span>
                    <span>{rating}/5</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* XP Progression */}
          {progression && (
            <div
              className="mb-6 w-full animate-fade-in rounded-2xl border border-border bg-bg-panel p-4 text-left"
              style={{ animationDelay: "450ms", animationFillMode: "both" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-accent-primary" />
                  <span className="text-xs font-bold text-text-secondary">
                    Level {progression.level}
                  </span>
                </div>
                <Pill tone="accent">
                  <Sparkles className="mr-1 h-3 w-3" />+{result.totalScore} XP
                  earned
                </Pill>
              </div>
              <ProgressBar
                value={progression.currentXP}
                max={progression.requiredXP}
                showPercentage
                size="md"
                shimmer
              />
              <p className="mt-1.5 text-[11px] text-text-muted">
                {progression.currentXP} / {progression.requiredXP} XP to next
                level
              </p>
            </div>
          )}

          {/* Redirect indicator */}
          <div
            className="flex items-center gap-2 text-xs text-text-muted animate-fade-in"
            style={{ animationDelay: "600ms", animationFillMode: "both" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-primary opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-primary" />
            </span>
            Taking you to your insights…
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ─── Page ─── */
function AlreadyCheckedInScreen({
  onViewInsights,
}: {
  onViewInsights: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100svh-var(--mobile-nav-height)-2rem)] flex-col items-center justify-center px-0 py-4 sm:min-h-[80vh] sm:px-4 sm:py-10">
      <Card
        variant="elevated"
        glow
        className="relative w-full max-w-md overflow-hidden"
      >
        <div className="absolute top-0 h-36 w-full bg-gradient-to-b from-status-success/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center p-6 text-center sm:p-8">
          <Badge tone="success" className="mb-5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Done Today
          </Badge>

          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-status-success/25 bg-status-success/10 shadow-glow-soft">
            <CheckCircle2
              className="h-9 w-9 text-status-success"
              strokeWidth={2.25}
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Today&apos;s Check-In Complete
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            You&apos;ve already checked in today. Come back tomorrow for a fresh
            pulse.
          </p>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="mt-7"
            rightIcon={<ArrowRight className="h-4 w-4" />}
            onClick={onViewInsights}
          >
            View Insights
          </Button>
        </div>
      </Card>
    </div>
  );
}

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
  const [todayComplete, setTodayComplete] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [nlText, setNlText] = useState("");
  const [nlParsing, setNlParsing] = useState(false);
  const [nlParsed, setNlParsed] = useState<ParsedDimensions | null>(null);
  const [nlFallback, setNlFallback] = useState(false);

  const [result, setResult] = useState<CheckInResult | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(
    null,
  );

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
      setTodayComplete(false);
      setQuestions(
        Array.isArray(incoming) && incoming.length
          ? incoming
          : fallbackQuestions,
      );
    } catch (err) {
      if (isAlreadyCompletedCheckInError(err)) {
        setTodayComplete(true);
        return;
      }
      setQuestions(fallbackQuestions);
    } finally {
      setLoading(false);
    }
  }, [requireAuth]);

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
          { headers },
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
        }, 3500);
      } catch (err) {
        if (isAlreadyCompletedCheckInError(err)) {
          setTodayComplete(true);
          setFlowState("input");
          toast({
            title: "Today's check-in is complete",
            description: "You've already checked in today.",
            variant: "info",
          });
          return;
        }

        toast({
          title: "Submission failed",
          description: "Failed to submit check-in. Please try again.",
          variant: "error",
        });
        setFlowState("input");
      }
    },
    [getAuthHeaders, router, toast],
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
    [
      clearAutoAdvance,
      currentIndex,
      isTransitioning,
      questions,
      ratings,
      selectedRating,
      submitCheckIn,
    ],
  );

  const onSelectRating = useCallback(
    (value: number) => {
      setSelectedRating(value);
      scheduleAutoAdvance();
    },
    [scheduleAutoAdvance],
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
        { headers },
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

  /* ── Already Complete State ── */
  if (todayComplete) {
    return (
      <AlreadyCheckedInScreen
        onViewInsights={() => router.push(INSIGHT_PATH)}
      />
    );
  }

  /* ── Success State ── */
  if (flowState === "success" && result) {
    const CIRCUM = 2 * Math.PI * 54;

    const dimensionBreakdown = DIMENSION_KEYS.map((key, i) => ({
      key,
      meta: DIMENSION_META[key],
      rating:
        (ratings[questions[i]] as number | undefined) ?? nlParsed?.[key] ?? 0,
    }));

    const hasDimensionData = dimensionBreakdown.some((d) => d.rating > 0);

    const scoreColor =
      result.percentage >= 80
        ? "var(--color-status-success)"
        : result.percentage >= 60
          ? "var(--color-accent-primary)"
          : result.percentage >= 40
            ? "var(--color-status-warning)"
            : "var(--color-status-error)";

    const headline =
      result.percentage >= 80
        ? "Outstanding work today!"
        : result.percentage >= 60
          ? "Solid effort today."
          : result.percentage >= 40
            ? "You showed up — that matters."
            : "Every day is a new start.";

    return (
      <CheckInSuccessScreen
        result={result}
        progression={progression}
        dimensionBreakdown={dimensionBreakdown}
        hasDimensionData={hasDimensionData}
        scoreColor={scoreColor}
        headline={headline}
        circumference={CIRCUM}
      />
    );
  }

  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="flex min-h-[calc(100svh-var(--mobile-nav-height)-2rem)] flex-col items-center justify-start px-0 py-4 sm:min-h-[80vh] sm:justify-center sm:px-4 sm:py-10">
      {/* Header */}
      <div className="mb-6 text-center animate-fade-in sm:mb-8">
        <Badge tone="accent" className="mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-primary animate-pulse" />
          Daily Check-In
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          How are you today?
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          A quick pulse to understand your current state.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="mb-6 w-full max-w-xl animate-fade-in sm:mb-8">
        <div className="relative grid grid-cols-2 gap-1 rounded-xl border border-border bg-bg-panel p-1">
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
              "relative z-10 flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:px-4",
              mode === "guided"
                ? "text-text-inverse"
                : "text-text-muted hover:text-text-secondary",
            ].join(" ")}
          >
            <ListChecks className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Guided</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("text");
              clearAutoAdvance();
            }}
            className={[
              "relative z-10 flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:px-4",
              mode === "text"
                ? "text-text-inverse"
                : "text-text-muted hover:text-text-secondary",
            ].join(" ")}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Natural Language</span>
          </button>
        </div>
      </div>

      {/* ── Natural Language Mode ── */}
      {mode === "text" && (
        <div className="w-full max-w-xl animate-fade-in space-y-5">
          <Card variant="elevated" className="space-y-5 p-4 sm:p-6">
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
              <div className="rounded-xl border border-border bg-bg-panel p-4 space-y-4 animate-fade-in sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                            prev ? { ...prev, [key]: v } : prev,
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
            <Card variant="elevated" className="p-4 min-[380px]:p-5 sm:p-8">
              {/* Dimension badge */}
              <div className="flex items-center justify-center mb-5">
                <Badge tone="default">
                  {DIMENSION_META[DIMENSION_KEYS[currentIndex]]?.label ??
                    `Dimension ${currentIndex + 1}`}
                </Badge>
              </div>

              {/* Question text */}
              <h2 className="mb-6 break-words text-center text-base font-semibold leading-relaxed text-text-primary sm:mb-8 sm:text-xl">
                {questions[currentIndex]}
              </h2>

              {/* Rating buttons */}
              <div className="mb-6 grid grid-cols-5 gap-1.5 min-[380px]:gap-2 sm:gap-3">
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
              <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center">
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
                    !selectedRating ||
                    isTransitioning ||
                    flowState === "submitting"
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
