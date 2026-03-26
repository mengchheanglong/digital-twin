"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface HistoryItem {
  id: string;
  date: string;
  overallScore: number;
  percentage: number;
  ratings: number[];
}

export default function HistoryPage() {
  const router = useRouter();
  const { requireAuth } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = useCallback(async () => {
    const headers = requireAuth();
    if (!headers) return;

    try {
      setLoading(true);
      const response = await axios.get("/api/checkin/history", { headers });

      const items = Array.isArray(response.data?.history) ? (response.data.history as HistoryItem[]) : [];
      setHistory(items);
      setError("");
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        requireAuth();
        return;
      }

      setError("Could not load pulse history.");
    } finally {
      setLoading(false);
    }
  }, [requireAuth]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="mx-auto w-full max-w-3xl animate-fade-in">
      <section className="overflow-hidden text-left rounded-2xl border border-border bg-bg-card shadow-xl relative">
        <div className="absolute top-0 w-full h-1/2 bg-linear-to-b from-accent-primary/5 to-transparent pointer-events-none" />
        
        <header className="flex items-center gap-3 border-b border-border/50 px-6 py-5 relative z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary shadow-inner">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Pulse History</h1>
            <p className="text-xs text-text-muted mt-0.5">Chronological record of your emotional checks.</p>
          </div>
        </header>

        <div className="space-y-4 p-6 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm font-medium text-text-muted animate-pulse">Loading history...</p>
            </div>
          ) : error ? (
            <p className="rounded-xl border border-status-error/30 bg-status-error/10 px-4 py-3 text-sm font-medium text-status-error">{error}</p>
          ) : !history.length ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-bg-panel/30 py-12 text-center">
              <Clock className="h-8 w-8 text-text-muted mb-3 opacity-50" />
              <p className="text-sm font-medium text-text-secondary">No history available yet.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {history.map((item) => (
                <article key={item.id} className="group flex flex-col justify-between rounded-xl border border-border/50 bg-bg-panel/50 p-5 transition-all hover:border-accent-primary/30 hover:bg-bg-panel hover:shadow-lg">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm font-bold tracking-tight text-white group-hover:text-accent-primary transition-colors">
                      {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <span className="flex items-center rounded-md bg-accent-primary/10 px-2 py-0.5 text-xs font-black text-accent-primary border border-accent-primary/20">
                      {item.overallScore}/25
                    </span>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs font-bold text-text-secondary mb-1.5">
                      <span className="uppercase tracking-wider text-[10px]">Vitality</span>
                      <span className="text-text-primary">{item.percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-base border border-border/50">
                      <div
                        className="h-full rounded-full bg-accent-primary transition-all duration-500 shadow-inner"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <p className="mt-3 text-[11px] font-semibold text-text-muted">Metrics: {item.ratings.join(" • ")}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
