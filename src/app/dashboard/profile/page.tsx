"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { ProfilePage, UserProfile } from "@/components/profile";
import { useAuth } from "@/hooks/useAuth";

interface LocalUserProfile {
  id: string;
  name: string;
  age: number;
  email: string;
  location: string;
  bio: string;
  level: number;
  currentXP: number;
  requiredXP: number;
  dailyStreak: number;
  currentStreak?: number;
  totalQuests: number;
  completedQuests: number;
  badges: string[];
  avatarStage: string;
  joinDate: string;
  currentMood?: {
    emoji: string;
    label: string;
  };
}

interface EditFields {
  name: string;
  bio: string;
  location: string;
  age: string;
  timezone: string;
}

export default function CharacterPage() {
  const router = useRouter();
  const { requireAuth, getAuthHeaders } = useAuth();
  const [profile, setProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editFields, setEditFields] = useState<EditFields>({
    name: "",
    bio: "",
    location: "",
    age: "",
    timezone: "",
  });

  const fetchProfile = useCallback(async () => {
    const headers = requireAuth();
    if (!headers) return;

    try {
      setLoading(true);
      const response = await axios.get("/api/profile", { headers });
      const incoming = response.data?.profile as LocalUserProfile | undefined;

      if (!incoming) {
        setError("Profile data is unavailable.");
        return;
      }

      setProfile(incoming);
      setError("");
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        requireAuth();
        return;
      }
      setError("Failed to load character profile.");
    } finally {
      setLoading(false);
    }
  }, [requireAuth]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const startEditing = () => {
    if (!profile) return;
    setEditFields({
      name: profile.name ?? "",
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      age: String(profile.age ?? ""),
      timezone: "",
    });
    setSaveError("");
    setEditing(true);
  };

  const handleSave = async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      router.push("/");
      return;
    }

    const name = editFields.name.trim();
    if (!name) {
      setSaveError("Name cannot be empty.");
      return;
    }

    const ageNum = editFields.age !== "" ? Number(editFields.age) : undefined;
    if (ageNum !== undefined && (!Number.isInteger(ageNum) || ageNum < 1 || ageNum > 120)) {
      setSaveError("Age must be a whole number between 1 and 120.");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const payload: Record<string, unknown> = { name };
      if (editFields.bio.trim()) payload.bio = editFields.bio.trim();
      if (editFields.location.trim()) payload.location = editFields.location.trim();
      if (ageNum !== undefined) payload.age = ageNum;
      if (editFields.timezone.trim()) payload.timezone = editFields.timezone.trim();

      const response = await axios.put("/api/profile", payload, { headers });
      const updated = response.data?.profile as LocalUserProfile | undefined;
      if (updated) {
        setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
      }
      setEditing(false);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.msg
          ? String(err.response.data.msg)
          : "Failed to save changes.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-panel px-4 py-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin text-accent-primary" />
          Initializing Identity Core...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-status-error/20 bg-status-error/10 px-4 py-3 text-sm text-status-error">
        {error || "Identity data unavailable."}
      </div>
    );
  }

  const profileData: UserProfile = {
    id: profile.id,
    name: profile.name,
    avatarStage: profile.avatarStage,
    level: profile.level,
    currentXP: profile.currentXP,
    requiredXP: profile.requiredXP,
    dailyStreak: profile.dailyStreak ?? profile.currentStreak ?? 0,
    totalQuests: profile.totalQuests,
    completedQuests: profile.completedQuests,
    badges: Array.isArray(profile.badges) ? profile.badges : [],
    currentMood: profile.currentMood,
  };

  return (
    <div className="mx-auto w-full max-w-5xl animate-fade-in pb-10 text-text-primary">
      {error && (
        <div className="mb-4 rounded-xl border border-status-warning/20 bg-status-warning/10 px-4 py-3 text-sm text-status-warning">
          {error}
        </div>
      )}

      <div className="mb-4 flex justify-end">
        {editing ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-bg-panel px-4 py-2 text-sm font-semibold text-text-secondary transition-all hover:bg-bg-panel/80 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-bg-panel px-4 py-2 text-sm font-semibold text-text-secondary transition-all hover:bg-bg-panel/80 hover:text-white"
          >
            <Pencil className="h-4 w-4" />
            Edit Profile
          </button>
        )}
      </div>

      {editing && (
        <div className="mb-6 rounded-2xl border border-border bg-bg-card p-6 shadow-xl animate-fade-in">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-text-muted">Edit Profile</h2>
          {saveError && (
            <div className="mb-4 rounded-xl border border-status-error/20 bg-status-error/10 px-4 py-3 text-sm text-status-error">
              {saveError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted" htmlFor="edit-name">
                Name
              </label>
              <input
                id="edit-name"
                type="text"
                maxLength={40}
                value={editFields.name}
                onChange={(e) => setEditFields((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-border bg-bg-panel px-3 py-2.5 text-sm text-white placeholder-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all"
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted" htmlFor="edit-age">
                Age
              </label>
              <input
                id="edit-age"
                type="number"
                min={1}
                max={120}
                value={editFields.age}
                onChange={(e) => setEditFields((f) => ({ ...f, age: e.target.value }))}
                className="w-full rounded-xl border border-border bg-bg-panel px-3 py-2.5 text-sm text-white placeholder-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all"
                placeholder="Age"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted" htmlFor="edit-location">
                Location
              </label>
              <input
                id="edit-location"
                type="text"
                maxLength={60}
                value={editFields.location}
                onChange={(e) => setEditFields((f) => ({ ...f, location: e.target.value }))}
                className="w-full rounded-xl border border-border bg-bg-panel px-3 py-2.5 text-sm text-white placeholder-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all"
                placeholder="City, Country"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted" htmlFor="edit-timezone">
                Timezone
              </label>
              <input
                id="edit-timezone"
                type="text"
                maxLength={60}
                value={editFields.timezone}
                onChange={(e) => setEditFields((f) => ({ ...f, timezone: e.target.value }))}
                className="w-full rounded-xl border border-border bg-bg-panel px-3 py-2.5 text-sm text-white placeholder-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all"
                placeholder="e.g. Asia/Bangkok"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted" htmlFor="edit-bio">
                Bio
              </label>
              <textarea
                id="edit-bio"
                rows={3}
                maxLength={200}
                value={editFields.bio}
                onChange={(e) => setEditFields((f) => ({ ...f, bio: e.target.value }))}
                className="w-full rounded-xl border border-border bg-bg-panel px-3 py-2.5 text-sm text-white placeholder-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all resize-none"
                placeholder="A short bio about yourself"
              />
            </div>
          </div>
        </div>
      )}

      <ProfilePage profile={profileData} />
    </div>
  );
}
