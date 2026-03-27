"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, DownloadCloud, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import axios from "axios";

export function DataManagementSection() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/export", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get("Content-Disposition");
      let filename = `digital-twin-export-${new Date().toISOString().split("T")[0]}.json`;
      
      if (disposition && disposition.indexOf("filename=") !== -1) {
        const matches = /filename="([^"]+)"/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      setError("Failed to download data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      await axios.delete("/api/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Wipe frontend auth state
      localStorage.removeItem("token");
      localStorage.removeItem("userProfile");
      
      // Force reload to base sign-in
      window.location.href = "/?mode=signin";
    } catch (err) {
      console.error(err);
      setError("Failed to delete account. Please contact support.");
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <section className="mt-8 rounded-2xl border border-white/5 bg-bg-card/80 backdrop-blur-xl p-4 sm:p-5 shadow-card transition-all duration-500 ease-apple relative overflow-hidden">
        {/* Subtle warning glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-text-secondary shadow-inner">
               <ShieldAlert className="h-5 w-5" />
             </div>
             <div>
               <h2 className="text-sm font-bold text-white">Data & Privacy</h2>
               <p className="text-xs text-text-secondary mt-0.5 max-w-[280px] leading-relaxed">Manage your secure exports and account erasure.</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg border border-accent-primary/30 bg-accent-primary/10 px-4 py-2 text-xs font-bold text-accent-primary transition-all duration-300 hover:bg-accent-primary hover:text-white hover:shadow-glow disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="h-3.5 w-3.5" />}
              Export
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={deleting}
              className="flex items-center gap-2 rounded-lg border border-white/5 bg-bg-panel/50 px-4 py-2 text-xs font-bold text-text-muted transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Erase
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 relative z-10">
            <p className="text-xs font-semibold text-red-400">{error}</p>
          </div>
        )}
      </section>

      {/* Extreme Deletion Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-2500 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-bg-panel p-8 shadow-2xl animate-scale-in">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 shadow-glow">
              <AlertTriangle className="h-8 w-8" />
            </div>
            
            <h3 className="mb-3 text-center text-xl font-bold text-white">Permanently Delete Account?</h3>
            <p className="mb-2 text-center text-sm font-medium text-red-400">
              WARNING: Extreme Data Loss
            </p>
            <p className="mb-8 text-center text-sm text-text-secondary leading-relaxed">
              If you proceed, every quest, journal entry, chat vector, focus session, and insight metric will be purged from the database instantly. You cannot undo this.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="w-full rounded-xl bg-red-500 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-red-600 hover:shadow-glow disabled:opacity-50 flex justify-center items-center"
              >
                {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Yes, Erase Everything"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="w-full rounded-xl bg-bg-card px-4 py-3.5 text-sm font-bold text-text-primary transition-all hover:bg-white/5 border border-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
