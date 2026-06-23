"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, DownloadCloud, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui";
import { Dialog } from "@/components/ui";
import { Card } from "@/components/ui";

export function DataManagementSection() {
  const router = useRouter();
  const { getAuthHeaders, signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        router.push("/");
        return;
      }

      const response = await fetch("/api/export", {
        headers,
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
      const headers = getAuthHeaders();
      if (!headers) {
        router.push("/");
        return;
      }

      await axios.delete("/api/user", { headers });

      // Wipe frontend auth state and redirect
      signOut();
    } catch (err) {
      console.error(err);
      setError("Failed to delete account. Please contact support.");
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Card className="relative overflow-hidden p-4 sm:p-5">
        {/* Subtle warning glow */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-status-error/5 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-hover text-text-secondary shadow-inner ring-1 ring-border">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Data &amp; Privacy</h2>
              <p className="mt-0.5 max-w-[280px] text-xs leading-relaxed text-text-secondary">
                Manage your secure exports and account erasure.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="h-3.5 w-3.5" />}
              onClick={handleExport}
              disabled={exporting}
            >
              Export
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => setShowConfirm(true)}
              disabled={deleting}
            >
              Erase
            </Button>
          </div>
        </div>

        {error && (
          <div className="relative z-10 mt-4 rounded-xl border border-status-error/20 bg-status-error/10 p-3">
            <p className="text-xs font-semibold text-status-error">{error}</p>
          </div>
        )}
      </Card>

      <Dialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Permanently Delete Account?"
        size="md"
        footer={
          <div className="flex w-full flex-col gap-3">
            <Button
              variant="danger"
              size="md"
              fullWidth
              loading={deleting}
              onClick={handleDeleteAccount}
            >
              Yes, Erase Everything
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setShowConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-status-error/10 text-status-error shadow-glow">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <p className="mb-2 text-sm font-medium text-status-error">
            This permanently deletes your account and all data.
          </p>
          <p className="text-sm leading-relaxed text-text-secondary">
            This cannot be undone. Every quest, journal entry, chat vector, focus session, and insight metric will be purged from the database instantly.
          </p>
        </div>
      </Dialog>
    </>
  );
}

export default DataManagementSection;
