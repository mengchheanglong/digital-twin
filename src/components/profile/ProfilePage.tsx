"use client";

import { ProfileHeader } from "./ProfileHeader";
import { StatsSection } from "./StatsSection";
import { AchievementsSection } from "./AchievementsSection";
import { DataManagementSection } from "./DataManagementSection";
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
  badges: string[];
  currentMood?: ProfileMood;
}

export interface ProfilePageProps {
  profile: UserProfile;
}

export function ProfilePage({ profile }: ProfilePageProps) {
  if (!profile) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10 relative">
      {/* Majestic Profile Ambient Glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-[400px] w-full max-w-3xl rounded-full bg-gradient-to-b from-accent-primary/20 via-purple-500/5 to-transparent blur-[100px]" />
      
      <div className="relative z-10">
        <ProfileHeader
          name={profile.name}
          avatarStage={profile.avatarStage}
          level={profile.level}
          currentXP={profile.currentXP}
          requiredXP={profile.requiredXP}
        />
      </div>

      <div
        className="grid gap-5 lg:grid-cols-5 animate-fade-in relative z-10"
        style={{ animationDelay: "150ms", animationFillMode: "both" }}
      >
        <div className="lg:col-span-2">
          <StatsSection
            dailyStreak={profile.dailyStreak}
            totalQuests={profile.totalQuests}
            completedQuests={profile.completedQuests}
            currentMood={profile.currentMood}
          />
        </div>

        <div className="lg:col-span-3">
          <AchievementsSection badges={profile.badges} />
        </div>
      </div>

      <div className="relative z-10 animate-fade-in" style={{ animationDelay: "180ms", animationFillMode: "both" }}>
        <ProgressionShowcase currentLevel={profile.level} />
      </div>

      <div className="relative z-10 animate-fade-in" style={{ animationDelay: "220ms", animationFillMode: "both" }}>
        <DataManagementSection />
      </div>
    </div>
  );
}

export default ProfilePage;
