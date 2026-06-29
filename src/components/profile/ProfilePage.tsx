"use client";

import { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { ProfileHeader } from "./ProfileHeader";
import { StatsSection } from "./StatsSection";
import { DataManagementSection } from "./DataManagementSection";
import { MobileAppActions } from "./MobileAppActions";
import { ProgressionShowcase } from "./ProgressionShowcase";

export interface ProfileMood {
  emoji: string;
  label: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarStage: string;
  level: number;
  currentXP: number;
  requiredXP: number;
  dailyStreak: number;
  totalQuests: number;
  completedQuests: number;
  currentMood?: ProfileMood;
}

export interface ProfilePageProps {
  profile: UserProfile;
}

export function ProfilePage({ profile }: ProfilePageProps) {
  const [showAscensionDetail, setShowAscensionDetail] = useState(false);

  if (!profile) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10 relative">
      {/* Majestic Profile Ambient Glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-[400px] w-full max-w-3xl rounded-full bg-gradient-to-b from-accent-primary/20 via-accent-primary/5 to-transparent blur-[100px]" />

      {showAscensionDetail ? (
        <div className="relative z-10 space-y-4 animate-fade-in">
          <button
            type="button"
            onClick={() => setShowAscensionDetail(false)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-bg-panel px-4 py-2 text-sm font-bold text-text-secondary transition-all hover:border-border-hover hover:bg-bg-hover hover:text-text-primary focus-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </button>

          <ProgressionShowcase currentLevel={profile.level} />
        </div>
      ) : (
        <>
      <div className="relative z-10">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowAscensionDetail(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setShowAscensionDetail(true);
            }
          }}
          className="group block w-full cursor-pointer rounded-2xl text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated focus-ring"
          aria-label="Open profile level details"
        >
          <ProfileHeader
            name={profile.name}
            avatarStage={profile.avatarStage}
            level={profile.level}
            currentXP={profile.currentXP}
            requiredXP={profile.requiredXP}
          />
          <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted transition-colors group-hover:text-accent-primary">
            <span>View levels</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      <div className="relative z-10 animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
        <MobileAppActions />
      </div>

      <div className="relative z-10 animate-fade-in" style={{ animationDelay: "150ms", animationFillMode: "both" }}>
        <StatsSection
          dailyStreak={profile.dailyStreak}
          totalQuests={profile.totalQuests}
          completedQuests={profile.completedQuests}
          currentMood={profile.currentMood}
        />
      </div>

      <div className="relative z-10 animate-fade-in" style={{ animationDelay: "220ms", animationFillMode: "both" }}>
        <DataManagementSection />
      </div>
        </>
      )}
    </div>
  );
}

export default ProfilePage;
