"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Loader2,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface JournalEntry {
  _id: string;
  title: string;
  content: string;
  mood?: string;
  tags: string[];
  date: string;
  dayKey: string;
}

const MOOD_OPTIONS = [
  { emoji: "🤩", label: "Excellent" },
  { emoji: "😄", label: "Great" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "😔", label: "Low" },
  { emoji: "😰", label: "Stressed" },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function EntryCard({
  entry,
  onDelete,
}: {
  entry: JournalEntry;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { getAuthHeaders } = useAuth();

  const handleDelete = async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setDeleting(true);
    try {
      await fetch(`/api/journal/${entry._id}`, {
        method: "DELETE",
        headers,
      });
      onDelete(entry._id);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5 transition-all hover:border-accent-primary/30 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {entry.mood && (
              <span className="text-base">{entry.mood.split(" ")[0]}</span>
            )}
            <span className="text-xs text-text-muted">
              {formatDate(entry.date)}
            </span>
          </div>
          <h3 className="text-sm font-bold text-white truncate">
            {entry.title}
          </h3>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {confirming ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-400 hover:text-red-300 font-semibold"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Confirm"
                )}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-xs text-text-muted hover:text-white ml-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-text-muted hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <p
        className={`text-sm text-text-secondary mt-2 leading-relaxed ${!expanded ? "line-clamp-3" : ""}`}
      >
        {entry.content}
      </p>

      {entry.content.length > 200 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs text-accent-primary hover:text-accent-hover"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-lg bg-bg-panel border border-border px-2 py-0.5 text-[11px] text-text-muted"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function NewEntryForm({
  onSave,
  onCancel,
}: {
  onSave: (entry: JournalEntry) => void;
  onCancel: () => void;
}) {
  const { getAuthHeaders } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

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
        const data = (await res.json()) as { msg?: string };
        setError(data.msg ?? "Failed to save entry.");
        return;
      }

      const data = (await res.json()) as { entry: JournalEntry };
      onSave(data.entry);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-accent-primary/30 bg-bg-card p-6 animate-fade-in"
    >
      <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4">
        New Entry
      </h2>

      {error && (
        <div className="mb-3 rounded-xl border border-status-error/20 bg-status-error/10 px-3 py-2 text-sm text-status-error">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <input
          ref={titleRef}
          type="text"
          maxLength={200}
          placeholder="Entry title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-border bg-bg-panel px-4 py-2.5 text-sm text-white placeholder-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all"
        />

        <textarea
          rows={6}
          maxLength={5000}
          placeholder="Write your reflection…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-xl border border-border bg-bg-panel px-4 py-2.5 text-sm text-white placeholder-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all resize-none"
        />

        {/* Mood picker */}
        <div>
          <p className="text-xs text-text-muted mb-2">
            How are you feeling?
          </p>
          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((m) => {
              const value = `${m.emoji} ${m.label}`;
              return (
                <button
                  key={m.label}
                  type="button"
                  onClick={() =>
                    setSelectedMood((prev) =>
                      prev === value ? "" : value,
                    )
                  }
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                    selectedMood === value
                      ? "border-accent-primary bg-accent-primary/10 text-white"
                      : "border-border bg-bg-panel text-text-secondary hover:border-accent-primary/50"
                  }`}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a tag…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="flex-1 rounded-xl border border-border bg-bg-panel px-3 py-2 text-sm text-white placeholder-text-muted focus:border-accent-primary focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-xl border border-border bg-bg-panel px-3 py-2 text-sm text-text-secondary hover:text-white hover:border-accent-primary/50 transition-all"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-lg bg-accent-primary/10 border border-accent-primary/20 px-2 py-0.5 text-xs text-accent-primary"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 hover:text-white"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
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
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 transition-all"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {saving ? "Saving…" : "Save Entry"}
        </button>
      </div>
    </form>
  );
}

export default function JournalPage() {
  const { getAuthHeaders } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const LIMIT = 10;

  const fetchEntries = useCallback(
    async (p: number) => {
      const headers = getAuthHeaders();
      if (!headers) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/journal?page=${p}&limit=${LIMIT}`,
          { headers, cache: "no-store" },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            entries: JournalEntry[];
            total: number;
          };
          setEntries(data.entries);
          setTotal(data.total);
        }
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders],
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Journal
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {total} {total === 1 ? "entry" : "entries"} written
            </p>
          </div>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)]"
          >
            <Plus className="h-4 w-4" />
            New Entry
          </button>
        )}
      </div>

      {/* New entry form */}
      {showForm && (
        <NewEntryForm
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Entries */}
      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-border bg-bg-card">
          <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-10 text-center">
          <BookOpen className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">
            No journal entries yet
          </p>
          <p className="text-xs text-text-muted mt-1">
            Write your first reflection to start building a record.
          </p>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-4 rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-all"
            >
              Write Entry
            </button>
          )}
        </div>
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
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-xl border border-border bg-bg-panel px-4 py-2 text-sm text-text-secondary hover:text-white disabled:opacity-40 transition-all"
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((p) => Math.min(totalPages, p + 1))
            }
            disabled={page >= totalPages}
            className="rounded-xl border border-border bg-bg-panel px-4 py-2 text-sm text-text-secondary hover:text-white disabled:opacity-40 transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
