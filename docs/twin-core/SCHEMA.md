# Twin Context Pack Schema

Version: `twin-core.v0`

```ts
interface TwinContextPack {
  version: 'twin-core.v0';
  generatedAt: string;
  userId: string;
  sourceWindows: {
    checkInsDays: number;
    questsDays: number;
    journalsDays: number;
    focusDays: number;
    chatSignalsDays: number;
  };
  identity: {
    displayName: string;
    timezone?: string;
    profileBio?: string;
    location?: string;
    joinDate?: string;
  };
  avatar: {
    level: number;
    currentXP: number;
    requiredXP: number;
    avatarStage: string;
    dailyStreak: number;
    currentMood: { emoji: string; label: string };
  };
  currentState: {
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
  };
  patterns: {
    topJournalTags90d: string[];
    journalMoodSamples90d: string[];
    chatSignals90d: Array<{
      signalType: string;
      averageIntensity: number;
      averageConfidence: number;
      count: number;
    }>;
  };
  goals: {
    activeQuests: Array<{
      goal: string;
      duration: string;
      progress: number | null;
    }>;
    completedQuestThemes90d: string[];
    completedQuestCount90d: number;
  };
  memory: {
    summary: string;
    recurringStruggles: string[];
    breakthroughTriggers: string[];
    effectiveInterventions: string[];
    keyPersonalityTraits: string[];
    lastSynthesizedAt: string | null;
  };
  privacy: {
    intendedUse: 'companion_and_world_context';
    excludes: string[];
    rawSensitiveDataIncluded: false;
    userExportEndpoint: '/api/export';
    deleteEndpoint: '/api/user';
  };
  limits: {
    maxStringLength: number;
    maxActiveQuests: number;
    maxJournalTags: number;
    maxChatSignalTypes: number;
    notes: string[];
  };
}
```

## Example

```json
{
  "success": true,
  "contextPack": {
    "version": "twin-core.v0",
    "generatedAt": "2026-06-29T12:00:00.000Z",
    "userId": "64b7f37d5f8d9f0012345678",
    "sourceWindows": {
      "checkInsDays": 30,
      "questsDays": 90,
      "journalsDays": 90,
      "focusDays": 30,
      "chatSignalsDays": 90
    },
    "identity": {
      "displayName": "Test User",
      "timezone": "Asia/Bangkok",
      "profileBio": "Building steady habits.",
      "location": "Bangkok",
      "joinDate": "Jan 1, 2026"
    },
    "avatar": {
      "level": 4,
      "currentXP": 120,
      "requiredXP": 250,
      "avatarStage": "Focused Strategist",
      "dailyStreak": 3,
      "currentMood": { "emoji": ":)", "label": "Stable" }
    },
    "currentState": {
      "trend": "rising",
      "wellness": {
        "latestPercentage": 80,
        "average30d": 70,
        "checkInCount30d": 2
      },
      "focus": {
        "sessions30d": 2,
        "completedSessions30d": 1,
        "totalMinutes30d": 55
      }
    },
    "patterns": {
      "topJournalTags90d": ["focus", "work", "health"],
      "journalMoodSamples90d": ["calm", "energized"],
      "chatSignals90d": [
        {
          "signalType": "stress",
          "averageIntensity": 3,
          "averageConfidence": 0.7,
          "count": 2
        }
      ]
    },
    "goals": {
      "activeQuests": [
        { "goal": "Read nightly", "duration": "daily", "progress": 40 }
      ],
      "completedQuestThemes90d": ["read nightly"],
      "completedQuestCount90d": 3
    },
    "memory": {
      "summary": "Learns through consistent reflection.",
      "recurringStruggles": ["overcommitting"],
      "breakthroughTriggers": ["clear priorities"],
      "effectiveInterventions": ["short focus blocks"],
      "keyPersonalityTraits": ["curious"],
      "lastSynthesizedAt": "2026-06-29T12:00:00.000Z"
    },
    "privacy": {
      "intendedUse": "companion_and_world_context",
      "excludes": [
        "password",
        "reset tokens",
        "raw journal content",
        "raw chat messages",
        "auth tokens",
        "email"
      ],
      "rawSensitiveDataIncluded": false,
      "userExportEndpoint": "/api/export",
      "deleteEndpoint": "/api/user"
    },
    "limits": {
      "maxStringLength": 160,
      "maxActiveQuests": 10,
      "maxJournalTags": 10,
      "maxChatSignalTypes": 10,
      "notes": ["Context pack v0 uses summarized and aggregated data only."]
    }
  }
}
```
