"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Frown,
  PenLine,
  Plus,
  Smile,
  Sparkles,
  Tag,
  ThumbsUp,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  FormField,
  Input,
  Pill,
  Skeleton,
  Textarea,
  useToast,
} from "@/components/ui";

interface JournalEntry {
  _id: string;
  title: string;
  content: string;
  mood?: string;
  tags: string[];
  date: string;
  dayKey: string;
}

type MoodTone = "warning" | "success" | "info" | "default" | "error" | "accent";

interface MoodOption {
  emoji: string;
  label: string;
  icon: LucideIcon;
  tone: MoodTone;
}

const MOOD_OPTIONS: MoodOption[] = [
  { emoji: "🤩", label: "Excellent", icon: Sparkles, tone: "warning" },
  { emoji: "😄", label: "Great", icon: Smile, tone: "success" },
  { emoji: "🙂", label: "Good", icon: ThumbsUp, tone: "info" },
  { emoji: "😐", label: "Neutral", icon: PenLine, tone: "default" },
  { emoji: "😔", label: "Low", icon: Frown, tone: "error" },
  { emoji: "😰", label: "Stressed", icon: Zap, tone: "accent" },
];

function moodValue(option: MoodOption): string {
  return `${option.emoji} ${option.label}`;
}

function findMoodOption(mood?: string): MoodOption | undefined {
  if (!mood) return undefined;
  return MOOD_OPTIONS.find((m) => mood.includes(m.label));
}

function useMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 639px)").matches;
  });

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ───────── Loading Skeleton ───────── */

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-bg-card p-5 space-y-3 animate-fade-in"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton width={48} height={20} rounded="full" />
              <Skeleton width={80} height={14} rounded="md" />
            </div>
            <Skeleton width={28} height={28} rounded="lg" />
          </div>
          <Skeleton width="50%" height={18} rounded="md" />
          <Skeleton width="100%" height={60} rounded="md" />
          <div className="flex gap-1.5 pt-1">
            <Skeleton width={48} height={20} rounded="full" />
            <Skeleton width={56} height={20} rounded="full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────── Entry Card ───────── */

