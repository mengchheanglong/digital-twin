export type TwinContextPackVersion = 'twin-core.v0';

export interface TwinContextPack {
  version: TwinContextPackVersion;
  generatedAt: string;
  userId: string;
  sourceWindows: TwinSourceWindows;
  identity: TwinIdentityContext;
  avatar: TwinAvatarContext;
  currentState: TwinCurrentStateContext;
  patterns: TwinPatternContext;
  goals: TwinGoalContext;
  memory: TwinMemoryContext;
  privacy: TwinPrivacyContext;
  limits: TwinContextLimits;
}

export interface TwinSourceWindows {
  checkInsDays: number;
  questsDays: number;
  journalsDays: number;
  focusDays: number;
  chatSignalsDays: number;
}

export interface TwinIdentityContext {
  displayName: string;
  timezone?: string;
  profileBio?: string;
  location?: string;
  joinDate?: string;
}

export interface TwinAvatarContext {
  level: number;
  currentXP: number;
  requiredXP: number;
  avatarStage: string;
  dailyStreak: number;
  currentMood: {
    emoji: string;
    label: string;
  };
}

export interface TwinCurrentStateContext {
  trend: 'rising' | 'stable' | 'dropping' | 'unknown';
  wellness: {
    latestPercentage: number | null;
    average30d: number | null;
    checkInCount30d: number;
  };
  dimensions?: {
    energy: number;
    focus: number;
    stressControl: number;
    socialConnection: number;
    optimism: number;
  };
  focus: {
    sessions30d: number;
    completedSessions30d: number;
    totalMinutes30d: number;
  };
}

export interface TwinPatternContext {
  topJournalTags90d: string[];
  journalMoodSamples90d: string[];
  chatSignals90d: Array<{
    signalType: string;
    averageIntensity: number;
    averageConfidence: number;
    count: number;
  }>;
}

export interface TwinGoalContext {
  activeQuests: Array<{
    goal: string;
    duration: string;
    progress: number | null;
  }>;
  completedQuestThemes90d: string[];
  completedQuestCount90d: number;
}

export interface TwinMemoryContext {
  summary: string;
  recurringStruggles: string[];
  breakthroughTriggers: string[];
  effectiveInterventions: string[];
  keyPersonalityTraits: string[];
  lastSynthesizedAt: string | null;
}

export interface TwinPrivacyContext {
  intendedUse: 'companion_and_world_context';
  excludes: string[];
  rawSensitiveDataIncluded: false;
  userExportEndpoint: '/api/export';
  deleteEndpoint: '/api/user';
}

export interface TwinContextLimits {
  maxStringLength: number;
  maxActiveQuests: number;
  maxJournalTags: number;
  maxChatSignalTypes: number;
  notes: string[];
}
