"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
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

  const questCompletionRate = profile.totalQuests > 0
    ? Math.round((profile.completedQuests / profile.totalQuests) * 100)
    : 0;

  return (
    <div className="relative mx-auto max-w-6xl space-y-5 pb-10">
      {showAscensionDetail ? (
        <div className="relative z-10 space-y-4 animate-fade-in">
          <button
            type="button"
            onClick={() => setShowAscensionDetail(false)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-bg-panel px-4 py-2 text-sm font-bold text-text-secondary transition-all hover:border-border-hover hover:bg-bg-hover hover:text-text-primary focus-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Me
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
              className="group block w-full cursor-pointer rounded-[2rem] text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated focus-ring"
              aria-label="Open profile level details"
            >
              <ProfileHeader
                name={profile.name}
                avatarStage={profile.avatarStage}
                level={profile.level}
                currentXP={profile.currentXP}
                requiredXP={profile.requiredXP}
                dailyStreak={profile.dailyStreak}
                questCompletionRate={questCompletionRate}
                currentMood={profile.currentMood}
              />
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <StatsSection
              dailyStreak={profile.dailyStreak}
              totalQuests={profile.totalQuests}
              completedQuests={profile.completedQuests}
              currentMood={profile.currentMood}
            />
            <div className="space-y-5">
              <MobileAppActions />
              <DataManagementSection />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProfilePage;