function EntryCard({
  entry,
  onDelete,
}: {
  entry: JournalEntry;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { getAuthHeaders } = useAuth();
  const { toast } = useToast();

  const handleDelete = async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/journal/${entry._id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { msg?: string };
        toast({
          title: "Delete failed",
          description: data.msg ?? "Could not delete entry.",
          variant: "error",
        });
        return;
      }
      onDelete(entry._id);
      toast({ title: "Entry deleted", variant: "success" });
    } catch {
      toast({
        title: "Delete failed",
        description: "Network error. Please try again.",
        variant: "error",
      });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  const moodOpt = findMoodOption(entry.mood);
  const MoodIcon = moodOpt?.icon;
  const isLong = entry.content.length > 200;

  return (
    <>
      <Card variant="interactive" className="p-5 animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {moodOpt && MoodIcon && (
                <Pill tone={moodOpt.tone}>
                  <MoodIcon size={12} />
                  <span>{moodOpt.label}</span>
                </Pill>
              )}
              {!moodOpt && entry.mood && (
                <Pill tone="default">
                  <span>{entry.mood}</span>
                </Pill>
              )}
              <span className="text-xs text-text-muted">
                {formatDate(entry.date)}
              </span>
            </div>
            <h3 className="text-sm font-bold text-text-primary truncate">
              {entry.title}
            </h3>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="shrink-0 text-text-muted hover:text-status-error hover:bg-status-error/10"
            aria-label="Delete entry"
          >
            <Trash2 size={16} />
          </Button>
        </div>

        {/* Content with expand/collapse */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-apple ${
            expanded ? "max-h-[1000px] opacity-100 mt-3" : "max-h-[4.5rem] opacity-100 mt-2"
          }`}
        >
          <p className="break-words text-sm text-text-secondary leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
            {entry.content}
          </p>
        </div>

        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 text-xs font-semibold text-accent-primary hover:text-accent-hover transition-colors"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {entry.tags.map((tag) => (
              <Badge key={tag} tone="default">
                <Tag size={10} />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Delete confirmation */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete entry?"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          This will permanently remove <strong className="text-text-primary">{entry.title}</strong>.
          This action cannot be undone.
        </p>
      </Dialog>
    </>
  );
}

/* ───────── New Entry Dialog ───────── */

function NewEntryDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (entry: JournalEntry) => void;
}) {
  const { getAuthHeaders } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setContent("");
      setSelectedMood("");
      setTagInput("");
      setTags([]);
      setError("");
      setSaving(false);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags((prev) => [...prev, t]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = getAuthHeaders();
    if (!headers) return;

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    if (!trimmedContent) {
      setError("Content is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          content: trimmedContent,
          mood: selectedMood || undefined,
          tags,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { msg?: string };
        setError(data.msg ?? "Failed to save entry.");
        toast({
          title: "Save failed",
          description: data.msg ?? "Could not save entry.",
          variant: "error",
        });
        return;
      }

      const data = (await res.json()) as { entry: JournalEntry };
      onSave(data.entry);
      toast({ title: "Entry saved", variant: "success" });
    } catch {
      setError("Network error. Please try again.");
      toast({
        title: "Save failed",
        description: "Network error. Please try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New Journal Entry"
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            leftIcon={<Plus size={16} />}
            onClick={(e) => {
              // Dialog footer buttons are outside the form, so we trigger submit manually
              const form = document.getElementById("new-entry-form") as HTMLFormElement | null;
              form?.requestSubmit();
            }}
          >
            Save Entry
          </Button>
        </>
      }
    >
      <form id="new-entry-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-status-error/20 bg-status-error/10 px-3 py-2 text-sm text-status-error animate-fade-in">
            {error}
          </div>
        )}

        <FormField label="Title" htmlFor="journal-title">
          <Input
            ref={titleRef}
            id="journal-title"
            type="text"
            maxLength={200}
            placeholder="Give your entry a title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </FormField>

        <FormField label="Content" htmlFor="journal-content">
          <Textarea
            id="journal-content"
            rows={6}
            maxLength={5000}
            placeholder="Write your reflection…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            resize="none"
          />
        </FormField>

        {/* Mood picker */}
        <div>
          <p className="text-xs font-semibold text-text-primary mb-2">
            How are you feeling?
          </p>
          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((m) => {
              const value = moodValue(m);
              const Icon = m.icon;
              const active = selectedMood === value;
              return (
                <button
                  key={m.label}
                  type="button"
                  onClick={() =>
                    setSelectedMood((prev) => (prev === value ? "" : value))
                  }
                  className={[
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all duration-200 ease-apple",
                    active
                      ? "border-accent-primary bg-accent-subtle text-accent-primary shadow-glow-soft"
                      : "border-border bg-bg-input text-text-secondary hover:border-border-hover hover:text-text-primary",
                  ].join(" ")}
                >
                  <Icon size={14} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        <div>
          <p className="text-xs font-semibold text-text-primary mb-2">
            Tags
            {tags.length > 0 && (
              <span className="ml-1.5 text-text-muted font-normal">
                ({tags.length}/10)
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Add a tag and press Enter…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="flex-1"
            />
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={addTag}
              disabled={!tagInput.trim() || tags.length >= 10}
            >
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {tags.map((tag) => (
                <Pill key={tag} tone="accent">
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 rounded-full hover:bg-accent-primary/20 p-0.5 transition-colors"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X size={10} />
                  </button>
                </Pill>
              ))}
            </div>
          )}
        </div>
      </form>
    </Dialog>
  );
}

/* ───────── Main Page ───────── */

function NewEntryMobileForm({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (entry: JournalEntry) => void;
}) {
  const { getAuthHeaders } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setContent("");
      setSelectedMood("");
      setTagInput("");
      setTags([]);
      setError("");
      setSaving(false);
    }
  }, [open]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags((prev) => [...prev, t]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = getAuthHeaders();
    if (!headers) return;

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    if (!trimmedContent) {
      setError("Content is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          content: trimmedContent,
          mood: selectedMood || undefined,
          tags,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { msg?: string };
        setError(data.msg ?? "Failed to save entry.");
        toast({
          title: "Save failed",
          description: data.msg ?? "Could not save entry.",
          variant: "error",
        });
        return;
      }

      const data = (await res.json()) as { entry: JournalEntry };
      onSave(data.entry);
      toast({ title: "Entry saved", variant: "success" });
    } catch {
      setError("Network error. Please try again.");
      toast({
        title: "Save failed",
        description: "Network error. Please try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <section className="sm:hidden animate-fade-in">
      <div className="mb-4 rounded-xl border border-border-subtle bg-bg-card/20">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <h2 className="text-sm font-bold text-text-primary tracking-tight">
            New Journal Entry
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all duration-150 focus-ring"
            aria-label="Close form"
          >
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 px-4 pb-[env(safe-area-inset-bottom)] pt-3"
        >
          {error && (
            <div className="rounded-xl border border-status-error/20 bg-status-error/10 px-3 py-2 text-sm text-status-error animate-fade-in">
              {error}
            </div>
          )}

          <FormField label="Title" htmlFor="journal-title-mobile">
            <Input
              id="journal-title-mobile"
              type="text"
              maxLength={200}
              placeholder="Give your entry a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>

          <FormField label="Content" htmlFor="journal-content-mobile">
            <Textarea
              id="journal-content-mobile"
              rows={6}
              maxLength={5000}
              placeholder="Write your reflection..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              resize="none"
            />
          </FormField>

          <div>
            <p className="text-xs font-semibold text-text-primary mb-2">
              How are you feeling?
            </p>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((m) => {
                const value = moodValue(m);
                const Icon = m.icon;
                const active = selectedMood === value;
                return (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() =>
                      setSelectedMood((prev) => (prev === value ? "" : value))
                    }
                    className={[
                      "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all duration-200 ease-apple",
                      active
                        ? "border-accent-primary bg-accent-subtle text-accent-primary shadow-glow-soft"
                        : "border-border bg-bg-input text-text-secondary hover:border-border-hover hover:text-text-primary",
                    ].join(" ")}
                  >
                    <Icon size={14} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-text-primary mb-2">
              Tags
              {tags.length > 0 && (
                <span className="ml-1.5 text-text-muted font-normal">
                  ({tags.length}/10)
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Add a tag and press Enter..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={addTag}
                disabled={!tagInput.trim() || tags.length >= 10}
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {tags.map((tag) => (
                  <Pill key={tag} tone="accent">
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 rounded-full hover:bg-accent-primary/20 p-0.5 transition-colors"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X size={10} />
                    </button>
                  </Pill>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-3">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={saving}
              leftIcon={<Plus size={16} />}
            >
              Save Entry
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default function JournalPage() {
  const { getAuthHeaders } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const isMobile = useMobileViewport();
  const LIMIT = 10;

  const fetchEntries = useCallback(
    async (p: number) => {
      const headers = getAuthHeaders();
      if (!headers) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/journal?page=${p}&limit=${LIMIT}`, {
          headers,
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as {
            entries: JournalEntry[];
            total?: number;
            pagination?: { page: number; limit: number; total: number; totalPages: number };
          };
          setEntries(data.entries);
          setTotal(data.total ?? data.pagination?.total ?? 0);
        } else {
          const data = (await res.json().catch(() => ({}))) as { msg?: string };
          toast({
            title: "Failed to load entries",
            description: data.msg ?? "Something went wrong.",
            variant: "error",
          });
        }
      } catch {
        toast({
          title: "Failed to load entries",
          description: "Network error. Please try again.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders, toast],
  );

  useEffect(() => {
    void fetchEntries(page);
  }, [fetchEntries, page]);

  const handleSave = (entry: JournalEntry) => {
    setEntries((prev) => [entry, ...prev]);
    setTotal((t) => t + 1);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((e) => e._id !== id));
    setTotal((t) => Math.max(0, t - 1));
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-in space-y-6 pb-10 text-text-primary">
      {/* Header */}
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-subtle text-accent-primary border border-accent-primary/20 shadow-glow-soft">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Journal
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {total} {total === 1 ? "entry" : "entries"} written
            </p>
          </div>
        </div>

        {!isMobile || !showForm ? (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={18} />}
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto"
          >
            New Entry
          </Button>
        ) : null}
      </div>

      {/* New entry dialog */}
      <NewEntryDialog
        open={showForm && !isMobile}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
      />
      <NewEntryMobileForm
        open={showForm && isMobile}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
      />

      {/* Entries */}
      {loading ? (
        <LoadingSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={28} />}
          title="No journal entries yet"
          description="Start writing your thoughts to build a personal record of your journey."
        />
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <EntryCard
              key={entry._id}
              entry={entry}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ChevronLeft size={16} />}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm font-semibold text-text-muted tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<ChevronRight size={16} />}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
