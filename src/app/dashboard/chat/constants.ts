import { ChatMessage } from "./types";

export const ACTIVE_CHAT_STORAGE_KEY = "digital_twin_active_chat_id";

export const quickPrompts = [
  "How am I doing this week?",
  "Help me de-stress",
  "Build a new habit",
  "Reflect on my mood",
];

export const introMessage: ChatMessage = {
  id: "intro",
  text: "Hey there — I'm your Digital Twin. I've been learning your rhythms, your wins, and the moments that challenge you. I'm here whenever you want to talk, reflect, or figure things out together. What's on your mind right now?",
  sender: "ai",
  timestamp: new Date(),
};
