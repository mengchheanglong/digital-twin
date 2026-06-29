"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { ProfilePage, UserProfile } from "@/components/profile";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui";
import { FormField } from "@/components/ui";
import { Input } from "@/components/ui";
import { Textarea } from "@/components/ui";
import { Skeleton } from "@/components/ui";

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

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      {/* Header skeleton */}
      <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-border bg-bg-card p-8 shadow-card">
        <div className="absolute top-0 h-1/2 w-full bg-gradient-to-b from-accent-primary/10 to-transparent pointer-events-none" />
        <Skeleton width={112} height={112} rounded="full" className="mb-6" />
        <Skeleton width={180} height={32} rounded="lg" className="mb-2" />
        <Skeleton width={120} height={20} rounded="md" className="mb-8" />
        <Skeleton width="100%" height={40} rounded="md" className="max-w-sm" />
      </div>

      {/* Stats skeleton */}
      <div>
        <Card className="h-full p-6 space-y-4">
          <Skeleton width={100} height={16} rounded="md" />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton width={44} height={44} rounded="xl" />
                <div className="space-y-2">
                  <Skeleton width={60} height={24} rounded="md" />
                  <Skeleton width={80} height={14} rounded="md" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Progression skeleton */}
      <Card className="p-6 space-y-4">
        <Skeleton width={160} height={24} rounded="lg" />
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <Skeleton width={64} height={64} rounded="full" />
              <Skeleton width={80} height={16} rounded="md" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
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
    return <ProfileSkeleton />;
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
            <Button
              variant="secondary"
              size="md"
              leftIcon={<X className="h-4 w-4" />}
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Pencil className="h-4 w-4" />}
            onClick={startEditing}
          >
            Edit Profile
          </Button>
        )}
      </div>

      {editing && (
        <Card variant="elevated" className="mb-6 p-6 animate-fade-in">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-text-muted">Edit Profile</h2>
          {saveError && (
            <div className="mb-4 rounded-xl border border-status-error/20 bg-status-error/10 px-4 py-3 text-sm text-status-error">
              {saveError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="edit-name">
              <Input
                id="edit-name"
                type="text"
                maxLength={40}
                value={editFields.name}
                onChange={(e) => setEditFields((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
              />
            </FormField>
            <FormField label="Age" htmlFor="edit-age">
              <Input
                id="edit-age"
                type="number"
                min={1}
                max={120}
                value={editFields.age}
                onChange={(e) => setEditFields((f) => ({ ...f, age: e.target.value }))}
                placeholder="Age"
              />
            </FormField>
            <FormField label="Location" htmlFor="edit-location">
              <Input
                id="edit-location"
                type="text"
                maxLength={60}
                value={editFields.location}
                onChange={(e) => setEditFields((f) => ({ ...f, location: e.target.value }))}
                placeholder="City, Country"
              />
            </FormField>
            <FormField label="Timezone" htmlFor="edit-timezone">
              <Input
                id="edit-timezone"
                type="text"
                maxLength={60}
                value={editFields.timezone}
                onChange={(e) => setEditFields((f) => ({ ...f, timezone: e.target.value }))}
                placeholder="e.g. Asia/Bangkok"
              />
            </FormField>
            <FormField label="Bio" htmlFor="edit-bio" className="sm:col-span-2">
              <Textarea
                id="edit-bio"
                rows={3}
                maxLength={200}
                value={editFields.bio}
                onChange={(e) => setEditFields((f) => ({ ...f, bio: e.target.value }))}
                placeholder="A short bio about yourself"
                resize="none"
              />
            </FormField>
          </div>
        </Card>
      )}

      <ProfilePage profile={profileData} />
    </div>
  );
}
